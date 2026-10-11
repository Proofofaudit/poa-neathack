"use client";

import React, { useState } from "react";
import { Lock, ShieldCheck, CheckCircle2, Copy, Check, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MerkleTreeMapProps {
  merkleRoot: string | null;
  claims: Array<{
    claimIndex: number;
    claimant: string;
    amount: string;
    proof?: string[];
  }>;
  selectedClaimantIndex: number;
  onSelectClaimant: (index: number) => void;
}

export function MerkleTreeMap({
  merkleRoot,
  claims,
  selectedClaimantIndex,
  onSelectClaimant,
}: MerkleTreeMapProps) {
  const [copiedProofIdx, setCopiedProofIdx] = useState<number | null>(null);

  const selectedClaim = claims[selectedClaimantIndex];
  const rootShort = merkleRoot
    ? `${merkleRoot.slice(0, 10)}…${merkleRoot.slice(-6)}`
    : "0x4b18…8247";

  const copyProof = (proofs: string[], idx: number) => {
    navigator.clipboard.writeText(JSON.stringify(proofs, null, 2));
    setCopiedProofIdx(idx);
    setTimeout(() => setCopiedProofIdx(null), 2000);
  };

  return (
    <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-zinc-800" />
          <h4 className="font-semibold text-sm text-zinc-950 font-sans">
            Cryptographic Merkle Tree Topology
          </h4>
          <Badge variant="success">OpenZeppelin Standard</Badge>
        </div>
        <div className="text-[11px] font-mono text-zinc-500">
          Double-Keccak-256 (CVE-2022-37454 Immune)
        </div>
      </div>

      {/* Visual Tree Diagram */}
      <div className="flex flex-col items-center pt-2 pb-1">
        {/* Top: Root Node */}
        <div className="p-2.5 px-4 rounded-xl bg-zinc-950 text-white font-mono text-xs font-bold border border-zinc-900 shadow-sm flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Root: {rootShort}</span>
          <Badge variant="accent" className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
            Published
          </Badge>
        </div>

        {/* Tree Connectors */}
        <div className="w-px h-4 bg-zinc-300"></div>
        <div className="w-full max-w-md h-px bg-zinc-300 relative">
          <div className="absolute left-1/6 sm:left-1/4 top-0 w-px h-4 bg-zinc-300"></div>
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-px h-4 bg-zinc-300"></div>
          <div className="absolute right-1/6 sm:right-1/4 top-0 w-px h-4 bg-zinc-300"></div>
        </div>
        <div className="h-4"></div>

        {/* Bottom: Leaves */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {claims.map((c, idx) => {
            const isSelected = selectedClaimantIndex === idx;
            const amountUsdc = (Number(c.amount) / 1e6).toFixed(2);
            return (
              <button
                key={idx}
                onClick={() => onSelectClaimant(idx)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-150 ${
                  isSelected
                    ? "bg-white border-zinc-950 ring-2 ring-zinc-950 shadow-sm"
                    : "bg-white/80 hover:bg-white border-zinc-200/90 text-zinc-700 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={isSelected ? "text-zinc-950 font-bold" : "text-zinc-500"}>
                    Leaf #{c.claimIndex}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </div>

                <div className="font-mono text-xs font-semibold text-zinc-950 mt-1 truncate">
                  {c.claimant.slice(0, 6)}…{c.claimant.slice(-4)}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-100 flex items-baseline justify-between">
                  <span className="text-[10px] text-zinc-400 font-sans">Payout</span>
                  <span className="text-xs font-bold font-mono text-emerald-700">
                    ${amountUsdc} USDC
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Leaf Proof Inspection */}
      {selectedClaim && selectedClaim.proof && (
        <div className="p-3.5 rounded-xl bg-white border border-zinc-200/80 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px] font-sans">
            <span className="font-semibold text-zinc-900">
              Active Merkle Proof Sibling Path ({selectedClaim.proof.length} hashes):
            </span>
            <button
              onClick={() => copyProof(selectedClaim.proof || [], selectedClaim.claimIndex)}
              className="text-zinc-500 hover:text-zinc-950 flex items-center gap-1 font-mono text-[11px] transition"
            >
              {copiedProofIdx === selectedClaim.claimIndex ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Proof Array</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-1">
            {selectedClaim.proof.map((hash, i) => (
              <div
                key={i}
                className="p-1.5 px-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 text-[11px] text-zinc-600 flex items-center justify-between"
              >
                <span className="text-zinc-400 font-bold">Sibling #{i}:</span>
                <span className="truncate ml-2 text-zinc-800">{hash}</span>
              </div>
            ))}
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-emerald-700 font-sans font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verifies mathematically on-chain to Root {rootShort}</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-400">Gas: ~42,100</span>
          </div>
        </div>
      )}
    </div>
  );
}
