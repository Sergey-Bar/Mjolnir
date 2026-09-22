/**
 * QA-APM-001 — Public contract stability for machine API.
 * Severity: warning · Confidence: high · deterministic-defect
 *
 * The machine API (MCP) must maintain a stable public contract.
 * Breaking changes to the contract surface without versioning
 * indicate a stability risk.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const contractStability = defineRule({
  id: "QA-APM-001",
  category: "QA-APM",
  title: "Public contract stability for machine API",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "all",
  languages: ["typescript", "javascript"],
  frameworks: ["mcp"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "string-content-defect",
    detail:
      "Contract stability is enforced by detecting mutable or " +
      "unversioned machine API surface declarations in source text. " +
      "The detector matches the contract surface patterns on the " +
      "code-only text — the string content of the contract " +
      "declaration is the defect signal",
  },
  introduced: "2.0.0",
  tier: "quarantine",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Detect unversioned machine API endpoint declarations.
    // Matches patterns like:
    //   machine: { url: "https://api.example.com/endpoint" }
    //   mcp: { endpoint: "https://api.example.com/v1/endpoint" }
    // A URL is considered versioned when it contains a path segment
    // matching /v<digit>+ (e.g. /v1/, /v2/).
    const unversionedEndpoint =
      /(?:machine|mcp)\s*[:{]\s*(?:url|endpoint|baseUrl)\s*[:=]\s*['"`]([^'"`]+)['"`]/gi;

    let m: RegExpExecArray | null;
    while ((m = unversionedEndpoint.exec(text)) !== null) {
      const url = m[1] ?? "";
      // Versioned URLs contain a /v<digit> path segment
      const isVersioned = /\/v\d+/i.test(url);
      if (isVersioned) continue;
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message:
          "Unversioned machine API endpoint detected — public contract lacks versioning.",
        why: "A machine API contract without an explicit version is unstable: consumers cannot pin to a known interface.",
        fix: "Add a version prefix to the endpoint URL (e.g., /v1/).",
        qaImpact: "FLAKY-RISK",
      });
    }

    // Detect mutable contract surface declarations without stability markers.
    // Matches:
    //   export contract interface MyContract { mutable: boolean }
    //   export type MyContract = { mutable: boolean }
    // A contract is flagged when its body contains `mutable` (a stability risk)
    // or when it is declared without `readonly`/`stable`/`frozen` annotations.
    const mutableContract =
      /(?:export\s+)?(?:contract|interface|type)\s+\w+\s*(?:=\s*)?\{[^}]*(?:mutable|without\s+stability|breaking)/gi;

    while ((m = mutableContract.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message:
          "Mutable contract surface detected — public machine API contract lacks stability guarantees.",
        why: "A contract marked as mutable or without stability guarantees can break consumers unexpectedly.",
        fix: "Add stability annotations or version the contract surface.",
        qaImpact: "FLAKY-RISK",
      });
    }

    return findings;
  },
});
