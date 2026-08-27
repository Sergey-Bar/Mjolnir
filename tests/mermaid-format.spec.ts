/**
 * `--format mermaid` (Master-Stabilization-Plan Sprint 9, Task 38).
 *
 * Validates the generated Mermaid source structurally against
 * Mermaid's own documented flowchart grammar (mermaid.js.org/syntax/
 * flowchart.html) — every node declaration, arrow, and class
 * assignment is checked for well-formedness. Mermaid itself is
 * fundamentally DOM/browser-dependent for rendering (confirmed via
 * research before choosing this approach — see the mermaid-js/mermaid
 * GitHub issue #1183, "such a heavy reliance on DOM APIs"), so a
 * headless Node validation step would require either a real browser or
 * a third-party wrapper package. Consistent with this project's own
 * SARIF verification (tests/contract-schema.spec.ts validates
 * structural conformance, not a live schema service), this file
 * checks structure directly rather than adding a rendering dependency
 * or calling an external validation service (which would also violate
 * the project's own zero-network-calls trust claim).
 */

import { describe, expect, it } from "vitest";
import { renderMermaid } from "../src/reporter/mermaid.js";
import type { Finding, ScanResult } from "../src/types.js";

function finding(overrides: Partial<Finding>): Finding {
  return {
    ruleId: "QA-PW-101",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    evidenceLevel: "E2",
    file: "e2e/a.spec.ts",
    line: 4,
    column: 3,
    message: "Hard sleep detected",
    why: "why",
    fix: "fix",
    ...overrides,
  };
}

function scanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 91,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [
      { category: "QA-PW", score: 91, errors: 0, warnings: 1, infos: 0 },
      { category: "QA-TEST", score: 100, errors: 0, warnings: 0, infos: 0 },
    ],
    findings: [finding({})],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 10,
    },
    ...overrides,
  };
}

/** Every non-blank, non-comment line's node/arrow/class shape, checked
 * against Mermaid flowchart grammar rules. */
function validateFlowchartStructure(md: string): void {
  const lines = md.split("\n").filter((l) => l.trim().length > 0);
  expect(lines[0]?.trim()).toMatch(/^flowchart\s+(TD|LR|TB|RL|BT)$/);

  const declaredIds = new Set<string>();
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    if (line.startsWith("classDef")) {
      // classDef <name> fill:#...,stroke:#...,color:#...;
      expect(line).toMatch(/^classDef\s+\w+\s+[\w:#,]+;?$/);
      continue;
    }
    if (line.startsWith("class ")) {
      // class <id> <className>;
      expect(line).toMatch(/^class\s+\w+\s+\w+;?$/);
      continue;
    }
    // Node declaration with or without an outgoing arrow:
    //   ID["label"]
    //   ID1 --> ID2
    //   ID1 --> ID2["label"]
    const nodeOnly = /^(\w+)\["([^"]*)"\]$/.exec(line);
    const arrow = /^(\w+)\s+-->\s+(\w+)(?:\["([^"]*)"\])?$/.exec(line);
    expect(
      nodeOnly !== null || arrow !== null,
      `line does not match any valid flowchart statement shape: "${line}"`,
    ).toBe(true);
    if (nodeOnly) {
      declaredIds.add(nodeOnly[1] as string);
    }
    if (arrow) {
      declaredIds.add(arrow[1] as string);
      declaredIds.add(arrow[2] as string);
    }
  }
  // Every `class <id> ...` statement must reference an ID that actually
  // appears in a node/arrow declaration somewhere in the diagram —
  // referencing a phantom node would be a real generator bug.
  for (const raw of lines) {
    const m = /^class\s+(\w+)\s+\w+;?$/.exec(raw.trim());
    if (m) {
      expect(
        declaredIds.has(m[1] as string),
        `class statement references undeclared node "${m[1]}"`,
      ).toBe(true);
    }
  }
}

describe("renderMermaid — valid Mermaid flowchart syntax", () => {
  it("produces a header, node declarations, and edges — structurally valid", () => {
    const md = renderMermaid(scanResult());
    validateFlowchartStructure(md);
  });

  it("produces valid syntax for the no-tests-found empty state", () => {
    const md = renderMermaid(
      scanResult({ score: null, dimensions: [], findings: [] }),
    );
    validateFlowchartStructure(md);
    expect(md).toContain("No test files detected");
  });

  it("produces valid syntax when frameworks are unknown (honesty, not omission)", () => {
    const md = renderMermaid(
      scanResult({ frameworks: [], frameworkDetectionUnknown: true }),
    );
    validateFlowchartStructure(md);
    expect(md).toContain("UNKNOWN");
  });

  it("produces valid syntax for a flawless scan (zero findings)", () => {
    const md = renderMermaid(
      scanResult({
        score: 100,
        findings: [],
        dimensions: [
          { category: "QA-PW", score: 100, errors: 0, warnings: 0, infos: 0 },
        ],
      }),
    );
    validateFlowchartStructure(md);
    // No severity leaf nodes at all when every count is zero.
    expect(md).not.toContain("_error[");
    expect(md).not.toContain("_warning[");
    expect(md).not.toContain("_info[");
  });

  it("escapes a double-quote character in a framework/category name so it can't break a node label", () => {
    const md = renderMermaid(scanResult({ frameworks: ['weird"framework'] }));
    validateFlowchartStructure(md);
  });
});

describe("renderMermaid — determinism", () => {
  it("produces byte-identical output for the same ScanResult, called twice", () => {
    const result = scanResult();
    expect(renderMermaid(result)).toBe(renderMermaid(result));
  });

  it("sorts frameworks and categories deterministically regardless of input order", () => {
    const a = scanResult({ frameworks: ["zeta", "alpha"] });
    const b = scanResult({ frameworks: ["alpha", "zeta"] });
    expect(renderMermaid(a)).toBe(renderMermaid(b));
  });

  it("colors dimensions by their real score, not a hardcoded assumption", () => {
    const md = renderMermaid(
      scanResult({
        dimensions: [
          { category: "QA-PW", score: 30, errors: 1, warnings: 0, infos: 0 },
        ],
      }),
    );
    expect(md).toContain("class CAT_QA_PW critical;");
  });
});

describe("score-neutrality (Sprint 9's own DoD line)", () => {
  it("rendering as mermaid never touches the underlying ScanResult object", () => {
    const result = scanResult();
    const snapshot = JSON.stringify(result);
    renderMermaid(result);
    expect(JSON.stringify(result)).toBe(snapshot);
  });
});
