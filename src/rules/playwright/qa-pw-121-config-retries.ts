/**
 * QA-PW-121 — playwright.config: retries >= 3 or workers = 0.
 * Severity: warning · Confidence: high · deterministic-defect
 * Excessive retries mask real flakes; workers=0 serializes everything
 * and hides isolation bugs.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwConfigRetryAbuse = defineRule({
  id: "QA-PW-121",
  category: "QA-PW",
  title: "Config retry/worker abuse",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const base = ctx.path.split("/").pop() ?? "";
    if (!/^playwright\.config\.(ts|js|mjs|cts)$/.test(base)) return findings;

    const retriesRe = /retries\s*:\s*(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = retriesRe.exec(ctx.text)) !== null) {
      if (Number(m[1]) >= 3) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `retries: ${m[1]} — a flaky test gets ${m[1]} chances to pass by luck.`,
          why: "High retry counts convert real bugs into intermittent passes and inflate CI minutes; the suite reports green while hiding instability.",
          fix: "Keep retries <= 2 and route repeat offenders into forensics (`mjolnir triage`).",
        });
      }
    }

    const workersRe = /workers\s*:\s*0\b/g;
    while ((m = workersRe.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "workers: 0 — fully serialized execution.",
        why: "Serial runs hide test-isolation bugs and multiply pipeline wall-time; parallelism is how isolation problems get caught.",
        fix: "Use a positive worker count and fix the isolation issues that forced serialization.",
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
