/**
 * QA-PW-144 — Single-browser project matrix (no cross-browser coverage).
 * Severity: info · Confidence: high · deterministic-defect
 * Upgrade-Plan-v3 Phase 1 layer 4 (cross-browser/device matrix gaps).
 * A projects list defining only chromium means WebKit/Firefox-only
 * breakage ships undetected.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt } from "../shared/positions.js";

export const pwSingleBrowserMatrix = defineRule({
  id: "QA-PW-144",
  tier: "core",
  category: "QA-PW",
  title: "Single-browser project matrix",
  severity: "info",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  configRule: true,
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.8",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    // pop() of a split() result is always defined.
    const base = ctx.path.split("/").pop() as string;
    if (!/^playwright\.config\.(ts|js|mjs|cts)$/.test(base)) return findings;

    const projectsMatch = /projects\s*:\s*\[/.exec(text);
    if (!projectsMatch) return findings;

    const names = [...text.matchAll(/name\s*:\s*['"]([^'"]+)['"]/g)].map((m) =>
      (m[1] as string).toLowerCase(),
    );
    if (names.length === 0) return findings;

    const engines = new Set<string>();
    for (const n of names) {
      if (/(chrom|chrome|edge|msedge)/.test(n)) engines.add("chromium");
      else if (/webkit|safari/.test(n)) engines.add("webkit");
      else if (/firefox/.test(n)) engines.add("firefox");
      else if (/(mobile|iphone|ipad|android)/.test(n))
        engines.add("mobile-device");
    }
    // Spread spread-spread: also count devices via use: { browserName } /
    // ...devices[...] entries, which name engines without project names.
    if (/browserName\s*:\s*['"]firefox['"]/.test(text)) engines.add("firefox");
    if (/browserName\s*:\s*['"]webkit['"]/.test(text)) engines.add("webkit");

    if (engines.size <= 1) {
      findings.push({
        severity: "info",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, projectsMatch.index),
        column: 1,
        message: `Projects cover only ${
          [...engines][0] ?? "a single"
        } engine — no cross-browser matrix.`,
        why: "Engine-specific breakage (CSS features, date inputs, download behavior) only shows up outside chromium; a single-engine matrix ships it to users undetected.",
        fix: "Add at least one webkit/firefox project (or `...devices['Desktop Safari']`) to the projects array.",
      });
    }
    return findings;
  },
});
