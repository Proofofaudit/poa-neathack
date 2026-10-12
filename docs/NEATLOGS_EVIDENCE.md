# Neatlogs integration evidence

Every investigation now runs through the actual neatlogs SDK `Client` and `trace` APIs. Local mode uses an injected in-memory exporter, with actual SDK trace IDs, span hierarchy, input/output attributes and error status saved in the evidence artifact. It does not contact the provider or claim remote persistence. Each workflow owns its SDK client and async context, preventing concurrent missions from mixing traces.

`tests/observability.test.ts` verifies nested SDK spans, output capture, real failure status and overlapping mission isolation. `evidence/neatlogs_doctor_local.json` records the SDK's credential-free local diagnostic result.

`npm run test:upgrade` runs the pinned old pure economic module and the current implementation on the same twelve labeled synthetic cases. Its artifact contains both actual SDK traces. This establishes improvement on that set, not production accuracy.

Remote export remains explicit through `POA_TELEMETRY_ENABLED=true`. Export success alone does not prove persisted provider ingestion. Use the SDK doctor probe and verify actual project trace links/screenshots before claiming the remote integration. Never expose credentials in output or commit provider secrets.

The controlled SDK probe has also passed authenticated remote persistence checks; see `evidence/neatlogs_doctor_probe.json`. This establishes the generated diagnostic trace, not automatically every project trace. `evidence/neatlogs_remote_readback.json`, when present with VERIFIED_READBACK, records separate authenticated checks of the project's actual investigation and before/after traces. The verifier requires every expected non-internal span and its complete parent hierarchy.
