import fs from "node:fs";
import assert from "node:assert/strict";
const assumptions = JSON.parse(
  fs.readFileSync("docs/submission/business-assumptions.json", "utf8"),
);
const cashAvailable =
  assumptions.cashAtStart - assumptions.oneTimeSecurityReserve;
assert.ok(cashAvailable >= 0);
const scenarios = assumptions.scenarios.map((s: any) => {
  const cases = s.customers * s.casesPerCustomer;
  const revenue = s.customers * s.monthlySubscription;
  const directCost =
    cases *
    (s.computePerCase + s.reviewHoursPerCase * assumptions.reviewerHourlyCost);
  const grossProfit = revenue - directCost;
  const monthlyOperatingResult =
    grossProfit - s.fixedInfrastructure - s.payroll - s.otherOperating;
  const burn = Math.max(0, -monthlyOperatingResult);
  return {
    ...s,
    cases,
    revenue,
    directCost,
    grossProfit,
    grossMarginPercent: revenue ? (grossProfit / revenue) * 100 : 0,
    monthlyOperatingResult,
    monthlyBurn: burn,
    runwayMonths: burn ? cashAvailable / burn : null,
    breakEvenCustomers: Math.ceil(
      (s.fixedInfrastructure + s.payroll + s.otherOperating) /
        (s.monthlySubscription -
          s.casesPerCustomer *
            (s.computePerCase +
              s.reviewHoursPerCase * assumptions.reviewerHourlyCost)),
    ),
  };
});
fs.mkdirSync("evidence", { recursive: true });
fs.writeFileSync(
  "evidence/business_model.json",
  JSON.stringify(
    {
      status: assumptions.status,
      currency: "USD",
      cashAvailableAfterReserve: cashAvailable,
      assumptions,
      scenarios,
      limitations: [
        "All prices, costs, customer counts and starting capital are hypotheses, not actual results.",
        "Static monthly steady-state model; excludes growth, churn, tax and working-capital timing.",
        "Contract reviewers are variable costs separate from payroll; avoid double counting if the team performs reviews.",
        "CFO.ai use is not established by this local calculation. Import and validate these assumptions in the actual product.",
      ],
    },
    null,
    2,
  ),
);
const headers = [
  "Scenario",
  "Customers",
  "Monthly price",
  "Cases",
  "Revenue",
  "Direct cost",
  "Gross profit",
  "Gross margin %",
  "Operating result",
  "Burn",
  "Runway months",
  "Break-even customers",
];
const csv =
  [
    headers.join(","),
    ...scenarios.map((s: any) =>
      [
        s.name,
        s.customers,
        s.monthlySubscription,
        s.cases,
        s.revenue,
        s.directCost,
        s.grossProfit,
        s.grossMarginPercent.toFixed(2),
        s.monthlyOperatingResult,
        s.monthlyBurn,
        s.runwayMonths === null
          ? "Not cash-burning in this scenario"
          : s.runwayMonths.toFixed(2),
        s.breakEvenCustomers,
      ].join(","),
    ),
  ].join("\n") + "\n";
fs.writeFileSync("docs/submission/business-model.csv", csv);
console.table(
  scenarios.map((s: any) => ({
    scenario: s.name,
    revenue: s.revenue,
    burn: s.monthlyBurn,
    runwayMonths: s.runwayMonths,
  })),
);
