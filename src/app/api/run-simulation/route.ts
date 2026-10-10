import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    const cmd = "export PATH=$HOME/.foundry/bin:$HOME/.local/bin:$PATH && npx tsx scripts/run_demo.ts";
    const { stdout, stderr } = await execPromise(cmd, {
      cwd: process.cwd(),
      timeout: 30000
    });

    const evidencePath = path.resolve(process.cwd(), "evidence/run_evidence.json");
    if (fs.existsSync(evidencePath)) {
      const data = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      return NextResponse.json({ success: true, logs: stdout, data });
    }

    return NextResponse.json({ success: true, logs: stdout });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stderr: err.stderr }, { status: 500 });
  }
}
