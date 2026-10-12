import "dotenv/config";
import { ethers } from "ethers";
import { rpcRead } from "../src/chain/rpc.js";
import { POAIncidentInvestigator } from "../src/agent/investigator.js";

// Read-only observation. A price change is an alert, never proof of a wrongful liquidation.
async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.BASE_RPC_URL || "https://mainnet.base.org",
  );
  const oracleAddress =
    process.env.SENTINEL_ORACLE || "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
  const demo = process.env.SENTINEL_PROTOCOL === "DEMO_LENDING_V1";
  const oracle = new ethers.Contract(
    oracleAddress,
    demo
      ? [
          "event PriceUpdated(address indexed asset,uint256 price,uint256 timestamp,string configTag)",
        ]
      : [
          "function latestRoundData() view returns(uint80,int256,uint256,uint256,uint80)",
        ],
    provider,
  );
  let stopped = false;
  const controller = new AbortController();
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      stopped = true;
      controller.abort();
    });
  let previousPrice: bigint | undefined;
  let previousRound: bigint | undefined;
  let block = await rpcRead(() => provider.getBlockNumber());
  console.log(
    "POA sentinel: actual oracle observations only. Alerts and investigation proposals; no treasury signing or payouts.",
  );
  try {
    while (!stopped) {
      try {
        const head = await rpcRead(() => provider.getBlockNumber());
        if (demo) {
          if (head > block) {
            const logs = await rpcRead(() =>
              oracle.queryFilter(
                oracle.filters.PriceUpdated(),
                block + 1,
                Math.min(head, block + 200),
              ),
            );
            for (const log of logs) {
              const asset = oracle.interface.parseLog(log)!.args.asset;
              const required = [
                "SENTINEL_POOL",
                "SENTINEL_REFERENCE_ORACLE",
                "SENTINEL_DISTRIBUTOR",
                "SENTINEL_DEBT_TOKEN",
              ];
              if (required.some((key) => !process.env[key])) {
                console.log(
                  "Observed demo oracle update. NEEDS_REVIEW: complete adapter configuration is absent.",
                );
                continue;
              }
              const report = await new POAIncidentInvestigator(
                provider,
              ).investigateOracleIncident({
                incidentId: ethers.keccak256(
                  ethers.toUtf8Bytes(log.transactionHash),
                ),
                incidentTxHash: log.transactionHash,
                oracleAddress,
                poolAddress: process.env.SENTINEL_POOL!,
                referenceOracleAddress: process.env.SENTINEL_REFERENCE_ORACLE!,
                distributorAddress: process.env.SENTINEL_DISTRIBUTOR!,
                collateralToken: asset,
                debtToken: process.env.SENTINEL_DEBT_TOKEN!,
                protocol: "DEMO_LENDING_V1",
                toBlock: Math.min(head, log.blockNumber + 200),
              });
              console.log(
                JSON.stringify({
                  transaction: log.transactionHash,
                  status: report.status,
                  decision: report.policyDecision,
                  summary: report.summary,
                }),
              );
            }
            block = Math.min(head, block + 200);
          }
        } else {
          const round = await rpcRead(() => oracle.latestRoundData());
          const price = BigInt(round[1]);
          const roundId = BigInt(round[0]);
          if (
            price <= 0n ||
            Number(round[3]) <= 0 ||
            Date.now() / 1000 - Number(round[3]) > 3600
          )
            throw new Error("Oracle round is invalid or stale");
          if (roundId !== previousRound) {
            const drop =
              previousPrice && price < previousPrice
                ? Number(((previousPrice - price) * 10000n) / previousPrice) /
                  100
                : 0;
            console.log(
              JSON.stringify({
                block: head,
                roundId: roundId.toString(),
                priceUsd: ethers.formatUnits(price, 8),
                dropPercent: drop,
                status: drop >= 5 ? "NEEDS_REVIEW" : "OBSERVED",
                reason:
                  drop >= 5
                    ? "Actual round-to-round drop. A dedicated production protocol adapter and independent reference evidence are required; no payout authorized."
                    : "New oracle round observed.",
              }),
            );
            previousPrice = price;
            previousRound = roundId;
          }
        }
      } catch {
        console.warn(
          "Observation unavailable; no incident or payout is being inferred.",
        );
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(done, 3000);
        function done() {
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", done);
          resolve();
        }
        controller.signal.addEventListener("abort", done, { once: true });
        if (stopped) done();
      });
    }
  } finally {
    provider.destroy();
  }
}
main().catch(() => {
  console.error("Sentinel could not start; check RPC configuration.");
  process.exitCode = 1;
});
