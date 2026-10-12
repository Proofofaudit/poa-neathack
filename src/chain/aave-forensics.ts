import { ethers } from "ethers";
import savedReplayArtifact from "../../public/evidence/real-execution-replay.json";
import { assertReplayMatches } from "./replay-validation";
import { readCoinbaseReference } from "./coinbase-reference";
import { AAVE_BASE_POOL, decodeAaveLiquidations } from "./live-inspection";

export const HISTORICAL_LIQUIDATION = "0xf52b76fdd031a03ffbc903a397897af04ea7b6d293a5e79cefa640e02e12ca21";
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
const AP = "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D";
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const serialize = (value: any): any => JSON.parse(JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v));

/** Prices are WETH quoted in USDC, not a claim that USDC equals one USD. */
export function sqrtPriceMicroUsdc(sqrtPriceX96: bigint): bigint {
  if (sqrtPriceX96 <= 0n) throw new Error("Invalid sqrt price");
  return sqrtPriceX96 * sqrtPriceX96 * 10n ** 18n / (1n << 192n);
}
export function tickPriceMicroUsdc(cumulativeStart: bigint, cumulativeEnd: bigint, seconds: number): bigint {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error("Invalid TWAP window");
  let tick = (cumulativeEnd - cumulativeStart) / BigInt(seconds);
  if ((cumulativeEnd - cumulativeStart) < 0n && (cumulativeEnd - cumulativeStart) % BigInt(seconds)) tick--;
  if (tick < -887272n || tick > 887272n) throw new Error("Unsupported tick");
  // Q192 exponentiation avoids floating-point valuation; all divisions round down.
  const q = 1n << 192n;
  let factor = tick < 0n ? q * 10000n / 10001n : q * 10001n / 10000n;
  let power = tick < 0n ? -tick : tick;
  let ratio = q;
  while (power > 0n) {
    if (power & 1n) ratio = ratio * factor / q;
    factor = factor * factor / q;
    power >>= 1n;
  }
  const price = ratio * 10n ** 18n / q;
  if (price <= 0n) throw new Error("Unsupported tick price");
  return price;
}
export function referenceHealth(collateralMicroUsdc: bigint, debtWei: bigint, thresholdBps: bigint, priceMicroUsdc: bigint): bigint {
  if (collateralMicroUsdc < 0n || debtWei <= 0n || thresholdBps < 0n || thresholdBps > 10000n || priceMicroUsdc <= 0n) throw new Error("Invalid position valuation");
  return collateralMicroUsdc * thresholdBps * 10n ** 36n / (10000n * debtWei * priceMicroUsdc);
}
export function netLiquidationCost(collateralRemovedMicroUsdc: bigint, debtRepaidWei: bigint, priceMicroUsdc: bigint): bigint {
  if (collateralRemovedMicroUsdc < 0n || debtRepaidWei < 0n || priceMicroUsdc <= 0n) throw new Error("Invalid liquidation amounts");
  return collateralRemovedMicroUsdc - debtRepaidWei * priceMicroUsdc / 10n ** 18n;
}

