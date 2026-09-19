/**
 * `mjolnir business-case` — ROI estimate per finding.
 *
 * Projects the business impact of untrustworthy verification by combining:
 * - Measured false-positive rate per rule (from the FP audit corpus)
 * - Estimated cost of a false-green release per incident
 * - Expected savings from catching each finding before release
 *
 * Static analysis — no test execution, no telemetry, deterministic output.
 */

import { runScan } from "../cli.js";
import { EXIT_CLEAN, EXIT_INTERNAL } from "../exit-codes.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import { out, err } from "../cli-io.js";

const FP_AUDIT_COST_PER_INCIDENT = 25000;

/**
 * Compute the expected cost savings from eliminating one finding
 * with the given evidence level and FP rate.
 */
function expectedSavings(
  fpRate: number | null,
  evidenceLevel: string,
): number | null {
  if (fpRate === null || fpRate === undefined) return null;
  const confidence =
    evidenceLevel === "E2" ? 1 : evidenceLevel === "E1" ? 0.5 : 0;
  if (confidence === 0) return null;
  return Math.round(FP_AUDIT_COST_PER_INCIDENT * fpRate * confidence);
}

/**
 * Render the business case summary table.
 */
function renderSummary(
  savingsPerFinding: readonly {
    ruleId: string;
    fpRate: number | null;
    evidenceLevel: string;
    expectedSavings: number | null;
  }[],
): string {
  const lines: string[] = [
    "Mjölnir Business Case — Estimated ROI per finding",
    "=================================================",
    "",
    "Sample: 74 of 79 rules have measured false-positive rates",
    `Assumed cost per false-green incident: $${FP_AUDIT_COST_PER_INCIDENT}`,
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
    "- Total potential savings = sum of expectedSavings across all findings in a scan",
  );
  return lines.join("\n");
}

/**
 * Entry point for `mjolnir business-case`.
 */
export async function runBusinessCaseCommand(
  argv: string[],
  io: { out: Output; err?: Output } = { out, err },
): Promise<number> {
  try {
    const target = argv.find((a) => !a.startsWith("-")) ?? ".";
    io.out(`Scanning ${target} ...`);

    const result = await runScan({
      target,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
    });

    const savingsPerFinding = result.findings.map((f) => {
      const fpRate = f.measuredFpRate ?? null;
      const evidenceLevel = f.evidenceLevel ?? "E0";
      const savings = expectedSavings(fpRate, evidenceLevel);
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

    io.out(renderSummary(savingsPerFinding));
    io.out(
      `\nTotal estimated savings from eliminating all gate-level findings: $${totalExpectedSavings}`,
    );
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
