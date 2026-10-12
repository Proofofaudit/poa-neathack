"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  Download,
  Play,
  Check,
  LockKeyhole,
  RefreshCw,
  FileCheck2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { ethers } from "ethers";

type Network = "anvil" | "base";
const usd = (value: string | number | undefined) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
const units = (value: string | undefined) =>
  ethers.formatUnits(value || "0", 6);
const short = (value: string | undefined) =>
  value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "—";
const Panel = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-2xl border border-zinc-200 bg-white shadow-sm ${className}`}
  >
    {children}
  </section>
);
export default function Dashboard({
  canRunSandbox,
}: {
  canRunSandbox: boolean;
}) {
  const [network, setNetwork] = useState<Network>("anvil");
  const [evidence, setEvidence] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"case" | "proof" | "safety">("case");
  const [accessCode, setAccessCode] = useState("");
  const [showAccess, setShowAccess] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setEvidence(null);
    setError("");
    fetch(`/api/evidence?network=${network}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (active) {
          if (json.success) setEvidence(json.data);
          else setError(json.error);
        }
      })
      .catch(() => {
        if (active) setError("Could not load saved evidence.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [network]);
  async function runDemo() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/run-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessCode ? { Authorization: `Bearer ${accessCode}` } : {}),
        },
        body: JSON.stringify({ network }),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || "Demo failed");
      setEvidence(json.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Demo failed");
    } finally {
      setRunning(false);
    }
  }
  function download(value: any, name: string) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  const report = evidence?.report;
  const fixture = evidence?.fixture;
  const payment = evidence?.restitutionExecuted;
  const claims = report?.claims || [];
  const anchors = report?.evidence;
  const excluded = claims.filter((c: any) => c.status !== "VERIFIED").length;
  const checks = evidence?.checks;
  return (
    <main className="min-h-screen text-zinc-900 selection:bg-emerald-100">
      <nav className="border-b border-zinc-200 bg-white/90">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-zinc-950 rounded-xl p-2.5 text-white">
              <ShieldCheck size={23} />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">
                POA<span className="text-emerald-600">.</span>
              </span>
              <span className="hidden sm:inline text-xs text-zinc-500 ml-3">
                Proof of Audits
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/live" className="font-semibold text-emerald-700">Inspect live contracts</Link>
            <Link
              href="/judges"
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              For judges
            </Link>
            <Link href="/docs" className="text-zinc-600 hover:text-black">
              How it works
            </Link>
            <a
              href="https://github.com/Proofofaudit/poa-neathack"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1"
            >
              Source <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <header className="grid lg:grid-cols-[1.3fr_1fr] gap-10 items-center pb-12">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-700 mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              neatHack · Evidence-driven restitution
            </div>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-.045em] leading-[1.08] max-w-2xl">
              When the oracle fails,
              <br />
              <span className="text-zinc-400">users shouldn’t pay.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-zinc-500 max-w-xl leading-relaxed">
              Trace the incident. Calculate the loss. Prove the entitlement. POA
              turns an oracle dispute into an inspectable compensation package.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <button
                onClick={() =>
                  document
                    .getElementById("case")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl px-5 py-3 text-sm font-medium flex items-center gap-2"
              >
                Explore the evidence <ArrowRight size={16} />
              </button>
              <Link
                href="/docs"
                className="border border-zinc-200 bg-white rounded-xl px-5 py-3 text-sm"
              >
                Read the policy
              </Link>
            </div>
          </div>
          <Panel className="p-6 sm:p-8 relative overflow-hidden">
            <div className="flex justify-between items-center mb-7">
              <span className="text-xs tracking-widest uppercase text-zinc-500">
                A claim needs more than an AI verdict
              </span>
              <LockKeyhole size={17} className="text-emerald-700" />
            </div>
            {[
              [
                "01",
                "Historical evidence",
                "Receipts, logs and balances anchored to block hashes.",
              ],
              [
                "02",
                "A restrictive policy",
                "A separate reference feed and a real liquidation threshold crossing.",
              ],
              [
                "03",
                "Exact compensation",
                "Integer equity calculation, with insolvent positions excluded.",
              ],
              [
                "04",
                "A verifiable claim",
                "Merkle inclusion, owner approval, then payment to the named recipient.",
              ],
            ].map(([n, title, body], i) => (
              <div key={n} className={`flex gap-4 ${i !== 3 ? "pb-6" : ""}`}>
                <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg w-8 h-8 flex shrink-0 items-center justify-center">
                  {n}
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </Panel>
        </header>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 text-amber-950 px-4 py-3 text-xs leading-relaxed flex gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={16} />
          <p>
            <strong>Transparent demo scope.</strong> Synthetic lending
            positions, disputed oracle and reference feed; real EVM transactions
            and test-token claims. A Base fork uses a pinned Base snapshot. This
            is a prototype, not a historical exploit reconstruction or audited
            production deployment.
          </p>
        </div>
        <section id="case" className="mt-10 scroll-mt-8">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-400 mb-2">
                The incident room
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                Follow the money. Check the proof.
              </h2>
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex bg-zinc-100 border border-zinc-200 p-1 rounded-xl">
                {(
                  [
                    ["anvil", "Local EVM"],
                    ["base", "Base fork"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    disabled={running}
                    onClick={() => setNetwork(id)}
                    className={`text-xs px-3 py-2 rounded-lg ${id === network ? "bg-white shadow-sm font-semibold" : "text-zinc-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                disabled={!canRunSandbox || running || loading}
                onClick={runDemo}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                {running ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}{" "}
                {!canRunSandbox
                  ? "Recorded preview"
                  : running
                    ? "Collecting evidence…"
                    : "Run new demo"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 text-xs text-zinc-500">
            <span>
              {evidence
                ? `Saved run · ${new Date(evidence.completedAt).toLocaleString()} · chain ${evidence.chainId} · sandbox now stopped`
                : "No current evidence loaded. A new demo starts its own isolated sandbox."}
            </span>
            <button
              onClick={() => setShowAccess(!showAccess)}
              className="flex items-center gap-1"
            >
              Demo access <ChevronDown size={12} />
            </button>
          </div>
          {showAccess && (
            <label className="block mb-5 text-sm">
              Demo access code{" "}
              <input
                type="password"
                autoComplete="off"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="ml-3 border border-zinc-300 rounded-lg p-2 text-sm"
                placeholder="If required by this deployment"
              />
            </label>
          )}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {error}
              {evidence && " The previous saved run remains below."}
            </div>
          )}
          {loading ? (
            <Panel className="p-10 text-center text-zinc-500">
              Loading evidence…
            </Panel>
          ) : !report ? (
            <Panel className="p-12 text-center">
              <FileCheck2 size={32} className="mx-auto text-zinc-300 mb-4" />
              <h3 className="font-semibold">Start with a recorded run</h3>
              <p className="text-sm text-zinc-500 mt-2">
                Run the local demo to create fresh receipts, a compensation
                manifest and a verified balance change.
              </p>
            </Panel>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                {[
                  [
                    "Oracle deviation",
                    `${((1 - Number(anchors.faultyPrice) / Number(anchors.baselinePrice)) * 100).toFixed(1)}%`,
                    `${usd(Number(anchors.baselinePrice) / 1e8)} → ${usd(Number(anchors.faultyPrice) / 1e8)}`,
                  ],
                  [
                    "Eligible compensation",
                    usd(units(report.totalRestitutionCalculatedUsdc)),
                    `${report.wrongfulLiquidationsCount} borrowers · test USDC`,
                  ],
                  [
                    "Payout exclusions",
                    String(excluded),
                    "Untouched and pre-insolvent accounts",
                  ],
                  [
                    "Observed payment",
                    usd(units(payment?.balanceDelta)),
                    "Confirmed recipient balance increase",
                  ],
                ].map(([title, value, note]) => (
                  <Panel key={title} className="p-5">
                    <p className="text-xs text-zinc-500">{title}</p>
                    <p className="text-3xl font-semibold tracking-tight mt-3">
                      {value}
                    </p>
                    <p className="text-xs text-zinc-400 mt-2">{note}</p>
                  </Panel>
                ))}
              </div>
              <div className="flex flex-wrap justify-between gap-4 items-center mb-5 border-b border-zinc-200">
                <div className="flex gap-6">
                  {(
                    [
                      ["case", "Borrower outcomes"],
                      ["proof", "Evidence & payment"],
                      ["safety", "Policy & safety"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`pb-4 text-sm border-b-2 ${tab === id ? "border-emerald-700 text-emerald-800 font-semibold" : "border-transparent text-zinc-500"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    download(evidence, `poa-${network}-evidence.json`)
                  }
                  className="text-xs flex items-center gap-2 pb-4 text-zinc-500"
                >
                  <Download size={14} />
                  Download evidence
                </button>
              </div>
              {tab === "case" && (
                <Panel className="overflow-hidden">
                  <div className="px-6 py-5 border-b border-zinc-100 flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-sm">
                        Who qualifies—and who doesn’t
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        Each outcome comes from a historical position and a
                        transaction receipt.
                      </p>
                    </div>
                    <span className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 h-fit">
                      {report.eventsAnalyzed} liquidation events discovered
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] text-zinc-400 uppercase bg-zinc-50">
                        <tr>
                          {[
                            "Borrower",
                            "Before / disputed HF",
                            "Decision",
                            "Compensation",
                          ].map((t) => (
                            <th
                              key={t}
                              className="px-6 py-3 whitespace-nowrap font-medium"
                            >
                              {t}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {claims.map((c: any, i: number) => (
                          <tr
                            key={c.borrower}
                            className="border-t border-zinc-100"
                          >
                            <td className="px-6 py-5">
                              <p className="font-medium text-xs">
                                Borrower {i + 1}
                              </p>
                              <p
                                className="font-mono text-xs text-zinc-400 mt-1"
                                title={c.borrower}
                              >
                                {short(c.borrower)}
                              </p>
                            </td>
                            <td className="px-6 py-5 font-mono text-xs whitespace-nowrap">
                              <span
                                className={
                                  Number(c.baselineHealthFactor) < 1
                                    ? "text-amber-700"
                                    : "text-emerald-700"
                                }
                              >
                                {c.baselineHealthFactor}
                              </span>
                              <span className="text-zinc-300 mx-2">→</span>
                              <span
                                className={
                                  Number(c.faultyHealthFactor) < 1
                                    ? "text-amber-700"
                                    : "text-zinc-500"
                                }
                              >
                                {c.faultyHealthFactor}
                              </span>
                            </td>
                            <td className="px-6 py-5 max-w-sm">
                              <span
                                className={`text-xs font-medium ${c.status === "VERIFIED" ? "text-emerald-700" : "text-zinc-500"}`}
                              >
                                {c.status === "VERIFIED"
                                  ? "Eligible"
                                  : c.reason.includes(
                                        "already undercollateralized",
                                      )
                                    ? "Pre-insolvent · excluded"
                                    : "Untouched · excluded"}
                              </span>
                              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                {c.reason}
                              </p>
                            </td>
                            <td className="px-6 py-5 font-semibold text-sm whitespace-nowrap">
                              {usd(units(c.restitutionAmountUsdc))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}
              {tab === "proof" && (
                <div className="grid lg:grid-cols-2 gap-5">
                  <Panel className="p-6">
                    <h3 className="font-semibold mb-5 flex items-center gap-2">
                      <FileCheck2 size={17} />
                      The evidence chain
                    </h3>
                    {[
                      ["Incident transaction", report.incidentTxHash],
                      [
                        "Baseline block",
                        `${anchors.baselineBlockNumber} · ${anchors.baselineBlockHash}`,
                      ],
                      [
                        "Incident block",
                        `${anchors.incidentBlockNumber} · ${anchors.incidentBlockHash}`,
                      ],
                      [
                        "Window end",
                        `${anchors.toBlock} · ${anchors.endBlockHash}`,
                      ],
                      ["Merkle root", report.merkleManifest?.merkleRoot],
                      ["Payout token", fixture?.usdcAddress],
                    ].map(([k, v]) => (
                      <div key={k} className="py-3 border-t border-zinc-100">
                        <p className="text-xs text-zinc-500 mb-1">{k}</p>
                        <p className="font-mono text-xs break-all">{v}</p>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        download(
                          report.proofCarryingManifest,
                          "poa-claim-manifest.json",
                        )
                      }
                      className="mt-4 text-xs text-emerald-700 font-semibold flex items-center gap-2"
                    >
                      <Download size={14} />
                      Download claim manifest
                    </button>
                  </Panel>
                  <Panel className="p-6">
                    <h3 className="font-semibold mb-2">
                      A sponsored claim you can inspect
                    </h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      The demo owner registers the approved manifest. A claim
                      transfers test USDC to the recipient encoded in its Merkle
                      leaf. These records are saved after the sandbox stops.
                    </p>
                    <div className="my-6 rounded-xl bg-emerald-50 border border-emerald-100 p-5">
                      <p className="text-xs text-emerald-700">
                        Recipient balance change
                      </p>
                      <p className="text-3xl font-semibold mt-2">
                        +{usd(units(payment.balanceDelta))}
                      </p>
                      <p className="text-xs text-emerald-700 mt-2">
                        {usd(units(payment.balanceBefore))} →{" "}
                        {usd(units(payment.balanceAfter))} test USDC
                      </p>
                    </div>
                    {[
                      ["Recipient", payment.claimant],
                      ["Registration receipt", evidence.registration.txHash],
                      ["Claim receipt", payment.txHash],
                      ["Claim block", String(payment.blockNumber)],
                    ].map(([k, v]) => (
                      <div key={k} className="py-3 border-t border-zinc-100">
                        <p className="text-xs text-zinc-500 mb-1">{k}</p>
                        <p className="font-mono text-xs break-all">{v}</p>
                      </div>
                    ))}
                    <p className="mt-4 text-xs text-zinc-400">
                      The recipient held {payment.recipientEthBefore} ETH before
                      and {payment.recipientEthAfter} ETH after this payment. No
                      wallet action is being simulated in this browser. Gasless
                      authorization is a separate contract feature covered by
                      contract tests; this run uses a sponsored forwarded claim.
                    </p>
                  </Panel>
                </div>
              )}
              {tab === "safety" && (
                <div className="grid lg:grid-cols-2 gap-5">
                  <Panel className="p-6">
                    <h3 className="font-semibold mb-5">
                      Why this manifest was allowed
                    </h3>
                    {report.decisionTrail.map((d: any, i: number) => (
                      <div key={i} className="flex gap-3 mb-5">
                        <Check
                          size={17}
                          className="text-emerald-700 shrink-0 mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium">{d.step}</p>
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                            {d.outcome}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                      <p>Assessment: {report.forensicAiAssessment.modelUsed}</p>
                      <p className="mt-2">
                        {report.forensicAiAssessment.isLiveLlm
                          ? "Live model review was used."
                          : "This run uses explicit deterministic rules. No LLM call or token usage is claimed."}
                      </p>
                    </div>
                  </Panel>
                  <Panel className="p-6">
                    <h3 className="font-semibold mb-5">
                      Checks executed in this run
                    </h3>
                    {[
                      ["Tampered claim rejected", checks?.tamperedRejected],
                      [
                        "Provider range limit recovered",
                        checks?.adaptiveRangeRecovery,
                      ],
                      [
                        "Independent claim audit passed",
                        checks?.independentClaimAudit,
                      ],
                      ["Duplicate claim rejected", checks?.duplicateRejected],
                      [
                        "Missing receipt withholds payout",
                        checks?.missingReceiptWithheld,
                      ],
                      [
                        "Discovery used historical chain data",
                        checks?.historicalDiscovery,
                      ],
                      [
                        "Fixture overrides were absent",
                        checks?.fixtureOverridesUsed === false,
                      ],
                    ].map(([label, passed]) => (
                      <div
                        key={String(label)}
                        className="border-t border-zinc-100 py-3 flex items-center justify-between text-sm"
                      >
                        <span>{label}</span>
                        <span
                          className={
                            passed ? "text-emerald-700" : "text-amber-700"
                          }
                        >
                          {passed ? "Passed" : "Not verified"}
                        </span>
                      </div>
                    ))}
                    <div className="bg-zinc-50 rounded-xl p-4 mt-5 text-xs text-zinc-500 leading-relaxed">
                      <strong className="text-zinc-700">When POA stops:</strong>{" "}
                      Missing receipts, unsupported protocols, stale reference
                      prices, inconsistent balances, denied model review, or
                      repeated liquidations requiring transaction-level analysis
                      withhold the entire manifest.
                    </div>
                  </Panel>
                </div>
              )}
            </>
          )}
        </section>
        <footer className="mt-12 pt-6 border-t border-zinc-200 flex flex-wrap justify-between gap-3 text-xs text-zinc-400">
          <span>POA · Proof of Audits · neatHack prototype</span>
          <span>Evidence first. Explicit policy. Verifiable distribution.</span>
        </footer>
      </div>
    </main>
  );
}
