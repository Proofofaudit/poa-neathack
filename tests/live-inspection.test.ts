import { expect, it } from "vitest";
import { ethers } from "ethers";
import { inspectBase, AAVE_BASE_POOL, AAVE_LIQUIDATION_ABI, decodeAaveLiquidations } from "../src/chain/live-inspection";
const hash = "0x" + "12".repeat(32);
const blockHash = "0x" + "34".repeat(32);
const address = "0x" + "11".repeat(20);
function provider(receipt: any = null) {
  return {
    getNetwork: async () => ({ chainId: 8453n }),
    getBlockNumber: async () => 100,
    getCode: async () => "0x6000",
    getBlock: async () => ({ hash: blockHash, timestamp: 1700000000 }),
    getTransaction: async () => ({ blockHash }),
    getTransactionReceipt: async () => receipt,
  } as unknown as ethers.Provider;
}
it("rejects the wrong chain rather than returning plausible Base results", async () => {
  const p = provider(); p.getNetwork = async () => ({ chainId: 1n }) as ethers.Network;
  await expect(inspectBase(p, address)).rejects.toThrow("not Base");
});
it("does not substitute demo receipts for a missing real transaction", async () => {
  await expect(inspectBase(provider(), hash)).rejects.toThrow("not found");
});
it("does not treat arbitrary contract bytecode as a recognized protocol", async () => {
  const data = await inspectBase(provider(), address);
  expect(data).toMatchObject({ protocol: "UNRECOGNIZED", hasBytecode: true, policyDecision: "WITHHELD" });
});
it("anchors receipts and rejects inconsistent block evidence", async () => {
  await expect(inspectBase(provider({ blockNumber: 100, blockHash: hash }), hash)).rejects.toThrow("disagree");
});
it("reports reverted execution without inventing its cause", async () => {
  const data = await inspectBase(provider({ hash, blockNumber: 100, blockHash, status: 0, logs: [], gasUsed: 123n, fee: 246n }), hash);
  expect(data).toMatchObject({ executionStatus: "REVERTED", liquidations: [], policyDecision: "WITHHELD" });
  expect(data.explanation).toContain("does not contain a revert reason");
});
it("decodes amounts exactly and ignores spoofed Aave event emitters", () => {
  const iface = new ethers.Interface(AAVE_LIQUIDATION_ABI);
  const encoded = iface.encodeEventLog(iface.getEvent("LiquidationCall")!, [address, address, address, 9007199254740993n, 1234567890123456789n, address, false]);
  const log = { ...encoded, address: AAVE_BASE_POOL, index: 4 } as unknown as ethers.Log;
  expect(decodeAaveLiquidations([log])[0]).toMatchObject({ debtCoveredBaseUnits: "9007199254740993", collateralLiquidatedBaseUnits: "1234567890123456789", receiveAToken: false });
  expect(decodeAaveLiquidations([{ ...log, address } as ethers.Log])).toEqual([]);
});
