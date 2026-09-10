/**
 * docs/DEPTH-ADJUDICATION.md generator (master plan P8, plan
 * 1788853205786 — flag 6, decision 9: "no unexplained depth").
 *
 * Renders, from the SAME registry contract the doctor enforces (no
 * second truth):
 *   - the recorded verdict for EVERY LEXICAL rule (reason code +
 *     derivation), grouped by reason code;
 *   - the migration record: DEFERRED to the next measurement round by
 *     owner directive (2026-09-09) — no migration initiated without
 *     measured FP-reduction evidence; rules already on a deeper
 *     strategy are listed as the structural bench;
 *   - the mutation-coverage status derivation per defect class.
 *
 * Deterministic: same registry → same bytes (no timestamps). The
 * generated-docs-drift CI job regenerates and fails on any diff.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prettify } from "./lib/prettify.js";

import { RULES } from "../src/rules/index.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import type { QADoctorRule, StrategyReasonCode } from "../src/rules/rule.js";
import {
  deriveMutationCoverage,
  deriveSemanticDepth,
} from "./generate-capability-matrix.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "docs", "DEPTH-ADJUDICATION.md");

const REASON_CODE_LABELS: Readonly<Record<StrategyReasonCode, string>> = {
  "shell-string-in-config":
    "config surface: the statements ARE string literals (shell in YAML)",
  "exact-key-match":
    "exact, unambiguous runner/API token — lexical precision equals structural",
  "lexical-artifact": "the defect IS the lexical artifact (text = finding)",
  "runner-semantic":
    "semantics live in runner behavior no syntax tree represents",
  "string-content-defect":
    "the defect lives in string content (selector/URL) — outside AST semantics by design",
  "absence-aggregate":
    "absence over a suite/directory — the evidence is the aggregate shape",
  "family-fallback-lockstep":
    "the §13.2 mandatory regex fallback kept in lockstep with the family's structural path",
  "migration-deferred-next-measurement":
    "AST/QA_MODEL migration plausible but unproven — deferred to the next measurement round",
};

function measuredLabel(rule: QADoctorRule): string {
  const m = MEASURED_FP[rule.id];
  if (m === undefined) return "unmeasured";
  const declared = rule.detectorRevision ?? 1;
  if (m.detectorRevision !== declared) {
    return `${(m.fpRate * 100).toFixed(0)}% FP at n=${m.n} (stale — rev ${m.detectorRevision} vs declared ${declared})`;
  }
  return `${(m.fpRate * 100).toFixed(0)}% FP at n=${m.n}`;
}

export function renderDepthAdjudication(): string {
  const lines: string[] = [];

  lines.push("# Depth adjudication — no unexplained depth");
  lines.push("");
  lines.push(
    "Master plan P8 (plan 1788853205786, flag 6, decision 9). Every rule",
    "whose detection strategy is LEXICAL carries a recorded verdict: the",
    "closed reason code (see `src/rules/rule.ts` → `StrategyReasonCode`)",
    "and the derivation citing the detector's actual shape. The doctor's",
    "`registry-sanity` check enforces this on every run; this document is",
    "the rendered record, regenerated from the registry (never hand-edited).",
  );
  lines.push("");
  lines.push(
    "Deterministic provenance: the table below is generated from the same",
    "`RuleMeta.strategyJustification` records the engine ships — one",
    "source of truth, rendered here and in the capability matrix.",
  );
  lines.push("");

  const lexical = RULES.filter((r) => r.detectionStrategy === "LEXICAL").sort(
    (a, b) => a.id.localeCompare(b.id),
  );
  const deeper = RULES.filter(
    (r) =>
      r.detectionStrategy !== "LEXICAL" &&
      r.detectionStrategy !== undefined &&
      r.detectionStrategy !== "FRAMEWORK" &&
      r.detectionStrategy !== "RUNTIME",
  ).sort((a, b) => a.id.localeCompare(b.id));

  lines.push("## Verdict summary");
  lines.push("");
  lines.push(`- Registry: ${RULES.length} rules.`);
  lines.push(
    `- LEXICAL rules adjudicated: ${lexical.length} — every one carries a strategyJustification record (doctor-enforced).`,
  );
  lines.push(
    `- Rules on a deeper strategy: ${deeper.length} (${deeper
      .map((r) => r.detectionStrategy)
      .join(", ")}).`,
  );
  lines.push("");

  lines.push("## Migration record (DEFERRED — owner directive 2026-09-09)");
  lines.push("");
  lines.push(
    "Migration of LEXICAL detectors to AST/QA_MODEL is **deferred to the",
    "next measurement round**: no migration may be initiated without",
    "measured FP-reduction evidence, and initiating prolonged network",
    "measurements solely to unblock migration was explicitly ruled out.",
    "The deferral does not block any other work; rules whose existing",
    "evidence already demonstrated a required migration would have been",
    "migrated in this batch — none did.",
  );
  lines.push("");
  lines.push(
    "The structural bench (rules already on AST/QA_MODEL) shows migration",
    "is not hypothetical — it is the Lane-A/Lane-B precedent applied where",
    "evidence supported it:",
  );
  lines.push("");
  for (const r of deeper) {
    lines.push(
      `- **${r.id}** — ${r.detectionStrategy} (${deriveSemanticDepth(
        r.detectionStrategy as "AST" | "SEMANTIC" | "QA_MODEL",
      )} depth): ${r.title}`,
    );
  }
  lines.push("");

  const byCode = new Map<StrategyReasonCode, QADoctorRule[]>();
  for (const r of lexical) {
    const code = r.strategyJustification?.reasonCode;
    if (!code) continue; // doctor already fails on this; not rendered here
    const list = byCode.get(code) ?? [];
    list.push(r);
    byCode.set(code, list);
  }

  lines.push("## Verdicts by reason code");
  lines.push("");
  for (const [code, rules] of [...byCode.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    lines.push(
      `### \`${code}\` — ${REASON_CODE_LABELS[code]} (${rules.length} rules)`,
    );
    lines.push("");
    for (const r of rules) {
      const j = r.strategyJustification;
      if (!j) continue;
      lines.push(`- **${r.id}** (${measuredLabel(r)}): ${j.detail}`);
    }
    lines.push("");
  }

  lines.push("## Mutation-coverage status (P8.3 — zero UNCLASSIFIED cells)");
  lines.push("");
  lines.push(
    "- `not-applicable`: the defect class is mutation-unreachable —",
    "  runner-enforced semantics (`.only` skip is enforced by the runner;",
    "  no mutant of the test body changes the runner's skip decision) and",
    "  config-key rules (the target is a workflow/config surface mutation",
    "  tooling does not cover).",
  );
  lines.push(
    "- `not-yet-measured`: code-level defect classes a mutation tool can",
    "  in principle measure — no P5 mutation-evidence run has covered the",
    "  registry yet. Honest until a real mutation report is ingested.",
  );
  lines.push(
    "- `measured`: renders only after a mutation report is ingested via",
    "  `mjolnir mutation` and cross-referenced (P5). Today: none.",
  );
  lines.push("");

  // Per-rule mutation status (compact, deterministic):
  lines.push("| Rule | Mutation coverage | Reason |");
  lines.push("|---|---|---|");
  for (const r of [...RULES].sort((a, b) => a.id.localeCompare(b.id))) {
    const mc = deriveMutationCoverage(r);
    const reason =
      mc === "not-applicable"
        ? "runner-enforced semantics (mutation-unreachable defect class)"
        : mc === "not-yet-measured"
          ? "no mutation-evidence run has covered this defect class yet"
          : "measured via P5 evidence";
    lines.push(`| ${r.id} | ${mc} | ${reason} |`);
  }
  lines.push("");

  lines.push(
    "*Generated by `scripts/generate-depth-adjudication.ts` from the",
    "registry — deterministic, no timestamps; the generated-docs-drift CI",
    "job regenerates and fails on any diff.*",
  );
  lines.push("");

  return lines.join("\n");
}

export function main(): number {
  const text = renderDepthAdjudication();
  writeFileSync(OUT, text);
  console.log(
    `Wrote docs/DEPTH-ADJUDICATION.md (${text.split("\n").length} lines)`,
  );
  return 0;
}

// Drift-lock support: the capability-matrix spec imports the renderer.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const exit = main();
  void prettify(OUT).then(() => process.exitCode);
  void exit;
}
