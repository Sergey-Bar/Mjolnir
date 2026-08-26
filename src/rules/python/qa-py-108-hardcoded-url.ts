/**
 * QA-PY-108 — Playwright-Python: hardcoded environment URLs.
 * Severity: warning · Confidence: high · deterministic-defect
 * Absolute URLs in specs hit production by accident and break between
 * environments — same meaning as QA-PW-123.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyPwHardcodedUrl = defineRule({
  id: "QA-PY-108",
  category: "QA-PW",
  title: "Hardcoded environment URL in spec",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest-playwright", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const re =
      /(?:goto|request\.get|request\.post)\s*\(\s*["']https?:\/\/(?!localhost|127\.0\.0\.1)[^"']+["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Hardcoded URL: \`${(m[0] ?? "").slice(0, 60)}\`.`,
        why: "Absolute URLs break when environments change and can hit production by accident from a CI runner.",
        fix: "Use relative paths against baseURL (set via --base-url / base_url fixture), or read the host from an env variable.",
      });
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
