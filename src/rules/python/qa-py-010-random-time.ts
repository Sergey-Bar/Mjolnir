/**
 * QA-PY-010 — Random/time dependence without freeze.
 * Severity: warning · Confidence: medium · heuristic-risk
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyRandomTimeDependence = defineRule({
  id: "QA-PY-010",
  category: "QA-TQUAL",
  title: "Random/time dependence in test",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "python" as unknown as "test-files",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const patterns = [
      {
        re: /\brandom\.(?:random|randint|choice|uniform)\s*\(/g,
        label: "random.*()",
      },
      {
        re: /\bdatetime\.(?:now|today)\s*\(\s*\)/g,
        label: "datetime.now()/today()",
      },
      { re: /\btime\.time\s*\(\s*\)/g, label: "time.time()" },
    ];

    for (const { re, label } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        // Skip if frozen (freezegun / pytest-freeze common patterns).
        const lineStart = ctx.text.lastIndexOf("\n", m.index) + 1;
        const line = ctx.text.slice(lineStart, ctx.text.indexOf("\n", m.index));
        if (/freeze_time|frozen|mock|patch/i.test(line)) continue;
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Nondeterministic value from \`${label}\` used without freezing.`,
          why: "Tests depending on real time/randomness fail intermittently — the worst kind of CI noise.",
          fix: "Freeze time (freezegun) or seed randomness; assert on fixed values.",
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
