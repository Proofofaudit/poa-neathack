import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { CounterfactualReplayEngine as Current } from "../src/economics/counterfactual.js";
import { neatlogs } from "../src/observability/neatlogs.js";
import { sourceFingerprint } from "./source_fingerprint.js";

async function main() {
  // Execute only the pinned, import-free pure arithmetic module. No historical
  // agents, environment files, network clients or payout contracts are run.
  const revision = "96da127df488502f364a267311c4a63878a8a4e2";
  const source = execFileSync(
    "git",
    ["show", `${revision}:src/economics/counterfactual.ts`],
    { encoding: "utf8" },
  );
  const ast = ts.createSourceFile(
    "baseline.ts",
    source,
    ts.ScriptTarget.ES2022,
    true,
  );
  assert.ok(
    !ast.statements.some(
      (s) => ts.isImportDeclaration(s) || ts.isImportEqualsDeclaration(s),
    ),
    "Baseline must remain an import-free pure module",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  const { CounterfactualReplayEngine: Baseline } = await import(
    `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
  );
  const account = "0x1111111111111111111111111111111111111111";
  const position = {
    account,
    collateralBase: 10n * 10n ** 18n,
    debtBase: 15000n * 10n ** 6n,
  };
  const liquidation = {
    borrower: account,
    liquidator: account,
    txHash: "0x" + "aa".repeat(32),
    blockNumber: 100,
    debtCovered: position.debtBase,
    collateralSeized: 875n * 10n ** 16n,
    oraclePriceUsed: 180000000000n,
  };
  const cases = [
    {
      name: "Eligible threshold crossing",
      position,
      liquidation,
      expected: 2500000000n,
    },
    {
      name: "No observed liquidation",
      position,
      liquidation: undefined,
      expected: 0n,
    },
    {
      name: "Pre-insolvent account",
      position: { ...position, debtBase: 16500000000n },
      liquidation: { ...liquidation, debtCovered: 16500000000n },
      expected: 0n,
    },
    {
      name: "Healthy at disputed price",
      position: {
        ...position,
        collateralBase: 3n * 10n ** 18n,
        debtBase: 3500000000n,
      },
      liquidation: {
        ...liquidation,
        debtCovered: 3500000000n,
        collateralSeized: 21n * 10n ** 17n,
      },
      expected: 0n,
    },
    {
      name: "Wrong borrower event",
      position,
      liquidation: {
        ...liquidation,
        borrower: "0x2222222222222222222222222222222222222222",
      },
      expected: 0n,
    },
    {
      name: "Seized collateral exceeds position",
      position,
      liquidation: { ...liquidation, collateralSeized: 11n * 10n ** 18n },
      expected: 0n,
    },
    {
      name: "Repaid debt exceeds position",
      position,
      liquidation: { ...liquidation, debtCovered: 16000000000n },
      expected: 0n,
    },
    {
      name: "Negative debt repayment",
      position,
      liquidation: { ...liquidation, debtCovered: -1n },
      expected: 0n,
    },
    {
      name: "Event oracle price mismatch",
      position,
      liquidation: { ...liquidation, oraclePriceUsed: 190000000000n },
      expected: 0n,
    },
    {
      name: "Zero baseline configuration",
      position,
      liquidation,
      config: { baselinePriceUsd8Dec: 0n },
      expected: 0n,
    },
    {
      name: "Zero threshold configuration",
      position,
      liquidation,
      config: { liquidationThresholdBps: 0n },
      expected: 0n,
    },
    {
      name: "Zero-decimal collateral",
      position: { ...position, collateralBase: 10n },
      liquidation: { ...liquidation, collateralSeized: 9n },
      config: { collateralDecimals: 0 },
      expected: 3000000000n,
    },
  ];
  const rows: any[] = [];
  const run = async (engine: typeof Current, label: string) =>
    neatlogs.runWorkflow(
      `policy-evaluation-${label}`,
      { cases: cases.length, label },
      async () => {
        for (const c of cases) {
          const start = performance.now();
          let amount = 0n,
            outcome = "WITHHELD";
          try {
            const result = await neatlogs.traceSpan(
              c.name,
              "GUARDRAIL",
              { version: label, expectedAmount: c.expected.toString() },
              async () =>
                engine.analyzeBorrowerIncident(
                  0,
                  c.position,
                  c.liquidation,
                  c.config,
                ),
            );
            amount = result.restitutionAmountUsdc;
            outcome = result.status;
          } catch {
            outcome = "REJECTED_INVALID_INPUT";
          }
          rows.push({
            case: c.name,
            version: label,
            expectedAmount: c.expected.toString(),
            observedAmount: amount.toString(),
            outcome,
            passed: amount === c.expected,
            unsafeAuthorization:
              c.expected === 0n && amount > 0n && outcome === "VERIFIED",
            durationMs: performance.now() - start,
          });
        }
      },
    );
  await run(Baseline, "baseline-96da127");
  await run(Current, "current");
  const metrics = (label: string) => ({
    cases: cases.length,
    passed: rows.filter((r) => r.version === label && r.passed).length,
    unsafeAuthorizations: rows.filter(
      (r) => r.version === label && r.unsafeAuthorization,
    ).length,
  });
  const result = {
    schemaVersion: 1,
    scope:
      "Project-owned economic policy regression evaluation; synthetic unit inputs, not production accuracy or official EVMbench",
    baseline: {
      revision,
      sourceSha256: crypto.createHash("sha256").update(source).digest("hex"),
      ...metrics("baseline-96da127"),
    },
    current: { ...sourceFingerprint(), ...metrics("current") },
    rows,
    traces: neatlogs.recordedTraces.slice(-2),
    evaluatedAt: new Date().toISOString(),
  };
  fs.mkdirSync("evidence", { recursive: true });
  fs.writeFileSync(
    process.env.POA_TELEMETRY_ENABLED === "true"
      ? "evidence/upgrade_evaluation_remote.json"
      : "evidence/upgrade_evaluation.json",
    JSON.stringify(result, null, 2),
  );
  assert.equal(
    result.current.passed,
    cases.length,
    "Current implementation must pass every labeled scenario",
  );
  assert.equal(result.current.unsafeAuthorizations, 0);
  console.table(
    [
      { version: "96da127", ...result.baseline },
      { version: "current", ...result.current },
    ].map(({ version, cases, passed, unsafeAuthorizations }) => ({
      version,
      cases,
      passed,
      unsafeAuthorizations,
    })),
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Evaluation failed");
  process.exitCode = 1;
});
