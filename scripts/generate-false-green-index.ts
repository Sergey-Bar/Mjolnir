/**
 * Generates tests/false-green/index.generated.ts (product-gap master
 * plan §6, plan 1789009691197 R4b): the drift-locked manifest of the
 * False-Green Attack Corpus — one row per case with the seven owner-
 * required declarations, the mutation inventory, and the UNSURFACED
 * rows (surfaces that ship in later increments — recorded, never
 * silently dropped, Constitution §5).
 *
 * Maintenance-cost containment (plan §12): the index is GENERATED from
 * the case registry and drift-locked by index.spec.ts — hand edits are
 * futile.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { FALSE_GREEN_CASES } from "../tests/false-green/cases.js";

const OUT_PATH = join(
  import.meta.dirname,
  "..",
  "tests",
  "false-green",
  "index.generated.ts",
);

export function renderIndex(): string {
  const lines: string[] = [];
  lines.push("/**");
  lines.push(" * False-Green Attack Corpus — GENERATED index (plan §6, R4b).");
  lines.push(" * Source of truth: tests/false-green/cases.ts. Regenerate with");
  lines.push(
    " * `npm run false-green:index`. Hand edits are futile: index.spec.ts",
  );
  lines.push(" * drift-locks this file against the registry.");
  lines.push(" */");
  lines.push("");
  lines.push('export const INDEX_VERSION = "false-green-index@1";');
  lines.push("");

  const classes = [
    ...new Set(FALSE_GREEN_CASES.map((c) => c.className)),
  ].sort();
  const wired = FALSE_GREEN_CASES.filter((c) => c.wired);
  const unsurfaced = FALSE_GREEN_CASES.filter((c) => !c.wired);

  lines.push(`export const CLASS_COVERAGE: Record<string, number> = {`);
  for (const cls of classes) {
    lines.push(
      `  "${cls}": ${FALSE_GREEN_CASES.filter((c) => c.className === cls).length},`,
    );
  }
  lines.push(`};`);
  lines.push("");

  for (const cls of classes) {
    lines.push(`// ── ${cls} ─────────────────────────────────────────────`);
    for (const c of FALSE_GREEN_CASES.filter((x) => x.className === cls)) {
      const status = c.wired ? "WIRED" : `UNSURFACED (ships in ${c.shippedIn})`;
      lines.push(`// ${c.id} — ${status}`);
      lines.push(`//   input: ${c.input}`);
      lines.push(`//   expected execution: ${c.expectedExecution}`);
      lines.push(`//   expected evidence: ${c.expectedEvidence}`);
      lines.push(`//   expected verdict: ${c.expectedVerdict}`);
      lines.push(`//   expected exit code: ${c.expectedExitCode}`);
      for (const f of c.expectedReportFields) {
        lines.push(`//   report field: ${f}`);
      }
      lines.push(`//   release impact: ${c.releaseImpact}`);
      if (c.mutations.length === 0) {
        lines.push(
          `//   mutations: none (unsurfaced rows carry no executable input)`,
        );
      }
      for (const m of c.mutations) {
        lines.push(`//   mutation: ${m.id} — ${m.transform}`);
      }
    }
    lines.push("");
  }

  lines.push(
    `// Wired cases: ${wired.length} · Unsurfaced rows: ${unsurfaced.length} · Total: ${FALSE_GREEN_CASES.length}`,
  );
  lines.push(
    `// Mutation inventory: ${FALSE_GREEN_CASES.reduce((s, c) => s + c.mutations.length, 0)} fixtures across the wired set.`,
  );
  lines.push("");
  return lines.join("\n");
}

if (process.argv[1]?.endsWith("generate-false-green-index.ts")) {
  writeFileSync(OUT_PATH, renderIndex());
  console.log("Wrote tests/false-green/index.generated.ts");
}
