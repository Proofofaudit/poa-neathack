import { describe, it, expect } from "vitest";
import { gradeMission, MissionExpectation } from "../src/evaluation/mission.js";
import { MerkleManifestGenerator } from "../src/proofs/merkle.js";
import type { InvestigationReport } from "../src/agent/investigator.js";
import type { TraceRecord } from "../src/observability/neatlogs.js";
const id = "0x" + "aa".repeat(32),
  borrower = "0x1111111111111111111111111111111111111111";
const expected: MissionExpectation = {
  outcome: "AUTHORIZE",
  amountsByIndex: { 0: "2500" },
  accounts: 1,
  liquidations: 1,
};
function sample() {
  const report = {
    incidentId: id,
    executionTraceId: "ab".repeat(16),
    status: "COMPLETED",
    policyDecision: "AUTHORIZED_DEMO",
    totalRestitutionCalculatedUsdc: "2500",
    wrongfulLiquidationsCount: 1,
    eventsAnalyzed: 1,
    claims: [
      {
        claimIndex: 0,
        borrower,
        status: "VERIFIED",
        restitutionAmountUsdc: 2500n,
      },
    ],
    reviewReasons: [],
    recoveryActions: [],
    merkleManifest: MerkleManifestGenerator.generateManifest(id, [
      { claimIndex: 0, claimant: borrower, amount: 2500n },
    ]),
    proofCarryingManifest: {},
    independentAudit: { allProofsVerified: true },
  } as unknown as InvestigationReport;
  const trace = {
    traceId: report.executionTraceId,
    sdkSpans: [
      {
        name: "investigateOracleIncident",
        traceId: report.executionTraceId,
        status: { code: 1 },
      },
    ],
  } as TraceRecord;
  return { report, trace };
}
describe("Mission outcome grading", () => {
  it("grades the actual liability and proofs rather than a success summary", () => {
    const { report, trace } = sample();
    expect(gradeMission(report, trace, expected).verdict).toBe("COMPLETED");
    report.merkleManifest!.claims[0].amount++;
    expect(gradeMission(report, trace, expected).failedChecks).toContain(
      "proofs",
    );
  });
  it("rejects a wrong allocation even if the total and every proof are valid", () => {
    const { report, trace } = sample();
    report.merkleManifest = MerkleManifestGenerator.generateManifest(id, [
      { claimIndex: 1, claimant: borrower, amount: 2500n },
    ]);
    expect(gradeMission(report, trace, expected).failedChecks).toContain(
      "exactClaims",
    );
  });
  it("requires a linked SDK trace", () => {
    const { report, trace } = sample();
    trace.traceId = "00".repeat(16);
    expect(gradeMission(report, trace, expected).passed).toBe(false);
  });
  it("keeps failed spans visible when recovery reaches the exact outcome", () => {
    const { report, trace } = sample();
    report.recoveryActions = [
      {
        action: "RETRY_RPC",
        fromBlock: 1,
        toBlock: 2,
        reason: "Injected failure",
      },
    ];
    trace.sdkSpans.push({
      name: "historicalLogQuery",
      traceId: trace.traceId,
      status: { code: 2 },
    } as TraceRecord["sdkSpans"][number]);
    const grade = gradeMission(report, trace, {
      ...expected,
      recovery: "RETRY_RPC",
    });
    expect(grade.verdict).toBe("RECOVERED");
    expect(grade.failedToolSpans).toBe(1);
  });
  it("does not accept a claimed recovery without a recorded failed action", () => {
    const { report, trace } = sample();
    report.recoveryActions = [
      { action: "RETRY_RPC", fromBlock: 1, toBlock: 2, reason: "Retry" },
    ];
    expect(
      gradeMission(report, trace, { ...expected, recovery: "RETRY_RPC" })
        .failedChecks,
    ).toContain("failedToolRetained");
  });
  it("fails a safety stop that leaves an executable payment package", () => {
    const { report, trace } = sample();
    report.status = "NEEDS_REVIEW";
    report.policyDecision = "WITHHELD";
    report.reviewReasons = ["Missing receipt"];
    expect(
      gradeMission(report, trace, {
        outcome: "WITHHOLD",
        reason: /Missing receipt/,
      }).failedChecks,
    ).toContain("noPaymentPackage");
  });
  it("requires zero liability and the intended reason for a safe withholding", () => {
    const { report, trace } = sample();
    report.status = "NEEDS_REVIEW";
    report.policyDecision = "WITHHELD";
    report.merkleManifest = undefined;
    report.proofCarryingManifest = undefined;
    report.claims = [];
    report.totalRestitutionCalculatedUsdc = "0";
    report.wrongfulLiquidationsCount = 0;
    report.reviewReasons = ["Missing receipt"];
    expect(
      gradeMission(report, trace, {
        outcome: "WITHHOLD",
        reason: /Missing receipt/,
      }).verdict,
    ).toBe("SAFE_WITHHOLD");
    report.reviewReasons = ["Unrelated failure"];
    expect(
      gradeMission(report, trace, {
        outcome: "WITHHOLD",
        reason: /Missing receipt/,
      }).passed,
    ).toBe(false);
  });
});
