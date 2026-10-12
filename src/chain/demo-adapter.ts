import { ethers } from "ethers";
import {
  BorrowerPosition,
  LiquidationEventRecord,
} from "../economics/counterfactual.js";
import { rpcRead } from "./rpc.js";
import { collectHistoricalLogs, RecoveryAction } from "./historical-logs.js";

export interface InvestigationParams {
  incidentId: string;
  incidentTxHash: string;
  oracleAddress: string;
  poolAddress: string;
  distributorAddress: string;
  collateralToken: string;
  debtToken: string;
  referenceOracleAddress?: string;
  protocol?: "DEMO_LENDING_V1";
  toBlock?: number;
  deploymentBlockNumber?: number;
  // Old callers cannot silently bypass chain reads with fixtures.
  baselinePrice?: bigint;
  simulatedLiquidations?: LiquidationEventRecord[];
  knownBorrowers?: Array<{ account: string; collateral: bigint; debt: bigint }>;
}
export interface ChainEvidence {
  chainId: number;
  baselineBlockNumber: number;
  incidentBlockNumber: number;
  toBlock: number;
  baselineBlockHash: string;
  incidentBlockHash: string;
  endBlockHash: string;
  baselinePrice: bigint;
  faultyPrice: bigint;
  referencePrice: bigint;
  referenceSource: string;
  referenceCorroboratesBaseline: boolean;
  liquidationThresholdBps: bigint;
  collateralDecimals: number;
  debtDecimals: number;
  borrowers: BorrowerPosition[];
  liquidations: LiquidationEventRecord[];
  provenance: "SIMULATED_PROTOCOL_ON_EVM";
}
export interface EvidenceAdapter {
  collect(
    params: InvestigationParams,
    onRetry: () => void,
    beforeLogs?: (from: number, to: number) => void,
    onRecovery?: (action: RecoveryAction) => void,
  ): Promise<ChainEvidence>;
}
const POOL_ABI = [
  "function collateralToken() view returns(address)",
  "function debtToken() view returns(address)",
  "function oracle() view returns(address)",
  "function LIQUIDATION_THRESHOLD_BPS() view returns(uint256)",
  "function userCollateral(address) view returns(uint256)",
  "function userDebt(address) view returns(uint256)",
  "event Deposit(address indexed user,uint256 amount)",
  "event Borrow(address indexed user,uint256 amount)",
  "event Repay(address indexed user,uint256 amount)",
  "event LiquidationCall(address indexed liquidator,address indexed user,uint256 debtToCover,uint256 collateralSeized,uint256 oraclePriceUsed)",
];
const ORACLE_ABI = [
  "function getAssetPrice(address) view returns(uint256 price,uint256 timestamp,string configTag)",
  "event PriceUpdated(address indexed asset,uint256 price,uint256 timestamp,string configTag)",
];
const equal = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export class DemoLendingAdapter implements EvidenceAdapter {
  constructor(private provider: ethers.Provider) {}
  async collect(
    p: InvestigationParams,
    onRetry: () => void,
    beforeLogs?: (from: number, to: number) => void,
    onRecovery?: (action: RecoveryAction) => void,
  ): Promise<ChainEvidence> {
    if (p.protocol !== "DEMO_LENDING_V1")
      throw new Error(
        "Unsupported protocol. Only the explicit DemoLendingPool v1 adapter can authorize this prototype's manifests.",
      );
    if (p.simulatedLiquidations || p.knownBorrowers)
      throw new Error(
        "Fixture overrides are not accepted; evidence must be read from chain.",
      );
    if (
      !p.referenceOracleAddress ||
      equal(p.referenceOracleAddress, p.oracleAddress)
    )
      throw new Error("A separate reference oracle is required.");
    for (const address of [
      p.oracleAddress,
      p.poolAddress,
      p.distributorAddress,
      p.collateralToken,
      p.debtToken,
      p.referenceOracleAddress,
    ]) {
      if (!ethers.isAddress(address))
        throw new Error("Invalid contract address");
    }
    const read = <T>(op: () => Promise<T>) => rpcRead(op, { onRetry });
    const query = <T>(
      fn: (from: number, to: number) => Promise<T[]>,
      from: number,
      to: number,
    ) =>
      collectHistoricalLogs(fn, from, to, (action) => {
        if (action.action === "RETRY_RPC") onRetry();
        onRecovery?.(action);
      });
    const receipt = await read(() =>
      this.provider.getTransactionReceipt(p.incidentTxHash),
    );
    if (
      !receipt ||
      receipt.status !== 1 ||
      !receipt.to ||
      !equal(receipt.to, p.oracleAddress) ||
      receipt.blockNumber < 1
    )
      throw new Error(
        "Incident must be a successful oracle transaction with an available receipt.",
      );
    const incidentBlock = receipt.blockNumber,
      baselineBlock = incidentBlock - 1;
    const head = await read(() => this.provider.getBlockNumber());
    const end = p.toBlock ?? head;
    if (
      !Number.isSafeInteger(end) ||
      end < incidentBlock ||
      end > head ||
      end - incidentBlock > 200
    )
      throw new Error(
        "Incident window must be available on this node and bounded to 200 blocks.",
      );
    const [baselineHeader, incidentHeader, endHeader, network] =
      await Promise.all([
        read(() => this.provider.getBlock(baselineBlock)),
        read(() => this.provider.getBlock(incidentBlock)),
        read(() => this.provider.getBlock(end)),
        read(() => this.provider.getNetwork()),
      ]);
    if (
      !baselineHeader?.hash ||
      !incidentHeader?.hash ||
      !endHeader?.hash ||
      receipt.blockHash !== incidentHeader.hash
    )
      throw new Error("Missing or inconsistent block headers");
    const pool = new ethers.Contract(p.poolAddress, POOL_ABI, this.provider);
    const oracle = new ethers.Contract(
      p.oracleAddress,
      ORACLE_ABI,
      this.provider,
    );
    const reference = new ethers.Contract(
      p.referenceOracleAddress,
      ORACLE_ABI,
      this.provider,
    );
    const at = { blockTag: baselineBlock };
    const [
      collateral,
      debt,
      poolOracle,
      threshold,
      base,
      fault,
      refBefore,
      refAfter,
      colDec,
      debtDec,
    ] = await Promise.all([
      read(() => pool.collateralToken(at)),
      read(() => pool.debtToken(at)),
      read(() => pool.oracle(at)),
      read(() => pool.LIQUIDATION_THRESHOLD_BPS(at)),
      read(() => oracle.getAssetPrice(p.collateralToken, at)),
      read(() =>
        oracle.getAssetPrice(p.collateralToken, { blockTag: incidentBlock }),
      ),
      read(() => reference.getAssetPrice(p.collateralToken, at)),
      read(() => reference.getAssetPrice(p.collateralToken, { blockTag: end })),
      read(() =>
        new ethers.Contract(
          p.collateralToken,
          ["function decimals() view returns(uint8)"],
          this.provider,
        ).decimals(at),
      ),
      read(() =>
        new ethers.Contract(
          p.debtToken,
          ["function decimals() view returns(uint8)"],
          this.provider,
        ).decimals(at),
      ),
    ]);
    if (
      !equal(collateral, p.collateralToken) ||
      !equal(debt, p.debtToken) ||
      !equal(poolOracle, p.oracleAddress)
    )
      throw new Error(
        "Pool configuration does not match incident assets/oracle",
      );
    // DemoLendingPool's on-chain arithmetic itself is fixed to these decimals and a $1 debt asset.
    if (
      Number(colDec) !== 18 ||
      Number(debtDec) !== 6 ||
      BigInt(threshold) !== 8000n
    )
      throw new Error("Unsupported demo asset configuration");
    const baselinePrice = BigInt(base[0]),
      faultyPrice = BigInt(fault[0]),
      referencePrice = BigInt(refAfter[0]);
    if (
      [baselinePrice, faultyPrice, referencePrice, BigInt(refBefore[0])].some(
        (x) => x <= 0n,
      )
    )
      throw new Error("Invalid oracle price");
    if (p.baselinePrice !== undefined && p.baselinePrice !== baselinePrice)
      throw new Error("Supplied baseline disagrees with historical state");
    for (const [point, header] of [
      [refBefore, baselineHeader],
      [refAfter, endHeader],
    ] as const) {
      const timestamp = Number(point[1]);
      if (
        timestamp <= 0 ||
        timestamp > header.timestamp ||
        header.timestamp - timestamp > 3600
      )
        throw new Error("Reference feed is stale or invalid");
    }
    const changes = await query(
      (from, to) =>
        oracle.queryFilter(
          oracle.filters.PriceUpdated(p.collateralToken),
          from,
          to,
        ),
      incidentBlock,
      end,
    );
    if (changes.length !== 1 || changes[0].transactionHash !== p.incidentTxHash)
      throw new Error(
        "Window contains extra oracle updates; split the incident before replay",
      );
    const change = oracle.interface.parseLog(changes[0]);
    if (BigInt(change!.args.price) !== faultyPrice)
      throw new Error("Incident log disagrees with historical oracle state");
    const logs = await query(
      async (from, to) => {
        beforeLogs?.(from, to);
        return pool.queryFilter(pool.filters.LiquidationCall(), from, to);
      },
      incidentBlock,
      end,
    );
    const activity = await query(
      (from, to) =>
        this.provider.getLogs({
          address: p.poolAddress,
          fromBlock: from,
          toBlock: to,
          topics: [
            [
              ethers.id("Deposit(address,uint256)"),
              ethers.id("Borrow(address,uint256)"),
              ethers.id("Repay(address,uint256)"),
              ethers.id("OracleUpdated(address,address)"),
            ],
          ],
        }),
      incidentBlock,
      end,
    );
    if (activity.length)
      throw new Error(
        "Position-changing activity within incident window requires a transaction-level adapter",
      );
    const liquidations: LiquidationEventRecord[] = logs
      .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index)
      .map((log) => {
        const args = pool.interface.parseLog(log)!.args;
        return {
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.index,
          liquidator: args.liquidator,
          borrower: args.user,
          debtCovered: BigInt(args.debtToCover),
          collateralSeized: BigInt(args.collateralSeized),
          oraclePriceUsed: BigInt(args.oraclePriceUsed),
        };
      });
    const first = p.deploymentBlockNumber ?? Math.max(0, baselineBlock - 128);
    if (
      !Number.isSafeInteger(first) ||
      first < 0 ||
      first > baselineBlock ||
      baselineBlock - first > 1000
    )
      throw new Error(
        "Borrower discovery range must be bounded to 1000 blocks",
      );
    const deposits = await query(
      (from, to) => pool.queryFilter(pool.filters.Deposit(), from, to),
      first,
      baselineBlock,
    );
    const accounts = [
      ...new Set(
        [
          ...deposits.map((log) =>
            String(pool.interface.parseLog(log)!.args.user),
          ),
          ...liquidations.map((l) => l.borrower),
        ].map((a) => a.toLowerCase()),
      ),
    ];
    if (accounts.length > 100)
      throw new Error("Prototype incident exceeds 100-account limit");
    const borrowers: BorrowerPosition[] = [];
    for (const account of accounts) {
      const [col, dbt, afterCol, afterDebt] = await Promise.all([
        read(() => pool.userCollateral(account, at)),
        read(() => pool.userDebt(account, at)),
        read(() => pool.userCollateral(account, { blockTag: end })),
        read(() => pool.userDebt(account, { blockTag: end })),
      ]);
      const events = liquidations.filter((l) => equal(l.borrower, account));
      if (
        BigInt(col) - events.reduce((s, e) => s + e.collateralSeized, 0n) !==
          BigInt(afterCol) ||
        BigInt(dbt) - events.reduce((s, e) => s + e.debtCovered, 0n) !==
          BigInt(afterDebt)
      )
        throw new Error(
          "Reconstructed balances do not match observed end state",
        );
      borrowers.push({
        account,
        collateralBase: BigInt(col),
        debtBase: BigInt(dbt),
      });
    }
    // Recheck the anchor after collection to reject a reorganization during reads.
    const anchor = await read(() => this.provider.getBlock(end));
    if (anchor?.hash !== endHeader.hash)
      throw new Error(
        "Chain reorganized during evidence collection; retry on a stable window",
      );
    const referenceChanges = await query(
      (from, to) =>
        reference.queryFilter(
          reference.filters.PriceUpdated(p.collateralToken),
          from,
          to,
        ),
      incidentBlock,
      end,
    );
    const close = (a: bigint, b: bigint) =>
      (a > b ? a - b : b - a) * 10000n <= b * 100n;
    return {
      chainId: Number(network.chainId),
      baselineBlockNumber: baselineBlock,
      incidentBlockNumber: incidentBlock,
      toBlock: end,
      baselineBlockHash: baselineHeader.hash,
      incidentBlockHash: incidentHeader.hash,
      endBlockHash: endHeader.hash,
      baselinePrice,
      faultyPrice,
      referencePrice,
      referenceSource: `Separate DemoOracle ${p.referenceOracleAddress} (synthetic reference; not a market feed)`,
      referenceCorroboratesBaseline:
        close(BigInt(refBefore[0]), baselinePrice) &&
        close(referencePrice, baselinePrice) &&
        referenceChanges.every((log) =>
          close(
            BigInt(reference.interface.parseLog(log)!.args.price),
            baselinePrice,
          ),
        ),
      liquidationThresholdBps: BigInt(threshold),
      collateralDecimals: Number(colDec),
      debtDecimals: Number(debtDec),
      borrowers,
      liquidations,
      provenance: "SIMULATED_PROTOCOL_ON_EVM",
    };
  }
}
