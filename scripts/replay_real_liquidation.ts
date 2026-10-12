import "dotenv/config";
import fs from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { ethers } from "ethers";
import { HISTORICAL_LIQUIDATION } from "../src/chain/aave-forensics.js";
import { assertReplayMatches } from "../src/chain/replay-validation.js";
import { neatlogs } from "../src/observability/neatlogs.js";
import { sourceFingerprint } from "./source_fingerprint.js";
const source = sourceFingerprint();
const rpc = new ethers.FetchRequest(process.env.BASE_RPC_URL || "https://mainnet.base.org"); rpc.timeout = 15000;
const remote = new ethers.JsonRpcProvider(rpc, 8453, {staticNetwork: true, batchMaxCount: 1});
const port = 8558;
const local = new ethers.JsonRpcProvider(`http://127.0.0.1:${port}`, 8453, {staticNetwork: true, batchMaxCount: 1, cacheTimeout: -1});
let child: ReturnType<typeof spawn> | undefined;
const stringify = (v: any) => JSON.stringify(v, (_, x) => typeof x === "bigint" ? x.toString() : x, 2);
try {
  const result = await neatlogs.runWorkflow("historicalAaveExecutionReplay", {provenance: "BASE_MAINNET", executionEnvironment: "LOCAL_ARCHIVE_FORK", transactionHash: HISTORICAL_LIQUIDATION}, async () => {
    const original = await remote.getTransactionReceipt(HISTORICAL_LIQUIDATION), tx = await remote.getTransaction(HISTORICAL_LIQUIDATION);
    if (!original || !tx || original.status !== 1 || original.index !== 1) throw new Error("This reproducible case requires its verified index-one receipt");
    const block = await remote.getBlock(original.blockNumber);
    if (!block || block.hash !== original.blockHash || block.transactions[1] !== HISTORICAL_LIQUIDATION) throw new Error("Mainnet block anchor mismatch");
    const prefixHash = block.transactions[0];
    const prefix = await remote.getTransaction(prefixHash);
    if (!prefix || prefix.to?.toLowerCase() !== "0x4200000000000000000000000000000000000015") throw new Error("Unexpected preceding transaction");
    const anvil = process.env.ANVIL_BIN || "anvil";
    const version = execFileSync(anvil, ["--version"], {encoding: "utf8"}).trim();
    child = spawn(anvil, ["--fork-url", process.env.BASE_RPC_URL || "https://mainnet.base.org", "--fork-transaction-hash", prefixHash, "--optimism", "--host", "127.0.0.1", "--port", String(port), "--no-mining", "--silent"], {stdio: "ignore"});
    let ready = false;
    for (let i = 0; i < 60; i++) { try { await local.send("eth_chainId", []); ready = true; break; } catch { await new Promise(r => setTimeout(r, 1000)); } }
    if (!ready) throw new Error("Local historical fork did not start");
    // All write RPC calls below target the loopback-only local node, never mainnet.
    await local.send("evm_setNextBlockTimestamp", [block.timestamp]);
    await local.send("anvil_setNextBlockBaseFeePerGas", [ethers.toQuantity(block.baseFeePerGas!)]);
    const pending = await local.getBlock("pending");
    if (pending?.number !== block.number || pending.timestamp !== block.timestamp) throw new Error("Fork execution timestamp or height differs from incident");
    const raw = ethers.Transaction.from({type: tx.type, chainId: tx.chainId, nonce: tx.nonce, to: tx.to, gasLimit: tx.gasLimit, gasPrice: tx.type === 0 ? tx.gasPrice : undefined, maxFeePerGas: tx.maxFeePerGas, maxPriorityFeePerGas: tx.maxPriorityFeePerGas, data: tx.data, value: tx.value, accessList: tx.accessList, signature: tx.signature});
    if (raw.hash !== original.hash) throw new Error("Signed transaction serialization mismatch");
    const poolAddress = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5", borrower = "0x09ad6981381610A5f58c56219f0FE939043f0A36";
    const pool = new ethers.Contract(poolAddress, ["function getUserAccountData(address) view returns(uint256,uint256,uint256,uint256,uint256,uint256)"], local);
    const oracle = new ethers.Contract("0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156", ["function getSourceOfAsset(address) view returns(address)", "function getAssetPrice(address) view returns(uint256)"], local);
    const weth = "0x4200000000000000000000000000000000000006", usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const at = {blockTag: "pending"};
    const [account, sourceAddress, usdcPrice, wethPrice] = await Promise.all([pool.getUserAccountData(borrower, at), oracle.getSourceOfAsset(weth, at), oracle.getAssetPrice(usdc, at), oracle.getAssetPrice(weth, at)]);
    const referenceArtifact = JSON.parse(fs.readFileSync("evidence/real_liquidation_model_verified.json", "utf8"));
    const reference = referenceArtifact.report.observations.READ_INDEPENDENT_PRICES;
    if (reference.blockNumber !== block.number - 1 || reference.blockHash !== block.parentHash) throw new Error("Reference prices refer to a different baseline");
    const scenarios = reference.samples.flatMap((s: any) => [...s.prices.map((p: any) => ({pool: s.pool, kind: "TWAP", ...p})), {pool: s.pool, kind: "SPOT", windowSeconds: 0, wethPriceMicroUsdc: s.spotPriceMicroUsdc}]);
    let snapshot = await local.send("evm_snapshot", []);
    const execute = async () => {
      const hash = await local.send("eth_sendRawTransaction", [raw.serialized]);
      await local.send("evm_mine", []);
      const receipt = await local.getTransactionReceipt(hash);
      if (!receipt) throw new Error("Local replay receipt unavailable");
      const executionBlock = await local.getBlock(receipt.blockNumber);
      if (receipt.blockNumber !== block.number || executionBlock?.timestamp !== block.timestamp) throw new Error("Scenario execution timestamp or height differs from incident");
      return receipt;
    };
    const replay = await neatlogs.traceSpan("reproduceOriginalTransaction", "TOOL", {transactionHash: original.hash}, execute);
    const verification = assertReplayMatches(original, replay);
    const results: any[] = [];
    for (const scenario of scenarios) {
      if (!await local.send("evm_revert", [snapshot])) throw new Error("Scenario reset failed");
      snapshot = await local.send("evm_snapshot", []);
      await local.send("evm_setNextBlockTimestamp", [block.timestamp]);
      await local.send("anvil_setNextBlockBaseFeePerGas", [ethers.toQuantity(block.baseFeePerGas!)]);
      // Return this scenario's ETH/USD price from the configured source only.
      // USD/USDC conversion preserves the actual historical USDC oracle price.
      const scenarioPrice = BigInt(scenario.wethPriceMicroUsdc) * usdcPrice / 1000000n;
      const returnRuntime = "0x7f" + ethers.toBeHex(scenarioPrice, 32).slice(2) + "60005260206000f3";
      await local.send("anvil_setCode", [sourceAddress, returnRuntime]);
      const health = await pool.getUserAccountData(borrower, at);
      const receipt = await neatlogs.traceSpan("executeReferencePriceScenario", "TOOL", {pool: scenario.pool, windowSeconds: scenario.windowSeconds, kind: scenario.kind, oraclePriceBaseUnits: String(scenarioPrice)}, execute);
      const liquidationTopic = ethers.id("LiquidationCall(address,address,address,uint256,uint256,address,bool)");
      const liquidationLogs = receipt.logs.filter(l => l.address.toLowerCase() === poolAddress.toLowerCase() && l.topics[0] === liquidationTopic);
      if (health[5] >= 10n ** 18n && liquidationLogs.length) throw new Error("Healthy scenario unexpectedly liquidated borrower");
      let revertEvidence: any = null;
      if (receipt.status === 0) {
        const trace = await local.send("debug_traceTransaction", [receipt.hash, {tracer: "callTracer"}]);
        const failures: any[] = [];
        const walk = (call: any) => { if (call.error && call.to?.toLowerCase() === poolAddress.toLowerCase()) failures.push({to: call.to, error: call.error, output: call.output}); for (const nested of call.calls || []) walk(nested); };
        walk(trace);
        const decodeReason = (output: string) => { try { return output?.startsWith("0x08c379a0") ? ethers.AbiCoder.defaultAbiCoder().decode(["string"], "0x" + output.slice(10))[0] : null; } catch { return null; } };
        revertEvidence = {topLevelError: trace.error, reason: decodeReason(trace.output), poolFailures: failures};
        if (!failures.length || !failures.some(f => decodeReason(f.output) === "45")) throw new Error("Healthy scenario did not prove Aave health-factor rejection");
      }
      results.push({...scenario, executionBlockNumber: receipt.blockNumber, executionTimestamp: block.timestamp, revertEvidence, healthFactorWad: String(health[5]), executionStatus: receipt.status === 1 ? "SUCCEEDED" : "REVERTED", liquidationEvents: liquidationLogs.length, gasUsed: String(receipt.gasUsed)});
    }
    const anchor = await remote.getBlock(block.number);
    if (anchor?.hash !== block.hash) throw new Error("Source block changed during replay");
    return {schemaVersion: 1, provenance: "LOCAL_REPLAY_OF_REAL_BASE_MAINNET_TRANSACTION", generatedAt: new Date().toISOString(), source, transactionHash: original.hash, sourceBlock: {number: block.number, hash: block.hash, parentHash: block.parentHash, timestamp: block.timestamp, transactionIndex: original.index}, precedingTransactionsReplayed: [prefixHash], toolVersion: version, originalVerification: verification, originalReceipt: original.toJSON(), replayReceipt: replay.toJSON(), exactTimestampPrestateAccount: Array.from(account, String), originalOraclePrice: {weth: String(wethPrice), usdc: String(usdcPrice), sourceAddress}, scenarios: results, referenceSource: referenceArtifact.source, verdict: "PRICE_SENSITIVITY_REPRODUCED_ORACLE_FAULT_NOT_PROVEN", compensationProposal: null, payoutAuthorized: false, limitations: ["Only the configured WETH price source return is replaced in local scenarios. This is a causal sensitivity test, not proof that a reference price is the correct historical oracle price.", "Reference prices are previous-block Uniswap spot/TWAP observations. Two fee tiers are one venue; TWAP lag and manipulation risk remain.", "Local receipt gas and all ordered emitted logs must match mainnet before any scenario result is accepted.", "Local block hashes and transaction indices differ. The archived L1 attributes prefix is replayed; full block state-root equivalence is not claimed."]};
  });
  if (sourceFingerprint().sha256 !== source.sha256) throw new Error("Source changed during replay; rerun with unchanged code");
  const artifact = {...result, observabilityTrace: neatlogs.getLatestTrace()};
  fs.writeFileSync("evidence/real_execution_replay.json", stringify(artifact));
  fs.mkdirSync("public/evidence", {recursive: true});
  fs.writeFileSync("public/evidence/real-execution-replay.json", stringify(result));
  console.log(stringify({verified: result.originalVerification, scenarios: result.scenarios, verdict: result.verdict}));
} catch (e) { console.error(e instanceof Error ? e.message : "Historical replay failed"); process.exitCode = 1; }
finally { child?.kill("SIGTERM"); local.destroy(); remote.destroy(); }
