import { expect, it } from "vitest";
import { selectHistoricalCandles } from "../src/chain/coinbase-reference";
it("keeps future-containing candles out of causal evidence", () => {
  const result = selectHistoricalCandles([[120, 1, 3, 1, 2, 10], [180, 1, 100, 1, 100, 20], [240, 1, 1000, 1, 1000, 20]], 225);
  expect(result.completedCandles.map(c=>c[0])).toEqual([120]);
  expect(result.containingMinuteRetrospectiveOnly.map(c=>c[0])).toEqual([180]);
});
it("rejects corrupt candles and missing historical coverage", () => {
  expect(()=>selectHistoricalCandles([[120, 3, 1, 2, 2, 10]],225)).toThrow();
  expect(()=>selectHistoricalCandles([],225)).toThrow();
});
