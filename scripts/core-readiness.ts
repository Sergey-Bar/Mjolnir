/**
 * `npm run docs:core-readiness` — the queue for earned core.
 *
 * "Core is unreachable" was a mystery: `straddleDetail` quoted a sample count
 * that was wrong by a transposition (it said 1 where the arithmetic says 35),
 * nothing else stated what a rule needed, and the capability matrix rendered
 * the same "unmeasured" cell for six different situations. This is the
 * artifact that replaces all three.
 *
 * It is a GENERATOR, not a report, for the same reason the capability matrix
 * is: a hand-maintained readiness table drifts the moment a measurement
 * changes, and a stale readiness table is worse than none — it sends a
 * maintainer to re-sample a rule that was fixed months ago.
 *
 * The verdict ladder, and why each state is distinct:
 *
 *   EARNED            — a valid measurement whose interval clears the ceiling.
 *                        This is the only state that is not someone's problem.
 *   NEEDS-SAMPLES     — too few samples at the observed rate. The corpus is
 *                        the constraint; more data settles it as-is.
 *   NEEDS-FP-REDUCTION — enough samples, too many false positives. The rule
 *                        is wrong, not the corpus.
 *   NOT-MEASURED      — no measurement at all, or a stale one. Nothing can be
 *                        said about it.
 *   DECLARED          — in core on an unexpired `corePromotion`, which is a
 *                        maintainer's judgement the corpus cannot support.
 *   EXPIRED           — the promotion lapsed; the rule resolves to `extended`.
 *
 * NEEDS-SAMPLES and NEEDS-FP-REDUCTION are separated because they point at
 * opposite work. Conflating them sends a maintainer to add corpus
 * repositories for a rule that should have been narrowed.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { isMainModule } from "./lib/is-main-module.js";
import { prettify } from "./lib/prettify.js";

import { checkCorePromotion } from "../src/commands/doctor.js";
import { RULES } from "../src/rules/index.js";
import type { QADoctorRule } from "../src/rules/rule.js";
import {
  CORE_FP_CEILING,
  hasStaleMeasurement,
  hasValidMeasurement,
  samplesForZeroFp,
} from "../src/rules/measurement.js";
import { wilsonInterval } from "../src/lib/wilson.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "CORE-READINESS.md");

type ReadinessVerdict =
  | "EARNED"
  | "NEEDS-SAMPLES"
  | "NEEDS-FP-REDUCTION"
  | "NOT-MEASURED"
  | "DECLARED"
  | "EXPIRED";

interface ReadinessRow {
  ruleId: string;
  verdict: ReadinessVerdict;
  /** Current declared tier. */
  tier: QADoctorRule["tier"];
  /** Samples in the current measurement; 0 when there is none. */
  n: number;
  /** Samples a zero-FP rule needs to clear the ceiling. */
  nRequired: number;
  /** The 95% Wilson upper bound, or null with no valid measurement. */
  ciHigh: number | null;
  /** Observed false-positive rate, or null. */
  observedFpRate: number | null;
  /** How many additional false positives the rule may carry at this n. */
  fpHeadroom: number | null;
  /** Why the verdict is what it is — rendered into the table. */
  note: string;
}

