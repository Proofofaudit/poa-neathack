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

### [2026-10-10] Milestone A: Foundation & Environment Verification
- Initialized clean git repository in `~/poa-neathack` on `main` branch.
- Installed Entire CLI v0.11.4 and integrated with Antigravity agent (`entire enable`).
- Verified local Foundry suite (Foundry/Anvil/Forge/Cast).
- Created package manifests, `.env.example`, and hackathon tracking artifacts.
- Created `docs/BUILD_STATUS.md`.

## Demo
- **Status:** In progress (Milestone A complete)
- **Scenario:** Faulty oracle price drop triggering wrongful liquidations on a simulated lending pool -> autonomous investigation -> counterfactual replay -> deterministic compensation calculation -> Merkle tree generation -> authorized restitution payout.

## Known Limitations & Safety Boundaries
- Supports simulated DeFi lending oracle incidents on local Anvil test chains.
- Does not reverse finalized public blockchain transactions; restitution requires dedicated recovery fund backing.
- All scenario balances and contracts operate on local test fixtures.

## Submission Checklist
- [x] neatHack Web check-in confirmed
- [x] Entire CLI installed and connected to Antigravity
- [x] Neatlogs Project ID assigned (`542c53f4-ec26-4d57-a097-b7c9175c84be`)
- [ ] Working Solidity contracts with passing Foundry test suite
- [ ] Counterfactual engine & deterministic loss calculation
- [ ] Neatlogs SDK instrumented with genuine trace evidence
- [ ] Entire Git checkpoints captured across milestones
- [ ] cfo.ai financial plan exported
- [ ] 3-minute reproducible demo video
- [ ] Public GitHub repository and X quote-post submission
