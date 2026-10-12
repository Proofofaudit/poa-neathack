# Current submission story

Lead with the real Aave investigation, saved verified execution replay and evidence-based compensation withholding. Use `docs/submission/DEMO_STORYBOARD.md` for the updated under-three-minute video. The older guide below describes the separate synthetic compensation case only. It must not be presented as the current real-case scope.

# POA submission guide

## One sentence

POA turns an oracle liquidation dispute into an evidence-backed compensation proposal and a verifiable claim—even for a recipient with zero ETH.

## Three-minute demonstration

**0:00–0:25 — Problem.** A liquidation executes immediately. A wronged borrower must then persuade a protocol to reconstruct what happened. POA makes that reconstruction and proposed entitlement inspectable.

**0:25–0:45 — Scope.** Say explicitly: “This is a synthetic lending incident executed on an actual local EVM or a pinned Base fork. It is not a recovered historical exploit.” Show the environment and saved-run timestamp.

**0:45–1:25 — Evidence.** Run the local demo. Show that the investigator receives only contract addresses and the incident transaction—not borrower balances or liquidation fixtures. Open the anchored baseline block, incident receipt and four liquidation events.

**1:25–1:55 — Who qualifies.** Three solvent borrowers crossed the liquidation threshold. The pre-insolvent borrower is excluded, and two untouched borrowers receive zero. The eligible total is 5,750 test USDC. Explain that this is a scoped equity-loss policy, not a claim that every liquidation deserves reimbursement.

**1:55–2:25 — Payment.** Show the registered root, claim receipt and recipient balance increase. The recipient has zero ETH before and after; a forwarding caller pays gas and cannot redirect the leaf's payout.

**2:25–2:45 — Failure is a result.** Show the executed tampered/duplicate claim checks and the missing-receipt safety stop. Explain that invalid model output also withholds the entire manifest.

**2:45–3:00 — Next milestone.** Dedicated production protocol adapters, independent market references, treasury governance and an external contract audit. End with the evidence package, not an unsupported deployment claim.

## Questions to prepare for

**Why AI?** Optional model review can summarize collected evidence and veto ambiguous cases. The current controller, eligibility checks and amounts are deterministic. A model cannot invent balances or authorize a treasury transfer. Do not imply the default demo makes live model calls.

**What is autonomous?** The controller performs evidence collection, bounded read recovery, rule evaluation, replay, consistency checks and proposal generation. The sentinel observes real oracle changes. An owner remains responsible for funding and approving a root. This is bounded automation, not unconstrained treasury control.

**What is novel?** The integration: historical evidence → explicit eligibility → exact equity delta → token-funded claim, with observable safety stops and proof of payment. Present this as a product workflow contribution; do not claim new cryptography or formal causal inference.

**What does Base add?** A pinned execution environment and actual EVM interactions against a fork. The lending scenario remains synthetic. Fork receipts are not public mainnet receipts.

**What about moral hazard?** Pre-insolvent accounts are excluded. Unsupported or ambiguous cases receive no automatic entitlement. A production policy would need independent governance and dispute resolution.

**What is the trust assumption?** The current demo uses a separately deployed synthetic reference oracle, a known demo protocol and an owner-approved root. A production reference feed, root publisher and treasury must be governed and audited independently.

**Does this run official EVMbench?** No. The project has its own regression tests and measured Merkle timings. No competition score, academic endorsement or official security grading is claimed.

## Submission checklist

- Run `npm run verify:release` and keep the actual output.
- Rehearse from a clean checkout with `npm ci`; do not depend on untracked contract artifacts.
- Check the evidence schema, timestamp, block hashes, recipient balances and current source revision.
- Capture a short recording of the actual run and keep JSON evidence as a backup.
- Show the local demo if the public fork provider is unavailable; label the environment honestly.
- Ensure all exposed provider credentials have been rotated. Never display `.env` files.
- Read the event's actual rubric and required sponsor integration rules before submitting. This guide does not assume a particular judging rubric or guarantee a win.

## Rubric-specific package added after the technical upgrade

Use `/judges` for the evidence walkthrough. The regression evaluation compares the same twelve synthetic inputs against the pinned old arithmetic module and current code: 3/12 correct amounts and eight unsupported positive authorizations before, 12/12 and zero after. This is not a production accuracy estimate.

The recovery demo injects a transient failure and a range limit. Actual SDK spans show failed log queries, bounded retry and range partitioning before successful completion. The independent claim auditor verifies conservation and inclusion proofs before approval. Optional model-directed review has an eight-turn read-only tool budget; controlled-response tests verify its guardrails, while saved default demos use deterministic rules.

Entire Graph search/impact output and targeted verification are in the evidence directory. Neatlogs remote-readback evidence, when VERIFIED_READBACK, establishes the project's persisted traces separately from the local SDK diagnostic.

The commercial plan, explicit assumptions, calculated CSV, ready-to-paste cfo.ai prompt, timed storyboard and unpublished launch copy are in `docs/submission/`. Actual cfo.ai workspace output, the completed video and public submission remain distinct steps; do not replace them with local documents or claim they already happened.
