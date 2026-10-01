/**
 * Phase 2/1 sweep spec: renderer + forensics + rule edges.
 *
 * Contains: triage rows, mermaid classes, baseline rendering fallbacks,
 * data-string embedded-code skips (rules that read raw text), and the
 * QA-CI-007 retry-wrapper guards.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {} from "../../src/forensics/triage.js";
import { renderMermaid } from "../../src/reporter/mermaid.js";
import {} from "../../src/commands/baseline.js";
import { hardcodedBaseUrl } from "../../src/rules/playwright/qa-pw-123-hardcoded-url.js";
import { pwBlanketRouteMock } from "../../src/rules/playwright/qa-pw-142-blanket-route.js";
import { emptyTestBody } from "../../src/rules/test/qa-test-010-empty-body.js";
import { computeCodeText } from "../../src/engine/code-text.js";
import { retryMasking } from "../../src/rules/ci/qa-ci-007-retry-masking.js";
import { parseWorkflow } from "../../src/discovery/workflow-parser.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-sweep2-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("mermaid severity classes", () => {
  it("uses the info class for info-only categories", () => {
    const out = renderMermaid({
      schemaVersion: 1,
      partial: false,
      score: 90,
      frameworks: [],
      frameworkDetectionUnknown: false,
      dimensions: [
        { category: "QA-TEST", score: 60, errors: 0, warnings: 0, infos: 1 },
      ],
      findings: [
        {
          ruleId: "QA-TEST-941",
          category: "QA-TEST",
          severity: "info",
          confidence: "high",
          findingType: "observation",
          qaImpact: "HYGIENE",
          file: "a.spec.ts",
          line: 1,
          column: 1,
          message: "m",
          why: "w",
          fix: "f",
          evidenceLevel: "E0",
        },
      ],
      testFileCount: 1,
      testDeclarationCount: 1,
      rawDeductions: 0,
      suppressionCount: 0,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
        rulesCrashed: 0,
      },
    });
    expect(out).toContain("info");
  });
});

describe("embedded-code skip arms with codeText oracle", () => {
  function masked(text: string) {
    return {
      path: "a.spec.ts",
      text,
      codeText: computeCodeText({ path: "a.spec.ts", text }, "typescript"),
    };
  }

  it("QA-PW-123: a URL written as test data is skipped", () => {
    const text = "const s = \"await page.goto('https://example.com')\";\n";
    expect(hardcodedBaseUrl.run(masked(text))).toEqual([]);
  });

  it("QA-PW-142: a blanket route as data is skipped", () => {
    const text = "const s = \"page.route('**', h)\";\n";
    expect(pwBlanketRouteMock.run(masked(text))).toEqual([]);
  });

  it("QA-TEST-010: an empty body as data is skipped", () => {
    const text = "const s = \"it('a', () => {})\";\n";
    expect(emptyTestBody.run(masked(text))).toEqual([]);
  });
});

describe("QA-CI-007 retry wrapper with-config edges", () => {
  function ciCtx(yaml: string) {
    return {
      path: ".github/workflows/ci.yml",
      text: yaml,
      ast: parseWorkflow(yaml),
    };
  }

  it("ignores retry wrappers without a test command in with config", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - uses: nick-fields/retry@v3\n        with:\n          max_tries: 3\n          command: curl -fsSL example.com\n";
    expect(retryMasking.run(ciCtx(y))).toEqual([]);
  });

  it("skips a retry step without with config", () => {
    const y = "jobs:\n  e2e:\n    steps:\n      - uses: nick-fields/retry@v3\n";
    expect(retryMasking.run(ciCtx(y))).toEqual([]);
  });
});
