import { rpcRead } from "./rpc.js";
import { neatlogs } from "../observability/neatlogs.js";

export interface RecoveryAction {
  action: "SPLIT_LOG_RANGE" | "RETRY_RPC";
  fromBlock: number;
  toBlock: number;
  reason: string;
}
const rangeLimited = (error: unknown) =>
  /too many (results|logs)|query returned more|block range|response (size|too large)|result (limit|set too large)|limit exceeded|exceed.*(range|results)/i.test(
    String(error),
  );

/** Adapt the query plan to explicit provider range limits, without dropping blocks.
 * Unknown failures receive bounded retries; a single-block limit cannot be split.
 * The call budget bounds both retries and the binary partition tree.
 */
export async function collectHistoricalLogs<T>(
  query: (fromBlock: number, toBlock: number) => Promise<T[]>,
  fromBlock: number,
  toBlock: number,
  onRecovery: (action: RecoveryAction) => void = () => {},
  callBudget = 64,
): Promise<T[]> {
  if (
    !Number.isSafeInteger(fromBlock) ||
    !Number.isSafeInteger(toBlock) ||
    fromBlock < 0 ||
    toBlock < fromBlock ||
    !Number.isSafeInteger(callBudget) ||
    callBudget < 1
  )
    throw new Error("Invalid historical query bounds");
  let calls = 0;
  const attempt = async (from: number, to: number): Promise<T[]> => {
    const read = async () => {
      if (++calls > callBudget)
        throw new Error(
          "Historical query call budget exhausted; review required",
        );
      return neatlogs.traceSpan(
        "historicalLogQuery",
        "TOOL",
        { fromBlock: from, toBlock: to, attempt: calls },
        () => query(from, to),
      );
    };
    try {
      return await rpcRead(read, {
        shouldRetry: (error) => !rangeLimited(error) && calls < callBudget,
        onRetry: () =>
          onRecovery({
            action: "RETRY_RPC",
            fromBlock: from,
            toBlock: to,
            reason:
              "Transient or unknown RPC failure; retrying the same bounded range",
          }),
      });
    } catch (error) {
      if (!rangeLimited(error) || from === to || calls >= callBudget)
        throw error;
      const midpoint = Math.floor((from + to) / 2);
      onRecovery({
        action: "SPLIT_LOG_RANGE",
        fromBlock: from,
        toBlock: to,
        reason:
          "Provider rejected range size; partition into disjoint inclusive ranges",
      });
      // Sequential queries keep provider pressure bounded and preserve chain order.
      return [
        ...(await attempt(from, midpoint)),
        ...(await attempt(midpoint + 1, to)),
      ];
    }
  };
  return attempt(fromBlock, toBlock);
}
