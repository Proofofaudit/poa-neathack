import fs from "node:fs";
import crypto from "node:crypto";
import dotenv from "dotenv";
dotenv.config();
async function main() {
  if (!process.env.NEATLOGS_API_KEY)
    throw new Error(
      "A configured neatlogs credential is required; it must not be placed in command arguments or output.",
    );
  const paths = process.argv.slice(2);
  if (!paths.length) throw new Error("Supply one or more evidence JSON files");
  const records: any[] = [];
  for (const file of paths) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const traces = data.traces || [data.observabilityTrace];
    for (const t of traces) {
      if (
        !t ||
        t.mode !== "NEATLOGS_SDK_REMOTE" ||
        !/^[a-f0-9]{32}$/.test(t.traceId)
      )
        throw new Error("Evidence does not contain a remote SDK trace");
      let persisted: any;
      const deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        let response: Response;
        try {
          response = await fetch(
            `https://ingest.neatlogs.com/api/traces/v3/${t.traceId}`,
            {
              headers: { "x-api-key": process.env.NEATLOGS_API_KEY },
              redirect: "error",
              signal: AbortSignal.timeout(
                Math.max(1, Math.min(12000, deadline - Date.now())),
              ),
            },
          );
        } catch {
          if (Date.now() >= deadline) break;
          continue;
        }
        if (response.ok) {
          let candidate: any;
          try {
            candidate = await response.json();
          } catch {
            continue;
          }
          const observedIds = new Set(
            (candidate.spans || []).map((s: any) => s.span_id),
          );
          const required = t.sdkSpans.filter(
            (s: any) => !s.name.startsWith("neatlogs."),
          );
          if (
            required.length &&
            required.every((s: any) => observedIds.has(s.spanId))
          ) {
            persisted = candidate;
            break;
          }
        } else if (response.status !== 404)
          throw new Error(
            `Provider trace read-back failed with HTTP ${response.status}`,
          );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (!persisted)
        throw new Error(
          "Provider did not return every expected SDK span within the bounded read-back window",
        );
      const spans = persisted.spans.map((s: any) => ({
        name: s.node_name,
        spanId: s.span_id,
        parentSpanId: s.parent_span_id,
        traceId: s.traceId,
        status: s.status,
      }));
      if (spans.some((s: any) => s.traceId !== t.traceId))
        throw new Error("Read-back trace identity mismatch");
      const expected = new Set(
        t.sdkSpans
          .filter((s: any) => !s.name.startsWith("neatlogs."))
          .map((s: any) => s.spanId),
      );
      const core = spans.filter((s: any) => expected.has(s.spanId));
      const root = core.find((s: any) => !s.parentSpanId);
      if (
        !root ||
        core.some((s: any) => s.parentSpanId && !expected.has(s.parentSpanId))
      )
        throw new Error("Read-back span hierarchy is incomplete");
      t.remotePersistence = "VERIFIED_READBACK";
      t.remoteVerifiedAt = new Date().toISOString();
      records.push({
        file,
        traceId: t.traceId,
        workflowName: t.workflowName,
        verifiedAt: t.remoteVerifiedAt,
        expectedSpans: expected.size,
        observedSpans: core.length,
        hierarchyVerified: true,
        providerApiPath: `/api/traces/v3/${t.traceId}`,
        providerResponseSha256: crypto
          .createHash("sha256")
          .update(JSON.stringify(persisted))
          .digest("hex"),
        spans: core,
      });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }
  fs.writeFileSync(
    "evidence/neatlogs_remote_readback.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        status: "VERIFIED_READBACK",
        provider: "neatlogs",
        records,
        caveat:
          "Authenticated provider read-back was verified at the recorded time. This artifact is a summary, not a public share link or a guarantee of future retention.",
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: ${records.length} project traces persisted; every expected span and parent-child relationship verified by authenticated read-back.`,
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Remote trace verification failed",
  );
  process.exitCode = 1;
});
