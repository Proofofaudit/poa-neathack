"use client";
import { useState } from "react";
import Link from "next/link";
import { AAVE_BASE_POOL } from "../../chain/live-inspection";
export default function LiveInspection() {
  const [input, setInput] = useState(AAVE_BASE_POOL);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentReport, setAgentReport] = useState<any>(null);
  const [agentError, setAgentError] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [useModel, setUseModel] = useState(true);
  const [agentCode, setAgentCode] = useState("");
  async function runAgent(deep = true) {
    setAgentBusy(true); setAgentError(""); setAgentReport(null);
    try {
      const response = await fetch(deep ? "/api/investigate" : "/api/agent", {method: "POST", headers: {"Content-Type": "application/json", ...(useModel && agentCode ? {Authorization: `Bearer ${agentCode}`} : {})}, body: JSON.stringify({...(transactionHash.trim() ? {transactionHash: transactionHash.trim()} : {}), useModel: deep && useModel})});
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || "Agent could not finish.");
      setAgentReport(json.data);
    } catch (e) {setAgentError(e instanceof Error ? e.message : "Agent could not finish.");}
    finally {setAgentBusy(false);}
  }
  function downloadReport() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(agentReport, null, 2)], {type: "application/json"}));
    const a = document.createElement("a"); a.href = url; a.download = "poa-live-investigation.json"; a.click(); URL.revokeObjectURL(url);
  }
  async function inspect(value = input) {
    setBusy(true); setResult(null); setError("");
    try {
      const response = await fetch(`/api/inspect?input=${encodeURIComponent(value.trim())}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || "Inspection failed.");
      setResult(json.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not inspect transaction."); }
    finally { setBusy(false); }
  }
  return <main className="max-w-4xl mx-auto p-6 sm:p-12 text-zinc-900">
    <Link href="/demo" className="text-emerald-700">Saved compensation demo evidence</Link>
    <p className="mt-10 text-sm font-semibold text-emerald-700">BASE MAINNET · LIVE READS</p>
    <h1 className="text-4xl font-bold mt-3">Investigate Aave on Base</h1>
    <p className="mt-4 text-zinc-600">Investigate a real liquidation, reconstruct historical borrower reserves, compare exchange prices and estimate the liquidation’s economic cost. Compensation requires evidence that an oracle fault caused an avoidable liquidation.</p>
    <section className="mt-8 border border-emerald-200 bg-emerald-50 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold">Run the investigation agent</h2>
      <p className="mt-3">Leave the transaction blank and click below to investigate the verified historical USDC/WETH liquidation. AI planning is on by default; no key or access code is needed for this example. The agent reads fresh historical chain evidence and exchange prices. Add another Aave Base transaction to investigate it; detailed valuation currently supports USDC collateral and WETH variable debt without eMode.</p>
      <label className="block mt-5">Optional Base transaction hash<input value={transactionHash} onChange={e => setTransactionHash(e.target.value)} placeholder="Blank = verified historical liquidation" className="mt-2 w-full border rounded-xl p-3 text-sm font-mono" /></label>
      <details className="mt-4"><summary className="cursor-pointer text-sm">Investigation settings</summary>
        <label className="block mt-3"><input type="checkbox" checked={useModel} onChange={e => setUseModel(e.target.checked)} /> Use Claude AI to plan the investigation</label>
        <p className="text-sm mt-2">AI is enabled by default for the historical example using our server configuration. No key or access code is needed. Turn AI off to run the same evidence checks with a fixed rule planner.</p>
        {useModel && transactionHash.trim() && <label className="block mt-3">Operator access code for a custom transaction<input type="password" autoComplete="off" value={agentCode} onChange={e => setAgentCode(e.target.value)} className="block mt-2 w-full border rounded-xl p-3" /></label>}
      </details>
      <button disabled={agentBusy} onClick={() => void runAgent(true)} className="mt-5 bg-emerald-800 text-white rounded-xl px-5 py-3 disabled:opacity-50">{agentBusy ? "Agent investigating…" : "Investigate real liquidation"}</button>
      <button disabled={agentBusy} onClick={() => void runAgent(false)} className="mt-3 ml-3 underline text-sm">Quick market / receipt check (no AI)</button>
      {agentError && <p role="alert" className="mt-4 text-red-800">{agentError}</p>}
      {agentReport && <div aria-live="polite" className="mt-6">
        <h3 className="text-xl font-semibold">Evidence collection {agentReport.status === "COMPLETED" ? "completed" : "needs review"}</h3>
        <p className="text-sm mt-2">{agentReport.mode === "LIVE_MODEL" ? `Live ${agentReport.model} tool planning · ${agentReport.tokensUsed} tokens` : "Rule planner · actual Base reads"}</p>
        <ul className="list-disc pl-5 mt-4 space-y-2">{agentReport.findings.map((finding: string, i: number) => <li key={i}>{finding}</li>)}</ul>
        <ol className="mt-5 space-y-2">{agentReport.steps.map((step: any, i: number) => <li key={i} className="bg-white rounded-lg p-3 text-sm"><strong>{i + 1}. {step.action} · {step.status}</strong><p>{step.reason}</p><details className="mt-2"><summary>Tool result</summary><pre className="overflow-auto text-xs mt-2">{JSON.stringify(step.observation, null, 2)}</pre></details></li>)}</ol>
        {agentReport.observations.ASSESS_CAUSALITY && <section className="mt-5 bg-white rounded-xl p-4">
          <h4 className="font-semibold">Causality and economic loss</h4>
          <p className="mt-2">{agentReport.observations.ASSESS_CAUSALITY.reason}</p>
          <p className="mt-2 text-sm">Oracle fault: not established. Compensation proposal: none.</p>
          <div className="overflow-auto"><table className="w-full mt-3 text-sm"><thead><tr><th className="text-left">Reference window</th><th>WETH price (USDC)</th><th>Borrower health</th><th>Transfer cost (USDC)</th></tr></thead><tbody>{agentReport.observations.ASSESS_CAUSALITY.scenarios.map((v: any, i: number) => <tr key={i}><td>{v.windowSeconds / 60} min · pool {v.pool.slice(0, 8)}…</td><td className="text-center">{(Number(v.wethPriceMicroUsdc) / 1e6).toFixed(2)}</td><td className="text-center">{(Number(v.healthFactorWad) / 1e18).toFixed(6)}</td><td className="text-center">{(Number(v.netLiquidationCostMicroUsdc) / 1e6).toFixed(2)}</td></tr>)}</tbody></table></div>
          <p className="text-xs mt-3">Health below 1 is liquidatable in this baseline scenario. USDC is the quote currency; its dollar parity is not assumed. Transfer cost is not proven oracle damage.</p>
          <p className="text-xs mt-2">{agentReport.observations.ASSESS_CAUSALITY.lossDefinition}</p>
        </section>}
        {agentReport.observations.READ_EXECUTION_REPLAY?.status === "VERIFIED_SAVED_REPLAY" && <section className="mt-5 bg-white rounded-xl p-4">
          <h4 className="font-semibold">Verified historical execution replay</h4>
          <p className="text-sm mt-2">Saved local fork execution, rechecked against the mainnet receipt during this investigation. It reproduces all {agentReport.observations.READ_EXECUTION_REPLAY.originalVerification.logCount} logs and {agentReport.observations.READ_EXECUTION_REPLAY.originalVerification.gasUsed} gas. This server reads the saved proof; it does not run a new fork.</p>
          <div className="overflow-auto"><table className="w-full mt-3 text-sm"><thead><tr><th className="text-left">Price scenario</th><th>Health</th><th>Actual replay outcome</th></tr></thead><tbody>{agentReport.observations.READ_EXECUTION_REPLAY.scenarios.map((v: any, i: number) => <tr key={i}><td>{v.kind === "SPOT" ? "Spot" : `${v.windowSeconds / 60} min average`} · {v.pool.slice(0, 8)}…</td><td className="text-center">{(Number(v.healthFactorWad) / 1e18).toFixed(6)}</td><td className="text-center">{v.liquidationEvents ? "Liquidation executed" : "Liquidation blocked"}</td></tr>)}</tbody></table></div>
          <p className="mt-3 text-sm">Both spot-price scenarios still liquidate the borrower. Some longer averages prevent liquidation. An average that lags the market does not prove an oracle fault.</p>
          <a href="/evidence/real-execution-replay.json" className="underline text-sm mt-3 inline-block" download>Download reproduction and scenario evidence</a>
        </section>}
        {agentReport.observations.READ_INDEPENDENT_PRICES?.externalVenue?.status === "READ" && <p className="mt-4 text-sm">Coinbase ETH/USD history also retrieved: {agentReport.observations.READ_INDEPENDENT_PRICES.externalVenue.completedCoverageCount} completed pre-incident minute candles. Candles containing later trades are marked retrospective and excluded from causal proof. ETH/USD prices are not treated as ETH/USDC.</p>}
        <p className="mt-5 font-semibold">No payout authorized. Missing evidence is never replaced with a simulated result.</p>
        <details className="mt-3"><summary>Evidence limits</summary><ul className="list-disc pl-5 mt-2">{agentReport.limitations.map((limit: string, i: number) => <li key={i}>{limit}</li>)}</ul></details>
        <button onClick={downloadReport} className="underline mt-4">Download investigation report</button>
      </div>}
    </section>
    <h2 className="text-2xl font-semibold mt-10">Inspect an individual contract or receipt</h2>
    <form className="mt-8 flex flex-col sm:flex-row gap-3" onSubmit={e => { e.preventDefault(); void inspect(); }}>
      <label className="flex-1">Base address or transaction hash<input value={input} onChange={e => setInput(e.target.value)} required className="mt-2 w-full border border-zinc-300 rounded-xl p-3 font-mono text-sm" placeholder="0x…" /></label>
      <button disabled={busy} className="self-end bg-emerald-700 text-white rounded-xl px-5 py-3 disabled:opacity-50">{busy ? "Reading Base…" : "Inspect live"}</button>
    </form>
    <button disabled={busy} onClick={() => { setInput(AAVE_BASE_POOL); void inspect(AAVE_BASE_POOL); }} className="mt-4 underline text-sm text-emerald-700">Try the deployed Aave Base pool</button>
    {error && <p role="alert" className="mt-6 bg-red-50 text-red-800 p-4 rounded-xl">{error}</p>}
    {result && <section aria-live="polite" className="mt-8 border rounded-2xl p-6">
      <h2 className="text-xl font-semibold">{result.kind === "CONTRACT" ? result.hasBytecode ? "Deployed contract found" : "No contract bytecode at this block" : `Transaction ${result.executionStatus.toLowerCase()}`}</h2>
      <p className="mt-3">{result.explanation}</p>
      <p className="mt-3 text-sm text-zinc-600">Block {result.blockNumber} · Read {new Date(result.observedAt).toLocaleString()} · {result.protocol}</p>
      <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 text-emerald-700 underline">Check on Basescan ↗</a>
      {result.reserves && <p className="mt-4">{result.reserves.length} reserves returned by the deployed pool.</p>}
      {result.liquidations && <p className="mt-4">{result.liquidations.length} supported liquidation events.</p>}
      <details className="mt-5"><summary className="cursor-pointer">Inspect receipt evidence and raw token amounts</summary><pre className="mt-3 overflow-auto bg-zinc-50 p-4 text-xs rounded-xl">{JSON.stringify(result, null, 2)}</pre></details>
    </section>}
    <p className="mt-10 text-sm text-zinc-500">Historical reserve reconstruction and independent USDC/WETH scenario analysis are available for supported Aave Base liquidations. The historical example includes a saved, verified execution replay. Other transactions need their own replay; oracle-fault proof remains necessary before authorizing compensation. The saved demo uses synthetic contracts and test tokens.</p>
  </main>;
}
