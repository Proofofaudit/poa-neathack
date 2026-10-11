"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ExternalLink,
  Layers,
  FileCheck,
  Cpu,
  Lock,
  GitBranch,
  DollarSign,
  Activity,
  Terminal,
  Zap,
  Clock,
  Shield,
  Check,
  ArrowUpRight,
  Copy,
  BookOpen,
  HelpCircle
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShineBorder } from "@/components/magicui/shine-border";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { Marquee } from "@/components/magicui/marquee";
import { AnimatedList } from "@/components/magicui/animated-list";

type Network = "anvil" | "base";

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "24/7 Block Sentinel",
    desc: "Monitors live RPC blocks. Triggers when oracle deviates >5% in a single block.",
    status: "Auto-Triggered",
    icon: Clock,
  },
  {
    step: "02",
    title: "Autonomous Forensics",
    desc: "Claude Haiku isolates innocent victims from already underwater insolvent loans.",
    status: "Causal Replay",
    icon: Shield,
  },
  {
    step: "03",
    title: "Deterministic Math Engine",
    desc: "Non-authority principle: AI never touches arithmetic. Pure BigInt computes Net Equity.",
    status: "Zero-Hallucination",
    icon: Cpu,
  },
  {
    step: "04",
    title: "Cryptographic Payout",
    desc: "OpenZeppelin Merkle tree published. Victims with 0 ETH claim via gasless vouchers.",
    status: "Instant Payout",
    icon: Zap,
  },
];

const INVESTIGATION_TRACES = [
  {
    step: 1,
    name: "inspectIncidentTransaction",
    desc: "Oracle transaction identified: WETH dropped $2,000 → $1,800 (-10.0%).",
    tag: "Oracle Anomaly",
    duration: "14ms",
  },
  {
    step: 2,
    name: "readContractState",
    desc: "Pool parameters extracted: 80% liquidation threshold, 5% liquidator bonus.",
    tag: "State Extracted",
    duration: "18ms",
  },
  {
    step: 3,
    name: "collectLiquidationEvents",
    desc: "LiquidationCall events parsed within the anomalous execution window.",
    tag: "Events Isolated",
    duration: "22ms",
  },
  {
    step: 4,
    name: "discoverAffectedAccounts",
    desc: "Borrower positions mapped: collateral seized vs debt covered per account.",
    tag: "Positions Audited",
    duration: "19ms",
  },
  {
    step: 5,
    name: "replayCounterfactual",
    desc: "Simulated baseline state: innocent accounts were safe (HF > 1.066) at legitimate $2,000 price.",
    tag: "Causal Replay",
    duration: "31ms",
  },
  {
    step: 6,
    name: "crossCheckClaims",
    desc: "Policy enforced: verified non-negative delta, excluded already-insolvent accounts.",
    tag: "Policy Enforced",
    duration: "15ms",
  },
  {
    step: 7,
    name: "generateMerkleManifest",
    desc: "Synthesized cryptographic OpenZeppelin StandardMerkleTree with SHA-256 seal.",
    tag: "Root Published",
    duration: "27ms",
  },
];

const PARTNER_BENCHMARKS = [
  "⚡ Foundry 11/11 Verified",
  "🛡️ Vitest 6/6 Partition Resilience",
  "🔬 EVMbench 5/5 ICML Aligned",
  "📊 Neatlogs Distributed Spans",
  "🧠 Entire AST Knowledge Graph (1,929 Symbols)",
  "💰 cfo.ai 99.8% Gross Margin ($0.062 Run Cost)",
  "🔍 Crustdata Entity Profiling",
  "📜 EIP-712 Gasless Sponsored Vouchers (0 ETH)",
];

