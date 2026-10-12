import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { inspectBase, InspectionError } from "../../../chain/live-inspection";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input")?.trim() || "";
  if (!ethers.isAddress(input) && !ethers.isHexString(input, 32))
    return NextResponse.json({ success: false, error: "Enter a Base contract address or transaction hash." }, { status: 400 });
  const request = new ethers.FetchRequest(process.env.BASE_RPC_URL || "https://mainnet.base.org");
  request.timeout = 5000;
  const provider = new ethers.JsonRpcProvider(request, undefined, { batchMaxCount: 1 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const data = await Promise.race([
      inspectBase(provider, input),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new InspectionError("Base RPC timed out. Try again shortly.", 503)), 18000); }),
    ]);
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof InspectionError ? error.message : "Base RPC could not complete this read. No result was substituted." }, { status: error instanceof InspectionError ? error.status : 503 });
  } finally { clearTimeout(timer); provider.destroy(); }
}
