/**
 * QA-PW-124 — Projects defined but no smoke/regression split.
 * Severity: info · Confidence: high · deterministic-defect
 * One monolithic project forces full-suite-or-nothing; PR feedback dies.
 *
 * detectorRevision 2 (certification-audit D3, 2026-09-07): the rule is now
 * DECLARED as a config-gated rule (`configRule` + `configFiles`) instead of
 * relying only on its internal basename gate — same gating surface as
 * QA-PW-121/122/141/143/144. Detection logic is unchanged (the internal
 * basename gate remains as defense in depth), so scan output is
 * byte-identical; the revision bump declares the metadata change per §07.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt } from "../shared/positions.js";

export const pwNoProjectSplit = defineRule({
  id: "QA-PW-124",
  category: "QA-PW",
  title: "No smoke/regression project split",
  severity: "info",
  confidence: "high",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  configRule: true,
  configFiles: ["^playwright\\.config\\.(?:ts|js|mjs|cts)$"],
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "runner-semantic",
    detail:
      "project split is a runner config concept (projects array " +
      "arrangement); the detector reads playwright.config.* keys " +
      "(adapter-gated), whose object-literal shape is exact-match text",
  },
  detectionNotes: "regex heuristic over playwright.config.* (adapter-gated)",
  introduced: "0.3.0",

  // Unmeasured (no verdicts at all — needs full sampling). The detectorRevision
  // 2 bump is metadata-declaration only; no measurement is invalidated.

  detectorRevision: 2,

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const base = ctx.path.split("/").pop() as string;
    if (!/^playwright\.config\.(?:ts|js|mjs|cts)$/.test(base)) return findings;

    const hasProjectsMatch = /projects\s*:\s*\[/.exec(text);
    const hasProjects = hasProjectsMatch !== null;
    if (!hasProjects) return findings;

    // The capture group always participates.
    const names = [...text.matchAll(/name\s*:\s*['"]([^'"]+)['"]/g)].map((m) =>
      (m[1] as string).toLowerCase(),
    );
    const hasSmoke = names.some(
      (n) => n.includes("smoke") || n.includes("critical"),
    );
    const hasRegression = names.some(
      (n) =>
        n.includes("regression") || n.includes("full") || n.includes("all"),
    );
    if (hasProjects && !(hasSmoke && hasRegression)) {
      findings.push({
        severity: "info",
        confidence: "high",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, hasProjectsMatch.index),
        column: 1,
        message: "Projects defined without a smoke/regression split.",
        why: "Without a fast smoke project, every commit runs the whole suite — PR feedback slows down and people start skipping CI.",
        fix: "Add a `smoke` project (testIgnore filter on critical paths) alongside the full regression project.",
      });
    }
    return findings;
  },
});
