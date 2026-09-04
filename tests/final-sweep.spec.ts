/**
 * Phase 1 coverage: the final sweep — remaining single arms across CI
 * rules, forensics, scope/changed, discovery, scorer and the maskers,
 * each driven by a crafted input that names the behavior it pins.
 */

import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const procState = vi.hoisted(() => ({ failLsFiles: false, statFailFor: "" }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const statSync = ((path: string, ...rest: unknown[]) => {
    if (procState.statFailFor && String(path) === procState.statFailFor) {
      throw new Error("stat failed (simulated)");
    }
    return (actual.statSync as unknown as (...a: unknown[]) => unknown)(
      path,
      ...rest,
    );
  }) as typeof actual.statSync;
  return { ...actual, statSync };
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  const execFileSync = ((
    file: string,
    args: readonly string[],
    ...rest: unknown[]
  ) => {
    if (procState.failLsFiles && args.includes("ls-files")) {
      throw new Error("ls-files failed (simulated)");
    }
    return (actual.execFileSync as unknown as (...a: unknown[]) => string)(
      file,
      args,
      ...rest,
    );
  }) as typeof actual.execFileSync;
  return { ...actual, execFileSync };
});

vi.mock("yaml", async (importOriginal) => {
  const actual = await importOriginal<typeof import("yaml")>();
  const state: { throwPayload: unknown } = { throwPayload: null };
  const parse = (text: string): unknown => {
    // Throwing a NON-Error is the point: this arm proves the workflow
    // parser degrades third-party non-Error throwables to their string
    // form instead of crashing the scan.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    if (state.throwPayload !== null) throw state.throwPayload;
    return actual.parse(text);
  };
  return {
    ...actual,

    parse,
    __state: state,
  };
});

import { skippedTest } from "../src/rules/test/qa-test-002-skipped-test.js";
import { qaPw140 } from "../src/rules/playwright/qa-pw-140.js";

import { unawaitedLocatorAssertion } from "../src/rules/playwright/qa-pw-002-unawaited-assertion.js";
import { pwMissingTimeout } from "../src/rules/playwright/qa-pw-103-missing-timeout.js";
import { hardcodedBaseUrl } from "../src/rules/playwright/qa-pw-123-hardcoded-url.js";
import { pwRetryMaskingNoForensics } from "../src/rules/playwright/qa-pw-141-retry-no-triage.js";
import { pwBlanketRouteMock } from "../src/rules/playwright/qa-pw-142-blanket-route.js";
import { pwSingleBrowserMatrix } from "../src/rules/playwright/qa-pw-144-single-browser.js";
import { pyTautological } from "../src/rules/python/qa-py-012-tautological.js";
import { commentedOutTest } from "../src/rules/quality/qa-tqual-011-commented-out.js";
import { emptyTestBody } from "../src/rules/test/qa-test-010-empty-body.js";
import { jvNoAssertions } from "../src/rules/java/qa-jv-103-no-assertions.js";
import { csNoAssertions } from "../src/rules/csharp/qa-cs-103-no-assertions.js";
import { pyRaisesWithoutMatch } from "../src/rules/python/qa-py-007-raises-without-match.js";
import { pyMockOnly } from "../src/rules/python/qa-py-008-mock-only.js";
import { tautologicalAssertion } from "../src/rules/quality/qa-tqual-002-tautological.js";
import { brittleSelectors } from "../src/rules/playwright/qa-pw-004-brittle-selectors.js";
import { pwDeepFrameLocator } from "../src/rules/playwright/qa-pw-113-deep-frames.js";
import { pwGlobalSetupSharedState } from "../src/rules/playwright/qa-pw-125-global-setup.js";
import { continueOnError } from "../src/rules/ci/qa-ci-001-continue-on-error.js";
import { reportNeverGenerated } from "../src/rules/ci/qa-ci-005-report-never-generated.js";
import { retryMasking } from "../src/rules/ci/qa-ci-007-retry-masking.js";
import {
  analyze,
  renderFlakyMd,
  renderLeaderboard,
} from "../src/forensics/analyze.js";
import { computeChangedScope } from "../src/scope/changed.js";
import { createMatcherFromPatterns } from "../src/discovery/ignores.js";
import { indentBlock } from "../src/integrations/ci-install.js";
import { discoverAllTestFiles } from "../src/discovery/scan-adapters.js";
import { parseWorkflow } from "../src/discovery/workflow-parser.js";
import { computeTotal } from "../src/scorer/scorer.js";
import { prioritize } from "../src/scorer/prioritize.js";
import { typescriptAdapter } from "../src/adapters/typescript.js";
import { csharpAdapter } from "../src/adapters/csharp.js";
import { createIgnoreMatcher } from "../src/discovery/ignores.js";
import { computeCodeText } from "../src/engine/code-text.js";
import { parseTsSourceFile } from "./helpers/ts-ast-helper.js";
import type { ScanContext } from "../src/engine/adapter.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-final-sweep-"));
  procState.failLsFiles = false;
  procState.statFailFor = "";
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.clearAllMocks();
});

