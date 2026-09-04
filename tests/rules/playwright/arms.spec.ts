/**
 * Phase 1 coverage: residual rule arms driven through direct run()
 * calls with crafted contexts (the established rule-branch-coverage
 * convention) plus forensics/scope/reporter edge shapes.
 *
 * Rules under test: QA-PW-005 (AST evaluate), QA-PW-002 (return-awaited
 * assertion), QA-PW-105 (string-aware arg scanning), QA-PW-004 (comment
 * masking of brittle selectors), QA-PY-105 (indentation edge cases),
 * QA-TQUAL-009 (statement-start edge), QA-TQUAL-002 (assertion forms),
 * QA-CI-005/009 (workflow guards), QA-CI-001 (step label + line fallbacks),
 * QA-PW-144 (engine naming + mobile).
 */

import { describe, expect, it } from "vitest";

import { computeCodeText } from "../../../src/engine/code-text.js";
import { evaluateBusinessLogic } from "../../../src/rules/playwright/qa-pw-005-evaluate-logic.js";
import { unawaitedLocatorAssertion } from "../../../src/rules/playwright/qa-pw-002-unawaited-assertion.js";
import { pwPollNoTimeout } from "../../../src/rules/playwright/qa-pw-105-poll-timeout.js";
import { brittleSelectors } from "../../../src/rules/playwright/qa-pw-004-brittle-selectors.js";
import { pyPwNoAssertions } from "../../../src/rules/python/qa-py-105-pw-no-assertions.js";
import { unawaitedPromiseAssertion } from "../../../src/rules/quality/qa-tqual-009-promise-assertion.js";
import { tautologicalAssertion } from "../../../src/rules/quality/qa-tqual-002-tautological.js";
import { reportNeverGenerated } from "../../../src/rules/ci/qa-ci-005-report-never-generated.js";
import { exitCodeNotPropagated } from "../../../src/rules/ci/qa-ci-009-exit-code.js";
import { continueOnError } from "../../../src/rules/ci/qa-ci-001-continue-on-error.js";
import { parseWorkflow } from "../../../src/discovery/workflow-parser.js";
import { pwSingleBrowserMatrix } from "../../../src/rules/playwright/qa-pw-144-single-browser.js";
import { parseTsSourceFile } from "../../helpers/ts-ast-helper.js";

function ctxOf(text: string, ast?: unknown, path = "a.spec.ts") {
  return { path, text, ast };
}

function astOf(text: string, path = "a.spec.ts"): unknown {
  return parseTsSourceFile(text, path);
}

describe("QA-PW-005: AST evaluate-logic arms", () => {
  it("ignores evaluate calls whose first argument is not a function", () => {
    const text =
      "const v = page.evaluate('window.x');\nconst w = evaluate(42);\n";
    const findings = evaluateBusinessLogic.run(ctxOf(text, astOf(text)));
    expect(findings).toEqual([]);
  });

  it("ignores an evaluate call with no arguments", () => {
    const text = "page.evaluate();\n";
    expect(evaluateBusinessLogic.run(ctxOf(text, astOf(text)))).toEqual([]);
  });

  it("flags branching logic inside an evaluate function expression", () => {
    const text =
      "page.evaluate(function run() { if (window.x) { document.title = 'y'; } });\n";
    const findings = evaluateBusinessLogic.run(ctxOf(text, astOf(text)));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Branching logic");
  });

  it("stays silent for branch-free evaluate bodies", () => {
    const text =
      "const n = page.evaluate(() => document.body.childNodes.length);\n";
    expect(evaluateBusinessLogic.run(ctxOf(text, astOf(text)))).toEqual([]);
  });
});

describe("QA-PW-002: unawaited assertion arms", () => {
  it("treats `return expect(...)` as awaited (runner-awaits-return)", () => {
    const text =
      "test('a', () => { return expect(page.locator('#x')).toBeVisible(); });\n";
    expect(unawaitedLocatorAssertion.run(ctxOf(text, astOf(text)))).toEqual([]);
  });

  it("ignores expect() calls with no arguments", () => {
    const text = "expect();\n";
    expect(unawaitedLocatorAssertion.run(ctxOf(text, astOf(text)))).toEqual([]);
  });

  it("flags a bare expect().toBeVisible() chain that is never awaited", () => {
    const text =
      "test('a', () => { expect(page.locator('#x')).toBeVisible(); });\n";
    const findings = unawaitedLocatorAssertion.run(ctxOf(text, astOf(text)));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("not awaited");
  });

  it("stays silent when the locator does not start with page/locator/this.page", () => {
    const text = "test('a', () => { expect(order.total).toBe(2); });\n";
    expect(unawaitedLocatorAssertion.run(ctxOf(text, astOf(text)))).toEqual([]);
  });
});

