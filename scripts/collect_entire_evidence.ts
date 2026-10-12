import fs from "node:fs";
import { execFileSync } from "node:child_process";
const status = execFileSync("entire", ["status"], {
  encoding: "utf8",
  timeout: 15000,
});
const checkpoints = JSON.parse(
  execFileSync("entire", ["checkpoint", "list", "--json"], {
    encoding: "utf8",
    timeout: 15000,
  }),
);
const count = Array.isArray(checkpoints)
  ? checkpoints.length
  : Array.isArray(checkpoints.checkpoints)
    ? checkpoints.checkpoints.length
    : 0;
const evidence = {
  collectedAt: new Date().toISOString(),
  commands: ["entire status", "entire checkpoint list --json"],
  enabled: /Enabled/.test(status),
  checkpointCount: count,
  checkpointEvidenceAvailable: count > 0,
  status:
    count > 0
      ? "CHECKPOINTS_EXIST_REVIEW_BEFORE_PUBLICATION"
      : "SETUP_VERIFIED_CHECKPOINT_EVIDENCE_MISSING",
  role: "Repository agent guidance and source-history inspection during the upgrade; no graph optimization or checkpoint coverage is claimed.",
  privacy:
    "Checkpoint transcripts are not copied into this artifact; review for credentials before public sharing.",
};
fs.mkdirSync("evidence", { recursive: true });
fs.writeFileSync(
  "evidence/entire_workflow.json",
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify(evidence));
