/**
 * False-Green corpus index drift-lock (plan §6 + §12 — generated index,
 * drift-locked). The committed index must equal a fresh render from the
 * case registry; every wired case must carry ALL SEVEN owner-required
 * declarations; every wired case must carry mutation coverage; the plan's
 * seven hostile classes must all be present; and the UNSURFACED rows must
 * name their shipping increment.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FALSE_GREEN_CASES } from "../../tests/false-green/cases.js";
import { renderIndex } from "../../scripts/generate-false-green-index.js";

const ROOT = join(import.meta.dirname, "..", "..");
const INDEX_PATH = join(ROOT, "tests", "false-green", "index.generated.ts");
const COMMITTED = readFileSync(INDEX_PATH, "utf8");
const LIVE = renderIndex();

const SEVEN_FIELDS = [
  "input:",
  "expected execution:",
  "expected evidence:",
  "expected verdict:",
  "expected exit code:",
  "release impact:",
] as const;

const PLAN_CLASSES = [
  "execution-failures",
  "parser-failures",
  "adapter-failures",
  "evidence-failures",
  "rule-failures",
  "mcp-failures",
  "agent-failures",
] as const;

describe("tests/false-green/index.generated.ts matches the case registry", () => {
  it("equals a fresh render (regenerate if this fails)", () => {
    expect(COMMITTED).toBe(LIVE);
  });

  it("every wired case carries all seven owner-required declarations", () => {
    for (const c of FALSE_GREEN_CASES.filter((x) => x.wired)) {
      const start = COMMITTED.indexOf(`// ${c.id} —`);
      expect(start, `${c.id} block missing from the index`).toBeGreaterThan(-1);
      // The block ends at the next case header, class separator, or the
      // footer — whichever comes first.
      const ends = ["\n// fg-", "\n// ──", "\n// Wired cases:"]
        .map((marker) => COMMITTED.indexOf(marker, start + 1))
        .filter((i) => i > start);
      const end = ends.length === 0 ? COMMITTED.length : Math.min(...ends);
      const body = COMMITTED.slice(start, end);
      for (const field of SEVEN_FIELDS) {
        expect(
          body.includes(field),
          `${c.id} lacks the required declaration "${field}" (plan §6)`,
        ).toBe(true);
      }
      // Report-field bindings are part of the declaration (plan: EXPECTED
      // REPORT FIELDS) — at least one specific binding per wired case.
      expect(
        /report field: /.test(body),
        `${c.id} has no report-field binding — assertions must bind to specific fields`,
      ).toBe(true);
    }
  });

  it("every wired case carries mutation coverage (unexecuted assertions count as no protection)", () => {
    for (const c of FALSE_GREEN_CASES.filter((x) => x.wired)) {
      expect(
        c.mutations.length,
        `${c.id} has no mutation fixture — the plan requires the mutation/assertion-strength protocol per wired case`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("all seven hostile classes of the plan's minimum matrix are present", () => {
    const present = new Set(FALSE_GREEN_CASES.map((c) => c.className));
    for (const cls of PLAN_CLASSES) {
      expect(
        present.has(cls),
        `the plan's class "${cls}" has no corpus cases`,
      ).toBe(true);
    }
  });

  it("UNSURFACED rows name their shipping increment (recorded, never dropped)", () => {
    for (const c of FALSE_GREEN_CASES.filter((x) => !x.wired)) {
      expect(
        c.shippedIn,
        `${c.id} is unwired but names no shipping increment`,
      ).toBeDefined();
      expect(
        COMMITTED.includes(`UNSURFACED (ships in ${c.shippedIn})`),
        `${c.id} UNSURFACED row missing from the index`,
      ).toBe(true);
    }
  });
});
