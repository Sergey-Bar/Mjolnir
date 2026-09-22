/**
 * QA-CI-015 — Workflow missing explicit permissions (enterprise governance).
 * Severity: warning · Confidence: high · heuristic-risk
 *
 * GitHub Actions workflows that omit the top-level `permissions` key
 * run with broad default token scopes (write-all). Enterprise
 * governance requires explicit, least-privilege permission
 * declarations so that a compromised step cannot exceed its
 * authorized surface.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

interface WorkflowDoc {
  jobs?: Record<string, unknown>;
}

export const missingPermissions = defineRule({
  id: "QA-CI-015",
  category: "QA-CI",
  title: "Workflow missing explicit permissions",
  severity: "warning",
  confidence: "high",
  findingType: "heuristic-risk",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "FRAMEWORK",
  detectionNotes:
    "regex heuristic on parsed workflow YAML for top-level permissions key",
  introduced: "2.0.0",
  tier: "quarantine",
  detectorRevision: 1,
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc || typeof doc !== "object") return findings;

    // The parsed workflow doc only carries `jobs`; the top-level
    // `permissions` key is stripped by the safe parser. Check the
    // raw text for the presence of a `permissions:` key at the
    // top level (not indented under jobs/steps).
    const permissionsRe = /^\s*permissions\s*:/m;
    if (!permissionsRe.test(ctx.text)) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "heuristic-risk",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: 1,
        column: 1,
        message: `Workflow \`${ctx.path}\` is missing an explicit top-level \`permissions\` key.`,
        why: "Without explicit permissions, GitHub Actions grants the workflow token broad default scopes, increasing the blast radius of a compromised step.",
        fix: "Add a top-level `permissions` key with least-privilege scopes, e.g. `permissions: contents: read`.",
      });
    }

    return findings;
  },
});
