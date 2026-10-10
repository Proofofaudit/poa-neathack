import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const evidencePath = path.resolve(process.cwd(), "evidence/run_evidence.json");
    if (fs.existsSync(evidencePath)) {
      const data = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      return NextResponse.json({ success: true, data });
    }
    return NextResponse.json({ success: false, error: "Evidence file not yet generated" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
