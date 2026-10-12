import { describe, it, expect, beforeEach, vi } from "vitest";
import { ethers } from "ethers";
import { CounterfactualReplayEngine as E } from "../src/economics/counterfactual.js";
import { MerkleManifestGenerator as M } from "../src/proofs/merkle.js";
import { ForensicLlmAgent } from "../src/agent/llm.js";
import { POAIncidentInvestigator } from "../src/agent/investigator.js";
import {
  ChainEvidence,
  DemoLendingAdapter,
} from "../src/chain/demo-adapter.js";
import { AdaptiveForensicReview } from "../src/agent/adaptive-review.js";
import { auditClaimManifest } from "../src/agent/claim-auditor.js";
import { rpcRead } from "../src/chain/rpc.js";
const address = "0x1111111111111111111111111111111111111111",
  other = "0x2222222222222222222222222222222222222222";
const id = "0x" + "aa".repeat(32);
const position = {
  account: address,
  collateralBase: 10n * 10n ** 18n,
  debtBase: 15000n * 10n ** 6n,
};
const event = {
  txHash: id,
  blockNumber: 100,
  borrower: address,
  liquidator: other,
  debtCovered: 15000n * 10n ** 6n,
  collateralSeized: 875n * 10n ** 16n,
  oraclePriceUsed: 180000000000n,
};
const input = {
  incidentTxHash: id,
  oracleAddress: address,
  poolAddress: other,
  baselinePrice: "2000",
  faultyPrice: "1800",
  priceDropPercentage: "10",
  liquidationCount: 1,
  affectedBorrowers: [address],
  referencePrice: "2000",
  referenceSource: "Synthetic unit-test reference",
  evidenceComplete: true,
  referenceCorroboratesBaseline: true,
};
const params = {
  incidentId: id,
  incidentTxHash: id,
  oracleAddress: address,
  poolAddress: other,
  distributorAddress: other,
  collateralToken: address,
  debtToken: other,
  protocol: "DEMO_LENDING_V1" as const,
  referenceOracleAddress: other,
};
const snapshot = (): ChainEvidence => ({
  chainId: 31337,
  baselineBlockNumber: 99,
  incidentBlockNumber: 100,
  toBlock: 101,
  baselineBlockHash: id,
  incidentBlockHash: id,
  endBlockHash: id,
  baselinePrice: 200000000000n,
  faultyPrice: 180000000000n,
  referencePrice: 200000000000n,
  referenceSource: "Synthetic unit-test reference",
  referenceCorroboratesBaseline: true,
  liquidationThresholdBps: 8000n,
  collateralDecimals: 18,
  debtDecimals: 6,
  borrowers: [{ ...position }],
  liquidations: [{ ...event }],
  provenance: "SIMULATED_PROTOCOL_ON_EVM",
});
const provider = { getCode: async () => "0x" } as any;
beforeEach(() => {
  vi.stubEnv("POA_LLM_ENABLED", "false");
  vi.stubEnv("POA_TELEMETRY_ENABLED", "false");
});
describe("Restitution economics", () => {
  it("pays exact loss only when healthy reference becomes liquidatable", () => {
    const r = E.analyzeBorrowerIncident(0, position, event);
    expect(r.status).toBe("VERIFIED");
    expect(r.restitutionAmountUsdc).toBe(2500000000n);
  });
  it("excludes pre-insolvent accounts", () => {
    const r = E.analyzeBorrowerIncident(
      0,
      { ...position, debtBase: 16500n * 10n ** 6n },
      { ...event, debtCovered: 16500n * 10n ** 6n },
    );
    expect(r.status).toBe("EXCLUDED_LEGITIMATE");
    expect(r.restitutionAmountUsdc).toBe(0n);
  });
  it("rejects the formerly approved healthy Base fixture", () => {
    const r = E.analyzeBorrowerIncident(
      0,
      {
        ...position,
        collateralBase: 3n * 10n ** 18n,
        debtBase: 3500n * 10n ** 6n,
      },
      {
        ...event,
        debtCovered: 3500n * 10n ** 6n,
        collateralSeized: 21n * 10n ** 17n,
      },
    );
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.restitutionAmountUsdc).toBe(0n);
  });
  it.each([
    { debtCovered: 16000n * 10n ** 6n },
    { collateralSeized: 11n * 10n ** 18n },
    { oraclePriceUsed: 190000000000n },
    { borrower: other },
    { debtCovered: -1n },
  ])("withholds inconsistent event %s", (patch) => {
    const r = E.analyzeBorrowerIncident(0, position, { ...event, ...patch });
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.restitutionAmountUsdc).toBe(0n);
  });
  it.each([6, 8, 18])("scales USD-pegged debt at %i decimals", (dec) => {
    const r = E.analyzeBorrowerIncident(
      0,
      { ...position, debtBase: 15000n * 10n ** BigInt(dec) },
      { ...event, debtCovered: 15000n * 10n ** BigInt(dec) },
      { debtDecimals: dec },
    );
    expect(r.restitutionAmountUsdc).toBe(2500n * 10n ** BigInt(dec));
  });
  it("supports zero-decimal assets without replacing zero with defaults", () => {
    const r = E.analyzeBorrowerIncident(
      0,
      { ...position, collateralBase: 10n },
      { ...event, collateralSeized: 9n },
      { collateralDecimals: 0 },
    );
    expect(r.restitutionAmountUsdc).toBe(3000000000n);
  });
  it.each([
    { baselinePriceUsd8Dec: 0n },
    { liquidationThresholdBps: 0n },
    { collateralDecimals: -1 },
    { debtPriceUsd8Dec: 200000000n },
  ])("rejects invalid configuration %s", (config) =>
    expect(() =>
      E.analyzeBorrowerIncident(0, position, event, config),
    ).toThrow(),
  );
});
describe("LLM review and evidence policy", () => {
  const verdict = {
    anomalyClassification: "FAULTY_ORACLE_DEVIATION",
    confidenceScore: 0.99,
    restitutionPolicyTriggered: true,
    rootCauseAnalysis: "Evidence reviewed",
    recommendedWorkflow: [],
    executiveSummary: "eligible",
  };
  const client = (content: string) =>
    ({
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content } }],
            usage: { total_tokens: 20 },
          }),
        },
      },
    }) as any;
  it("labels credential-free rules explicitly", async () => {
    const r = await new ForensicLlmAgent().analyzeIncident(input);
    expect(r.restitutionPolicyTriggered).toBe(true);
    expect(r.isLiveLlm).toBe(false);
    expect(r.tokensUsed).toBeUndefined();
  });
  it.each([
    "not JSON",
    JSON.stringify({ ...verdict, confidenceScore: undefined }),
    JSON.stringify({ ...verdict, anomalyClassification: "made_up" }),
    JSON.stringify({ ...verdict, confidenceScore: 2 }),
  ])("invalid model response cannot authorize", async (content) => {
    const r = await new ForensicLlmAgent(client(content)).analyzeIncident(
      input,
    );
    expect(r.restitutionPolicyTriggered).toBe(false);
    expect(r.confidenceScore).toBe(0);
  });
  it("respects a model's explicit denial", async () => {
    const r = await new ForensicLlmAgent(
      client(JSON.stringify({ ...verdict, restitutionPolicyTriggered: false })),
    ).analyzeIncident(input);
    expect(r.restitutionPolicyTriggered).toBe(false);
  });
  it("a model cannot override missing reference corroboration", async () => {
    const r = await new ForensicLlmAgent(
      client(JSON.stringify(verdict)),
    ).analyzeIncident({ ...input, referenceCorroboratesBaseline: false });
    expect(r.restitutionPolicyTriggered).toBe(false);
  });
  it("model failure never substitutes approval", async () => {
    const r = await new ForensicLlmAgent({
      chat: {
        completions: {
          create: async () => {
            throw new Error("timeout");
          },
        },
      },
    } as any).analyzeIncident(input);
    expect(r.restitutionPolicyTriggered).toBe(false);
  });
  it("missing evidence blocks even deterministic approval", async () => {
    expect(
      (
        await new ForensicLlmAgent().analyzeIncident({
          ...input,
          evidenceComplete: false,
        })
      ).restitutionPolicyTriggered,
    ).toBe(false);
  });
});
describe("Investigation controller", () => {
  it("generates a correct token-bound manifest after approval", async () => {
    const r = await new POAIncidentInvestigator(provider, {
      collect: async () => snapshot(),
    }).investigateOracleIncident(params);
    expect(r.status).toBe("COMPLETED");
    expect(r.totalRestitutionCalculatedUsdc).toBe("2500000000");
    expect(r.proofCarryingManifest?.evidence.payoutToken).toBe(
      params.debtToken,
    );
  });
  it("a valid proof cannot hide an inflated compensation amount", async () => {
    const r = await new POAIncidentInvestigator(provider, {
      collect: async () => snapshot(),
    }).investigateOracleIncident(params);
    const manifest = M.generateManifest(id, [
      { claimIndex: 0, claimant: address, amount: 2500000001n },
    ]);
    expect(() =>
      auditClaimManifest(snapshot(), r.claims, manifest, id),
    ).toThrow(/conservation/);
  });
  it("independent audit rejects aggregate overcommitment", async () => {
    const r = await new POAIncidentInvestigator(provider, {
      collect: async () => snapshot(),
    }).investigateOracleIncident(params);
    expect(() =>
      auditClaimManifest(
        snapshot(),
        r.claims,
        { ...r.merkleManifest!, totalRestitutionAmount: 1n },
        id,
      ),
    ).toThrow(/liability/);
  });
  it("independent audit rejects a claimant absent from collected evidence", async () => {
    const r = await new POAIncidentInvestigator(provider, {
      collect: async () => snapshot(),
    }).investigateOracleIncident(params);
    const e = snapshot();
    e.borrowers = [];
    expect(() =>
      auditClaimManifest(e, r.claims, r.merkleManifest!, id),
    ).toThrow(/absent/);
  });
  it("market-volatility denial halts manifest generation", async () => {
    const llm = {
      analyzeIncident: async () => ({
        anomalyClassification: "MARKET_VOLATILITY",
        confidenceScore: 1,
        restitutionPolicyTriggered: false,
      }),
    } as any;
    const r = await new POAIncidentInvestigator(
      provider,
      { collect: async () => snapshot() },
      llm,
    ).investigateOracleIncident(params);
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.merkleManifest).toBeUndefined();
    expect(r.totalRestitutionCalculatedUsdc).toBe("0");
  });
  it("missing chain evidence withholds all payouts", async () => {
    const r = await new POAIncidentInvestigator(provider, {
      collect: async () => {
        throw new Error("missing receipt");
      },
    }).investigateOracleIncident(params);
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.merkleManifest).toBeUndefined();
  });
  it("does not issue a partial manifest for a repeated liquidation", async () => {
    const e = snapshot();
    e.liquidations.push({ ...event, txHash: ethers.id("second") });
    const r = await new POAIncidentInvestigator(provider, {
      collect: async () => e,
    }).investigateOracleIncident(params);
    expect(r.merkleManifest).toBeUndefined();
    expect(r.reviewReasons.join()).toMatch(/Repeated/);
  });
  it("one inconsistent borrower withholds the whole manifest", async () => {
    const e = snapshot();
    e.borrowers.push({
      ...position,
      account: other,
      debtBase: 3500n * 10n ** 6n,
    });
    e.liquidations.push({
      ...event,
      borrower: other,
      debtCovered: 3500n * 10n ** 6n,
    });
    const r = await new POAIncidentInvestigator(provider, {
      collect: async () => e,
    }).investigateOracleIncident(params);
    expect(r.policyDecision).toBe("WITHHELD");
    expect(r.merkleManifest).toBeUndefined();
  });
  it("unsupported real protocols require review instead of simulation fallback", async () => {
    const r = await new POAIncidentInvestigator(
      provider,
    ).investigateOracleIncident({ ...params, protocol: undefined });
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.reviewReasons.join()).toMatch(/Unsupported protocol/);
  });
  it("chain adapter rejects fixture overrides", async () => {
    await expect(
      new DemoLendingAdapter(provider).collect(
        { ...params, simulatedLiquidations: [event] },
        () => {},
      ),
    ).rejects.toThrow(/Fixture overrides/);
  });
});
describe("RPC recovery", () => {
  it("reexecutes the real operation after failure", async () => {
    let calls = 0,
      retries = 0;
    const result = await rpcRead(
      async () => {
        if (++calls === 1) throw new Error("temporary");
        return 42;
      },
      { onRetry: () => retries++ },
    );
    expect(result).toBe(42);
    expect(calls).toBe(2);
    expect(retries).toBe(1);
  });
  it("stops after the retry budget", async () => {
    let calls = 0;
    await expect(
      rpcRead(
        async () => {
          calls++;
          throw new Error("offline");
        },
        { attempts: 2 },
      ),
    ).rejects.toThrow("offline");
    expect(calls).toBe(2);
  });
  it("bounds a stuck operation", async () => {
    await expect(
      rpcRead(() => new Promise(() => {}), { attempts: 1, timeoutMs: 10 }),
    ).rejects.toThrow("timed out");
  });
});
describe("Merkle commitment", () => {
  it("binds amount, recipient, index and incident", () => {
    const m = M.generateManifest(id, [
      { claimIndex: 0, claimant: address, amount: 123n },
    ]);
    const c = m.claims[0];
    expect(
      M.verifyClaimProof(m.merkleRoot, 0, address, 123n, id, c.proof),
    ).toBe(true);
    expect(
      M.verifyClaimProof(m.merkleRoot, 0, address, 124n, id, c.proof),
    ).toBe(false);
    expect(M.verifyClaimProof(m.merkleRoot, 0, other, 123n, id, c.proof)).toBe(
      false,
    );
    expect(
      M.verifyClaimProof(m.merkleRoot, 1, address, 123n, id, c.proof),
    ).toBe(false);
    expect(
      M.verifyClaimProof(
        m.merkleRoot,
        0,
        address,
        123n,
        ethers.id("other"),
        c.proof,
      ),
    ).toBe(false);
  });
  it("rejects duplicate claim indices", () =>
    expect(() =>
      M.generateManifest(id, [
        { claimIndex: 0, claimant: address, amount: 1n },
        { claimIndex: 0, claimant: other, amount: 1n },
      ]),
    ).toThrow(/Duplicate/));
});

