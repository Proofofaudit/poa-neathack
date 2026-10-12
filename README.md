# POA — Proof of Audits

**When an oracle fails, users should not have to prove their losses from scratch.**

POA investigates a disputed oracle update, reconstructs borrower positions, calculates eligible equity loss and produces a funded Merkle compensation package. The demonstration includes a real test-token claim to a recipient holding **zero ETH**, paid for by a forwarding caller.

This is a **hackathon prototype with a real Aave Base investigation and a separate synthetic compensation demo**. The `/live` agent reconstructs historical borrower state, checks market references and revalidates saved local execution replay evidence for the supplied example. The `/demo` lending protocol, reference oracle and test-token incident are synthetic. No mainnet compensation is authorized.

## The demonstration

1. Deploy a lending pool, disputed oracle, independent synthetic reference oracle and test tokens.
2. Seed six borrowers. One is already insolvent before the disputed update; two stay untouched.
3. Change the disputed price from $2,000 to $1,800 and execute four on-chain liquidations.
4. Discover receipts, liquidation logs and historical positions without passing borrower or liquidation fixtures to the investigator.
5. Verify the independent reference, eligibility and reconstructed end balances. Three borrowers qualify for **5,750 test USDC**; the pre-insolvent borrower and untouched positions receive zero.
6. Register the approved manifest, execute a sponsored claim and verify the recipient's token balance increase while their ETH remains zero.
7. Confirm tampered and duplicate claims are rejected and a missing incident receipt withholds the manifest.

The browser displays **saved execution evidence**, including every borrower outcome, anchored blocks, receipts, claim root and policy decision trail. It never invents wallet confirmations.

## Run the real Base investigation agent

The deployed home page opens `/live`. Click **Run investigation** to audit the real Aave Base market, or supply a Base transaction hash for receipt triage and supported liquidation borrower snapshots. Claude AI planning is the default for the historical example when `POA_PUBLIC_AI_ENABLED=true` and the server model is enabled. No visitor key or code is needed. **Investigation settings** offers explicit rule mode and operator access for custom-transaction AI. No provider key is entered in the browser.

Locally run `npm run agent:base` (market) or `npm run agent:base -- <transaction-hash>`. Add `POA_LLM_ENABLED=true` for real model planning and `POA_TELEMETRY_ENABLED=true` for remote trace export. Each CLI run saves its report and SDK trace under `evidence/live_agent_run.json`. Failed tools are retried once and retained; model actions have a nine-turn budget and cannot bypass required checks. The report withholds compensation.

The agent verifies the registered Aave Base pool, records its oracle prices for WETH/USDC/cbBTC or incident assets, inspects source bytecode and readable source rounds, gathers block-boundary borrower aggregates for supported liquidation receipts, and rechecks collected block hashes. It reports adapter/feed and historical-read limitations. The historical example now includes saved local execution replay: original gas and all 25 logs match mainnet, and six price scenarios execute against historical contracts. Both spot-price references still liquidate; oracle fault is unproven and compensation withheld. The hosted server validates saved proof rather than executing a new fork. Other transactions need their own replay. The synthetic compensation demonstration is separately available at `/demo`.

## Inspect real Base contracts

Open `/live`, enter a Base contract address or transaction hash, and click **Inspect live**. The example reads the deployed Aave Base pool. `/api/inspect?input=<address-or-hash>` reads bytecode or receipts from Base mainnet and decodes liquidation events emitted by the known Aave pool. There are no fixture fallbacks or payouts. A successful receipt inspection is not a completed restitution investigation: production protocol reconstruction and independent historical prices remain unsupported.

You can also run `npm run inspect:base -- <address-or-transaction-hash>` locally. With no argument it reads the deployed Aave Base pool. Configure `BASE_RPC_URL` in your local environment if the public endpoint is unavailable.

## Reproduce

Requirements: Node.js 24, npm, Foundry (`forge`, `anvil`) and Solidity 0.8.24. The Solidity dependencies are checked into `contracts/lib`.

```sh
npm ci
npm run contracts:build
npm run demo:local
npm run dev
```

Open `http://localhost:3000/demo` for compensation evidence, or `/live` for real chain investigations. The demo starts and stops its own sandbox on an ephemeral local port; it never resets another running node. Each run exports `evidence/run_evidence.json` and `evidence/restitution_manifest.json`.

