import { describe, expect, it } from "vitest";
import {
  asUniversal,
  legacyAppliesTo,
} from "../../../src/engine/rule-runner.js";

// `runRulesForFile` was deleted (audit M-7 — an unused parallel copy of
// the dispatch loop that each adapter's runRules already owns). The two
// exports that survive are the registry's only bridge from the legacy
// QADoctorRule shape to UniversalRule, so they stay covered here.

describe("legacyAppliesTo", () => {
  it("maps legacy scopes to adapter ids", () => {
    // "test-files" is TS/JS only — every such rule declares
    // languages: ["typescript", "javascript"] and detects JS syntax.
    // Cross-language coverage is the QA-PY / QA-JV / QA-CS families'.
    expect(legacyAppliesTo("test-files")).toEqual(["typescript"]);
    expect(legacyAppliesTo("ci-workflows")).toEqual(["github-actions"]);
    expect(legacyAppliesTo("typescript")).toEqual(["typescript"]);
  });

  it("passes an unknown scope through unchanged", () => {
    expect(legacyAppliesTo("python")).toEqual(["python"]);
    expect(legacyAppliesTo("rust")).toEqual(["rust"]);
  });

  it("keeps 'test-files' rules off non-JS test files (regression: QA-TEST-004 on .py/.java)", () => {
    // The typescript adapter id is the only one a 'test-files' rule maps
    // to, so python/java/csharp adapters skip it in their
    // `if (!rule.appliesTo.includes(this.id)) continue` guard.
    for (const id of ["python", "java", "csharp", "github-actions"]) {
      expect(legacyAppliesTo("test-files")).not.toContain(id);
    }
  });
});

describe("asUniversal", () => {
  it("wraps a legacy rule preserving id/category and mapping scope", () => {
    const wrapped = asUniversal({
      id: "QA-X-001",
      category: "test",
      appliesTo: "test-files",
      run: () => [{ line: 1, severity: "error", message: "m" }],
    });
    expect(wrapped.legacy).toBe(true);
    expect(wrapped.id).toBe("QA-X-001");
    expect(wrapped.category).toBe("test");
    expect(wrapped.appliesTo).toEqual(["typescript"]);
    expect(wrapped.run({ path: "a.test.ts", text: "" })).toHaveLength(1);
  });

  it("forwards the file through to the wrapped rule verbatim", () => {
    const seen: Array<{ path: string; text: string }> = [];
    const wrapped = asUniversal({
      id: "QA-Y-001",
      category: "quality",
      appliesTo: "typescript",
      run: (file) => {
        seen.push({ path: file.path, text: file.text });
        return [{ line: 3, severity: "warning", message: "hi" }];
      },
    });
    const out = wrapped.run({ path: "a.ts", text: "const x = 1;" });
    expect(seen).toEqual([{ path: "a.ts", text: "const x = 1;" }]);
    expect(out[0]?.line).toBe(3);
  });
});
