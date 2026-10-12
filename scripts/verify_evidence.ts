import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { MerkleManifestGenerator } from "../src/proofs/merkle.js";
import { CounterfactualReplayEngine } from "../src/economics/counterfactual.js";
import { sourceFingerprint } from "./source_fingerprint.js";
const file = process.argv[2] || "evidence/run_evidence.json";
const e = JSON.parse(fs.readFileSync(file, "utf8"));
assert.equal(e.schemaVersion, 2);
assert.equal(e.provenance, "SYNTHETIC_SCENARIO_REAL_EVM_EXECUTION");
assert.equal(
  e.source.sha256,
  sourceFingerprint().sha256,
  "Evidence must be regenerated after source changes",
);
const report = e.report,
  manifest = report.merkleManifest;
assert.equal(report.status, "COMPLETED");
assert.equal(report.policyDecision, "AUTHORIZED_DEMO");
assert.ok(report.evidence.referenceCorroboratesBaseline);
assert.equal(report.forensicAiAssessment.restitutionPolicyTriggered, true);
let total = 0n;
for (const claim of manifest.claims) {
  assert.ok(
    MerkleManifestGenerator.verifyClaimProof(
      manifest.merkleRoot,
      claim.claimIndex,
      claim.claimant,
      BigInt(claim.amount),
      report.incidentId,
      claim.proof,
    ),
  );
  const detail = report.claims.find(
    (c: any) => c.claimIndex === claim.claimIndex,
  );
  assert.ok(detail);
  assert.equal(detail.status, "VERIFIED");
  assert.equal(detail.borrower.toLowerCase(), claim.claimant.toLowerCase());
  const liquidation = e.fixture.liquidationTxs.find(
    (l: any) => l.borrower.toLowerCase() === detail.borrower.toLowerCase(),
  );
  assert.ok(liquidation);
  const replay = CounterfactualReplayEngine.analyzeBorrowerIncident(
    claim.claimIndex,
    {
      account: detail.borrower,
      collateralBase: BigInt(detail.initialCollateralWeth),
      debtBase: BigInt(detail.initialDebtUsdc),
    },
    {
      txHash: liquidation.txHash,
      blockNumber: report.evidence.incidentBlockNumber,
      liquidator: e.fixture.lendingPoolAddress,
      borrower: detail.borrower,
      debtCovered: BigInt(liquidation.debtCovered),
      collateralSeized: BigInt(liquidation.collateralSeized),
      oraclePriceUsed: BigInt(report.evidence.faultyPrice),
    },
    {
      baselinePriceUsd8Dec: BigInt(report.evidence.baselinePrice),
      faultyPriceUsd8Dec: BigInt(report.evidence.faultyPrice),
      liquidationThresholdBps: BigInt(report.evidence.liquidationThresholdBps),
    },
  );
  assert.equal(replay.status, "VERIFIED");
  assert.equal(replay.restitutionAmountUsdc, BigInt(claim.amount));
  total += BigInt(claim.amount);
}
assert.equal(total, BigInt(report.totalRestitutionCalculatedUsdc));
assert.equal(total, BigInt(manifest.totalRestitutionAmount));
const { cryptographicIntegritySeal, ...payload } = report.proofCarryingManifest;
assert.equal(
  cryptographicIntegritySeal,
  "0x" +
    crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
);
assert.equal(
  payload.evidence.payoutToken.toLowerCase(),
  e.fixture.usdcAddress.toLowerCase(),
);
assert.equal(
  payload.evidence.anchors.endBlockHash,
  report.evidence.endBlockHash,
);
const payment = e.restitutionExecuted;
assert.equal(
  BigInt(payment.balanceAfter) - BigInt(payment.balanceBefore),
  BigInt(payment.amountUsdc),
);
assert.equal(payment.recipientEthBefore, "0");
assert.equal(payment.recipientEthAfter, "0");
assert.ok(
  manifest.claims.some(
    (c: any) =>
      c.claimIndex === payment.claimIndex &&
      c.claimant.toLowerCase() === payment.claimant.toLowerCase() &&
      c.amount === payment.amountUsdc,
  ),
);
console.log(
  `PASS: ${manifest.claims.length} claim proofs, exact replay amounts, payout-token binding, manifest checksum, source fingerprint and recorded balance delta. Offline consistency verification only; it does not authenticate the RPC or independently recheck archived receipts.`,
);
