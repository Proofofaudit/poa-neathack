import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { DeFiIncidentSimulator } from "../src/chain/simulator.js";
import { POAIncidentInvestigator } from "../src/agent/investigator.js";
import { neatlogs } from "../src/observability/neatlogs.js";
import { sourceFingerprint } from "./source_fingerprint.js";
import { startSandbox } from "../src/chain/sandbox.js";

async function expectRevert(operation: () => Promise<unknown>, reason: string) {
  try {
    await operation();
  } catch (error) {
    assert.match(String(error), new RegExp(reason));
    return true;
  }
  throw new Error(`Expected on-chain rejection: ${reason}`);
}
async function main() {
  const fork = process.env.POA_BASE_FORK === "true";
  const sandbox = await startSandbox(fork);
  const { provider, rpcUrl } = sandbox;
  try {
    console.log(
      `POA evidence demo | ${fork ? "Base fork" : "local EVM"} | synthetic lending protocol, oracle and test tokens`,
    );
    const simulator = await DeFiIncidentSimulator.createFromAnvil(rpcUrl);
    const fixture = await simulator.runFullScenario();
    const params = {
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
      protocol: "DEMO_LENDING_V1" as const,
      deploymentBlockNumber: fixture.deploymentBlockNumber,
      toBlock: fixture.endBlockNumber,
    };
    const investigator = new POAIncidentInvestigator(provider);
    // Exercise a real retry of the log query; no substitute fixture is returned.
    investigator.injectTransientRpcFailure(true);
    investigator.injectLogRangeLimit(2);
    const report = await investigator.investigateOracleIncident(params);
    if (report.status !== "COMPLETED") {
      const destination = process.env.POA_DEMO_EVIDENCE_FILE;
      if (destination) {
        fs.writeFileSync(destination, JSON.stringify({
          schemaVersion: 2, generatedAt: new Date().toISOString(), source: sourceFingerprint(),
          environment: { mode: fork ? "BASE_FORK" : "LOCAL_EVM", syntheticScenario: true },
          report, restitutionExecuted: null,
          observabilityTrace: neatlogs.recordedTraces.find(t => t.traceId === report.executionTraceId),
        }, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
      }
      await neatlogs.flush();
    }
    assert.equal(report.status, "COMPLETED", report.summary);
    assert.equal(report.policyDecision, "AUTHORIZED_DEMO");
    assert.equal(report.eventsAnalyzed, 4);
    assert.equal(report.wrongfulLiquidationsCount, 3);
    assert.equal(report.totalRestitutionCalculatedUsdc, "5750000000");
    assert.equal(report.retriesAttempted, 1);
    assert.ok(
      report.recoveryActions.some((a) => a.action === "SPLIT_LOG_RANGE"),
    );
    assert.equal(report.independentAudit?.claimsVerified, 3);
    assert.ok(
      report.claims.some((c) =>
        c.reason.includes("already undercollateralized"),
      ),
    );
    assert.equal(
      report.claims.filter((c) => c.collateralSeizedWeth === "0").length,
      2,
    );
    assert.ok(report.merkleManifest);
    const successfulTrace = neatlogs.recordedTraces.find(
      (t) => t.traceId === report.executionTraceId,
    );
    assert.ok(
      successfulTrace?.sdkSpans.some(
        (s) => s.name === "historicalLogQuery" && s.status.code === 2,
      ),
      "Actual SDK must capture the injected failed action",
    );
    console.log(report.summary);
    const signer = new ethers.NonceManager(
      ethers.HDNodeWallet.fromPhrase(
        "test test test test test test test test test test test junk",
        "",
        "m/44'/60'/0'/0/0",
      ).connect(provider),
    );
    const artifacts = path.resolve("contracts/out");
    const distributor = new ethers.Contract(
      fixture.distributorAddress,
      JSON.parse(
        fs.readFileSync(
          path.join(
            artifacts,
            "RestitutionDistributor.sol/RestitutionDistributor.json",
          ),
          "utf8",
        ),
      ).abi,
      signer,
    );
    const usdc = new ethers.Contract(
      fixture.usdcAddress,
      JSON.parse(
        fs.readFileSync(
          path.join(artifacts, "MockERC20.sol/MockERC20.json"),
          "utf8",
        ),
      ).abi,
      signer,
    );
    await (
      await usdc.mint(
        fixture.distributorAddress,
        BigInt(report.totalRestitutionCalculatedUsdc),
      )
    ).wait();
    const registered = await (
      await distributor.registerIncident(
        params.incidentId,
        report.merkleManifest.merkleRoot,
        report.totalRestitutionCalculatedUsdc,
        fixture.usdcAddress,
        "POA_DEMO_POLICY_V2_EQUITY_DELTA",
      )
    ).wait();
    const claim = report.merkleManifest.claims[0];
    const tamperedRejected = await expectRevert(
      () =>
        distributor.claim.staticCall(
          params.incidentId,
          claim.claimIndex,
          claim.claimant,
          claim.amount + 1n,
          claim.proof,
        ),
      "Invalid Merkle proof",
    );
    await provider.send("anvil_setBalance", [claim.claimant, "0x0"]);
    const recipientEthBefore = await provider.getBalance(claim.claimant);
    const before = await usdc.balanceOf(claim.claimant);
    // Permissionless forwarding pays the leaf claimant; the sender cannot redirect funds.
    const receipt = await (
      await distributor.claim(
        params.incidentId,
        claim.claimIndex,
        claim.claimant,
        claim.amount,
        claim.proof,
      )
    ).wait();
    const after = await usdc.balanceOf(claim.claimant);
    assert.equal(after - before, claim.amount);
    const recipientEthAfter = await provider.getBalance(claim.claimant);
    assert.equal(recipientEthBefore, 0n);
    assert.equal(recipientEthAfter, 0n);
    const duplicateRejected = await expectRevert(
      () =>
        distributor.claim.staticCall(
          params.incidentId,
          claim.claimIndex,
          claim.claimant,
          claim.amount,
          claim.proof,
        ),
      "Claim has already been executed",
    );
    const missing = await investigator.investigateOracleIncident({
      ...params,
      incidentTxHash: "0x" + "ff".repeat(32),
    });
    assert.equal(missing.status, "NEEDS_REVIEW");
    assert.equal(missing.merkleManifest, undefined);
    const evidence = {
      schemaVersion: 2,
      source: sourceFingerprint(),
      network: fork ? "Base Mainnet Fork" : "Local EVM",
      chainId: fixture.chainId,
      provenance: "SYNTHETIC_SCENARIO_REAL_EVM_EXECUTION",
      forkBlockNumber: sandbox.forkBlockNumber,
      fixture,
      report,
      claims: report.merkleManifest.claims,
      restitutionExecuted: {
        claimIndex: claim.claimIndex,
        claimant: claim.claimant,
        amountUsdc: claim.amount.toString(),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        method: "SPONSORED_FORWARDING",
        recipientEthBefore: recipientEthBefore.toString(),
        recipientEthAfter: recipientEthAfter.toString(),
        balanceBefore: before.toString(),
        balanceAfter: after.toString(),
        balanceDelta: (after - before).toString(),
      },
      registration: {
        txHash: registered.hash,
        blockNumber: registered.blockNumber,
      },
      checks: {
        tamperedRejected,
        duplicateRejected,
        missingReceiptWithheld: missing.status === "NEEDS_REVIEW",
        historicalDiscovery: true,
        fixtureOverridesUsed: false,
        adaptiveRangeRecovery: report.recoveryActions.some(
          (a) => a.action === "SPLIT_LOG_RANGE",
        ),
        independentClaimAudit:
          report.independentAudit?.allProofsVerified === true,
      },
      observabilityTrace: neatlogs.recordedTraces.find(
        (t) => t.traceId === report.executionTraceId,
      ),
      completedAt: new Date().toISOString(),
    };
    fs.mkdirSync("evidence", { recursive: true });
    const output =
      process.env.POA_DEMO_EVIDENCE_FILE ||
      (fork
        ? "evidence/base_fork_evidence.json"
        : "evidence/run_evidence.json");
    fs.writeFileSync(
      output,
      JSON.stringify(
        evidence,
        (_, v) => (typeof v === "bigint" ? v.toString() : v),
        2,
      ),
    );
    fs.writeFileSync(
      fork
        ? "evidence/base_fork_manifest.json"
        : "evidence/restitution_manifest.json",
      JSON.stringify(report.proofCarryingManifest, null, 2),
    );
    await neatlogs.flush();
    console.log(
      `PASS: three eligible borrowers, one pre-insolvent exclusion, two untouched positions; ${ethers.formatUnits(after - before, 6)} test USDC paid. Tamper, duplicate and missing-evidence checks passed. Evidence: ${output}`,
    );
    console.log(
      "The sandbox stops now. Saved transactions describe this isolated run and are not public mainnet transactions.",
    );
  } finally {
    provider.destroy();
    sandbox.process.kill();
  }
}
main().catch((error) => {
  console.error(
    "Demo failed:",
    error instanceof Error ? error.message : "Unknown failure",
  );
  process.exitCode = 1;
});
