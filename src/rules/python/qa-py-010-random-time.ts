/**
 * QA-PY-010 — Random/time dependence without freeze.
 * Severity: warning · Confidence: medium · heuristic-risk
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyRandomTimeDependence = defineRule({
  id: "QA-PY-010",
  category: "QA-TQUAL",
  title: "Random/time dependence in test",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  // Measured FP 100% (n=10): wall-clock reads ARE the subject of e2e timing/throttle tests.

  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
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
      while ((m = re.exec(text)) !== null) {
        // Skip if frozen (freezegun / pytest-freeze common patterns).
        const lineStart = text.lastIndexOf("\n", m.index) + 1;
        const line = text.slice(lineStart, text.indexOf("\n", m.index));
        if (/freeze_time|frozen|mock|patch/i.test(line)) continue;
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Nondeterministic value from \`${label}\` used without freezing.`,
          why: "Tests depending on real time/randomness fail intermittently — the worst kind of CI noise.",
          fix: "Freeze time (freezegun) or seed randomness; assert on fixed values.",
        });
      }
    }
    return findings;
  },
});