Full verification:

```sh
npm run verify:release
```

This gate runs TypeScript checking, contract tests (including accounting fuzz cases), policy/API tests, the end-to-end local demo, the project's own Merkle benchmark and the production build. It exits on failure. The benchmark is **not the official EVMbench harness** and makes no academic grading claim.

Pinned Base fork:

```sh
BASE_FORK_BLOCK=<a Base block number> npm run demo:base-fork
```

Without `BASE_FORK_BLOCK`, the runner resolves and records a snapshot before starting the fork. It records the actual chain ID and fork block. An archive-capable Base RPC may be configured using `BASE_RPC_URL`. Failure does not substitute local fixtures or overwrite the last successful evidence with a success claim.

## Safety boundary

- Only the explicit `DEMO_LENDING_V1` adapter can authorize this prototype's manifests.
- Historical baseline state, a successful incident receipt, a bounded log window, reference freshness and reconstructed end-state consistency are required.
- A disputed drop of at least 5% must be corroborated by a separate reference within 1% of baseline. A compensated borrower must cross from healthy to liquidatable.
- Reference or model denial, unavailable evidence, extra position-changing activity, extra oracle updates and repeated liquidations requiring transaction-level analysis withhold the **entire** manifest.
- Defaults cannot silently substitute prices, positions or liquidation events.
- The owner must approve and register a funded root. Model output alone never authorizes treasury spending.
- Per-incident remaining liabilities prevent cross-incident overspending. Sweeps reclaim only unclaimed funds after 180 days. Incident IDs cannot be reused after sweeping.
- Cumulative distribution epochs require funding, nondecreasing aggregate allocation and capped total payouts. Per-beneficiary correctness remains the publisher's responsibility.

The economic policy currently supports single-collateral positions with a **USD-pegged debt asset**. Decimal scaling is not an asset-pricing oracle. Aave/Compound, arbitrary debt assets, multi-asset portfolios and repeated-liquidation causal replay require dedicated adapters and independent validation.

## AI and observability

The default demonstration runs explicit deterministic policy rules without external API calls. `isLiveLlm: false` and the policy name are recorded. No synthetic token usage, market corroboration or confidence about intent is emitted.

Optional live review requires `POA_LLM_ENABLED=true` and fresh OpenAI or LiteLLM credentials. Responses are requested as JSON and validated against a strict schema. Invalid, missing, low-confidence or timed-out requested review withholds restitution. A model may restrict the deterministic policy, but cannot override it.

Neatlogs SDK export is opt-in through `POA_TELEMETRY_ENABLED=true`; local trace evidence works without a key. Bytecode enrichment reports contract/EOA-or-undeployed/unknown only. Crustdata company or MEV identity enrichment is **not implemented**.

`npm run sentinel:watch` observes actual Chainlink round changes continuously and reports real deviations as **review alerts**, never fabricated incidents or automatic payouts. Configured demo-oracle monitoring can dispatch the supported investigator on actual `PriceUpdated` events. No mempool or TWAP capability is claimed.

## Production preview

```sh
npm run build
npm start
```

The production UI displays saved evidence by default. Server-side sandbox execution requires both `ALLOW_PROD_SIMULATION=true` and a `POA_DEMO_TOKEN` of at least 32 characters; the browser accepts that access code without persisting it. Input validation, an exclusive run lock and argument-based process execution protect the endpoint. Local development execution requires a matching local origin.

`/api/health` actually probes RPC reachability and chain ID. Optional services explicitly report `NOT_PROBED`; configuration does not masquerade as connectivity. Credential-bearing endpoint URLs are never returned.

## Submission material

- [Three-minute demo and judge Q&A](docs/SUBMISSION_GUIDE.md)
- [Security and deployment boundaries](SECURITY.md)
- [Verification status](docs/BUILD_STATUS.md)

The path to deployment is independent contract auditing, treasury governance, production protocol adapters, finality policies, independent market-reference sources, and operational monitoring. POA does not claim production readiness or guaranteed compensation eligibility outside its supported policy.

## Judge walkthrough and measurable improvement

Open `/judges` to inspect eligibility, the independent conservation check, adaptive historical-query recovery, actual neatlogs SDK spans and the labeled before/after evaluation.

