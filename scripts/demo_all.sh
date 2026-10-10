#!/usr/bin/env bash
set -euo pipefail

export PATH=$HOME/.foundry/bin:$HOME/.local/bin:$PATH

echo "================================================================================"
echo "  POA (Proof of Audits) — FULL VERIFICATION SUITE"
echo "  neatHack 2026 Competition Entry"
echo "================================================================================"

echo ""
echo "▶ STEP 1: Running Foundry Smart Contract Test Suite..."
cd contracts
forge test -v
cd ..

echo ""
echo "▶ STEP 2: Running TypeScript Financial Engine & Agent Unit Tests..."
npm test

echo ""
echo "▶ STEP 3: Running End-to-End On-Chain Incident Simulation & Restitution..."
npx tsx scripts/run_demo.ts

echo ""
echo "================================================================================"
echo "  ALL VERIFICATION GATES PASSED (100% REPRODUCIBLE EVIDENCE READY)"
echo "================================================================================"
