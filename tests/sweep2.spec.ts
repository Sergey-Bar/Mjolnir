/**
 * Phase 2/1 sweep spec: renderer + forensics + rule edges.
 *
 * Contains: triage rows, mermaid classes, baseline rendering fallbacks,
 * data-string embedded-code skips (rules that read raw text), and the
 * QA-CI-007 retry-wrapper guards.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  renderTriage,
  renderTriageMd,
  triageRows,
} from "../src/forensics/triage.js";
import { renderMermaid } from "../src/reporter/mermaid.js";
import {
  diffAgainstBaseline,
  renderBaselineDiff,
} from "../src/commands/baseline.js";
import { pwMissingTimeout } from "../src/rules/playwright/qa-pw-103-missing-timeout.js";
import { hardcodedBaseUrl } from "../src/rules/playwright/qa-pw-123-hardcoded-url.js";
import { pwBlanketRouteMock } from "../src/rules/playwright/qa-pw-142-blanket-route.js";
import { emptyTestBody } from "../src/rules/test/qa-test-010-empty-body.js";
import { pwPollNoTimeout } from "../src/rules/playwright/qa-pw-105-poll-timeout.js";
import { computeCodeText } from "../src/engine/code-text.js";
import { retryMasking } from "../src/rules/ci/qa-ci-007-retry-masking.js";
import { parseWorkflow } from "../src/discovery/workflow-parser.js";
import { runBaselineCommand } from "../src/cli.js";
import type { ScanResult } from "../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-sweep2-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("triage renders failing rows", () => {
  const report = {
    source: "playwright-json" as const,
    totalTests: 2,
    failed: 1,
    skipped: 0,
    retriedTests: 1,
    flakyTests: 1,
    totalDurationMs: 30,
    verdicts: [
      {
        file: "e2e/f.spec.ts",
        title: "flake",
        attempts: 2,
        finalStatus: "passed" as const,
        totalDurationMs: 20,
        passedOnRetry: true,
        everFailed: true,
        skipped: false,
        suggestedAction: "quarantine",
        proposedQuarantine: true,
      },
      {
        file: "e2e/b.spec.ts",
        title: "broke",
        attempts: 1,
        finalStatus: "failed" as const,
        totalDurationMs: 10,
        passedOnRetry: false,
        everFailed: true,
        skipped: false,
        suggestedAction: "fix",
        proposedQuarantine: false,
      },
    ],
  };

  it("renderTriage labels failures honestly", () => {
    const out = renderTriage(report);
    expect(out).toContain("TRUE-FLAKE");
    expect(out).toContain("[FAILING] broke");
  });

  it("renderTriageMd renders both rows with quarantine markers", () => {
    const md = renderTriageMd(report);
    expect(md).toContain("🔥 TRUE-FLAKE");
    expect(md).toContain("❌ FAILING");
    expect(md).toContain("✅ propose");
    expect(md).toContain("—");
    expect(triageRows(report)).toHaveLength(2);
  });
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

describe("baseline rendering fallbacks", () => {
  it("labels a single captured finding singular", async () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    // Exactly one rule (QA-TEST-001, focused test) fires on this file by
    // default. QA-TEST-003 (82% FP) and QA-TEST-002 (65% FP) were demoted
    // to quarantine (docs/FP-AUDIT.md 2026-08-31).
    writeFileSync(
      join(dir, "e2e", "quiet.spec.ts"),
      "it.only('a', () => { console.log('x'); });\n",
    );
    const out: string[] = [];
    const code = await runBaselineCommand([dir], {
      out: (...p: unknown[]) => out.push(p.map(String).join(" ")),
      err: () => {},
    });
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("Captured 1 finding to");
  });

  it("renders unknown time and commit when the baseline lacks them", () => {
    const scan: ScanResult = {
      schemaVersion: 1,
      partial: false,
      score: 80,
      frameworks: [],
      frameworkDetectionUnknown: false,
      dimensions: [],
      findings: [],
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
    };
    const diff = diffAgainstBaseline(scan, { findings: [] } as never);
    const text = renderBaselineDiff(diff);
    expect(text).toContain("unknown time");
    expect(text).toContain("unknown");
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

  it("QA-PW-103: a goto written as string data is skipped", () => {
    const text = "const s = \"page.goto('https://example.com')\";\n";
    expect(pwMissingTimeout.run(masked(text))).toEqual([]);
  });

  it("QA-PW-105: quoted timeouts inside a data string are skipped", () => {
    const text = 'const s = "await page.waitForTimeout(100)";\n';
    expect(pwPollNoTimeout.run(masked(text))).toEqual([]);
  });

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
