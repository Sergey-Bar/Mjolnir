/**
 * ENGINE-002 — Finding Identity: deterministic fingerprints for
 * deduplication, correlation, and lifecycle tracking across scans.
 *
 * Locks: fingerprint stability (same inputs → same output),
 * position-sensitivity for code quality, cross-scan correlation,
 * and identity layer independence.
 */

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  findingFingerprint,
  codeQualityFingerprint,
  findingId,
  rootCauseId,
  deduplicationGroup,
} from "../../src/engine/finding-identity.js";
import type { Finding } from "../../src/types.js";

function finding(
  overrides: Partial<
    Pick<Finding, "ruleId" | "file" | "line" | "column" | "message">
  > = {},
): Pick<Finding, "ruleId" | "file" | "line" | "column" | "message"> {
  return {
    ruleId: "QA-TEST-001",
    file: "tests/shop.spec.ts",
    line: 42,
    column: 5,
    message: "expect() without assertion",
    ...overrides,
  };
}

describe("findingFingerprint", () => {
  it("produces ruleId\\0file\\0message", () => {
    const f = finding();
    expect(findingFingerprint(f)).toBe(
      "QA-TEST-001\u0000tests/shop.spec.ts\u0000expect() without assertion",
    );
  });

  it("is line-independent (same rule+file+message, different line)", () => {
    const a = finding({ line: 10 });
    const b = finding({ line: 99 });
    expect(findingFingerprint(a)).toBe(findingFingerprint(b));
  });

  it("is column-independent", () => {
    const a = finding({ column: 1 });
    const b = finding({ column: 999 });
    expect(findingFingerprint(a)).toBe(findingFingerprint(b));
  });

  it("changes when ruleId changes", () => {
    const a = finding({ ruleId: "QA-TEST-001" });
    const b = finding({ ruleId: "QA-TEST-002" });
    expect(findingFingerprint(a)).not.toBe(findingFingerprint(b));
  });

  it("changes when file changes", () => {
    const a = finding({ file: "a.spec.ts" });
    const b = finding({ file: "b.spec.ts" });
    expect(findingFingerprint(a)).not.toBe(findingFingerprint(b));
  });

  it("changes when message changes", () => {
    const a = finding({ message: "msg A" });
    const b = finding({ message: "msg B" });
    expect(findingFingerprint(a)).not.toBe(findingFingerprint(b));
  });

  it("is deterministic (same inputs always produce same output)", () => {
    const f = finding();
    const first = findingFingerprint(f);
    for (let i = 0; i < 100; i++) {
      expect(findingFingerprint(f)).toBe(first);
    }
  });
});

describe("codeQualityFingerprint", () => {
  it("is sha256 of ruleId\\0file\\0line\\0column\\0message", () => {
    const f = finding();
    const expected = createHash("sha256")
      .update(
        "QA-TEST-001\u0000tests/shop.spec.ts\u000042\u00005\u0000expect() without assertion",
      )
      .digest("hex");
    expect(codeQualityFingerprint(f)).toBe(expected);
  });

  it("is position-sensitive (differs by line)", () => {
    const a = finding({ line: 10 });
    const b = finding({ line: 20 });
    expect(codeQualityFingerprint(a)).not.toBe(codeQualityFingerprint(b));
  });

  it("is position-sensitive (differs by column)", () => {
    const a = finding({ column: 1 });
    const b = finding({ column: 5 });
    expect(codeQualityFingerprint(a)).not.toBe(codeQualityFingerprint(b));
  });

  it("produces a 64-char hex string", () => {
    const fp = codeQualityFingerprint(finding());
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("findingId", () => {
  it("includes fingerprint + line + column", () => {
    const f = finding({ line: 42, column: 5 });
    const expected = `${findingFingerprint(f)}\u000042\u00005`;
    expect(findingId(f)).toBe(expected);
  });

  it("differs for same finding at different lines", () => {
    const a = finding({ line: 10, column: 1 });
    const b = finding({ line: 20, column: 1 });
    expect(findingId(a)).not.toBe(findingId(b));
  });

  it("differs for same finding at different columns", () => {
    const a = finding({ line: 10, column: 1 });
    const b = finding({ line: 10, column: 5 });
    expect(findingId(a)).not.toBe(findingId(b));
  });
});

describe("rootCauseId", () => {
  it("equals findingFingerprint", () => {
    const f = finding();
    expect(rootCauseId(f)).toBe(findingFingerprint(f));
  });

  it("is line-independent", () => {
    const a = finding({ line: 1 });
    const b = finding({ line: 999 });
    expect(rootCauseId(a)).toBe(rootCauseId(b));
  });
});

describe("deduplicationGroup", () => {
  it("equals rootCauseId", () => {
    const f = finding();
    expect(deduplicationGroup(f)).toBe(rootCauseId(f));
  });

  it("equals findingFingerprint", () => {
    const f = finding();
    expect(deduplicationGroup(f)).toBe(findingFingerprint(f));
  });
});
