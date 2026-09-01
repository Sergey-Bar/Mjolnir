/**
 * QA-CI-002 — `|| true` swallows a command's exit code.
 * Severity: error · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import { looksLikeVerificationGate } from "./verification-gate.js";

export const swallowedExitCode = defineRule({
  id: "QA-CI-002",
  category: "QA-CI",
  title: "Ignored exit code (|| true)",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // run: blocks containing `|| true` / `|| echo ...` failure swallowing.
    const re =
      /\|\|\s*true\b|:\s*(?:npm|yarn|pnpm|make|pytest|go)\b[^`\n]*\|\|\s*echo/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      // Only a false-green when the swallowed command is a verification gate.
      // `docker compose down || true`, `pkill -f server || true`, `rm x || true`
      // are ordinary teardown — their failure hides nothing. Check the whole
      // logical line the swallow sits on.
      const lineStart = ctx.text.lastIndexOf("\n", m.index) + 1;
      let lineEnd = ctx.text.indexOf("\n", m.index);
      if (lineEnd === -1) lineEnd = ctx.text.length;
      const swallowLine = ctx.text.slice(lineStart, lineEnd);
      if (!looksLikeVerificationGate(swallowLine)) continue;

      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: "Command exit code is swallowed with `|| true`.",
        why: "A failing step becomes a passing one — the workflow checkmark no longer reflects reality.",
        fix: "Remove `|| true`. If the step is genuinely optional, mark it clearly and use `continue-on-error` on that step only.",
        qaImpact: "FALSE-GREEN",
      });
    }
    return findings;
  },
});
