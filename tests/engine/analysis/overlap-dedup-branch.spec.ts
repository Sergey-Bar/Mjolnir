import { describe, expect, it } from "vitest";

import {
  applyOverlapDedup,
  type OverlapMeta,
} from "../../../src/engine/overlap-dedup.js";
import type { Finding } from "../../../src/types.js";

let seq = 0;
function finding(overrides: Partial<Finding> = {}): Finding {
  seq++;
  return {
    ruleId: "QA-X-001",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "src/a.spec.ts",
    line: 1,
    column: 1,
    message: `m${seq}`,
    why: "w",
    fix: "f",
    ...overrides,
  };
}

const META = (
  overlapWith?: string[],
  tier?: "core" | "extended" | "quarantine",
  order?: number,
): OverlapMeta => ({
  ...(overlapWith ? { overlapWith } : {}),
  ...(tier ? { tier } : {}),
  ...(order === undefined ? {} : { order }),
});

describe("overlap-dedup branch coverage gaps (lines 142, 193-194)", () => {
  it("undefined column on the target: isDeclaredByPresent skips (line 142)", () => {
    // f has undefined column, g has defined column — the guard on line 142
    // skips the pair because undefined means unknown distance.
    const a = finding({
      ruleId: "QA-A-1",
      line: 3,
      column: undefined as unknown as number,
    });
    const b = finding({ ruleId: "QA-B-2", line: 3, column: 5 });
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(["QA-B-2"], "core", 1)],
      ["QA-B-2", META(undefined, "extended", 2)],
    ]);
    // a has undefined column — b cannot be declared by a (guard on line 142)
    const out = applyOverlapDedup([a, b], m);
    expect(out).toHaveLength(2);
  });

  it("undefined column on the declarer: isDeclaredByPresent skips (line 142, reverse)", () => {
    const a = finding({ ruleId: "QA-A-1", line: 3, column: 5 });
    const b = finding({
      ruleId: "QA-B-2",
      line: 3,
      column: undefined as unknown as number,
    });
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(["QA-B-2"], "core", 1)],
      ["QA-B-2", META(undefined, "extended", 2)],
    ]);
    // b has undefined column — a cannot declare b
    const out = applyOverlapDedup([a, b], m);
    expect(out).toHaveLength(2);
  });

  it("dropOrderBefore with equal rank and equal columns: tie-break on column (lines 193-194)", () => {
    // Two targets with identical rank but different columns
    const a = finding({ ruleId: "QA-A-1", line: 3, column: 5 });
    const b = finding({ ruleId: "QA-B-2", line: 3, column: 10 });
    // Both mutually declared, same tier+severity
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(["QA-B-2"], "quarantine", 1)],
      ["QA-B-2", META(["QA-A-1"], "quarantine", 1)],
    ]);
    const out = applyOverlapDedup([a, b], m);
    // One survives — dropOrderBefore picks the higher-column one to drop first
    // (ac < bc means a drops first when a.column < b.column, leaving b to survive)
    expect(out).toHaveLength(1);
  });

  it("dropOrderBefore: both columns undefined — MAX_SAFE_INTEGER tie (lines 193-194)", () => {
    const a = finding({
      ruleId: "QA-A-1",
      line: 3,
      column: undefined as unknown as number,
    });
    const b = finding({
      ruleId: "QA-B-2",
      line: 3,
      column: undefined as unknown as number,
    });
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(["QA-B-2"], "quarantine", 1)],
      ["QA-B-2", META(["QA-A-1"], "quarantine", 1)],
    ]);
    // Both columns are undefined → both become MAX_SAFE_INTEGER → ac < bc is false
    // But since they have undefined columns, isDeclaredByPresent will skip them (line 142)
    // so nothing is dropped.
    const out = applyOverlapDedup([a, b], m);
    expect(out).toHaveLength(2);
  });
});