export class AaveForensics {
  position: any;
  reference: any;
  replay: any;
  constructor(private provider: ethers.Provider) {}
  async discover() {
    const latest = await this.provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - 199), toBlock = Math.max(0, latest - 5);
    let transactionHash = HISTORICAL_LIQUIDATION;
    let selection = "CURATED_HISTORICAL_CANDIDATE_REVALIDATED";
    let scan: any;
    try {
      const logs = await this.provider.getLogs({ address: AAVE_BASE_POOL, topics: [ethers.id("LiquidationCall(address,address,address,uint256,uint256,address,bool)"), ethers.zeroPadValue(USDC, 32), ethers.zeroPadValue(WETH, 32)], fromBlock, toBlock });
      scan = { fromBlock, toBlock, status: "READ", matchingEvents: logs.length };
      if (logs.length) { transactionHash = logs[logs.length - 1].transactionHash; selection = "RECENT_SUPPORTED_LIQUIDATION"; }
    } catch { scan = { fromBlock, toBlock, status: "UNAVAILABLE", reason: "Provider log query failed; no absence of events inferred" }; }
    const receipt = await this.provider.getTransactionReceipt(transactionHash);
    if (!receipt || receipt.status !== 1 || !decodeAaveLiquidations(receipt.logs).length) throw new Error("Selected candidate does not verify");
    return { transactionHash: receipt.hash, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash, selection, scan, discoveredFrom: `https://basescan.org/tx/${receipt.hash}`, rationale: "Successful liquidation with USDC collateral and WETH debt; permits independent exchange-price comparison.", coverage: "A bounded recent scan, then an explicitly labelled historical candidate if no usable recent event is returned. Not an exhaustive market search or a known oracle exploit." };
  }

  async reconstruct(hash: string) {
    const receipt = await this.provider.getTransactionReceipt(hash);
    if (!receipt || receipt.status !== 1) throw new Error("Successful receipt required");
    const events = decodeAaveLiquidations(receipt.logs);
    if (events.length !== 1) throw new Error("Detailed reconstruction currently requires exactly one supported liquidation");
    const event = events[0];
    const height = receipt.blockNumber;
    const at = { blockTag: height - 1 };
    const [beforeBlock, incidentBlock] = await Promise.all([this.provider.getBlock(height - 1), this.provider.getBlock(height, true)]);
    if (!beforeBlock?.hash || !incidentBlock?.hash || incidentBlock.hash !== receipt.blockHash || incidentBlock.parentHash !== beforeBlock.hash) throw new Error("Historical block mismatch");
    const addresses = new ethers.Contract(AP, ["function getPoolDataProvider() view returns(address)", "function getPool() view returns(address)", "function getPriceOracle() view returns(address)"], this.provider);
    const [dataProvider, oracleAddress, registeredPool] = await Promise.all([addresses.getPoolDataProvider(at), addresses.getPriceOracle(at), addresses.getPool(at)]);
    if (!same(registeredPool, AAVE_BASE_POOL)) throw new Error("Historical pool identity mismatch");
    const pool = new ethers.Contract(AAVE_BASE_POOL, ["function getReservesList() view returns(address[])", "function getUserEMode(address) view returns(uint256)", "function getUserAccountData(address) view returns(uint256,uint256,uint256,uint256,uint256,uint256)"], this.provider);
    const data = new ethers.Contract(dataProvider, ["function ADDRESSES_PROVIDER() view returns(address)", "function getUserReserveData(address,address) view returns(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint40,bool)", "function getReserveConfigurationData(address) view returns(uint256,uint256,uint256,uint256,uint256,bool,bool,bool,bool,bool)", "function getLiquidationProtocolFee(address) view returns(uint256)", "function getReserveTokensAddresses(address) view returns(address,address,address)"], this.provider);
    if (!same(await data.ADDRESSES_PROVIDER(at), AP)) throw new Error("Historical data provider identity mismatch");
    const oracle = new ethers.Contract(oracleAddress, ["function getAssetPrice(address) view returns(uint256)", "function BASE_CURRENCY_UNIT() view returns(uint256)"], this.provider);
    const [reserves, eMode, account, baseCurrencyUnit] = await Promise.all([pool.getReservesList(at), pool.getUserEMode(event.borrower, at), pool.getUserAccountData(event.borrower, at), oracle.BASE_CURRENCY_UNIT(at)]);
    if (reserves.length > 32) throw new Error("Reserve read budget exceeded");
    const positions: any[] = [];
    // Read all reserves so unobserved debt/collateral cannot silently disappear.
    for (const asset of reserves) {
      const user = await data.getUserReserveData(asset, event.borrower, at);
      if (user[0] === 0n && user[1] === 0n && user[2] === 0n) continue;
      const [config, tokens, price, endPrice, protocolFee] = await Promise.all([data.getReserveConfigurationData(asset, at), data.getReserveTokensAddresses(asset, at), oracle.getAssetPrice(asset, at), oracle.getAssetPrice(asset, { blockTag: height }), data.getLiquidationProtocolFee(asset, at)]);
      positions.push({ asset, aToken: tokens[0], stableDebtToken: tokens[1], variableDebtToken: tokens[2], suppliedBaseUnits: String(user[0]), stableDebtBaseUnits: String(user[1]), variableDebtBaseUnits: String(user[2]), scaledVariableDebt: String(user[4]), collateralEnabled: user[8], decimals: Number(config[0]), liquidationThresholdBps: String(config[2]), liquidationBonusBps: String(config[3]), liquidationProtocolFeeBps: String(protocolFee), oraclePriceBefore: String(price), oraclePriceEndBlock: String(endPrice) });
    }
    let aggregateReconciliation: any = { status: "NOT_CHECKED_EMODE" };
    if (eMode === 0n) {
      let collateralBase = 0n, debtBase = 0n;
      for (const reserve of positions) {
        if (reserve.decimals < 0 || reserve.decimals > 36 || BigInt(reserve.oraclePriceBefore) <= 0n) throw new Error("Invalid reserve denomination");
        const unit = 10n ** BigInt(reserve.decimals), price = BigInt(reserve.oraclePriceBefore);
        if (reserve.collateralEnabled && BigInt(reserve.liquidationThresholdBps) > 0n) collateralBase += BigInt(reserve.suppliedBaseUnits) * price / unit;
        debtBase += (BigInt(reserve.variableDebtBaseUnits) + BigInt(reserve.stableDebtBaseUnits)) * price / unit;
      }
      const abs = (v: bigint) => v < 0n ? -v : v;
      const tolerance = BigInt(reserves.length * 2);
      if (abs(collateralBase - account[0]) > tolerance || abs(debtBase - account[1]) > tolerance) throw new Error("Reserve balances do not reconcile with protocol aggregates");
      aggregateReconciliation = { status: "MATCHED_WITH_ROUNDING_TOLERANCE", computedCollateralBase: String(collateralBase), computedDebtBase: String(debtBase), toleranceBaseUnits: String(tolerance) };
    }
    const preceding: any[] = [];
    if (receipt.index > 16) throw new Error("Earlier transaction verification exceeds read budget");
    for (const txHash of incidentBlock.transactions.slice(0, receipt.index)) {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) throw new Error("Earlier transaction unavailable");
      preceding.push({ hash: tx.hash, to: tx.to, selector: tx.data.slice(0, 10) });
    }
    const collateralReserve = positions.find((r: any) => same(r.asset, event.collateralAsset));
    let treasuryTransferBaseUnits: string | null = null;
    let treasuryAddress: string | null = null;
    if (collateralReserve) {
      const aToken = new ethers.Contract(collateralReserve.aToken, ["function RESERVE_TREASURY_ADDRESS() view returns(address)"], this.provider);
      treasuryAddress = String(await aToken.RESERVE_TREASURY_ADDRESS(at));
      const transfers = new ethers.Interface(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
      let total = 0n;
      for (const log of receipt.logs.filter(l => same(l.address, collateralReserve.aToken))) {
        try { const decoded = transfers.parseLog(log); if (decoded && same(decoded.args.from, event.borrower) && same(decoded.args.to, treasuryAddress)) total += BigInt(decoded.args.value); } catch {}
      }
      treasuryTransferBaseUnits = total.toString();
    }
    const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const implementationWord = await this.provider.getStorage(AAVE_BASE_POOL, implementationSlot, height - 1);
    const implementation = ethers.getAddress(`0x${implementationWord.slice(-40)}`);
    const implementationCode = await this.provider.getCode(implementation, height - 1);
    const earlierOnlyL1Attributes = preceding.every(tx => same(tx.to || ethers.ZeroAddress, "0x4200000000000000000000000000000000000015") && tx.selector === "0x015d8eb9");
    this.position = serialize({ transactionHash: hash, borrower: event.borrower, liquidation: event, baselineBlock: height - 1, baselineBlockHash: beforeBlock.hash, baselineTimestamp: beforeBlock.timestamp, incidentBlock: height, incidentBlockHash: incidentBlock.hash, incidentTimestamp: incidentBlock.timestamp, transactionIndex: receipt.index, treasuryAddress, treasuryTransferBaseUnits, precedingTransactions: preceding, earlierOnlyL1Attributes, dataProvider, oracleAddress, baseCurrencyUnit, implementation, implementationCodeHash: ethers.keccak256(implementationCode), aggregateReconciliation, eMode: String(eMode), account: { collateralBase: String(account[0]), debtBase: String(account[1]), liquidationThresholdBps: String(account[3]), healthFactorWad: String(account[5]) }, positions, reconstruction: "ARCHIVE_PREVIOUS_BLOCK_ALL_RESERVES", caveats: ["Previous-block balances include accrued interest to that block, not an exact transaction prestate.", "Earlier transaction destinations and selectors are checked; internal execution is not replayed.", "Historical implementation code hash is recorded; implementation source equivalence is not attested."] });
    return this.position;
  }
  async readIndependent() {
    if (!this.position) throw new Error("Reconstruct first");
    const at = { blockTag: this.position.baselineBlock };
    const factory = new ethers.Contract(FACTORY, ["function getPool(address,address,uint24) view returns(address)"], this.provider);
    const samples: any[] = [];
    const failures: any[] = [];
    for (const fee of [500, 3000]) {
      try {
        const address = await factory.getPool(WETH, USDC, fee, at);
        if (address === ethers.ZeroAddress) throw new Error("Pool absent");
        const dex = new ethers.Contract(address, ["function factory() view returns(address)", "function token0() view returns(address)", "function token1() view returns(address)", "function liquidity() view returns(uint128)", "function observe(uint32[]) view returns(int56[],uint160[])", "function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)"], this.provider);
        const [registeredFactory, token0, token1, liquidity, observations, spot] = await Promise.all([dex.factory(at), dex.token0(at), dex.token1(at), dex.liquidity(at), dex.observe([1800, 300, 0], at), dex.slot0(at)]);
        if (!same(registeredFactory, FACTORY) || !same(token0, WETH) || !same(token1, USDC) || liquidity <= 0n) throw new Error("DEX identity or liquidity invalid");
        const c = observations[0];
        samples.push({ pool: address, fee, token0, token1, liquidity: String(liquidity), tickCumulatives: Array.from(c, String), sqrtPriceX96: String(spot[0]), spotPriceMicroUsdc: String(sqrtPriceMicroUsdc(spot[0])), prices: [1800, 300].map((window, i) => ({ windowSeconds: window, wethPriceMicroUsdc: String(tickPriceMicroUsdc(c[i], c[2], window)) })) });
      } catch { failures.push({ fee, reason: "Historical DEX observation unavailable; no substitute price" }); }
    }
    const externalVenue = await readCoinbaseReference(this.position.incidentTimestamp);
    this.reference = { externalVenue, blockNumber: this.position.baselineBlock, blockHash: this.position.baselineBlockHash, factory: FACTORY, samples, failures, denomination: "micro-USDC per WETH; USDC/USD parity not assumed", independentOfAaveOracle: true, caveats: ["Two fee tiers of one exchange are not fully independent venues.", "TWAPs lag fast markets and can be manipulated. Active liquidity is recorded, not a depth or manipulation-resistance audit.", "Prices are indicative tick-derived values, rounded down to micro-USDC, not settlement quotes."] };
    return this.reference;
  }
  async readExecutionReplay(hash: string) {
    const saved: any = savedReplayArtifact;
    if (saved.transactionHash !== hash) return {status: "UNAVAILABLE", reason: "No saved execution replay for this transaction. No alternate incident substituted."};
    const receipt = await this.provider.getTransactionReceipt(hash);
    if (!receipt || receipt.blockHash !== saved.sourceBlock.hash || receipt.blockNumber !== saved.sourceBlock.number || receipt.index !== saved.sourceBlock.transactionIndex || !saved.originalReceipt || !saved.replayReceipt) throw new Error("Saved replay source receipt does not verify");
    assertReplayMatches(receipt, saved.originalReceipt);
    assertReplayMatches(receipt, saved.replayReceipt);
    const {originalReceipt: _original, replayReceipt: _local, ...summary} = saved;
    this.replay = {status: "VERIFIED_SAVED_REPLAY", executionMode: "PREVIOUSLY_EXECUTED_LOCAL_ARCHIVE_FORK", verifiedAgainstMainnetAt: new Date().toISOString(), ...summary, evidenceUrl: "/evidence/real-execution-replay.json"};
    return this.replay;
  }
  assess() {
    if (!this.position || !this.reference) throw new Error("Position and reference evidence required");
    const p = this.position, e = p.liquidation;
    const collateral = p.positions.find((r: any) => same(r.asset, USDC));
    const debt = p.positions.find((r: any) => same(r.asset, WETH));
    const supported = p.eMode === "0" && p.positions.length === 2 && collateral && debt && collateral.collateralEnabled && BigInt(collateral.stableDebtBaseUnits) === 0n && BigInt(collateral.variableDebtBaseUnits) === 0n && BigInt(debt.suppliedBaseUnits) === 0n && BigInt(debt.stableDebtBaseUnits) === 0n && same(e.collateralAsset, USDC) && same(e.debtAsset, WETH) && collateral.decimals === 6 && debt.decimals === 18;
    const prices = this.reference.samples.flatMap((s: any) => s.prices.map((v: any) => ({ pool: s.pool, ...v })));
    const scenarios = supported ? prices.map((v: any) => ({ ...v, healthFactorWad: String(referenceHealth(BigInt(collateral.suppliedBaseUnits), BigInt(debt.variableDebtBaseUnits), BigInt(collateral.liquidationThresholdBps), BigInt(v.wethPriceMicroUsdc))), netLiquidationCostMicroUsdc: String(netLiquidationCost((BigInt(e.collateralLiquidatedBaseUnits) + BigInt(p.treasuryTransferBaseUnits || "0")), BigInt(e.debtCoveredBaseUnits), BigInt(v.wethPriceMicroUsdc))) })) : [];
    const allBelow = scenarios.length >= 4 && scenarios.every((s: any) => BigInt(s.healthFactorWad) < 10n ** 18n);
    const mixed = scenarios.some((s: any) => BigInt(s.healthFactorWad) >= 10n ** 18n) && scenarios.some((s: any) => BigInt(s.healthFactorWad) < 10n ** 18n);
    const allAbove = scenarios.length >= 4 && scenarios.every((s: any) => BigInt(s.healthFactorWad) >= 10n ** 18n);
    const oracleStable = p.positions.every((r: any) => r.oraclePriceBefore === r.oraclePriceEndBlock);
    const oracleRatio = supported && BigInt(collateral.oraclePriceBefore) > 0n ? BigInt(debt.oraclePriceBefore) * 1000000n / BigInt(collateral.oraclePriceBefore) : null;
    const spotReplays = this.replay?.scenarios.filter((v: any) => v.kind === "SPOT") || [];
    const persistsAtSpot = supported && this.replay?.status === "VERIFIED_SAVED_REPLAY" && spotReplays.length === 2 && spotReplays.every((v: any) => v.executionStatus === "SUCCEEDED" && v.liquidationEvents === 1 && BigInt(v.healthFactorWad) < 10n ** 18n);
    const assessment = { decision: allBelow && p.earlierOnlyL1Attributes && oracleStable ? "NO_COMPENSATION_JUSTIFIED_BY_EVIDENCE" : "INSUFFICIENT_EVIDENCE", oracleFault: "NOT_ESTABLISHED", avoidability: allBelow ? "NOT_AVOIDABLE_UNDER_SAMPLED_REFERENCE_SCENARIOS_AT_BASELINE" : allAbove ? "AVOIDABLE_UNDER_SAMPLED_REFERENCE_SCENARIOS_AT_BASELINE_ONLY" : "UNRESOLVED", compensationProposal: null, payoutAuthorized: false, eligibleCompensationMicroUsdc: null, oracleWethPriceMicroUsdc: oracleRatio?.toString() || null, supportedValuation: Boolean(supported), treasuryCollateralFeeBaseUnits: p.treasuryTransferBaseUnits, totalCollateralRemovedBaseUnits: String(BigInt(e.collateralLiquidatedBaseUnits) + BigInt(p.treasuryTransferBaseUnits || "0")), scenarios, referenceSensitivity: mixed ? "WINDOW_AND_POOL_SENSITIVE" : allAbove ? "HEALTHY_UNDER_ALL_SAMPLED_TWAPS" : allBelow ? "UNHEALTHY_UNDER_ALL_SAMPLED_TWAPS" : "UNAVAILABLE", reason: mixed ? "The baseline health factor crosses 1 depending on the exchange pool and TWAP window. This is a price-sensitive case, not a proven oracle fault: TWAP lag, market movement and exact transaction state must be resolved. No compensation proposal is justified by this evidence." : allBelow ? "The borrower is below the liquidation threshold under all sampled independent exchange TWAPs, even before further debt interest accrues. Replacing Aave prices with these references does not restore health. Observed liquidation cost therefore does not establish compensation entitlement." : allAbove ? "Reference TWAPs restore baseline health, so this is a price-sensitive liquidation worth reviewing. TWAP lag or market movement can explain differences; oracle fault and exact transaction-level avoidability are not proven. Compensation remains unjustified pending those proofs." : "Available state or independent price coverage cannot establish whether correcting an oracle fault would avoid liquidation. Do not infer a normal liquidation or zero economic loss.", lossDefinition: "Collateral transferred to the liquidator plus receipt-verified aToken transfers to the reserve treasury, valued in USDC, minus WETH debt discharged at each reference price. This is an observed transfer-cost estimate; it excludes borrower gas, execution slippage and later price changes. It is not oracle-attributable damage.", limits: [...p.caveats, ...this.reference.caveats, "No transaction-level fork replay, verified fault incident, or treasury authorization. A compensation proposal requires those additional proofs."] };
    if (this.replay) {
      Object.assign(assessment, {executionReplay: {status: this.replay.status, executionMode: this.replay.executionMode, originalVerification: this.replay.originalVerification, scenarios: this.replay.scenarios}});
      assessment.limits = [...p.caveats.filter((v: string) => !v.startsWith("Previous-block") && !v.startsWith("Earlier transaction")), ...this.reference.caveats, ...this.replay.limitations, "Independent reference correctness and a verified oracle fault remain necessary before proposing compensation."];
      if (persistsAtSpot) Object.assign(assessment, {decision: "NO_COMPENSATION_JUSTIFIED_BY_EVIDENCE", avoidability: "LIQUIDATION_PERSISTS_AT_BOTH_SPOT_REFERENCES", reason: "The saved historical execution reproduces mainnet gas and all 25 logs. Replaying with either independently observed Uniswap spot price still liquidates the borrower. Some lagging TWAP scenarios prevent liquidation, but this does not establish oracle failure. Oracle-caused damage and compensation entitlement are not proven."});
    }
    return assessment;
  }
}
