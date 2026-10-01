#!/usr/bin/env node
/**
 * `check-certification-surface` — the §5.3 denominator, guarded.
 *
 * ## What it protects
 *
 * `EXPECTED_CERTIFICATION_SURFACE` is the declared set of cells that MUST be
 * certified. Without a committed denominator, a coverage percentage is
 * achievable by DELETING the cells that are not certified — which improves
 * every number in the report without anybody writing a fixture, and no
 * metrics-only report can tell the two apart.
 *
 * So the surface may GROW freely (`REQUIRED` may be added: that raises the bar)
 * and it may SHRINK only with `--acknowledge-surface-change` naming the cells
 * that left, which puts the removal in the diff where a reviewer sees it.
 *
 * ## The four checks
 *
 *   1. No cell names a concept the vocabulary does not have. A `REQUIRED` cell
 *      for a concept nobody defined is permanent work that is really a typo,
 *      and it makes the denominator unreachable.
 *   2. Every `NOT_APPLICABLE` cell gives a reason that NAMES AN ALTERNATIVE.
 *      "not applicable here" with no successor is a deletion wearing a label,
 *      and the plan's own example — a CI concept on a Python ecosystem — shows
 *      the shape of a real one: it names the surface the cell belongs to.
 *   3. The declared surface SHRINKS only with acknowledgement. The baseline is
 *      committed (`docs/certification-surface-baseline.json`) for the same
 *      reason the denominator is: a gate that compares the manifest against
 *      itself cannot see a removal that was committed last month.
 *   4. No duplicate `ecosystem|concept|framework` cell. Two rows for one cell
 *      means the count is computed over a set with a duplicate, which is a
 *      percentage that can be improved by adding a row.
 *
 * ## Usage
 *
 *   node scripts/check-certification-surface.mjs
 *   node scripts/check-certification-surface.mjs --acknowledge-surface-change=<reason>
 *
 * Exit codes: 0 = surface is sound, 1 = a check failed, 10 = usage error.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const BASELINE = join(ROOT, "docs", "certification-surface-baseline.json");

/**
 * Every cell key in the current surface, read from the manifest through a
 * `.ts` bridge.
 *
 * The gate is `.mjs`, so it cannot carry a TypeScript cast — and the first
 * version did, which is a syntax error at load rather than at the check. JSDoc
 * instead, the way every other `.mjs` gate in this repository does it.
 *
 * @returns {{
 *   cells: Array<{ecosystem: string, concept: string, framework: string,
 *                 requirement: string, reason?: string}>,
 *   unknownConcepts: string[],
 * }}
 */
function currentCells() {
  const src = join(ROOT, "scripts", "certification-surface-cells.ts");
  const tsx = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  if (!existsSync(tsx)) {
    throw new Error(
      `${tsx} is missing, so the surface manifest cannot be read. This gate ` +
        "reports PASS only when it has read the manifest; a gate that cannot " +
        "read its input must not look like a gate that found nothing to " +
        "complain about.",
      { cause: new Error("tsx is not installed in this tree") },
    );
  }
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [tsx, src], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1 << 26,
    });
  } catch (error) {
    throw new Error(
      "reading the surface manifest failed, so nothing below was checked: " +
        `${error instanceof Error ? error.message.split("\n")[0] : String(error)}. ` +
        "A surface this gate cannot read is a surface nobody is guarding.",
      { cause: error },
    );
  }
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `scripts/certification-surface-cells.ts did not print JSON: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

const argv = process.argv.slice(2);
const ackFlag = argv.find((a) => a.startsWith("--acknowledge-surface-change"));
const acknowledge =
  ackFlag?.slice("--acknowledge-surface-change=".length) ?? "";
for (const arg of argv) {
  if (arg === "--acknowledge-surface-change") continue;
  if (arg.startsWith("--acknowledge-surface-change=")) continue;
  console.error(
    `check-certification-surface: unknown argument ${JSON.stringify(arg)}. ` +
      "Usage: check-certification-surface [--acknowledge-surface-change=<reason>]",
  );
  process.exit(10);
}

// A gate that cannot READ its input must not report a pass. The first
// version swallowed the bridge's failure and printed "PASS — 107 cells", which
// is the loudest possible wrong answer: a surface nobody is guarding, reported
// as a surface that needs nothing guarding.
let surface;
try {
  surface = currentCells();
} catch (error) {
  console.error(
    `check-certification-surface: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(10);
}

const failures = [];
const { cells, unknownConcepts } = surface;

// ── 1. every cell names a concept that exists ─────────────────────────────
for (const concept of unknownConcepts) {
  failures.push(
    `cells name the concept "${concept}", which the vocabulary does not ` +
      "define. A REQUIRED cell for an undefined concept is a denominator " +
      "entry that can never be closed.",
  );
}

