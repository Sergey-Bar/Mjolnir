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
  // Build output, never source.
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
