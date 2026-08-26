/**
 * QA-CS-108 — Playwright-.NET: hardcoded environment URLs.
 * Severity: warning · Confidence: high · deterministic-defect
 * Absolute URLs in specs hit production by accident and break between
 * environments — same meaning as QA-PW-123/QA-PY-108/QA-JV-108.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csHardcodedUrl = defineRule({
  id: "QA-CS-108",
  category: "QA-PW",
  title: "Hardcoded environment URL in spec",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    const re =
      /\.(?:GotoAsync|GetAsync|PostAsync)\s*\(\s*"https?:\/\/(?!localhost|127\.0\.0\.1)[^"]+"/g;
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
        fix: "Use relative paths against a configured BaseURL, or read the host from an environment variable.",
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
