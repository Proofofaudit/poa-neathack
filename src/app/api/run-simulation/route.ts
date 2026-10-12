import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { authorizedDemoRequest } from "../../../server/demo-access";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
const execute = promisify(execFile);
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!authorizedDemoRequest(req))
    return NextResponse.json(
      {
        success: false,
        error:
          "Demo execution needs local development access or the configured demo access code.",
      },
      { status: 403 },
    );
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_SIMULATION !== "true"
  )
    return NextResponse.json(
      {
        success: false,
        error:
          "This deployment displays saved evidence. Sandbox execution is disabled.",
      },
      { status: 403 },
    );
  const parsed = z
    .object({ network: z.enum(["anvil", "base"]) })
    .strict()
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { success: false, error: "Choose Local EVM or Base fork." },
      { status: 400 },
    );
  const dir = path.resolve("evidence");
  await fs.mkdir(dir, { recursive: true });
  let lock: fs.FileHandle;
  try {
    lock = await fs.open(path.join(dir, ".demo.lock"), "wx");
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "A demo is already running. Wait for it to finish.",
      },
      { status: 409 },
    );
  }
  try {
    const network = parsed.data.network;
    const started = Date.now();
    const script =
      network === "base" ? "scripts/run_base_fork.ts" : "scripts/run_demo.ts";
    await execute(process.execPath, ["--import", "tsx", script], {
      cwd: process.cwd(),
      timeout: 180000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        POA_LLM_ENABLED: "false",
        POA_TELEMETRY_ENABLED: "false",
      },
    });
    const data = JSON.parse(
      await fs.readFile(
        path.join(
          dir,
          network === "base" ? "base_fork_evidence.json" : "run_evidence.json",
        ),
        "utf8",
      ),
    );
    if (data.schemaVersion !== 2 || Date.parse(data.completedAt) < started)
      throw new Error("Fresh evidence was not produced");
    return NextResponse.json({ success: true, data, network });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "The sandbox run failed. No successful run is being claimed. Check the server logs and Foundry installation.",
      },
      { status: 500 },
    );
  } finally {
    await lock.close();
    await fs.unlink(path.join(dir, ".demo.lock")).catch(() => {});
  }
}