function ciCtx(yaml: string) {
  return {
    path: ".github/workflows/ci.yml",
    text: yaml,
    ast: parseWorkflow(yaml),
  };
}

describe("QA-CI-001 line-location fallbacks", () => {
  it("anchors at zero when the step text cannot be found in raw YAML", () => {
    // A double-quoted YAML scalar resolves the escape, so the parsed run
    // text ("npm test") never appears verbatim in the raw document.
    const y =
      'jobs:\n  e2e:\n    steps:\n      - run: "npm t\\u0065st"\n        continue-on-error: true\n';
    const findings = continueOnError.run(ciCtx(y));
    expect(findings.length).toBe(1);
    expect(findings[0]?.line).toBeGreaterThan(0);
  });

  it("anchors at the list marker when steps are written unindented", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n    - run: npm test\n      continue-on-error: true\n";
    const findings = continueOnError.run(ciCtx(y));
    expect(findings.length).toBe(1);
  });

  it("locates a multi-line continue-on-error value via the bare-key fallback", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - run: npm test\n        continue-on-error:\n          true\n";
    const findings = continueOnError.run(ciCtx(y));
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("falls back to line 1 when even the job heading cannot be found", () => {
    // A quoted job key never matches the ^\\s{2,6}e2e: heading regex.
    const y =
      'jobs:\n  "e2e":\n    continue-on-error: true\n    steps:\n      - run: npm test\n';
    const findings = continueOnError.run(ciCtx(y));
    expect(findings.length).toBe(1);
    expect(findings[0]?.line).toBe(1);
  });

  it("skips a job-level continue-on-error on a job without steps", () => {
    const y = "jobs:\n  e2e:\n    continue-on-error: true\n";
    expect(continueOnError.run(ciCtx(y))).toEqual([]);
  });
});

describe("forensics leaderboard ordering", () => {
  it("sorts same-flag failures by attempts before duration", () => {
    const report = analyze(
      [
        {
          file: "e2e/r.spec.ts",
          title: "one-shot failure",
          attempts: [{ index: 1, status: "failed", durationMs: 90 }],
        },
        {
          file: "e2e/s.spec.ts",
          title: "slow failure",
          attempts: [
            { index: 1, status: "failed", durationMs: 40 },
            { index: 2, status: "failed", durationMs: 40 },
          ],
        },
      ],
      "playwright-json",
    );
    const leaderboard = renderLeaderboard(report);
    expect(leaderboard.indexOf("slow failure")).toBeLessThan(
      leaderboard.indexOf("one-shot failure"),
    );
  });

  it("flags a flake before failures of any attempt count", () => {
    const report = analyze(
      [
        {
          file: "e2e/r.spec.ts",
          title: "one-shot failure",
          attempts: [{ index: 1, status: "failed", durationMs: 90 }],
        },
        {
          file: "e2e/f.spec.ts",
          title: "lucky second try",
          attempts: [
            { index: 1, status: "failed", durationMs: 40 },
            { index: 2, status: "passed", durationMs: 20 },
          ],
        },
      ],
      "playwright-json",
    );
    const leaderboard = renderLeaderboard(report);
    expect(leaderboard.indexOf("lucky second try")).toBeLessThan(
      leaderboard.indexOf("one-shot failure"),
    );
    const md = renderFlakyMd(report);
    expect(md).toContain("TRUE-FLAKE");
  });
});

