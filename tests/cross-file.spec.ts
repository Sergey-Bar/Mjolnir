/**
 * Cross-file analysis tests (Upgrade-Plan-v3 Phase 6, tier-3 item #2).
 */

import { describe, expect, it } from "vitest";

import {
  collectTestNames,
  findDuplicateTestNames,
} from "../src/engine/cross-file.js";

describe("collectTestNames", () => {
  it("extracts JS/TS test names", () => {
    const text = `
      test("logs in", async ({ page }) => {});
      it("signs out", async () => {});
      describe("x", () => { test("nested", () => {}); });
    `;
    expect(collectTestNames("a.spec.ts", text)).toEqual([
      "logs in",
      "signs out",
      "nested",
    ]);
  });

  it("extracts Python test function names", () => {
    const text =
      "def test_login(page):\n    pass\n\ndef test_other():\n    pass\n";
    expect(collectTestNames("test_auth.py", text)).toEqual([
      "test_login",
      "test_other",
    ]);
  });

  it("ignores non-test files", () => {
    expect(collectTestNames("src/util.ts", `test("x", () => {});`)).toEqual([]);
  });
});

describe("findDuplicateTestNames", () => {
  it("finds names declared in multiple files", () => {
    const files = [
      { path: "a.spec.ts", text: `test("dup", () => {});` },
      { path: "b.spec.ts", text: `test("dup", () => {});` },
      { path: "c.spec.ts", text: `test("unique", () => {});` },
    ];
    const dups = findDuplicateTestNames(files);
    expect(dups).toHaveLength(1);
    expect(dups[0]?.name).toBe("dup");
    expect(dups[0]?.files).toEqual(["a.spec.ts", "b.spec.ts"]);
  });

  it("does not flag a name repeated within one file", () => {
    const files = [
      {
        path: "a.spec.ts",
        text: `test("dup", () => {});\ntest("dup", () => {});`,
      },
    ];
    expect(findDuplicateTestNames(files)).toHaveLength(0);
  });

  it("cross-language duplicates count (py + ts)", () => {
    const files = [
      { path: "test_x.py", text: "def test_dup():\n    pass\n" },
      { path: "y.spec.ts", text: `test("test_dup", () => {});` },
    ];
    const dups = findDuplicateTestNames(files);
    expect(dups).toHaveLength(1);
    expect(dups[0]?.files).toEqual(["test_x.py", "y.spec.ts"]);
  });
});
