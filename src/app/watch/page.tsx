import Link from "next/link";
export default function Watch() {
  return <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12"><div className="max-w-5xl mx-auto">
    <Link href="/" className="text-sm text-zinc-400">← POA incident room</Link>
    <p className="text-xs uppercase tracking-widest text-emerald-400 mt-12">POA · neatHack 2026</p>
    <h1 className="text-4xl font-semibold tracking-tight mt-4">Investigate before compensating.</h1>
    <p className="text-zinc-400 mt-5 max-w-3xl">A narrated walkthrough of a real Aave Base liquidation, verified historical execution replay, six price scenarios, neatlogs traces, Entire repository context and the actual cfo.ai plan.</p>
    <video controls preload="metadata" poster="/submission/demo-poster.jpg" className="w-full rounded-2xl mt-8 bg-black" aria-label="POA hackathon demo"><source src="/submission/poa-demo.mp4" type="video/mp4"/><track kind="captions" src="/submission/poa-demo.vtt" srcLang="en" label="English"/></video>
    <div className="flex flex-wrap gap-6 mt-6 text-sm"><Link className="underline" href="/judges">Inspect the evidence</Link><a className="underline" href="https://github.com/Proofofaudit/poa-neathack">Public repository</a><a className="underline" href="/submission/poa-demo.mp4" download>Download video</a></div>
    <p className="text-xs text-zinc-500 mt-10">The real case has no justified compensation proposal. The hosted agent revalidates saved local fork evidence; it does not execute a fresh fork per request. The separate sponsored claim uses synthetic positions and test tokens. Narration uses a synthetic voice.</p>
  </div></main>;
}
