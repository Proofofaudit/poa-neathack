import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const network = req.nextUrl.searchParams.get("network") || "anvil";
  if (!["anvil", "base"].includes(network))
    return NextResponse.json(
      { success: false, error: "Unknown network" },
      { status: 400 },
    );
  try {
    const data = JSON.parse(
      await fs.readFile(
        path.resolve(
          "evidence",
          network === "base" ? "base_fork_evidence.json" : "run_evidence.json",
        ),
        "utf8",
      ),
    );
    if (data.schemaVersion !== 2 || data.report?.status !== "COMPLETED")
      return NextResponse.json(
        {
          success: false,
          error:
            "No verified evidence from the current demo version. Run a new scenario.",
        },
        { status: 404 },
      );
    return NextResponse.json(
      { success: true, data, currentNetwork: network },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "No saved run for this environment yet." },
      { status: 404 },
    );
  }
}
