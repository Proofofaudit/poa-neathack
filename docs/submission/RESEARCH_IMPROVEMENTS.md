# Online research and implemented improvements — 12 October 2026

## Why this change

The [official neatHack rubric](https://neatlogs.com/hackathon) assigns 30% to completing a substantial agent task, 25% to effective use of neatlogs, Entire and cfo.ai, and 20% to the demo. Its evidence requirements explicitly ask for failure recovery, before/after runs, inspectable sponsor evidence and public code. This makes a reproducible investigation outcome more useful than another unsupported product claim.

[Anthropic's agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) distinguishes actual environment outcomes from what an agent says it accomplished and recommends examining execution traces alongside outcomes. We applied that principle to POA's existing real-EVM synthetic protocol.

The [neatlogs human evaluation documentation](https://docs.neatlogs.com/docs/features/evals/human-evaluators) describes evaluations completed within neatlogs. Our local evaluation is separate; it does not turn the email digest's zero completed evaluations into a claimed native evaluation.

## Implemented

- A full-investigation evaluation runs seven controlled scenarios: normal execution, one transient query failure, a provider range limit, a persistent query outage, a missing receipt, an invalid reference and an unsupported protocol.
- An evaluator separate from the investigator verifies exact per-claim allocations, liability, historical discovery, inclusion proofs, linked SDK traces and the intended reason for a safety stop. An unrelated failure cannot pass a negative scenario.
- Mission verdicts distinguish completion, recovery, safe withholding and unexpected outcomes. Failed SDK spans remain errors and remain visible.
- The judge page displays scenario-level outcomes, trace identities, failed span counts and observed duration. The release gate and CI artifact list include the evaluation.
- Grader tests reject tampered proofs, wrong allocations with valid proofs, trace mismatches, unsupported recovery claims, retained payment packages after withholding and unrelated stop reasons.

## Limits

All seven scenarios use one synthetic lending fixture deployed on a local EVM. They do not establish production reliability or historical exploit compatibility. Default execution uses deterministic rules; live model quality remains unverified. Evaluation runs prepare candidate manifests but do not transact payouts; the separate demonstration verifies the sponsored test-token claim.

The October 11 digest covers a different collection of runs. The new evaluation does not diagnose or relabel its eleven failures. Authenticated dashboard access is still needed to inspect those specific executions.

Actual cfo.ai business-plan output, final narrated video, public code updates and genuine community posts remain necessary. No research result or code change guarantees a prize.
