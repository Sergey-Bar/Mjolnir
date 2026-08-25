import { describe, expect, it } from "vitest";
import {
  asUniversal,
  legacyAppliesTo,
  runRulesForFile,
} from "../src/engine/rule-runner.js";
import type { Finding } from "../src/types.js";

const finding = () => ({
  line: 1,
  severity: "error" as const,
  message: "m",
});

describe("legacyAppliesTo", () => {
  it("maps legacy scopes to adapter ids", () => {
    expect(legacyAppliesTo("test-files")).toEqual(["typescript", "python"]);
    expect(legacyAppliesTo("ci-workflows")).toEqual(["github-actions"]);
    expect(legacyAppliesTo("typescript")).toEqual(["typescript"]);
  });
});

describe("asUniversal", () => {
  it("wraps a legacy rule preserving id/category and mapping scope", () => {
    const wrapped = asUniversal({
      id: "QA-X-001",
      category: "test",
      appliesTo: "test-files",
      run: () => [finding()],
    });
    expect(wrapped.legacy).toBe(true);
    expect(wrapped.id).toBe("QA-X-001");
    expect(wrapped.appliesTo).toEqual(["typescript", "python"]);
    expect(wrapped.run({ path: "a.test.ts", text: "" })).toHaveLength(1);
  });
});

describe("runRulesForFile", () => {
  it("collects findings only from applicable rules", () => {
    const adapter = { id: "typescript" };
    const rules = [
      {
        id: "A",
        appliesTo: ["typescript"],
        run: () => [finding(), finding()],
      },
      {
        id: "B",
        appliesTo: ["python"],
        run: () => [finding()],
      },
    ];
    // Cast keeps the test focused on dispatch logic, not full typing.
    const out = runRulesForFile(adapter as never, rules as never, {
      path: "a.ts",
      text: "",
    });
    expect(out).toHaveLength(2);
  });

  it("isolates crashing rules without killing the scan", () => {
    const adapter = { id: "typescript" };
    const rules = [
      {
        id: "BOOM",
        appliesTo: ["typescript"],
        run: () => {
          throw new Error("x");
        },
      },
      {
        id: "OK",
        appliesTo: ["typescript"],
        run: () => [finding()],
      },
    ];
    const out = runRulesForFile(adapter as never, rules as never, {
      path: "a.ts",
      text: "",
    });
    expect(out).toHaveLength(1);
  });

  it("returns empty for no applicable rules", () => {
    const out = runRulesForFile({ id: "rust" } as never, [], {
      path: "a.rs",
      text: "",
    });
    expect(out).toEqual([]);
  });

  it("result is assignable to Finding[] shape via asUniversal pipeline", () => {
    const rule = asUniversal({
      id: "QA-Y-001",
      category: "quality",
      appliesTo: "typescript",
      run: () => [{ line: 3, severity: "warning", message: "hi" }],
    });
    const out = runRulesForFile({ id: "typescript" } as never, [rule], {
      path: "a.ts",
      text: "",
    }) as Array<Omit<Finding, "ruleId" | "category">>;
    expect(out[0].line).toBe(3);
  });
});
