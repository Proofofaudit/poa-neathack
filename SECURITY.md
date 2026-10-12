# Security boundary

POA is a hackathon prototype, not an audited production compensation system. Use test tokens and isolated sandboxes only.

## Exposed credentials

Credentials pasted into prior task logs must be revoked/rotated at their providers. Editing source code or deleting a transcript does not revoke a key. Review provider usage, billing and access logs, and remove credentials from shared artifacts. Do not commit `.env` files. External model and telemetry calls are now opt-in and disabled in the standard demo.

## Treasury authority

The investigator produces a proposal. The distributor owner registers it. Root correctness, token behavior and treasury governance remain trust assumptions. The distributor verifies membership and limits spending to each incident's remaining budget; it cannot prove an economic claim from a Merkle root alone. Fee-on-transfer and rebasing payout assets are unsupported operationally. Production requires a token allowlist, governance, dispute policy, monitoring and independent audit.

## Evidence scope

The supported adapter reads historical DemoLendingPool state and validates balances and block hashes. Synthetic reference data is labeled. Snapshot evidence is not a transaction-level EVM execution proof or external market TWAP. The current window must contain one disputed oracle update and no unrelated position-changing transactions. Multiple liquidations for one borrower stop the investigation for review. Missing archive state, inconsistent receipts, model denial and stale references never create a payout manifest.

## Server execution

Production sandbox execution is disabled unless explicitly configured and authenticated. The access code must be at least 32 characters. Keep it outside version control, terminate TLS at the deployment boundary and restrict network exposure. Runs are serialized using an exclusive file lock. A crashed host may leave `evidence/.demo.lock`; an operator should remove it only after confirming no demo is running. Demo nodes bind to loopback, use an ephemeral port and are owned by the run; no external node is reset.

## Disclosure

Report a vulnerability privately to the repository owner before publishing exploitable details. Include the affected revision and a minimal reproduction without credentials or real funds.
