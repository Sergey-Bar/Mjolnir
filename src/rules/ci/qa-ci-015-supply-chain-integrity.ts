/**
 * QA-CI-015 — Supply chain integrity: unpinned or unverified actions.
 * Severity: warning · Confidence: high · deterministic-defect
 *
 * A GitHub Actions workflow that uses an action without a pinned
 * version (e.g. `@main`, `@latest`, or no version at all) is a
 * supply-chain risk: the action can change at any time, silently
 * altering the CI behavior or injecting malicious code.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

const UNPINNED_VERSION_RE =
  /uses:\s*['"]?[^\s'"]+@(main|latest|master|\^|~|\*)/;

export const supplyChainIntegrity = defineRule({
  id: "QA-CI-015",
  category: "QA-CI",
  title: "Unpinned or unverified action in workflow",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "shell-string-in-config",
    detail:
      "action version pinning lives inside workflow YAML `uses:` " +
      "strings — the statement IS a string literal; a shell syntax " +
      "tree of an embedded value adds parsing without adding " +
      "classification power",
  },
  introduced: "2.0.0",
  tier: "quarantine",
  detectorRevision: 1,
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const lines = ctx.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line.startsWith("uses:")) continue;

      if (UNPINNED_VERSION_RE.test(line)) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          file: ctx.path,
          line: i + 1,
          column: 1,
          message:
            "Action uses an unpinned version (`@main`, `@latest`, etc.).",
          why: "An unpinned action can change at any time, silently altering CI behavior or introducing supply-chain vulnerabilities.",
          fix: "Pin the action to a specific commit SHA or a tagged release version (e.g., `@v1.2.3` or `@abc123def`).",
          qaImpact: "FALSE-GREEN",
        });
      }
    }
    return findings;
  },
});
