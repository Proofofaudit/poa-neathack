import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
export function sourceFingerprint() {
  const files: string[] = [];
  function collect(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(target);
      else if (/\.(ts|tsx|sol)$/.test(entry.name)) files.push(target);
    }
  }
  for (const dir of ["src", "scripts", "contracts/src"]) collect(dir);
  files.push(
    "package.json",
    "package-lock.json",
    "contracts/foundry.toml",
    "next.config.mjs",
  );
  const digest = crypto.createHash("sha256");
  for (const file of files.sort()) {
    digest.update(file);
    digest.update("\0");
    digest.update(fs.readFileSync(file));
    digest.update("\0");
  }
  return {
    revision: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    workingTreeDirty: Boolean(
      execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
      }).trim(),
    ),
    sha256: digest.digest("hex"),
  };
}
