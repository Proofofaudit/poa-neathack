import dotenv from "dotenv";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { Client, trace, setTraceOutput, wrapOpenAI } from "neatlogs";
dotenv.config();

type Kind = "WORKFLOW" | "AGENT" | "TOOL" | "GUARDRAIL" | "CHAIN";
export interface TraceRecord {
  workflowName: string;
  traceId: string;
  mode: "NEATLOGS_SDK_LOCAL" | "NEATLOGS_SDK_REMOTE";
  remotePersistence: "NOT_REQUESTED" | "NOT_VERIFIED" | "VERIFIED_READBACK";
  spans: Array<{
    spanId: string;
    parentSpanId?: string;
    name: string;
    kind: Kind;
    durationMs: number;
    attributes: Record<string, unknown>;
    status: "OK" | "ERROR";
    error?: string;
  }>;
  sdkSpans: Array<{
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    attributes: Record<string, unknown>;
    status: { code: number; message?: string };
  }>;
  totalDurationMs: number;
  tokensUsed?: number;
  exportSucceeded?: boolean;
}
interface Context {
  record: TraceRecord;
  parentSpanId?: string;
}
function summary(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const v = value as Record<string, unknown>;
  if ("policyDecision" in v)
    return {
      status: v.status,
      policyDecision: v.policyDecision,
      eventsAnalyzed: v.eventsAnalyzed,
      totalRestitutionCalculatedUsdc: v.totalRestitutionCalculatedUsdc,
      reviewReasons: v.reviewReasons,
    };
  if ("borrowers" in v && "liquidations" in v)
    return {
      chainId: v.chainId,
      baselineBlockNumber: v.baselineBlockNumber,
      toBlock: v.toBlock,
      referenceCorroboratesBaseline: v.referenceCorroboratesBaseline,
      borrowers: (v.borrowers as unknown[]).length,
      liquidations: (v.liquidations as unknown[]).length,
    };
  if ("restitutionAmountUsdc" in v)
    return {
      status: v.status,
      amount: String(v.restitutionAmountUsdc),
      reason: v.reason,
    };
  if ("merkleRoot" in v)
    return {
      merkleRoot: v.merkleRoot,
      claims: (v.claims as unknown[])?.length,
    };
  if ("anomalyClassification" in v)
    return {
      anomalyClassification: v.anomalyClassification,
      restitutionPolicyTriggered: v.restitutionPolicyTriggered,
      confidenceScore: v.confidenceScore,
      modelUsed: v.modelUsed,
      isLiveLlm: v.isLiveLlm,
    };
  return { completed: true };
}
class NeatlogsManager {
  private context = new AsyncLocalStorage<Context>();
  public recordedTraces: TraceRecord[] = [];
  public async runWorkflow<T>(
    name: string,
    attributes: Record<string, unknown>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const remote = process.env.POA_TELEMETRY_ENABLED === "true";
    if (remote && !process.env.NEATLOGS_API_KEY)
      throw new Error(
        "Remote telemetry requested without a configured credential",
      );
    const record: TraceRecord = {
      workflowName: name,
      traceId: randomUUID(),
      mode: remote ? "NEATLOGS_SDK_REMOTE" : "NEATLOGS_SDK_LOCAL",
      remotePersistence: remote ? "NOT_VERIFIED" : "NOT_REQUESTED",
      spans: [],
      sdkSpans: [],
      totalDurationMs: 0,
    };
    // The real SDK pipeline always runs. Local mode uses a private in-memory
    // exporter; no old .env credential can accidentally enable network export.
    // Client requires a nonempty key even for injected exporters; this local
    // sentinel is not a credential and is never passed to an HTTP exporter.
    const exporter = {
      export: (spans: any[], callback: (result: { code: number }) => void) => {
        record.sdkSpans.push(
          ...spans.map((s) => ({
            traceId: s.spanContext().traceId,
            spanId: s.spanContext().spanId,
            parentSpanId: s.parentSpanId,
            name: s.name,
            attributes: { ...s.attributes },
            status: { ...s.status },
          })),
        );
        callback({ code: 0 });
      },
      shutdown: async () => {},
      forceFlush: async () => {},
    };
    const client = new Client({
      workflowName: name,
      apiKey: remote
        ? process.env.NEATLOGS_API_KEY
        : "LOCAL_IN_MEMORY_EXPORTER_ONLY",
      ...(remote
        ? { endpoint: "https://ingest.neatlogs.com" }
        : { spanExporter: exporter }),
      tags: ["poa", attributes.provenance === "BASE_MAINNET" ? "base-mainnet" : "synthetic-demo"],
    });
    if (remote)
      client.tracerProvider.addSpanProcessor({
        onStart: () => {},
        onEnd: (s: any) => {
          record.sdkSpans.push({
            traceId: s.spanContext().traceId,
            spanId: s.spanContext().spanId,
            parentSpanId: s.parentSpanId,
            name: s.name,
            attributes: { ...s.attributes },
            status: { ...s.status },
          });
        },
        shutdown: async () => {},
        forceFlush: async () => {},
      });
    this.recordedTraces.push(record);
    if (this.recordedTraces.length > 100) this.recordedTraces.shift();
    const started = performance.now();
    try {
      return await this.context.run({ record }, () =>
        client.activate(() => this.traceSpan(name, "WORKFLOW", attributes, fn)),
      );
    } finally {
      record.totalDurationMs = performance.now() - started;
      try {
        record.exportSucceeded = await client.flush();
      } catch {
        record.exportSucceeded = false;
      }
      await client.shutdown();
      // A successful export is not evidence of persisted remote ingestion.
      const root = record.sdkSpans.find((s) => !s.parentSpanId);
      if (root) record.traceId = root.traceId;
    }
  }
  public wrapClient<T extends object>(client: T): T {
    return wrapOpenAI(client);
  }
  public async flush(): Promise<void> {
    /* Each workflow owns and flushes its SDK client. */
  }
  public async traceSpan<T>(
    name: string,
    kind: Kind,
    attributes: Record<string, unknown>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const context = this.context.getStore();
    if (!context) return this.runWorkflow(name, attributes, fn);
    const started = performance.now();
    const spanId = randomUUID();
    let status: "OK" | "ERROR" = "OK";
    let error: string | undefined;
    try {
      return await trace(
        { name, kind, input: attributes, attributes },
        async (sdkSpan) => {
          if (kind === "WORKFLOW")
            context.record.traceId = sdkSpan.spanContext().traceId;
          return this.context.run(
            { record: context.record, parentSpanId: spanId },
            async () => {
              const result = await fn();
              setTraceOutput(summary(result));
              return result;
            },
          );
        },
      );
    } catch (e) {
      status = "ERROR";
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      context.record.spans.push({
        spanId,
        parentSpanId: context.parentSpanId,
        name,
        kind,
        durationMs: performance.now() - started,
        attributes,
        status,
        error,
      });
    }
  }
  public getLatestTrace(): TraceRecord | undefined {
    return this.context.getStore()?.record || this.recordedTraces.at(-1);
  }
}
export const neatlogs = new NeatlogsManager();