`npm run test:upgrade` executes the import-free pure economic module from pinned commit `96da127` and the current engine on twelve identical synthetic cases. The current code must return every expected amount and no unsupported positive authorization on that set. This is a project-owned regression evaluation, not a production accuracy estimate.

The historical log tool changes its plan when a provider rejects a range: it partitions into disjoint inclusive ranges, preserves block coverage and stops at a bounded query budget. A transient failure receives bounded retries. The demo deliberately injects both failures and records the actual SDK error spans and subsequent recovery actions.

Local traces now use the actual neatlogs SDK with an isolated in-memory exporter. With a valid configured provider credential, `npm run evidence:remote` exports the synthetic investigation and before/after regression traces, then verifies every expected span and its hierarchy through authenticated provider read-back. It never enables live LLM calls. It saves distinct remote artifacts without substituting remote-export success for persisted ingestion. Keep all credentials outside Git and rotate exposed credentials at the provider.

`npm run evidence:entire` captures setup and checkpoint availability without copying private transcripts. Zero checkpoints remain explicitly incomplete evidence.

`npm run business:model` reproduces the assumed commercial scenarios. The plan, assumptions, calculated CSV, three-minute storyboard and unpublished launch drafts are in `docs/submission/`. These local files do not prove use of cfo.ai or public posting. Actual cfo.ai workspace screenshots and an unchanged spreadsheet export are now retained separately in public/submission and evidence/cfo_ai_evidence.json; public posts remain unpublished.

### Optional model-directed review

With `POA_LLM_ENABLED=true` and a valid, rotated model credential, the investigator adds a bounded read-only model/tool review. Each model response chooses one typed action: compare the reference, inspect specific borrowers, independently verify the manifest, or finalize/withhold. Observed tool results feed the next choice. The model has at most eight turns and cannot approve before every borrower, the reference and the proof audit have been checked. Invalid actions, unknown borrowers, premature approval and budget exhaustion withhold the candidate. It cannot alter amounts or execute treasury payments.

The saved deterministic demos do not claim live model execution. Six controlled-response tests establish the review protocol's guardrails; a genuine provider run remains necessary to demonstrate model quality and reliability.

## Full-investigation reliability evaluation

Run `npm run test:missions` for seven controlled scenarios on a real local EVM. The evaluator checks exact allocations, inclusion proofs, linked SDK traces, recovery and safe withholding. The judge page displays each result while preserving failed spans. This is a project-owned rules-only evaluation, not production reliability or a native neatlogs evaluation. See [research and improvements](docs/submission/RESEARCH_IMPROVEMENTS.md).

## Public hackathon evidence viewer

- Product: https://poa-neathack.vercel.app
- Narrated demo (2:47): https://poa-neathack.vercel.app/watch
- Judge evidence: https://poa-neathack.vercel.app/judges
- Actual cfo.ai forecast: public/submission/cfo-ai-financial-forecast.xlsx

The public deployment displays saved evidence and blocks public execution. A genuine Claude Haiku run completed four read-only review actions; earlier provider-format failures are retained. Six neatlogs project traces passed authenticated read-back. See docs/BUILD_STATUS.md for verification and dependency limitations. The supplied launch text remains an unpublished draft.

## Verified real-case release

125 tests pass across 14 files; type check and production build pass. Sixteen project Neatlogs traces have authenticated span and hierarchy read-back. See [real-case evidence and limits](docs/REAL_LIQUIDATION_INVESTIGATION.md). To reproduce the local historical fork with Foundry Anvil installed, run `npx tsx scripts/replay_real_liquidation.ts`; all write calls target loopback, never mainnet. The script requires the saved baseline-reference artifact and archive RPC access.

## Default public AI example

`/live` now selects Claude planning by default. With `POA_PUBLIC_AI_ENABLED=true` and configured server credentials, the historical example requires no visitor key or agent code. Provider keys remain server-side. Public AI is restricted to the verified historical case, with five starts per ten minutes and one concurrent run **per server instance**; this is not an account-wide spending limit. Other transaction AI requires operator access, and explicit rule mode remains available without a model call. `/api/agent` remains a separate quick check.

Planner context now sends bounded progress and selected observed facts while preserving full tool results in the downloadable report. Two actual same-case runs recorded 43,704 versus 3,380 model tokens and identical causal assessments; see `evidence/planner_context_comparison.json` for scope and caveats.
