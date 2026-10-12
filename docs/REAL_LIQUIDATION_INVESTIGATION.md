# POA: real liquidation investigation and execution replay

Live product: https://poa-neathack.vercel.app/live
Production deployment: https://poa-neathack-n0qlqtpnu-proof-of-audits.vercel.app

## Verified result

A real Aave Base liquidation was reconstructed and reproduced locally. Its original signed transaction produced the same successful status, **843,924 gas and all 25 ordered logs** as mainnet. Six historical price scenarios were executed. Both Uniswap spot-price scenarios still liquidated the borrower. Three average-price scenarios reverted at Aave's health-factor gate (error 45). This is price sensitivity, not proof of oracle failure.

**Decision: no compensation justified by this evidence.** Oracle fault remains unproven. No compensation proposal, signing or payout is authorized.

Transaction: https://basescan.org/tx/0xf52b76fdd031a03ffbc903a397897af04ea7b6d293a5e79cefa640e02e12ca21
Base block: 14440169. Incident: 2024-05-14 06:54:45 UTC.

## Product behavior

The agent finds a bounded recent supported candidate or explicitly selects the historical example and revalidates it. It reads historical reserves, debt, collateral flags, eMode, prices, source rounds and block anchors. Uniswap factory identity and historical observations are checked. Coinbase ETH/USD provides 29 completed pre-incident minute candles; the containing minute includes later trades and is excluded from causal evidence. ETH/USD is not silently treated as ETH/USDC.

The hosted agent reads **saved local fork execution evidence**, verifying its original receipt against fresh mainnet data. It does not run a new fork on each request. Unsupported transactions receive no substitute replay. Detailed valuation supports USDC collateral and WETH variable debt without eMode or additional active assets.

The original execution is reproduced after the preceding L1-attributes transaction. Only the WETH source return is replaced for counterfactual scenarios. Uniswap references are previous-block observations, not proven correct transaction-time oracle prices. Full block state-root equivalence is not claimed. A verified oracle-fault mechanism and independent reference validation remain necessary for compensation.

## Economics

Observed transfer cost includes collateral sent to the liquidator and receipt-verified reserve-treasury transfers, less debt discharged at each reference price. Four baseline average-price estimates range from **638.89 to 690.69 USDC**. These amounts are **not oracle-attributable damage or eligible compensation**; borrower gas, execution slippage and later prices are excluded.

## Verification

- 118 JavaScript/TypeScript tests across 13 files passed; type check passed.
- Production build and deployment succeeded.
- Hosted public and live-model investigations both completed with identical causal assessments on deployment 1w9lp61r3. The final deployment only disables duplicate default video captions; agent logic and replay proof are unchanged.
- Hosted model trace: 35 persisted spans, 12 model calls; hierarchy verified by authenticated Neatlogs read-back.
- 15 local/project traces have authenticated provider read-back with all expected spans and parent relationships.
- A real rejected model action remained visible; bounded planning recovered.

## Submission limits

The verified runtime upgrade is now published at GitHub commit adf3bbb, with a genuine Entire checkpoint. See docs/SUBMISSION_VERIFICATION.md for the current release. Public posts remain drafts. No prize result is guaranteed. The prototype still needs dependency remediation, independent security review and broader protocol/position support before treasury production use.
