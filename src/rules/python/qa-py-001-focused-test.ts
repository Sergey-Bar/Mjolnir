/**
 * QA-PY-001 — Focused test committed.
 * Severity: error · Confidence: high · deterministic-defect
 * `-k` hardcoded in pytest.main, or @pytest.mark.only — a subset of the
 * suite runs while CI reports green.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyFocusedTest = defineRule({
  id: "QA-PY-001",
  category: "QA-TEST",
  title: "Focused test committed",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const patterns: RegExp[] = [
      // pytest.main([... "-k", ...]) — hardcoded subset selection.
      /pytest\.main\s*\(\s*\[[^\]]*['"]-k['"]/g,
      // Hardcoded node selection: pytest.main(["tests/test_x.py::test_y"]).
      /pytest\.main\s*\(\s*\[[^\]]*['"][^'"]+::[^'"]+['"]/g,
      // @pytest.mark.only — not built into pytest but common via plugins.
      /@pytest\.mark\.only\b/g,
    ];

    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Focused-test selection committed: \`${m[0].trim()}\`.`,
          why: "A hardcoded -k filter or ::node selection runs only a subset of the suite — everything else is unverified while CI stays green.",
          fix: "Remove the -k/:: selection from committed code; pass it on the command line locally instead.",
        });
      }
    }
    return findings;
  },
});

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
