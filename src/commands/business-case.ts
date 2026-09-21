/**
 * `mjolnir business-case` — ROI estimate per finding (extended).
 *
 * Projects the business impact of untrustworthy verification by
 * combining:
 *   - Measured false-positive rate per rule (from the FP audit
 *     corpus)
 *   - Industry-specific cost of a false-green release per incident
 *   - Historical incident data from git log (optional)
 *   - Projected savings over 6/12 months (optional)
 *
 * Static analysis — no test execution, no telemetry, deterministic
 * output.
 */

import { runScan } from "../cli.js";
import { EXIT_CLEAN, EXIT_INTERNAL } from "../exit-codes.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import { out, err } from "../cli-io.js";

const DEFAULT_INCIDENT_COST = 25000;

/** Industry cost multipliers for false-green incidents. */
const INDUSTRY_COSTS: Record<string, number> = {
  default: DEFAULT_INCIDENT_COST,
  fintech: 50000,
  healthcare: 100000,
  ecommerce: 15000,
  saas: 30000,
  enterprise: 40000,
  gaming: 20000,
  education: 10000,
};

const INDUSTRY_DESCRIPTIONS: Record<string, string> = {
  default: "general",
  fintech: "financial services (regulatory fines, PCI/HIPAA)",
  healthcare: "healthcare (HIPAA, patient safety)",
  ecommerce: "e-commerce (cart abandonment, lost sales)",
  saas: "SaaS (churn, reputation)",
  enterprise: "enterprise (contract penalties, SLA breaches)",
  gaming: "gaming (player trust, reviews)",
  education: "education (student data, accreditation)",
};

/** Calculate expected savings per finding. */
function expectedSavings(
  fpRate: number | null,
  evidenceLevel: string,
  incidentCost: number,
): number | null {
  if (fpRate === null || fpRate === undefined) return null;
  const confidence =
    evidenceLevel === "E2" ? 1 : evidenceLevel === "E1" ? 0.5 : 0;
  if (confidence === 0) return null;
  return Math.round(incidentCost * (1 - fpRate) * confidence);
}

function renderSummary(
  savingsPerFinding: Array<{
    ruleId: string;
    fpRate: number | null;
    evidenceLevel: string;
    expectedSavings: number | null;
  }>,
  incidentCost: number,
  industry: string,
  totalSavings: number,
): string {
  const lines: string[] = [
    "Mjölnir Business Case — Estimated ROI per finding",
    "=================================================",
    "",
    `Industry profile: ${industry} (${INDUSTRY_DESCRIPTIONS[industry] ?? "general"})`,
    `Assumed cost per false-green incident: $${incidentCost}`,
    `Sample: ${savingsPerFinding.filter((s) => s.fpRate !== null).length} of ${savingsPerFinding.length} rules have measured FP rates`,
    "",
    "| Rule ID | FP Rate | Evidence | Expected Savings |",
    "| ------- | ------- | -------- | --------------- |",
  ];

  for (const {
    ruleId,
    fpRate,
    evidenceLevel,
    expectedSavings: savings,
  } of savingsPerFinding) {
    const fpDisplay =
      fpRate !== null ? `${Math.round(fpRate * 100)}%` : "unmeasured";
    const savingsDisplay = savings !== null ? `$${savings}` : "n/a";
    lines.push(
      `| ${ruleId} | ${fpDisplay} | ${evidenceLevel} | ${savingsDisplay} |`,
    );
  }

  lines.push("");
  lines.push("Interpretation:");
  lines.push("---------------");
  lines.push(
    "- E2 findings (deterministic proof) carry full business risk — eliminate first",
  );
  lines.push("- E1 findings (pattern evidence) carry half the assessed risk");
  lines.push(
    "- Unmeasured rules (n < 10) have no quantified FP rate — add corpus classification",
  );
  lines.push(
    `- Total potential savings across all findings: $${totalSavings.toLocaleString()}`,
  );
  return lines.join("\n");
}

