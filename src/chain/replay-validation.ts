/** Local block hashes and transaction indices differ; compare execution outputs. */
export function assertReplayMatches(original: any, replay: any) {
  if (!original || !replay || original.status !== 1 || replay.status !== 1) throw new Error("Successful original and replay receipts required");
  if (String(original.gasUsed) !== String(replay.gasUsed)) throw new Error("Replay gas differs from mainnet");
  const logs = (receipt: any) => receipt.logs.map((l: any) => ({address: l.address.toLowerCase(), topics: l.topics.map((t: string) => t.toLowerCase()), data: l.data.toLowerCase()}));
  if (JSON.stringify(logs(original)) !== JSON.stringify(logs(replay))) throw new Error("Replay event sequence or amounts differ from mainnet");
  return { matched: true, gasUsed: String(replay.gasUsed), logCount: replay.logs.length, compared: "status, gas used, ordered log addresses/topics/data", excluded: "Local block hash and transaction index are expected to differ" };
}
