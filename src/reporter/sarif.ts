/**
 * SARIF 2.1.0 reporter (Phase 0.5).
 * Transforms scan findings into SARIF so results appear natively in
 * GitHub Code Scanning — free distribution inside existing governance.
 *
 * Usage: qa-doctor --format sarif > qa-doctor.sarif
 */

import type { Finding, ScanResult } from '../types.js';

/** Map our rule categories to SARIF taxonomies/properties. */
function sarifLevel(severity: Finding['severity']): 'error' | 'warning' | 'note' {
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'note';
}

export function renderSarif(result: ScanResult, repoRootUri?: string): string {
  const rules = new Map<string, { id: string; short: string; helpUri?: string }>();
  for (const f of result.findings) {
    if (!rules.has(f.ruleId)) {
      rules.set(f.ruleId, {
        id: f.ruleId,
        short: f.message.slice(0, 80),
        ...(f.docsUrl ? { helpUri: f.docsUrl } : {}),
      });
    }
  }

  const run = {
    tool: {
      driver: {
        name: 'QA Doctor',
        informationUri: 'https://github.com/Sergey-Bar/QA-Dodctor',
        version: '0.2.0',
        rules: [...rules.values()].map((r) => ({
          id: r.id,
          shortDescription: { text: r.short },
          ...(r.helpUri ? { helpUri: r.helpUri } : {}),
        })),
      },
    },
    invocations: [
      {
        executionSuccessful: true,
        ...(result.partial ? { partiallySuccessfulReason: 'Analysis budget expired or files skipped' } : {}),
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
              uri: f.file,
              ...(repoRootUri ? { uriBaseId: 'SRCROOT' } : {}),
            },
            region: { startLine: Math.max(1, f.line), startColumn: Math.max(1, f.column) },
          },
        },
      ],
      properties: {
        severity: f.severity,
        confidence: f.confidence,
        qaImpact: f.qaImpact,
      },
    })),
  };

  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      repoRootUri ? { ...run, originalUriBaseIds: { SRCROOT: { uri: repoRootUri } } } : run,
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
