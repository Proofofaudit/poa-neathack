import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { rpcRead } from "../../../chain/rpc";
export const dynamic = "force-dynamic";
export async function GET() {
  const endpoint =
    process.env.ANVIL_RPC_URL ||
    process.env.BASE_RPC_URL ||
    "https://mainnet.base.org";
  const request = new ethers.FetchRequest(endpoint);
  request.timeout = 2500;
  const provider = new ethers.JsonRpcProvider(request);
  let blockchainRpc: Record<string, unknown> = { status: "UNREACHABLE" };
  const started = Date.now();
  try {
    const [height, network] = await rpcRead(
      () => Promise.all([provider.getBlockNumber(), provider.getNetwork()]),
      { attempts: 1, timeoutMs: 2500 },
    );
    blockchainRpc = {
      status: "OPERATIONAL",
      blockHeight: height,
      chainId: Number(network.chainId),
      latencyMs: Date.now() - started,
    };
  } catch {
    /* No endpoint or exception string is returned because either can contain a credential. */
  } finally {
    provider.destroy();
  }
  const healthy = blockchainRpc.status === "OPERATIONAL";
  return NextResponse.json(
    {
      status: healthy ? "HEALTHY" : "DEGRADED",
      version: "0.2.0",
      timestamp: new Date().toISOString(),
      scope:
        "Prototype readiness; RPC reachability is probed. Configuration is not evidence of provider connectivity.",
      checks: {
        blockchainRpc,
        forensicLlmEngine: {
          mode:
            process.env.POA_LLM_ENABLED === "true"
              ? "LLM_REVIEW_REQUIRED"
              : "DETERMINISTIC_POLICY",
          connectivity: "NOT_PROBED",
        },
        neatlogsObservability: {
          enabled: process.env.POA_TELEMETRY_ENABLED === "true",
          connectivity: "NOT_PROBED",
          localTraces: true,
        },
        entityEnrichment: {
          mode: "BYTECODE_ONLY",
          identityVerification: false,
          crustdataApi: "NOT_IMPLEMENTED",
        },
        cryptographicDistributor: {
          status: "NOT_PROBED",
          note: "Funding and registration are verified per demo run, not by this route.",
        },
        simulation: {
          enabled:
            process.env.NODE_ENV !== "production" ||
            (process.env.ALLOW_PROD_SIMULATION === "true" &&
              (process.env.POA_DEMO_TOKEN?.length || 0) >= 32),
        },
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
