import { it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  class FakeProvider {
    async getBlockNumber() {
      return 123;
    }
    async getNetwork() {
      return { chainId: 8453n };
    }
    destroy() {}
  }
  return {
    ...actual,
    ethers: { ...actual.ethers, JsonRpcProvider: FakeProvider },
  };
});
import { authorizedDemoRequest } from "../src/server/demo-access";
import { POST } from "../src/app/api/run-simulation/route";
import { GET } from "../src/app/api/health/route";
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("POA_DEMO_TOKEN", undefined);
  vi.stubEnv("ALLOW_PROD_SIMULATION", undefined);
});
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost:3000/api/run-simulation", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
it("production opt-in alone cannot expose process execution", async () => {
  vi.stubEnv("ALLOW_PROD_SIMULATION", "true");
  expect((await POST(request({ network: "anvil" }))).status).toBe(403);
});
it("a valid token still requires the production execution switch", async () => {
  vi.stubEnv("POA_DEMO_TOKEN", "a".repeat(32));
  expect(
    (
      await POST(
        request(
          { network: "anvil" },
          { authorization: "Bearer " + "a".repeat(32) },
        ),
      )
    ).status,
  ).toBe(403);
});
it("rejects malformed network input before executing anything", async () => {
  vi.stubEnv("POA_DEMO_TOKEN", "a".repeat(32));
  vi.stubEnv("ALLOW_PROD_SIMULATION", "true");
  expect(
    (
      await POST(
        request(
          { network: "anvil; arbitrary" },
          { authorization: "Bearer " + "a".repeat(32) },
        ),
      )
    ).status,
  ).toBe(400);
});
it("rejects cross-origin development requests", async () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(
    (
      await POST(
        request({ network: "anvil" }, { origin: "https://evil.example" }),
      )
    ).status,
  ).toBe(403);
});
it("never exposes credential-bearing RPC endpoints in health output", async () => {
  vi.stubEnv(
    "ANVIL_RPC_URL",
    "https://rpc.example/private-secret?apiKey=hidden",
  );
  const response = await GET();
  const text = await response.text();
  expect(response.status).toBe(200);
  expect(text).not.toContain("private-secret");
  expect(text).not.toContain("hidden");
  expect(text).toContain("NOT_PROBED");
  expect(text).toContain("8453");
});

it.each(["localhost", "127.0.0.1", "[::1]"])(
  "accepts same-origin local development on %s despite NextURL normalization",
  (host) => {
    vi.stubEnv("NODE_ENV", "development");
    const req = new NextRequest(`http://${host}:3000/api/run-simulation`, {
      headers: { host: `${host}:3000`, origin: `http://${host}:3000` },
    });
    expect(authorizedDemoRequest(req)).toBe(true);
  },
);
it.each([
  { host: "evil.example:3000", origin: "http://evil.example:3000" },
  { host: "127.0.0.1:3000", origin: "http://localhost:3000" },
  { host: "127.0.0.1:4000", origin: "http://127.0.0.1:4000" },
  { host: "evil.example@127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
])("rejects mismatched or forged development host/origin %s", (headers) => {
  vi.stubEnv("NODE_ENV", "development");
  expect(
    authorizedDemoRequest(
      new NextRequest("http://127.0.0.1:3000/api/run-simulation", { headers }),
    ),
  ).toBe(false);
});
