import { describe, it, expect, beforeEach } from "vitest";
import { ethers } from "ethers";
import { CounterfactualReplayEngine } from "../src/economics/counterfactual.js";
import { MerkleManifestGenerator } from "../src/proofs/merkle.js";
import { POAIncidentInvestigator } from "../src/agent/investigator.js";
import { neatlogs } from "../src/observability/neatlogs.js";

describe("POA Counterfactual Financial Engine", () => {
  const BASELINE_PRICE = 200000000000n; // $2000.00
  const FAULTY_PRICE = 180000000000n;   // $1800.00 (-10%)

  it("identifies healthy borrower at baseline ($2000) that becomes liquidatable at $1800", () => {
    // Borrower 1: 10 WETH, 15,000 USDC debt
    const pos = {
      account: "0x1111111111111111111111111111111111111111",
      collateralBase: 10n * 10n ** 18n,
      debtBase: 15000n * 10n ** 6n
    };

    const hfBaseline = CounterfactualReplayEngine.calculateHealthFactor(pos.collateralBase, pos.debtBase, BASELINE_PRICE);
    const hfFaulty = CounterfactualReplayEngine.calculateHealthFactor(pos.collateralBase, pos.debtBase, FAULTY_PRICE);

    expect(hfBaseline).toBeGreaterThan(10n ** 18n); // 1.066 > 1.0 (SAFE)
    expect(hfFaulty).toBeLessThan(10n ** 18n);       // 0.960 < 1.0 (UNDERWATER)

    // Simulate liquidation: liquidator repays 15,000 USDC debt, seizes 8.75 WETH (at $1800 + 5% bonus)
    // 15,000 * 1.05 = $15,750 / $1800 = 8.75 WETH
    const collateralSeized = (875n * 10n ** 16n); // 8.75 WETH
    const liqEvent = {
      txHash: "0xabc123",
      blockNumber: 100,
      liquidator: "0xLiquidator",
      borrower: pos.account,
      debtCovered: 15000n * 10n ** 6n,
      collateralSeized,
      oraclePriceUsed: FAULTY_PRICE
    };

    const result = CounterfactualReplayEngine.analyzeBorrowerIncident(0, pos, liqEvent, FAULTY_PRICE);

    expect(result.status).toBe("VERIFIED");
    expect(result.restitutionAmountUsdc).toBeGreaterThan(0n);
    // Calculated net equity loss: (8.75 * 2000) - 15000 = $17,500 - $15,000 = $2,500 USDC
    expect(result.restitutionAmountUsdc).toBe(2500000000n); // 2,500 USDC
  });

  it("excludes already undercollateralized borrower (legitimate liquidation)", () => {
    // Borrower: 10 WETH, 16,500 USDC debt (HF at baseline = (20000 * 0.8) / 16500 = 0.969 < 1.0)
    const pos = {
      account: "0x2222222222222222222222222222222222222222",
      collateralBase: 10n * 10n ** 18n,
      debtBase: 16500n * 10n ** 6n
    };

    const liqEvent = {
      txHash: "0xdef456",
      blockNumber: 101,
      liquidator: "0xLiquidator",
      borrower: pos.account,
      debtCovered: 16500n * 10n ** 6n,
      collateralSeized: 9n * 10n ** 18n,
      oraclePriceUsed: FAULTY_PRICE
    };

    const result = CounterfactualReplayEngine.analyzeBorrowerIncident(1, pos, liqEvent, FAULTY_PRICE);

    expect(result.status).toBe("EXCLUDED_LEGITIMATE");
    expect(result.restitutionAmountUsdc).toBe(0n);
  });
});

