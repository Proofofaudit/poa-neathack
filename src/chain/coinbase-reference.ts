export function selectHistoricalCandles(candles: unknown, incidentTimestamp: number) {
  if (!Array.isArray(candles) || candles.some(c => !Array.isArray(c) || c.length !== 6 || c.some(v => typeof v !== "number" || !Number.isFinite(v)) || !Number.isInteger(c[0]) || c[0] % 60 !== 0 || c[1] <= 0 || c[2] < c[1] || c[3] < c[1] || c[3] > c[2] || c[4] < c[1] || c[4] > c[2] || c[5] < 0)) throw new Error("Malformed historical exchange candles");
  const rows = candles as number[][];
  const completed = rows.filter(c => c[0] + 60 <= incidentTimestamp && c[0] >= incidentTimestamp - 1800).sort((a,b) => b[0] - a[0]);
  if (!completed.length) throw new Error("No completed pre-incident candles");
  return {completedCandles: completed.slice(0, 5), completedCoverageCount: completed.length, containingMinuteRetrospectiveOnly: rows.filter(c => c[0] <= incidentTimestamp && c[0] + 60 > incidentTimestamp)};
}
export async function readCoinbaseReference(incidentTimestamp: number) {
  const url = new URL("https://api.exchange.coinbase.com/products/ETH-USD/candles");
  url.searchParams.set("granularity", "60");
  url.searchParams.set("start", new Date((incidentTimestamp - 1800) * 1000).toISOString());
  url.searchParams.set("end", new Date(incidentTimestamp * 1000).toISOString());
  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(10000), redirect: "error"});
    if (!response.ok) throw new Error("Unavailable historical price");
    const data = selectHistoricalCandles(await response.json(), incidentTimestamp);
    return {status: "READ", provider: "Coinbase Exchange", product: "ETH-USD", sourceUrl: url.toString(), retrievedAt: new Date().toISOString(), incidentTimestamp, ...data, caveat: "Completed candles are pre-incident intervals, not an exact timestamp quote. The containing minute includes later trades and is retrospective only. ETH-USD is not ETH-USDC; USDC parity is not assumed."};
  } catch { return {status: "UNAVAILABLE", provider: "Coinbase Exchange", product: "ETH-USD", sourceUrl: url.toString(), reason: "Historical candle evidence unavailable or invalid; no substitute price"}; }
}
