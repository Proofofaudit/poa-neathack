#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.foundry/bin:$HOME/.local/bin:$PATH"
cd "$(dirname "$0")/.."
npm run verify:release
