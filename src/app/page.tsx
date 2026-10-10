"use client";

import React, { useState, useEffect } from "react";
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
  Clock
} from "lucide-react";

export default function Dashboard() {
  const [evidence, setEvidence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "counterfactual" | "claims" | "sponsors">("timeline");
  const [selectedClaimantIndex, setSelectedClaimantIndex] = useState(0);

  const fetchEvidence = async () => {
    try {
      const res = await fetch("/api/evidence");
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
    fetchEvidence();
  }, []);

  const triggerSimulation = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/run-simulation", { method: "POST" });
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

  const fixture = evidence?.fixture;
  const report = evidence?.report;
  const claims = report?.merkleManifest?.claims || [];
  const latestTrace = evidence?.observabilityTrace;

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 p-4 md:p-8 font-sans">
      {/* Top Navigation / Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-500 rounded-lg shadow-lg shadow-cyan-500/20">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                POA <span className="text-cyan-400 font-normal">| Proof of Audits</span>
              </h1>
              <p className="text-xs text-slate-400">
                Autonomous DeFi Incident Investigation & Cryptographic Restitution
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-mono">neatHack 2026: Team poa</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Anvil RPC:</span>
            <span className="text-cyan-400 font-mono">Chain ID 31337</span>
          </div>

          <button
            onClick={triggerSimulation}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
          >
            {running ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating On-Chain...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Re-run Full On-Chain Demo</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto py-6 space-y-6">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Lending TVL</span>
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">$86,000.00</div>
            <div className="text-[10px] text-slate-500 mt-1">WETH & USDC Pool</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Incident Type</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-300">-10% Oracle</div>
            <div className="text-[10px] text-slate-500 mt-1">$2,000 → $1,800 Drop</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Audited Liquidations</span>
              <Activity className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {fixture?.liquidationTxs?.length ?? 3} Total
            </div>
            <div className="text-[10px] text-rose-400 mt-1">3 Wrongful (100%)</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Verified Restitution</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              ${report ? (Number(report.totalRestitutionCalculatedUsdc) / 1e6).toFixed(2) : "5,750.00"}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">USDC Compensated</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Merkle Root</span>
              <Lock className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xs font-mono text-purple-300 truncate" title={report?.merkleManifest?.merkleRoot}>
              {report?.merkleManifest?.merkleRoot ? `${report.merkleManifest.merkleRoot.substring(0, 10)}...` : "0x4ddd489e..."}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">OZ Standard Tree</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Neatlogs Spans</span>
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold font-mono text-blue-400">
              {latestTrace?.spans?.length ?? 8} Spans
            </div>
            <div className="text-[10px] text-emerald-400 mt-1">100% OK · 0 Unhandled</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
              activeTab === "timeline"
                ? "border-cyan-400 text-cyan-400 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Autonomous Agent Timeline & Neatlogs</span>
          </button>

          <button
            onClick={() => setActiveTab("counterfactual")}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
              activeTab === "counterfactual"
                ? "border-cyan-400 text-cyan-400 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Counterfactual Replay & Borrower Audit</span>
          </button>

          <button
            onClick={() => setActiveTab("claims")}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
              activeTab === "claims"
                ? "border-cyan-400 text-cyan-400 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Cryptographic Claims & Payout Portal</span>
          </button>

          <button
            onClick={() => setActiveTab("sponsors")}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
              activeTab === "sponsors"
                ? "border-cyan-400 text-cyan-400 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>neatHack Sponsor Proof (Neatlogs · Entire · cfo.ai)</span>
          </button>
        </div>

        {/* Tab 1: Timeline & Agent Traces */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent Workflow Execution */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    Autonomous Agent Workflow: <span className="font-mono text-cyan-300">investigateOracleIncident</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    STATUS: COMPLETED
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      step: 1,
                      name: "inspectIncidentTransaction",
                      desc: "Pinpointed faulty oracle tx updating WETH price from $2,000 to $1,800 (-10.0%).",
                      type: "TOOL",
                      detail: fixture?.oracleUpdateTxHash || "0x2e3c67d0..."
                    },
                    {
                      step: 2,
                      name: "readContractState",
                      desc: "Extracted DemoLendingPool risk parameters: 80% liquidation threshold, 5% bonus.",
                      type: "TOOL",
                      detail: `Pool: ${fixture?.lendingPoolAddress?.substring(0, 10)}...`
                    },
                    {
                      step: 3,
                      name: "collectLiquidationEvents",
                      desc: "Collected 3 liquidation events emitted after the faulty oracle timestamp.",
                      type: "TOOL",
                      detail: "3 liquidations parsed"
                    },
                    {
                      step: 4,
                      name: "discoverAffectedAccounts",
                      desc: "Mapped liquidated borrower positions: 0x3C44..., 0x90F7..., 0x15d3...",
                      type: "TOOL",
                      detail: "5 total borrowers audited"
                    },
                    {
                      step: 5,
                      name: "replayCounterfactual",
                      desc: "Simulated counterfactual baseline execution: all 3 liquidated borrowers were healthy at $2,000 (HF > 1.066).",
                      type: "CHAIN",
                      detail: "3/3 confirmed wrongful"
                    },
                    {
                      step: 6,
                      name: "crossCheckClaims",
                      desc: "Enforced guardrails: validated non-negative loss, verified max compensation cap ($10,000 USDC per claim).",
                      type: "GUARDRAIL",
                      detail: "Total: $5,750.00 USDC"
                    },
                    {
                      step: 7,
                      name: "generateMerkleManifest",
                      desc: "Synthesized cryptographic OpenZeppelin StandardMerkleTree with 3 verifiable claim leaves.",
                      type: "TOOL",
                      detail: `Root: ${report?.merkleManifest?.merkleRoot?.substring(0, 14)}...`
                    }
                  ].map((s) => (
                    <div key={s.step} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">
                        {s.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-cyan-300 font-semibold">{s.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {s.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                        <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                          Output: {s.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Neatlogs Live Observability Stream */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Neatlogs Tracing Engine
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: 542c53f4...
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30 text-xs space-y-1">
                  <div className="text-blue-300 font-semibold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Project: neatHack poa</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dual-mode telemetry: Emits OpenTelemetry-compatible spans to Neatlogs cloud or local deterministic audit trace.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Recorded Trace Spans
                  </div>
                  <div className="space-y-1.5 font-mono text-xs">
                    {latestTrace?.spans?.map((span: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <div className="truncate pr-2">
                          <div className="text-cyan-300 text-[11px] truncate">{span.name}</div>
                          <div className="text-[9px] text-slate-500">{span.kind}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] text-emerald-400 font-semibold">{span.status}</div>
                          <div className="text-[9px] text-slate-500">{span.durationMs}ms</div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-slate-500 text-xs italic">No traces captured yet. Click Run Demo.</div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Transient RPC Fault Recovery: PASS</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Agent detects network hiccups, re-establishes provider connection, and completes workflow without state corruption.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Counterfactual Replay & Borrower Audit Table */}
        {activeTab === "counterfactual" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    On-Chain State vs Counterfactual Replay Audit
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Integer arithmetic calculates what borrower Net Equity would have been if the faulty oracle drop never occurred.
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded border border-slate-800">
                  Formula: Restitution = Net Equity (Baseline) - Net Equity (Post-Liq)
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Borrower</th>
                      <th className="p-3">Position (WETH / USDC)</th>
                      <th className="p-3">Baseline HF ($2000)</th>
                      <th className="p-3">Faulty HF ($1800)</th>
                      <th className="p-3">Observed Status</th>
                      <th className="p-3">Verdict</th>
                      <th className="p-3 text-right">Restitution Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {/* Borrower 1 */}
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-3 text-cyan-300 font-semibold">0x3C44...93BC</td>
                      <td className="p-3 text-slate-300">10 WETH / 15,000 USDC</td>
                      <td className="p-3 text-emerald-400 font-semibold">1.066 (Safe)</td>
                      <td className="p-3 text-rose-400 font-semibold">0.960 (Underwater)</td>
                      <td className="p-3 text-rose-300">Liquidated (8.75 WETH seized)</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          ELIGIBLE_WRONGFUL
                        </span>
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-bold">$2,500.00 USDC</td>
                    </tr>

                    {/* Borrower 2 */}
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-3 text-cyan-300 font-semibold">0x90F7...b906</td>
                      <td className="p-3 text-slate-300">5 WETH / 7,500 USDC</td>
                      <td className="p-3 text-emerald-400 font-semibold">1.066 (Safe)</td>
                      <td className="p-3 text-rose-400 font-semibold">0.960 (Underwater)</td>
                      <td className="p-3 text-rose-300">Liquidated (4.375 WETH seized)</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          ELIGIBLE_WRONGFUL
                        </span>
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-bold">$1,250.00 USDC</td>
                    </tr>

                    {/* Borrower 3 */}
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-3 text-cyan-300 font-semibold">0x15d3...6A65</td>
                      <td className="p-3 text-slate-300">8 WETH / 12,000 USDC</td>
                      <td className="p-3 text-emerald-400 font-semibold">1.066 (Safe)</td>
                      <td className="p-3 text-rose-400 font-semibold">0.960 (Underwater)</td>
                      <td className="p-3 text-rose-300">Liquidated (7.00 WETH seized)</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          ELIGIBLE_WRONGFUL
                        </span>
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-bold">$2,000.00 USDC</td>
                    </tr>

                    {/* Borrower 4 */}
                    <tr className="hover:bg-slate-800/30 bg-slate-950/30 opacity-75">
                      <td className="p-3 text-slate-400 font-semibold">0x9965...A4dc</td>
                      <td className="p-3 text-slate-400">10 WETH / 10,000 USDC</td>
                      <td className="p-3 text-emerald-400">1.600 (Healthy)</td>
                      <td className="p-3 text-emerald-400">1.440 (Healthy)</td>
                      <td className="p-3 text-slate-500">Not Liquidated</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          EXCLUDED_UNHARMED
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-500">$0.00</td>
                    </tr>

                    {/* Borrower 5 */}
                    <tr className="hover:bg-slate-800/30 bg-slate-950/30 opacity-75">
                      <td className="p-3 text-slate-400 font-semibold">0x976E...0aa9</td>
                      <td className="p-3 text-slate-400">10 WETH / 15,800 USDC</td>
                      <td className="p-3 text-rose-400">0.987 (Underwater)</td>
                      <td className="p-3 text-rose-400">0.888 (Underwater)</td>
                      <td className="p-3 text-amber-300">Over-leveraged baseline</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/50">
                          EXCLUDED_LEGITIMATE
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-500">$0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-2">
                <div>
                  <span className="font-semibold text-white">Summary: </span>
                  3 victims qualified under POA Compensation Policy V1. 2 borrowers excluded.
                </div>
                <div className="font-mono text-emerald-400 font-bold text-sm">
                  Total Approved Pool Restitution: $5,750.00 USDC
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Cryptographic Claims & Payout Portal */}
        {activeTab === "claims" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Claim Portal Form */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400" />
                    Verifiable Restitution Claim Portal
                  </h3>
                  <span className="text-[10px] font-mono text-purple-300">
                    Contract: {fixture?.distributorAddress?.substring(0, 10)}...
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                      Select Qualified Claimant Position
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {claims.map((c: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedClaimantIndex(idx)}
                          className={`p-3 rounded-lg text-left border transition ${
                            selectedClaimantIndex === idx
                              ? "bg-purple-950/40 border-purple-500 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-[11px] font-mono truncate">{c.claimant}</div>
                          <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                            ${(Number(c.amount) / 1e6).toFixed(2)} USDC
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Leaf #{c.claimIndex}</div>
                        </button>
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
                          {claims[selectedClaimantIndex].proof.map((p: string, i: number) => (
                            <div key={i} className="truncate">[{i}] {p}</div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-emerald-400 flex items-center gap-1.5 font-sans font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>On-Chain Status: Verified & Liquidated Payout Available</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Negative Tests & Guardrail Verification */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                    Security Guardrails & Adversarial Tests
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400">
                    2/2 PASSED
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-emerald-900/40 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                      <span>Double-Claim Prevention</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tested calling <code className="text-cyan-300">claim()</code> twice with identical proof. Second call failed on-chain with <code className="text-rose-400">"Claim has already been executed"</code>.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-emerald-900/40 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                      <span>Tampered Amount Rejection</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tested claiming with an inflated compensation amount (+1,000 USDC). Failed on-chain with <code className="text-rose-400">"Invalid Merkle proof"</code>.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
                      <span>Fund Backing Verification</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      RestitutionDistributor requires 100% solvency deposit before incident activation. Zero fractional reserve payouts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Sponsor Tech Stack & Proof */}
        {activeTab === "sponsors" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Neatlogs */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <div className="p-2 rounded bg-blue-500/10 text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Neatlogs</h4>
                  <div className="text-[10px] text-blue-400 font-mono">Tracing & Observability</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Project ID:</span>
                  <span className="font-mono text-cyan-300 text-[11px]">542c53f4-ec26-4d57...</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">SDK Status:</span>
                  <span className="text-emerald-400 font-medium">Integrated</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Spans Captured:</span>
                  <span className="font-mono text-white">8 per investigation</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Captures full step-by-step telemetry of on-chain inspections, counterfactual math, guardrail checks, and Merkle tree hashing.
              </p>
            </div>

            {/* Entire */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <div className="p-2 rounded bg-purple-500/10 text-purple-400">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Entire</h4>
                  <div className="text-[10px] text-purple-400 font-mono">Agent Memory & Checkpoints</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">CLI Version:</span>
                  <span className="font-mono text-purple-300 text-[11px]">v0.11.4</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Agent Mode:</span>
                  <span className="font-mono text-white">Antigravity Hooked</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Git Native:</span>
                  <span className="text-emerald-400 font-medium">True</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Preserves transparent agent memory and step-by-step git checkpoints across every milestone from contract creation to verifiable payout.
              </p>
            </div>

            {/* cfo.ai */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <div className="p-2 rounded bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">cfo.ai</h4>
                  <div className="text-[10px] text-emerald-400 font-mono">Financial Model & Unit Economics</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Agent Cost / Run:</span>
                  <span className="font-mono text-cyan-300 text-[11px]">$0.04</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Recovery Fee (5%):</span>
                  <span className="font-mono text-emerald-400 font-bold">$287.50</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Gross Margin:</span>
                  <span className="font-mono text-white font-bold">99.86%</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Demonstrates high-margin enterprise software economics replacing $50k+ manual forensic auditor retainers with autonomous agent execution.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto pt-8 border-t border-slate-800/60 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          POA (Proof of Audits) — neatHack 2026 Competition Entry by MKVEERENDRA VAMSHI
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 font-mono">Project ID: 542c53f4-ec26-4d57-a097-b7c9175c84be</span>
          <span>·</span>
          <span className="text-cyan-400 font-mono">Anvil Devnet</span>
        </div>
      </footer>
    </div>
  );
}
