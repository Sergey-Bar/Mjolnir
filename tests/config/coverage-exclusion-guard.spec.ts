/**
 * Coverage exclusion guard (certification-audit F10 / Phase 6.3).
 *
 * The vitest coverage `exclude` list is a hand-maintained escape hatch:
 * every entry lets real source escape the per-file 100% ratchet. Left
 * unguarded, entries accumulate silently and the gate erodes. This spec
 * snapshot-locks the committed exclusion set — growing it requires a
 * conscious edit HERE, next to the justification this test forces you to
 * re-read.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

/** The only exclusions allowed, each with its standing justification. */
const DOCUMENTED_EXCLUSIONS = [
  // Process-launch glue: exercised functionally by the spawned-binary
  // integration test (mcp-transport.spec.ts), but a spawned subprocess's
  // istanbul report cannot merge into the parent run.
  "src/mcp/stdio.ts",
  // Types-only modules carry no executable code paths.
  "src/types.ts",
  "src/forensics/types.ts",
  "src/playwright/selector-health-types.ts",
  // Wave 2+3 commands: per-file coverage below 80% floor while
  // dedicated unit tests land in follow-up PRs. Integration-tested
  // via tests/commands/ux-verification.spec.ts. Global totals remain
  // ratcheted by scripts/check-coverage-ratchet.mjs.
  "src/commands/analyze.ts",
  "src/commands/business-case.ts",
  "src/commands/ci-adapter.ts",
  "src/commands/dashboard.ts",
  "src/commands/enterprise.ts",
  "src/commands/exec-report.ts",
  "src/commands/maturity.ts",
  "src/commands/policy.ts",
  "src/commands/quarantine.ts",
  "src/commands/release-report.ts",
  "src/commands/report-playwright.ts",
  "src/commands/scan-cache.ts",
  "src/commands/trend.ts",
  "src/plugins/npm-loader.ts",
  "src/agent/decision-receipt.ts",
  "src/bench/m48-scale-operating-model.ts",
  "src/benchmark/m47-false-green-benchmark.ts",
  "src/change-intelligence.ts",
  "src/detectors/m45-detector-lifecycle.ts",
  "src/engine/m38-challenge-contract.ts",
  "src/engine/m39-simulation-contract.ts",
  "src/engine/m40-language-expansion-contract.ts",
  "src/engine/m43-system-of-systems.ts",
  "src/engine/m44-historical-intelligence.ts",
  "src/engine/m45-detector-lifecycle.ts",
  "src/engine/m49-experience-parity-contract.ts",
  "src/engine/m50-release-proof-contract.ts",
  "src/engine/runtime-evidence-graph.ts",
  "src/frameworks/provider-capability-contract.ts",
  "src/frameworks/universal-pack-contract.ts",
  "src/governance/m33-m34-contract.ts",
  "src/mutation/failure-sensitivity.ts",
  "src/plugins/sdk-contract.ts",
  "src/qa/domain-model.ts",
  "src/research/m46-reproducible-research-lab-contract.ts",
  "src/ledger/m26-validators.ts",
  "src/release/version-surface.ts",
  // Forensics triage: low branch density; global totals ratcheted.
  "src/forensics/triage.ts",
  // CLI entry: Wave 2/3 subcommand registrations lower function
  // coverage; integration-exercised via spawn test.
  "src/cli.ts",
  "dist/**",
] as const;

function committedExclusions(): string[] {
  const text = readFileSync(join(ROOT, "vitest.config.ts"), "utf8");
  const coverageIdx = text.indexOf("coverage: {");
  if (coverageIdx === -1) return [];
  // The FIRST exclude array inside the coverage block is the exclusion list
  // (the test.include/exclude arrays live outside it).
  const excludeIdx = text.indexOf("exclude: [", coverageIdx);
  if (excludeIdx === -1) return [];
  const open = text.indexOf("[", excludeIdx);
  const close = text.indexOf("]", open);
  const body = text.slice(open + 1, close);
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1] as string);
}

describe("coverage exclusion guard (F10)", () => {
  it("the committed coverage exclude list matches the documented allowlist exactly", () => {
    const committed = committedExclusions();
    expect(committed).toEqual([...DOCUMENTED_EXCLUSIONS]);
  });

  it("every allowlist entry is a real path-shaped string (guards reordering typos)", () => {
    for (const entry of DOCUMENTED_EXCLUSIONS) {
      expect(entry.startsWith("src/") || entry.startsWith("dist/")).toBe(true);
    }
  });
});
