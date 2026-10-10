# neatHack 2026 Build Companion — Team poa

## Project
- **Name:** POA (Proof of Audits)
- **Tagline:** Autonomous DeFi Incident Investigation and Restitution
- **One-Sentence Purpose:** POA reconstructs on-chain DeFi incidents, proves which users suffered wrongful losses under an explicit compensation policy, and executes cryptographically verifiable restitution on-chain.
- **Problem:** When oracle anomalies or protocol exploits trigger wrongful liquidations, victims face opaque manual recovery processes lasting months. Protocols have no autonomous, verifiable way to audit damage, calculate fair restitution, and prove payouts without human bias.

## Team
- **Team Name:** poa (Proof of Audits)
- **Team Lead:** MKVEERENDRA VAMSHI

## Stack & Mandatory Tools
- **Blockchain Core:** Solidity, Foundry, Anvil local test chain, ethers v6
- **Cryptographic Payouts:** OpenZeppelin Contracts, `@openzeppelin/merkle-tree`
- **Agent Orchestration:** TypeScript, deterministic tool registry, stateful replay machine
- **Observability (Mandatory #1):** Neatlogs TypeScript SDK (`neatlogs`) — Project ID `542c53f4-ec26-4d57-a097-b7c9175c84be`
- **Agent Memory & Checkpoints (Mandatory #2):** Entire CLI (`entire`) — Antigravity Agent integration
- **Financial Planning (Mandatory #3):** cfo.ai — Unit economics, token cost vs audit fees, gross margins
- **Frontend & App:** Next.js 14 App Router, Tailwind CSS, Lucide icons

## Build Log

### [2026-10-10] Milestone B: Solidity Lending & Restitution Contracts
- Implemented `MockERC20.sol`, `DemoOracle.sol`, `DemoLendingPool.sol`, `RestitutionDistributor.sol`.
- Implemented comprehensive Foundry test suite `LendingAndRestitution.t.sol`: 5/5 passing tests.

### [2026-10-10] Milestone C & D: Financial Truth Engine & Autonomous Agent
- Implemented `src/economics/counterfactual.ts` with precise BigInt health factor and restitution math.
- Implemented `src/proofs/merkle.ts` using OpenZeppelin `StandardMerkleTree` for verifiable distribution.
- Implemented `src/agent/investigator.ts` with tool coordination, guardrails, and self-healing RPC retry logic.
- Implemented `src/observability/neatlogs.ts` supporting Project ID `542c53f4-ec26-4d57-a097-b7c9175c84be`.
- Verified 6/6 Vitest unit tests in `tests/investigation.test.ts`.

### [2026-10-10] Milestone E & F: End-to-End Orchestrator & Live Verification
- Implemented `src/chain/simulator.ts` for reproducible Anvil incident staging.
- Created `scripts/run_demo.ts` and master bash runner `scripts/demo_all.sh`.
- Executed full 5-phase on-chain incident simulation, autonomous investigation, Merkle authorization, and claim payout.
- Captured negative adversarial tests: duplicate claims and tampered Merkle proofs rejected on-chain.
- Emitted and saved reproducible evidence to `evidence/run_evidence.json`.

### [2026-10-10] Milestone G: Interactive Next.js Dashboard & Claim Portal
- Implemented modern Next.js 14 App Router UI with Tailwind CSS in `src/app/`.
- Built KPI metrics bar: Lending TVL ($86k), -10% Oracle Anomaly, 3 Wrongful Liquidations, $5,750 Verified Restitution, Merkle Root, Neatlogs Spans.
- Built 4 interactive tabs:
  1. Autonomous Agent Timeline with full step-by-step audit logs and live Neatlogs spans.
  2. Counterfactual Replay Table auditing all 5 borrower positions with baseline vs faulty Health Factors.
  3. Cryptographic Claim Portal with interactive Merkle proof inspector and on-chain security guardrails.
  4. neatHack Sponsor Proof hub detailing Neatlogs, Entire, and cfo.ai integrations.
- Built API routes `/api/evidence` and `/api/run-simulation` for live on-chain simulation triggers from the browser.
- Verified production build: `npm run build` completed with 0 errors.

### [2026-10-10] Milestone H: Sponsor Evidence, Financial Modeling & Submission Pack
- Created `docs/NEATLOGS_EVIDENCE.md` documenting Project ID `542c53f4-ec26-4d57-a097-b7c9175c84be`, 8-span hierarchical execution tree, and RPC self-healing recovery.
- Created `docs/ENTIRE_EVIDENCE.md` mapping immutable Git checkpoints across Milestones A through H and agent session memory.
- Created `docs/CFO_AI_INPUTS.md` presenting unit economics ($0.062 COGS per incident, 99.8% recovery fee margin, 21.0x LTV/CAC ratio, 18-month proforma).
- Created `docs/DEMO_SCRIPT.md` providing a second-by-second 3-minute video presentation guide.
- Created root `README.md` with architectural schematics, quickstart guide, and mathematical specifications.

## Demo
- **Status:** Verified On-Chain + UI Complete + Documentation Complete (Milestones A-H complete)
- **Scenario:** Faulty oracle price drop triggering wrongful liquidations on a simulated lending pool -> autonomous investigation -> counterfactual replay -> deterministic compensation calculation -> Merkle tree generation -> authorized restitution payout.

## Known Limitations & Safety Boundaries
- Supports simulated DeFi lending oracle incidents on local Anvil test chains.
- Does not reverse finalized public blockchain transactions; restitution requires dedicated recovery fund backing.
- All scenario balances and contracts operate on local test fixtures.

## Submission Checklist
- [x] neatHack Web check-in confirmed
- [x] Entire CLI installed and connected to Antigravity
- [x] Neatlogs Project ID assigned (`542c53f4-ec26-4d57-a097-b7c9175c84be`)
- [x] Working Solidity contracts with passing Foundry test suite (5/5 tests passing)
- [x] Counterfactual engine & deterministic loss calculation
- [x] Autonomous agent with transient failure recovery (6/6 tests passing)
- [x] Neatlogs SDK instrumented with genuine trace evidence (`docs/NEATLOGS_EVIDENCE.md`)
- [x] End-to-end on-chain Anvil scenario runner & negative tests
- [x] Next.js interactive web app UI (Milestone G)
- [x] Entire Git checkpoints captured across milestones (`docs/ENTIRE_EVIDENCE.md`)
- [x] cfo.ai financial plan exported (`docs/CFO_AI_INPUTS.md`)
- [x] 3-minute reproducible demo video script (`docs/DEMO_SCRIPT.md`)
- [ ] Public GitHub repository push and X quote-post submission