// ── 2. every exclusion names an alternative ───────────────────────────────
for (const cell of cells) {
  if (cell.requirement !== "NOT_APPLICABLE") continue;
  const reason = (cell.reason ?? "").trim();
  if (reason === "") {
    failures.push(
      `${cell.ecosystem}|${cell.concept}|${cell.framework} is NOT_APPLICABLE ` +
        "with no reason. An exclusion nobody justifies is a deletion with a " +
        "comment.",
    );
    continue;
  }
  if (reason.length < 20) {
    failures.push(
      `${cell.ecosystem}|${cell.concept}|${cell.framework} is NOT_APPLICABLE ` +
        `with the reason "${reason}". Name the surface it DOES belong to, or ` +
        "what makes it inapplicable.",
    );
    continue;
  }
  const namesAlternative =
    /\bbelongs\b|\bowned\b|\bthat surface\b|\bexpressible\b|\bnot\b/i.test(
      reason,
    );
  if (!namesAlternative) {
    failures.push(
      `${cell.ecosystem}|${cell.concept}|${cell.framework} is NOT_APPLICABLE ` +
        `with the reason "${reason}", which names no alternative. A reason ` +
        "that only says why not here is indistinguishable from deleting the " +
        "cell.",
    );
  }
}

// ── 3. no duplicate cell keys ─────────────────────────────────────────────
{
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const duplicates = [];
  for (const cell of cells) {
    const key = `${cell.ecosystem}|${cell.concept}|${cell.framework}`;
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  for (const key of [...new Set(duplicates)]) {
    failures.push(
      `${key} appears more than once. The certified/required ratio is ` +
        "computed over a set, so a duplicate is a row that changes the " +
        "percentage without changing what is certified.",
    );
  }
}

// ── 4. the surface does not shrink without acknowledgement ────────────────
/** @type {{ cells: string[], acknowledged: string | null } | null} */
let baseline = null;
try {
  baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
} catch {
  /* written below on first run */
}

const keys = cells
  .map((c) => `${c.ecosystem}|${c.concept}|${c.framework}`)
  .sort();

if (baseline === null) {
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        note:
          "The cell keys the surface declared at first run. " +
          "`check-certification-surface` compares against this so a removal " +
          "committed last month is still visible today. `--acknowledge-" +
          "surface-change=<reason>` is the only way to shrink it.",
        cells: keys,
        acknowledged: null,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(
    `check-certification-surface: wrote the baseline — ${keys.length} cells. ` +
      "From now on a removal needs acknowledgement.",
  );
} else {
  // Direction matters, and the first version computed BOTH filters from the
  // current keys — so `removed` was "keys the baseline does not have", which is
  // the ADDED set, and a real removal was invisible. The gate that exists to
  // catch a shrinking denominator did not detect one. The spec's fixture
  // caught it: it shrank the surface by a cell and the gate said PASS.
  //
  // `removed` walks the BASELINE. `added` walks the CURRENT keys. Getting
  // these the wrong way round is the single failure this whole file exists to
  // prevent, which is why each side is written as a walk of the side it names.
  const now = new Set(keys);
  const before = new Set(baseline.cells);
  const removed = baseline.cells.filter((k) => !now.has(k));
  const added = keys.filter((k) => !before.has(k));

  if (removed.length > 0) {
    if (acknowledge.trim() === "") {
      failures.push(
        `the surface SHRANK by ${removed.length} cell(s) without ` +
          "`--acknowledge-surface-change`:\n" +
          removed.map((k) => `    - ${k}`).join("\n") +
          "\nA smaller denominator improves every percentage in the report " +
          "without anybody certifying anything. Pass " +
          "`--acknowledge-surface-change=<why>` and the reason is recorded in " +
          "the baseline.",
      );
    } else {
      // Acknowledge MEANS the baseline moves. Recording the reason without
      // updating the cell list leaves the same "removal" firing on the next
      // run forever — the first version did exactly that, and the gate was
      // un-passable without editing a JSON file by hand. The reason is kept
      // beside the new list, so the acknowledgement is itself reviewable
      // history rather than a message that scrolled past.
      writeFileSync(
        BASELINE,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            note:
              "The cell keys the surface declared at first run. " +
              "`check-certification-surface` compares against this so a " +
              "removal committed last month is still visible today. " +
              "`--acknowledge-surface-change=<reason>` is the only way to " +
              "shrink it, and acknowledging moves this list.",
            cells: keys,
            acknowledged: acknowledge,
            acknowledgedAt: new Date().toISOString().slice(0, 10),
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      console.log(
        `check-certification-surface: acknowledged the removal of ` +
          `${removed.length} cell(s) and moved the baseline to ` +
          `${keys.length}. Reason recorded: ${acknowledge}`,
      );
      for (const k of removed) console.log(`    - ${k}`);
    }
  }

  // Growth is free and is reported, not gated.
  if (added.length > 0) {
    console.log(
      `check-certification-surface: ${added.length} cell(s) added — ` +
        "raising the bar, which is free. New required cells:",
    );
    for (const k of added) console.log(`    + ${k}`);
  }

  if (removed.length === 0 && acknowledge.trim() === "") {
    console.log(
      `check-certification-surface: PASS — ${keys.length} cells, surface has ` +
        "not shrunk.",
    );
  }
}

if (failures.length > 0) {
  console.error("Certification surface check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `check-certification-surface: PASS — ${keys.length} cells across ` +
    `${new Set(cells.map((c) => c.ecosystem)).size} ecosystems.`,
);