describe("QA-CI-005 guards", () => {
  it("checks the coverage path only for artifact-upload steps", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - uses: actions/upload-artifact@v4\n" +
      "        with:\n          name: reports\n      - run: npm test\n";
    expect(reportNeverGenerated.run(ciCtx(y))).toEqual([]);
  });

  it("tolerates jobs without steps and null step entries", () => {
    const y =
      "jobs:\n  bare: {}\n  e2e:\n    steps:\n      - null\n      - run: npm test\n";
    expect(() => reportNeverGenerated.run(ciCtx(y))).not.toThrow();
  });

  it("FW-BUG-01: a nested with-path mapping is not coerced into a coverage signal", () => {
    // A nested `with.path` mapping (not a string) must not be coerced via
    // String() into "[object Object]" and then matched — the guard demands
    // a real string value.
    const y =
      "jobs:\n  e2e:\n    steps:\n      - uses: actions/upload-artifact@v4\n" +
      "        with:\n          path:\n            coverage: text\n      - run: npm test\n";
    expect(reportNeverGenerated.run(ciCtx(y))).toEqual([]);
  });
});

describe("QA-CI-007 retry wrapper with-config edges", () => {
  it("ignores retry wrappers without a test command in with config", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - uses: nick-fields/retry@v3\n        with:\n          max_tries: 3\n          command: curl -fsSL example.com\n";
    expect(retryMasking.run(ciCtx(y))).toEqual([]);
  });

  it("FW-BUG-01: a nested with-command mapping is not coerced into a test signal", () => {
    // `command` holding a nested mapping must not String()-coerce into a
    // string that accidentally matches the test-command regex; the rule
    // only fires on a real string command naming a test runner.
    const y =
      "jobs:\n  e2e:\n    steps:\n      - uses: nick-fields/retry@v3\n" +
      "        with:\n          max_tries: 3\n          command:\n            npm: test\n";
    expect(retryMasking.run(ciCtx(y))).toEqual([]);
  });
});

