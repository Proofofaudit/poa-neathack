import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import OpenAI from "openai";
import { AaveBaseTools, LiveAaveAgent } from "../../../agent/live-agent";
import { authorizedDemoRequest } from "../../../server/demo-access";
import { neatlogs } from "../../../observability/neatlogs";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Object.keys(body).some(k => !["transactionHash", "useModel"].includes(k)) || (body.transactionHash !== undefined && (typeof body.transactionHash !== "string" || !ethers.isHexString(body.transactionHash, 32))) || (body.useModel !== undefined && typeof body.useModel !== "boolean"))
    return NextResponse.json({ success: false, error: "Supply an optional Base transaction hash and model choice." }, { status: 400 });
  if (body.useModel && (!authorizedDemoRequest(req) || process.env.POA_LIVE_AGENT_ENABLED !== "true"))
    return NextResponse.json({ success: false, error: "Live AI requires the private agent access code and server model configuration. The free chain investigation is available without a code." }, { status: 403 });
  const key = process.env.LITELLM_API_KEY || process.env.OPENAI_API_KEY;
  if (body.useModel && !key) return NextResponse.json({ success: false, error: "Model configuration unavailable." }, { status: 503 });
  const rpc = new ethers.FetchRequest(process.env.BASE_RPC_URL || "https://mainnet.base.org");
  rpc.timeout = 3500;
  const provider = new ethers.JsonRpcProvider(rpc, undefined, { batchMaxCount: 1 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  try {
    const client = body.useModel ? neatlogs.wrapClient(new OpenAI({ apiKey: key, baseURL: process.env.LITELLM_API_KEY ? process.env.LITELLM_BASE_URL : undefined, timeout: 12000, maxRetries: 0 })) : undefined;
    const data = await Promise.race([
      new LiveAaveAgent(new AaveBaseTools(provider), client).run(body.transactionHash, controller.signal),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("budget")); }, body.useModel ? 105000 : 25000); }),
    ]);
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Investigation could not finish within its budget. No completed report or payout is being claimed." }, { status: 503 });
  } finally { controller.abort(); clearTimeout(timer); provider.destroy(); }
}