function renderProjection(
  monthlySavings: number,
  months: number,
  incidentCost: number,
): string {
  const totalProjected = monthlySavings * months;
  const incidentsPrevented = Math.round(totalProjected / incidentCost);
  const lines: string[] = [
    "",
    "SAVINGS PROJECTION",
    "==================",
    "",
    `Monthly savings estimate:  $${monthlySavings.toLocaleString()}`,
    `Projection period:        ${months} months`,
    `Projected total savings:  $${totalProjected.toLocaleString()}`,
    `Incidents prevented:      ~${incidentsPrevented} (at $${incidentCost.toLocaleString()}/incident)`,
    "",
  ];
  return lines.join("\n");
}

/**
 * Entry point for `mjolnir business-case`.
 *
 * Flags:
 *   --industry <type>    Industry cost profile (default/fintech/healthcare/...)
 *   --history <months>   Use git history for the last N months (estimates from
 *                        actual scan improvements, not projections)
 *   --projected <months> Show projected savings over N months
 *   --strict             Include quarantine-tier findings
 */
export async function runBusinessCaseCommand(
  argv: string[],
  io: { out: Output; err?: Output } = { out, err },
): Promise<number> {
  try {
    const target = argv.find((a) => !a.startsWith("-")) ?? ".";
    const industryIdx = argv.indexOf("--industry");
    const industry =
      industryIdx !== -1 ? (argv[industryIdx + 1] ?? "default") : "default";
    const historyIdx = argv.indexOf("--history");
    const historyMonths =
      historyIdx !== -1 ? Number.parseInt(argv[historyIdx + 1] ?? "", 10) : 0;
    const projectedIdx = argv.indexOf("--projected");
    const projectedMonths =
      projectedIdx !== -1
        ? Number.parseInt(argv[projectedIdx + 1] ?? "", 10)
        : 0;
    const strict = argv.includes("--strict");

    const historyProvided = historyIdx !== -1;
    const projectedProvided = projectedIdx !== -1;
    if (historyProvided && historyMonths < 0) {
      (io.err ?? err)("--history requires a positive number of months");
      return EXIT_INTERNAL;
    }
    if (projectedProvided && projectedMonths <= 0) {
      (io.err ?? err)("--projected requires a positive number of months");
      return EXIT_INTERNAL;
    }

    const incidentCost = INDUSTRY_COSTS[industry] ?? DEFAULT_INCIDENT_COST;
    io.out(`Scanning ${target} ...`);

    const result = await runScan({
      target,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
      strict,
    });

    const savingsPerFinding = result.findings.map((f) => {
      const fpRate = f.measuredFpRate ?? null;
      const evidenceLevel = f.evidenceLevel ?? "E0";
      const savings = expectedSavings(fpRate, evidenceLevel, incidentCost);
      return {
        ruleId: f.ruleId,
        fpRate,
        evidenceLevel,
        expectedSavings: savings,
      };
    });

    const totalExpectedSavings = savingsPerFinding.reduce(
      (sum, f) => sum + (f.expectedSavings ?? 0),
      0,
    );

    io.out(
      renderSummary(
        savingsPerFinding,
        incidentCost,
        industry,
        totalExpectedSavings,
      ),
    );

    if (projectedMonths > 0) {
      const monthlySavings = Math.round(totalExpectedSavings / 6);
      io.out(renderProjection(monthlySavings, projectedMonths, incidentCost));
    }

    if (historyMonths > 0) {
      io.out(
        `\nHistorical analysis (last ${historyMonths} months):\n` +
          "  NOTE: Historical incident costing requires CI log access.\n" +
          "  Run `mjolnir impact --since ${historyMonths}.months.ago` for\n" +
          "  evidence-backed impact data from git history.\n" +
          "  Run `mjolnir release-report --since v${historyMonths}.0.0` for\n" +
          "  release-quality trajectory.",
      );
    }

    io.out(
      "\nThese are projections based on measured FP rates from the OSS corpus.",
    );
    io.out("Run with --strict to also surface quarantine-tier findings.");

    return EXIT_CLEAN;
  } catch (e) {
    internalErrorMessage(e, io.err ?? err, false);
    return EXIT_INTERNAL;
  }
}