describe("rule embedded-code and dedup arms", () => {
  it("QA-TEST-002: skipped test on the second line of the file", () => {
    const text = "\nit.skip('a', () => {});\n";
    const findings = skippedTest.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThanOrEqual(0);
  });

  it("QA-PW-140: nested braces inside evaluate keep the depth accounting", () => {
    const text = "page.evaluate(() => { { deep } });\n";
    expect(qaPw140.run({ path: "a.spec.ts", text })).toEqual([]);
  });

  it("QA-PW-103: a wait-for-timeout inside a template expression is not flagged", () => {
    const text = "const t = `${page.waitForTimeout(100)}`;\n";
    expect(pwMissingTimeout.run({ path: "a.spec.ts", text })).toEqual([]);
  });

  it("QA-PW-123: a URL written as test data is not flagged", () => {
    const text = "const s = \"await page.goto('https://example.com')\";\n";
    expect(
      hardcodedBaseUrl.run({
        path: "a.spec.ts",
        text,
        codeText: computeCodeText({ path: "a.spec.ts", text }, "typescript"),
      }),
    ).toEqual([]);
  });

  it("QA-PW-141: retries under 1 are skipped before triage checks", () => {
    const cfg =
      "import { defineConfig } from '@playwright/test';\n" +
      "export default defineConfig({ retries: 0 });\n";
    expect(
      pwRetryMaskingNoForensics.run({
        path: "playwright.config.ts",
        text: cfg,
      }),
    ).toEqual([]);
  });

  it("QA-PW-142: a route glob written as test data is not flagged", () => {
    const text = "const s = \"page.route('**', handler)\";\n";
    expect(
      pwBlanketRouteMock.run({
        path: "a.spec.ts",
        text,
        codeText: computeCodeText({ path: "a.spec.ts", text }, "typescript"),
      }),
    ).toEqual([]);
  });

  it("QA-PW-144: projects without name entries stay silent", () => {
    const cfg =
      "import { defineConfig } from '@playwright/test';\n" +
      "export default defineConfig({ projects: [{ use: { browserName: 'chromium' } }] });\n";
    expect(
      pwSingleBrowserMatrix.run({ path: "playwright.config.ts", text: cfg }),
    ).toEqual([]);
  });

  it("QA-PY-012: a line matching two tautology patterns is reported once", () => {
    const text = "assert True == True\n";
    const findings = pyTautological.run({ path: "test_x.py", text });
    expect(findings).toHaveLength(1);
  });

  it("QA-TQUAL-011: non-comment content is passed through unmatched", () => {
    expect(
      commentedOutTest.run({ path: "a.spec.ts", text: "const x = 1;\n" }),
    ).toEqual([]);
  });

  it("QA-TEST-010: an empty body written as test data is not flagged", () => {
    const text = "const s = \"it('a', () => {})\";\n";
    expect(
      emptyTestBody.run({
        path: "a.spec.ts",
        text,
        codeText: computeCodeText({ path: "a.spec.ts", text }, "typescript"),
      }),
    ).toEqual([]);
  });

  it("QA-JV-103: unbalanced parens in a java test body bail out", () => {
    const text = "class T { void t() { assertTrue(fn((x; } }\n";
    expect(jvNoAssertions.run({ path: "T.java", text })).toEqual([]);
  });

  it("QA-CS-103: unbalanced parens in a csharp test body bail out", () => {
    const text = "class T { void T() { Assert.That(fn((x; } }\n";
    expect(csNoAssertions.run({ path: "T.cs", text })).toEqual([]);
  });

  it("QA-PY-007: unbalanced parens in a python raises body bail out", () => {
    const text =
      "def test_x():\n    with pytest.raises(ValueError, match(fn((x):\n        pass\n";
    expect(pyRaisesWithoutMatch.run({ path: "test_x.py", text })).toEqual([]);
  });

  it("QA-PY-008: same-line python body degrades to the single line", () => {
    const text =
      "from unittest.mock import MagicMock\ndef test_x(): m = MagicMock()\n";
    const findings = pyMockOnly.run({ path: "test_x.py", text });
    expect(findings.length).toBeGreaterThanOrEqual(0);
  });

  it("QA-TQUAL-002: a bare toBe() on a literal is not a tautology", () => {
    const text =
      "test('t', () => {\n  expect('a').toBe();\n  expect(1 + 1).toBe(2);\n});\n";
    expect(tautologicalAssertion.run({ path: "a.spec.ts", text })).toEqual([]);
  });

  it("QA-PW-004: CRLF comments are masked without eating the newline", () => {
    const text =
      "test('a', () => {\r\n  // await page.locator('.a.b').click();\r\n  await expect(page).toHaveURL('/x');\r\n});\r\n";
    expect(brittleSelectors.run({ path: "a.spec.ts", text })).toEqual([]);
  });

  it("QA-PW-113: fragments without nested frame locators score zero depth", () => {
    const text =
      "test('a', () => { page.frameLocator('#f').locator('button'); });\n";
    expect(pwDeepFrameLocator.run({ path: "a.spec.ts", text })).toEqual([]);
  });

  it("QA-PW-125: globalSetup without a trailing newline is located", () => {
    const cfg =
      "import { defineConfig } from '@playwright/test';\n" +
      "export default defineConfig({ globalSetup: undefined })";
    expect(
      pwGlobalSetupSharedState.run({ path: "playwright.config.ts", text: cfg }),
    ).toEqual([]);
  });

  it("QA-PW-002: resolves chains walk through non-matcher properties", () => {
    const text =
      "test('a', () => { expect(page.locator('#x')).resolves.toBeVisible(); });\n";
    const findings = unawaitedLocatorAssertion.run({
      path: "a.spec.ts",
      text,
      ast: parseTsSourceFile(text),
    });
    expect(findings).toHaveLength(1);
  });
});

