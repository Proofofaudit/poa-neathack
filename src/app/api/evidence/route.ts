import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const network = searchParams.get("network");

    const targetFile = network === "base" ? "evidence/base_fork_evidence.json" : "evidence/run_evidence.json";
    const evidencePath = path.resolve(process.cwd(), targetFile);

    if (fs.existsSync(evidencePath)) {
      const data = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      const hasBaseFork = fs.existsSync(path.resolve(process.cwd(), "evidence/base_fork_evidence.json"));
      return NextResponse.json({ success: true, data, hasBaseFork, currentNetwork: network === "base" ? "base" : "anvil" });
    }
    return NextResponse.json({ success: false, error: `Evidence file ${targetFile} not yet generated` }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
