# POA submission verification — October 12, 2026

## Working product and default AI

Live: https://poa-neathack.vercel.app/live
Deployment: https://poa-neathack-b6fd9bzbw-proof-of-audits.vercel.app

Leave the transaction blank and click **Investigate real liquidation**. Claude planning is enabled by default for the historical example; no visitor key or access code is required. Provider credentials stay on the server. Public AI is restricted to this verified case and allows five starts per ten minutes and one concurrent run per server instance. This is not an account-wide spending cap. Custom-transaction AI retains operator access; explicit rule mode remains available.

The actual browser run completed with **3380 model tokens**, **10 model calls**, and **30 persisted spans**. Authenticated Neatlogs read-back verified the required model/tool spans and their parent links. The decision is **NO_COMPENSATION_JUSTIFIED_BY_EVIDENCE**: oracle fault is unproven, so no compensation proposal or payout is authorized.

The original transaction replay matches mainnet's 843,924 gas and all 25 ordered logs. Six counterfactual executions use the original block height and timestamp. Three average-price scenarios reject liquidation at Aave's health-factor gate; both spot-price scenarios and one short average still liquidate. This demonstrates price sensitivity, not oracle failure. The hosted server revalidates saved local fork evidence; it does not run a fresh fork for every request.

## Published GitHub code

Public repository: https://github.com/Proofofaudit/poa-neathack
Verified code commit: https://github.com/Proofofaudit/poa-neathack/commit/adf3bbb27c996d9b20a500e03b8e8b526acf5cc7

GitHub's default branch was read back after a normal fast-forward push. The published planner, investigation API and live page match local source bytes. No force push was used. The initial push was rejected because the current OAuth login cannot publish GitHub Actions workflows. The workflow was preserved as `docs/verification-workflow.yml.example`; it is a template, not an active CI run. Local tests and the Vercel production build passed.

## Entire: genuine session and Graph evidence

Public session: https://entire.io/gh/Proofofaudit/poa-neathack/session/01a12c74-ec46-7f40-b917-d2a926c1dbb2
Checkpoint: **01M4R9C17A69686FF6780FW83Q**

The public Entire page was opened without signing in and shows one genuine Codex session with one checkpoint linked to code commit adf3bbb. The supported `entire session attach` flow attached the actual existing transcript; no reconstructed history was created. All 6 stored checkpoint blobs were scanned before synchronization, with zero known credential matches. The checkpoint ref is present on GitHub and its metadata was read back through Entire.

Diagnosis: the repository previously installed only Antigravity hooks while this work ran through a projectless Codex desktop chat. It had zero sessions and checkpoints. Codex hooks are now installed, but their automatic activation still reports trust review needed. The successful existing-session attachment is verified independently of automatic hooks. Entire CLI and UI reported different large session token totals; these totals are not used as model-run or billing metrics.

Graph evidence: `evidence/entire_planner_context_graph.json` and `evidence/entire_planner_context_impact.json` locate the planner, API callers and tests. Source inspection identified repeated full evidence in each model prompt. The change keeps full reports but sends bounded progress and selected facts to the planner. Before/after actual runs recorded **43704 → 3380 tokens**, a 92.27% observed reduction with identical causal assessment. Tool order and rejected-action counts differ; this is not a deterministic benchmark or measured billed-cost reduction.

## Neatlogs references

Default hosted Claude trace: https://app.neatlogs.com/traces/ca2bc17a3365e9613ba259859ef7172c?projectId=542c53f4-ec26-4d57-a097-b7c9175c84be
Before compact context: b7e45b703fe5e1c1476b939e45f3647a
After compact context: 6c1c0938da1f24ff6b62b1ba7eae739f

Sixteen saved project traces have authenticated span and hierarchy read-back; the hosted default trace above was verified separately and opened in the actual dashboard. The earlier rejected model action remains in the before-run report. Do not claim the new successful run contains a rejection.

## cfo.ai forecast and usage reconciliation

Model link: https://cfo.ai/s/K8j_ybAD6DrlAI2j

The link resolves to POA — Assumptions in the authenticated cfo.ai workspace. Its share control indicates external sharing is on; anonymous content access was not independently tested. The actual table shows a $3,500 monthly price, $0.038 LLM input, $0.003 archive-RPC input, $0.001 telemetry input and $0.020 gas input per incident, plus $500,000 opening cash. These are planning assumptions, not bills, revenue or verified funding. The $0.062 incident total is not a measured cost of either Claude run. The original exported forecast is preserved unchanged. `docs/submission/CFO_AI_VERIFIED_PLAN.md` documents the actual token comparison and the need for measured input/output billing, review, security and infrastructure costs.

## Executed checks

- 125 application tests across 14 files passed.
- TypeScript check passed.
- 20 Solidity tests passed, including 256 fuzz runs.
- Production build and deployment passed.
- Real model before/after runs completed with identical causal assessment.
- Default public AI completed in the browser with no credential entry.
- Published runtime source bytes match the verified implementation.
- Genuine Entire checkpoint is present remotely and visible publicly.
- cfo.ai assumptions and actual Neatlogs trace were inspected in their applications.

## Remaining limits and submission actions

No proven oracle exploit, mainnet restitution or arbitrary-contract support is claimed. Detailed valuation supports USDC collateral/WETH variable debt without extra active reserves or eMode; other incidents need their own execution proof. Full state-root equivalence is not claimed. Dependency remediation, external security review and operator validation remain before funded production use.

Record the human-on-camera video under three minutes using the prepared live product, Neatlogs, Entire and cfo.ai tabs. A 2:58 narrated backup video is already hosted at https://poa-neathack.vercel.app/watch. It predates the default-AI improvement and shows the earlier 118-test release; use the current 125-test result when recording now.

The organizer's email requires **both** the official quote-tweet tagging **@neatlogs @EntireHQ @arithecfo** and the submission form. The October 12 window is **7:00–11:55 PM IST**, subject to final Discord cutoff changes. Neither publication nor form submission has been performed in this task. A public repo and deployed demo do not themselves submit the entry.

References: [official neatHack requirements](https://neatlogs.com/hackathon), [Entire Codex integration](https://entire.io/blog/getting-started-with-codex-in-entire-cli), [Entire security and redaction](https://github.com/entireio/cli/blob/main/docs/security-and-privacy.md). The later organizer email adds the explicit form and three-tag detection requirements.
