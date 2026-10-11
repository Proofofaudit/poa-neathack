import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { POAIncidentInvestigator } from "../src/agent/investigator.js";
import { neatlogs } from "../src/observability/neatlogs.js";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startBaseMainnetFork(): Promise<{ proc: ChildProcess; rpcUrl: string }> {
  const rpcUrl = "http://127.0.0.1:8545";
  console.log("[Base Fork] Forking live Base Mainnet (https://mainnet.base.org)...");
  
  const anvilBin = path.join(process.env.HOME || "/home/vamshi", ".foundry/bin/anvil");
  const proc = spawn(anvilBin, ["--fork-url", "https://mainnet.base.org", "--port", "8545", "--silent"], { detached: true });
  
  // Wait for fork to be ready
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1, batchMaxCount: 1 });
  let ready = false;
  for (let i = 0; i < 15; i++) {
    try {
      await provider.getBlockNumber();
      ready = true;
      break;
    } catch {
      await sleep(1000);
    }
  }

  if (!ready) {
    throw new Error("Failed to connect to Base Mainnet Anvil fork");
  }

  const blockNumber = await provider.getBlockNumber();
  console.log(`[Base Fork] Successfully connected! Forked Base Mainnet at Block #${blockNumber}\n`);
  return { proc, rpcUrl };
}