function classifyReadiness(rule: QADoctorRule, today: string): ReadinessRow {
  const nRequired = samplesForZeroFp(CORE_FP_CEILING);
  const base: Omit<ReadinessRow, "verdict" | "note"> = {
    ruleId: rule.id,
    tier: rule.tier,
    n: 0,
    nRequired,
    ciHigh: null,
    observedFpRate: null,
    fpHeadroom: null,
  };

  const promotion = rule.corePromotion;
  if (promotion && !hasValidMeasurement(rule)) {
    const problems = checkCorePromotion(promotion, today);
    const expired = promotion.expiresOn < today;
    // The note carries the uncited case, because `checkCorePromotion` cannot:
    // a structural premise legitimately has no corpus verdict behind it, and
    // refusing it would make the field decorative rather than meaningful. The
    // verdict stays DECLARED — a maintainer did assert this — and the note
    // says the assertion is uncited, so it reads as one.
    const uncited = promotion.evidenceRefs.length === 0;
    return {
      ...base,
      verdict: expired || problems.length > 0 ? "EXPIRED" : "DECLARED",
      note: expired
        ? `promotion lapsed ${promotion.expiresOn}`
        : problems.length > 0
          ? (problems[0] ?? "promotion is defective")
          : uncited
            ? `declared by ${promotion.owner} until ${promotion.expiresOn}, with NO evidence reference — a structural premise rather than a corpus observation, and the corpus still owes this rule samples`
            : `declared by ${promotion.owner} until ${promotion.expiresOn}, citing ${promotion.evidenceRefs.length} evidence reference(s)`,
    };
  }

  if (!hasValidMeasurement(rule)) {
    return {
      ...base,
      verdict: "NOT-MEASURED",
      // The two sentences are different facts and the first version emitted the
      // second one for both. A rule with 42 hand-classified verdicts that
      // predate the current detector needs those verdicts REDONE, not started;
      // "no measurement" sends a maintainer to do work that is already done.
      note: hasStaleMeasurement(rule)
        ? `a measurement exists but predates the current detector revision — it must be RE-SAMPLED, not started; n and ciHigh are withheld because they describe a detector that no longer exists`
        : "no measurement at the current detector revision",
    };
  }

  const measured = MEASURED_FP[rule.id];
  const n = measured?.n ?? 0;
  // The shipped measurement records a RATE and a sample count, not an integer
  // false-positive count — `measurementInterval` reconstructs the count as
  // `fpRate * n` and hands it to `wilsonInterval`, which rounds internally.
  // Reconstructing it the same way here keeps this table and the interval the
  // rest of the repository gates on reading identically; a second rounding
  // rule would put a ciHigh in this file that no other tool reproduces.
  const falsePositives = measured
    ? Math.round(measured.fpRate * measured.n)
    : 0;
  const ciHigh = measured ? wilsonInterval(falsePositives, n).ciHigh : null;
  const observedFpRate = measured?.fpRate ?? null;

  // How many MORE false positives the current sample could absorb and still
  // clear the ceiling. The answer is a function of n alone, and it is the
  // number a maintainer actually acts on: at n=20 the rule can carry zero; at
  // n=80 it can carry two.
  const headroom = (() => {
    for (let extra = 0; extra <= 50; extra += 1) {
      if (wilsonInterval(falsePositives + extra, n).ciHigh <= CORE_FP_CEILING) {
        return extra;
      }
    }
    return null;
  })();
  const row: Omit<ReadinessRow, "verdict" | "note"> = {
    ...base,
    n,
    ciHigh,
    observedFpRate,
    fpHeadroom: headroom,
  };

  if (ciHigh !== null && ciHigh <= CORE_FP_CEILING) {
    return {
      ...row,
      verdict: "EARNED",
      note: `interval clears ${(CORE_FP_CEILING * 100).toFixed(0)}%`,
    };
  }

  if (observedFpRate !== null && observedFpRate > CORE_FP_CEILING) {
    return {
      ...row,
      verdict: "NEEDS-FP-REDUCTION",
      note: `observed ${(observedFpRate * 100).toFixed(1)}% — the rule is wrong, not the corpus`,
    };
  }

  return {
    ...row,
    verdict: "NEEDS-SAMPLES",
    note: `at this rate n=${n}, needs ≥${nRequired}`,
  };
}

