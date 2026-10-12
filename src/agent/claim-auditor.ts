import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { ChainEvidence } from "../chain/demo-adapter.js";
import { RestitutionClaimResult } from "../economics/counterfactual.js";
import { RestitutionMerkleManifest } from "../proofs/merkle.js";

/** Second implementation checks the economic conservation identity and every
 * proof. It cannot establish authenticity of the supplied RPC evidence. */
export function auditClaimManifest(
  evidence: ChainEvidence,
  results: RestitutionClaimResult[],
  manifest: RestitutionMerkleManifest,
  incidentId: string,
) {
  const fail = (message: string): never => {
    throw new Error(`Independent claim audit failed: ${message}`);
  };
  const selected = results.filter(
    (r) => r.status === "VERIFIED" && r.restitutionAmountUsdc > 0n,
  );
  if (
    manifest.incidentId !== incidentId ||
    manifest.claimsCount !== selected.length ||
    manifest.claims.length !== selected.length
  )
    fail("incident or claim count mismatch");
  const seen = new Set<string>();
  let total = 0n;
  for (const claim of manifest.claims) {
    const key = claim.claimant.toLowerCase();
    if (seen.has(key)) fail("duplicate beneficiary");
    seen.add(key);
    const position = evidence.borrowers.filter(
      (p) => p.account.toLowerCase() === key,
    );
    const events = evidence.liquidations.filter(
      (e) => e.borrower.toLowerCase() === key,
    );
    const replay = selected.filter(
      (r) =>
        r.borrower.toLowerCase() === key && r.claimIndex === claim.claimIndex,
    );
    if (position.length !== 1 || events.length !== 1 || replay.length !== 1)
      fail("ambiguous or absent position, event or replay");
    const p = position[0],
      e = events[0];
    const scale = 10n ** BigInt(evidence.collateralDecimals);
    const debtUsd8 =
      evidence.debtDecimals <= 8
        ? p.debtBase * 10n ** BigInt(8 - evidence.debtDecimals)
        : p.debtBase / 10n ** BigInt(evidence.debtDecimals - 8);
    const debtCoveredUsd8 =
      evidence.debtDecimals <= 8
        ? e.debtCovered * 10n ** BigInt(8 - evidence.debtDecimals)
        : e.debtCovered / 10n ** BigInt(evidence.debtDecimals - 8);
    const baseCollateralUsd8 =
      (p.collateralBase * evidence.baselinePrice) / scale;
    const faultyCollateralUsd8 =
      (p.collateralBase * evidence.faultyPrice) / scale;
    if (
      baseCollateralUsd8 * evidence.liquidationThresholdBps <
        debtUsd8 * 10000n ||
      faultyCollateralUsd8 * evidence.liquidationThresholdBps >=
        debtUsd8 * 10000n
    )
      fail("liquidation threshold crossing absent");
    if (
      e.debtCovered < 0n ||
      e.debtCovered > p.debtBase ||
      e.collateralSeized < 0n ||
      e.collateralSeized > p.collateralBase ||
      e.oraclePriceUsed !== evidence.faultyPrice
    )
      fail("event disagrees with position or oracle");
    // Difference of floor-valued balances preserves the replay's rounding policy.
    const lossUsd8 =
      baseCollateralUsd8 -
      ((p.collateralBase - e.collateralSeized) * evidence.baselinePrice) /
        scale -
      debtCoveredUsd8;
    const amount =
      evidence.debtDecimals <= 8
        ? lossUsd8 / 10n ** BigInt(8 - evidence.debtDecimals)
        : lossUsd8 * 10n ** BigInt(evidence.debtDecimals - 8);
    if (
      amount <= 0n ||
      amount !== claim.amount ||
      amount !== replay[0].restitutionAmountUsdc
    )
      fail("economic conservation amount mismatch");
    if (
      claim.incidentId !== incidentId ||
      !StandardMerkleTree.verify(
        manifest.merkleRoot,
        ["uint256", "address", "uint256", "bytes32"],
        [claim.claimIndex, claim.claimant, amount.toString(), incidentId],
        claim.proof,
      )
    )
      fail("invalid inclusion proof");
    total += amount;
  }
  if (total !== manifest.totalRestitutionAmount)
    fail("aggregate liability mismatch");
  return {
    verifier: "independent-conservation-v1",
    claimsVerified: selected.length,
    totalAmount: total.toString(),
    allProofsVerified: true,
    scope:
      "Internal consistency of collected synthetic-protocol evidence; not an audit of RPC authenticity",
  };
}