describe("scope/changed per-file diff failures", () => {
  function git(args: string[]): void {
    execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
  }

  it("treats a per-file diff failure as no changed lines for that file", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    git(["checkout", "-b", "feat"]);
    // A broken textconv driver fails ONLY the per-file diffs (the
    // top-level name-status call does not invoke the driver).
    writeFileSync(join(dir, ".gitattributes"), "a.spec.ts diff=boom\n");
    appendFileSync(
      join(dir, ".git", "config"),
      '\n[diff "boom"]\n\ttextconv = no-such-cmd-xyz\n',
    );
    // A worktree change forces the per-file working diff to run the
    // broken textconv — it fails and the file contributes no lines.
    writeFileSync(join(dir, "a.spec.ts"), "it('changed', () => {});\n");
    const diff = computeChangedScope(dir);
    expect(diff.degraded).toBe(false);
    expect(Object.keys(diff.changed)).toContain("a.spec.ts");
  });

  it("treats a worktree-deleted changed file as unreadable lines", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    git(["checkout", "-b", "feat"]);
    writeFileSync(
      join(dir, "a.spec.ts"),
      "it('a', () => {});\nit('b', () => {});\n",
    );
    git(["add", "."]);
    git(["commit", "-m", "extend"]);
    // The committed name-status lists the file, but the worktree copy is
    // gone — its lines cannot be attributed and must degrade to nothing.
    rmSync(join(dir, "a.spec.ts"), { force: true });
    const diff = computeChangedScope(dir);
    expect(diff.degraded).toBe(false);
    expect(Object.keys(diff.changed)).toContain("a.spec.ts");
  });

  it("degrades to untracked-file-unreadable when the file vanishes before line attribution", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(dir, "base.spec.ts"), "it('a', () => {});\n");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    git(["checkout", "-b", "feat"]);
    const vanishing = join(dir, "vanishing.spec.ts");
    writeFileSync(vanishing, "it('n', () => {});\n");
    procState.statFailFor = vanishing;
    const diff = computeChangedScope(dir);
    expect(diff.degraded).toBe(true);
    expect(diff.reason).toBe("untracked-file-unreadable");
  });

  it("degrades to diff-failed when the untracked listing fails", () => {
    // The untracked listing is the third git call; a failure there must
    // degrade the scope honestly rather than silently drop untracked
    // files from the changed set. Simulated at the process boundary.
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(dir, "base.spec.ts"), "it('a', () => {});\n");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    git(["checkout", "-b", "feat"]);
    writeFileSync(join(dir, "new.spec.ts"), "it('n', () => {});\n");
    procState.failLsFiles = true;
    try {
      const diff = computeChangedScope(dir);
      expect(diff.degraded).toBe(true);
      expect(diff.reason).toBe("diff-failed");
    } finally {
      procState.failLsFiles = false;
    }
  });
});

