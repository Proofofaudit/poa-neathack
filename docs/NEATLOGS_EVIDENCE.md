# Neatlogs Integration & Trace Evidence

## Sponsor Overview & Setup
- **Sponsor:** Neatlogs (AI Agent Tracing & Observability)
- **neatHack Team:** poa (Proof of Audits)
- **neatHack Project ID:** `542c53f4-ec26-4d57-a097-b7c9175c84be`
- **Workflow Name:** `poa-incident-investigation`
- **Tracing Module:** `src/observability/neatlogs.ts`
- **Agent Coordinator:** `src/agent/investigator.ts`

### Environment Configuration
The project securely reads the API key and Project ID from the local environment (`.env`) without checking any secret into source control:
```bash
NEATLOGS_API_KEY=<your-neatlogs-api-key>
NEATLOGS_PROJECT_ID=542c53f4-ec26-4d57-a097-b7c9175c84be
```

---

## Dual-Mode Tracing Engine Architecture
The POA agent implements a dual-mode tracing engine:
1. **Live Cloud Tracing:** When `NEATLOGS_API_KEY` is present, it connects directly to Neatlogs' backend via the official `neatlogs` TypeScript SDK (`neatlogs.init`).
2. **Deterministic Local Auditor Trace:** When running in local CI/offline test suites (or during Foundry/Anvil scenario replication), it captures high-fidelity OpenTelemetry-aligned spans into memory and serializes them into `evidence/run_evidence.json`.

---

## Recorded Incident Investigation Trace Tree
During the autonomous DeFi incident investigation, the agent executes eight hierarchical spans tracing every tool call, mathematical invariant verification, and cryptographic Merkle tree synthesis:

```
[Trace: trace-1791639459215-ie1ux] (Total: 55ms, Status: OK)
│
├── [TOOL] inspectIncidentTransaction (0ms) -> Status: OK
│     Attributes: { "txHash": "0x2e3c67d0d714464945054719e45133baa55b477aed7a7170950a36c0d19497ca" }
│     Description: Pinpointed the exact on-chain transaction that triggered the -10.0% oracle price deviation.
│
├── [TOOL] readContractState (0ms) -> Status: OK
│     Attributes: { "oracleAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" }
│     Description: Extracted lending pool configuration (80% liquidation threshold, 5% liquidator incentive).
│
├── [TOOL] collectLiquidationEvents (0ms) -> Status: OK
│     Attributes: { "poolAddress": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" }
│     Description: Filtered all LiquidationCall events emitted in the incident block window.
│
├── [TOOL] discoverAffectedAccounts (0ms) -> Status: OK
│     Attributes: { "eventsCount": 3 }
│     Description: Mapped borrower addresses and aggregated collateral seized vs debt covered.
│
├── [CHAIN] replayCounterfactual (1ms) -> Status: OK
│     Attributes: { "affectedAccountsCount": 3 }
│     Description: Evaluated BigInt integer health factors under counterfactual $2,000 reference price.
│
├── [GUARDRAIL] crossCheckClaims (0ms) -> Status: OK
│     Attributes: { "verifiedCount": 3 }
│     Description: Enforced policy invariant: Net Loss > 0, excluded already underwater positions, capped at $10k/claim.
│
├── [TOOL] generateMerkleManifest (26ms) -> Status: OK
│     Attributes: { "claimsCount": 3 }
│     Description: Synthesized OpenZeppelin StandardMerkleTree with double keccak256 leaf hashes.
│
└── [WORKFLOW] investigateOracleIncident (28ms) -> Status: OK
      Attributes: {
        "incidentId": "0x439624154edbcaddd0f50b0a00372a5611b5589f7282da15a15aab0c9bf691c7",
        "incidentTxHash": "0x2e3c67d0d714464945054719e45133baa55b477aed7a7170950a36c0d19497ca"
      }
      Description: Coordinated entire restitution pipeline and published verifiable payout root.
```

---

## Agent Resilience & Failure Recovery Tracing
To demonstrate agent robustness under adverse conditions, `tests/investigation.test.ts` injects a simulated RPC network drop during the investigation workflow:
1. When the JSON-RPC connection times out, Neatlogs records a `WARN` span with error diagnostics (`RPC_TIMEOUT: connection terminated unexpectedly`).
2. The agent activates its exponential backoff self-healing retry hook.
3. The connection is cleanly re-established, the workflow resumes without data loss, and the parent `investigateOracleIncident` span concludes with status `OK`.

This proves that Neatlogs provides full operational visibility into transient failures and autonomous self-healing behavior.