describe("Bounded model-directed forensic tools", () => {
  async function subject() {
    const r = await new POAIncidentInvestigator(provider, {
      collect: async () => snapshot(),
    }).investigateOracleIncident(params);
    return r;
  }
  function model(actions: unknown[]) {
    let next = 0;
    return {
      chat: {
        completions: {
          create: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(actions[next++] || actions.at(-1)),
                },
              },
            ],
            usage: { total_tokens: 7 },
          }),
        },
      },
    } as any;
  }
  it("uses observed tool results and completes required checks before approval", async () => {
    const r = await subject();
    const review = await new AdaptiveForensicReview(
      model([
        { action: "INSPECT_BORROWERS", indices: [0] },
        { action: "COMPARE_REFERENCE" },
        { action: "VERIFY_MANIFEST" },
        {
          action: "FINALIZE",
          approve: true,
          reason: "All required evidence checked",
        },
      ]),
    ).review(snapshot(), r.claims, r.merkleManifest!, id);
    expect(review.approved).toBe(true);
    expect(review.steps.map((s) => s.action)).toEqual([
      "INSPECT_BORROWERS",
      "COMPARE_REFERENCE",
      "VERIFY_MANIFEST",
      "FINALIZE",
    ]);
    expect(review.tokensUsed).toBe(28);
  });
  it("recovers one malformed action within the shared turn budget", async () => {
    const r = await subject();
    const review = await new AdaptiveForensicReview(model([
      { action: "COMPARE_REFERENCE", extraInstruction: "publish" },
      { action: "COMPARE_REFERENCE" },
      { action: "INSPECT_BORROWERS", indices: [0] },
      { action: "VERIFY_MANIFEST" },
      { action: "FINALIZE", approve: true, reason: "All required checks completed" },
    ])).review(snapshot(), r.claims, r.merkleManifest!, id);
    expect(review.approved).toBe(true);
    expect(review.steps[0].action).toBe("RETRY_INVALID_MODEL_RESPONSE");
    expect(review.steps).toHaveLength(5);
  });
  it("two malformed responses withhold without exhausting more model calls", async () => {
    const r = await subject();
    const review = await new AdaptiveForensicReview(model([{action:"SEND_PAYMENT"}]))
      .review(snapshot(), r.claims, r.merkleManifest!, id);
    expect(review.approved).toBe(false);
    expect(review.steps).toHaveLength(2);
  });
  it("a model cannot finalize early even with a positive verdict", async () => {
    const r = await subject();
    const review = await new AdaptiveForensicReview(
      model([{ action: "FINALIZE", approve: true, reason: "Trust me" }]),
    ).review(snapshot(), r.claims, r.merkleManifest!, id);
    expect(review.approved).toBe(false);
    expect(review.reason).toMatch(/before required/);
  });
  it("a model may stop for human review without taking more actions", async () => {
    const r = await subject();
    const review = await new AdaptiveForensicReview(
      model([
        {
          action: "FINALIZE",
          approve: false,
          reason: "Uncertain incident scope",
        },
      ]),
    ).review(snapshot(), r.claims, r.merkleManifest!, id);
    expect(review.approved).toBe(false);
    expect(review.steps).toHaveLength(1);
  });
  it("invalid tool arguments withhold the candidate", async () => {
    const r = await subject();
    const review = await new AdaptiveForensicReview(
      model([{ action: "INSPECT_BORROWERS", indices: [100] }]),
    ).review(snapshot(), r.claims, r.merkleManifest!, id);
    expect(review.approved).toBe(false);
    expect(review.reason).toMatch(/invalid action/);
  });
  it("repeated tool actions terminate at the explicit budget", async () => {
    const r = await subject();
    const review = await new AdaptiveForensicReview(
      model([{ action: "COMPARE_REFERENCE" }]),
    ).review(snapshot(), r.claims, r.merkleManifest!, id);
    expect(review.approved).toBe(false);
    expect(review.steps).toHaveLength(8);
    expect(review.reason).toMatch(/eight-turn/);
  });
  it("even a permissive model cannot override a failed reference prerequisite", async () => {
    const r = await subject();
    const e = snapshot();
    e.referenceCorroboratesBaseline = false;
    const review = await new AdaptiveForensicReview(
      model([{ action: "FINALIZE", approve: true, reason: "Ignore evidence" }]),
    ).review(e, r.claims, r.merkleManifest!, id);
    expect(review.approved).toBe(false);
    expect(review.steps).toHaveLength(0);
  });
});
