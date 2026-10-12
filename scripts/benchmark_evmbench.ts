// Project-owned checks and measured Merkle timings. This is not the official EVMbench harness.
import { performance } from "node:perf_hooks";
import fs from "node:fs";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { CounterfactualReplayEngine as Engine } from "../src/economics/counterfactual.js";
import { MerkleManifestGenerator as Merkle } from "../src/proofs/merkle.js";
const id = ethers.id("POA_PROJECT_BENCHMARK_V2");
const borrower = "0x1111111111111111111111111111111111111111";
const position = {
  account: borrower,
  collateralBase: 10n * 10n ** 18n,
  debtBase: 15000n * 10n ** 6n,
};
const event = {
  txHash: ethers.id("scenario"),
  blockNumber: 1,
  borrower,
  liquidator: borrower,
  debtCovered: 15000n * 10n ** 6n,
  collateralSeized: 875n * 10n ** 16n,
  oraclePriceUsed: 180000000000n,
};
const results: Array<{
  name: string;
  passed: boolean;
  durationMs: number;
  metrics?: unknown;
}> = [];
function check(name: string, fn: () => unknown) {
  const start = performance.now();
  try {
    const metrics = fn();
    results.push({
      name,
      passed: true,
      durationMs: performance.now() - start,
      metrics,
    });
  } catch (error) {
    results.push({
      name,
      passed: false,
      durationMs: performance.now() - start,
    });
  }
}
check("Eligible threshold-crossing loss", () => {
  const r = Engine.analyzeBorrowerIncident(0, position, event);
  assert.equal(r.status, "VERIFIED");
  assert.equal(r.restitutionAmountUsdc, 2500000000n);
  return { amount: r.restitutionAmountUsdc.toString() };
});
check("Pre-insolvent account excluded", () => {
  const r = Engine.analyzeBorrowerIncident(
    0,
    { ...position, debtBase: 16500n * 10n ** 6n },
    { ...event, debtCovered: 16500n * 10n ** 6n },
  );
  assert.equal(r.status, "EXCLUDED_LEGITIMATE");
  assert.equal(r.restitutionAmountUsdc, 0n);
});
check("Healthy at disputed price withheld", () => {
  const r = Engine.analyzeBorrowerIncident(
    0,
    { ...position, debtBase: 10000n * 10n ** 6n },
    { ...event, debtCovered: 10000n * 10n ** 6n },
  );
  assert.equal(r.status, "NEEDS_REVIEW");
  assert.equal(r.restitutionAmountUsdc, 0n);
});
for (const size of [10, 100, 1000])
  check(`Merkle generate and verify (${size} claims)`, () => {
    const claims = Array.from({ length: size }, (_, i) => ({
      claimIndex: i,
      claimant: ethers.getAddress(
        "0x" + (i + 1).toString(16).padStart(40, "0"),
      ),
      amount: 1000000n,
    }));
    const manifest = Merkle.generateManifest(id, claims);
    for (const c of manifest.claims) {
      assert.ok(
        Merkle.verifyClaimProof(
          manifest.merkleRoot,
          c.claimIndex,
          c.claimant,
          c.amount,
          id,
          c.proof,
        ),
      );
    }
    const c = manifest.claims[0];
    assert.equal(
      Merkle.verifyClaimProof(
        manifest.merkleRoot,
        c.claimIndex,
        c.claimant,
        c.amount + 1n,
        id,
        c.proof,
      ),
      false,
    );
    return { claims: size, verifiedProofs: size };
  });
const report = {
  schemaVersion: 2,
  title: "POA project regression and Merkle timing benchmark",
  officialEvmbench: false,
  environment: { node: process.version },
  results,
  passed: results.filter((r) => r.passed).length,
  total: results.length,
  evaluatedAt: new Date().toISOString(),
};
fs.mkdirSync("evidence", { recursive: true });
fs.writeFileSync(
  "evidence/evmbench_evaluation.json",
  JSON.stringify(report, null, 2),
);
console.table(
  results.map(({ name, passed, durationMs }) => ({
    name,
    status: passed ? "PASS" : "FAIL",
    durationMs: durationMs.toFixed(2),
  })),
);
if (report.passed !== report.total) process.exitCode = 1;
