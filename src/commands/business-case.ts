/**
 * `mjolnir business-case` — measured false-positive rates, and the
 * arithmetic a reader can audit.
 *
 * What changed, and why: this command multiplied a MEASURED false-positive
 * rate by a table of invented incident costs (fintech $50 000, healthcare
 * $100 000, …) with no source, and printed the product as "Expected
 * Savings" and "Total potential savings". A dollar figure with no
 * provenance is worse than no dollar figure: someone puts it in a
 * business case and defends it in a room. It also had a `--history` flag
 * whose own help text promised "estimates from actual scan improvements"
 * and which did nothing but print a pointer elsewhere, and a `--projected`
 * flag that divided the total by six and called the result a monthly rate.
 *
 * So the invented cost table is gone. The one number this command can
 * defend is the measured false-positive rate and how many findings carry
 * it. A dollar conversion happens only when the reader supplies the cost
 * of an incident themselves (`--incident-cost`), because then the number
 * has a source: theirs.
 *
 * Scheduled for removal in 5.0 — see docs/RELEASE-TRAINS.md.
 */

import { runScan } from "../cli.js";
import { EXIT_CLEAN, EXIT_INTERNAL, EXIT_USAGE } from "../exit-codes.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import { out, err } from "../cli-io.js";
import { evidenceLevelOf } from "../reporter/presentation.js";

/**
 * Evidence weight per level, applied to a user-supplied incident cost.
 * E0 is an observation and never counts — there is nothing to save against
 * a claim nobody made.
 */
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
    fpN: number | null;
    evidenceLevel: string;
    expectedSavings: number | null;
  }>,
  incidentCost: number | null,
  totalSavings: number | null,
): string {
  const measured = savingsPerFinding.filter((s) => s.fpRate !== null).length;
  const lines: string[] = [
    "Mjölnir — measured false-positive rates on the findings that fired",
    "=".repeat(58),
    "",
    `Measured: ${measured} of ${savingsPerFinding.length} findings carry a corpus-measured FP rate.`,
    ...(incidentCost === null
      ? [
          "",
          "NO DOLLAR FIGURES ARE SHOWN. Converting a false-positive rate into money",
          "requires the cost of one false-green incident in YOUR organisation, which",
          "this tool does not know and will not invent. Pass --incident-cost <n> to",
          "see the arithmetic; the number is then yours, not Mjölnir's.",
        ]
      : [
          "",
          `Incident cost used: $${incidentCost.toLocaleString()} (your figure, from --incident-cost).`,
          `Findings that fired: ${savingsPerFinding.length}.`,
        ]),
    "",
    "| Rule ID | FP Rate | n | Evidence | Expected cost |",
    "| ------- | ------- | - | -------- | ------------- |",
  ];

  for (const {
    ruleId,
    fpRate,
    fpN,
    evidenceLevel,
    expectedSavings: savings,
  } of savingsPerFinding) {
    const fpDisplay =
      fpRate !== null ? `${Math.round(fpRate * 100)}%` : "not measured";
    const nDisplay = fpN !== null ? String(fpN) : "—";
    const savingsDisplay =
      incidentCost === null || savings === null
        ? "—"
        : `$${savings.toLocaleString()}`;
    lines.push(
      `| ${ruleId} | ${fpDisplay} | ${nDisplay} | ${evidenceLevel} | ${savingsDisplay} |`,
    );
  }

  lines.push("");
  lines.push("How to read this:");
  lines.push("--------------------");
  lines.push(
    "- E2 is deterministic proof and counts in full; E1 is pattern evidence and counts half;",
  );
  lines.push(
    "  E0 is an observation and never counts. The evidence column is why the weight differs.",
  );
  lines.push(
    "- A rule with no measured FP rate is NOT assumed safe. It is unmeasured, and it says so.",
  );
  if (totalSavings !== null) {
    lines.push(
      `- Total expected cost across these findings: $${totalSavings.toLocaleString()}`,
    );
  }
  return lines.join("\n");
}

/**
 * Entry point for `mjolnir business-case`.
 *
 * Flags:
 *   --incident-cost <n>  The cost of ONE false-green incident in your
 *                        organisation. Until you supply it, no dollar
 *                        figure is printed at all.
 *   --strict             Include quarantine-tier findings
 *
 * `--history` and `--projected` are GONE. Both promised arithmetic this
 * tool cannot do: `--history` claimed to estimate from actual scan
 * improvements while reading no history at all, and `--projected` divided
 * the total by six and called the quotient a monthly rate. A flag that
 * does not do what its help says is worse than no flag, because the help
 * is the promise.
 */
export async function runBusinessCaseCommand(
  argv: string[],
  io: { out: Output; err?: Output } = { out, err },
): Promise<number> {
  try {
    const target = argv.find((a) => !a.startsWith("-")) ?? ".";
    const strict = argv.includes("--strict");

    for (const gone of ["--industry", "--history", "--projected"]) {
      if (argv.includes(gone)) {
        (io.err ?? err)(
          `${gone} is no longer accepted. ` +
            (gone === "--industry"
              ? "Incident costs are not industry defaults; pass --incident-cost <n> with a figure from your own incident history."
              : gone === "--history"
                ? "It read no history. Use `mjolnir impact --since <date>` for evidence-backed change data."
                : "A projection is an arithmetic identity, not an estimate. Use `mjolnir trend` for measured history."),
        );
        return EXIT_USAGE;
      }
    }

    const costIdx = argv.indexOf("--incident-cost");
    let incidentCost: number | null = null;
    if (costIdx !== -1) {
      const raw = argv[costIdx + 1];
      const parsed = Number.parseInt(raw ?? "", 10);
      if (
        raw === undefined ||
        raw.startsWith("-") ||
        !Number.isFinite(parsed) ||
        parsed <= 0
      ) {
        (io.err ?? err)(
          "--incident-cost requires a positive number: the cost of one false-green incident.",
        );
        return EXIT_USAGE;
      }
      incidentCost = parsed;
    }

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

    const savingsPerFinding = result.findings.map((f) => ({
      ruleId: f.ruleId,
      fpRate: f.measuredFpRate ?? null,
      fpN: f.measuredFpN ?? null,
      // Derived, never defaulted: a missing level is computed from the
      // finding's own type and confidence (BW-101).
      evidenceLevel: evidenceLevelOf(f),
      expectedSavings:
        incidentCost === null
          ? null
          : expectedSavings(
              f.measuredFpRate ?? null,
              evidenceLevelOf(f),
              incidentCost,
            ),
    }));

    const totalExpectedSavings =
      incidentCost === null
        ? null
        : savingsPerFinding.reduce(
            (sum, f) => sum + (f.expectedSavings ?? 0),
            0,
          );

    io.out(
      renderSummary(savingsPerFinding, incidentCost, totalExpectedSavings),
    );

    io.out("");
    io.out(
      "The FP rates above are measured on the OSS corpus. The dollar column, if you",
    );
    io.out(
      "asked for one, uses YOUR incident cost — Mjölnir does not estimate it.",
    );
    io.out("Run with --strict to also surface quarantine-tier findings.");

    return EXIT_CLEAN;
  } catch (e) {
    internalErrorMessage(e, io.err ?? err, false);
    return EXIT_INTERNAL;
  }
}
