import { ethers } from "ethers";
import * as crypto from "crypto";
import { RestitutionClaimResult } from "../economics/counterfactual.js";
import { RestitutionMerkleManifest } from "./merkle.js";

export interface ProofCarryingManifest {
  manifestVersion: string;
  policyId: string;
  incidentId: string;
  generatedAt: string;
  neatlogsTraceId?: string;
  evidence: {
    incidentTxHash: string;
    oracleAddress: string;
    poolAddress: string;
    payoutToken: string;
    baselinePriceUsd: string;
    faultyPriceUsd: string;
    interventionPolicy: string;
  };
  accountingInvariants: {
    equityDeltaFormula: string;
    moralHazardExclusionRule: string;
    integerPrecision: string;
  };
  summary: {
    totalVictimsEvaluated: number;
    wrongfulLiquidationsCount: number;
    insolventAccountsExcluded: number;
    totalRestitutionUsdc: string;
    merkleRoot: string;
  };
  claims: Array<{
    claimIndex: number;
    claimant: string;
    restitutionUsdc: string;
    counterfactualEquityUsd: string;
    observedEquityUsd: string;
    merkleProof: string[];
  }>;
  cryptographicIntegritySeal: string;
}

export class ManifestGenerator {
  public static readonly POLICY_ID = "POA_RESTITUTION_POLICY_V1_EQUITY_DELTA";

  public static createProofCarryingManifest(params: {
    incidentId: string;
    incidentTxHash: string;
    oracleAddress: string;
    poolAddress: string;
    payoutToken: string;
    baselinePriceUsd: string;
    faultyPriceUsd: string;
    claims: RestitutionClaimResult[];
    merkleManifest: RestitutionMerkleManifest;
    traceId?: string;
  }): ProofCarryingManifest {
    const verifiedClaims = params.claims.filter(c => c.status === "VERIFIED");
    const excludedClaims = params.claims.filter(c => c.status === "EXCLUDED_LEGITIMATE");

    const claimEntries = params.merkleManifest.claims.map(manifestItem => {
      const claimDetail = verifiedClaims.find(c => c.claimIndex === manifestItem.claimIndex);
      return {
        claimIndex: manifestItem.claimIndex,
        claimant: manifestItem.claimant,
        restitutionUsdc: manifestItem.amount.toString(),
        counterfactualEquityUsd: claimDetail?.counterfactualNetEquityUsd || "0",
        observedEquityUsd: claimDetail?.observedNetEquityUsd || "0",
        merkleProof: manifestItem.proof
      };
    });

    const preliminaryPayload = {
      manifestVersion: "1.0.0",
      policyId: this.POLICY_ID,
      incidentId: params.incidentId,
      generatedAt: new Date().toISOString(),
      neatlogsTraceId: params.traceId,
      evidence: {
        incidentTxHash: params.incidentTxHash,
        oracleAddress: params.oracleAddress,
        poolAddress: params.poolAddress,
        payoutToken: params.payoutToken,
        baselinePriceUsd: params.baselinePriceUsd,
        faultyPriceUsd: params.faultyPriceUsd,
        interventionPolicy: "Intervention policy substituted anomalous oracle plunge with verified TWAP benchmark. Nonces and valid transactions preserved."
      },
      accountingInvariants: {
        equityDeltaFormula: "L_i = max(0, NetEquity_i(S_cf) - NetEquity_i(S_obs)) where NetEquity = (Collateral * P_baseline) - Debt",
        moralHazardExclusionRule: "Positions with baseline Health Factor < 1.0 (undercollateralized prior to incident) receive zero restitution.",
        integerPrecision: "18 decimals WETH collateral, 6 decimals USDC debt/payout, BigInt integer arithmetic with zero floating point representation"
      },
      summary: {
        totalVictimsEvaluated: params.claims.length,
        wrongfulLiquidationsCount: verifiedClaims.length,
        insolventAccountsExcluded: excludedClaims.length,
        totalRestitutionUsdc: params.merkleManifest.totalRestitutionAmount.toString(),
        merkleRoot: params.merkleManifest.merkleRoot
      },
      claims: claimEntries
    };

    // Generate deterministic cryptographic integrity seal over the manifest
    const payloadString = JSON.stringify(preliminaryPayload);
    const integritySeal = crypto.createHash("sha256").update(payloadString).digest("hex");

    return {
      ...preliminaryPayload,
      cryptographicIntegritySeal: `0x${integritySeal}`
    };
  }
}
