import fs from "node:fs";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { POAIncidentInvestigator } from "../src/agent/investigator.js";
import {
  DemoLendingAdapter,
  InvestigationParams,
} from "../src/chain/demo-adapter.js";
import { DeFiIncidentSimulator } from "../src/chain/simulator.js";
import { startSandbox } from "../src/chain/sandbox.js";
import { neatlogs } from "../src/observability/neatlogs.js";
import { gradeMission, MissionExpectation } from "../src/evaluation/mission.js";
import { sourceFingerprint } from "./source_fingerprint.js";

async function main() {
  // Deliberately isolated from exposed model credentials. This evaluates the
  // rules-only investigator, not model quality or neatlogs native evaluations.
  process.env.POA_LLM_ENABLED = "false";
  const sandbox = await startSandbox(false);
  try {
    const simulator = await DeFiIncidentSimulator.createFromAnvil(
      sandbox.rpcUrl,
    );
    const fixture = await simulator.runFullScenario();
    const params: InvestigationParams = {
      incidentId: ethers.keccak256(
        ethers.toUtf8Bytes(fixture.oracleUpdateTxHash),
      ),
      incidentTxHash: fixture.oracleUpdateTxHash,
      oracleAddress: fixture.oracleAddress,
      referenceOracleAddress: fixture.referenceOracleAddress,
      poolAddress: fixture.lendingPoolAddress,
      distributorAddress: fixture.distributorAddress,
      collateralToken: fixture.wethAddress,
      debtToken: fixture.usdcAddress,
      protocol: "DEMO_LENDING_V1",
      deploymentBlockNumber: fixture.deploymentBlockNumber,
      toBlock: fixture.endBlockNumber,
    };
    const authorize: MissionExpectation = {
      outcome: "AUTHORIZE",
      amountsByIndex: { 0: "2500000000", 1: "1250000000", 2: "2000000000" },
      accounts: 6,
      liquidations: 4,
    };
    const scenarios: Array<{
      name: string;
      fault: string;
      expected: MissionExpectation;
      params?: Partial<InvestigationParams>;
      setup?: (agent: POAIncidentInvestigator) => void;
      persistentFault?: boolean;
    }> = [
      { name: "Normal investigation", fault: "None", expected: authorize },
      {
        name: "Transient query failure",
        fault: "One deliberately injected connection failure",
        setup: (a) => a.injectTransientRpcFailure(true),
        expected: { ...authorize, recovery: "RETRY_RPC" },
      },
      {
        name: "Provider range limit",
        fault: "Deliberate two-block query limit",
        setup: (a) => a.injectLogRangeLimit(2),
        expected: { ...authorize, recovery: "SPLIT_LOG_RANGE" },
      },
      {
        name: "Persistent query failure",
        fault: "Every log query deliberately fails; no substitute evidence",
        persistentFault: true,
        expected: {
          outcome: "WITHHOLD",
          reason: /Injected persistent RPC outage/,
        },
      },
      {
        name: "Missing incident receipt",
        fault: "Nonexistent transaction hash",
        params: { incidentTxHash: "0x" + "ff".repeat(32) },
        expected: { outcome: "WITHHOLD", reason: /available receipt/ },
      },
      {
        name: "Reference is disputed oracle",
        fault: "Same reference and disputed oracle address",
        params: { referenceOracleAddress: fixture.oracleAddress },
        expected: { outcome: "WITHHOLD", reason: /separate reference oracle/ },
      },
      {
        name: "Unsupported protocol",
        fault: "Protocol adapter is absent",
        params: { protocol: undefined },
        expected: { outcome: "WITHHOLD", reason: /Unsupported protocol/ },
      },
    ];
    const rows = [];
    for (const scenario of scenarios) {
      const adapter = new DemoLendingAdapter(sandbox.provider);
      const agent = new POAIncidentInvestigator(
        sandbox.provider,
        scenario.persistentFault
          ? {
              collect: (p, retry, before, recovery) =>
                adapter.collect(
                  p,
                  retry,
                  (from, to) => {
                    before?.(from, to);
                    throw new Error("Injected persistent RPC outage");
                  },
                  recovery,
                ),
            }
          : adapter,
      );
      scenario.setup?.(agent);
      const started = performance.now();
      const report = await agent.investigateOracleIncident({
        ...params,
        ...scenario.params,
      });
      const trace = neatlogs.recordedTraces.find(
        (t) => t.traceId === report.executionTraceId,
      );
      const grade = gradeMission(report, trace, scenario.expected);
      rows.push({
        name: scenario.name,
        injectedFault: scenario.fault,
        expectedOutcome: scenario.expected.outcome,
        ...grade,
        durationMs: Math.round(performance.now() - started),
        traceId: report.executionTraceId,
        status: report.status,
        policyDecision: report.policyDecision,
        amountUsdc: report.totalRestitutionCalculatedUsdc,
        reviewReasons: report.reviewReasons,
        recoveryActions: report.recoveryActions,
        claims: report.claims,
        manifest: report.merkleManifest,
        trace,
      });
      console.log(
        `${grade.passed ? "PASS" : "FAIL"}: ${scenario.name} — ${grade.verdict}; ${grade.failedToolSpans} failed SDK spans retained`,
      );
    }
    const result = {
      schemaVersion: 1,
      evaluatedAt: new Date().toISOString(),
      source: sourceFingerprint(),
      scope:
        "Seven project-owned full-investigation scenarios on one synthetic real-EVM fixture; rules-only; no payout transactions; not production reliability, live model quality, or a native neatlogs evaluation",
      chainId: fixture.chainId,
      incidentTxHash: params.incidentTxHash,
      summary: {
        scenarios: rows.length,
        passed: rows.filter((r) => r.passed).length,
        completed: rows.filter((r) => r.verdict === "COMPLETED").length,
        recovered: rows.filter((r) => r.verdict === "RECOVERED").length,
        safeWithholds: rows.filter((r) => r.verdict === "SAFE_WITHHOLD").length,
        unexpectedOutcomes: rows.filter((r) => !r.passed).length,
        failedToolSpans: rows.reduce((sum, r) => sum + r.failedToolSpans, 0),
      },
      rows,
    };
    const file =
      process.env.POA_TELEMETRY_ENABLED === "true"
        ? "evidence/mission_evaluation_remote.json"
        : "evidence/mission_evaluation.json";
    fs.mkdirSync("evidence", { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify(
        result,
        (_, v) => (typeof v === "bigint" ? v.toString() : v),
        2,
      ),
    );
    assert.equal(
      result.summary.unexpectedOutcomes,
      0,
      "Every scenario must reach its expected mission outcome",
    );
    console.log(
      `Saved ${file}. Raw failed spans are preserved, never relabeled as successes.`,
    );
  } finally {
    sandbox.provider.destroy();
    sandbox.process.kill();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Mission evaluation failed");
  process.exitCode = 1;
});
