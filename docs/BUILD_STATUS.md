# Verified build status — 12 October 2026

This local revision replaces the previous production-upgrade claims with a reproducible, evidence-driven prototype. The public evidence viewer is deployed at https://poa-neathack.vercel.app. The protocol has not been independently audited or deployed to control a mainnet treasury.

## Completed verification

- TypeScript type checking: passed.
- JavaScript/TypeScript tests: 125 passed, including investigation policy, RPC recovery, API authorization and the MCP stdio flow.
- Solidity tests: 20 passed, including 256 fuzz cases for partial-claim/sweep accounting.
- Local EVM demonstration: passed; six borrowers, four observed liquidations, three eligible claims totaling 5,750 test USDC, one pre-insolvent exclusion and two untouched positions.
- Pinned Base fork demonstration: passed with the same synthetic protocol scenario. These are isolated fork transactions, not public Base payments or a reconstruction of a historical exploit.
- Sponsored claim: recipient gained exactly 2,500 test USDC while holding zero ETH. Tampered proof, duplicate claim and missing-receipt checks passed.
- Offline evidence consistency: Merkle proofs, replay amounts, token binding, manifest checksum, source fingerprint and recorded balance delta passed. This check does not independently authenticate RPC responses.
- Project-owned benchmark: six cases passed, including proof generation and verification for 10, 100 and 1,000 claims. This is not an official EVMbench evaluation.
- Full-investigation evaluation: seven expected outcomes, including two recoveries and four safe withholds. Failed SDK spans remain recorded. This controlled rules-only scenario set is not production reliability.
- Next.js production build: passed.
- Browser and production review: public incident room and seven-scenario judge table visually checked. Local and Base evidence endpoints return the expected chain IDs. Health returned HEALTHY. Public simulation POST returns 403. The narrated video loads without a browser media error, is 166.752 seconds long, and its downloaded bytes match the local export. The cfo.ai spreadsheet download returns 200.
- Public demo: https://poa-neathack.vercel.app/watch. Captions, actual neatlogs provider footage, Entire Graph evidence and the actual cfo.ai forecast are included. The video uses a disclosed synthetic voice.
- Source consistency: seven current evidence artifacts match the final source fingerprint. Earlier failed model runs retain their historical fingerprints.
- Credential scan: 136 deployable repository files, including spreadsheet XML, contained no configured credential values. .env files and local authentication/session directories are excluded from deployment.

Run `npm run verify:release` for the local release gate. Run `npm run demo:base-fork` and the evidence verifier for the optional Base check. A CI workflow is included but has not been executed remotely for these unpushed changes.

## Trust boundaries and remaining work

A historical Aave Base adapter now reconstructs supported USDC/WETH positions and reads independent exchange references. The example has a saved verified local execution replay. Other incidents still require their own replay, supported-state checks and independent fault evidence. The owner reviews and publishes payouts; the agent does not control a mainnet treasury.

Live LLM and telemetry calls are disabled by default. Six explicit remote neatlogs project traces have passed authenticated read-back, separately from the local defaults. Genuine Claude Haiku inference and four model-directed read-only actions completed, with 5,275 total recorded model tokens. Earlier format failures are retained; a strict fenced-JSON parser and bounded correction handle the observed provider behavior. The optional eight-turn model/tool review has eight controlled-response guardrail tests plus three parser tests. Entire Graph search/impact and targeted verification outputs have been collected with completeness warnings retained. Crustdata identity attribution is not implemented. The sentinel polls confirmed data; it is not a mempool or TWAP monitor.

Previously exposed provider credentials still require immediate revocation and replacement in their provider accounts. Local source changes cannot revoke them. Complete provider rotation, confirm competition eligibility and sponsor requirements, and rehearse the submission guide before submitting.

## Dependency limitation

The framework was upgraded to Next.js 16.4.0 / React 19.3.0 on Node 24. The installed dependency audit still reports 31 advisories across direct and transitive packages, including development tooling and the telemetry dependency tree. Safe automatic fixes did not clear them. Major dependency migrations need separate validation; this evidence-viewer deployment is not a claim of audited production security. Keep public execution disabled and resolve these advisories before exposing a production agent service.

The primary `/live` flow now investigates a real Aave liquidation. Its original execution reproduces mainnet gas and 25 logs, and six price scenarios were executed locally. Both spot references still liquidate, so compensation remains unjustified by the evidence. The hosted agent revalidates saved proof. The updated narrated video is under three minutes; synthetic claim footage is separately labelled. See `docs/REAL_LIQUIDATION_INVESTIGATION.md`.

Current verification and public links: `docs/SUBMISSION_VERIFICATION.md`. Default public Claude example works without credential entry; custom-transaction AI remains restricted. Public code commit adf3bbb and its genuine Entire checkpoint are published.
