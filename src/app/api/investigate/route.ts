import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import OpenAI from "openai";
import { AaveBaseTools, LiveAaveAgent } from "../../../agent/live-agent";
import { authorizedDemoRequest } from "../../../server/demo-access";
import { publicAiCaseAllowed, reservePublicAiRun } from "../../../server/public-ai-access";
import { HISTORICAL_LIQUIDATION } from "../../../chain/aave-forensics";
import { neatlogs } from "../../../observability/neatlogs";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Object.keys(body).some(k => !["transactionHash", "useModel"].includes(k)) || (body.transactionHash !== undefined && (typeof body.transactionHash !== "string" || !ethers.isHexString(body.transactionHash, 32))) || (body.useModel !== undefined && typeof body.useModel !== "boolean"))
    return NextResponse.json({ success: false, error: "Supply an optional Base transaction hash and model choice." }, { status: 400 });
  const useModel = body.useModel ?? process.env.POA_PUBLIC_AI_ENABLED === "true";
  const operator = authorizedDemoRequest(req);
  const publicCase = publicAiCaseAllowed(body.transactionHash);
  if (useModel && (process.env.POA_LIVE_AGENT_ENABLED !== "true" || (!operator && !publicCase)))
    return NextResponse.json({ success: false, error: "Public AI supports the historical example. For another transaction, use rule mode or an operator access code." }, { status: 403 });
  const key = process.env.LITELLM_API_KEY || process.env.OPENAI_API_KEY;
  if (useModel && !key) return NextResponse.json({ success: false, error: "Model configuration unavailable. No rule result substituted." }, { status: 503 });
  const release = useModel && !operator ? reservePublicAiRun() : undefined;
  if (useModel && !operator && !release) return NextResponse.json({success: false, error: "The shared AI demo is busy or its per-instance demo budget is reached. Try later or select rule mode."}, {status: 429, headers: {"Retry-After": "60"}});
  const transactionHash = useModel && !operator ? HISTORICAL_LIQUIDATION : body.transactionHash;
  const rpc = new ethers.FetchRequest(process.env.BASE_RPC_URL || "https://mainnet.base.org");
  rpc.timeout = 8000;
  const provider = new ethers.JsonRpcProvider(rpc, undefined, { batchMaxCount: 1 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  try {
    const client = useModel ? neatlogs.wrapClient(new OpenAI({ apiKey: key, baseURL: process.env.LITELLM_API_KEY ? process.env.LITELLM_BASE_URL : undefined, timeout: 12000, maxRetries: 0 })) : undefined;
    const data = await Promise.race([
      new LiveAaveAgent(new AaveBaseTools(provider), client).run(transactionHash, controller.signal, true),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("budget")); }, 105000); }),
    ]);
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Investigation could not finish within its budget. No completed report or payout is being claimed." }, { status: 503 });
  } finally { controller.abort(); clearTimeout(timer); provider.destroy(); release?.(); }
}
