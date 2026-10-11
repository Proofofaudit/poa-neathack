import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let network = "anvil";
    try {
      const body = await req.json();
      if (body?.network === "base") {
        network = "base";
      }
    } catch {
      // Default to anvil if no body provided
    }

    const script = network === "base" ? "scripts/run_base_fork.ts" : "scripts/run_demo.ts";
    const evidenceTarget = network === "base" ? "evidence/base_fork_evidence.json" : "evidence/run_evidence.json";

    const cmd = `export PATH=$HOME/.foundry/bin:$HOME/.local/bin:$PATH && npx tsx ${script}`;
    const { stdout, stderr } = await execPromise(cmd, {
      cwd: process.cwd(),
      timeout: 60000
    });

    const evidencePath = path.resolve(process.cwd(), evidenceTarget);
    if (fs.existsSync(evidencePath)) {
      const data = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      return NextResponse.json({ success: true, logs: stdout, data, network });
    }

    return NextResponse.json({ success: true, logs: stdout, network });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stderr: err.stderr }, { status: 500 });
  }
}
