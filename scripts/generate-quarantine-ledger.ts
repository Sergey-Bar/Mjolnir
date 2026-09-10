/**
 * Generates docs/QUARANTINE-REMEDIATION.md (product-gap master plan P6 —
 * plan 1789009691197 R3): the ledger-first view of the quarantine tier.
 *
 * One row per LIVE quarantine rule (registry-derived, so it can never
 * drift from the code): failure-mode class, disposition, target
 * detectorRevision, and the re-measure gate state. A historical section
 * records the governed retirements (RETIRED_RULE_IDS). The failure-mode
 * class and disposition for the P6 rework set are evidence-derived from
 * the corpus verdict notes; every other row starts as "re-derive at its
 * wave" — the ledger is the working instrument, not a one-shot report.
 *
 * Drift-locked by tests/contract/quarantine-ledger.spec.ts.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { RULES, RETIRED_RULE_IDS } from "../src/rules/index.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import { declaredDetectorRevision } from "../src/rules/measurement.js";

const OUT_PATH = join(
  import.meta.dirname,
  "..",
  "docs",
  "QUARANTINE-REMEDIATION.md",
);

/**
 * Failure-mode class + disposition for the rules the corpus evidence
 * already adjudicates. Everything else is an open row — the ledger's
 * purpose is to make that visible, not to hide it behind prose.
 */
const DISPOSITIONS: Record<
  string,
  { failureMode: string; disposition: string; rework: string; target: string }
> = {
  "QA-ENV-001": {
    failureMode:
      "OS-path sub-pattern fired on deliberate path fixtures (unix-socket /tmp is OS-mandated; Windows paths were the SUBJECT of platform-detection tests) — 20/20 FP at n=20",
    disposition: "REWORKED (final attempt shipped)",
    rework:
      "detectorRevision 4: OS-path sub-pattern dropped (same undecidability as the wave-2 host drop); locale + local-time-getter families kept",
    target:
      "re-measure gate: corpus re-run + owner re-adjudication of surviving findings",
  },
  "QA-PW-147": {
    failureMode:
      "default-title regex fired on code-as-data — `test('test', …)` written as synthetic strings inside eslint-plugin unit tests — 20/20 FP at n=20",
    disposition: "REWORKED (final attempt shipped)",
    rework:
      "detectorRevision 2: AST arm fires only on REAL test/it CallExpressions with a default-title StringLiteral; code-as-data never parses as a call",
    target:
      "re-measure gate: corpus re-run + owner re-adjudication of surviving findings",
  },
  "QA-PY-007": {
    failureMode:
      "fired on single-statement raises blocks with specific exception types (the intended line is the only line) — 79.4% FP at n=34",
    disposition: "REWORKED (AST substrate)",
    rework:
      "detectorRevision 4: tree-sitter python gate — fires only on ≥2-statement with-blocks or broad root exception types; single-statement/specific-type suppressed",
    target:
      "re-measure gate: corpus re-run + owner re-adjudication of surviving findings",
  },
  "QA-TQUAL-009": {
    failureMode:
      "Cypress command chains (`cy.request().then()`) are queued and awaited by the Cypress driver; one deliberate `void` discard — 78.6% FP at n=14",
    disposition: "REWORKED (AST substrate)",
    rework:
      "detectorRevision 2: ts-morph arm skips `cy`-rooted chains and VoidExpression-wrapped chains; the plain unawaited-fetch diagnosis unchanged",
    target:
      "re-measure gate: corpus re-run + owner re-adjudication of surviving findings",
  },
};

function pct(id: string): string {
  const m = MEASURED_FP[id];
  if (!m) return "unmeasured";
  const rule = RULES.find((r) => r.id === id);
  const stale = rule
    ? m.detectorRevision !== declaredDetectorRevision(rule)
    : false;
  return `${(m.fpRate * 100).toFixed(1)}% (n=${m.n})${stale ? " — STALE (rev mismatch)" : ""}`;
}

function escapeCell(s: string): string {
  return s.replaceAll("|", "\\|");
}

function buildLedger(): string {
  const lines: string[] = [];
  lines.push("# Quarantine Remediation Ledger");
  lines.push("");
  lines.push(
    "Generated from the live registry by `scripts/generate-quarantine-ledger.ts` — regenerate",
    "with `npm run docs:quarantine-ledger`. Hand edits to the tables are futile: the",
    "drift-lock test fails them. The failure-mode/disposition PROSE per row is the",
    "working record of each rule's evidence.",
    "",
  );
  lines.push(
    "Ladder (plan §11): a reworked rule re-enters the measured flow when its FP rate",
    "lands ≤ 30% (extended) or ≤ 10% (core) at n ≥ 10; a rule that stays ≥ 75% after",
    "its final attempt is retired under the governed path (RULE-LIFECYCLE).",
    "",
  );

  const live = RULES.filter((r) => r.tier === "quarantine");
  lines.push(`## Live quarantine rules: ${live.length} of ${RULES.length}`, "");
  lines.push(
    "| Rule | Detector | Measured FP | Failure-mode class (evidence) | Disposition |",
  );
  lines.push("| --- | --- | --- | --- | --- |");
  for (const rule of [...live].sort((a, b) => a.id.localeCompare(b.id))) {
    const d = DISPOSITIONS[rule.id];
    const measured = pct(rule.id);
    const mode = d
      ? d.failureMode
      : "re-derive at its wave (no corpus evidence yet)";
    const disp = d ? `${d.disposition} — ${d.rework}; ${d.target}` : "open";
    lines.push(
      `| ${rule.id} | ${escapeCell(String(rule.detectionStrategy))} | ${escapeCell(measured)} | ${escapeCell(mode)} | ${escapeCell(disp)} |`,
    );
  }
  lines.push("");

  lines.push("## Historical: governed retirements");
  lines.push("");
  lines.push(
    `${RETIRED_RULE_IDS.length} rules have been retired under the governed path`,
    "(RULE-LIFECYCLE: measured ≥ 75% FP after rework attempts, or superseded).",
    "Retired IDs live in `src/rules/index.ts` (`RETIRED_RULE_IDS`); the full",
    "adjudication history per ID is in `docs/FP-AUDIT.md` and the corpus",
    "verdict archive (`tests/corpus/verdicts/archive/`).",
    "",
  );
  for (const id of RETIRED_RULE_IDS) {
    lines.push(`- ${id}`);
  }
  lines.push("");
  return lines.join("\n");
}

// Drift-lock support: the spec imports the generator's output through
// this pure function; the write runs only when executed directly.
export function renderLedger(): string {
  return buildLedger();
}

if (process.argv[1]?.endsWith("generate-quarantine-ledger.ts")) {
  writeFileSync(OUT_PATH, buildLedger());
  console.log("Wrote docs/QUARANTINE-REMEDIATION.md");
}
