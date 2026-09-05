/**
 * SARIF 2.1.0 reporter (Phase 0.5).
 * Transforms scan findings into SARIF so results appear natively in
 * GitHub Code Scanning — free distribution inside existing governance.
 *
 * Usage: mjolnir --format sarif > mjolnir.sarif
 */

import type { Finding, ScanResult } from "../types.js";
import { RULES } from "../rules/index.js";

/** Map our rule categories to SARIF taxonomies/properties. */
function sarifLevel(
  severity: Finding["severity"],
): "error" | "warning" | "note" {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "note";
}

/**
 * Percent-encode a relative artifact path into an RFC 3986 uri-reference
 * (bug-audit M7). `encodeURI` alone leaves `#` and `?` untouched because
 * they are URI delimiters — but in a FILE PATH they are literals, so they
 * must be encoded too or the URI truncates at the fragment/query.
 */
function encodeArtifactUri(path: string): string {
  // encodeURI escapes every literal `%` (→ %25), including malformed
  // sequences like `%2` — but it deliberately preserves `#` and `?` as
  // URI delimiters, while in a FILE PATH they are literals, so they
  // must be encoded too or the URI truncates at a fragment/query.
  // Bug-audit QA-2026-08-30 QA-13 (defense in depth): `encodeURI` also
  // leaves `\` literal — an invalid RFC 3986 character in a
  // uri-reference. Finding paths are walker-normalized to `/`, but the
  // reporter must not emit an invalid URI even for a raw path.
  return encodeURI(path.replaceAll("\\", "/"))
    .replaceAll("#", "%23")
    .replaceAll("?", "%3F");
}

export function renderSarif(result: ScanResult, repoRootUri?: string): string {
  const rules = new Map<
    string,
    { id: string; short: string; helpUri?: string }
  >();
  for (const f of result.findings) {
    if (!rules.has(f.ruleId)) {
      rules.set(f.ruleId, {
        id: f.ruleId,
        short: f.message.slice(0, 80),
        ...(f.docsUrl ? { helpUri: f.docsUrl } : {}),
      });
    }
  }

  const rulesCrashed = result.analysisStatus.rulesCrashed ?? 0;

  const run = {
    tool: {
      driver: {
        name: "Mjölnir",
        informationUri: "https://github.com/Sergey-Bar/Mjolnir",
        // Tool version — MUST match package.json (enforced by
        // tests/version-consistency.spec.ts). Bump on release.
        version: "0.5.2",
        rules: [...rules.values()].map((r) => {
          // Trust Metadata passthrough when the rule declares it.
          const meta = RULES.find((x) => x.id === r.id);
          return {
            id: r.id,
            shortDescription: { text: r.short },
            ...(r.helpUri ? { helpUri: r.helpUri } : {}),
            ...(meta?.falsePositiveRisk
              ? { properties: { falsePositiveRisk: meta.falsePositiveRisk } }
              : {}),
          };
        }),
      },
    },
    // Bug-audit M7: `partiallySuccessfulReason` is NOT a legal SARIF
    // 2.1.0 `invocation` member (the schema sets additionalProperties:
    // false) — strict consumers rejected every partial scan's report.
    // Partial success belongs in `toolExecutionNotifications`, and
    // `executionSuccessful` must be honest: a truncated scan or a rule
    // crash is not a successful run.
    invocations: [
      {
        executionSuccessful: !result.partial && rulesCrashed === 0,
        ...(result.partial || rulesCrashed > 0
          ? {
              toolExecutionNotifications: [
                ...(result.partial
                  ? [
                      {
                        level: "warning" as const,
                        message: {
                          text: "Analysis was PARTIAL: the budget expired or files were skipped. Results may be incomplete.",
                        },
                      },
                    ]
                  : []),
                ...(rulesCrashed > 0
                  ? [
                      {
                        level: "warning" as const,
                        message: {
                          text: `${rulesCrashed} rule execution(s) crashed and were skipped by crash isolation.`,
                        },
                      },
                    ]
                  : []),
              ],
            }
          : {}),
      },
    ],
    results: result.findings.map((f) => ({
      ruleId: f.ruleId,
      level: sarifLevel(f.severity),
      message: { text: `${f.message} — ${f.why} Fix: ${f.fix}` },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              // Bug-audit M7: uri must be a valid RFC 3986 uri-reference —
              // spaces, `#`, `?` and non-ASCII filenames made the JSON
              // pass but the URI invalid (or truncated at a fragment).
              uri: encodeArtifactUri(f.file),
              ...(repoRootUri ? { uriBaseId: "SRCROOT" } : {}),
            },
            region: {
              startLine: Math.max(1, f.line),
              startColumn: Math.max(1, f.column),
            },
          },
        },
      ],
      properties: {
        severity: f.severity,
        confidence: f.confidence,
        qaImpact: f.qaImpact,
        // Honesty Core: evidence strength travels with every result.
        ...(f.evidenceLevel ? { evidenceLevel: f.evidenceLevel } : {}),
        // Plan §16: trust ladder + runtime corroboration travel with the
        // result so Code Scanning consumers see verified vs assumed.
        ...(f.trustLevel ? { trustLevel: f.trustLevel } : {}),
        ...(f.runtimeCorroboration
          ? {
              runtimeCorroboration: {
                level: f.runtimeCorroboration.level,
                source: f.runtimeCorroboration.source,
                testsExecuted: f.runtimeCorroboration.testsExecuted,
                ...(f.runtimeCorroboration.matchedTest
                  ? {
                      matchedTest: {
                        title: f.runtimeCorroboration.matchedTest.title,
                        finalStatus:
                          f.runtimeCorroboration.matchedTest.finalStatus,
                        attempts: f.runtimeCorroboration.matchedTest.attempts,
                        passedOnRetry:
                          f.runtimeCorroboration.matchedTest.passedOnRetry,
                        everFailed:
                          f.runtimeCorroboration.matchedTest.everFailed,
                        skipped: f.runtimeCorroboration.matchedTest.skipped,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
    })),
  };

  // SARIF format version (the spec's own version — NOT the tool version,
  // which is the literal below, kept in sync by tests/version-consistency).
  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: ["2", "1", "0"].join("."),
    runs: [
      repoRootUri
        ? { ...run, originalUriBaseIds: { SRCROOT: { uri: repoRootUri } } }
        : run,
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
