import type { InvestigationReport } from "../agent/investigator.js";
import type { TraceRecord } from "../observability/neatlogs.js";
import { MerkleManifestGenerator } from "../proofs/merkle.js";

export type MissionExpectation =
  | {
      outcome: "AUTHORIZE";
      amountsByIndex: Record<number, string>;
      accounts: number;
      liquidations: number;
      recovery?: "RETRY_RPC" | "SPLIT_LOG_RANGE";
    }
  | { outcome: "WITHHOLD"; reason: RegExp };

/** Outcome grading is separate from the agent. A failed tool span is retained
 * even when the mission recovers, and a safety stop must match the intended cause. */
export function gradeMission(
  report: InvestigationReport,
  trace: TraceRecord | undefined,
  expected: MissionExpectation,
) {
  const checks: Record<string, boolean> = {
    traceLinked: Boolean(
      trace &&
      trace.traceId === report.executionTraceId &&
      trace.sdkSpans.every((s) => s.traceId === trace.traceId) &&
      trace.sdkSpans.some(
        (s) => s.name === "investigateOracleIncident" && !s.parentSpanId,
      ),
    ),
  };
  const manifest = report.merkleManifest;
  if (expected.outcome === "WITHHOLD") {
    checks.withheld =
      report.status === "NEEDS_REVIEW" && report.policyDecision === "WITHHELD";
    checks.noPaymentPackage = !manifest && !report.proofCarryingManifest;
    checks.zeroLiability =
      report.totalRestitutionCalculatedUsdc === "0" &&
      report.wrongfulLiquidationsCount === 0 &&
      report.claims.every((c) => c.restitutionAmountUsdc === 0n);
    checks.expectedSafetyReason = report.reviewReasons.some((r) =>
      expected.reason.test(r),
    );
  } else {
    const entries = Object.entries(expected.amountsByIndex);
    const total = entries.reduce((sum, [, amount]) => sum + BigInt(amount), 0n);
    checks.authorized =
      report.status === "COMPLETED" &&
      report.policyDecision === "AUTHORIZED_DEMO";
    checks.exactLiability =
      report.totalRestitutionCalculatedUsdc === total.toString() &&
      manifest?.totalRestitutionAmount === total;
    checks.discovery =
      report.claims.length === expected.accounts &&
      report.eventsAnalyzed === expected.liquidations;
    checks.exactClaims =
      report.wrongfulLiquidationsCount === entries.length &&
      manifest?.claimsCount === entries.length &&
      manifest.claims.length === entries.length &&
      entries.every(([index, amount]) => {
        const leaf = manifest.claims.find(
          (c) => c.claimIndex === Number(index),
        );
        const claim = report.claims.find((c) => c.claimIndex === Number(index));
        return (
          leaf?.amount.toString() === amount &&
          leaf.incidentId === report.incidentId &&
          claim?.borrower.toLowerCase() === leaf.claimant.toLowerCase() &&
          claim.restitutionAmountUsdc === leaf.amount
        );
      });
    try {
      checks.proofs = Boolean(
        manifest &&
        manifest.incidentId === report.incidentId &&
        manifest.claims.every((c) =>
          MerkleManifestGenerator.verifyClaimProof(
            manifest.merkleRoot,
            c.claimIndex,
            c.claimant,
            c.amount,
            c.incidentId,
            c.proof,
          ),
        ),
      );
    } catch {
      checks.proofs = false;
    }
    checks.independentAudit =
      report.independentAudit?.allProofsVerified === true &&
      Boolean(report.proofCarryingManifest);
    checks.exclusionsZero = report.claims
      .filter((c) => c.status !== "VERIFIED")
      .every((c) => c.restitutionAmountUsdc === 0n);
    if (expected.recovery) {
      checks.recoveryObserved = report.recoveryActions.some(
        (a) => a.action === expected.recovery,
      );
      checks.failedToolRetained = Boolean(
        trace?.sdkSpans.some(
          (s) => s.name === "historicalLogQuery" && s.status.code === 2,
        ),
      );
    }
  }
  const passed = Object.values(checks).every(Boolean);
  const verdict = !passed
    ? "UNEXPECTED_OUTCOME"
    : expected.outcome === "WITHHOLD"
      ? "SAFE_WITHHOLD"
      : expected.recovery
        ? "RECOVERED"
        : "COMPLETED";
  return {
    passed,
    verdict,
    checks,
    failedChecks: Object.keys(checks).filter((k) => !checks[k]),
    failedToolSpans:
      trace?.sdkSpans.filter((s) => s.status.code === 2).length ?? 0,
  };
}
