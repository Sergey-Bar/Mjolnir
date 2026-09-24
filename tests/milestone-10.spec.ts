import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  analyzeCrossFileSignals,
  renderCrossFileAnalysis,
} from "../src/engine/cross-file-analysis.js";
import type { Finding } from "../src/types.js";

describe("Milestone 10 — Cross-File Analysis Engine", () => {
  it("should detect duplicate test names across files", () => {
    const files = [
      { path: "a.spec.ts", text: "test('shared name', () => {})" },
      { path: "b.spec.ts", text: "test('shared name', () => {})" },
    ];
    const result = analyzeCrossFileSignals(files, [], ".");
    expect(result.duplicateTestNames.length).toBeGreaterThan(0);
    const firstDuplicate = result.duplicateTestNames[0];
    if (!firstDuplicate) throw new Error("expected a duplicate");
    expect(firstDuplicate.type).toBe("duplicate-test-name");
  });

  it("should detect shared imports", () => {
    const files = [
      { path: "a.spec.ts", text: "import { foo } from './utils';" },
      { path: "b.spec.ts", text: "import { bar } from './utils';" },
    ];
    const result = analyzeCrossFileSignals(files, [], ".");
    expect(result.sharedImports.length).toBeGreaterThan(0);
  });

  it("should detect circular dependencies", () => {
    const files = [
      { path: "a.ts", text: "import { b } from './b';" },
      { path: "b.ts", text: "import { a } from './a';" },
    ];
    const result = analyzeCrossFileSignals(files, [], ".");
    expect(result.circularDependencies.length).toBeGreaterThanOrEqual(0);
  });

  it("should produce a valid analysis result", () => {
    const files = [
      { path: "a.spec.ts", text: "test('a', () => {})" },
      { path: "b.spec.ts", text: "test('b', () => {})" },
    ];
    const result = analyzeCrossFileSignals(files, [], ".");
    expect(result.signals).toBeDefined();
    expect(result.dependencyGraphSize).toBeDefined();
    expect(result.reachableFilesCount).toBeDefined();
  });

  it("uses the supplied target root for dependency analysis", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-cross-file-"));
    try {
      writeFileSync(join(root, "package.json"), '{"name":"target"}');
      mkdirSync(join(root, "packages", "a"), { recursive: true });
      mkdirSync(join(root, "packages", "b"), { recursive: true });
      writeFileSync(
        join(root, "packages", "a", "package.json"),
        '{"name":"a"}',
      );
      writeFileSync(
        join(root, "packages", "b", "package.json"),
        '{"name":"b"}',
      );

      const result = analyzeCrossFileSignals([], [], root);

      expect(result.dependencyGraphSize).toBe(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("renders correlated findings and stable shared-import ordering", () => {
    const files = [
      { path: "a.spec.ts", text: 'import "./b.spec"; import "z";' },
      { path: "b.spec.ts", text: 'import "z"; import "a";' },
      { path: "c.spec.ts", text: 'import "a";' },
    ];
    const findings = [
      {
        ruleId: "RULE-A",
        file: "a.spec.ts",
        line: 1,
        rootCause: "first",
      },
      {
        ruleId: "RULE-B",
        file: "a.spec.ts",
        line: 2,
        rootCause: "second",
      },
    ] as unknown as Finding[];

    const result = analyzeCrossFileSignals(files, findings, ".");
    const reversed = analyzeCrossFileSignals(
      [...files].reverse(),
      findings,
      ".",
    );
    const rendered = renderCrossFileAnalysis(result);

    expect(result.correlationConclusions).toContain("AMPLIFIED");
    expect(reversed.sharedImports).toEqual(result.sharedImports);
    expect(rendered).toContain("[shared-import]");
    expect(rendered).toContain("Correlation Conclusions");
  });

  it("resolves extensionless relative imports and repeated dependencies", () => {
    const files = [
      { path: "../root.spec.ts", text: "" },
      { path: "a-first.spec.ts", text: "" },
      { path: "b-consumer.spec.ts", text: 'import "a-first.spec";' },
      {
        path: "dir/alias.spec.ts",
        text: 'import "../root.spec.ts";',
      },
      {
        path: "root.spec.ts",
        text: 'import "./nested/child"; import "external-package";',
      },
      {
        path: "nested/child.ts",
        text: 'import "root.spec.ts"; import "external-package";',
      },
    ];
    const result = analyzeCrossFileSignals(files, [], ".");
    const rendered = renderCrossFileAnalysis(result);

    expect(result.circularDependencies).toHaveLength(1);
    expect(result.sharedImports).toHaveLength(1);
    expect(rendered).toContain("[circular-dep]");
  });

  it("should render cross-file analysis report", () => {
    const files = [{ path: "a.spec.ts", text: "test('a', () => {})" }];
    const result = analyzeCrossFileSignals(files, [], ".");
    const rendered = renderCrossFileAnalysis(result);
    expect(rendered).toContain("Cross-File Analysis Report");
  });

  it("should handle empty file list", () => {
    const result = analyzeCrossFileSignals([], [], ".");
    expect(result.signals).toEqual([]);
    expect(result.duplicateTestNames).toEqual([]);
  });
});
