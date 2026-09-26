/**
 * `thresholds:parity` — no score-band literal outside the one registry.
 *
 * Usage: node scripts/check-threshold-parity.mjs [repo-root]
 *
 * BITTERSWEET `BW-104`. Four surfaces used to carry their own band
 * boundaries and disagreed: `dashboard.ts` split at 60, `handover.ts` at
 * 90, `mermaid.ts` and `score-state.ts` at 80/50, and `badge.ts` had its
 * own four-band set before it was folded into the model. Two of them made
 * the SAME score read as UNWORTHY in one artifact and amber in another.
 *
 * The rule this gate enforces is deliberately narrow, because a broad one
 * would be a lint smell rather than a truth check:
 *
 *   Outside `src/reporter/presentation.ts`, a comparison of a score-shaped
 *   value against a number between 1 and 100 is a re-declared band
 *   boundary, and must be named through the registry instead.
 *
 * `presentation.ts` is exempt because it OWNS the thresholds. Files that
 * legitimately compare against 0/1/2 (exit codes), against 100 when
 * clamping a percentage, or against non-score magnitudes (durations,
 * line counts) are not caught — the regex requires a score-ish name.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.argv[2] ?? process.cwd();
const SRC = join(root, "src");
/** The one module allowed to write a band boundary down. */
const REGISTRY = "src" + sep + "reporter" + sep + "presentation.ts";

/** Words that make a numeric comparison a *score* comparison. */
const SCORE_NAME_SOURCE = String.raw`(?:score|band|verdict|power|rating|health|grade)`;
const SCORE_NAME = new RegExp(SCORE_NAME_SOURCE, "i");

/** `x >= 60`, `score < 90`, `dim.score>=50` — but not `line >= 60`. */
const COMPARISON = new RegExp(
  String.raw`\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(>=|<=|>|<)\s*(\d{1,3})\b`,
  "g",
);

const IGNORED_DIRS = new Set(["node_modules", "dist", ".git", "fixtures"]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) yield full;
  }
}

const problems = [];
for (const file of walk(SRC)) {
  const rel = relative(root, file);
  if (rel === REGISTRY) continue;
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");
  lines.forEach((line, i) => {
    // A line comment is prose about a threshold, not a second one.
    const code = line.replace(/\/\/.*$/, "");
    for (const m of code.matchAll(COMPARISON)) {
      const [, name, op, digits] = m;
      const value = Number(digits);
      if (!SCORE_NAME.test(name)) continue;
      // 0, 1 and 2 are exit codes / falsy checks; 100 is the scale's own
      // ceiling, not a band edge. None of them is a re-declared boundary.
      if (value === 0 || value === 1 || value === 2 || value === 100) continue;
      problems.push(
        `${rel}:${i + 1} — \`${name} ${op} ${value}\` re-declares a score-band ` +
          `boundary outside ${REGISTRY}. Name it through SCORE_THRESHOLDS / ` +
          `deriveScoreState instead.`,
      );
    }
  });
}

if (problems.length > 0) {
  for (const problem of problems)
    console.error(`thresholds:parity: ${problem}`);
  console.error(
    `thresholds:parity: ${problems.length} violation(s). A score band is ` +
      `decided in exactly one place, or two surfaces will disagree about it.`,
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "PASS",
    registry: REGISTRY.split(sep).join("/"),
    violations: 0,
  }),
);
