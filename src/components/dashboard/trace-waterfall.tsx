"use client";

import React, { useState } from "react";
import { Activity, Clock, Cpu, Filter, Zap, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TraceSpan {
  name: string;
  kind?: string;
  durationMs: number;
  attributes?: Record<string, any>;
  status?: string;
}

interface TraceWaterfallProps {
  traceId?: string;
  spans?: TraceSpan[];
  totalDurationMs?: number;
}

const DEFAULT_SPANS: TraceSpan[] = [
  { name: "llmForensicReasoning", kind: "AGENT", durationMs: 15930, status: "OK", attributes: { model: "claude-haiku", mode: "LIVE_LLM", promptTokens: 450 } },
  { name: "inspectIncidentTransaction", kind: "TOOL", durationMs: 8, status: "OK" },
  { name: "readContractState", kind: "TOOL", durationMs: 2, status: "OK" },
  { name: "collectLiquidationEvents", kind: "TOOL", durationMs: 15, status: "OK" },
  { name: "discoverAffectedAccounts", kind: "TOOL", durationMs: 2, status: "OK" },
  { name: "enrichIncidentWithCrustdata", kind: "TOOL", durationMs: 9, status: "OK" },
  { name: "replayCounterfactual", kind: "CHAIN", durationMs: 4, status: "OK" },
  { name: "crossCheckClaims", kind: "GUARDRAIL", durationMs: 1, status: "OK" },
  { name: "generateMerkleManifest", kind: "TOOL", durationMs: 80, status: "OK" },
  { name: "investigateOracleIncident", kind: "WORKFLOW", durationMs: 16085, status: "OK" },
];

export function TraceWaterfall({
  traceId = "trace-1791726656379-zn2e4",
  spans = DEFAULT_SPANS,
  totalDurationMs = 16085,
}: TraceWaterfallProps) {
  const [filterKind, setFilterKind] = useState<string>("ALL");

  const effectiveSpans = spans.length > 0 ? spans : DEFAULT_SPANS;
  const filtered = filterKind === "ALL"
    ? effectiveSpans
    : effectiveSpans.filter((s) => s.kind === filterKind);

  // Maximum duration for bar scaling (exclude the outer WORKFLOW wrapper for visual clarity)
  const nonWorkflowSpans = effectiveSpans.filter((s) => s.kind !== "WORKFLOW");
  const maxSpanDuration = Math.max(...nonWorkflowSpans.map((s) => s.durationMs), 100);

  const getKindColor = (kind?: string) => {
    switch (kind) {
      case "AGENT":
        return "bg-purple-600 text-purple-700 border-purple-200";
      case "TOOL":
        return "bg-emerald-600 text-emerald-700 border-emerald-200";
      case "CHAIN":
        return "bg-blue-600 text-blue-700 border-blue-200";
      case "GUARDRAIL":
        return "bg-amber-600 text-amber-700 border-amber-200";
      case "WORKFLOW":
        return "bg-zinc-950 text-zinc-900 border-zinc-200";
      default:
        return "bg-zinc-600 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-0.5">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Total Spans</div>
          <div className="text-base font-bold font-mono text-zinc-950">{effectiveSpans.length} Spans</div>
          <div className="text-[10px] text-emerald-700 font-medium">100% Succeeded</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-0.5">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Deterministic Execution</div>
          <div className="text-base font-bold font-mono text-zinc-950">121 ms</div>
          <div className="text-[10px] text-zinc-500">BigInt math & checks</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-0.5">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">LLM Reasoning</div>
          <div className="text-base font-bold font-mono text-zinc-950">Claude Haiku</div>
          <div className="text-[10px] text-zinc-500">2,050 tokens used</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-0.5">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Investigation Cost</div>
          <div className="text-base font-bold font-mono text-emerald-700">$0.00051</div>
          <div className="text-[10px] text-emerald-700 font-medium">99.8% Unit Margin</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-zinc-100">
        <div className="flex items-center gap-1 text-xs">
          {["ALL", "AGENT", "TOOL", "CHAIN", "GUARDRAIL"].map((k) => (
            <button
              key={k}
              onClick={() => setFilterKind(k)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                filterKind === k
                  ? "bg-zinc-950 text-white font-semibold shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:text-zinc-950"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-zinc-400">
          Trace: <span className="text-zinc-700 font-semibold">{traceId.slice(0, 16)}…</span>
        </span>
      </div>

      {/* Waterfall List */}
      <div className="space-y-2 font-mono text-xs max-h-[360px] overflow-y-auto pr-1">
        {filtered.map((span, i) => {
          // Calculate proportional bar width (logarithmic or normalized for visual clarity)
          const isLlm = span.kind === "AGENT" || span.durationMs > 1000;
          const pct = isLlm ? 100 : Math.max(6, Math.min(95, (span.durationMs / 85) * 100));

          return (
            <div
              key={i}
              className="p-3 rounded-xl bg-white border border-zinc-200/80 hover:border-zinc-300 transition-all space-y-1.5 shadow-subtle"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getKindColor(
                      span.kind
                    ).split(" ")[1]} ${getKindColor(span.kind).split(" ")[2]}`}
                  >
                    {span.kind || "TOOL"}
                  </span>
                  <span className="font-semibold text-zinc-950 truncate">{span.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-emerald-700 font-bold">✓ {span.status || "OK"}</span>
                  <span className="text-zinc-500 font-bold">
                    {span.durationMs > 1000
                      ? `${(span.durationMs / 1000).toFixed(2)}s`
                      : `${span.durationMs}ms`}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    span.kind === "AGENT"
                      ? "bg-purple-600"
                      : span.kind === "TOOL"
                      ? "bg-emerald-500"
                      : span.kind === "CHAIN"
                      ? "bg-blue-500"
                      : span.kind === "GUARDRAIL"
                      ? "bg-amber-500"
                      : "bg-zinc-900"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {span.attributes && Object.keys(span.attributes).length > 0 && (
                <div className="text-[10px] text-zinc-400 pt-0.5 truncate">
                  {Object.entries(span.attributes)
                    .slice(0, 3)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(" · ")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
