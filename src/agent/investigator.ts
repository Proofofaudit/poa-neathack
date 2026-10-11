import { ethers } from "ethers";
import { neatlogs } from "../observability/neatlogs.js";
import { CounterfactualReplayEngine, RestitutionClaimResult, LiquidationEventRecord } from "../economics/counterfactual.js";
import { MerkleManifestGenerator, RestitutionMerkleManifest } from "../proofs/merkle.js";
import { ManifestGenerator, ProofCarryingManifest } from "../proofs/manifest.js";
import { ForensicLlmAgent, ForensicReasoningOutput } from "./llm.js";
import { CrustdataEnricher, EnrichedEntityProfile } from "./crustdata.js";

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
  executionTraceId?: string;
  timestamp: string;
  forensicAiAssessment?: ForensicReasoningOutput;
  entityEnrichment?: Record<string, EnrichedEntityProfile>;
}

export class POAIncidentInvestigator {
  private provider: ethers.Provider;
  private failNextRpcCall = false; // Injected failure flag

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  public injectTransientRpcFailure(enabled: boolean) {
    this.failNextRpcCall = enabled;
  }

  /**
   * Autonomous Investigation Workflow
   */
  public async investigateOracleIncident(params: {
    incidentId: string;
    incidentTxHash: string;
    oracleAddress: string;
    poolAddress: string;
    distributorAddress: string;
    collateralToken: string;
    debtToken: string;
    baselinePrice?: bigint;
    simulatedLiquidations?: LiquidationEventRecord[];
    knownBorrowers?: Array<{ account: string; collateral: bigint; debt: bigint }>;
  }): Promise<InvestigationReport> {
    await neatlogs.init("poa-incident-investigation");

    return await neatlogs.traceSpan("investigateOracleIncident", "WORKFLOW", {
      incidentId: params.incidentId,
      incidentTxHash: params.incidentTxHash
    }, async () => {
      let retriesAttempted = 0;
      const llmAgent = new ForensicLlmAgent();
      const crustdata = new CrustdataEnricher();

      // Step 0: Autonomous AI Forensic Reasoning & Policy Decision
      const forensicAssessment = await llmAgent.analyzeIncident({
        incidentTxHash: params.incidentTxHash,
        oracleAddress: params.oracleAddress,
        poolAddress: params.poolAddress,
        baselinePrice: (Number(params.baselinePrice || 200000000000n) / 1e8).toFixed(2),
        faultyPrice: "1800.00",
        priceDropPercentage: "10.0",
        liquidationCount: params.simulatedLiquidations?.length || 3,
        affectedBorrowers: (params.simulatedLiquidations || []).map(l => l.borrower)
      });

      // 1. Tool: inspectIncidentTransaction
      const incidentTxData = await neatlogs.traceSpan("inspectIncidentTransaction", "TOOL", {
        txHash: params.incidentTxHash
      }, async () => {
        return {
          txHash: params.incidentTxHash,
          action: "ORACLE_PRICE_UPDATE",
          targetContract: params.oracleAddress,
          timestamp: Date.now()
        };
      });

      // 2. Tool: readContractState
      const oracleState = await neatlogs.traceSpan("readContractState", "TOOL", {
        oracleAddress: params.oracleAddress
      }, async () => {
        return {
          baselinePrice: params.baselinePrice || 200000000000n, // $2000.00
          faultyPrice: 180000000000n,                         // $1800.00
          liquidationThresholdBps: 8000n                       // 80%
        };
      });

      // 3. Tool: collectLiquidationEvents (With simulated transient failure & retry resilience)
      const liquidationEvents = await neatlogs.traceSpan("collectLiquidationEvents", "TOOL", {
        poolAddress: params.poolAddress
      }, async () => {
        if (this.failNextRpcCall) {
          retriesAttempted++;
          this.failNextRpcCall = false; // Reset so next retry succeeds
          throw new Error("RPC_TIMEOUT: JSON-RPC connection terminated unexpectedly (simulated network partition)");
        }
        return params.simulatedLiquidations || [];
      }).catch(async (initialErr) => {
        // Retry logic: bounded retry with backoff
        return await neatlogs.traceSpan("retryCollectLiquidationEvents", "AGENT", {
          initialError: initialErr.message,
          retryAttempt: 1
        }, async () => {
          console.log(`[Agent Recovery] Caught transient failure: "${initialErr.message}". Re-establishing RPC connection...`);
          // Successful retry
          return params.simulatedLiquidations || [];
        });
      });

      // 4. Tool: discoverAffectedAccounts
      const affectedAccounts = await neatlogs.traceSpan("discoverAffectedAccounts", "TOOL", {
        eventsCount: liquidationEvents.length
      }, async () => {
        return Array.from(new Set(liquidationEvents.map(e => e.borrower)));
      });

      // 4b. Tool: Crustdata Entity & MEV Intelligence
      const entityEnrichment = await crustdata.enrichEntities(affectedAccounts);

      // 5. Tool & Chain: replayCounterfactual
      const analysisResults: RestitutionClaimResult[] = [];
      const verifiedClaimsForTree: Array<{ claimIndex: number; claimant: string; amount: bigint }> = [];

      await neatlogs.traceSpan("replayCounterfactual", "CHAIN", {
        affectedAccountsCount: affectedAccounts.length
      }, async () => {
        let index = 0;
        for (const borrowerAddr of affectedAccounts) {
          const borrowerPos = params.knownBorrowers?.find(b => b.account.toLowerCase() === borrowerAddr.toLowerCase());
          const liqEvent = liquidationEvents.find(e => e.borrower.toLowerCase() === borrowerAddr.toLowerCase());

          if (borrowerPos) {
            const analysis = CounterfactualReplayEngine.analyzeBorrowerIncident(
              index,
              {
                account: borrowerPos.account,
                collateralBase: borrowerPos.collateral,
                debtBase: borrowerPos.debt
              },
              liqEvent,
              oracleState.faultyPrice
            );

            analysisResults.push(analysis);

            if (analysis.status === "VERIFIED" && analysis.restitutionAmountUsdc > 0n) {
              verifiedClaimsForTree.push({
                claimIndex: index,
                claimant: analysis.borrower,
                amount: analysis.restitutionAmountUsdc
              });
              index++;
            }
          }
        }
      });

      // 6. Guardrail: crossCheckClaims
      await neatlogs.traceSpan("crossCheckClaims", "GUARDRAIL", {
        verifiedCount: verifiedClaimsForTree.length
      }, async () => {
        // Assert no duplicate addresses
        const seen = new Set<string>();
        for (const c of verifiedClaimsForTree) {
          if (seen.has(c.claimant.toLowerCase())) {
            throw new Error(`GUARDRAIL_VIOLATION: Duplicate claim detected for account ${c.claimant}`);
          }
          seen.add(c.claimant.toLowerCase());
          if (c.amount <= 0n) {
            throw new Error(`GUARDRAIL_VIOLATION: Zero or negative restitution amount for ${c.claimant}`);
          }
        }
      });

      // 7. Tool: generateMerkleManifest
      let merkleManifest: RestitutionMerkleManifest | undefined;
      let proofCarryingManifest: ProofCarryingManifest | undefined;
      if (verifiedClaimsForTree.length > 0) {
        merkleManifest = await neatlogs.traceSpan("generateMerkleManifest", "TOOL", {
          claimsCount: verifiedClaimsForTree.length
        }, async () => {
          return MerkleManifestGenerator.generateManifest(params.incidentId, verifiedClaimsForTree);
        });

        if (merkleManifest) {
          proofCarryingManifest = ManifestGenerator.createProofCarryingManifest({
            incidentId: params.incidentId,
            incidentTxHash: params.incidentTxHash,
            oracleAddress: params.oracleAddress,
            poolAddress: params.poolAddress,
            payoutToken: params.distributorAddress,
            baselinePriceUsd: (Number(params.baselinePrice || 200000000000n) / 1e8).toFixed(2),
            faultyPriceUsd: "1800.00",
            claims: analysisResults,
            merkleManifest,
            traceId: neatlogs.getLatestTrace()?.traceId
          });
        }
      }

      const totalRestitutionUsdc = verifiedClaimsForTree.reduce((acc, c) => acc + c.amount, 0n);

      return {
        incidentId: params.incidentId,
        incidentTxHash: params.incidentTxHash,
        status: "COMPLETED",
        summary: `Autonomous investigation verified ${verifiedClaimsForTree.length} wrongful liquidations resulting from faulty price drop. Total verified restitution: ${(Number(totalRestitutionUsdc) / 1e6).toFixed(2)} USDC.`,
        eventsAnalyzed: liquidationEvents.length,
        wrongfulLiquidationsCount: verifiedClaimsForTree.length,
        totalRestitutionCalculatedUsdc: totalRestitutionUsdc.toString(),
        claims: analysisResults,
        merkleManifest,
        proofCarryingManifest,
        retriesAttempted,
        executionTraceId: neatlogs.getLatestTrace()?.traceId,
        timestamp: new Date().toISOString(),
        forensicAiAssessment: forensicAssessment,
        entityEnrichment
      };
    });
  }
}
