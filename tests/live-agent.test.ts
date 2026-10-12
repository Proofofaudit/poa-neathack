import { expect, it, vi } from "vitest";
import { LiveAaveAgent, type LiveAgentTools, type LiveTool } from "../src/agent/live-agent";
import type OpenAI from "openai";
const hash = "0x" + "ab".repeat(32);
function tools(transaction: any = { executionStatus: "SUCCEEDED", liquidations: [] }) {
  const run = vi.fn(async (action: LiveTool) => {
    if (action === "READ_TRANSACTION") return transaction;
    if (action === "READ_MARKET") return { reserveCount: 15, sampledAssets: [{asset: "x"}], blockNumber: 10 };
    if (action === "CHECK_ORACLE_SOURCES") return { feeds: [] };
    if (action === "VERIFY_BLOCKS") return { verified: true };
    return { accounts: [] };
  });
  return { run } satisfies LiveAgentTools;
}
function model(actions: string[]) {
  const create = vi.fn(async () => ({choices: [{ message: {content: actions.shift() || '{"action":"FINALIZE","reason":"Checks done"}'}}], usage: {total_tokens: 50}}));
  return { client: { chat: {completions: {create}}} as unknown as Pick<OpenAI, "chat">, create };
}
it("investigates live market tools to completion and always withholds compensation", async () => {
  const t = tools(); const report = await new LiveAaveAgent(t).run();
  expect(report.status).toBe("COMPLETED");
  expect(report.policyDecision).toBe("WITHHELD");
  expect(t.run.mock.calls.map(c => c[0])).toEqual(["READ_MARKET", "CHECK_ORACLE_SOURCES", "VERIFY_BLOCKS"]);
  expect(report.mode).toBe("DETERMINISTIC_PLANNER");
});
it("chooses borrower history only after a supported liquidation is observed", async () => {
  const t = tools({ executionStatus: "SUCCEEDED", liquidations: [{borrower: "user"}] });
  const report = await new LiveAaveAgent(t).run(hash);
  expect(report.status).toBe("COMPLETED");
  expect(t.run.mock.calls.map(c => c[0])).toContain("READ_BORROWER_HISTORY");
  expect(report.limitations.join(" ")).toContain("cannot prove");
});
it.each(["REVERTED", "SUCCEEDED"])("does not invent liquidation positions for %s transactions without supported events", async executionStatus => {
  const t = tools({executionStatus, liquidations: []});
  const report = await new LiveAaveAgent(t).run(hash);
  expect(report.status).toBe("COMPLETED");
  expect(t.run.mock.calls.map(c => c[0])).toEqual(["READ_TRANSACTION", "VERIFY_BLOCKS"]);
});
it("retries a failed tool once, retains the failure, then verifies recovered evidence", async () => {
  const t = tools(); t.run.mockRejectedValueOnce(new Error("temporary"));
  const report = await new LiveAaveAgent(t).run();
  expect(report.status).toBe("COMPLETED");
  expect(report.steps[0].status).toBe("ERROR");
  expect(report.steps[1].action).toBe("READ_MARKET");
  expect(report.steps[1].status).toBe("OK");
});
it("missing archive evidence never becomes a completed investigation", async () => {
  const t = tools({executionStatus: "SUCCEEDED", liquidations: [{}]});
  const original = t.run.getMockImplementation()!;
  t.run.mockImplementation(async (action: LiveTool) => {if (action === "READ_BORROWER_HISTORY") throw new Error("archive unavailable"); return original(action);});
  const report = await new LiveAaveAgent(t).run(hash);
  expect(report.status).toBe("NEEDS_REVIEW");
  expect(report.limitations.join(" ")).toContain("READ_BORROWER_HISTORY");
});
it("model cannot finalize before evidence checks", async () => {
  const m = model(['{"action":"FINALIZE","reason":"looks safe"}']);
  const report = await new LiveAaveAgent(tools(), m.client).run();
  expect(report.status).toBe("NEEDS_REVIEW");
  expect(report.steps[0].action).toBe("FINALIZE_REJECTED");
});
it("model cannot verify anchors before collecting its required evidence", async () => {
  const m = model(['{"action":"VERIFY_BLOCKS","reason":"skip"}', '{"action":"VERIFY_BLOCKS","reason":"skip"}']);
  const t = tools(); const report = await new LiveAaveAgent(t, m.client).run();
  expect(report.status).toBe("NEEDS_REVIEW"); expect(t.run).not.toHaveBeenCalled();
});
it("a model can select tools based on observations and complete the real tool workflow", async () => {
  const m = model(["READ_MARKET", "CHECK_ORACLE_SOURCES", "VERIFY_BLOCKS", "FINALIZE"].map(action => JSON.stringify({action, reason: "Use observed evidence"})));
  const report = await new LiveAaveAgent(tools(), m.client).run();
  expect(report.status).toBe("COMPLETED"); expect(report.mode).toBe("LIVE_MODEL"); expect(report.tokensUsed).toBe(200);
});
it("aborted runs never call the model or tools", async () => {
  const m = model([]), t = tools(); const controller = new AbortController(); controller.abort();
  const report = await new LiveAaveAgent(t, m.client).run(undefined, controller.signal);
  expect(report.status).toBe("NEEDS_REVIEW"); expect(t.run).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
});
it("does not present speculative model rationale as verified findings or tool results", async () => {
  const m = model(["READ_MARKET", "CHECK_ORACLE_SOURCES", "VERIFY_BLOCKS", "FINALIZE"].map(action => JSON.stringify({action, reason: "All feeds are guaranteed safe"})));
  const report = await new LiveAaveAgent(tools(), m.client).run();
  expect(report.status).toBe("COMPLETED");
  expect(report.findings.join(" ")).not.toContain("guaranteed safe");
  expect(report.steps.map(s => s.reason).join(" ")).not.toContain("guaranteed safe");
  expect(report.steps[0].plannerRationaleUnverified).toBe("All feeds are guaranteed safe");
});

it("keeps raw tool evidence in the report while sending only bounded facts to the model", async () => {
  const m = model(["READ_MARKET", "CHECK_ORACLE_SOURCES", "VERIFY_BLOCKS", "FINALIZE"].map(action=>JSON.stringify({action,reason:"Read evidence"})));
  const t=tools();const original=t.run.getMockImplementation()!;
  t.run.mockImplementation(async action => action==="READ_MARKET" ? {...await original(action),rawArchivePayload:"x".repeat(50000)} : original(action));
  const report=await new LiveAaveAgent(t,m.client).run();
  expect((report.observations.READ_MARKET as any).rawArchivePayload.length).toBe(50000);
  const prompts=(m.create.mock.calls as any[]).map(call=>JSON.parse(call[0].messages[1].content));
  expect(prompts[0].available).not.toContain("FINALIZE");expect(prompts.at(-1).available).toEqual(["FINALIZE"]);
  expect(JSON.stringify(prompts)).not.toContain("rawArchivePayload");
  expect(prompts[1].observed.marketBlock).toBe(10);expect(report.status).toBe("COMPLETED");
});