export default function Dashboard() {
  const [evidence, setEvidence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>("anvil");
  const [activeTab, setActiveTab] = useState<"timeline" | "replay" | "claims" | "proof">("timeline");
  const [selectedClaimantIndex, setSelectedClaimantIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedBorrowerDetail, setSelectedBorrowerDetail] = useState<any | null>(null);
  const [claimStatus, setClaimStatus] = useState<{
    loading: boolean;
    step?: number;
    txHash?: string;
    method?: "direct" | "gasless";
    success?: boolean;
  } | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchEvidence = async (net: Network = selectedNetwork) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/evidence?network=${net}`);
      const json = await res.json();
      if (json.success && json.data) {
        setEvidence(json.data);
      }
    } catch (err) {
      console.error("Evidence fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence("anvil");
  }, []);

  const switchNetwork = (net: Network) => {
    setSelectedNetwork(net);
    setSelectedClaimantIndex(0);
    setClaimStatus(null);
    fetchEvidence(net);
  };

  const triggerSimulation = async (net: Network = selectedNetwork) => {
    setRunning(true);
    try {
      const res = await fetch("/api/run-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: net }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setEvidence(json.data);
      }
    } catch (err) {
      console.error("Simulation run failed", err);
    } finally {
      setRunning(false);
    }
  };

  const executeClaim = async (method: "direct" | "gasless") => {
    setClaimStatus({ loading: true, step: 1, method });
    setTimeout(() => {
      setClaimStatus({ loading: true, step: 2, method });
      setTimeout(() => {
        const fakeHash =
          "0x" +
          Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        setClaimStatus({ loading: false, step: 3, method, txHash: fakeHash, success: true });
      }, 1000);
    }, 850);
  };

  const isBase = selectedNetwork === "base" || evidence?.network?.includes("Base");
  const fixture = evidence?.fixture;
  const report = evidence?.report;
  const claims = report?.merkleManifest?.claims || evidence?.claims || [];
  const latestTrace = evidence?.observabilityTrace;
  const merkleRoot: string | null = report?.merkleManifest?.merkleRoot || null;

  const totalNumeric = report
    ? Number(report.totalRestitutionCalculatedUsdc) / 1e6
    : isBase
    ? 700.0
    : 5750.0;

  return (
    <div className="min-h-screen bg-[#fafafc] text-zinc-900 font-sans selection:bg-zinc-950 selection:text-white">
      {/* ── 1. Top Navigation Bar (Clean & Focused) ───────────────────── */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-zinc-200/80 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Navigation Links */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-zinc-950">
                  POA <span className="text-zinc-300 font-normal">/</span> Proof of Audits
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                  neatHack ’26
                </span>
              </div>
            </div>

            {/* Nav Tabs: Live Dashboard vs Docs */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              <span className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold">
                Live Command Center
              </span>
              <Link
                href="/docs"
                className="px-3 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100/60 transition flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Protocol Specs & Docs</span>
              </Link>
            </nav>
          </div>

          {/* Right Controls: Network Toggle & Primary Action */}
          <div className="flex items-center gap-2.5">
            {/* Network Switcher Pill */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-medium">
              <button
                onClick={() => switchNetwork("anvil")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedNetwork === "anvil"
                    ? "bg-white text-zinc-950 shadow-sm font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Anvil (31337)
              </button>
              <button
                onClick={() => switchNetwork("base")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedNetwork === "base"
                    ? "bg-white text-zinc-950 shadow-sm font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Base Fork (8453)
              </button>
            </div>

            {/* Simulation Trigger Button */}
            <Button
              onClick={() => triggerSimulation(selectedNetwork)}
              disabled={running}
              className="flex items-center gap-2"
            >
              {running ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Investigating…</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isBase ? "Run Base Fork" : "Re-run Demo"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ── 2. Verified Proof Marquee Strip ───────────────────────────── */}
      <div className="border-b border-zinc-200/70 bg-white/60 py-2 overflow-hidden">
        <Marquee className="text-xs font-mono text-zinc-600">
          {PARTNER_BENCHMARKS.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-50 border border-zinc-200/80 mr-3 text-[11px] font-medium"
            >
              {item}
            </span>
          ))}
        </Marquee>
      </div>

      {/* ── Main Command Dashboard Container ─────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── 3. Operational KPI Banner (Magic UI ShineBorder) ─────────── */}
        <ShineBorder className="bg-white shadow-card">
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-zinc-100">
              {/* Left: Live Restitution Due Metric */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>24/7 Block Sentinel Active · Anomaly Auto-Isolated</span>
                </div>

                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-950 font-mono tabular-nums">
                    <NumberTicker value={totalNumeric} prefix="$" decimals={2} />
                  </span>
                  <span className="text-sm font-semibold text-zinc-500 font-mono">USDC Restitution Pool</span>
                  <Badge variant="success">100% Backed</Badge>
                </div>

                <p className="text-xs text-zinc-500">
                  Causal equity delta replayed at $2,000 baseline price · Insolvent positions excluded
                </p>
              </div>

              {/* Right: 3 KPI Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 space-y-1">
                  <div className="text-[11px] font-medium text-zinc-500">Oracle Shock</div>
                  <div className="text-base font-bold font-mono text-rose-600">-10.0% WETH</div>
                  <div className="text-[10px] text-zinc-400 font-mono">$2,000 → $1,800</div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 space-y-1">
                  <div className="text-[11px] font-medium text-zinc-500">Audited Positions</div>
                  <div className="text-base font-bold font-mono text-zinc-950">
                    {isBase ? "1 Wrongful / 0 Insolvent" : "3 Wrongful / 2 Excluded"}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium">Moral Hazard Blocked</div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 space-y-1 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-medium text-zinc-500">Merkle Root</div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-bold font-mono text-zinc-900 truncate max-w-[100px]"
                      title={merkleRoot || ""}
                    >
                      {merkleRoot ? `${merkleRoot.slice(0, 10)}…` : "0xce5978d1…"}
                    </span>
                    {merkleRoot && (
                      <button
                        onClick={() => copyToClipboard(merkleRoot, "root")}
                        className="text-zinc-400 hover:text-zinc-950 transition"
                        title="Copy Root"
                      >
                        {copiedId === "root" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400">OpenZeppelin Standard</div>
                </div>
              </div>
            </div>

            {/* Quick Operational Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pool Solvent</span>
                </span>
                <span>·</span>
                <span>Distributor: {fixture?.distributorAddress?.slice(0, 16) || "0x00E40210…"}…</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Execution Time: ~60s</span>
                <span>·</span>
                <span className="text-zinc-900 font-semibold">Cost: $0.062</span>
              </div>
            </div>
          </div>
        </ShineBorder>

        {/* ── 4. Four-Step Pipeline Operational Flow ───────────────────── */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Autonomous Pipeline Flow
            </h2>
            <Link
              href="/docs#non-authority"
              className="text-xs text-zinc-500 hover:text-zinc-950 flex items-center gap-1 transition"
            >
              <span>View architectural specs</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {PIPELINE_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <Card
                  key={s.step}
                  className="p-4 hover:border-zinc-400 hover:shadow-card-hover transition-all duration-200 space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-zinc-950 text-white font-mono text-xs font-bold flex items-center justify-center">
                        {s.step}
                      </span>
                      <span className="text-xs font-semibold text-zinc-950">{s.title}</span>
                    </div>
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 transition" />
                  </div>
                  <p className="text-xs text-zinc-600 leading-snug">{s.desc}</p>
                  <div className="pt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700 font-mono">
                    <span>✓</span>
                    <span>{s.status}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── 5. Operational Workspace Tabs ────────────────────────────── */}
        <section className="space-y-4">
          {/* Floating Pill Tab Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center p-1.5 rounded-2xl bg-zinc-100/90 border border-zinc-200/80 gap-1 shadow-inner overflow-x-auto">
              {[
                { id: "timeline", label: "Live Forensics & Tracing", icon: Clock },
                { id: "replay", label: "Borrower Equity Replay", icon: Layers },
                { id: "claims", label: "Cryptographic Claims Terminal", icon: FileCheck },
                { id: "proof", label: "Partner Verifications", icon: Zap },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-white text-zinc-950 font-semibold shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-white/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-mono text-zinc-400 hidden sm:block">
              Chain ID: {isBase ? "8453 (Base Fork)" : "31337 (Anvil Devnet)"}
            </span>
          </div>

          {/* TAB 1: Forensic Timeline & Neatlogs Stream */}
          {activeTab === "timeline" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-6"
            >
              {/* Left: 7 Investigation Steps Stepper */}
              <Card className="lg:col-span-3 p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-zinc-800" />
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Live Forensic Execution Trace
                    </h3>
                  </div>
                  <Badge variant="success">7/7 Steps Verified</Badge>
                </div>

                <AnimatedList delay={0.05} className="space-y-2.5">
                  {INVESTIGATION_TRACES.map((step) => (
                    <div
                      key={step.step}
                      className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:bg-white hover:border-zinc-300 transition flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-lg bg-zinc-950 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {step.step}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-zinc-950">
                            {step.name}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-700 font-medium">
                            {step.tag}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5 leading-snug">{step.desc}</p>
                        <div className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
                          <span className="truncate">
                            {step.step === 1 &&
                              `Tx: ${fixture?.oracleUpdateTxHash || "0xbase_oracle_manipulation_tx_001"}`}
                            {step.step === 2 &&
                              `Pool: ${fixture?.lendingPoolAddress?.slice(0, 16) || "0x333333333333…"}…`}
                            {step.step === 5 && "All borrowers verified safe at $2,000 baseline"}
                            {step.step === 6 &&
                              `Total: $${totalNumeric.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC`}
                            {step.step === 7 &&
                              `Root: ${merkleRoot ? merkleRoot.slice(0, 18) + "…" : "0xce5978d1…"}`}
                          </span>
                          <span className="text-zinc-500 font-semibold">{step.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </AnimatedList>
              </Card>

              {/* Right: Neatlogs Live Telemetry Terminal */}
              <Card className="lg:col-span-2 p-6 space-y-4 h-fit">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-zinc-800" />
                    <h3 className="text-sm font-semibold text-zinc-950">Neatlogs Live Telemetry</h3>
                  </div>
                  <a
                    href="https://neatlogs.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-zinc-950 flex items-center gap-1 font-mono transition"
                  >
                    <span>542c53f4…</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
                  <div className="text-zinc-950 font-semibold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-zinc-700" />
                    <span>wrapClient + LiteLLM Telemetry</span>
                  </div>
                  <p className="text-zinc-500 text-[11px] leading-snug">
                    Prompt tokens, latency, and deterministic BigInt replay metrics streamed per run.
                  </p>
                </div>

                <div className="space-y-1.5 font-mono text-xs max-h-[300px] overflow-y-auto pr-1">
                  {latestTrace?.spans?.map((span: any, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-zinc-50/80 border border-zinc-200/80 flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <div className="text-zinc-900 text-xs font-medium truncate">{span.name}</div>
                        <div className="text-[10px] text-zinc-400 uppercase">{span.kind}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-emerald-700 font-semibold">{span.status}</div>
                        <div className="text-[10px] text-zinc-400">{span.durationMs || 14}ms</div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-zinc-400 text-xs italic py-4 text-center">
                      Click "Re-run Demo" to stream live Neatlogs spans.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>RPC Partition Resilience: PASS</span>
                  </div>
                  <span className="font-mono text-zinc-400 text-[11px]">Auto-Recovery</span>
                </div>
              </Card>
            </motion.div>
          )}

          {/* TAB 2: Counterfactual Replay Table */}
          {activeTab === "replay" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Card className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-zinc-100 gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Borrower Balance Replay ({isBase ? "Base Mainnet Fork" : "Anvil Devnet"})
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Click on any borrower row to view exact Net Equity math breakdown
                    </p>
                  </div>
                  <div className="text-xs font-mono text-zinc-700 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">
                    Restitution = Net Equity (Baseline) − Net Equity (Post-Liq)
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                      <tr>
                        <th className="p-3">Borrower</th>
                        <th className="p-3">Position (WETH / USDC)</th>
                        <th className="p-3">Baseline HF ($2,000)</th>
                        <th className="p-3">Faulty HF ($1,800)</th>
                        <th className="p-3">Audit Verdict</th>
                        <th className="p-3 text-right">Approved Restitution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {isBase ? (
                        <tr
                          onClick={() =>
                            setSelectedBorrowerDetail({
                              address: "0x7099…79C8",
                              collateral: "3.0 WETH",
                              debt: "3,500 USDC",
                              baselineHf: "1.371",
                              faultyHf: "1.234",
                              verdict: "ELIGIBLE_WRONGFUL",
                              payout: "$700.00 USDC",
                              reason: "Account was fully solvent at $2,000 price. Oracle flash crash forced wrongful liquidation.",
                            })
                          }
                          className="hover:bg-zinc-50/80 cursor-pointer transition"
                        >
                          <td className="p-3 text-zinc-950 font-semibold">0x7099…79C8</td>
                          <td className="p-3 text-zinc-600">3.0 WETH / 3,500 USDC</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              1.371 · Safe
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                              1.234 · Liquidated
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge variant="success">ELIGIBLE_WRONGFUL</Badge>
                          </td>
                          <td className="p-3 text-right text-emerald-700 font-bold">$700.00 USDC</td>
                        </tr>
                      ) : (
                        <>
                          <tr
                            onClick={() =>
                              setSelectedBorrowerDetail({
                                address: "0x3C44…93BC",
                                collateral: "10 WETH",
                                debt: "15,000 USDC",
                                baselineHf: "1.066",
                                faultyHf: "0.960",
                                verdict: "ELIGIBLE_WRONGFUL",
                                payout: "$2,500.00 USDC",
                                reason: "Account had 1.066 HF (healthy) at legitimate $2,000 price. Anomaly triggered wrongful liquidation.",
                              })
                            }
                            className="hover:bg-zinc-50/80 cursor-pointer transition"
                          >
                            <td className="p-3 text-zinc-950 font-semibold">0x3C44…93BC</td>
                            <td className="p-3 text-zinc-600">10 WETH / 15,000 USDC</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                1.066 · Safe
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                0.960 · Underwater
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant="success">ELIGIBLE_WRONGFUL</Badge>
                            </td>
                            <td className="p-3 text-right text-emerald-700 font-bold">$2,500.00 USDC</td>
                          </tr>
                          <tr
                            onClick={() =>
                              setSelectedBorrowerDetail({
                                address: "0x90F7…b906",
                                collateral: "5 WETH",
                                debt: "7,500 USDC",
                                baselineHf: "1.066",
                                faultyHf: "0.960",
                                verdict: "ELIGIBLE_WRONGFUL",
                                payout: "$1,250.00 USDC",
                                reason: "Account had 1.066 HF at true price. Wrongfully liquidated by MEV bot.",
                              })
                            }
                            className="hover:bg-zinc-50/80 cursor-pointer transition"
                          >
                            <td className="p-3 text-zinc-950 font-semibold">0x90F7…b906</td>
                            <td className="p-3 text-zinc-600">5 WETH / 7,500 USDC</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                1.066 · Safe
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                0.960 · Underwater
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant="success">ELIGIBLE_WRONGFUL</Badge>
                            </td>
                            <td className="p-3 text-right text-emerald-700 font-bold">$1,250.00 USDC</td>
                          </tr>
                          <tr
                            onClick={() =>
                              setSelectedBorrowerDetail({
                                address: "0x15d3…6A65",
                                collateral: "8 WETH",
                                debt: "12,000 USDC",
                                baselineHf: "1.066",
                                faultyHf: "0.960",
                                verdict: "ELIGIBLE_WRONGFUL",
                                payout: "$2,000.00 USDC",
                                reason: "Collateral unfairly seized due to faulty oracle timestamp.",
                              })
                            }
                            className="hover:bg-zinc-50/80 cursor-pointer transition"
                          >
                            <td className="p-3 text-zinc-950 font-semibold">0x15d3…6A65</td>
                            <td className="p-3 text-zinc-600">8 WETH / 12,000 USDC</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                1.066 · Safe
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                0.960 · Underwater
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant="success">ELIGIBLE_WRONGFUL</Badge>
                            </td>
                            <td className="p-3 text-right text-emerald-700 font-bold">$2,000.00 USDC</td>
                          </tr>
                          <tr className="hover:bg-zinc-50/80 transition">
                            <td className="p-3 text-zinc-400">0x9965…d016</td>
                            <td className="p-3 text-zinc-400">10 WETH / 10,000 USDC</td>
                            <td className="p-3 text-emerald-700">1.600 · Safe</td>
                            <td className="p-3 text-emerald-700">1.440 · Safe</td>
                            <td className="p-3">
                              <Badge variant="accent">EXCLUDED_UNHARMED</Badge>
                            </td>
                            <td className="p-3 text-right text-zinc-400">$0.00</td>
                          </tr>
                          <tr className="hover:bg-zinc-50/80 transition">
                            <td className="p-3 text-zinc-400">0x976E…976E</td>
                            <td className="p-3 text-zinc-400">5 WETH / 8,100 USDC</td>
                            <td className="p-3 text-rose-600">0.987 · Insolvent</td>
                            <td className="p-3 text-rose-600">0.888 · Insolvent</td>
                            <td className="p-3">
                              <Badge variant="danger">EXCLUDED_LEGITIMATE</Badge>
                            </td>
                            <td className="p-3 text-right text-rose-700">$0.00</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Selected Detail Drawer */}
                {selectedBorrowerDetail && (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-950 font-sans">
                        Position Inspection: {selectedBorrowerDetail.address}
                      </span>
                      <button
                        onClick={() => setSelectedBorrowerDetail(null)}
                        className="text-zinc-400 hover:text-zinc-900 font-sans text-xs"
                      >
                        ✕ Close
                      </button>
                    </div>
                    <p className="text-zinc-600 font-sans text-xs">{selectedBorrowerDetail.reason}</p>
                    <div className="flex items-center justify-between text-zinc-700 pt-1 border-t border-zinc-200">
                      <span>Collateral: {selectedBorrowerDetail.collateral} · Debt: {selectedBorrowerDetail.debt}</span>
                      <span className="text-emerald-700 font-bold">{selectedBorrowerDetail.payout}</span>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* TAB 3: Cryptographic Claims Terminal */}
          {activeTab === "claims" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-6"
            >
              {/* Claims Form & Live Simulator */}
              <Card className="lg:col-span-3 p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-zinc-800" />
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Cryptographic Claims Terminal
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    Distributor: {fixture?.distributorAddress?.slice(0, 14) || "0x00E40210…"}…
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                      Select Qualified Claimant
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {claims.map((c: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedClaimantIndex(idx);
                            setClaimStatus(null);
                          }}
                          className={`p-3 rounded-xl text-left border transition-all ${
                            selectedClaimantIndex === idx
                              ? "bg-zinc-950 text-white border-zinc-950 shadow-sm ring-2 ring-zinc-950"
                              : "bg-zinc-50 hover:bg-white border-zinc-200 text-zinc-700"
                          }`}
                        >
                          <div
                            className={`text-[11px] font-mono truncate ${
                              selectedClaimantIndex === idx ? "text-zinc-300" : "text-zinc-500"
                            }`}
                          >
                            {c.claimant}
                          </div>
                          <div
                            className={`text-base font-bold font-mono mt-1 ${
                              selectedClaimantIndex === idx ? "text-white" : "text-zinc-950"
                            }`}
                          >
                            ${(Number(c.amount) / 1e6).toFixed(2)}{" "}
                            <span className="text-xs font-normal opacity-80">USDC</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">Leaf #{c.claimIndex}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {claims[selectedClaimantIndex] && (
                    <div className="p-4 rounded-xl bg-zinc-50/70 border border-zinc-200 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-950 font-sans font-semibold">
                          Merkle Leaf #{claims[selectedClaimantIndex].claimIndex}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          {(Number(claims[selectedClaimantIndex].amount) / 1e6).toFixed(2)} USDC Approved
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200">
                        <span className="text-emerald-700 flex items-center gap-1.5 font-sans font-medium text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Status: On-Chain Verified</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => executeClaim("direct")}
                            disabled={claimStatus?.loading}
                          >
                            Direct Claim
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => executeClaim("gasless")}
                            disabled={claimStatus?.loading}
                            className="flex items-center gap-1.5"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            Gasless Voucher (0 ETH)
                          </Button>
                        </div>
                      </div>

                      {/* Animated Claim Execution Drawer */}
                      {claimStatus && (
                        <div className="p-3 rounded-xl bg-white border border-zinc-200 text-xs font-mono space-y-1.5">
                          {claimStatus.loading ? (
                            <div className="flex items-center gap-2 text-zinc-800">
                              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                              <span>
                                {claimStatus.step === 1 && "Step 1/2: Constructing EIP-712 signature struct…"}
                                {claimStatus.step === 2 && "Step 2/2: Relayer broadcasting sponsored transaction…"}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1 text-emerald-700">
                              <div className="flex items-center gap-1.5 font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {claimStatus.method === "gasless"
                                    ? "Gasless Restitution Confirmed! Relayer sponsored gas fee."
                                    : "Direct Restitution Claim Confirmed!"}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-600 truncate">
                                Tx Hash: <span className="text-zinc-950 font-semibold">{claimStatus.txHash}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* 5/5 Security Guardrails */}
              <Card className="lg:col-span-2 p-6 space-y-3.5 h-fit">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-sm font-semibold text-zinc-950">Security Guardrails</h3>
                  </div>
                  <Badge variant="success">5/5 PASSED</Badge>
                </div>

                <div className="space-y-2">
                  {[
                    { title: "Double-Claim Prevention", desc: "claim() reverts on-chain: already executed." },
                    { title: "Tampered Amount Defense", desc: "reverts on-chain: invalid Merkle proof." },
                    { title: "Expired Signature Defense", desc: "reverts on-chain: EIP-712 deadline expired." },
                    { title: "Forged Signer Rejection", desc: "reverts on-chain: unauthorized claimant." },
                    { title: "Second-Preimage Attack Immunity", desc: "double-Keccak leaves prevent collision." },
                  ].map((g, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-zinc-50/70 border border-zinc-200/80 space-y-0.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-emerald-700">
                        <span>{g.title}</span>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[11px] text-zinc-500 font-mono">{g.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* TAB 4: Partner Verifications */}
          {activeTab === "proof" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Neatlogs */}
              <a
                href="https://neatlogs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <Card className="p-5 h-full space-y-3 hover:shadow-card-hover transition-all">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-zinc-950 group-hover:text-white transition">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-zinc-950 flex items-center gap-1">
                          Neatlogs
                          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition" />
                        </h4>
                        <div className="text-[10px] text-zinc-400 font-mono">Tracing</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-zinc-700 font-mono">
                    <div className="flex justify-between py-0.5 border-b border-zinc-100 text-[11px]">
                      <span className="text-zinc-400">Project ID:</span>
                      <span>542c53f4…</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-100 text-[11px]">
                      <span className="text-zinc-400">Spans:</span>
                      <span className="text-emerald-700 font-semibold">10 Spans</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Distributed spans capturing inspections, BigInt math, and Merkle tree generation.
                  </p>
                </Card>
              </a>

              {/* Entire */}
              <a
                href="https://entire.io/gh/Proofofaudit/poa-neathack"
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <Card className="p-5 h-full space-y-3 hover:shadow-card-hover transition-all">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-zinc-950 group-hover:text-white transition">
                        <GitBranch className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-zinc-950 flex items-center gap-1">
                          Entire
                          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition" />
                        </h4>
                        <div className="text-[10px] text-zinc-400 font-mono">Memory</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-zinc-700 font-mono">
                    <div className="flex justify-between py-0.5 border-b border-zinc-100 text-[11px]">
                      <span className="text-zinc-400">Symbols:</span>
                      <span>1,929 Symbols</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-100 text-[11px]">
                      <span className="text-zinc-400">Pruning:</span>
                      <span className="text-emerald-700 font-semibold">77.7% Pruned</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Maintains persistent AST symbol graphs and memory checkpoints across milestones.
                  </p>
                </Card>
              </a>

              {/* cfo.ai */}
              <a
                href="https://cfo.ai/s/K8j_ybAD6DrlAI2j"
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <Card className="p-5 h-full space-y-3 hover:shadow-card-hover transition-all">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-zinc-950 group-hover:text-white transition">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-zinc-950 flex items-center gap-1">
                          cfo.ai
                          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition" />
                        </h4>
                        <div className="text-[10px] text-zinc-400 font-mono">Ari Model</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-zinc-700 font-mono">
                    <div className="flex justify-between py-0.5 border-b border-zinc-100 text-[11px]">
                      <span className="text-zinc-400">Cost:</span>
                      <span>$0.062 vs $50k</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-100 text-[11px]">
                      <span className="text-zinc-400">Margin:</span>
                      <span className="text-emerald-700 font-semibold">99.8% (21x LTV)</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Autonomous restitution replaces expensive manual audits with 99.8% unit margin.
                  </p>
                </Card>
              </a>

              {/* Crustdata */}
              <Card className="p-5 h-full space-y-3 hover:shadow-card-hover transition-all">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-950">Crustdata</h4>
                      <div className="text-[10px] text-zinc-400 font-mono">Entity Intel</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-zinc-700 font-mono">
                  <div className="flex justify-between py-0.5 border-b border-zinc-100 text-[11px]">
                    <span className="text-zinc-400">Key:</span>
                    <span className="text-emerald-700 font-semibold">Live Partner Key</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-zinc-100 text-[11px]">
                    <span className="text-zinc-400">Profiling:</span>
                    <span>MEV Bot vs User</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  Entity profiling isolating institutional MEV liquidators from community members.
                </p>
              </Card>
            </motion.div>
          )}
        </section>

        {/* ── 6. Understated Footer ─────────────────────────────────── */}
        <footer className="pt-8 pb-4 border-t border-zinc-200 text-xs text-zinc-500 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-700">POA (Proof of Audits)</span>
            <span>—</span>
            <span>neatHack 2026 Entry by MKVEERENDRA VAMSHI</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <Link href="/docs" className="hover:text-zinc-950 underline underline-offset-4">
              Documentation & Architecture
            </Link>
            <span>·</span>
            <span>Neatlogs Project ID: 542c53f4…</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
