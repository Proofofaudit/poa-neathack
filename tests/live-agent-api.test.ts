import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const run = vi.hoisted(() => vi.fn(async () => ({ status: "COMPLETED", mode: "DETERMINISTIC_PLANNER", policyDecision: "WITHHELD" })));
vi.mock("../src/agent/live-agent", () => ({ AaveBaseTools: class {}, LiveAaveAgent: class {run = run} }));
import { POST as BASIC_POST } from "../src/app/api/agent/route";
import { POST as DEEP_POST } from "../src/app/api/investigate/route";
describe.each([["basic", BASIC_POST], ["full incident", DEEP_POST]])("%s route", (_, POST) => {
beforeEach(() => { run.mockClear(); vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("POA_DEMO_TOKEN", undefined); vi.stubEnv("POA_LIVE_AGENT_ENABLED", undefined); vi.stubEnv("POA_PUBLIC_AI_ENABLED", undefined); });
const request = (body: unknown, authorization?: string) => new NextRequest("https://poa.example/api/agent", {method: "POST", headers: {"Content-Type": "application/json", ...(authorization ? {authorization} : {})}, body: JSON.stringify(body)});
it("rejects malformed transactions before any chain or model tool runs", async () => {expect((await POST(request({transactionHash: "oops"}))).status).toBe(400);expect(run).not.toHaveBeenCalled();});
it("does not silently run the model for a public caller", async () => {expect((await POST(request({useModel: true}))).status).toBe(403);expect(run).not.toHaveBeenCalled();});
it("rejects unsupported client-supplied RPC destinations", async () => {expect((await POST(request({rpcUrl: "http://private-host"}))).status).toBe(400);expect(run).not.toHaveBeenCalled();});
it("allows the bounded read-only rule investigation without model credentials", async () => {expect((await POST(request({}))).status).toBe(200);expect(run).toHaveBeenCalledOnce();});
it("an agent token does not bypass the explicit live model switch", async () => {vi.stubEnv("POA_DEMO_TOKEN", "a".repeat(32));expect((await POST(request({useModel: true}, "Bearer " + "a".repeat(32)))).status).toBe(403);expect(run).not.toHaveBeenCalled();});

});

import { HISTORICAL_LIQUIDATION } from "../src/chain/aave-forensics";
describe("public historical AI demo", () => {
  const request = (body: unknown) => new NextRequest("https://poa.example/api/investigate", {method: "POST", headers: {"Content-Type":"application/json"}, body:JSON.stringify(body)});
  beforeEach(() => {run.mockClear();vi.stubEnv("NODE_ENV", "production");vi.stubEnv("POA_DEMO_TOKEN", undefined);vi.stubEnv("POA_LIVE_AGENT_ENABLED", "true");vi.stubEnv("POA_PUBLIC_AI_ENABLED", "true");vi.stubEnv("LITELLM_API_KEY", "test-server-key-not-real");vi.stubEnv("LITELLM_BASE_URL", "https://model.example/v1");vi.stubEnv("OPENAI_API_KEY", undefined);});
  it("uses the server model for the default historical case without a private code", async () => {
    const response = await DEEP_POST(request({}));expect(response.status).toBe(200);
    expect((run.mock.calls as any)[0][0]).toBe(HISTORICAL_LIQUIDATION);
    expect(await response.text()).not.toContain("test-server-key-not-real");
  });
  it("does not expose arbitrary public AI transaction access", async () => {expect((await DEEP_POST(request({useModel:true,transactionHash:`0x${"ab".repeat(32)}`}))).status).toBe(403);expect(run).not.toHaveBeenCalled();});
  it("keeps explicit rule mode available without a model key", async () => {vi.stubEnv("LITELLM_API_KEY", undefined);expect((await DEEP_POST(request({useModel:false}))).status).toBe(200);});
  it("reports a missing server key instead of quietly substituting rule mode", async () => {vi.stubEnv("LITELLM_API_KEY", undefined);expect((await DEEP_POST(request({}))).status).toBe(503);expect(run).not.toHaveBeenCalled();});
});
