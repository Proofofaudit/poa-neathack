import { describe, it, expect } from "vitest";
import { AaveForensics, netLiquidationCost, referenceHealth, sqrtPriceMicroUsdc, tickPriceMicroUsdc } from "../src/chain/aave-forensics";
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
function evidence(prices = [2000, 2000, 2000, 2000]) {
  const f = new AaveForensics({} as any);
  f.position = { eMode: "0", earlierOnlyL1Attributes: true, treasuryTransferBaseUnits: "10000000", caveats: [], liquidation: { collateralAsset: USDC, debtAsset: WETH, collateralLiquidatedBaseUnits: "2100000000", debtCoveredBaseUnits: "1000000000000000000" }, positions: [ { asset: USDC, suppliedBaseUnits: "2500000000", stableDebtBaseUnits: "0", variableDebtBaseUnits: "0", collateralEnabled: true, decimals: 6, liquidationThresholdBps: "7800", oraclePriceBefore: "100000000", oraclePriceEndBlock: "100000000" }, { asset: WETH, suppliedBaseUnits: "0", stableDebtBaseUnits: "0", variableDebtBaseUnits: "1000000000000000000", decimals: 18, oraclePriceBefore: "200000000000", oraclePriceEndBlock: "200000000000" } ] };
  f.reference = { samples: prices.map(v => ({ pool: "dex", prices: [{ windowSeconds: 300, wethPriceMicroUsdc: String(v * 1e6) }] })), caveats: [] };
  return f;
}
describe("Aave forensic evidence gates", () => {
  it("values six-decimal collateral and eighteen-decimal debt without assuming a dollar peg", () => {
    expect(referenceHealth(2500n * 10n**6n, 10n**18n, 7800n, 2000n * 10n**6n)).toBe(975000000000000000n);
    expect(netLiquidationCost(2110n * 10n**6n, 10n**18n, 2000n * 10n**6n)).toBe(110000000n);
  });
  it("never turns positive observed cost into oracle damages or a payout", () => {
    const result = evidence().assess();
    expect(result.decision).toBe("NO_COMPENSATION_JUSTIFIED_BY_EVIDENCE");
    expect(result.scenarios[0].netLiquidationCostMicroUsdc).toBe("110000000");
    expect(result.compensationProposal).toBeNull(); expect(result.eligibleCompensationMicroUsdc).toBeNull(); expect(result.payoutAuthorized).toBe(false);
  });
  it("preserves ambiguity when health crosses the threshold by reference window", () => {
    const result = evidence([1900, 2000, 1900, 2000]).assess();
    expect(result.decision).toBe("INSUFFICIENT_EVIDENCE"); expect(result.referenceSensitivity).toBe("WINDOW_AND_POOL_SENSITIVE"); expect(result.oracleFault).toBe("NOT_ESTABLISHED");
  });
  it("healthy counterfactual scenarios still cannot prove an oracle fault", () => {
    const result = evidence([1900, 1900, 1900, 1900]).assess();
    expect(result.avoidability).toContain("BASELINE_ONLY"); expect(result.decision).toBe("INSUFFICIENT_EVIDENCE"); expect(result.compensationProposal).toBeNull();
  });
  it("rejects unmodelled assets, eMode and missing reference coverage", () => {
    for (const change of [(f: AaveForensics) => f.position.eMode = "1", (f: AaveForensics) => f.position.positions.push({asset: "other"}), (f: AaveForensics) => f.reference.samples = []]) {
      const f = evidence(); change(f); expect(f.assess().decision).toBe("INSUFFICIENT_EVIDENCE");
    }
  });
  it("retains negative transfer-cost estimates rather than inventing a loss", () => { expect(netLiquidationCost(1000000n, 10n**18n, 2000000n)).toBe(-1000000n); });
  it("rounds negative average ticks down and rejects invalid position values", () => {
    expect(tickPriceMicroUsdc(0n, -301n, 300)).toBeLessThan(tickPriceMicroUsdc(0n, -300n, 300));
    expect(sqrtPriceMicroUsdc(1n << 96n)).toBe(10n**18n);
    expect(() => referenceHealth(1n, 0n, 7800n, 1n)).toThrow();
  });
});

import { LiveAaveAgent } from "../src/agent/live-agent";
it("the incident controller selects a real candidate and cannot skip causal evidence", async () => {
  const calls: string[] = [];
  const report = await new LiveAaveAgent({ run: async (action, hash) => {
    calls.push(action);
    if (action === "FIND_LIQUIDATION") return { transactionHash: `0x${"ab".repeat(32)}`, selection: "CURATED_HISTORICAL_CANDIDATE_REVALIDATED" };
    if (action === "READ_TRANSACTION") { expect(hash).toBe(`0x${"ab".repeat(32)}`); return { executionStatus: "SUCCEEDED", liquidations: [{borrower: "borrower"}] }; }
    if (action === "READ_MARKET") return {reserveCount: 5, sampledAssets: [], blockNumber: 10};
    if (action === "CHECK_ORACLE_SOURCES") return {feeds: []};
    if (action === "ASSESS_CAUSALITY") return {decision: "INSUFFICIENT_EVIDENCE", reason: "No proven fault", limits: []};
    if (action === "VERIFY_BLOCKS") return {verified: true};
    return {read: true};
  } }).run(undefined, undefined, true);
  expect(report.status).toBe("COMPLETED"); expect(report.policyDecision).toBe("WITHHELD");
  expect(calls.indexOf("READ_INDEPENDENT_PRICES")).toBeGreaterThan(calls.indexOf("RECONSTRUCT_POSITION"));
  expect(calls.indexOf("ASSESS_CAUSALITY")).toBeGreaterThan(calls.indexOf("READ_INDEPENDENT_PRICES"));
  expect(calls.at(-1)).toBe("VERIFY_BLOCKS");
});

import savedReplay from "../public/evidence/real-execution-replay.json";
it("revalidates saved replay output against the requested mainnet receipt", async () => {
  const receipt = { ...savedReplay.originalReceipt, gasUsed: BigInt(savedReplay.originalReceipt.gasUsed) };
  const f = new AaveForensics({getTransactionReceipt: async () => receipt} as any);
  expect((await f.readExecutionReplay(savedReplay.transactionHash)).status).toBe("VERIFIED_SAVED_REPLAY");
  expect((await f.readExecutionReplay(`0x${"ab".repeat(32)}`)).status).toBe("UNAVAILABLE");
  const wrong = new AaveForensics({getTransactionReceipt: async () => ({...receipt, gasUsed: 1n})} as any);
  await expect(wrong.readExecutionReplay(savedReplay.transactionHash)).rejects.toThrow();
});
it("a verified replay cannot authorize compensation or override unsupported positions", () => {
  const f = evidence();
  f.replay = {...savedReplay, status: "VERIFIED_SAVED_REPLAY"};
  expect(f.assess().avoidability).toBe("LIQUIDATION_PERSISTS_AT_BOTH_SPOT_REFERENCES");
  expect(f.assess().payoutAuthorized).toBe(false);
  f.position.eMode = "1";
  expect(f.assess().decision).toBe("INSUFFICIENT_EVIDENCE");
});
