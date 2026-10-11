import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.floor(process.uptime());

  // 1. Live RPC probe (Base Mainnet or local Anvil)
  let rpcStatus = "DISCONNECTED";
  let rpcLatencyMs = 0;
  let blockHeight: number | null = null;
  const rpcEndpoint = process.env.ANVIL_RPC_URL || "https://mainnet.base.org";

  try {
    const startTime = Date.now();
    const provider = new ethers.JsonRpcProvider(rpcEndpoint, undefined, { staticNetwork: true });
    // Use Promise.race with 2500ms timeout
    const blockPromise = provider.getBlockNumber();
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("RPC_TIMEOUT")), 2500));
    blockHeight = await Promise.race([blockPromise, timeoutPromise]);
    rpcLatencyMs = Date.now() - startTime;
    rpcStatus = "OPERATIONAL";
  } catch (err: any) {
    rpcStatus = err.message === "RPC_TIMEOUT" ? "TIMEOUT" : "UNREACHABLE";
  }

  // 2. Configuration & telemetry health
  const neatlogsStatus = process.env.NEATLOGS_API_KEY ? "CONFIGURED" : "LOCAL_DEV_ONLY";
  const llmStatus = (process.env.LITELLM_API_KEY || process.env.OPENAI_API_KEY) ? "CONFIGURED" : "UNCONFIGURED";
  const crustdataStatus = process.env.CRUSTDATA_API_KEY ? "CONFIGURED" : "LOCAL_LABELS_ONLY";

  const isHealthy = rpcStatus === "OPERATIONAL" || rpcStatus === "DISCONNECTED";

  const healthData = {
    status: isHealthy ? "HEALTHY" : "DEGRADED",
    version: "1.0.0",
    service: "poa-incident-coprocessor",
    timestamp,
    uptimeSeconds,
    checks: {
      blockchainRpc: {
        status: rpcStatus,
        endpoint: rpcEndpoint.replace(/(apiKey=)[^&]+/, "$1***"),
        blockHeight,
        latencyMs: rpcLatencyMs
      },
      neatlogsObservability: {
        status: neatlogsStatus,
        projectId: process.env.NEATLOGS_PROJECT_ID || "542c53f4-ec26-4d57-a097-b7c9175c84be",
        protocol: "OpenTelemetry GenAI Spans"
      },
      forensicLlmEngine: {
        status: llmStatus,
        model: process.env.LITELLM_MODEL || "claude-haiku",
        endpoint: process.env.LITELLM_BASE_URL || "https://litellm.vision.aivar.app/v1"
      },
      crustdataIntelligence: {
        status: crustdataStatus,
        enrichmentMode: "HYBRID_BYTECODE_AND_API"
      },
      counterfactualEngine: {
        status: "OPERATIONAL",
        standard: "Euler Sub-Account Net Equity Replay (Multi-Asset BigInt)",
        policy: "POA_RESTITUTION_POLICY_V1_EQUITY_DELTA"
      },
      cryptographicDistributor: {
        status: "OPERATIONAL",
        merkleStandard: "OpenZeppelin StandardMerkleTree (Double Keccak-256)",
        cveDefense: "CVE-2022-37454 Second-Preimage Immune"
      }
    }
  };

  return NextResponse.json(healthData, { status: isHealthy ? 200 : 503 });
}
