import { parseModelJson } from "./model-json.js";
import { OpenAI } from "openai";
import { z } from "zod";
import { neatlogs } from "../observability/neatlogs.js";

export interface ForensicReasoningInput {
  incidentTxHash: string;
  oracleAddress: string;
  poolAddress: string;
  baselinePrice: string;
  faultyPrice: string;
  priceDropPercentage: string;
  liquidationCount: number;
  affectedBorrowers: string[];
  referencePrice?: string;
  referenceSource?: string;
  evidenceComplete?: boolean;
  referenceCorroboratesBaseline?: boolean;
}
export interface ForensicReasoningOutput {
  anomalyClassification:
    | "FAULTY_ORACLE_DEVIATION"
    | "MARKET_VOLATILITY"
    | "EXPLOIT"
    | "INSUFFICIENT_EVIDENCE";
  confidenceScore: number;
  rootCauseAnalysis: string;
  restitutionPolicyTriggered: boolean;
  recommendedWorkflow: string[];
  executiveSummary: string;
  tokensUsed?: number;
  modelUsed: string;
  isLiveLlm: boolean;
}
const verdictSchema = z
  .object({
    anomalyClassification: z.enum([
      "FAULTY_ORACLE_DEVIATION",
      "MARKET_VOLATILITY",
      "EXPLOIT",
      "INSUFFICIENT_EVIDENCE",
    ]),
    confidenceScore: z.number().finite().min(0).max(1),
    rootCauseAnalysis: z.string().min(1),
    restitutionPolicyTriggered: z.boolean(),
    recommendedWorkflow: z.array(z.string()),
    executiveSummary: z.string().min(1),
  })
  .strict();
export class ForensicLlmAgent {
  // Explicit opt-in prevents accidentally using credentials from old local .env files.
  constructor(private client?: Pick<OpenAI, "chat">) {}
  private unavailable(reason: string): ForensicReasoningOutput {
    return {
      anomalyClassification: "INSUFFICIENT_EVIDENCE",
      confidenceScore: 0,
      rootCauseAnalysis: reason,
      restitutionPolicyTriggered: false,
      recommendedWorkflow: ["requestHumanReview"],
      executiveSummary: "No payout authorized. " + reason,
      modelUsed: "unavailable",
      isLiveLlm: false,
    };
  }
  async analyzeIncident(
    input: ForensicReasoningInput,
  ): Promise<ForensicReasoningOutput> {
    if (
      !input.evidenceComplete ||
      !input.referenceSource ||
      !input.referencePrice
    ) {
      return this.unavailable(
        "Historical evidence and a separate reference feed are required.",
      );
    }
    const rulesAllow =
      input.referenceCorroboratesBaseline === true &&
      Number(input.priceDropPercentage) >= 5;
    if (!this.client && process.env.POA_LLM_ENABLED !== "true") {
      return neatlogs.traceSpan(
        "evaluateRestitutionPolicy",
        "GUARDRAIL",
        { mode: "DETERMINISTIC_RULES", source: input.referenceSource },
        async () => ({
          anomalyClassification: rulesAllow
            ? "FAULTY_ORACLE_DEVIATION"
            : "MARKET_VOLATILITY",
          confidenceScore: 1,
          restitutionPolicyTriggered: rulesAllow,
          rootCauseAnalysis: `Historical price comparison under the demo policy. Reference: ${input.referenceSource}. This is a rule evaluation, not model inference or proof of intent.`,
          recommendedWorkflow: rulesAllow
            ? [
                "replayCounterfactual",
                "crossCheckClaims",
                "generateMerkleManifest",
              ]
            : ["withholdManifest"],
          executiveSummary: rulesAllow
            ? "Disputed feed diverges from the separately deployed reference. Check each borrower's eligibility."
            : "Reference evidence does not support an oracle-only deviation; no restitution manifest.",
          modelUsed: "deterministic-policy-v2",
          isLiveLlm: false,
        }),
      );
    }
    const model = process.env.LITELLM_MODEL || "gpt-4o-mini";
    try {
      const usingProxy = Boolean(process.env.LITELLM_API_KEY);
      const key = usingProxy
        ? process.env.LITELLM_API_KEY
        : process.env.OPENAI_API_KEY;
      if (!this.client && !key)
        return this.unavailable(
          "LLM review was requested but no credential is configured.",
        );
      const client =
        this.client ||
        neatlogs.wrapClient(
          new OpenAI({
            apiKey: key,
            baseURL: usingProxy ? process.env.LITELLM_BASE_URL : undefined,
            timeout: 20000,
            maxRetries: 0,
          }),
        );
      return await neatlogs.traceSpan(
        "llmForensicReasoning",
        "AGENT",
        { model, mode: "LIVE_LLM" },
        async () => {
          const response = await client.chat.completions.create(
            {
              model,
              temperature: 0,
              max_tokens: 1200,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    "Review the supplied incident evidence only. Do not invent corroboration or tool results. Return JSON with exactly: anomalyClassification (FAULTY_ORACLE_DEVIATION, MARKET_VOLATILITY, EXPLOIT, or INSUFFICIENT_EVIDENCE), confidenceScore (0..1), rootCauseAnalysis (string), restitutionPolicyTriggered (boolean), recommendedWorkflow (string[]), executiveSummary (string). Uncertainty must withhold restitution. You cannot override failed deterministic evidence checks.",
                },
                { role: "user", content: JSON.stringify(input) },
              ],
            },
            { signal: AbortSignal.timeout(20000) },
          );
          const verdict = verdictSchema.parse(
            parseModelJson(response.choices[0]?.message.content || ""),
          );
          return {
            ...verdict,
            restitutionPolicyTriggered:
              rulesAllow &&
              verdict.restitutionPolicyTriggered &&
              verdict.anomalyClassification === "FAULTY_ORACLE_DEVIATION" &&
              verdict.confidenceScore >= 0.9,
            tokensUsed: response.usage?.total_tokens,
            modelUsed: model,
            isLiveLlm: true,
          };
        },
      );
    } catch (error) {
      const diagnostic = error instanceof OpenAI.APIError
        ? `Provider HTTP ${error.status ?? "unavailable"}`
        : error instanceof z.ZodError ? "Invalid verdict schema"
        : error instanceof Error && /timeout|abort/i.test(error.name) ? "Provider timeout"
        : "Provider or response failure";
      return this.unavailable(
        `LLM review failed or returned an invalid verdict (${diagnostic}). No synthetic verdict was substituted.`,
      );
    }
  }
}