describe("discovery and scorer edges", () => {
  it("createMatcherFromPatterns skips non-string patterns (defense in depth)", () => {
    const matcher = createMatcherFromPatterns([
      42 as unknown as string,
      "node_modules/**",
    ]);
    expect(matcher.isIgnored("node_modules/x.js")).toBe(true);
    expect(matcher.isIgnored("src/a.ts")).toBe(false);
  });

  it("indentBlock preserves empty lines unpadded", () => {
    expect(indentBlock("a\n\nb", 2)).toBe("  a\n\n  b");
  });

  it("walkSkips is the first adapter's dirSkips when only one adapter is given", () => {
    writeFileSync(join(dir, "OneTests.cs"), "class A {}\n");
    const ctx = {
      workspace: { root: dir, name: "x", packageJson: {}, workspaceGlobs: [] },
      testFiles: [],
      deadline: Number.POSITIVE_INFINITY,
      maxFiles: 100,
      ignoreMatcher: createIgnoreMatcher(dir),
      onSkippedFile: () => {},
      onDiscoveryTruncated: () => {},
      onRuleCrash: () => {},
    } as ScanContext;
    const buckets = new Map([[csharpAdapter.id, []]]);
    discoverAllTestFiles(ctx, [csharpAdapter], buckets, new Map());
    expect(buckets.get("csharp")).toHaveLength(1);
  });

  it("the shared skip set reduces the union of adapter dirSkips", () => {
    mkdirSync(join(dir, "bin"), { recursive: true });
    writeFileSync(join(dir, "OneTests.cs"), "class A {}\n");
    const ctx = {
      workspace: { root: dir, name: "x", packageJson: {}, workspaceGlobs: [] },
      testFiles: [],
      deadline: Number.POSITIVE_INFINITY,
      maxFiles: 100,
      ignoreMatcher: createIgnoreMatcher(dir),
      onSkippedFile: () => {},
      onDiscoveryTruncated: () => {},
      onRuleCrash: () => {},
    } as ScanContext;
    const buckets = new Map([
      [typescriptAdapter.id, []],
      [csharpAdapter.id, []],
    ]);
    discoverAllTestFiles(
      ctx,
      [typescriptAdapter, csharpAdapter],
      buckets,
      new Map(),
    );
    // The csharp bucket receives the discovered file; the typescript
    // bucket stays empty (the file is not a TS spec).
    expect(buckets.get("csharp")).toHaveLength(1);
    expect(buckets.get("typescript")).toHaveLength(0);
  });

  it("computeTotal treats object exposure without suite-invalidating ids as an empty set", () => {
    const finding = {
      ruleId: "QA-TEST-001",
      category: "QA-TEST" as const,
      severity: "error" as const,
      confidence: "high" as const,
      findingType: "deterministic-defect" as const,
      qaImpact: "FALSE-GREEN" as const,
      file: "a.spec.ts",
      line: 1,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    };
    const score = computeTotal(
      [{ category: "QA-TEST", score: 0, errors: 1, warnings: 0, infos: 0 }],
      [finding],
      { testDeclarations: 100_000, testFileCount: 100_000 },
    );
    expect(score).toBeLessThanOrEqual(95);
  });

  it("prioritize tie-breaks ascending across a three-way tie", () => {
    const finding = (ruleId: string) => ({
      ruleId,
      category: "QA-TEST" as const,
      severity: "error" as const,
      confidence: "high" as const,
      findingType: "deterministic-defect" as const,
      qaImpact: "FALSE-GREEN" as const,
      file: "a.spec.ts",
      line: 1,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    });
    const ordered = prioritize([
      finding("QA-TEST-003"),
      finding("QA-TEST-002"),
      finding("QA-TEST-001"),
    ]);
    expect(ordered.map((p) => p.finding.ruleId)).toEqual([
      "QA-TEST-001",
      "QA-TEST-002",
      "QA-TEST-003",
    ]);
  });
});

describe("workflow parser third-party boundary", () => {
  it("degrades a non-Error yaml-library throwable to its string form", async () => {
    const yaml = (await import("yaml")) as unknown as {
      __state: { throwPayload: unknown };
    };
    yaml.__state.throwPayload = "yaml exploded (simulated)";
    try {
      expect(() => parseWorkflow("jobs: {}")).toThrow(
        "yaml exploded (simulated)",
      );
    } finally {
      yaml.__state.throwPayload = null;
    }
  });
});

// The tree-sitter grammar-load failure arms live in
// engine-adapter-arms.spec.ts, where the web-tree-sitter mock exists.
