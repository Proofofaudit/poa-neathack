import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";
it("MCP handshake, notifications, manifest serialization and dynamic baseline work over stdio", () => {
  const id = "0x" + "aa".repeat(32),
    address = "0x1111111111111111111111111111111111111111";
  const requests = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "poa_generate_merkle_manifest",
        arguments: {
          incidentId: id,
          claims: [{ claimIndex: 0, claimant: address, amountUsdc: "1000000" }],
        },
      },
    },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "poa_replay_counterfactual",
        arguments: {
          borrowerAddress: address,
          collateralWeth: "10000000000000000000",
          debtUsdc: "22500000000",
          debtCoveredUsdc: "22500000000",
          collateralSeizedWeth: "8750000000000000000",
          faultyPriceUsd8Dec: "270000000000",
          baselinePriceUsd8Dec: "300000000000",
        },
      },
    },
  ];
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/mcp/server.ts"],
    {
      input: requests.map((r) => JSON.stringify(r)).join("\n") + "\n",
      encoding: "utf8",
      timeout: 10000,
    },
  );
  expect(result.status).toBe(0);
  const responses = result.stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(responses).toHaveLength(3);
  expect(responses[0].result.capabilities.tools).toBeDefined();
  const manifest = JSON.parse(responses[1].result.content[0].text);
  expect(manifest.leaves[0].amount).toBe("1000000");
  expect(manifest.authorizesPayout).toBe(false);
  const replay = JSON.parse(responses[2].result.content[0].text);
  expect(replay.status).toBe("VERIFIED");
  expect(replay.restitutionUsdc).toBe("3750000000");
  expect(replay.authorizesPayout).toBe(false);
});