describe("QA-PW-105: expect.poll arg scanning", () => {
  it("survives an unclosed expect.poll call", () => {
    const text = "await expect.poll(() => window.x > 0\n";
    expect(pwPollNoTimeout.run(ctxOf(text))).toEqual([]);
  });

  it("flags a poll without timeout, skipping commas inside strings", () => {
    const text = "await expect.poll(() => cmp('a,b'));\n";
    const findings = pwPollNoTimeout.run(ctxOf(text));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("without an explicit `timeout`");
  });

  it("handles escaped quotes inside the argument region", () => {
    const text = "await expect.poll(() => cmp('a\\'b'));\n";
    const findings = pwPollNoTimeout.run(ctxOf(text));
    expect(findings).toHaveLength(1);
  });

  it("treats backtick strings as strings while scanning", () => {
    const text = "await expect.poll(() => cmp(`x,y`));\n";
    const findings = pwPollNoTimeout.run(ctxOf(text));
    expect(findings).toHaveLength(1);
  });

  it("stays silent when an explicit timeout is present", () => {
    const text =
      "await expect.poll(async () => status, { timeout: 10_000 });\n";
    expect(pwPollNoTimeout.run(ctxOf(text))).toEqual([]);
  });
});

describe("QA-PW-004: brittle selectors with comment masking", () => {
  const code =
    "test('a', () => {\n  await page.locator('.a.b').click();\n});\n";
  const commented =
    "test('a', () => {\n  // await page.locator('.a.b').click();\n  await expect(page).toHaveURL('/x');\n});\n";

  it("fires on a multi-class selector in code without the AST seam", () => {
    const findings = brittleSelectors.run(ctxOf(code));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("multi-class CSS selector");
  });

  it("does not fire on a brittle selector inside a comment", () => {
    expect(brittleSelectors.run(ctxOf(commented))).toEqual([]);
  });

  it("does not fire when the match is masked by the code view", () => {
    const findings = brittleSelectors.run(
      ctxOf(commented, astOf(commented), "a.spec.ts"),
    );
    // codeText is absent here, so stripComments runs; either way the
    // commented locator must not fire.
    expect(findings).toEqual([]);
  });

  it("fires when codeText is supplied and the locator is live code", () => {
    const findings = brittleSelectors.run({
      ...ctxOf(code, astOf(code)),
      codeText: computeCodeText(
        { path: "a.spec.ts", text: code, ast: undefined },
        "typescript",
      ),
    });
    expect(findings).toHaveLength(1);
  });
});

describe("QA-PY-105: python pw no-assertions edge cases", () => {
  it("skips a test function whose body cannot be located", () => {
    const text = "from playwright.sync_api import Page\ndef test_x():";
    expect(pyPwNoAssertions.run(ctxOf(text, undefined, "test_x.py"))).toEqual(
      [],
    );
  });

  it("returns no finding when the whole block area is blank", () => {
    const text = "from playwright.sync_api import Page\ndef test_x():\n\n";
    expect(pyPwNoAssertions.run(ctxOf(text, undefined, "test_x.py"))).toEqual(
      [],
    );
  });

  it("returns no finding when the first content line has no indent", () => {
    const text =
      "from playwright.sync_api import Page\ndef test_x():\npage.goto('/a')\n";
    expect(pyPwNoAssertions.run(ctxOf(text, undefined, "test_x.py"))).toEqual(
      [],
    );
  });

  it("flags a UI-driving test without assertions (indented block)", () => {
    const text =
      "from playwright.sync_api import Page\ndef test_x(page: Page):\n    page.click('#btn')\n";
    const findings = pyPwNoAssertions.run(ctxOf(text, undefined, "test_x.py"));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("asserts nothing");
  });

  it("handles a same-line body with and without a trailing newline", () => {
    const withNl =
      "from playwright.sync_api import Page\ndef test_x(): page.goto('/a')\nassert True\n";
    expect(
      pyPwNoAssertions.run(ctxOf(withNl, undefined, "test_x.py")),
    ).toHaveLength(1);
    const withoutNl =
      "from playwright.sync_api import Page\ndef test_x(): page.goto('/a')";
    expect(
      pyPwNoAssertions.run(ctxOf(withoutNl, undefined, "test_x.py")),
    ).toHaveLength(1);
  });

  it("stays silent when the test asserts an outcome", () => {
    const text =
      "from playwright.sync_api import Page\ndef test_x(page: Page):\n    page.click('#btn')\n    assert page.title() != ''\n";
    expect(pyPwNoAssertions.run(ctxOf(text, undefined, "test_x.py"))).toEqual(
      [],
    );
  });
});

