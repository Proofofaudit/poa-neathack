"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HealthFactorGaugeProps {
  detail: {
    address: string;
    collateral: string;
    debt: string;
    baselineHf: string | number;
    faultyHf: string | number;
    verdict: string;
    payout: string;
    reason: string;
    baselineEquity?: string;
    postLiqEquity?: string;
  };
  onProceedToClaim?: () => void;
}

export function HealthFactorGauge({ detail, onProceedToClaim }: HealthFactorGaugeProps) {
  const bHf = typeof detail.baselineHf === "string" ? parseFloat(detail.baselineHf) : detail.baselineHf;
  const fHf = typeof detail.faultyHf === "string" ? parseFloat(detail.faultyHf) : detail.faultyHf;

  const isEligible = detail.verdict === "ELIGIBLE_WRONGFUL";
  const isInsolvent = detail.verdict === "EXCLUDED_LEGITIMATE";
  const isUnharmed = detail.verdict === "EXCLUDED_UNHARMED";

  // Clamp percentages for visual bar (0.0 -> 2.0 mapped to 0% -> 100%, 1.0 is exactly 50%)
  const baselinePct = Math.min(100, Math.max(0, (bHf / 2.0) * 100));
  const faultyPct = Math.min(100, Math.max(0, (fHf / 2.0) * 100));

  return (
    <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/90 text-xs font-mono space-y-4 shadow-subtle animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-zinc-950 font-sans">
            Borrower Forensics: <span className="font-mono text-xs">{detail.address}</span>
          </span>
          {isEligible && <Badge variant="success">ELIGIBLE_WRONGFUL</Badge>}
          {isInsolvent && <Badge variant="danger">EXCLUDED_LEGITIMATE</Badge>}
          {isUnharmed && <Badge variant="accent">EXCLUDED_UNHARMED</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-[11px]">Approved Payout:</span>
          <span className={`text-sm font-bold ${isEligible ? "text-emerald-700 font-sans" : "text-zinc-500"}`}>
            {detail.payout}
          </span>
        </div>
      </div>

      {/* Visual Health Factor Comparison Gauges */}
      <div className="space-y-3 p-4 rounded-xl bg-white border border-zinc-200/80">
        <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-zinc-700">
          <span>Health Factor Comparative Analysis</span>
          <span className="text-zinc-400 font-mono text-[10px]">Liquidation Threshold = 1.000</span>
        </div>

        {/* Baseline Gauge Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-500 flex items-center gap-1 font-sans">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Baseline Price ($2,000 WETH)
            </span>
            <span className={`font-bold font-mono ${bHf >= 1.0 ? "text-emerald-700" : "text-rose-600"}`}>
              {bHf.toFixed(3)} {bHf >= 1.0 ? "· Healthy (Solvent)" : "· Underwater (Insolvent)"}
            </span>
          </div>
          <div className="relative h-3 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/60">
            {/* 1.0 Threshold Line Marker (50%) */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-400 z-10 -translate-x-1/2" />
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                bHf >= 1.0 ? "bg-emerald-500" : "bg-rose-500"
              }`}
              style={{ width: `${baselinePct}%` }}
            />
          </div>
        </div>

        {/* Faulty Anomaly Gauge Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-500 flex items-center gap-1 font-sans">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Faulty Plunge ($1,800 WETH)
            </span>
            <span className={`font-bold font-mono ${fHf >= 1.0 ? "text-emerald-700" : "text-rose-600"}`}>
              {fHf.toFixed(3)} {fHf >= 1.0 ? "· Still Safe" : "· Wrongfully Liquidated"}
            </span>
          </div>
          <div className="relative h-3 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/60">
            {/* 1.0 Threshold Line Marker (50%) */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-400 z-10 -translate-x-1/2" />
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                fHf >= 1.0 ? "bg-emerald-500" : "bg-rose-500"
              }`}
              style={{ width: `${faultyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Net Equity Math Breakdown Stack */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-white border border-zinc-200/80 space-y-1">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-sans font-semibold">
            Baseline Net Equity
          </div>
          <div className="text-sm font-bold text-zinc-950 font-mono">
            {detail.baselineEquity || "$5,000.00"}
          </div>
          <div className="text-[10px] text-zinc-500 font-sans">
            (Collateral × $2,000) − Debt
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-zinc-200/80 space-y-1">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-sans font-semibold">
            Post-Liquidation Equity
          </div>
          <div className="text-sm font-bold text-zinc-950 font-mono">
            {detail.postLiqEquity || (isInsolvent ? "$0.00" : "$2,500.00")}
          </div>
          <div className="text-[10px] text-zinc-500 font-sans">
            Seized by secondary MEV bot
          </div>
        </div>

        <div className={`p-3 rounded-xl border space-y-1 ${
          isEligible ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : "bg-zinc-100/70 border-zinc-200 text-zinc-700"
        }`}>
          <div className="text-[10px] uppercase tracking-wider font-sans font-semibold">
            Causal Net Restitution
          </div>
          <div className="text-base font-extrabold font-mono">
            {detail.payout}
          </div>
          <div className="text-[10px] font-sans">
            {isEligible ? "100% Compensated in Merkle Leaf" : "Excluded (No Loss or Moral Hazard)"}
          </div>
        </div>
      </div>

      {/* Rationale & Action */}
      <div className="p-3 rounded-xl bg-white border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-sans font-semibold">
            Causal Verification Rationale
          </span>
          <p className="text-xs text-zinc-700 font-sans">{detail.reason}</p>
        </div>

        {isEligible && onProceedToClaim && (
          <Button size="sm" onClick={onProceedToClaim} className="flex items-center gap-1.5 flex-shrink-0">
            <span>Proceed to Claims</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
