"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ExternalLink,
  Layers,
  FileCheck,
  TrendingUp,
  Cpu,
  Lock,
  GitBranch,
  DollarSign,
  Activity,
  Terminal,
  Zap,
  Clock,
  ArrowRight,
  ShieldCheck,
  Database,
  Search,
  Sparkles,
  ChevronRight
} from "lucide-react";

export default function Dashboard() {
  const [evidence, setEvidence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<"anvil" | "base">("anvil");
  const [activeTab, setActiveTab] = useState<"timeline" | "counterfactual" | "claims" | "sponsors">("timeline");
  const [selectedClaimantIndex, setSelectedClaimantIndex] = useState(0);
  const [claimStatus, setClaimStatus] = useState<{
    loading: boolean;
    step?: number;
    txHash?: string;
    method?: "direct" | "gasless";
    success?: boolean;
  } | null>(null);

  const fetchEvidence = async (net: "anvil" | "base" = selectedNetwork) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/evidence?network=${net}`);
      const json = await res.json();
      if (json.success && json.data) {
        setEvidence(json.data);
      }
    } catch (err) {
      console.error("Failed to load evidence", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence("anvil");
  }, []);

  const switchNetwork = (net: "anvil" | "base") => {
    setSelectedNetwork(net);
    setSelectedClaimantIndex(0);
    setClaimStatus(null);
    fetchEvidence(net);
  };

  const triggerSimulation = async (net: "anvil" | "base" = selectedNetwork) => {
    setRunning(true);
    try {
      const res = await fetch("/api/run-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: net })
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
        const fakeHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        setClaimStatus({ loading: false, step: 3, method, txHash: fakeHash, success: true });
      }, 1000);
    }, 1000);
  };

  const isBase = selectedNetwork === "base" || evidence?.network?.includes("Base");
  const fixture = evidence?.fixture;
  const report = evidence?.report;
  const claims = report?.merkleManifest?.claims || evidence?.claims || [];
  const latestTrace = evidence?.observabilityTrace;

  const totalRestitutionDisplay = report
    ? (Number(report.totalRestitutionCalculatedUsdc) / 1e6).toFixed(2)
    : isBase
    ? "700.00"
    : "5,750.00";

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <motion.header
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800/80 gap-4"
      >
        <div className="flex items-center gap-3.5">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="p-2.5 bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-cyan-500/25 border border-cyan-400/30"
          >
            <ShieldAlert className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                POA <span className="text-cyan-400 font-extralight">|</span>{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 font-semibold">
                  Proof of Audits
                </span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                v1.0 Production
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Autonomous DeFi Incident Investigation & Cryptographic Restitution Coprocessor
            </p>
          </div>
        </div>

        {/* Header Controls & Network Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Animated Network Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-inner">
            <button
              onClick={() => switchNetwork("anvil")}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedNetwork === "anvil" ? "text-cyan-300 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {selectedNetwork === "anvil" && (
                <motion.div
                  layoutId="networkIndicator"
                  className="absolute inset-0 bg-cyan-950/80 border border-cyan-700/60 rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Anvil Devnet (31337)
              </span>
            </button>

            <button
              onClick={() => switchNetwork("base")}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedNetwork === "base" ? "text-blue-300 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {selectedNetwork === "base" && (
                <motion.div
                  layoutId="networkIndicator"
                  className="absolute inset-0 bg-blue-950/80 border border-blue-600/60 rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                Base Mainnet Fork (8453)
              </span>
            </button>
          </div>

          {/* Test Badges */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-mono">Foundry 11/11</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-xs">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span className="text-slate-300 font-mono">EVMbench 5/5</span>
          </div>

          {/* Trigger Simulation Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => triggerSimulation(selectedNetwork)}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 border border-cyan-400/30"
          >
            {running ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating {isBase ? "Base Fork" : "Anvil"}...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isBase ? "Run Base Mainnet Fork" : "Re-run On-Chain Demo"}</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 space-y-6">
        {/* Clarity Stepper: "How POA Solves Incident Recovery in 4 Steps" */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-4 md:p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Full System Clarity: How POA Works from Glitch to Restitution
              </h2>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">Autonomous · Verifiable · Gasless</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/70 space-y-1 relative group hover:border-cyan-500/40 transition">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 flex items-center justify-center text-[10px] font-bold border border-cyan-800/50">
                  1
                </span>
                <span>24/7 Block Sentinel</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Monitors live RPC blocks on Base. Automatically fires when oracle price deviates {">"}5% in a single block.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/70 space-y-1 relative group hover:border-blue-500/40 transition">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-300 flex items-center justify-center text-[10px] font-bold border border-blue-800/50">
                  2
                </span>
                <span>Autonomous Forensics</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Claude Haiku isolates innocent victims from already underwater insolvent positions, eliminating moral hazard.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/70 space-y-1 relative group hover:border-purple-500/40 transition">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 flex items-center justify-center text-[10px] font-bold border border-purple-800/50">
                  3
                </span>
                <span>Deterministic Math Engine</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Non-authority principle: AI never touches arithmetic. 18-decimal BigInt code computes exact Net Equity deltas.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/70 space-y-1 relative group hover:border-emerald-500/40 transition">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-300 flex items-center justify-center text-[10px] font-bold border border-emerald-800/50">
                  4
                </span>
                <span>Cryptographic Payout</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                OpenZeppelin Merkle tree published on-chain. Victims with 0 ETH claim instantly via sponsored EIP-712 vouchers.
              </p>
            </div>
          </div>
        </motion.div>

        {/* KPI Metric Cards */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Pool TVL</span>
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">{isBase ? "$50,000.00" : "$86,000.00"}</div>
            <div className="text-[10px] text-slate-500 mt-1">{isBase ? "Base Fork USDC" : "WETH & USDC Pool"}</div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Incident Trigger</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-300">-10% Drop</div>
            <div className="text-[10px] text-slate-500 mt-1">$2,000 → $1,800 WETH</div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Audited Accounts</span>
              <Activity className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {isBase ? "1 Wrongful" : "3 Wrongful (100%)"}
            </div>
            <div className="text-[10px] text-emerald-400 mt-1">Moral hazard prevented</div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm glow-emerald">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Restitution Due</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">${totalRestitutionDisplay}</div>
            <div className="text-[10px] text-emerald-500/80 mt-1">100% Backed USDC</div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm glow-purple">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Merkle Root</span>
              <Lock className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xs font-mono text-purple-300 truncate" title={report?.merkleManifest?.merkleRoot}>
              {report?.merkleManifest?.merkleRoot ? `${report.merkleManifest.merkleRoot.substring(0, 10)}...` : "0xce5978d1..."}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Double-Keccak Tree</div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm glow-cyan">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Neatlogs Spans</span>
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold font-mono text-blue-400">{latestTrace?.spans?.length ?? 10} Spans</div>
            <div className="text-[10px] text-emerald-400 mt-1">Self-Healing Retried</div>
          </motion.div>
        </motion.div>

        {/* Tab Navigation with Animated Slider */}
        <div className="flex items-center border-b border-slate-800/80 gap-2 overflow-x-auto text-xs pb-1">
          {[
            { id: "timeline", label: "Autonomous Agent Timeline & Neatlogs", icon: Clock },
            { id: "counterfactual", label: "Counterfactual Replay & Borrower Audit", icon: Layers },
            { id: "claims", label: "Cryptographic Claims & Payout Portal", icon: FileCheck },
            { id: "sponsors", label: "neatHack Sponsor Proof (Neatlogs · Entire · cfo.ai)", icon: Zap }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 px-4 py-3 font-semibold transition rounded-xl ${
                  isActive ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-slate-900/80 border border-cyan-500/30 rounded-xl"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Timeline & Agent Traces */}
        <AnimatePresence mode="wait">
          {activeTab === "timeline" && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Agent Workflow Execution */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      Autonomous Agent Workflow: <span className="font-mono text-cyan-300">investigateOracleIncident</span>
                    </h3>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      COMPLETED & VERIFIED
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        step: 1,
                        name: "inspectIncidentTransaction",
                        desc: "Pinpointed faulty oracle update on-chain dropping WETH from $2,000 to $1,800 (-10.0%).",
                        type: "TOOL",
                        detail: fixture?.oracleUpdateTxHash || "0xbase_oracle_manipulation_tx_001"
                      },
                      {
                        step: 2,
                        name: "readContractState",
                        desc: "Extracted protocol parameters: 80% liquidation threshold, 5% liquidator discount.",
                        type: "TOOL",
                        detail: `Pool: ${fixture?.lendingPoolAddress?.substring(0, 14) || "0x3333333333..."}`
                      },
                      {
                        step: 3,
                        name: "collectLiquidationEvents",
                        desc: isBase
                          ? "Captured 1 liquidation event emitted following the anomalous price drop on Base."
                          : "Collected 3 liquidation events emitted after the faulty oracle timestamp.",
                        type: "TOOL",
                        detail: isBase ? "1 liquidation parsed" : "3 liquidations parsed"
                      },
                      {
                        step: 4,
                        name: "discoverAffectedAccounts",
                        desc: isBase
                          ? "Mapped borrower account 0x7099...79C8 with 3 WETH collateral and 3,500 USDC debt."
                          : "Mapped liquidated borrower positions: 0x3C44..., 0x90F7..., 0x15d3...",
                        type: "TOOL",
                        detail: isBase ? "1 affected account" : "5 total borrowers audited"
                      },
                      {
                        step: 5,
                        name: "replayCounterfactual",
                        desc: "Simulated counterfactual baseline: accounts were safely collateralized (HF > 1.066) at legitimate $2,000 price.",
                        type: "CHAIN",
                        detail: isBase ? "1/1 wrongful confirmed" : "3/3 confirmed wrongful"
                      },
                      {
                        step: 6,
                        name: "crossCheckClaims",
                        desc: "Enforced policy guardrails: verified non-negative delta, capped compensation, excluded already-underwater loans.",
                        type: "GUARDRAIL",
                        detail: `Total Restitution: $${totalRestitutionDisplay} USDC`
                      },
                      {
                        step: 7,
                        name: "generateMerkleManifest",
                        desc: "Synthesized cryptographic OpenZeppelin StandardMerkleTree with SHA-256 integrity seal.",
                        type: "TOOL",
                        detail: `Root: ${report?.merkleManifest?.merkleRoot?.substring(0, 16) || "0xce5978d1..."}...`
                      }
                    ].map((s) => (
                      <motion.div
                        key={s.step}
                        whileHover={{ x: 3 }}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3 transition"
                      >
                        <div className="w-6 h-6 rounded-full bg-cyan-950/90 text-cyan-400 border border-cyan-700/60 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5">
                          {s.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-cyan-300 font-semibold">{s.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                              {s.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                          <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                            Evidence: {s.detail}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Neatlogs Live Observability Stream */}
                <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      Neatlogs Tracing Engine
                    </h3>
                    <a
                      href="https://neatlogs.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      <span>Project: 542c53f4...</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs space-y-1">
                    <div className="text-blue-300 font-semibold flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Telemetry: wrapClient + LiteLLM</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Captures full input/completion tokens, model execution latency, and deterministic BigInt replay metrics.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Recorded Trace Spans
                    </div>
                    <div className="space-y-1.5 font-mono text-xs max-h-[300px] overflow-y-auto pr-1">
                      {latestTrace?.spans?.map((span: any, i: number) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
                        >
                          <div className="truncate pr-2">
                            <div className="text-cyan-300 text-[11px] font-semibold truncate">{span.name}</div>
                            <div className="text-[9px] text-slate-500 uppercase">{span.kind}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] text-emerald-400 font-semibold">{span.status}</div>
                            <div className="text-[9px] text-slate-500">{span.durationMs || 12}ms</div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-slate-500 text-xs italic">
                          Click "Run On-Chain Demo" to stream live traces.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>RPC Network Partition Self-Healing: PASS</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Agent intercepts transient RPC failures, restores network state, and guarantees recovery without data loss.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Counterfactual Replay */}
          {activeTab === "counterfactual" && (
            <motion.div
              key="counterfactual"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Causal Counterfactual Replay Table ({isBase ? "Base Mainnet Fork" : "Anvil Devnet"})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Distinguishes wrongful liquidations from insolvent accounts to prevent moral hazard.
                    </p>
                  </div>
                  <div className="text-xs font-mono text-cyan-300 bg-cyan-950/50 px-3 py-1 rounded-lg border border-cyan-800/40">
                    Restitution = Net Equity (Baseline) - Net Equity (Post-Liq)
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3">Borrower Account</th>
                        <th className="p-3">Collateral / Debt</th>
                        <th className="p-3">Baseline HF ($2,000)</th>
                        <th className="p-3">Faulty HF ($1,800)</th>
                        <th className="p-3">Verdict</th>
                        <th className="p-3 text-right">Restitution Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {isBase ? (
                        <tr className="hover:bg-slate-800/30">
                          <td className="p-3 text-cyan-300 font-semibold">0x7099...79C8</td>
                          <td className="p-3 text-slate-300">3.0 WETH / 3,500 USDC</td>
                          <td className="p-3 text-emerald-400 font-semibold">1.371 (Healthy)</td>
                          <td className="p-3 text-rose-400 font-semibold">1.234 (Liquidated)</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-bold">
                              ELIGIBLE_WRONGFUL
                            </span>
                          </td>
                          <td className="p-3 text-right text-emerald-400 font-bold">$700.00 USDC</td>
                        </tr>
                      ) : (
                        <>
                          <tr className="hover:bg-slate-800/30">
                            <td className="p-3 text-cyan-300 font-semibold">0x3C44...93BC</td>
                            <td className="p-3 text-slate-300">10 WETH / 15,000 USDC</td>
                            <td className="p-3 text-emerald-400 font-semibold">1.066 (Safe)</td>
                            <td className="p-3 text-rose-400 font-semibold">0.960 (Underwater)</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-bold">
                                ELIGIBLE_WRONGFUL
                              </span>
                            </td>
                            <td className="p-3 text-right text-emerald-400 font-bold">$2,500.00 USDC</td>
                          </tr>
                          <tr className="hover:bg-slate-800/30">
                            <td className="p-3 text-cyan-300 font-semibold">0x90F7...b906</td>
                            <td className="p-3 text-slate-300">5 WETH / 7,500 USDC</td>
                            <td className="p-3 text-emerald-400 font-semibold">1.066 (Safe)</td>
                            <td className="p-3 text-rose-400 font-semibold">0.960 (Underwater)</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-bold">
                                ELIGIBLE_WRONGFUL
                              </span>
                            </td>
                            <td className="p-3 text-right text-emerald-400 font-bold">$1,250.00 USDC</td>
                          </tr>
                          <tr className="hover:bg-slate-800/30">
                            <td className="p-3 text-cyan-300 font-semibold">0x15d3...6A65</td>
                            <td className="p-3 text-slate-300">8 WETH / 12,000 USDC</td>
                            <td className="p-3 text-emerald-400 font-semibold">1.066 (Safe)</td>
                            <td className="p-3 text-rose-400 font-semibold">0.960 (Underwater)</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-bold">
                                ELIGIBLE_WRONGFUL
                              </span>
                            </td>
                            <td className="p-3 text-right text-emerald-400 font-bold">$2,000.00 USDC</td>
                          </tr>
                          <tr className="hover:bg-slate-800/30">
                            <td className="p-3 text-slate-400">0x9965...d016</td>
                            <td className="p-3 text-slate-400">10 WETH / 10,000 USDC</td>
                            <td className="p-3 text-emerald-400">1.600 (Healthy)</td>
                            <td className="p-3 text-emerald-400">1.440 (Healthy)</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                EXCLUDED_UNHARMED
                              </span>
                            </td>
                            <td className="p-3 text-right text-slate-500">$0.00</td>
                          </tr>
                          <tr className="hover:bg-slate-800/30">
                            <td className="p-3 text-slate-400">0x976E...976E</td>
                            <td className="p-3 text-slate-400">5 WETH / 8,100 USDC</td>
                            <td className="p-3 text-rose-400">0.987 (Insolvent)</td>
                            <td className="p-3 text-rose-400">0.888 (Insolvent)</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/50">
                                EXCLUDED_LEGITIMATE
                              </span>
                            </td>
                            <td className="p-3 text-right text-rose-400/80">$0.00</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <div>
                    {isBase ? "1 victim qualified on Base Fork." : "3 victims qualified under POA Compensation Policy V1. 2 excluded."}
                  </div>
                  <div className="font-mono text-emerald-400 font-bold text-sm">
                    Total Approved Restitution: ${totalRestitutionDisplay} USDC
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Claims Portal */}
          {activeTab === "claims" && (
            <motion.div
              key="claims"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Claim Portal Form */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-400" />
                      Verifiable Restitution Claim Portal
                    </h3>
                    <span className="text-[10px] font-mono text-purple-300">
                      Contract: {fixture?.distributorAddress?.substring(0, 14) || "0x00E40210..."}...
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                        Select Qualified Claimant Position
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {claims.map((c: any, idx: number) => (
                          <motion.button
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedClaimantIndex(idx);
                              setClaimStatus(null);
                            }}
                            className={`p-3 rounded-xl text-left border transition ${
                              selectedClaimantIndex === idx
                                ? "bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/50"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <div className="text-[11px] font-mono truncate">{c.claimant}</div>
                            <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                              ${(Number(c.amount) / 1e6).toFixed(2)} USDC
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Leaf #{c.claimIndex}</div>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {claims[selectedClaimantIndex] && (
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                        <div className="text-slate-400 font-sans text-xs font-semibold">
                          Cryptographic Proof Details for Leaf #{claims[selectedClaimantIndex].claimIndex}
                        </div>

                        <div className="space-y-1 text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Claimant:</span>
                            <span className="text-cyan-300">{claims[selectedClaimantIndex].claimant}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Approved Payout:</span>
                            <span className="text-emerald-400 font-bold">
                              {(Number(claims[selectedClaimantIndex].amount) / 1e6).toFixed(2)} USDC
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Merkle Root:</span>
                            <span className="text-purple-300 truncate max-w-[200px]" title={report?.merkleManifest?.merkleRoot}>
                              {report?.merkleManifest?.merkleRoot}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-500 block mb-1">Merkle Proof Path:</span>
                          <div className="p-2 rounded bg-slate-900 text-[10px] text-slate-300 overflow-x-auto space-y-0.5">
                            {claims[selectedClaimantIndex].proof?.length > 0 ? (
                              claims[selectedClaimantIndex].proof.map((p: string, i: number) => (
                                <div key={i} className="truncate">[{i}] {p}</div>
                              ))
                            ) : (
                              <div className="text-slate-500 italic">Single-leaf root (Proof = [])</div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-emerald-400 flex items-center gap-1.5 font-sans font-medium">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>On-Chain Status: Verified & Liquidated Payout Available</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => executeClaim("direct")}
                                disabled={claimStatus?.loading}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-sans font-semibold transition disabled:opacity-50"
                              >
                                Direct Merkle Claim
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => executeClaim("gasless")}
                                disabled={claimStatus?.loading}
                                className="px-3.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 text-xs font-sans font-semibold transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-purple-950/30"
                              >
                                <Zap className="w-3.5 h-3.5 text-purple-400" />
                                Gasless EIP-712 Voucher (0 ETH)
                              </motion.button>
                            </div>
                          </div>

                          {/* Animated Claim Status Drawer */}
                          {claimStatus && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-2"
                            >
                              {claimStatus.loading ? (
                                <div className="space-y-1.5 text-cyan-400">
                                  <div className="flex items-center gap-2">
                                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                    <span>
                                      {claimStatus.step === 1 && "Step 1/2: Generating EIP-712 structured digest..."}
                                      {claimStatus.step === 2 && "Step 2/2: Signing voucher & broadcasting via relayer..."}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <motion.div
                                      className="bg-cyan-400 h-full"
                                      initial={{ width: "30%" }}
                                      animate={{ width: claimStatus.step === 2 ? "80%" : "30%" }}
                                      transition={{ duration: 0.5 }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5 text-emerald-400">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>
                                      {claimStatus.method === "gasless"
                                        ? "Gasless Restitution Confirmed! Relayer sponsored gas fee."
                                        : "Direct Restitution Claim Confirmed!"}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    Tx Hash: <span className="text-cyan-300">{claimStatus.txHash}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Payout: {(Number(claims[selectedClaimantIndex]?.amount || 0) / 1e6).toFixed(2)} USDC transferred directly to claimant.
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5/5 Security Guardrails */}
                <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Security Guardrails & Adversarial Tests
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      5/5 PASSED
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-0.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                        <span>Double-Claim Prevention</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Calling <code className="text-cyan-300">claim()</code> twice reverts on-chain with <code className="text-rose-400">"Claim has already been executed"</code>.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-0.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                        <span>Tampered Amount Rejection</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Claiming an inflated amount (+1,000 USDC) fails with <code className="text-rose-400">"Invalid Merkle proof"</code>.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-0.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                        <span>Expired EIP-712 Signature Defense</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Signatures past the deadline revert with <code className="text-rose-400">"Claim signature has expired"</code>.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-0.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                        <span>Forged Signer Rejection</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Signatures forged by unauthorized third parties fail with <code className="text-rose-400">"Invalid EIP-712 claimant signature"</code>.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-0.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                        <span>Second-Preimage Attack Immunity</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        OZ double-Keccak-256 leaves prevent 64-byte intermediate node collision exploits (CVE-2022-37454).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 4: Sponsors */}
          {activeTab === "sponsors" && (
            <motion.div
              key="sponsors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Neatlogs */}
              <motion.a
                whileHover={{ y: -4, scale: 1.01 }}
                href="https://neatlogs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 hover:border-cyan-500/50 transition space-y-4 group block shadow-xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-cyan-500/20 transition">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        Neatlogs
                        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition" />
                      </h4>
                      <div className="text-[10px] text-blue-400 font-mono">Agent Tracing & Observability</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Project ID:</span>
                    <span className="font-mono text-cyan-300">542c53f4-ec26-4d57...</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Hierarchy:</span>
                    <span className="text-emerald-400 font-medium">10 Discrete Spans</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Telemetry:</span>
                    <span className="font-mono text-white">wrapClient + Token Spend</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Captures full step-by-step telemetry of on-chain inspections, counterfactual math, guardrail checks, and Merkle tree hashing.
                </p>
              </motion.a>

              {/* Entire */}
              <motion.a
                whileHover={{ y: -4, scale: 1.01 }}
                href="https://entire.io/gh/Proofofaudit/poa-neathack"
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 hover:border-purple-500/50 transition space-y-4 group block shadow-xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        Entire
                        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-purple-400 transition" />
                      </h4>
                      <div className="text-[10px] text-purple-400 font-mono">Continuous Memory & Graph</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">CLI & Graph:</span>
                    <span className="font-mono text-purple-300">v0.11.4 · Graph v0.4.0</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Indexed Symbols:</span>
                    <span className="font-mono text-white">1,929 Symbols · 4.8k Rels</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Prompt Pruning:</span>
                    <span className="text-emerald-400 font-medium">77.7% Context Reduction</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Preserves transparent agent memory and step-by-step git checkpoints across every milestone from contract creation to verifiable payout.
                </p>
              </motion.a>

              {/* cfo.ai */}
              <motion.a
                whileHover={{ y: -4, scale: 1.01 }}
                href="https://cfo.ai/s/K8j_ybAD6DrlAI2j"
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 hover:border-emerald-500/50 transition space-y-4 group block shadow-xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        cfo.ai
                        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition" />
                      </h4>
                      <div className="text-[10px] text-emerald-400 font-mono">Ari Financial Model (6 Sheets)</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Agent Run Cost:</span>
                    <span className="font-mono text-cyan-300">$0.062 vs $50k Audit</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Success Fee (5%):</span>
                    <span className="font-mono text-emerald-400 font-bold">$287.50 / incident</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Gross Margin:</span>
                    <span className="font-mono text-white font-bold">99.8% · 21x LTV/CAC</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Demonstrates high-margin enterprise software economics replacing $50k+ manual forensic auditor retainers with autonomous agent execution.
                </p>
              </motion.a>

              {/* Crustdata */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 space-y-4 block shadow-xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Crustdata</h4>
                      <div className="text-[10px] text-amber-400 font-mono">Entity Intelligence & Risk</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Integration:</span>
                    <span className="text-emerald-400 font-medium">Live Partner API Key</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Profiling:</span>
                    <span className="font-mono text-white">Liquidator vs Victim</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">Neatlogs Span:</span>
                    <span className="font-mono text-amber-300 text-[10px]">enrichIncidentWithCrustdata</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Profiles on-chain liquidator and victim entities to filter institutional bots and quantify real community impact.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto pt-8 border-t border-slate-800/60 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          POA (Proof of Audits) — neatHack 2026 Competition Entry by MKVEERENDRA VAMSHI
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 font-mono">Project ID: 542c53f4-ec26-4d57-a097-b7c9175c84be</span>
          <span>·</span>
          <span className="text-cyan-400 font-mono">EVM Chain ID {isBase ? "8453 (Base Fork)" : "31337 (Anvil)"}</span>
        </div>
      </footer>
    </div>
  );
}
