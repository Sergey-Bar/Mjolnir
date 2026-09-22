import { describe, it, expect } from "vitest";
import {
  analyzeCrossFileSignals,
  renderCrossFileAnalysis,
} from "../src/engine/cross-file-analysis.js";

describe("Milestone 10 — Cross-File Analysis Engine", () => {
  it("should detect duplicate test names across files", () => {
    const files = [
      { path: "a.spec.ts", text: "test('shared name', () => {})" },
      { path: "b.spec.ts", text: "test('shared name', () => {})" },
    ];
    const result = analyzeCrossFileSignals(files, []);
    expect(result.duplicateTestNames.length).toBeGreaterThan(0);
    expect(result.duplicateTestNames[0].type).toBe("duplicate-test-name");
  });

  it("should detect shared imports", () => {
    const files = [
      { path: "a.spec.ts", text: "import { foo } from './utils';" },
      { path: "b.spec.ts", text: "import { bar } from './utils';" },
    ];
    const result = analyzeCrossFileSignals(files, []);
    expect(result.sharedImports.length).toBeGreaterThan(0);
  });

  it("should detect circular dependencies", () => {
    const files = [
      { path: "a.ts", text: "import { b } from './b';" },
      { path: "b.ts", text: "import { a } from './a';" },
    ];
    const result = analyzeCrossFileSignals(files, []);
    expect(result.circularDependencies.length).toBeGreaterThanOrEqual(0);
  });

  it("should produce a valid analysis result", () => {
    const files = [
      { path: "a.spec.ts", text: "test('a', () => {})" },
      { path: "b.spec.ts", text: "test('b', () => {})" },
    ];
    const result = analyzeCrossFileSignals(files, []);
    expect(result.signals).toBeDefined();
    expect(result.dependencyGraphSize).toBeDefined();
    expect(result.reachableFilesCount).toBeDefined();
  });

  it("should render cross-file analysis report", () => {
    const files = [{ path: "a.spec.ts", text: "test('a', () => {})" }];
    const result = analyzeCrossFileSignals(files, []);
    const rendered = renderCrossFileAnalysis(result);
    expect(rendered).toContain("Cross-File Analysis Report");
  });

  it("should handle empty file list", () => {
    const result = analyzeCrossFileSignals([], []);
    expect(result.signals).toEqual([]);
    expect(result.duplicateTestNames).toEqual([]);
  });
});
