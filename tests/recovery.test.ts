import { describe, it, expect } from "vitest";
import {
  collectHistoricalLogs,
  RecoveryAction,
} from "../src/chain/historical-logs.js";

describe("Adaptive historical query planning", () => {
  it("changes its tool plan after a provider limit and covers every block exactly once", async () => {
    const actions: RecoveryAction[] = [];
    const result = await collectHistoricalLogs(
      async (from, to) => {
        if (to - from > 1)
          throw new Error("query returned more than provider limit");
        return Array.from({ length: to - from + 1 }, (_, i) => from + i);
      },
      10,
      17,
      (action) => actions.push(action),
    );
    expect(result).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
    expect(actions).toHaveLength(3);
    expect(actions.every((a) => a.action === "SPLIT_LOG_RANGE")).toBe(true);
  });
  it("retries a transient action without changing the evidence range", async () => {
    let calls = 0;
    const actions: RecoveryAction[] = [];
    expect(
      await collectHistoricalLogs(
        async (from, to) => {
          if (++calls === 1) throw new Error("connection reset");
          return [from, to];
        },
        10,
        20,
        (a) => actions.push(a),
      ),
    ).toEqual([10, 20]);
    expect(calls).toBe(2);
    expect(actions[0].action).toBe("RETRY_RPC");
  });
  it("withholds when a single block cannot be retrieved", async () => {
    await expect(
      collectHistoricalLogs(
        async () => {
          throw new Error("too many results");
        },
        10,
        10,
      ),
    ).rejects.toThrow("too many results");
  });
  it("bounds pathological provider splitting", async () => {
    let calls = 0;
    await expect(
      collectHistoricalLogs(
        async () => {
          calls++;
          throw new Error("block range limit exceeded");
        },
        0,
        1000,
        undefined,
        4,
      ),
    ).rejects.toThrow();
    expect(calls).toBe(4);
  });
});