describe("QA-TQUAL-009: promise-assertion statement-start edges", () => {
  it("handles a promise assertion on the first line of the file", () => {
    const text = "page.textContent('#a').then((t) => expect(t).toBeNull());\n";
    const findings = unawaitedPromiseAssertion.run(ctxOf(text));
    expect(findings).toHaveLength(1);
  });

  it("handles a chain whose statement sits one newline below the top", () => {
    const text =
      "\npage.textContent('#a').then((t) => expect(t).toBeNull());\n";
    const findings = unawaitedPromiseAssertion.run(ctxOf(text));
    expect(findings).toHaveLength(1);
  });

  it("stays silent when the promise is awaited, even with escaped quotes", () => {
    const text =
      "const p = 'a\\\\';\nawait page.textContent('#a').then((t) => expect(t).toBeNull(), 'c\\\\d');\n";
    expect(unawaitedPromiseAssertion.run(ctxOf(text))).toEqual([]);
  });
});

describe("QA-TQUAL-002: tautological assertion forms", () => {
  it("fires for a numeric literal compared with itself", () => {
    const text =
      "test('t', () => {\n  expect(1).toBe(1);\n  expect(1 + 1).toBe(2);\n});\n";
    const findings = tautologicalAssertion.run(ctxOf(text));
    expect(findings).toHaveLength(1);
  });

  it.each([
    ["expect('a').toBe('a');", "same string both sides"],
    ["expect('x').toBeTrue();", "truthiness on a non-empty literal"],
  ])("fires via the raw-text pass for %s (%s)", (snippet) => {
    const text = `test('t', () => {\n  ${snippet}\n  expect(1 + 1).toBe(2);\n});\n`;
    const findings = tautologicalAssertion.run(ctxOf(text));
    expect(findings).toHaveLength(1);
  });

  it.each([
    ["expect('').toBeTrue();", "empty literal is not a truthiness tautology"],
    ["expect('a').toBe('b');", "different literals are not tautological"],
  ])("stays silent for %s (%s)", (snippet) => {
    const text = `test('t', () => {\n  ${snippet}\n  expect(1 + 1).toBe(2);\n});\n`;
    expect(tautologicalAssertion.run(ctxOf(text))).toEqual([]);
  });
});

describe("QA-CI-005: report-never-generated guards", () => {
  function ciCtx(yaml: string) {
    return {
      path: ".github/workflows/ci.yml",
      text: yaml,
      ast: parseWorkflow(yaml),
    };
  }

  it("ignores jobs without any consumption signal", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - run: npm ci\n      - run: npm test\n";
    expect(reportNeverGenerated.run(ciCtx(y))).toEqual([]);
  });

  it("recognizes a coverage artifact upload via with.path", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - uses: actions/upload-artifact@v4\n" +
      "        with:\n          path: coverage/lcov.info\n      - run: npm test\n";
    const findings = reportNeverGenerated.run(ciCtx(y));
    expect(findings.length).toBe(1);
    expect(findings[0]?.message).toContain("coverage artifact");
  });

  it("recognizes a codecov upload without a producer", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - uses: codecov/codecov-action@v4\n      - run: npm test\n";
    // Both consumer entries (artifact-style and upload-style) match here.
    const findings = reportNeverGenerated.run(ciCtx(y));
    expect(findings).toHaveLength(2);
  });

  it("stays silent when a step actually produces coverage", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - run: npx vitest run --coverage\n" +
      "      - uses: codecov/codecov-action@v4\n";
    expect(reportNeverGenerated.run(ciCtx(y))).toEqual([]);
  });

  it("skips null step entries without crashing", () => {
    const y = "jobs:\n  e2e:\n    steps:\n      -\n      - run: npm test\n";
    expect(() => reportNeverGenerated.run(ciCtx(y))).not.toThrow();
  });
});

describe("QA-CI-009: exit-code guards", () => {
  function ciCtx(yaml: string) {
    return {
      path: ".github/workflows/ci.yml",
      text: yaml,
      ast: parseWorkflow(yaml),
    };
  }

  it("skips `;` sequences where the test command runs last", () => {
    const y = "jobs:\n  e2e:\n    steps:\n      - run: npm ci; npm test\n";
    expect(exitCodeNotPropagated.run(ciCtx(y))).toEqual([]);
  });

  it("flags a `;` sequence whose tail decides the exit code", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - run: npm test; npm run lint\n";
    const findings = exitCodeNotPropagated.run(ciCtx(y));
    expect(findings.length).toBe(1);
    expect(findings[0]?.message).toContain("sequences commands with `; `");
  });

  it("skips `;` sequences guarded by errexit", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - run: set -e; npm test; echo done\n";
    expect(exitCodeNotPropagated.run(ciCtx(y))).toEqual([]);
  });

  it("stays silent when there is nothing to mask", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - run: npm test\n      - run: echo done\n";
    expect(exitCodeNotPropagated.run(ciCtx(y))).toEqual([]);
  });
});