describe("POA Cryptographic Merkle Manifest", () => {
  const incidentId = "0x" + "11".repeat(32);
  const claims = [
    { claimIndex: 0, claimant: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount: 2500000000n },
    { claimIndex: 1, claimant: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", amount: 1250000000n },
    { claimIndex: 2, claimant: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", amount: 2000000000n }
  ];

  it("generates deterministic OpenZeppelin standard Merkle tree and valid proofs", () => {
    const manifest = MerkleManifestGenerator.generateManifest(incidentId, claims);

    expect(manifest.claimsCount).toBe(3);
    expect(manifest.merkleRoot).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(manifest.totalRestitutionAmount).toBe(5750000000n);

    // Verify proof for each claim
    for (const c of manifest.claims) {
      const isValid = MerkleManifestGenerator.verifyClaimProof(
        manifest.merkleRoot,
        c.claimIndex,
        c.claimant,
        c.amount,
        incidentId,
        c.proof
      );
      expect(isValid).toBe(true);
    }
  });

  it("rejects tampered claim amount or incorrect claimant", () => {
    const manifest = MerkleManifestGenerator.generateManifest(incidentId, claims);
    const claim0 = manifest.claims[0];

    // Tamper amount
    const isValidTamperedAmount = MerkleManifestGenerator.verifyClaimProof(
      manifest.merkleRoot,
      claim0.claimIndex,
      claim0.claimant,
      claim0.amount + 1000000n,
      incidentId,
      claim0.proof
    );
    expect(isValidTamperedAmount).toBe(false);

    // Tamper recipient
    const isValidTamperedRecipient = MerkleManifestGenerator.verifyClaimProof(
      manifest.merkleRoot,
      claim0.claimIndex,
      "0x000000000000000000000000000000000000dead",
      claim0.amount,
      incidentId,
      claim0.proof
    );
    expect(isValidTamperedRecipient).toBe(false);
  });
});

describe("POA Autonomous Agent & Failure Recovery", () => {
  const mockProvider = new ethers.JsonRpcProvider();

  it("completes autonomous investigation and records Neatlogs spans", async () => {
    const investigator = new POAIncidentInvestigator(mockProvider);
    const incidentId = "0x" + "aa".repeat(32);

    const report = await investigator.investigateOracleIncident({
      incidentId,
      incidentTxHash: "0x9999999999999999999999999999999999999999999999999999999999999999",
      oracleAddress: "0xOracle",
      poolAddress: "0xPool",
      distributorAddress: "0xDistributor",
      collateralToken: "0xWeth",
      debtToken: "0xUsdc",
      simulatedLiquidations: [
        {
          txHash: "0xliq1",
          blockNumber: 100,
          liquidator: "0xLiq",
          borrower: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          debtCovered: 15000n * 10n ** 6n,
          collateralSeized: 875n * 10n ** 16n,
          oraclePriceUsed: 180000000000n
        }
      ],
      knownBorrowers: [
        {
          account: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          collateral: 10n * 10n ** 18n,
          debt: 15000n * 10n ** 6n
        }
      ]
    });

    expect(report.status).toBe("COMPLETED");
    expect(report.wrongfulLiquidationsCount).toBe(1);
    expect(report.merkleManifest?.merkleRoot).toBeDefined();

    const latestTrace = neatlogs.getLatestTrace();
    expect(latestTrace).toBeDefined();
    expect(latestTrace?.spans.some(s => s.name === "investigateOracleIncident")).toBe(true);
    expect(latestTrace?.spans.some(s => s.name === "llmForensicReasoning")).toBe(true);
    expect(latestTrace?.spans.some(s => s.name === "enrichIncidentWithCrustdata")).toBe(true);
    expect(latestTrace?.spans.some(s => s.name === "replayCounterfactual")).toBe(true);
    expect(latestTrace?.spans.some(s => s.name === "crossCheckClaims")).toBe(true);
    expect(report.forensicAiAssessment).toBeDefined();
    expect(report.entityEnrichment).toBeDefined();
  }, 20000);

  it("handles injected transient RPC failure, retries, and completes investigation cleanly", async () => {
    const investigator = new POAIncidentInvestigator(mockProvider);
    investigator.injectTransientRpcFailure(true); // Simulate failure

    const incidentId = "0x" + "bb".repeat(32);

    const report = await investigator.investigateOracleIncident({
      incidentId,
      incidentTxHash: "0x8888888888888888888888888888888888888888888888888888888888888888",
      oracleAddress: "0xOracle",
      poolAddress: "0xPool",
      distributorAddress: "0xDistributor",
      collateralToken: "0xWeth",
      debtToken: "0xUsdc",
      simulatedLiquidations: [
        {
          txHash: "0xliq2",
          blockNumber: 105,
          liquidator: "0xLiq",
          borrower: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          debtCovered: 7500n * 10n ** 6n,
          collateralSeized: 4375n * 10n ** 15n,
          oraclePriceUsed: 180000000000n
        }
      ],
      knownBorrowers: [
        {
          account: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          collateral: 5n * 10n ** 18n,
          debt: 7500n * 10n ** 6n
        }
      ]
    });

    expect(report.status).toBe("COMPLETED");
    expect(report.retriesAttempted).toBe(1);

    // Verify error span and retry were captured in Neatlogs trace
    const latestTrace = neatlogs.getLatestTrace();
    expect(latestTrace?.spans.some(s => s.name === "retryCollectLiquidationEvents")).toBe(true);
  }, 20000);
});
