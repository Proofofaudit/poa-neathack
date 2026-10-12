import { describe, expect, it, vi } from "vitest";
import { neatlogs } from "../src/observability/neatlogs.js";

describe("Real Neatlogs SDK instrumentation", () => {
  it("exports nested spans locally through the actual SDK with inputs and results", async () => {
    vi.stubEnv("POA_TELEMETRY_ENABLED", "false");
    await neatlogs.runWorkflow("sdk-contract-check", { goal: "verify" }, () =>
      neatlogs.traceSpan("test-tool", "TOOL", { attempt: 1 }, async () => 42),
    );
    const record = neatlogs.getLatestTrace()!;
    expect(record.mode).toBe("NEATLOGS_SDK_LOCAL");
    expect(record.remotePersistence).toBe("NOT_REQUESTED");
    expect(record.sdkSpans.length).toBeGreaterThanOrEqual(2);
    const root = record.sdkSpans.find((s) => s.name === "sdk-contract-check")!;
    const child = record.sdkSpans.find((s) => s.name === "test-tool")!;
    expect(child.parentSpanId).toBe(root.spanId);
    expect(child.traceId).toBe(root.traceId);
    expect(JSON.stringify(child.attributes)).toContain("42");
  });
  it("isolates overlapping investigations and records real errors", async () => {
    vi.stubEnv("POA_TELEMETRY_ENABLED", "false");
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = neatlogs.runWorkflow("first-mission", {}, async () => {
      await barrier;
      await expect(
        neatlogs.traceSpan("first-failure", "TOOL", {}, async () => {
          throw new Error("actual failure");
        }),
      ).rejects.toThrow("actual failure");
    });
    await neatlogs.runWorkflow("second-mission", {}, async () => {
      await neatlogs.traceSpan("second-tool", "TOOL", {}, async () => true);
      release();
    });
    await first;
    const a = neatlogs.recordedTraces.find(
      (t) => t.workflowName === "first-mission",
    )!;
    const b = neatlogs.recordedTraces.find(
      (t) => t.workflowName === "second-mission",
    )!;
    expect(a.spans.map((s) => s.name)).not.toContain("second-tool");
    expect(b.spans.map((s) => s.name)).not.toContain("first-failure");
    expect(
      a.sdkSpans.find((s) => s.name === "first-failure")?.status.code,
    ).toBe(2);
    expect(a.traceId).not.toBe(b.traceId);
  });
});