describe("QA-CI-001: step labels and line fallbacks", () => {
  function ciCtx(yaml: string) {
    return {
      path: ".github/workflows/deploy.yml",
      text: yaml,
      ast: parseWorkflow(yaml),
    };
  }

  it("labels the offending step by its name", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - name: Run suite\n        run: npm test\n" +
      "        continue-on-error: true\n";
    const findings = continueOnError.run(ciCtx(y));
    expect(findings.length).toBe(1);
    expect(findings[0]?.message).toContain("Run suite");
  });

  it("labels a nameless step by its run line", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - run: npm test\n        continue-on-error: true\n";
    const findings = continueOnError.run(ciCtx(y));
    expect(findings.length).toBe(1);
    expect(findings[0]?.message).toContain("npm test");
  });

  it("labels a run-less gate step by index", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - uses: myorg/playwright-runner@v1\n        continue-on-error: true\n";
    const findings = continueOnError.run(ciCtx(y));
    expect(findings.length).toBe(1);
    expect(findings[0]?.message).toMatch(/#\d/);
  });

  it("stays silent when a best-effort step carries continue-on-error", () => {
    const y =
      "jobs:\n  e2e:\n    steps:\n      - uses: actions/upload-artifact@v4\n        continue-on-error: true\n      - run: npm test\n";
    expect(continueOnError.run(ciCtx(y))).toEqual([]);
  });

  it("survives a workflow whose continue-on-error is detached from any gate", () => {
    const y = "continue-on-error: true\n";
    expect(() => continueOnError.run(ciCtx(y))).not.toThrow();
  });
});

describe("QA-PW-144: single-browser naming", () => {
  it("names the chromium engine in the message", () => {
    const cfg =
      "import { defineConfig } from '@playwright/test';\n" +
      "export default defineConfig({ projects: [{ name: 'chromium' }] });\n";
    const findings = pwSingleBrowserMatrix.run(
      ctxOf(cfg, undefined, "playwright.config.ts"),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("chromium");
  });

  it("names webkit and firefox via browserName entries", () => {
    const webkit =
      "import { defineConfig } from '@playwright/test';\n" +
      "export default defineConfig({ projects: [{ name: 'webkit-check', use: { browserName: 'webkit' } }] });\n";
    const f1 = pwSingleBrowserMatrix.run(
      ctxOf(webkit, undefined, "playwright.config.ts"),
    );
    expect(f1).toHaveLength(1);
    expect(f1[0]?.message).toContain("webkit");
    const firefox =
      "import { defineConfig } from '@playwright/test';\n" +
      "export default defineConfig({ projects: [{ name: 'firefox-check', use: { browserName: 'firefox' } }] });\n";
    const f2 = pwSingleBrowserMatrix.run(
      ctxOf(firefox, undefined, "playwright.config.ts"),
    );
    expect(f2).toHaveLength(1);
    expect(f2[0]?.message).toContain("firefox");
  });

  it("falls back to the generic label for an engineless name", () => {
    const cfg =
      "import { defineConfig } from '@playwright/test';\n" +
      "export default defineConfig({ projects: [{ name: 'api-suite' }] });\n";
    const findings = pwSingleBrowserMatrix.run(
      ctxOf(cfg, undefined, "playwright.config.ts"),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("a single");
  });

  it("names mobile devices as the engine", () => {
    const cfg =
      "import { defineConfig } from '@playwright/test';\n" +
      "export default defineConfig({ projects: [{ name: 'iPhone 13' }] });\n";
    const findings = pwSingleBrowserMatrix.run(
      ctxOf(cfg, undefined, "playwright.config.ts"),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("mobile-device");
  });

  it("stays silent for multi-project configs and non-config paths", () => {
    const cfg =
      "import { defineConfig } from '@playwright/test';\n" +
      "export default defineConfig({ projects: [{ name: 'chromium' }, { name: 'firefox' }] });\n";
    expect(
      pwSingleBrowserMatrix.run(ctxOf(cfg, undefined, "playwright.config.ts")),
    ).toEqual([]);
    expect(
      pwSingleBrowserMatrix.run(ctxOf(cfg, undefined, "other.config.ts")),
    ).toEqual([]);
  });
});
