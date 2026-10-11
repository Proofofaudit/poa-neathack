# 3-Minute Demo Video Recording Script

**Project:** POA (Proof of Audits)  
**Hackathon:** neatHack 2026  
**Team Name:** poa (Proof of Audits)  
**Presenter:** MKVEERENDRA VAMSHI  
**Duration:** Exactly 3 minutes (180 seconds)  
**Target Video Format:** 1080p / 60fps, screen recording + voiceover  

---

## Pre-Recording Setup Checklist
1. Open Browser Tab 1: `http://localhost:3000` (Next.js Dashboard).
2. Open Terminal Window (Split Screen or Full Width): `~/poa-neathack`.
3. Ensure Anvil is ready or let `demo_all.sh` launch it automatically.
4. Have Discord / GitHub submission links bookmarked.

---

## Second-by-Second Video Script

### [0:00 - 0:30] The Problem: The $2.8B DeFi Restitution Crisis
**Visual:** Browser dashboard showing the header: *POA | Autonomous DeFi Incident Investigation and Restitution*.  
**Voiceover:**
> "Hi, I'm Vamshi representing team **poa** for neatHack 2026.  
> When oracle glitches or faulty flash crashes hit DeFi protocols, innocent borrowers get liquidated unfairly. Today, recovering those losses is broken. Victims wait 3 to 6 months for manual forensic audits, discord governance votes, and subjective compensation spreadsheets that cost protocols over $50,000 per incident.  
> We built **POA**—an autonomous AI agent that investigates on-chain incidents, computes the exact counterfactual balance-sheet delta using integer math, and publishes a cryptographic Merkle root for instant, trustless restitution on-chain."

---

### [0:30 - 1:15] Autonomous Agent & Financial Truth Engine in Action
**Visual:** Switch to Terminal and run `./scripts/demo_all.sh`. Show live execution of Foundry contracts, Vitest suite, and the Anvil incident runner.  
**Voiceover:**
> "Let's watch this happen live on a local EVM network.  
> First, our script deploys a lending pool, an oracle, and seeds 5 real borrowers with WETH collateral and USDC debt.  
> Then, a faulty oracle update triggers an unexpected 10% price drop from $2,000 to $1,800, instantly triggering liquidations.  
> Now our POA Autonomous Investigator Agent steps in. It parses the on-chain logs, reconstructs what each borrower’s Health Factor would have been under counterfactual normal conditions, and distinguishes wrongful liquidations from borrowers who were already overleveraged.  
> All 5 Foundry smart contract tests pass, all 6 agent tests pass, and in under 2 seconds, our agent calculates exactly $5,750.00 USDC in verified restitution across 3 genuine victims."

---

### [1:15 - 2:00] Cryptographic Claims & Adversarial On-Chain Guardrails
**Visual:** Switch to Browser Tab (`http://localhost:3000`). Click on **Counterfactual Replay**, then switch to **Cryptographic Claims**.  
**Voiceover:**
> "Here on our executive dashboard, you can see the complete counterfactual audit table.  
> Borrowers 1, 2, and 3 had healthy baseline factors above 1.066 and are classified as `ELIGIBLE_WRONGFUL`. Borrower 5 was already underwater prior to the drop and is correctly excluded.  
> Next, our agent generates an OpenZeppelin Standard Merkle Tree and registers the incident in the `RestitutionDistributor` contract on-chain.  
> Under our Claim Portal, Victim 1 claims their $2,500 USDC payout with a verifiable Merkle proof.  
> Most importantly, we tested adversarial edge cases: when a user attempts a duplicate claim, it fails on-chain with 'Claim already executed'. When someone tampers with the compensation amount, the Merkle proof check fails instantly. Restitution is completely tamper-proof."

---

### [2:00 - 2:40] neatHack Sponsor & Partner Integrations
**Visual:** Click on the **neatHack Sponsor Proof** tab on the dashboard, displaying Neatlogs, Entire, cfo.ai, and Crustdata cards.  
**Voiceover:**
> "POA is deeply powered by all hackathon sponsor and partner technologies:  
> **1. Neatlogs:** Under Project ID `542c53f4-ec26-4d57-a097-b7c9175c84be`, our agent records 10 hierarchical trace spans using the official TypeScript SDK. We wrapped LiteLLM Claude Haiku so prompt tokens, completion tokens, and model spend track directly. Even during simulated RPC network timeouts, Neatlogs logs diagnostic warnings while our agent autonomously self-heals.  
> **2. Entire (Checkpoints, Graph & Brain):** We deployed Entire's complete triple-pillar ecosystem. Checkpoints link our agent decisions directly to Git commits on `main`. Entire Graph indexes our code AST for instant symbol navigation, and Entire Brain maintains continuous memory across 1,929 symbols with a live background watcher daemon.  
> **3. cfo.ai:** Automating forensic investigations slashes compute COGS to just $0.062 per incident versus $50,000+ for human auditors. We modeled a SaaS plus 5% contingency fee structure yielding a 99.8% gross margin, 21x LTV/CAC, and profitability by month 12.  
> **4. Crustdata:** We enrich every on-chain victim and liquidator address with institutional risk ratings and AUM profiling during incident triage."

---

### [2:40 - 3:00] Closing & Submission
**Visual:** Zoom out to show full dashboard with glowing verified badges, team name `poa`, and GitHub repository.  
**Voiceover:**
> "POA takes DeFi from on-chain damage to cryptographically verifiable recovery in seconds.  
> The entire repository, contract suite, Next.js frontend, and verification logs are open-source and reproducible with a single bash command.  
> Thank you to the neatHack organizers and sponsors!"

---

## Recording Tips
- Keep screen resolution crisp at 1920x1080.
- Clear browser history bar and bookmarks for a clean professional aesthetic.
- Terminal text size: 14pt-16pt with high contrast.
