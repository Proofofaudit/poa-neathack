import { ethers } from "ethers";

// Deployment: https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Base.sol
export const AAVE_BASE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
export const AAVE_LIQUIDATION_ABI = [
  "event LiquidationCall(address indexed collateralAsset,address indexed debtAsset,address indexed user,uint256 debtToCover,uint256 liquidatedCollateralAmount,address liquidator,bool receiveAToken)",
];
const liquidationInterface = new ethers.Interface(AAVE_LIQUIDATION_ABI);
export class InspectionError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}
export function decodeAaveLiquidations(logs: readonly ethers.Log[]) {
  return logs.filter(log => log.address.toLowerCase() === AAVE_BASE_POOL.toLowerCase()).flatMap(log => {
    try {
      const decoded = liquidationInterface.parseLog(log);
      if (!decoded) return [];
      return [{ pool: log.address, logIndex: log.index, borrower: String(decoded.args.user), collateralAsset: String(decoded.args.collateralAsset), debtAsset: String(decoded.args.debtAsset), debtCoveredBaseUnits: String(decoded.args.debtToCover), collateralLiquidatedBaseUnits: String(decoded.args.liquidatedCollateralAmount), liquidator: String(decoded.args.liquidator), receiveAToken: Boolean(decoded.args.receiveAToken) }];
    } catch { return []; }
  });
}
export async function inspectBase(provider: ethers.Provider, input: string) {
  const network = await provider.getNetwork();
  if (network.chainId !== 8453n) throw new InspectionError("The configured node is not Base mainnet.", 503);
  const observedAt = new Date().toISOString();
  if (ethers.isAddress(input)) {
    const address = ethers.getAddress(input);
    const height = await provider.getBlockNumber();
    const [block, code] = await Promise.all([provider.getBlock(height), provider.getCode(address, height)]);
    if (!block?.hash) throw new InspectionError("Block evidence unavailable. Try again.", 503);
    let reserves: string[] | undefined;
    if (address.toLowerCase() === AAVE_BASE_POOL.toLowerCase() && code !== "0x") {
      const pool = new ethers.Contract(address, ["function getReservesList() view returns(address[])"], provider);
      reserves = Array.from(await pool.getReservesList({ blockTag: height }));
    }
    return { kind: "CONTRACT", chainId: 8453, observedAt, address, blockNumber: height, blockHash: block.hash, hasBytecode: code !== "0x", bytecodeHash: code === "0x" ? null : ethers.keccak256(code), protocol: reserves ? "AAVE_V3_BASE" : "UNRECOGNIZED", reserves, explorerUrl: `https://basescan.org/address/${address}`, policyDecision: "WITHHELD", explanation: reserves ? "Live Aave pool read succeeded. These reserves were read at the recorded block. Select a liquidation transaction to inspect its receipt." : "Address inspected on Base. Bytecode alone does not verify its identity or establish compensation eligibility." };
  }
  if (!ethers.isHexString(input, 32)) throw new InspectionError("Enter a Base contract address or a 32-byte transaction hash.", 400);
  const receipt = await provider.getTransactionReceipt(input);
  if (!receipt) throw new InspectionError("Transaction not found on Base, or still pending.", 404);
  const [block, transaction] = await Promise.all([provider.getBlock(receipt.blockNumber), provider.getTransaction(input)]);
  if (!block?.hash || block.hash !== receipt.blockHash || !transaction || transaction.blockHash !== block.hash)
    throw new InspectionError("Transaction and block evidence disagree. Retry after confirmation.", 503);
  const liquidations = receipt.status === 1 ? decodeAaveLiquidations(receipt.logs) : [];
  const anchor = await provider.getBlock(receipt.blockNumber);
  if (anchor?.hash !== block.hash) throw new InspectionError("Block changed during inspection; retry.", 503);
  return { kind: "TRANSACTION", chainId: 8453, observedAt, transactionHash: receipt.hash, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash, timestamp: new Date(block.timestamp * 1000).toISOString(), from: receipt.from, to: receipt.to, executionStatus: receipt.status === 1 ? "SUCCEEDED" : "REVERTED", gasUsed: receipt.gasUsed.toString(), feeWei: receipt.fee.toString(), logCount: receipt.logs.length, liquidations, protocol: liquidations.length ? "AAVE_V3_BASE" : "UNRECOGNIZED", explorerUrl: `https://basescan.org/tx/${receipt.hash}`, policyDecision: "WITHHELD", explanation: receipt.status !== 1 ? "The transaction reverted. Its receipt does not contain a revert reason; an execution trace or historical simulation is needed to diagnose why." : liquidations.length ? "Verified liquidation event receipts from the known Aave Base pool. A liquidation is not proof of an oracle fault. Historical reserve configuration, borrower positions and independent price evidence are still required before calculating compensation." : "Receipt verified. No supported Aave Base liquidation events were found. This is not evidence of wrongful liquidation." };
}
