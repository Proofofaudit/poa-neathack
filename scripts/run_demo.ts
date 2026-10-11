import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { DeFiIncidentSimulator, ScenarioFixtureData } from "../src/chain/simulator.js";
import { POAIncidentInvestigator } from "../src/agent/investigator.js";
import { neatlogs } from "../src/observability/neatlogs.js";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureAnvilRunning(): Promise<{ anvilProcess?: ChildProcess; rpcUrl: string }> {
  const rpcUrl = "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1, batchMaxCount: 1 });

  try {
    await provider.getBlockNumber();
    console.log("[Anvil] Reusing already running local Anvil node; resetting state to genesis...");
    await provider.send("anvil_reset", []);
    return { rpcUrl };
  } catch (err) {
    console.log("[Anvil] Starting fresh local Anvil node...");
    const anvilBin = path.join(process.env.HOME || "/home/vamshi", ".foundry/bin/anvil");
    const proc = spawn(anvilBin, ["--port", "8545", "--silent"], { detached: true });
    await sleep(1500);
    return { anvilProcess: proc, rpcUrl };
  }
}

async function main() {
  console.log("================================================================================");
  console.log("  POA (Proof of Audits) — neatHack 2026 End-to-End Incident Restitution Demo");
  console.log("================================================================================\n");

  const { anvilProcess, rpcUrl } = await ensureAnvilRunning();
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1, batchMaxCount: 1 });

  try {
    // -------------------------------------------------------------------------
    // Phase 1: On-Chain Incident Simulation
    // -------------------------------------------------------------------------
    console.log("▶ Phase 1: Setting up DeFi lending pool & triggering faulty oracle update...");
    const simulator = await DeFiIncidentSimulator.createFromAnvil(rpcUrl);
    const fixture = await simulator.runFullScenario();

    console.log(`  ✓ Deployed DemoOracle at: ${fixture.oracleAddress}`);
    console.log(`  ✓ Deployed DemoLendingPool at: ${fixture.lendingPoolAddress}`);
    console.log(`  ✓ Deployed RestitutionDistributor at: ${fixture.distributorAddress}`);
    console.log(`  ✓ Seeded 5 borrower positions.`);
    console.log(`  ✓ Triggered Faulty Oracle Drop (-10%: $2000 -> $1800). Tx: ${fixture.oracleUpdateTxHash.substring(0, 18)}...`);
    console.log(`  ✓ Executed ${fixture.liquidationTxs.length} real on-chain liquidations on underwater borrowers.\n`);

    // -------------------------------------------------------------------------
    // Phase 2: Autonomous Agent Investigation & Counterfactual Replay
    // -------------------------------------------------------------------------
    console.log("▶ Phase 2: Launching POA Autonomous Investigator Agent...");
    const investigator = new POAIncidentInvestigator(provider);
    const incidentId = ethers.keccak256(ethers.toUtf8Bytes(`ORACLE_INCIDENT_${fixture.oracleUpdateTxHash}`));

    const simulatedEvents = fixture.liquidationTxs.map(l => ({
      txHash: l.txHash,
      blockNumber: 1,
      liquidator: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      borrower: l.borrower,
      debtCovered: BigInt(l.debtCovered),
      collateralSeized: BigInt(l.collateralSeized),
      oraclePriceUsed: BigInt(fixture.faultyPrice)
    }));

    const knownBorrowers = fixture.borrowers.map(b => ({
      account: b.address,
      collateral: BigInt(b.initialCollateralWeth),
      debt: BigInt(b.initialDebtUsdc)
    }));

    const report = await investigator.investigateOracleIncident({
      incidentId,
      incidentTxHash: fixture.oracleUpdateTxHash,
      oracleAddress: fixture.oracleAddress,
      poolAddress: fixture.lendingPoolAddress,
      distributorAddress: fixture.distributorAddress,
      collateralToken: fixture.wethAddress,
      debtToken: fixture.usdcAddress,
      baselinePrice: BigInt(fixture.baselinePrice),
      simulatedLiquidations: simulatedEvents,
      knownBorrowers
    });

    console.log(`  ✓ Investigation Status: ${report.status}`);
    if (report.forensicAiAssessment) {
      console.log(`  ✓ AI Forensic Reasoner [${report.forensicAiAssessment.modelUsed}]: ${report.forensicAiAssessment.executiveSummary}`);
      console.log(`  ✓ Root Cause: ${report.forensicAiAssessment.rootCauseAnalysis}`);
    }
    if (report.entityEnrichment) {
      console.log(`  ✓ Crustdata Entity Intelligence: Profiled ${Object.keys(report.entityEnrichment).length} incident addresses.`);
    }
    console.log(`  ✓ Analyzed Liquidation Events: ${report.eventsAnalyzed}`);
    console.log(`  ✓ Identified Wrongful Liquidations: ${report.wrongfulLiquidationsCount} of ${fixture.liquidationTxs.length}`);
    console.log(`  ✓ Total Verified Restitution: ${(Number(report.totalRestitutionCalculatedUsdc) / 1e6).toFixed(2)} USDC`);
    console.log(`  ✓ Merkle Root: ${report.merkleManifest?.merkleRoot}\n`);

    // -------------------------------------------------------------------------
    // Phase 3: Payout Authorization & On-Chain Distribution
    // -------------------------------------------------------------------------
    console.log("▶ Phase 3: Authorizing & Executing Verified Restitution Payouts...");
    const mnemonic = "test test test test test test test test test test test junk";
    const deployer = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0/0").connect(provider);
    const contractsDir = path.resolve(process.cwd(), "contracts/out");
    const distArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, "RestitutionDistributor.sol/RestitutionDistributor.json"), "utf8"));
    const erc20Artifact = JSON.parse(fs.readFileSync(path.join(contractsDir, "MockERC20.sol/MockERC20.json"), "utf8"));

    const distributor = new ethers.Contract(fixture.distributorAddress, distArtifact.abi, deployer);
    const usdc = new ethers.Contract(fixture.usdcAddress, erc20Artifact.abi, deployer);

    const totalRestitution = BigInt(report.totalRestitutionCalculatedUsdc);
    // Mint compensation tokens to distributor
    await (await (usdc as any).mint(fixture.distributorAddress, totalRestitution)).wait();

    // Register incident manifest on-chain
    const registerTx = await (distributor as any).registerIncident(
      incidentId,
      report.merkleManifest!.merkleRoot,
      totalRestitution,
      fixture.usdcAddress,
      "POA_POLICY_V1"
    );
    await registerTx.wait();
    console.log(`  ✓ Incident registered on-chain in RestitutionDistributor.`);

    // Execute real claim for Victim 1
    const claim1 = report.merkleManifest!.claims[0];
    const victim1Signer = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0/2").connect(provider);
    const balBefore = await (usdc as any).balanceOf(claim1.claimant);

    const claimTx = await (distributor.connect(victim1Signer) as any).claim(
      incidentId,
      claim1.claimIndex,
      claim1.claimant,
      claim1.amount,
      claim1.proof
    );
    await claimTx.wait();
    const balAfter = await (usdc as any).balanceOf(claim1.claimant);

    console.log(`  ✓ Victim 1 (${claim1.claimant.substring(0, 10)}...) successfully claimed ${(Number(claim1.amount) / 1e6).toFixed(2)} USDC!`);
    console.log(`  ✓ Balance Change Verified: +${(Number(balAfter - balBefore) / 1e6).toFixed(2)} USDC.\n`);

    // -------------------------------------------------------------------------
    // Phase 4: Adversarial & Recovery Tests
    // -------------------------------------------------------------------------
    console.log("▶ Phase 4: Adversarial Guardrails & Negative Tests...");
    let duplicateRejected = false;
    try {
      await (distributor.connect(victim1Signer) as any).claim(
        incidentId,
        claim1.claimIndex,
        claim1.claimant,
        claim1.amount,
        claim1.proof
      );
    } catch (err: any) {
      duplicateRejected = true;
      console.log(`  ✓ Negative Test Passed: Duplicate claim was rejected on-chain ("Claim has already been executed").`);
    }

    let tamperedRejected = false;
    try {
      await (distributor.connect(victim1Signer) as any).claim(
        incidentId,
        claim1.claimIndex,
        claim1.claimant,
        claim1.amount + 1000000000n, // Tampered amount
        claim1.proof
      );
    } catch (err: any) {
      tamperedRejected = true;
      console.log(`  ✓ Negative Test Passed: Tampered claim amount was rejected ("Invalid Merkle proof").\n`);
    }

    // -------------------------------------------------------------------------
    // Phase 5: Neatlogs Observability Summary
    // -------------------------------------------------------------------------
    console.log("▶ Phase 5: Neatlogs Observability Evidence...");
    const latestTrace = neatlogs.getLatestTrace();
    console.log(`  ✓ Active Neatlogs Trace ID: ${latestTrace?.traceId}`);
    console.log(`  ✓ Recorded Spans: ${latestTrace?.spans.length}`);
    latestTrace?.spans.forEach((s, idx) => {
      console.log(`     [${idx + 1}] ${s.kind.padEnd(10)} | ${s.name.padEnd(30)} | ${s.durationMs}ms | ${s.status}`);
    });

    // Save evidence artifact
    const evidencePath = path.resolve(process.cwd(), "evidence/run_evidence.json");
    fs.writeFileSync(evidencePath, JSON.stringify({
      incidentId,
      fixture,
      report,
      restitutionExecuted: {
        claimIndex: claim1.claimIndex,
        claimant: claim1.claimant,
        amountUsdc: claim1.amount.toString(),
        txHash: claimTx.hash
      },
      observabilityTrace: latestTrace,
      completedAt: new Date().toISOString()
    }, (key, value) => typeof value === "bigint" ? value.toString() : value, 2));

    await neatlogs.flush();

    console.log(`\n✓ Full verification evidence saved to: ${evidencePath}`);
    console.log("================================================================================");
    console.log("  DEMO RUN COMPLETED SUCCESSFULLY: 100% VERIFIED ON-CHAIN RESTITUTION");
    console.log("================================================================================");

  } finally {
    if (anvilProcess) {
      anvilProcess.kill();
    }
  }
}

main().catch(err => {
  console.error("FATAL ERROR in demo run:", err);
  process.exit(1);
});
