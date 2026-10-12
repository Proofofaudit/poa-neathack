import "dotenv/config";
import fs from "node:fs";
import { ethers } from "ethers";
import OpenAI from "openai";
import { AaveBaseTools, LiveAaveAgent } from "../src/agent/live-agent.js";
import { neatlogs } from "../src/observability/neatlogs.js";
import { sourceFingerprint } from "./source_fingerprint.js";
const rpc = new ethers.FetchRequest(process.env.BASE_RPC_URL || "https://mainnet.base.org");
rpc.timeout = 10000;
const provider = new ethers.JsonRpcProvider(rpc, undefined, { batchMaxCount: 1 });
try {
  const source = sourceFingerprint();
  const modelRequested = process.env.POA_LLM_ENABLED === "true";
  const key = process.env.LITELLM_API_KEY || process.env.OPENAI_API_KEY;
  if (modelRequested && !key) throw new Error("Model requested without credentials");
  const client = modelRequested ? neatlogs.wrapClient(new OpenAI({ apiKey: key, baseURL: process.env.LITELLM_API_KEY ? process.env.LITELLM_BASE_URL : undefined, timeout: 12000, maxRetries: 0 })) : undefined;
  const report = await new LiveAaveAgent(new AaveBaseTools(provider), client).run(process.argv[2], undefined, process.env.POA_DEEP_INVESTIGATION === "true");
  const sourceAfterRun = sourceFingerprint();
  const artifact = { schemaVersion: 1, source, sourceChangedDuringRun: source.sha256 !== sourceAfterRun.sha256, report, observabilityTrace: neatlogs.getLatestTrace() };
  const target = process.env.POA_LIVE_AGENT_EVIDENCE || "evidence/live_agent_run.json";
  fs.writeFileSync(target, JSON.stringify(artifact, null, 2));
  console.log(JSON.stringify({ status: report.status, mode: report.mode, steps: report.steps.map(s => ({ action: s.action, status: s.status })), findings: report.findings, tokensUsed: report.tokensUsed, evidence: target }));
  if (report.status !== "COMPLETED") process.exitCode = 1;
} catch { console.error("Live agent did not complete. No simulated result substituted."); process.exitCode = 1; }
finally { provider.destroy(); }