function pct(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function render(rows: ReadinessRow[]): string {
  const byVerdict = new Map<ReadinessVerdict, ReadinessRow[]>();
  for (const row of rows) {
    const bucket = byVerdict.get(row.verdict) ?? [];
    bucket.push(row);
    byVerdict.set(row.verdict, bucket);
  }
  const order: ReadinessVerdict[] = [
    "EARNED",
    "NEEDS-SAMPLES",
    "NEEDS-FP-REDUCTION",
    "NOT-MEASURED",
    "DECLARED",
    "EXPIRED",
  ];
  const lines: string[] = [
    "# Core readiness",
    "",
    "**Generated — do not edit by hand.** Regenerate: `npm run docs:core-readiness`.",
    "",
    `The core tier holds ${byVerdict.get("EARNED")?.length ?? 0} rule(s) that cleared`,
    `the ${(CORE_FP_CEILING * 100).toFixed(0)}% Wilson ceiling by measurement. A rule`,
    `observing ZERO false positives needs **n ≥ ${samplesForZeroFp(CORE_FP_CEILING)}** to clear`,
    "it, which is why a thin sample is not a verdict — see",
    "[`docs/ANTI-CREEP.md`](ANTI-CREEP.md).",
    "",
    "| Verdict | Rules | What it means |",
    "| --- | ---: | --- |",
    `| EARNED | ${byVerdict.get("EARNED")?.length ?? 0} | A valid measurement whose 95% interval clears the ceiling |`,
    `| NEEDS-SAMPLES | ${byVerdict.get("NEEDS-SAMPLES")?.length ?? 0} | Sample too small at the observed rate; more data settles it as-is |`,
    `| NEEDS-FP-REDUCTION | ${byVerdict.get("NEEDS-FP-REDUCTION")?.length ?? 0} | Sample large enough, false-positive rate too high; the rule is wrong, not the corpus |`,
    `| NOT-MEASURED | ${byVerdict.get("NOT-MEASURED")?.length ?? 0} | No measurement at the current detector revision |`,
    `| DECLARED | ${byVerdict.get("DECLARED")?.length ?? 0} | In core on an unexpired \`corePromotion\` — a maintainer judgement the corpus cannot support |`,
    `| EXPIRED | ${byVerdict.get("EXPIRED")?.length ?? 0} | The promotion lapsed; the rule resolves to \`extended\` |`,
    "",
  ];

  for (const verdict of order) {
    const bucket = byVerdict.get(verdict);
    if (!bucket || bucket.length === 0) continue;
    lines.push(
      `## ${verdict} (${bucket.length})`,
      "",
      "| Rule | Tier | n | n required | ciHigh | Observed FP | FP headroom | Note |",
      "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    );
    for (const row of bucket) {
      lines.push(
        `| ${row.ruleId} | ${row.tier ?? "(undeclared)"} | ${row.n} | ${row.nRequired} | ` +
          `${pct(row.ciHigh)} | ${pct(row.observedFpRate)} | ` +
          `${row.fpHeadroom === null ? "—" : `${row.fpHeadroom} more`} | ${row.note} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## The queue to work from",
    "",
    "`NEEDS-SAMPLES` is a corpus problem and belongs in Wave 5's language and",
    "repository selection. `NEEDS-FP-REDUCTION` is a detector problem and belongs",
    "in the next rule revision. Sorting the two into one list is how a maintainer",
    "ends up adding ten repositories for a rule that should have been narrowed.",
    "",
  );
  return lines.join("\n");
}

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = RULES.map((rule) => classifyReadiness(rule, today)).sort(
    (a, b) => a.ruleId.localeCompare(b.ruleId),
  );
  // Render, write, then PRETTIFY — in that order, and it matters.
  //
  // `docs:regen` is followed by `git diff --exit-code` in CI, so a generator
  // that emits its own formatting is a generator that reports a diff on every
  // run for a reason that has nothing to do with the artifact. The capability
  // generator learned this; the first version of this one did not, and
  // `npm run certify` failed on a file whose CONTENT was correct.
  //
  // The prettify runs unconditionally, including when the rendered text is
  // byte-identical to what is on disk. Comparing before prettifying meant a
  // file left unformatted by an earlier run was reported as "unchanged" and
  // never fixed — the one run that had work to do was the one that skipped it.
  const before = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, render(rows), "utf8");
  await prettify(OUT);
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.verdict] = (acc[row.verdict] ?? 0) + 1;
    return acc;
  }, {});
  const summary = `${JSON.stringify(counts)} of ${rows.length}`;
  if (before !== null && readFileSync(OUT, "utf8") === before) {
    console.log(`core-readiness: unchanged (${summary})`);
    return;
  }
  console.log(`core-readiness: wrote ${OUT} — ${summary}`);
}

if (isMainModule(import.meta.url)) {
  await main();
}
