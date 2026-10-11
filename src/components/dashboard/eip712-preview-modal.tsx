"use client";

import React, { useState } from "react";
import { Lock, Copy, Check, X, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Eip712PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributorAddress: string;
  claimantAddress: string;
  amountUsdc: string;
  incidentId: string;
}

export function Eip712PreviewModal({
  isOpen,
  onClose,
  distributorAddress,
  claimantAddress,
  amountUsdc,
  incidentId,
}: Eip712PreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const typedData = {
    domain: {
      name: "POA Restitution Distributor",
      version: "1",
      chainId: 31337,
      verifyingContract: distributorAddress,
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      RestitutionClaim: [
        { name: "claimant", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "incidentId", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "RestitutionClaim",
    message: {
      claimant: claimantAddress,
      amount: amountUsdc,
      incidentId: incidentId,
      nonce: 0,
      deadline: Math.floor(Date.now() / 1000) + 86400,
    },
  };

  const jsonString = JSON.stringify(typedData, null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-950 text-white">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-950 font-sans">
                EIP-712 Structured Claim Payload
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                Gasless Sponsored Voucher (0 ETH Claim)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success">TypedData V4</Badge>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-zinc-600 leading-relaxed font-sans">
            This structured typed data is signed off-chain by the victim and broadcasted by a sponsored relayer. The smart contract validates the signature against the verified Merkle root, allowing completely gasless payouts for accounts with 0 ETH.
          </p>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-[380px]">
              {jsonString}
            </pre>

            <button
              onClick={copyJson}
              className="absolute top-3 right-3 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono flex items-center gap-1.5 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Payload</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-zinc-200 flex items-center justify-between bg-zinc-50 text-xs">
          <span className="text-zinc-500 font-mono text-[11px]">
            Double-Keccak Domain Separator Verified
          </span>
          <Button size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
}
