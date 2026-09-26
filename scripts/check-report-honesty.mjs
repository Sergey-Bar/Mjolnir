/**
 * `report:honesty` — no surface prints a number it never measured.
 *
 * Usage: node scripts/check-report-honesty.mjs [repo-root]
 *
 * BITTERSWEET `BW-103`. The concrete defect: `trust-report` rendered
 * `testDeclarationCount ?? 0` as "0 tests analyzed in 0 files" for a
 * producer that never measured a test declaration at all, while its
 * sibling `dashboard.ts` correctly rendered `frameworkCount: null` as
 * "unknown". The same scan therefore produced two artifacts disagreeing
 * about whether a measurement existed.
 *
 * The rule: a measurement that may be ABSENT is rendered through
 * `countOrUnknown` / `countOrNull` from `reporter/presentation.ts`, never
 * through `?? 0`. Absent is not zero — zero is a claim that the count was
 * taken and found nothing.
 *
 * This is a narrow structural check, not a value-flow analysis: it looks
 * for the shape of the bug (`?.count ?? 0` on a field whose name says it
 * is a measurement) and lets a reviewer judge the rest. It cannot prove
 * honesty; it makes the old shape impossible to reintroduce silently.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.argv[2] ?? process.cwd();
const SRC = join(root, "src");

/** Field names that are MEASUREMENTS — a count that may be unmeasured. */
const MEASUREMENT = new RegExp(
  String.raw`(?:Count|Declared|Declarations|Tests|Files|Findings)\b`,
);

/** `x.testDeclarationCount ?? 0` and `x?.testFileCount ?? 0`. */
const FABRICATED_ZERO = new RegExp(
  String.raw`([A-Za-z_$][\w$]*(?:\?)?\.[A-Za-z_$][\w$]*)\s*\?\?\s*0\b`,
  "g",
);

const IGNORED_DIRS = new Set(["node_modules", "dist", ".git", "fixtures"]);

/**
 * Reviewed exceptions. Each entry is a decision, not a silence: a bare
 * skip list is how a gate like this dies, and an unreviewed `?? 0` is
 * exactly the shape the gate exists to catch.
 *
 * These four sites pass an unmeasured value into a COMPUTATION, not into
 * rendered output. The release rule is "zero rendered value without
 * provenance" — a denominator is not a rendered claim, and changing these
 * to `null` would move scores and trust levels, which is a contract
 * change and not a reporting fix.
 *
 * Each is listed with the follow-up that owns the real decision, so an
 * exception is a scheduled item rather than a permanent hole.
 */
const ALLOWLIST = new Map([
  [
    "src/engine/trust-classification.ts:81",
    "completeness GATE, not a rendered value: `skippedFiles ?? 0 > 0` asks whether anything was skipped, and 0 is the identity for that question. Absent analysisStatus is already handled honestly one branch up (:78). Follow-up: BW-021 makes the census total explicit so the field stops being optional.",
  ],
  [
    "src/engine/trust-classification.ts:105",
    "same completeness gate as :81; the `?? 0` feeds `> 0`, never a printed count. Follow-up: BW-021.",
  ],
  [
    "src/engine/trust-summary.ts:142",
    "DENOMINATOR for evidenceCoverage, and the `> 0 ? … : 0` arm is an explicit, documented bounded result rather than a silent fill. The summary records the reason in `ceilingReasons`. Follow-up: Wave 2 honesty plumbing makes the absent denominator a first-class TrustSummary state.",
  ],
  [
    "src/scorer/scorer.ts:216",
    "DENOMINATOR for the scorer, not a rendered value. Changing it to null would move scores — a contract change, tracked as Wave 2 engine work, not a reporting fix.",
  ],
]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) yield full;
  }
}

const problems = [];
const allowed = [];
for (const file of walk(SRC)) {
  const rel = relative(root, file);
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "");
    for (const m of code.matchAll(FABRICATED_ZERO)) {
      const [, expression] = m;
      if (!MEASUREMENT.test(expression)) continue;
      const site = `${rel.split("\\").join("/")}:${i + 1}`;
      if (ALLOWLIST.has(site)) {
        allowed.push(site);
        continue;
      }
      problems.push(
        `${rel}:${i + 1} — \`${expression} ?? 0\` prints a zero for a ` +
          `measurement that may be absent. Use countOrUnknown(...) for a ` +
          `human surface or countOrNull(...) for a machine one.`,
      );
    }
  });
}

// A stale allowlist entry is a lie: it claims a decision about a line that
// has since moved or been fixed. Fail rather than carry it.
const stale = [...ALLOWLIST.keys()].filter((site) => !allowed.includes(site));
if (stale.length > 0) {
  for (const site of stale)
    console.error(
      `report:honesty: allowlist entry ${site} no longer matches any site — ` +
        `the line moved or was fixed. Delete the entry.`,
    );
  process.exit(1);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`report:honesty: ${problem}`);
  console.error(
    `report:honesty: ${problems.length} violation(s). An unmeasured value ` +
      `is not a zero.`,
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "PASS",
    violations: 0,
    reviewedExceptions: allowed.length,
  }),
);
