import { expect, it } from "vitest";
import { assertReplayMatches } from "../src/chain/replay-validation";
const receipt = () => ({status: 1, gasUsed: 843924n, blockHash: "mainnet", logs: [{address: "0xABC", topics: ["0x123"], data: "0x0001"}]});
it("accepts different local block metadata only when execution outputs match", () => {
  const local = {...receipt(), blockHash: "local", transactionIndex: 0};
  expect(assertReplayMatches(receipt(), local).matched).toBe(true);
});
it("refuses to validate a failed or mismatched historical reproduction", () => {
  for (const changed of [{...receipt(), status: 0}, {...receipt(), gasUsed: 1n}, {...receipt(), logs: []}, {...receipt(), logs: [{address: "0xABC", topics: ["0x456"], data: "0x0001"}]}, {...receipt(), logs: [{address: "0xABC", topics: ["0x123"], data: "0x0002"}]}]) expect(() => assertReplayMatches(receipt(), changed)).toThrow();
});
