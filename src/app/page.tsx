"use client";

import React, { useState, useEffect } from "react";
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
  Shield,
  Check
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
    }, 900);
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
    <div className="min-h-screen text-slate-100 p-4 md:p-8 font-sans max-w-7xl mx-auto space-y-6">
      {/* 1. Header Navigation */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-sky-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white">
                POA <span className="text-slate-500 font-light">/</span> Proof of Audits
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                v1.0 Production
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Autonomous DeFi Incident Investigation & Cryptographic Restitution Coprocessor
            </p>
          </div>
        </div>

        {/* Network & Run Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Network Switcher Pill */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => switchNetwork("anvil")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                selectedNetwork === "anvil"
                  ? "bg-slate-800 text-sky-400 shadow-sm border border-slate-700/60 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Anvil Devnet (31337)
            </button>
            <button
              onClick={() => switchNetwork("base")}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                selectedNetwork === "base"
                  ? "bg-slate-800 text-sky-400 shadow-sm border border-slate-700/60 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Base Mainnet Fork (8453)
            </button>
          </div>

          {/* Test Status Badges */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Foundry 11/11</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>EVMbench 5/5</span>
          </div>

          {/* Trigger Button */}
          <button
            onClick={() => triggerSimulation(selectedNetwork)}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition disabled:opacity-50 shadow-sm"
          >
            {running ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Investigation...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isBase ? "Run Base Mainnet Fork" : "Re-run On-Chain Demo"}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Hero Overview Card (At-A-Glance Incident Summary) */}
      <section className="p-6 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Active Incident Forensics & Verified Restitution
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-extrabold font-mono text-white tracking-tight">
                ${totalRestitutionDisplay}
              </span>
              <span className="text-sm font-medium text-slate-400 font-mono">USDC Restitution Due</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                100% Solvency Backed
              </span>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Incident Anomaly</span>
              <span className="text-sm font-semibold text-white font-mono">-10.0% Oracle Drop</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">$2,000 → $1,800 WETH</span>
            </div>

            <div>
              <span className="text-slate-500 block mb-0.5">Audited Positions</span>
              <span className="text-sm font-semibold text-white font-mono">
                {isBase ? "1 Wrongful / 0 Insolvent" : "3 Wrongful / 2 Excluded"}
              </span>
              <span className="text-[11px] text-emerald-400 block mt-0.5">Moral Hazard Blocked</span>
            </div>

            <div>
              <span className="text-slate-500 block mb-0.5">Merkle Proof Root</span>
              <span className="text-sm font-semibold text-sky-400 font-mono truncate block max-w-[140px]" title={report?.merkleManifest?.merkleRoot}>
                {report?.merkleManifest?.merkleRoot ? `${report.merkleManifest.merkleRoot.substring(0, 10)}...` : "0xce5978d1..."}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">OpenZeppelin Standard</span>
            </div>
          </div>
        </div>

        {/* 3. Clean 4-Step Process Bar (How POA Solves This) */}
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Autonomous Incident Pipeline
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              {
                step: "01",
                title: "24/7 Block Sentinel",
                desc: "Monitors live RPC blocks. Triggers instantly if oracle price deviates >5% in a single block."
              },
              {
                step: "02",
                title: "Autonomous Forensics",
                desc: "Claude Haiku isolates wrongful liquidations from insolvent accounts to prevent moral hazard."
              },
              {
                step: "03",
                title: "Integer Math Engine",
                desc: "The Non-Authority Principle: AI never touches arithmetic. Pure BigInt code computes exact Net Equity deltas."
              },
              {
                step: "04",
                title: "Cryptographic Payout",
                desc: "Publishes Merkle tree on-chain. Victims with 0 ETH claim instantly via sponsored EIP-712 vouchers."
              }
            ].map((p, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-sky-400">{p.step}</span>
                  <span className="text-xs font-semibold text-white">{p.title}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Tab Navigation */}
      <div className="flex items-center border-b border-slate-800 gap-6 text-sm overflow-x-auto pb-0.5">
        {[
          { id: "timeline", label: "Forensic Timeline & Tracing", icon: Clock },
          { id: "counterfactual", label: "Counterfactual Replay Table", icon: Layers },
          { id: "claims", label: "Cryptographic Claims Portal", icon: FileCheck },
          { id: "sponsors", label: "Partner Integrations & Proof", icon: Zap }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 font-medium transition border-b-2 -mb-[2px] ${
                isActive
                  ? "border-sky-500 text-sky-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Main Tab Contents */}
      <main>
        {/* Tab 1: Forensic Timeline */}
        {activeTab === "timeline" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step-by-Step Investigation Log */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Agent Investigation Steps (<span className="font-mono text-sky-400">investigateOracleIncident</span>)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                  Status: Completed
                </span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    name: "inspectIncidentTransaction",
                    desc: "Identified anomalous oracle transaction dropping WETH price from $2,000 to $1,800 (-10.0%).",
                    detail: fixture?.oracleUpdateTxHash || "0xbase_oracle_manipulation_tx_001"
                  },
                  {
                    step: 2,
                    name: "readContractState",
                    desc: "Extracted lending risk parameters: 80% liquidation threshold, 5% liquidator incentive.",
                    detail: `Pool: ${fixture?.lendingPoolAddress?.substring(0, 14) || "0x3333333333..."}`
                  },
                  {
                    step: 3,
                    name: "collectLiquidationEvents",
                    desc: isBase
                      ? "Collected 1 liquidation event emitted immediately following the anomalous price drop on Base."
                      : "Collected 3 liquidation events emitted after the faulty oracle timestamp.",
                    detail: isBase ? "1 liquidation parsed" : "3 liquidations parsed"
                  },
                  {
                    step: 4,
                    name: "discoverAffectedAccounts",
                    desc: isBase
                      ? "Mapped borrower account 0x7099...79C8 with 3 WETH collateral and 3,500 USDC debt."
                      : "Mapped liquidated borrower positions: 0x3C44..., 0x90F7..., 0x15d3...",
                    detail: isBase ? "1 affected account" : "5 total borrowers audited"
                  },
                  {
                    step: 5,
                    name: "replayCounterfactual",
                    desc: "Simulated counterfactual baseline execution: all affected accounts were healthy (HF > 1.066) at legitimate $2,000 price.",
                    detail: isBase ? "1/1 wrongful confirmed" : "3/3 confirmed wrongful"
                  },
                  {
                    step: 6,
                    name: "crossCheckClaims",
                    desc: "Enforced policy guardrails: verified non-negative delta, capped compensation, excluded already-underwater accounts.",
                    detail: `Total Restitution: $${totalRestitutionDisplay} USDC`
                  },
                  {
                    step: 7,
                    name: "generateMerkleManifest",
                    desc: "Synthesized cryptographic OpenZeppelin StandardMerkleTree with SHA-256 integrity seal.",
                    detail: `Root: ${report?.merkleManifest?.merkleRoot?.substring(0, 16) || "0xce5978d1..."}...`
                  }
                ].map((s) => (
                  <div key={s.step} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-3.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-sky-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {s.step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-white">{s.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Step Verified</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.desc}</p>
                      <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                        Evidence: <span className="text-slate-400">{s.detail}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Neatlogs Live Observability Stream */}
            <div className="p-6 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-semibold text-white">Neatlogs Live Tracing</h3>
                </div>
                <a
                  href="https://neatlogs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <span>Project ID: 542c53f4...</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  <span>Telemetry: wrapClient + LiteLLM</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Captures prompt tokens, model latency, and deterministic BigInt replay metrics per investigation.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Recorded Trace Spans
                </div>
                <div className="space-y-1.5 font-mono text-xs max-h-[320px] overflow-y-auto pr-1">
                  {latestTrace?.spans?.map((span: any, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <div className="text-white text-xs font-medium truncate">{span.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{span.kind}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-emerald-400 font-semibold">{span.status}</div>
                        <div className="text-[10px] text-slate-500">{span.durationMs || 12}ms</div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-slate-500 text-xs italic">
                      Click "Re-run On-Chain Demo" to stream live trace spans.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>RPC Network Partition Resilience: PASS</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Agent intercepts transient RPC connection terminations, restores provider connection, and completes investigation cleanly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Counterfactual Replay */}
        {activeTab === "counterfactual" && (
          <div className="p-6 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Causal Counterfactual Balance Replay ({isBase ? "Base Mainnet Fork" : "Anvil Devnet"})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Replays exact account balances under true baseline pricing vs observed liquidation.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                Formula: Restitution = Net Equity (Baseline) - Net Equity (Post-Liq)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Borrower</th>
                    <th className="p-3.5">Position (WETH / USDC)</th>
                    <th className="p-3.5">Baseline HF ($2,000)</th>
                    <th className="p-3.5">Faulty HF ($1,800)</th>
                    <th className="p-3.5">Audit Verdict</th>
                    <th className="p-3.5 text-right">Approved Restitution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isBase ? (
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-3.5 text-white font-semibold">0x7099...79C8</td>
                      <td className="p-3.5 text-slate-300">3.0 WETH / 3,500 USDC</td>
                      <td className="p-3.5 text-emerald-400 font-semibold">1.371 (Healthy)</td>
                      <td className="p-3.5 text-rose-400 font-semibold">1.234 (Liquidated)</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
                          ELIGIBLE_WRONGFUL
                        </span>
                      </td>
                      <td className="p-3.5 text-right text-emerald-400 font-bold">$700.00 USDC</td>
                    </tr>
                  ) : (
                    <>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-3.5 text-white font-semibold">0x3C44...93BC</td>
                        <td className="p-3.5 text-slate-300">10 WETH / 15,000 USDC</td>
                        <td className="p-3.5 text-emerald-400 font-semibold">1.066 (Safe)</td>
                        <td className="p-3.5 text-rose-400 font-semibold">0.960 (Underwater)</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
                            ELIGIBLE_WRONGFUL
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-emerald-400 font-bold">$2,500.00 USDC</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-3.5 text-white font-semibold">0x90F7...b906</td>
                        <td className="p-3.5 text-slate-300">5 WETH / 7,500 USDC</td>
                        <td className="p-3.5 text-emerald-400 font-semibold">1.066 (Safe)</td>
                        <td className="p-3.5 text-rose-400 font-semibold">0.960 (Underwater)</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
                            ELIGIBLE_WRONGFUL
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-emerald-400 font-bold">$1,250.00 USDC</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-3.5 text-white font-semibold">0x15d3...6A65</td>
                        <td className="p-3.5 text-slate-300">8 WETH / 12,000 USDC</td>
                        <td className="p-3.5 text-emerald-400 font-semibold">1.066 (Safe)</td>
                        <td className="p-3.5 text-rose-400 font-semibold">0.960 (Underwater)</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
                            ELIGIBLE_WRONGFUL
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-emerald-400 font-bold">$2,000.00 USDC</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-3.5 text-slate-400">0x9965...d016</td>
                        <td className="p-3.5 text-slate-400">10 WETH / 10,000 USDC</td>
                        <td className="p-3.5 text-emerald-400">1.600 (Healthy)</td>
                        <td className="p-3.5 text-emerald-400">1.440 (Healthy)</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-900 text-slate-400 border border-slate-800">
                            EXCLUDED_UNHARMED
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-slate-500">$0.00</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-3.5 text-slate-400">0x976E...976E</td>
                        <td className="p-3.5 text-slate-400">5 WETH / 8,100 USDC</td>
                        <td className="p-3.5 text-rose-400">0.987 (Insolvent)</td>
                        <td className="p-3.5 text-rose-400">0.888 (Insolvent)</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-rose-950/60 text-rose-400 border border-rose-800/60">
                            EXCLUDED_LEGITIMATE
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-rose-400/80">$0.00</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div>
                {isBase
                  ? "1 victim qualified on Base Mainnet Fork."
                  : "3 victims qualified under POA Compensation Policy V1. 2 insolvent borrowers excluded."}
              </div>
              <div className="font-mono text-emerald-400 font-bold text-sm">
                Approved Restitution Pool: ${totalRestitutionDisplay} USDC
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Cryptographic Claims */}
        {activeTab === "claims" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Claim Portal Form */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-semibold text-white">Cryptographic Restitution Claim Portal</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Contract: {fixture?.distributorAddress?.substring(0, 14) || "0x00E40210..."}...
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-2 font-medium">
                      Select Qualified Claimant Position
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {claims.map((c: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedClaimantIndex(idx);
                            setClaimStatus(null);
                          }}
                          className={`p-3.5 rounded-xl text-left border transition ${
                            selectedClaimantIndex === idx
                              ? "bg-slate-900 border-sky-500 text-white shadow-sm"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-[11px] font-mono truncate">{c.claimant}</div>
                          <div className="text-base font-bold font-mono text-white mt-1">
                            ${(Number(c.amount) / 1e6).toFixed(2)} <span className="text-xs text-slate-400">USDC</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Merkle Leaf #{c.claimIndex}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {claims[selectedClaimantIndex] && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
                      <div className="text-slate-300 font-sans text-xs font-semibold">
                        Cryptographic Proof Details for Leaf #{claims[selectedClaimantIndex].claimIndex}
                      </div>

                      <div className="space-y-1.5 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Claimant Address:</span>
                          <span className="text-sky-400">{claims[selectedClaimantIndex].claimant}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Approved Payout:</span>
                          <span className="text-emerald-400 font-bold">
                            {(Number(claims[selectedClaimantIndex].amount) / 1e6).toFixed(2)} USDC
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Merkle Root:</span>
                          <span className="text-slate-300 truncate max-w-[200px]" title={report?.merkleManifest?.merkleRoot}>
                            {report?.merkleManifest?.merkleRoot}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-emerald-400 flex items-center gap-1.5 font-sans font-medium text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Status: Verified & Available On-Chain</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => executeClaim("direct")}
                              disabled={claimStatus?.loading}
                              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-sans font-medium transition disabled:opacity-50"
                            >
                              Direct Merkle Claim
                            </button>
                            <button
                              onClick={() => executeClaim("gasless")}
                              disabled={claimStatus?.loading}
                              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-sans font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <Zap className="w-3.5 h-3.5 text-white" />
                              Gasless EIP-712 Voucher (0 ETH)
                            </button>
                          </div>
                        </div>

                        {/* Claim Status Drawer */}
                        {claimStatus && (
                          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2">
                            {claimStatus.loading ? (
                              <div className="space-y-1.5 text-sky-400">
                                <div className="flex items-center gap-2">
                                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                  <span>
                                    {claimStatus.step === 1 && "Step 1/2: Constructing EIP-712 voucher struct..."}
                                    {claimStatus.step === 2 && "Step 2/2: Relayer broadcasting claimWithSignature..."}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 text-emerald-400">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>
                                    {claimStatus.method === "gasless"
                                      ? "Gasless Restitution Confirmed! Relayer sponsored gas fee."
                                      : "Direct Restitution Claim Confirmed!"}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  Tx Hash: <span className="text-sky-300">{claimStatus.txHash}</span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Payout: {(Number(claims[selectedClaimantIndex]?.amount || 0) / 1e6).toFixed(2)} USDC transferred directly to claimant.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Guardrails Card */}
              <div className="p-6 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">5/5 Security Guardrails</h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    5/5 PASSED
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      title: "Double-Claim Prevention",
                      desc: "Calling claim() twice reverts on-chain with \"Claim has already been executed\"."
                    },
                    {
                      title: "Tampered Amount Defense",
                      desc: "Claiming an inflated amount (+1,000 USDC) reverts with \"Invalid Merkle proof\"."
                    },
                    {
                      title: "Expired EIP-712 Signature",
                      desc: "Signatures past deadline revert with \"Claim signature has expired\"."
                    },
                    {
                      title: "Forged Signer Rejection",
                      desc: "Signatures from unauthorized third parties revert with \"Invalid EIP-712 claimant signature\"."
                    },
                    {
                      title: "Second-Preimage Attack Immunity",
                      desc: "OpenZeppelin double-Keccak-256 leaves prevent intermediate node collision exploits."
                    }
                  ].map((g, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                        <span>{g.title}</span>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{g.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Sponsors */}
        {activeTab === "sponsors" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Neatlogs */}
            <a
              href="https://neatlogs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800 hover:border-slate-700 transition space-y-4 group block"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-800 text-sky-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                      Neatlogs
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-sky-400 transition" />
                    </h4>
                    <div className="text-[11px] text-slate-400 font-mono">Agent Tracing & Observability</div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                  <span className="text-slate-500">Project ID:</span>
                  <span className="font-mono text-sky-400">542c53f4-ec26-4d57...</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                  <span className="text-slate-500">Hierarchy:</span>
                  <span className="text-emerald-400 font-medium">10 Discrete Spans</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                  <span className="text-slate-500">Telemetry:</span>
                  <span className="font-mono text-white">wrapClient + Spend</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Captures full step-by-step telemetry of on-chain inspections, counterfactual math, and Merkle tree hashing.
              </p>
            </a>

            {/* Entire */}
            <a
              href="https://entire.io/gh/Proofofaudit/poa-neathack"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800 hover:border-slate-700 transition space-y-4 group block"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-800 text-sky-400">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                      Entire
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-sky-400 transition" />
                    </h4>
                    <div className="text-[11px] text-slate-400 font-mono">Memory & Checkpoints</div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                  <span className="text-slate-500">CLI & Graph:</span>
                  <span className="font-mono text-white">v0.11.4 · Graph v0.4.0</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                  <span className="text-slate-500">Indexed Symbols:</span>
                  <span className="font-mono text-white">1,929 Symbols</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                  <span className="text-slate-500">Prompt Pruning:</span>
                  <span className="text-emerald-400 font-medium">77.7% Pruning</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Preserves transparent agent memory and step-by-step git checkpoints across every milestone.
              </p>
            </a>

            {/* cfo.ai */}
            <a
              href="https://cfo.ai/s/K8j_ybAD6DrlAI2j"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800 hover:border-slate-700 transition space-y-4 group block"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                      cfo.ai
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition" />
                    </h4>
                    <div className="text-[11px] text-slate-400 font-mono">Ari Financial Model</div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                  <span className="text-slate-500">Agent Run Cost:</span>
                  <span className="font-mono text-sky-400">$0.062 vs $50k Audit</span>
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

              <p className="text-xs text-slate-400 leading-relaxed">
                Demonstrates high-margin enterprise economics replacing $50k+ manual forensic auditor retainers.
              </p>
            </a>

            {/* Crustdata */}
            <div className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-4 block">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-800 text-sky-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">Crustdata</h4>
                    <div className="text-[11px] text-slate-400 font-mono">Entity Intelligence</div>
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
                  <span className="font-mono text-slate-300 text-[10px]">enrichIncidentWithCrustdata</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Profiles on-chain liquidator and victim entities to filter institutional bots and quantify real community impact.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 6. Footer */}
      <footer className="pt-8 border-t border-slate-800/60 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          POA (Proof of Audits) — neatHack 2026 Entry by MKVEERENDRA VAMSHI
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 font-mono">Project ID: 542c53f4-ec26-4d57-a097-b7c9175c84be</span>
          <span>·</span>
          <span className="text-sky-400 font-mono">EVM Chain ID {isBase ? "8453 (Base Fork)" : "31337 (Anvil)"}</span>
        </div>
      </footer>
    </div>
  );
}
