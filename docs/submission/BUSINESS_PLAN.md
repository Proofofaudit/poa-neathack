# POA business plan — planning draft for cfo.ai

**Status:** A structural business case with unvalidated financial assumptions. This file is not evidence that cfo.ai has been used. There are no verified customers, revenue, customer interviews or production savings in this repository.

## Customer and buying decision

**Inferred customer:** The risk, security and treasury team of a lending protocol or DAO responding to a disputed oracle event. No named organization has confirmed interest.

**Workflow:** Investigators gather receipts and historical balances; risk reviewers decide which losses qualify; governance approves compensation; a treasury operator publishes a funded entitlement root; affected users receive funds. The proposed product reduces the manual work between evidence gathering and a reviewable payout proposal. It never replaces governance or assumes custody of a production treasury.

**Decision to validate:** Would a protocol pay for an evidence and compensation workflow, and which team owns the budget? Begin with a narrow paid-pilot hypothesis for one protocol adapter, bounded incident size and human approval. No pilot has been sold.

## Three initial use cases

1. **Disputed incident investigation:** Package historical evidence and identify incomplete or contradictory data. Hypothesized value: less investigator time per case. Measure operator hours and time to a review-ready report against the existing workflow.
2. **Compensation proposal preparation:** Compute eligible losses and exclusions, then independently check entitlement amounts and proofs. Hypothesized value: fewer proposal corrections and less review effort. Measure agreement with an independent human assessment; do not equate passing synthetic tests with production error rates.
3. **Verifiable distribution:** Bind a reviewed entitlement to its recipient and fund only supported liabilities. Hypothesized value: less manual reconciliation. Measure reconciliation time and payment discrepancies in a controlled pilot.

## Product and differentiation

POA joins incident evidence, eligibility decisions and a token-bound entitlement manifest in one inspectable package. The prototype demonstrates historical EVM reads, an independent arithmetic check, Merkle proofs, safe withholding and a sponsored test-token claim. Its first adapter is synthetic; production adapters, reference-feed independence, security review and customer discovery are prerequisite investments.

The initial product is a review workflow for protocol teams. Pricing should reflect investigation and support effort rather than a percentage of victim compensation. The financial model below tests subscription hypotheses; none is a quote or validated willingness to pay.

## Financial scenarios — every input is assumed

Currency: USD. Starting cash: $100,000. Reserve $30,000 upfront for security and adapter validation, leaving $70,000. The reserve is a planning allowance, not an audit quote.

| Monthly steady-state input | Conservative | Planning base | Upside |
|---|---:|---:|---:|
| Customers | 3 | 10 | 25 |
| Subscription per customer | $500 | $1,000 | $1,500 |
| Cases per customer | 1 | 2 | 3 |
| Compute per case | $5 | $10 | $20 |
| Contract review hours per case | 2 | 2 | 3 |
| Contract reviewer hourly cost | $50 | $50 | $50 |
| Fixed infrastructure | $200 | $300 | $600 |
| Payroll | $6,000 | $10,000 | $16,000 |
| Other operating expense | $1,000 | $2,000 | $3,000 |

Reproduce results with `npm run business:model`; `business-assumptions.json` is the input source and `business-model.csv` is the calculated summary.

**Formulas:** Cases = customers × cases per customer. Revenue = customers × monthly subscription. Direct cost = cases × (compute per case + reviewer hours × hourly cost). Gross profit = revenue − direct cost. Operating result = gross profit − infrastructure − payroll − other expense. Burn = max(0, −operating result). Runway = $70,000 ÷ monthly burn when burn is positive. Break-even customers = ceiling(fixed monthly costs ÷ per-customer contribution).

Reviewers are assumed to be contractors separate from payroll. If salaried staff perform reviews, reallocate costs to avoid double counting. Static scenarios exclude growth, churn, sales cycles, taxes and working-capital timing. A non-burning scenario is not proof of sustainable profitability.

## Customer value model — structural, not quantified ROI

Investigator benefit = cases × (current operator hours − pilot operator hours) × loaded hourly cost × adoption rate. All four customer inputs are missing. Subtract subscription, integration and review costs before claiming net savings. Do not count avoided victim losses as product revenue or verified savings.

## Validation and go-to-market

Interview five protocol risk/governance operators about their last compensation proposal, required evidence, elapsed time, manual hours, budget owner and reference-data constraints. Request permission before using a quote. Seek two bounded design partnerships and one paid pilot; these are targets, not existing traction. Expand adapters only after exact historical reproduction and reviewer agreement are established.

Pilot acceptance: one supported historical incident reproduced, no invalid entitlements in an independently labeled test set, human reviewer agrees with every included claim, missing evidence withholds payments, and the team records actual investigation time and infrastructure cost. Production release additionally requires external contract/security review and documented governance controls.

## cfo.ai completion package

Use this plan and the adjacent assumption/CSV files in the actual cfo.ai workspace. Model the three scenarios and export the resulting plan or include a viewable link/screenshot that judges can inspect. Record actual tool output and which assumptions changed after using it. No local file can substitute for that evidence. Account sign-in, card entry or a subscription agreement must be completed by the account owner.
