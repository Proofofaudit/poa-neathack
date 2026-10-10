import dotenv from "dotenv";
dotenv.config();

export interface SpanContext {
  spanId: string;
  name: string;
  kind: "WORKFLOW" | "AGENT" | "TOOL" | "GUARDRAIL" | "CHAIN";
  startTime: number;
  attributes: Record<string, any>;
}

export interface TraceRecord {
  workflowName: string;
  traceId: string;
  spans: Array<{
    name: string;
    kind: string;
    durationMs: number;
    attributes: Record<string, any>;
    status: "OK" | "ERROR";
    error?: string;
  }>;
  totalDurationMs: number;
  tokensUsed?: number;
}

class NeatlogsManager {
  private isInitialized = false;
  private apiKey: string | undefined;
  private projectId: string;
  private workflowName: string;
  public recordedTraces: TraceRecord[] = [];

  constructor() {
    this.projectId = process.env.NEATLOGS_PROJECT_ID || "542c53f4-ec26-4d57-a097-b7c9175c84be";
    this.apiKey = process.env.NEATLOGS_API_KEY;
    this.workflowName = "poa-incident-restitution";
  }

  public async init(workflowName = "poa-incident-restitution") {
    this.workflowName = workflowName;
    this.apiKey = process.env.NEATLOGS_API_KEY;

    try {
      // Dynamic import to support both hosted Neatlogs SDK and local test environments
      const neatlogsModule = await import("neatlogs");
      if (neatlogsModule && typeof neatlogsModule.init === "function" && this.apiKey && this.apiKey !== "mock_local_dev_key") {
        await neatlogsModule.init({
          apiKey: this.apiKey,
          projectId: this.projectId,
          workflow_name: this.workflowName
        });
        console.log(`[Neatlogs] Initialized live SDK for project ${this.projectId} (workflow: ${this.workflowName})`);
      } else {
        console.log(`[Neatlogs] Operating in local deterministic tracing mode (Project ID: ${this.projectId})`);
      }
    } catch (err: any) {
      console.log(`[Neatlogs] Local trace recording active: ${err?.message || err}`);
    }

    this.isInitialized = true;
  }

  public async traceSpan<T>(
    name: string,
    kind: "WORKFLOW" | "AGENT" | "TOOL" | "GUARDRAIL" | "CHAIN",
    attributes: Record<string, any>,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let status: "OK" | "ERROR" = "OK";
    let errorMsg: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (err: any) {
      status = "ERROR";
      errorMsg = err?.message || String(err);
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;
      const spanRecord = {
        name,
        kind,
        durationMs,
        attributes,
        status,
        error: errorMsg
      };

      if (this.recordedTraces.length === 0) {
        this.recordedTraces.push({
          workflowName: this.workflowName,
          traceId: `trace-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          spans: [],
          totalDurationMs: 0
        });
      }

      const activeTrace = this.recordedTraces[this.recordedTraces.length - 1];
      activeTrace.spans.push(spanRecord);
      activeTrace.totalDurationMs += durationMs;
    }
  }

  public getLatestTrace(): TraceRecord | undefined {
    return this.recordedTraces[this.recordedTraces.length - 1];
  }
}

export const neatlogs = new NeatlogsManager();
