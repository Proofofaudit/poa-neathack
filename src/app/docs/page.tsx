import Link from "next/link";
export default function Documentation() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-emerald-700">
        ← Incident room
      </Link>
      <p className="uppercase tracking-widest text-xs text-zinc-400 mt-12">
        POA / technical brief
      </p>
      <h1 className="text-4xl font-semibold tracking-tight mt-3">
        A compensation claim should come with evidence.
      </h1>
      <p className="text-lg text-zinc-500 leading-relaxed mt-6">
        POA is a prototype for turning an oracle dispute into an auditable
        entitlement calculation and an on-chain claim. The demonstration uses a
        synthetic lending protocol on a local EVM or a pinned Base fork.
      </p>
      {[
        [
          "The problem",
          "Liquidation is automatic; determining whether a loss deserves compensation usually is not. A price mistake can transfer value from a solvent borrower before a protocol can respond.",
        ],
        [
          "The supported policy",
          "DemoLendingPool v1 only: 18-decimal collateral, 6-decimal USD-pegged test debt token, 80% liquidation threshold. A disputed price drop of at least 5% must be corroborated by a separate synthetic reference oracle staying within 1% of the pre-incident price. Each compensated borrower must be solvent before the deviation and liquidatable at the disputed price.",
        ],
        [
          "Evidence collection",
          "The controller validates the successful oracle transaction, reads the baseline at the preceding block, queries liquidation logs in a bounded incident window, and checks reconstructed borrower balances against the observed end state. Block hashes anchor the evidence. Fixtures cannot override these reads. Extra oracle updates, deposits, borrows, or repayments in the window require review.",
        ],
        [
          "What the agent does",
          "The controller collects evidence, retries failed reads with a bounded backoff, evaluates the restrictive policy, calculates losses, checks eligibility and produces a Merkle manifest. Optional LLM review can withhold approval but cannot override failed evidence checks. The default demo uses named deterministic rules and reports no model usage.",
        ],
        [
          "The calculation",
          "Loss = max(0, seized collateral × baseline reference price − debt repaid). Integer arithmetic handles unit scaling. This is a scoped balance-sheet intervention, not a transaction-level EVM replay. Pre-insolvent and untouched accounts receive no restitution. Repeated liquidations of a borrower require review rather than an incomplete payout.",
        ],
        [
          "Who controls the funds",
          "The distributor owner registers a funded manifest. Any caller may submit an inclusion proof, but payment goes only to the recipient committed in the leaf. Each incident has its own remaining liability; claimed funds are never swept again. Claims expire after 180 days, and the owner can reclaim only the unclaimed balance. Real deployment needs treasury governance and an independent contract audit.",
        ],
        [
          "Safety and integrations",
          "Missing or inconsistent evidence withholds the entire manifest. Invalid or unavailable requested LLM review also withholds it. Bytecode identifies deployed code, not a company or a MEV bot. Neatlogs export is opt-in; local traces are available without external credentials. Health distinguishes a successful RPC probe from untested provider configuration.",
        ],
        [
          "What this does not prove",
          "The scenario is created for demonstration, not extracted from a historical exploit. A Base fork changes the execution environment, not the source of the scenario. No mainnet funds are used. The browser displays saved receipt evidence and does not pretend to execute wallet payments. Aave, Compound, multi-asset portfolios and transaction-level repeated-liquidation replay need dedicated adapters before claims can be authorized.",
        ],
        [
          "Reproduce it",
          "Run npm ci, npm run contracts:build, and npm run demo:local. For the full gate use npm run verify:release. The Base fork command is npm run demo:base-fork; BASE_FORK_BLOCK can pin a specific snapshot. Every successful run records the actual chain ID, block hashes, receipts, exclusions, claim root and recipient balance change. The sandbox stops after exporting the evidence.",
        ],
      ].map(([title, body]) => (
        <section key={title} className="border-t border-zinc-200 pt-6 mt-8">
          <h2 className="font-semibold text-lg">{title}</h2>
          <p className="text-zinc-500 leading-relaxed text-sm mt-3">{body}</p>
        </section>
      ))}
      <p className="mt-12 text-xs text-zinc-400">
        Read the repository&apos;s submission guide for the demo script,
        evidence checklist and deployment roadmap.
      </p>
    </main>
  );
}
