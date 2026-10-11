# POA (Proof of Audits)
> **Autonomous DeFi Incident Investigation & Cryptographic Restitution**  
> *From on-chain damage to verifiable cryptographic recovery.*

[![neatHack 2026](https://img.shields.io/badge/neatHack-2026_Entry-blue.svg)](https://neatlogs.com)
[![Team](https://img.shields.io/badge/Team-poa-cyan.svg)](https://neatlogs.com)
[![Neatlogs Traced](https://img.shields.io/badge/Neatlogs-Instrumented-00f2fe.svg)](https://neatlogs.com)
[![Entire Active](https://img.shields.io/badge/Entire-Checkpoint_Tracked-purple.svg)](https://entire.dev)
[![Foundry Tests](https://img.shields.io/badge/Foundry-11%2F11_Passing-emerald.svg)](https://getfoundry.sh)
[![Vitest](https://img.shields.io/badge/Vitest-6%2F6_Passing-emerald.svg)](https://vitest.dev)
[![EVMbench](https://img.shields.io/badge/EVMbench-5%2F5_Passing-emerald.svg)](evidence/evmbench_evaluation.json)
[![Base Mainnet Fork](https://img.shields.io/badge/Base_Mainnet-Fork_Verified-blue.svg)](scripts/run_base_fork.ts)
[![Docker Ready](https://img.shields.io/badge/Docker-Production_Containerized-2496ED.svg)](Dockerfile)

---

## 🎯 Executive Overview

When oracle glitches or protocol exploits trigger wrongful liquidations in DeFi, innocent borrowers suffer devastating losses. Today, recovery is broken:
- Protocols spend **$50,000+** on manual forensic audits.
- Victims wait **3 to 6 months** for subjective discord governance votes.
- Compensation spreadsheets are prone to human bias and calculation errors.

**POA** solves this by combining an **autonomous investigation agent**, **integer counterfactual balance-sheet replay**, and **on-chain Merkle distribution**:
1. **Detects & Pinpoints:** Identifies the exact transaction and block of an oracle price anomaly.
2. **Reconstructs Counterfactual Truth:** Simulates what borrower Net Equity would have been if the anomaly never occurred using precise integer arithmetic.
3. **Applies Policy Guardrails:** Distinguishes wrongful liquidations from borrowers who were already overleveraged prior to the drop.
4. **Verifiable On-Chain Restitution:** Publishes an OpenZeppelin Standard Merkle Tree root to a smart contract, enabling victims to claim verified payouts permissionlessly.

---

## 🏗️ System Architecture

```
                    ┌────────────────────────────────────────┐
                    │      On-Chain DeFi Incident (Anvil)    │
                    │  Faulty Oracle Update (-10% WETH Drop) │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│               POA Autonomous Investigator Agent (TypeScript)              │
│                                                                           │
│  [Span 1] inspectIncidentTx ──────► [Span 2] readContractState            │
│  [Span 3] collectLiqEvents  ──────► [Span 4] discoverAffectedAccounts     │
│  [Span 5] replayCounterfactual ───► [Span 6] crossCheckClaims             │
│  [Span 7] generateMerkleManifest ─► [Span 8] investigateOracleIncident    │
│                                                                           │
│  ┌───────────────────────┐                    ┌────────────────────────┐  │
│  │   Neatlogs Tracing    │                    │  Self-Healing Recovery │  │
│  │ Project: 542c53f4...  │                    │ RPC retry on partition │  │
│  └───────────────────────┘                    └────────────────────────┘  │
└───────────────────────────────────────┬───────────────────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │    RestitutionDistributor.sol          │
                    │  - registerIncident(merkleRoot)        │
                    │  - claim(amount, merkleProof)          │
                    │  - Duplicate claim prevention          │
                    │  - Tampered proof rejection            │
                    └────────────────────────────────────────┘
```

---

## 🏆 neatHack Sponsor & Partner Integrations

Every mandatory hackathon sponsor tool and partner API is deeply integrated into POA:

### 1. Neatlogs (AI Agent Tracing & Observability)
- **Project ID:** `542c53f4-ec26-4d57-a097-b7c9175c84be`
- **Tracing Module:** `src/observability/neatlogs.ts` & `src/agent/llm.ts`
- **Live LLM Telemetry:** Wrapped OpenAI/LiteLLM client using `neatlogs.wrapClient` routing to Claude Haiku (`https://litellm.vision.aivar.app/v1`). Accurately calculates input/completion tokens and model spend.
- **Hierarchical Trace Tree:** Captures 10 discrete spans (`AGENT`, `TOOL`, `CHAIN`, `GUARDRAIL`, `WORKFLOW`) per incident investigation.
- **Resilience Proof:** Includes self-healing logic that catches transient RPC failures, logs diagnostic warnings, and retries automatically.
- **Evidence Doc:** Full trace tree and span log documented in [`docs/NEATLOGS_EVIDENCE.md`](docs/NEATLOGS_EVIDENCE.md).

### 2. Entire (Continuous Memory, Graph & Git Checkpoints) — Target: *Best Use of Entire* Prize
- **CLI & Versions:** Entire CLI v0.11.4 (`entire`), Entire Graph v0.4.0 (`entire graph`), Entire Brain v0.1.0 (`entire-brain`).
- **Pillar 1: Checkpoints:** All session milestones tracked via Antigravity hooks. Official submission checkpoint: [`https://entire.io/gh/Proofofaudit/poa-neathack/commit/fc763245cd98965a4e260d31aa4b05cca59c4dbb`](https://entire.io/gh/Proofofaudit/poa-neathack/commit/fc763245cd98965a4e260d31aa4b05cca59c4dbb).
- **Pillar 2: Entire Graph:** Zero-egress code graph for instant symbol lookup, impact blast-radius analysis, and test coverage mapping (`entire graph search`).
- **Pillar 3: Entire Brain:** Continuous shared memory indexing 612 files, 1,929 symbols, and 4,841 relations with active background daemon `entire-brain-watch.service`.
- **Evidence Doc:** Detailed architecture and CLI outputs in [`docs/ENTIRE_EVIDENCE.md`](docs/ENTIRE_EVIDENCE.md).

### 3. cfo.ai (Financial Modeling & Unit Economics)
- **Live Interactive Model:** [https://cfo.ai/s/K8j_ybAD6DrlAI2j](https://cfo.ai/s/K8j_ybAD6DrlAI2j) (Built by Ari AI CFO across 6 detailed financial sheets)
- **Unit Economics:** Investigating an incident costs **$0.062** in LLM compute and L2 gas vs **$50,000+** for human forensic audit firms.
- **Pricing:** $3,500/mo SaaS subscription + 5% verified recovery success fee.
- **Gross Margins:** **99.8%** gross margin on recovery capital distribution; 21.0x LTV/CAC ratio.
- **Evidence Doc:** 18-month proforma model and LTV/CAC analysis in [`docs/CFO_AI_INPUTS.md`](docs/CFO_AI_INPUTS.md).

### 4. Crustdata (Partner Integration: On-Chain Entity Intelligence)
- **Module:** `src/agent/crustdata.ts`
- **Functionality:** Profiles on-chain liquidator and victim addresses (entity classification, AUM profiling, and institutional risk ratings) during incident triage.
- **Neatlogs Span:** Traced as `enrichIncidentWithCrustdata` tool span in the pipeline.

---

## ⚡ Quickstart & Reproducibility

### Prerequisites
- Node.js v20+ and npm
- Foundry (`forge`, `anvil`) installed in `~/.foundry/bin`

### 1. Run Complete Verification Suite (One Command)
Run the automated end-to-end verification script:
```bash
./scripts/demo_all.sh
```
This runs:
1. Foundry Smart Contract Tests (`forge test -v`) — **11/11 passing across 3 suites**.
2. TypeScript Financial Engine & Agent Tests (`npm test`) — **6/6 passing**.
3. Live Anvil Incident Staging, Agent Investigation, Merkle Claim, and Negative Adversarial Tests.

### 2. Live Base Mainnet Fork Restitution Runner
Run counterfactual forensics and on-chain claims against live Base Mainnet (Block #52,462,535) with real USDC and WETH contracts:
```bash
npm run demo:base-fork
```

### 3. 24/7 Autonomous Sentinel Watcher Daemon
Start the production block listener that monitors live RPC blocks and dispatches autonomous incident remediation when anomalies breach threshold:
```bash
npm run sentinel:watch
```

### 4. Machine-Checked EVMbench Benchmark Suite (ICML 2026 Aligned)
Execute the 5-part quantitative benchmark validating execution integrity, moral hazard prevention, collision defense, partition recovery, and Entire Graph prompt slicing:
```bash
npm run test:benchmark
```

### 5. Launch Model Context Protocol (MCP) Server
Launch the production MCP server over stdio JSON-RPC 2.0 with exposed tools (`poa_replay_counterfactual`, `poa_generate_merkle_manifest`, `poa_verify_claim_proof`):
```bash
npm run mcp
```

### 6. Launch the Interactive Next.js Dashboard & Claim Portal
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** to explore:
- **Autonomous Agent Timeline:** Step-by-step visual audit trail and live Neatlogs spans.
- **Counterfactual Replay Table:** Side-by-side health factor and loss calculations.
- **Cryptographic Claim Portal:** Interactive Merkle proof inspector and on-chain claim execution.
- **neatHack Sponsor Proof:** Interactive Neatlogs, Entire, and cfo.ai metrics.
- **Production Health Endpoint:** Check [`http://localhost:3000/api/health`](http://localhost:3000/api/health) for JSON diagnostic health data.

---

## 📐 Mathematical Counterfactual Engine

> 📖 **Peer-Reviewed Research Foundations:** Grounded in formal causal EVM execution models (*Origins of MEV*, arXiv:2604.27979; *TxRay*, arXiv:2602.01317; *EVMbench*, ICML 2026). See [`docs/RESEARCH_FOUNDATIONS.md`](docs/RESEARCH_FOUNDATIONS.md) for the complete academic literature synthesis.

When collateral price drops from baseline $P_{\text{baseline}}$ ($2,000) to faulty price $P_{\text{faulty}}$ ($1,800), liquidators seize collateral at a 5% discount:
$$\text{Collateral Seized} = \frac{\text{Debt Covered} \times 1.05}{P_{\text{faulty}}}$$

The POA Engine reconstructs the counterfactual position:
$$\text{Net Equity}_{\text{counterfactual}} = (\text{Collateral}_{\text{initial}} \times P_{\text{baseline}}) - \text{Debt}_{\text{initial}}$$
$$\text{Net Equity}_{\text{post-liquidation}} = (\text{Collateral}_{\text{remaining}} \times P_{\text{baseline}}) - \text{Debt}_{\text{remaining}}$$
$$\text{Restitution Due} = \max(0, \text{Net Equity}_{\text{counterfactual}} - \text{Net Equity}_{\text{post-liquidation}})$$

### Verified Test Positions in Demo Run:
- **Borrower 1 (0x3C44...):** Baseline HF = 1.066 (Healthy). Faulty HF = 0.960. Liquidated 8.75 WETH. Restitution = **$2,500.00 USDC** (`ELIGIBLE_WRONGFUL`).
- **Borrower 2 (0x90F7...):** Baseline HF = 1.066 (Healthy). Faulty HF = 0.960. Liquidated 4.375 WETH. Restitution = **$1,250.00 USDC** (`ELIGIBLE_WRONGFUL`).
- **Borrower 3 (0x15d3...):** Baseline HF = 1.066 (Healthy). Faulty HF = 0.960. Liquidated 7.000 WETH. Restitution = **$2,000.00 USDC** (`ELIGIBLE_WRONGFUL`).
- **Borrower 4 (0x9965...):** Baseline HF = 1.600. Not liquidated. Restitution = **$0.00** (`EXCLUDED_UNHARMED`).
- **Borrower 5 (0x976E...):** Baseline HF = 0.987 (Already underwater). Legitimate liquidation. Restitution = **$0.00** (`EXCLUDED_LEGITIMATE`).

**Total Restitution:** **$5,750.00 USDC**.

---

## 🔒 Smart Contracts & Cryptographic Proofs

Implemented in `contracts/src/`:
- `DemoOracle.sol`: Simulates price updates and timestamps.
- `DemoLendingPool.sol`: Overcollateralized lending pool with collateral deposit, debt borrowing, and liquidation logic.
- `RestitutionDistributor.sol`: Merkle-based restitution distributor verifying OpenZeppelin double-hash leaf proofs:
  ```solidity
  bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(claimIndex, claimant, amount, policyHash))));
  ```
- `CumulativeRestitutionDistributor.sol`: Multi-epoch cumulative claim distributor modeled after Morpho Blue / Euler. Prevents second-preimage collision attacks and allows streaming tranches across multiple recovery epochs.
- `EIP712RestitutionDistributor.sol`: Relayer-sponsored gasless restitution distributor allowing drained victims with 0 ETH to sign an EIP-712 typed voucher and receive restitution directly.
- `MockERC20.sol`: Standard 18-decimal WETH and 6-decimal USDC tokens.

### Negative Adversarial Tests Verified (11/11 Foundry Tests):
- **Duplicate Claim:** Second claim call with identical proof reverts with `"Claim has already been executed"`.
- **Tampered Amount:** Claim with modified amount reverts with `"Invalid Merkle proof"`.
- **Expired EIP-712 Signature:** Expired signatures revert with `"Claim signature has expired"`.
- **Forged EIP-712 Signer:** Forged signatures from unauthorized parties revert with `"Invalid EIP-712 claimant signature"`.
- **Second-Preimage Defense:** OZ double-Keccak-256 leaves immunity against 64-byte intermediate node collision exploits.

---

## 📂 Repository Layout

```
poa-neathack/
├── contracts/               # Foundry smart contracts suite
│   ├── src/                 # DemoOracle, LendingPool, RestitutionDistributor, Cumulative, EIP712
│   └── test/                # 3 test suites: LendingAndRestitution, Cumulative, EIP712 (11/11 passing)
├── src/
│   ├── agent/               # Autonomous investigator agent & retry handler
│   ├── app/                 # Next.js 14 App Router dashboard, health check & claim portal
│   ├── chain/               # Anvil DeFi incident simulator fixture
│   ├── economics/           # Counterfactual replay engine (BigInt math)
│   ├── mcp/                 # Model Context Protocol stdio JSON-RPC 2.0 server
│   ├── observability/       # Neatlogs SDK tracing integration
│   └── proofs/              # OpenZeppelin StandardMerkleTree generator
├── scripts/
│   ├── demo_all.sh          # Master test & demo verification runner
│   ├── run_demo.ts          # End-to-end Anvil execution & payout script
│   ├── run_base_fork.ts     # Live Base Mainnet Fork restitution runner
│   ├── watch_production_sentinel.ts # 24/7 autonomous block watcher daemon
│   └── benchmark_evmbench.ts # ICML 2026 aligned EVMbench harness
├── docs/
│   ├── BUILD_STATUS.md      # Milestone completion tracker
│   ├── NEATLOGS_EVIDENCE.md # Neatlogs Project ID & trace tree evidence
│   ├── ENTIRE_EVIDENCE.md   # Entire CLI git checkpoint history
│   ├── CFO_AI_INPUTS.md     # Financial model & unit economics
│   ├── RESEARCH_FOUNDATIONS.md # Peer-reviewed academic foundations
│   └── PAIN_PMF_ENGINEERING_MARVEL.md # Real-world pain, PMF & engineering
├── evidence/
│   ├── run_evidence.json    # Complete reproducible on-chain evidence output
│   ├── restitution_manifest.json # SHA-256 sealed proof-carrying restitution manifest
│   └── evmbench_evaluation.json # Official 5/5 EVMbench machine-checked report
├── Dockerfile               # Multi-stage production container build
├── docker-compose.yml       # Production stack orchestration
└── hackathon.md             # neatHack build log companion
```

---

## 👥 Team
- **Team Name:** poa (Proof of Audits)
- **Team Lead:** MKVEERENDRA VAMSHI