async function main() {
  console.log("================================================================================");
  console.log("  POA (Proof of Audits) — Live Base Mainnet Fork Restitution Execution");
  console.log("  Environment: Forked Base Mainnet (EVM Chain ID 8453 / Anvil)");
  console.log("================================================================================\n");

  const { proc, rpcUrl } = await startBaseMainnetFork();
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    const mnemonic = "test test test test test test test test test test test junk";
    const deployer = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0/0").connect(provider);
    const victim = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0/1").connect(provider);

    // Deploy contracts on Base Mainnet fork
    console.log("▶ Step 1: Deploying Verified Restitution Contracts on Base Fork...");
    const contractsDir = path.resolve(process.cwd(), "contracts/out");
    const distArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, "RestitutionDistributor.sol/RestitutionDistributor.json"), "utf8"));
    const erc20Artifact = JSON.parse(fs.readFileSync(path.join(contractsDir, "MockERC20.sol/MockERC20.json"), "utf8"));

    // Deploy payout token (USDC representation on fork)
    const usdcFactory = new ethers.ContractFactory(erc20Artifact.abi, erc20Artifact.bytecode.object, deployer);
    const usdc = await usdcFactory.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();

    // Deploy RestitutionDistributor
    const distFactory = new ethers.ContractFactory(distArtifact.abi, distArtifact.bytecode.object, deployer);
    const distributor = await distFactory.deploy();
    await distributor.waitForDeployment();
    const distAddress = await distributor.getAddress();

    console.log(`  ✓ Deployed RestitutionDistributor at: ${distAddress}`);
    console.log(`  ✓ Restitution Token (USDC) at: ${usdcAddress}`);

    // Fund the distributor with 50,000 USDC
    const fundAmount = 50000n * 10n ** 6n;
    await (await (usdc as any).mint(distAddress, fundAmount)).wait();
    console.log(`  ✓ Funded Distributor with 50,000.00 USDC on Base fork.\n`);

    // Step 2: Run Autonomous Investigator Agent on Base Fork
    console.log("▶ Step 2: Launching Autonomous Investigator Agent (Claude Haiku + Neatlogs)...");
    const investigator = new POAIncidentInvestigator(provider);
    const incidentId = ethers.keccak256(ethers.toUtf8Bytes("BASE_MAINNET_INCIDENT_01"));

    const simulatedLiquidations = [
      {
        txHash: "0xbase_incident_tx",
        blockNumber: 1,
        liquidator: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        borrower: victim.address,
        debtCovered: 3500n * 10n ** 6n,
        collateralSeized: 21n * 10n ** 17n, // 2.1 WETH
        oraclePriceUsed: 180000000000n
      }
    ];

    const knownBorrowers = [
      {
        account: victim.address,
        collateral: 3n * 10n ** 18n, // 3 WETH
        debt: 3500n * 10n ** 6n      // 3500 USDC
      }
    ];

    const report = await investigator.investigateOracleIncident({
      incidentId,
      incidentTxHash: "0xbase_oracle_manipulation_tx_001",
      oracleAddress: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // Base Chainlink ETH/USD
      poolAddress: "0x3333333333333333333333333333333333333333",
      distributorAddress: distAddress,
      collateralToken: "0x4200000000000000000000000000000000000006", // Base WETH
      debtToken: usdcAddress,
      baselinePrice: 200000000000n,
      simulatedLiquidations,
      knownBorrowers
    });

    console.log(`  ✓ Investigation Completed: ${report.summary}`);
    console.log(`  ✓ Verified Restitution Entitlement: ${(Number(report.totalRestitutionCalculatedUsdc) / 1e6).toFixed(2)} USDC`);
    console.log(`  ✓ Merkle Root: ${report.merkleManifest?.merkleRoot}\n`);

    // Step 3: Authorize and register incident on-chain
    console.log("▶ Step 3: Registering Incident Manifest on-chain in RestitutionDistributor...");
    const regTx = await (distributor as any).registerIncident(
      incidentId,
      report.merkleManifest!.merkleRoot,
      BigInt(report.totalRestitutionCalculatedUsdc),
      usdcAddress,
      "POA_RESTITUTION_POLICY_V1_EQUITY_DELTA"
    );
    await regTx.wait();
    console.log(`  ✓ Incident registered on Base fork with policy: POA_RESTITUTION_POLICY_V1_EQUITY_DELTA\n`);

    // Step 4: Execute real on-chain claim by Victim
    console.log("▶ Step 4: Victim Claims Restitution on Base Fork...");
    const claim = report.merkleManifest!.claims[0];
    const balBefore = await (usdc as any).balanceOf(victim.address);

    const claimTx = await (distributor.connect(victim) as any).claim(
      incidentId,
      claim.claimIndex,
      claim.claimant,
      claim.amount,
      claim.proof
    );
    await claimTx.wait();

    const balAfter = await (usdc as any).balanceOf(victim.address);
    console.log(`  ✓ Transaction confirmed on Base fork! Tx: ${claimTx.hash}`);
    console.log(`  ✓ Victim Balance: ${ethers.formatUnits(balBefore, 6)} -> ${ethers.formatUnits(balAfter, 6)} USDC (+${ethers.formatUnits(balAfter - balBefore, 6)} USDC)\n`);

    const currentBlockNumber = await provider.getBlockNumber();
    const baseEvidence = {
      network: "Base Mainnet Fork",
      chainId: 8453,
      forkBlockNumber: currentBlockNumber,
      timestamp: new Date().toISOString(),
      contracts: {
        distributor: distAddress,
        restitutionToken: usdcAddress,
        oracle: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
        collateralToken: "0x4200000000000000000000000000000000000006"
      },
      incident: {
        incidentId,
        baselineEthPriceUsd: 2000.0,
        faultyEthPriceUsd: 1800.0,
        dropPercent: "10.0%"
      },
      report,
      claims: report.merkleManifest!.claims,
      claimExecution: {
        txHash: claimTx.hash,
        victimAddress: victim.address,
        restitutionClaimedUsdc: ethers.formatUnits(balAfter - balBefore, 6),
        status: "CONFIRMED"
      }
    };
    fs.writeFileSync(
      path.resolve(process.cwd(), "evidence/base_fork_evidence.json"),
      JSON.stringify(baseEvidence, (key, value) => typeof value === "bigint" ? value.toString() : value, 2),
      "utf8"
    );
    console.log(`  ✓ Base Mainnet Fork evidence exported to: evidence/base_fork_evidence.json\n`);

    console.log("================================================================================");
    console.log("  BASE MAINNET FORK RUN SUCCESSFUL: 100% VERIFIED ON-CHAIN RESTITUTION");
    console.log("================================================================================");

  } finally {
    proc.kill();
  }
}

main().catch(err => {
  console.error("FATAL ERROR in Base fork execution:", err);
  process.exit(1);
});
