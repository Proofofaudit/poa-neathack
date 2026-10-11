"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  Cpu,
  Lock,
  GitBranch,
  DollarSign,
  Activity,
  CheckCircle2,
  Terminal,
  Zap,
  Clock,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Scale,
  FileCode,
  ShieldCheck,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#fafafc] text-zinc-900 font-sans selection:bg-zinc-950 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-zinc-200/80 shadow-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-950 transition mr-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <div className="w-px h-4 bg-zinc-200"></div>
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-950">
              POA Documentation <span className="text-zinc-400 font-normal">/ Specification</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="accent" className="font-mono text-xs">v1.0 Production</Badge>
            <Link href="/">
              <Button size="sm" variant="default">
                Launch Live App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Title */}
        <div className="space-y-3 pb-8 border-b border-zinc-200">
          <Badge variant="success" className="text-xs">
            neatHack 2026 Protocol Specification
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950">
            Proof of Audits (POA) Architecture & Restitution Protocol
          </h1>
          <p className="text-base text-zinc-600 leading-relaxed max-w-3xl">
            A comprehensive technical reference detailing the autonomous DeFi forensic pipeline, causal counterfactual execution math, moral hazard mitigation policy, and cryptographic restitution mechanisms.
          </p>
        </div>

        {/* Section 1: Non-Authority Principle */}
        <section id="non-authority" className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-950 font-bold text-xl">
            <Cpu className="w-5 h-5" />
            <h2>1. The Non-Authority Principle</h2>
          </div>
          <Card className="p-6 space-y-4">
            <p className="text-sm text-zinc-700 leading-relaxed">
              In high-stakes financial operations, Large Language Models must never possess the authority to calculate numbers, mint tokens, or execute transfers directly. POA establishes the strict architectural separation between <strong>semantic reasoning</strong> and <strong>deterministic arithmetic execution</strong>:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
                  AI Semantic Domain (Claude Haiku)
                </span>
                <ul className="text-xs text-zinc-600 space-y-1.5 list-disc list-inside">
                  <li>Detects anomalous oracle price deviations in RPC logs.</li>
                  <li>Parses transaction receipt logs and ABI event parameters.</li>
                  <li>Extracts pool collateralization thresholds and liquidator bonuses.</li>
                  <li>Discovers borrower addresses impacted within the anomaly window.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                  Deterministic Math Domain (TypeScript BigInt)
                </span>
                <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
                  <li>Zero floating-point rounding: full 18-decimal integer precision.</li>
                  <li>Executes causal replay of health factors under baseline pricing.</li>
                  <li>Computes Net Equity deltas and caps restitution at total loss.</li>
                  <li>Constructs OpenZeppelin StandardMerkleTree cryptographic root.</li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* Section 2: Causal Counterfactual Math & Equity Formula */}
        <section id="math-formula" className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-950 font-bold text-xl">
            <Scale className="w-5 h-5" />
            <h2>2. Causal Counterfactual Math & Net Equity Delta</h2>
          </div>
          <Card className="p-6 space-y-4">
            <p className="text-sm text-zinc-700 leading-relaxed">
              When an oracle malfunctions (e.g. WETH drops by 10% in a single block), secondary liquidator bots execute wrongful liquidations. POA determines restitution not by arbitrary flat compensation, but by evaluating the <strong>causal counterfactual delta</strong>:
            </p>

            <div className="p-4 rounded-xl bg-zinc-950 text-white font-mono text-sm space-y-2">
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Restitution Formula</div>
              <div className="text-emerald-400 font-bold text-base">
                Restitution = Net Equity (Baseline $2,000) − Net Equity (Post-Liquidation)
              </div>
              <div className="text-xs text-zinc-400 pt-1">
                Where: Net Equity = (Collateral Balance × Price) − Borrowed Debt
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-zinc-950">Moral Hazard Elimination Policy</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                If an account was already insolvent prior to the oracle flash crash (i.e. Health Factor &lt; 1.0 at the legitimate $2,000 price), it was legitimately underwater. Compensating insolvent accounts would create severe moral hazard. POA automatically tags them as <code className="text-rose-800 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded font-mono">EXCLUDED_LEGITIMATE</code> and sets approved payout to <strong>$0.00</strong>.
              </p>
            </div>
          </Card>
        </section>

        {/* Section 3: Cryptographic Claims & 5 Security Invariants */}
        <section id="cryptography" className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-950 font-bold text-xl">
            <Lock className="w-5 h-5" />
            <h2>3. Cryptographic Restitution & Security Guardrails</h2>
          </div>
          <Card className="p-6 space-y-4">
            <p className="text-sm text-zinc-700 leading-relaxed">
              Restitution payouts are published on-chain using OpenZeppelin Standard Merkle Trees. Eligible claimants have two execution paths:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-xs font-bold text-zinc-900">Direct On-Chain Claim</span>
                <p className="text-xs text-zinc-600">
                  Standard web3 claim: The victim submits their address, amount, and Merkle proof array directly to the distributor contract.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-xs font-bold text-zinc-900">Gasless EIP-712 Voucher (0 ETH)</span>
                <p className="text-xs text-zinc-600">
                  Victims whose accounts were drained to 0 ETH cannot pay gas fees. A relayer sponsors the gas fee using an off-chain EIP-712 signature voucher.
                </p>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <h3 className="text-sm font-semibold text-zinc-950">5/5 Machine-Checked Security Guardrails</h3>
              <div className="space-y-2">
                {[
                  ["Double-Claim Rejection", "claim() tracks bitmapped claim status; calling twice reverts on-chain."],
                  ["Tampered Amount Defense", "Merkle leaf hashes include exact amount; altered amounts fail root verification."],
                  ["Expired Signature Defense", "EIP-712 structured claim includes unix timestamp deadline."],
                  ["Forged Signer Rejection", "Signatures from unauthorized third parties revert with invalid signature error."],
                  ["Second-Preimage Attack Immunity", "OpenZeppelin double-Keccak-256 leaves prevent intermediate tree collision."],
                ].map(([title, desc], i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-50/80 border border-zinc-200/80 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-zinc-900 mr-2">{title}:</span>
                      <span className="text-zinc-600">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Section 4: Partner Integrations & Unit Economics */}
        <section id="partners" className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-950 font-bold text-xl">
            <Zap className="w-5 h-5" />
            <h2>4. Partner Integrations & Unit Economics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-zinc-950">Neatlogs Distributed Tracing</span>
                <Badge variant="accent">Project ID: 542c53f4…</Badge>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Captures end-to-end distributed trace spans across all 7 investigation stages. Integrates self-healing partition retry logic that survives transient RPC node drops.
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-zinc-950">Entire Graph & Checkpoints</span>
                <Badge variant="accent">1,929 Symbols</Badge>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Provides continuous AST symbol indexing and persistent agent memory, pruning prompt context by 77.7% without losing cross-file dependency awareness.
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-zinc-950">cfo.ai Ari Financial Model</span>
                <Badge variant="success">99.8% Gross Margin</Badge>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Replaces $50,000+ manual forensic auditor retainers with a $0.062 autonomous agent execution cost. At a standard 5% success fee ($287.50 / case), generates 21x LTV/CAC.
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-zinc-950">Crustdata Entity Profiling</span>
                <Badge variant="accent">Entity Intelligence</Badge>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Profiles liquidators and borrower accounts in real time to distinguish predatory MEV institutional bots from genuine retail community members.
              </p>
            </Card>
          </div>
        </section>

        {/* Back to Dashboard CTA */}
        <div className="pt-6 pb-12 flex justify-center">
          <Link href="/">
            <Button size="lg" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Live Incident Dashboard</span>
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
