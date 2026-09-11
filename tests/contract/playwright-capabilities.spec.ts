/**
 * Playwright capability matrix drift-lock (plan §9 R7 / WI-20): the
 * committed doc equals a fresh render; the matrix is fail-closed
 * (every "yes" pointer resolves); zero UNCLASSIFIED cells; the agents
 * column is honestly "no" until R8.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CAPABILITY_MATRIX,
  DEPTH_COLUMNS,
  validateCapabilityMatrix,
} from "../../src/capabilities.js";
import {
  renderCapabilities,
  renderForCommit,
} from "../../scripts/generate-playwright-capabilities.js";

const ROOT = join(import.meta.dirname, "..", "..");
const DOC_PATH = join(ROOT, "docs", "PLAYWRIGHT-CAPABILITIES.md");
const COMMITTED = readFileSync(DOC_PATH, "utf8");
const LIVE = await renderForCommit();

describe("docs/PLAYWRIGHT-CAPABILITIES.md — the depth claim surface", () => {
  it("equals a fresh render (regenerate if this fails)", () => {
    expect(COMMITTED).toBe(LIVE);
  });

  it("is fail-closed: every yes pointer resolves against the repo", () => {
    const v = validateCapabilityMatrix(ROOT);
    expect(
      v.failures,
      `unresolved claims must never render:\n${v.failures.join("\n")}`,
    ).toEqual([]);
  });

  it("zero UNCLASSIFIED: all 12 capabilities × 8 columns are classed", () => {
    expect(CAPABILITY_MATRIX).toHaveLength(12);
    for (const row of CAPABILITY_MATRIX) {
      for (const col of DEPTH_COLUMNS) {
        expect(["yes", "no", "unsupported"]).toContain(row.cols[col].state);
      }
    }
  });

  it("the agents column is honestly no until R8 (stated, not implied)", () => {
    for (const row of CAPABILITY_MATRIX) {
      expect(row.cols.agents.state, row.capability).toBe("no");
      expect(row.cols.agents.note ?? "").toContain("R8");
    }
    expect(COMMITTED).toContain("uniformly **no** until R8");
  });

  it("claims never exceed proven capability: a root without the artifacts refuses to validate", () => {
    // The fail-closed law, proven against a root where the pointer
    // artifacts do not exist: validation reports failures instead of
    // letting a claim render.
    const brokenRoot = join(ROOT, "tests", "false-green");
    const v = validateCapabilityMatrix(brokenRoot);
    expect(v.ok).toBe(false);
    expect(v.failures.length).toBeGreaterThan(0);
    // And the renderer honors it: a fresh render against that root throws.
    expect(() => renderCapabilities(brokenRoot)).toThrowError(
      /unresolved claims/,
    );
  });
});
