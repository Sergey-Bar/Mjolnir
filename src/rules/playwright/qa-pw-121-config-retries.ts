/**
 * QA-PW-121 — playwright.config: retries >= 3 or workers = 0.
 * Severity: warning · Confidence: high · deterministic-defect
 * Excessive retries mask real flakes; workers=0 serializes everything
 * and hides isolation bugs.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwConfigRetryAbuse = defineRule({
  id: "QA-PW-121",
  category: "QA-PW",
  title: "Config retry/worker abuse",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  configRule: true,
  configFiles: ["^playwright\\.config\\.(?:ts|js|mjs|cts)$"],
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes: "regex heuristic",
  introduced: "0.3.0",

  // Measured 2026-09-02 (corpus wave 5): FP ≤ 10% but n < 20 — measured-extended until the core DoD n ≥ 20 is met (plan §23).
  tier: "core",
  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const base = ctx.path.split("/").pop() as string;
    if (!/^playwright\.config\.(ts|js|mjs|cts)$/.test(base)) return findings;

    const retriesRe = /retries\s*:\s*(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = retriesRe.exec(text)) !== null) {
      if (Number(m[1]) >= 3) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `retries: ${m[1]} — a flaky test gets ${m[1]} chances to pass by luck.`,
          why: "High retry counts convert real bugs into intermittent passes and inflate CI minutes; the suite reports green while hiding instability.",
          fix: "Keep retries <= 2 and route repeat offenders into forensics (`mjolnir triage`).",
        });
      }
    }

    const workersRe = /workers\s*:\s*0\b/g;
    while ((m = workersRe.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: "workers: 0 — fully serialized execution.",
        why: "Serial runs hide test-isolation bugs and multiply pipeline wall-time; parallelism is how isolation problems get caught.",
        fix: "Use a positive worker count and fix the isolation issues that forced serialization.",
      });
    }
    return findings;
  },
});
