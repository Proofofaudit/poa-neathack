import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
export const dynamic = "force-dynamic";
function read(name: string) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "evidence", name), "utf8"),
    );
  } catch {
    return null;
  }
}
const card = "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm";
export default function Judges() {
  const evaluation = read("upgrade_evaluation.json");
  const local = read("run_evidence.json");
  const remote = read("remote_run_evidence.json");
  const remoteReadback = read("neatlogs_remote_readback.json");
  const trace = remote?.observabilityTrace || local?.observabilityTrace;
  const business = read("business_model.json");
  const cfo = read("cfo_ai_evidence.json");
  const liveModel = read("live_model_run_evidence.json");
  const entireSearch = read("entire_graph_search.json");
  const entireImpact = read("entire_graph_impact.json");
  const missions = read("mission_evaluation.json");
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <nav className="flex justify-between text-sm mb-12">
          <Link href="/" className="font-semibold">
            ← POA incident room
          </Link>
          <a href="https://neatlogs.com/hackathon" className="text-zinc-500">
            Official neatHack rubric ↗
          </a>
        </nav>
        <Link href="/watch" className="inline-block text-sm underline mb-6">Watch the narrated demo ↗</Link>
        <p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">
          Judge walkthrough · inspectable evidence
        </p>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight mt-4">
          Trust the result.
          <br />
          <span className="text-zinc-400">Inspect the path.</span>
        </h1>
        <p className="text-zinc-500 max-w-2xl mt-5 leading-relaxed">
          POA investigates a disputed oracle event, discovers affected accounts
          from historical chain data, excludes unsupported losses, and prepares
          a compensation package for owner review. The demo uses synthetic
          positions and real EVM execution.
        </p>
        <section className="grid md:grid-cols-3 gap-4 mt-9">
          <div className={card}>
            <p className="text-xs text-zinc-500">
              Eligible test-token allocation
            </p>
            <p className="text-3xl font-semibold mt-3">
              {local
                ? `$${(Number(local.report.totalRestitutionCalculatedUsdc) / 1e6).toLocaleString("en-US")}`
                : "Not recorded"}
            </p>
            <p className="text-xs text-zinc-500 mt-3">
              Three included borrowers. Pre-insolvent and untouched positions
              excluded.
            </p>
          </div>
          <div className={card}>
            <p className="text-xs text-zinc-500">
              Recorded recipient balance increase
            </p>
            <p className="text-3xl font-semibold mt-3">
              {local
                ? `$${(Number(local.restitutionExecuted.balanceDelta) / 1e6).toLocaleString("en-US")}`
                : "Not recorded"}
            </p>
            <p className="text-xs text-zinc-500 mt-3">
              Sponsored forwarding. Recipient ETH remained zero.
            </p>
          </div>
          <div className={card}>
            <p className="text-xs text-zinc-500">
              Independent compensation check
            </p>
            <p className="text-3xl font-semibold mt-3">
              {local?.report.independentAudit?.claimsVerified ?? "Not recorded"}
            </p>
            <p className="text-xs text-zinc-500 mt-3">
              Conservation identity and inclusion proofs verified before
              manifest approval.
            </p>
          </div>
        </section>
        <section className={`${card} mt-6`}>
          <div className="sm:flex justify-between items-start gap-5">
            <div>
              <h2 className="text-xl font-semibold">
                A measured improvement over 96da127
              </h2>
              <p className="text-sm text-zinc-500 mt-2">
                Twelve labeled synthetic economic cases. The old pure arithmetic
                module is executed from its pinned commit; the current
                implementation receives the same inputs.
              </p>
            </div>
            <span className="text-xs px-3 py-2 bg-amber-50 rounded-lg text-amber-900 shrink-0 mt-3 sm:mt-0">
              Project-owned regression set
            </span>
          </div>
          {evaluation ? (
            <>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                {[
                  ["Before · 96da127", evaluation.baseline],
                  ["After · current source", evaluation.current],
                ].map(([label, m]: any) => (
                  <div key={label} className="bg-zinc-50 rounded-xl p-5">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="text-3xl font-semibold mt-3">
                      {m.passed}/{m.cases}{" "}
                      <span className="text-sm font-normal text-zinc-500">
                        correct amounts
                      </span>
                    </p>
                    <p className="text-sm mt-3">
                      {m.unsafeAuthorizations} unsupported positive
                      authorizations
                    </p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs text-zinc-500 border-b">
                      <th className="py-3 pr-4">Scenario</th>
                      <th className="py-3 pr-4">Before</th>
                      <th className="py-3">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluation.rows
                      .filter((r: any) => r.version === "current")
                      .map((r: any) => (
                        <tr key={r.case} className="border-b border-zinc-100">
                          <td className="py-3 pr-4">{r.case}</td>
                          <td className="py-3 pr-4">
                            {evaluation.rows.find(
                              (b: any) =>
                                b.case === r.case &&
                                b.version === "baseline-96da127",
                            )?.passed
                              ? "Passed"
                              : "Failed"}
                          </td>
                          <td
                            className={`py-3 ${r.passed ? "text-emerald-700" : "text-amber-700"}`}
                          >
                            {r.passed ? "Passed" : "Failed"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-500 mt-4">
                These results establish behavior on this regression set. They do
                not estimate production accuracy, independently authenticate RPC
                data or constitute an official EVMbench score.
              </p>
            </>
          ) : (
            <p className="mt-5 text-amber-700">
              Run the upgrade evaluation to create evidence.
            </p>
          )}
        </section>
        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-semibold">
            Does the whole investigation reach the right outcome?
          </h2>
          <p className="text-sm text-zinc-500 mt-2">
            Each scenario runs the investigator against the same synthetic
            protocol on a real local EVM. The evaluator checks exact claim
            allocations, inclusion proofs, evidence discovery and safe
            withholding. Live model quality is not measured.
          </p>
          {missions ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                {[
                  [
                    "Expected outcomes",
                    `${missions.summary.passed}/${missions.summary.scenarios}`,
                  ],
                  ["Recovered runs", missions.summary.recovered],
                  ["Safe withholds", missions.summary.safeWithholds],
                  ["Unexpected outcomes", missions.summary.unexpectedOutcomes],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-zinc-50 p-4">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="text-2xl font-semibold mt-2">{value}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto mt-5">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-zinc-500">
                    <tr>
                      <th className="py-3 pr-4">Scenario</th>
                      <th className="pr-4">Mission verdict</th>
                      <th className="pr-4">Failed spans</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missions.rows.map((r: any) => (
                      <tr key={r.name} className="border-t border-zinc-100">
                        <td className="py-3 pr-4">
                          {r.name}
                          <p className="text-xs text-zinc-500 mt-1">
                            {r.injectedFault}
                          </p>
                        </td>
                        <td
                          className={`pr-4 ${r.passed ? "text-emerald-700" : "text-red-700"}`}
                        >
                          {r.verdict.replaceAll("_", " ")}
                          <p className="font-mono text-[10px] text-zinc-500 mt-1 break-all">
                            {r.traceId}
                          </p>
                        </td>
                        <td className="pr-4">{r.failedToolSpans}</td>
                        <td>{(r.durationMs / 1000).toFixed(2)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-amber-800 mt-4">
                {missions.summary.failedToolSpans} failed SDK spans remain
                recorded. A recovered action or expected safety stop does not
                erase an error. This controlled seven-scenario evaluation does
                not explain the October 11 email digest, estimate production
                reliability or count as a native neatlogs evaluation.
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-800 mt-5">
              Full-workflow evaluation evidence has not been recorded.
            </p>
          )}
        </section>
        <section className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className={card}>
            <h2 className="text-xl font-semibold">
              The agent changes its recovery plan
            </h2>
            <p className="text-sm text-zinc-500 mt-3">
              This sandbox deliberately injects one transient RPC failure and a
              provider range limit. The investigator retries the transient
              error, then partitions rejected ranges and queries every block.
            </p>
            {local?.report.recoveryActions?.map((a: any, i: number) => (
              <div key={i} className="border-t border-zinc-100 pt-4 mt-4">
                <p className="text-xs font-mono text-emerald-700">
                  {a.action} · blocks {a.fromBlock}–{a.toBlock}
                </p>
                <p className="text-xs text-zinc-500 mt-2">{a.reason}</p>
              </div>
            ))}
            <p className="text-xs text-zinc-500 mt-5">
              Bounded retries and query budget. Unsupported or incomplete
              evidence stops the manifest. This is a policy-driven investigator;
              live LLM review is optional and unverified in this saved run.
            </p>
          </div>
          <div className={card}>
            <h2 className="text-xl font-semibold">
              Real neatlogs SDK pipeline
            </h2>
            <p className="text-sm text-zinc-500 mt-3">
              The SDK instruments tool calls and guardrails with parent-child
              spans, inputs, compact results and error statuses. Local runs use
              an isolated in-memory exporter; remote project traces are checked
              by authenticated read-back when available.
            </p>
            <div className="mt-5 bg-zinc-50 rounded-xl p-4 text-xs break-all">
              <p>Mode: {trace?.mode || "Not recorded"}</p>
              <p className="mt-2">
                SDK spans captured: {trace?.sdkSpans?.length ?? 0}
              </p>
              <p className="mt-2">Trace: {trace?.traceId || "Not recorded"}</p>
              <p className="mt-2">
                Remote persistence: {trace?.remotePersistence || "Not verified"}
              </p>
            </div>
            <div className="mt-4">
              {trace?.spans?.map((s: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between gap-3 border-t border-zinc-100 py-3 text-xs"
                >
                  <span>{s.name}</span>
                  <span className="font-mono text-zinc-500">
                    {s.status} · {Math.round(s.durationMs)}ms
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-800 mt-4">
              {remoteReadback?.status === "VERIFIED_READBACK"
                ? `${remoteReadback.records.length} project traces verified by authenticated provider read-back. Inspect evidence/neatlogs_remote_readback.json for identities, spans and hierarchy checks. Actual provider span-tree screenshot retained in the submission assets.`
                : "Local SDK capture is verified. Persisted provider traces are not yet verified."}
            </p>
          </div>
        </section>
        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-semibold">
            Business plan: hypotheses you can inspect
          </h2>
          <p className="text-sm text-zinc-500 mt-3">
            Proposed buyer: a lending protocol’s risk and treasury team.
            Proposed value: less manual investigation and compensation review.
            No verified customers or revenue are claimed.
          </p>
          {business && (
            <div className="overflow-x-auto mt-5">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="py-3 pr-4">Assumed scenario</th>
                    <th className="pr-4">Monthly revenue</th>
                    <th className="pr-4">Monthly burn</th>
                    <th>Runway</th>
                  </tr>
                </thead>
                <tbody>
                  {business.scenarios.map((s: any) => (
                    <tr key={s.name} className="border-t border-zinc-100">
                      <td className="py-3 pr-4">{s.name}</td>
                      <td className="pr-4">
                        ${s.revenue.toLocaleString("en-US")}
                      </td>
                      <td className="pr-4">
                        ${s.monthlyBurn.toLocaleString("en-US")}
                      </td>
                      <td>
                        {s.runwayMonths === null
                          ? "Not burning in this scenario"
                          : `${s.runwayMonths.toFixed(1)} months`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-amber-800 mt-5">
            Every financial input is an assumption. The local scenarios above use
            different assumptions from the actual cfo.ai forecast below.
          </p>
        </section>
        {cfo && <section className={`${card} mt-6`}>
          <p className="text-xs font-semibold text-emerald-700">cfo.ai · workspace and export verified</p>
          <h2 className="text-xl font-semibold mt-3">Pricing, delivery costs, revenue and cash runway</h2>
          <p className="text-sm text-zinc-500 mt-3">The saved 36-month plan assumes $3,500 per protocol per month and $500,000 opening cash. Both are planning inputs. Contingency fees depend on verified recoveries and are not recurring contracted revenue.</p>
          <p className="text-sm text-zinc-500 mt-3">The forecast shows no cash-out under its saved growth assumptions. The 99.8% margin is a target; customer demand, acquisition costs and actual support/security costs still require validation.</p>
          <div className="flex flex-wrap gap-5 text-sm mt-5"><a className="underline" href={cfo.export.url}>Download actual cfo.ai spreadsheet ↗</a><a className="underline" href={cfo.screenshot}>View actual workspace screenshot ↗</a></div>
        </section>}
        {liveModel && <section className={`${card} mt-6`}>
          <h2 className="text-xl font-semibold">Genuine model review attempt</h2>
          <p className="text-sm mt-3">Outcome: {liveModel.report.status} · {liveModel.report.policyDecision}</p>
          <p className="text-sm text-zinc-500 mt-3">{liveModel.report.forensicAiAssessment?.executiveSummary}</p>
          <p className="text-xs text-zinc-500 mt-3">Model: {liveModel.report.forensicAiAssessment?.modelUsed}. Live inference verified: {String(liveModel.report.forensicAiAssessment?.isLiveLlm === true)}. Saved reproducible default runs use deterministic rules.</p>
        </section>}
        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-semibold">
            Entire: repository context you can inspect
          </h2>
          <p className="text-sm text-zinc-500 mt-3">
            The installed Entire Graph plugin located historical-query recovery
            code and checked the callers affected by its behavior. Its saved
            output includes the target, test consumers and completeness
            warnings.
          </p>
          <div className="mt-5 bg-zinc-50 rounded-xl p-4 text-xs font-mono break-all">
            <p>Search: {entireSearch?.query || "Not recorded"}</p>
            <p className="mt-2">
              Impact target:{" "}
              {entireImpact?.focus?.qualified_name || "Not recorded"}
            </p>
            <p className="mt-2">
              Known callers: {entireImpact?.callers?.total ?? "Not recorded"}
            </p>
            <p className="mt-2">
              Graph completeness:{" "}
              {entireImpact?.completeness_scope?.level || "Not recorded"}
            </p>
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            Actual Graph outputs and targeted test verification are retained in
            the evidence directory. No checkpoint coverage or graph optimization
            percentage is claimed.
          </p>
        </section>
        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-semibold">
            Submission evidence still to complete
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-5 text-sm">
            {[
              remoteReadback?.status === "VERIFIED_READBACK"
                ? "Remote neatlogs read-back verified; capture provider dashboard footage for the video"
                : "Persisted neatlogs trace links and before/after dashboard evidence",
              entireSearch && entireImpact
                ? "Entire Graph evidence collected; include the actual output in the public repository and video"
                : "Entire checkpoints or graph output; guidance files alone are insufficient",
              cfo ? "Actual cfo.ai forecast and downloadable spreadsheet verified" : "Actual cfo.ai business plan export or viewable evidence",
              "Final video ≤3 minutes, public repository updates and genuine #neatHack posts",
            ].map((t) => (
              <div
                key={t}
                className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-amber-950"
              >
                {t}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-5">
            The public repository does not yet contain these local changes. The
            submission checklist deliberately keeps unverified items open.
          </p>
        </section>
        <footer className="text-xs text-zinc-400 mt-8">
          Synthetic protocol. Real EVM execution. Owner-approved publication. No
          guarantee of prize placement.
        </footer>
      </div>
    </main>
  );
}
