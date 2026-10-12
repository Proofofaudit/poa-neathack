# Live Aave agent — October 12, 2026

The main deployment now opens the live investigation page. The compensation scenario is separately available at `/demo`.

Verified capabilities:

- Actual Aave Base pool registration, 15-reserve discovery, and WETH/USDC/cbBTC price sampling from a recorded block.
- Configured oracle source bytecode and available round reads, with unsupported source adapters disclosed.
- Real Base transaction receipt triage, event decoding restricted to the known pool, and block hash rechecks.
- Claude tool selection with a nine-turn budget, invalid-action handling, one retry per failed tool, and completion prerequisites.
- Structured findings based on tool observations. Model rationale is separately marked unverified and does not establish feed health or compensation eligibility.
- Authenticated hosted AI execution. No model provider credential is entered in the browser. The public mode uses an explicitly labeled rule planner.
- 99 JavaScript tests passed, including cancellation, missing archive evidence, model action restrictions and access control. Production build and hosted model execution passed.
- Entire graph output for the new workflow is saved in `evidence/entire_live_agent_graph.json`. Ten project SDK traces were verified through authenticated neatlogs read-back, including the new live market and transaction runs and retained failures.

Limits:

- Historical borrower aggregation is implemented for supported liquidation receipts and covered by planner tests; this release did not verify that branch against a real liquidation transaction. The verified real Aave transaction had no liquidation events. Do not present it as a wrongful-liquidation case.
- No production counterfactual replay, independent historical market reference, transaction-order reconstruction or compensation eligibility is claimed. Source adapters and heartbeat policies need protocol-specific verification.
- Ethereum settlement finality is not established by checking Base L2 block hashes.
- Public-node archive restrictions were observed and retained as a failed run. Switching to an available configured node permitted receipt triage; that switch was performed during verification, not claimed as an autonomous provider failover.
- Dependency audit advisories remain; this is a hackathon release, not an audited treasury deployment.
- Previous demo artifacts and earlier live runs retain the fingerprints of their capture versions. The latest deployed source is recorded separately in the release artifact. Source changes remain uncommitted/unpushed pending the user's original separate push approval.

Run locally with Node 24 and existing model configuration:

```
npm run agent:base
POA_LLM_ENABLED=true POA_TELEMETRY_ENABLED=true npm run agent:base
npm run agent:base -- <Base transaction hash>
```
