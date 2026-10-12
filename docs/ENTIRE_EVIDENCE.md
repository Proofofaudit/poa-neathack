# Entire workflow evidence

The installed Entire Graph plugin was used during this upgrade to locate historical-query recovery code and inspect the impact of `collectHistoricalLogs`. The working-tree query identified its adapter and recovery-test callers. This gave a bounded cross-check of which call sites and tests needed to remain consistent with recovery changes.

Actual outputs are saved in `evidence/entire_graph_search.json` and `evidence/entire_graph_impact.json`. They include command context, target symbol, callers, parser warnings and completeness information. The graph reports degraded global completeness, including a parsing warning in an unrelated legacy dashboard component; no complete-graph or optimization-percentage claim is made.

`evidence/entire_graph_verification.txt` records the plugin's verification of the targeted SDK/recovery tests. Its reference is explicitly the current test state, not a pristine historical baseline. Historical before/after economic behavior is measured separately by the pinned-module evaluation.

`evidence/entire_workflow.json` records enabled setup and zero checkpoints at collection time. No checkpoint coverage or copied private transcript is claimed. Graph output is the supplied Entire evidence. The status and guidance files alone would not establish substantive use.

## October 12 integration diagnosis and planner improvement

Entire CLI 0.11.4 reported only Antigravity installed, no sessions, and zero checkpoints. This work ran in the Codex desktop app from a projectless directory, with repository work executed in a separate checkout. The repository had no Codex hooks. Codex hooks are now installed, but Entire reports their trust review is still needed; installation alone is not proof that hooks are firing.

The installed Graph interface uses `search`, not the earlier `query` spelling. `evidence/entire_planner_context_graph.json` locates `LiveAaveAgent.run`, both API callers and its tests. `evidence/entire_planner_context_impact.json` records affected relationships and coverage warnings. After inspecting those sites, we compacted model context and withheld FINALIZE from advertised choices until available evidence checks finish. Full tool results remain in the report. Actual before/after runs and token limits are documented in `evidence/planner_context_comparison.json`; provider span read-back verifies both runs.

Any attached checkpoint must come from the real existing Codex transcript through Entire's supported `session attach` flow, with redaction and local verification before remote synchronization. No generated or reconstructed session history is acceptable.
