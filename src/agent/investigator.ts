import { ethers } from "ethers";
import {
  AdaptiveForensicReview,
  AdaptiveReviewResult,
} from "./adaptive-review.js";
import { auditClaimManifest } from "./claim-auditor.js";
import { RecoveryAction } from "../chain/historical-logs.js";
import { neatlogs } from "../observability/neatlogs.js";
import {
  CounterfactualReplayEngine,
  RestitutionClaimResult,
} from "../economics/counterfactual.js";
import {
  MerkleManifestGenerator,
  RestitutionMerkleManifest,
} from "../proofs/merkle.js";
import {
  ManifestGenerator,
  ProofCarryingManifest,
} from "../proofs/manifest.js";
import { ForensicLlmAgent, ForensicReasoningOutput } from "./llm.js";
import { CrustdataEnricher, EnrichedEntityProfile } from "./crustdata.js";
import {
  DemoLendingAdapter,
  EvidenceAdapter,
  InvestigationParams,
  ChainEvidence,
} from "../chain/demo-adapter.js";

export interface InvestigationReport {
  incidentId: string;
  incidentTxHash: string;
  status: "COMPLETED" | "FAILED" | "NEEDS_REVIEW";
  summary: string;
  eventsAnalyzed: number;
  wrongfulLiquidationsCount: number;
  totalRestitutionCalculatedUsdc: string;
  claims: RestitutionClaimResult[];
  merkleManifest?: RestitutionMerkleManifest;
  proofCarryingManifest?: ProofCarryingManifest;
  retriesAttempted: number;
  recoveryActions: RecoveryAction[];
  independentAudit?: ReturnType<typeof auditClaimManifest>;
  adaptiveReview?: AdaptiveReviewResult;
  executionTraceId?: string;
  timestamp: string;
  forensicAiAssessment?: ForensicReasoningOutput;
  entityEnrichment?: Record<string, EnrichedEntityProfile>;
  evidence?: Omit<ChainEvidence, "borrowers" | "liquidations">;
  policyDecision: "AUTHORIZED_DEMO" | "WITHHELD";
  reviewReasons: string[];
  decisionTrail: Array<{ step: string; outcome: string }>;
}
export class POAIncidentInvestigator {
  private failNextRpcCall = false;
  private injectedMaxLogBlocks?: number;
  constructor(
    private provider: ethers.Provider,
    private adapter: EvidenceAdapter = new DemoLendingAdapter(provider),
    private llmAgent = new ForensicLlmAgent(),
  ) {}
  public injectTransientRpcFailure(enabled: boolean) {
    this.failNextRpcCall = enabled;
  }
  public injectLogRangeLimit(maxBlocks: number) {
    if (!Number.isSafeInteger(maxBlocks) || maxBlocks < 1)
      throw new Error("Invalid injected range limit");
    this.injectedMaxLogBlocks = maxBlocks;
  }
  async investigateOracleIncident(
    params: InvestigationParams,
  ): Promise<InvestigationReport> {
    return neatlogs.runWorkflow(
      "investigateOracleIncident",
      { incidentId: params.incidentId },
      async () => {
        const report: InvestigationReport = {
          incidentId: params.incidentId,
          incidentTxHash: params.incidentTxHash,
          status: "NEEDS_REVIEW",
          summary: "Evidence collection incomplete; payout withheld.",
          eventsAnalyzed: 0,
          wrongfulLiquidationsCount: 0,
          totalRestitutionCalculatedUsdc: "0",
          claims: [],
          retriesAttempted: 0,
          recoveryActions: [],
          timestamp: new Date().toISOString(),
          policyDecision: "WITHHELD",
          reviewReasons: [],
          decisionTrail: [],
        };
        try {
          if (
            !ethers.isHexString(params.incidentId, 32) ||
            !ethers.isHexString(params.incidentTxHash, 32)
          )
            throw new Error(
              "Incident IDs and transaction hashes must be 32-byte hex values",
            );
          const evidence = await neatlogs.traceSpan(
            "collectHistoricalEvidence",
            "TOOL",
            { protocol: params.protocol },
            () =>
              this.adapter.collect(
                params,
                () => report.retriesAttempted++,
                (from, to) => {
                  if (this.failNextRpcCall) {
                    this.failNextRpcCall = false;
                    throw new Error("Injected transient RPC failure");
                  }
                  if (
                    this.injectedMaxLogBlocks &&
                    to - from + 1 > this.injectedMaxLogBlocks
                  )
                    throw new Error(
                      "Injected provider block range limit exceeded",
                    );
                },
                (action) => report.recoveryActions.push(action),
              ),
          );
          const { borrowers, liquidations, ...anchors } = evidence;
          report.evidence = anchors;
          report.eventsAnalyzed = liquidations.length;
          report.decisionTrail.push({
            step: "Historical evidence",
            outcome: `${liquidations.length} liquidation logs; ${borrowers.length} historical accounts; block hashes anchored.`,
          });
          const assessment = await this.llmAgent.analyzeIncident({
            incidentTxHash: params.incidentTxHash,
            oracleAddress: params.oracleAddress,
            poolAddress: params.poolAddress,
            baselinePrice: ethers.formatUnits(evidence.baselinePrice, 8),
            faultyPrice: ethers.formatUnits(evidence.faultyPrice, 8),
            priceDropPercentage: (
              (Number(evidence.baselinePrice - evidence.faultyPrice) /
                Number(evidence.baselinePrice)) *
              100
            ).toFixed(4),
            liquidationCount: liquidations.length,
            affectedBorrowers: liquidations.map((e) => e.borrower),
            referencePrice: ethers.formatUnits(evidence.referencePrice, 8),
            referenceSource: evidence.referenceSource,
            evidenceComplete: true,
            referenceCorroboratesBaseline:
              evidence.referenceCorroboratesBaseline,
          });
          report.forensicAiAssessment = assessment;
          const evidenceGate =
            evidence.referenceCorroboratesBaseline &&
            evidence.faultyPrice * 100n <= evidence.baselinePrice * 95n;
          if (
            !evidenceGate ||
            !assessment.restitutionPolicyTriggered ||
            assessment.anomalyClassification !== "FAULTY_ORACLE_DEVIATION" ||
            assessment.confidenceScore < 0.9
          )
            throw new Error(
              "Policy declined restitution or evidence does not establish a reference-corroborated deviation",
            );
          report.decisionTrail.push({
            step: "Restitution policy",
            outcome: `Approved by ${assessment.modelUsed}; reference corroborates baseline within 1%; disputed drop >=5%.`,
          });
          await neatlogs.traceSpan(
            "replayCounterfactual",
            "CHAIN",
            { accounts: borrowers.length },
            async () => {
              for (const [index, position] of borrowers.entries()) {
                const events = liquidations.filter(
                  (e) =>
                    e.borrower.toLowerCase() === position.account.toLowerCase(),
                );
                if (events.length > 1)
                  throw new Error(
                    "Repeated liquidation of one borrower requires transaction-level review; no partial manifest issued",
                  );
                report.claims.push(
                  CounterfactualReplayEngine.analyzeBorrowerIncident(
                    index,
                    position,
                    events[0],
                    {
                      baselinePriceUsd8Dec: evidence.baselinePrice,
                      faultyPriceUsd8Dec: evidence.faultyPrice,
                      liquidationThresholdBps: evidence.liquidationThresholdBps,
                      collateralDecimals: evidence.collateralDecimals,
                      debtDecimals: evidence.debtDecimals,
                      debtPriceUsd8Dec: 100000000n,
                    },
                  ),
                );
              }
            },
          );
          if (report.claims.some((c) => c.status === "NEEDS_REVIEW"))
            throw new Error(
              "At least one borrower has inconsistent liquidation evidence; all payouts withheld",
            );
          const claims = report.claims.filter(
            (c) => c.status === "VERIFIED" && c.restitutionAmountUsdc > 0n,
          );
          const unique = new Set(claims.map((c) => c.borrower.toLowerCase()));
          if (unique.size !== claims.length)
            throw new Error("Duplicate claimant detected");
          report.decisionTrail.push({
            step: "Eligibility",
            outcome: `${claims.length} eligible; ${report.claims.length - claims.length} excluded. No partial approval of incomplete evidence.`,
          });
          if (claims.length) {
            report.merkleManifest = await neatlogs.traceSpan(
              "generateMerkleManifest",
              "TOOL",
              { count: claims.length },
              async () =>
                MerkleManifestGenerator.generateManifest(
                  params.incidentId,
                  claims.map((c) => ({
                    claimIndex: c.claimIndex,
                    claimant: c.borrower,
                    amount: c.restitutionAmountUsdc,
                  })),
                ),
            );
            report.independentAudit = await neatlogs.traceSpan(
              "independentClaimAudit",
              "GUARDRAIL",
              { count: claims.length },
              async () =>
                auditClaimManifest(
                  evidence,
                  report.claims,
                  report.merkleManifest!,
                  params.incidentId,
                ),
            );
            report.decisionTrail.push({
              step: "Independent claim audit",
              outcome: `${report.independentAudit.claimsVerified} claims verified against the conservation identity and every inclusion proof.`,
            });
            report.adaptiveReview = await new AdaptiveForensicReview().review(
              evidence,
              report.claims,
              report.merkleManifest!,
              params.incidentId,
            );
            if (!report.adaptiveReview.approved)
              throw new Error(report.adaptiveReview.reason);
            report.decisionTrail.push({
              step: "Optional adaptive review",
              outcome:
                report.adaptiveReview.mode === "RULES_ONLY"
                  ? "Model/tool review disabled; no model planning is claimed for this run."
                  : `${report.adaptiveReview.steps.length} model-directed actions completed before final review approval.`,
            });
            report.proofCarryingManifest =
              ManifestGenerator.createProofCarryingManifest({
                incidentId: params.incidentId,
                incidentTxHash: params.incidentTxHash,
                oracleAddress: params.oracleAddress,
                poolAddress: params.poolAddress,
                payoutToken: params.debtToken,
                baselinePriceUsd: ethers.formatUnits(evidence.baselinePrice, 8),
                faultyPriceUsd: ethers.formatUnits(evidence.faultyPrice, 8),
                claims: report.claims,
                merkleManifest: report.merkleManifest,
                traceId: neatlogs.getLatestTrace()?.traceId,
                anchors: {
                  chainId: evidence.chainId,
                  baselineBlockNumber: evidence.baselineBlockNumber,
                  baselineBlockHash: evidence.baselineBlockHash,
                  incidentBlockNumber: evidence.incidentBlockNumber,
                  incidentBlockHash: evidence.incidentBlockHash,
                  toBlock: evidence.toBlock,
                  endBlockHash: evidence.endBlockHash,
                  referenceSource: evidence.referenceSource,
                  referencePriceUsd: ethers.formatUnits(
                    evidence.referencePrice,
                    8,
                  ),
                },
              });
          }
          report.wrongfulLiquidationsCount = claims.length;
          report.totalRestitutionCalculatedUsdc = claims
            .reduce((sum, c) => sum + c.restitutionAmountUsdc, 0n)
            .toString();
          report.status = "COMPLETED";
          report.policyDecision = "AUTHORIZED_DEMO";
          report.summary = `Synthetic protocol investigation completed from historical chain evidence: ${claims.length} eligible borrowers; ${ethers.formatUnits(report.totalRestitutionCalculatedUsdc, 6)} test USDC. Owner approval is required before registering a manifest.`;
          report.entityEnrichment =
            await new CrustdataEnricher().enrichEntities(
              claims.map((c) => c.borrower),
              params.protocol,
              this.provider,
            );
        } catch (error) {
          report.reviewReasons.push(
            error instanceof Error ? error.message : "Investigation failed",
          );
          report.summary =
            "Payout withheld: " + report.reviewReasons.join("; ");
          report.claims = report.claims.map((c) => ({
            ...c,
            restitutionAmountUsdc: 0n,
            status: c.status === "VERIFIED" ? "NEEDS_REVIEW" : c.status,
            reason:
              c.status === "VERIFIED"
                ? "Whole-incident approval withheld: " +
                  report.reviewReasons.join("; ")
                : c.reason,
          }));
          report.merkleManifest = undefined;
          report.independentAudit = undefined;
          report.proofCarryingManifest = undefined;
          report.totalRestitutionCalculatedUsdc = "0";
          report.wrongfulLiquidationsCount = 0;
          report.policyDecision = "WITHHELD";
          report.status = "NEEDS_REVIEW";
          report.decisionTrail.push({
            step: "Safety stop",
            outcome: report.reviewReasons.join("; "),
          });
        }
        report.executionTraceId = neatlogs.getLatestTrace()?.traceId;
        return report;
      },
    );
  }
}
