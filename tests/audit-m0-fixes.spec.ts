/**
 * Regression tests for the rules/adapters deep-audit findings (plan M0,
 * folded into Phase B3 per the bug-audit-ci-hardening plan). Each test
 * names the finding it locks in.
 */

import { describe, expect, it } from "vitest";
import { unawaitedPromiseAssertion } from "../src/rules/quality/qa-tqual-009-promise-assertion.js";
import { tautologicalAssertion } from "../src/rules/quality/qa-tqual-002-tautological.js";
import { hardSleep } from "../src/rules/test/qa-test-004-hard-sleep.js";
import { noAssertions } from "../src/rules/test/qa-test-003-no-assertions.js";
import { skippedTest } from "../src/rules/test/qa-test-002-skipped-test.js";
import { retryAbuse } from "../src/rules/test/qa-test-006-retry-abuse.js";
import { unawaitedLocatorAssertion } from "../src/rules/playwright/qa-pw-002-unawaited-assertion.js";
import { pwSerialNoJustification } from "../src/rules/playwright/qa-pw-117-serial.js";
import { reportNeverGenerated } from "../src/rules/ci/qa-ci-005-report-never-generated.js";
import { exitCodeNotPropagated } from "../src/rules/ci/qa-ci-009-exit-code.js";
import { pyPwNoAssertions } from "../src/rules/python/qa-py-105-pw-no-assertions.js";
import { pyMutableFixture } from "../src/rules/python/qa-py-011-mutable-fixture.js";
import { colAt } from "../src/rules/shared/positions.js";

describe("M0 #1 (HIGH): QA-TQUAL-009 must not hang on a .then( line-initial chain", () => {
  const text =
    'it("x", () => {\n' +
    '  fetch("/api")\n' +
    "  .then(r => expect(r.ok).toBe(true));\n" +
    "});\n";

  it("terminates and still reports the unawaited chain", () => {
    // The old walk re-assigned `stmtStart = lineStart` on every iteration
    // when the `.then(` was the first token on its line — an infinite
    // loop that hung the whole scan (vitest's own timeout is the guard).
    const findings = unawaitedPromiseAssertion.run({
      path: "a.spec.ts",
      text,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(3);
  });

  it("still walks `await`/`return` heads above the chain", () => {
    const awaited = `it("x", async () => {\n  await fetch("/api")\n  .then(r => expect(r.ok).toBe(true));\n});\n`;
    expect(
      unawaitedPromiseAssertion.run({ path: "a.spec.ts", text: awaited }),
    ).toHaveLength(0);
  });
});

describe("M0 #2: QA-TEST-004 reports one finding per call, not per overlapping pattern", () => {
  it("does not double-report `await new Promise(r => setTimeout(r, 500))`", () => {
    const text = `it("x", async () => {\n  await new Promise(r => setTimeout(r, 500));\n});\n`;
    const findings = hardSleep.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
  });

  it("does not double-report `await delay(500)`", () => {
    const text = `it("x", async () => {\n  await delay(500);\n});\n`;
    const findings = hardSleep.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
  });
});

describe("M0 #3: QA-TQUAL-002 detects string-literal tautologies (dead regex branch)", () => {
  it("flags expect('foo').toBe('foo')", () => {
    const text = `it("x", () => {\n  expect('foo').toBe('foo');\n});\n`;
    const findings = tautologicalAssertion.run({
      path: "a.spec.ts",
      text,
      codeText: text.replaceAll("'", " "),
    });
    expect(findings).toHaveLength(1);
  });

  it("stays silent when the tautology is documentation inside a string", () => {
    const text = `it("x", () => {\n  const doc = "expect('foo').toBe('foo') is a tautology";\n});\n`;
    const codeText =
      'it("x", () => {\n  const doc = ' + " ".repeat(44) + ";\n});\n";
    const findings = tautologicalAssertion.run({
      path: "a.spec.ts",
      text,
      codeText,
    });
    expect(findings).toHaveLength(0);
  });

  it("still flags expect(true).toBe(true) via the masked view", () => {
    const text = `it("x", () => {\n  expect(true).toBe(true);\n});\n`;
    expect(
      tautologicalAssertion.run({ path: "a.spec.ts", text, codeText: text }),
    ).toHaveLength(1);
  });
});

describe("M0 #4: QA-TEST-003 scans function() bodies and no longer exempts a bare return", () => {
  it("flags an assertion-free function()-form test", () => {
    const text = `it("loads", function () {\n  await page.goto("/");\n});\n`;
    const findings = noAssertions.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
  });

  it("a bare `return;` does not exempt an assertion-free test", () => {
    const text = `it("loads", async () => {\n  await page.goto("/");\n  return;\n});\n`;
    const findings = noAssertions.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
  });

  it("the chai-as-promised exemption still holds: return expect(...)", () => {
    const text = `it("loads", async () => {\n  return expect(page.title()).resolves.toBe("x");\n});\n`;
    const findings = noAssertions.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(0);
  });
});

describe("M0 #13: QA-TEST-002 has no dead it.todo pattern", () => {
  it("it.todo is intentionally unreported", () => {
    const text = `it.todo("someday");\n`;
    expect(skippedTest.run({ path: "a.spec.ts", text })).toHaveLength(0);
  });
});

describe("M0 #8: QA-TEST-006 flags retries: 10 (two-digit retry counts)", () => {
  it("retries: 10 is flagged — worse than retries: 2", () => {
    const text = `export default { retries: 10 };\n`;
    const findings = retryAbuse.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("10");
  });

  it("retries: 1 stays allowed", () => {
    expect(
      retryAbuse.run({
        path: "a.spec.ts",
        text: `export default { retries: 1 };`,
      }),
    ).toHaveLength(0);
  });
});

describe("M0 #7: QA-PW-002 does not flag runner-awaited `return expect(...)`", () => {
  const AST_PATHS = ["x.spec.ts"];

  function runWithAst(text: string) {
    return unawaitedLocatorAssertion.run({
      path: AST_PATHS[0] ?? "x.spec.ts",
      text,
    });
  }

  it("return expect(locator).toBeVisible() is accepted", () => {
    const text = `test("x", async ({ page }) => {\n  return expect(page.locator(".x")).toBeVisible();\n});\n`;
    expect(runWithAst(text)).toHaveLength(0);
  });

  it("a truly unawaited assertion is still flagged", () => {
    const text = `test("x", async ({ page }) => {\n  expect(page.locator(".x")).toBeVisible();\n});\n`;
    expect(runWithAst(text).length).toBeGreaterThan(0);
  });
});

describe("M0 #9: QA-PW-117 sees a same-line justification", () => {
  it("test.describe.serial with an inline justification is not flagged", () => {
    const text = `test.describe.serial(() => { /* order matters: shared queue */ });\n`;
    expect(
      pwSerialNoJustification.run({ path: "a.spec.ts", text }),
    ).toHaveLength(0);
  });

  it("no justification anywhere still flags", () => {
    const text = `test.describe.serial(() => {\n  test("a", () => {});\n});\n`;
    expect(
      pwSerialNoJustification.run({ path: "a.spec.ts", text }).length,
    ).toBeGreaterThan(0);
  });
});

describe("M0 #5: QA-CI-005 accepts the canonical split-job coverage layout", () => {
  const splitLayout = {
    jobs: {
      test: {
        steps: [{ run: "npm test -- --coverage" }],
      },
      upload: {
        steps: [
          {
            uses: "codecov/codecov-action@abc123",
          },
        ],
      },
    },
  };

  it("production in one job, consumption in another — no finding", () => {
    expect(
      reportNeverGenerated.run({
        path: ".github/workflows/ci.yml",
        text: "jobs: …",
        ast: splitLayout,
      }),
    ).toHaveLength(0);
  });

  it("a coverage upload with NO producer anywhere is still flagged", () => {
    const findings = reportNeverGenerated.run({
      path: ".github/workflows/ci.yml",
      text: "jobs: …",
      ast: {
        jobs: {
          upload: { steps: [{ uses: "codecov/codecov-action@abc123" }] },
        },
      },
    });
    // Both consumer patterns (artifact upload + upload action) match —
    // pre-existing behavior; the point is that it still fires.
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});

describe("M0 #6: QA-CI-009 honors set -e for `;`-sequenced commands", () => {
  it("`set -e` + `npm test; echo done` is not flagged", () => {
    const doc = {
      jobs: {
        t: {
          steps: [{ run: "set -e\nnpm test; echo done" }],
        },
      },
    };
    expect(
      exitCodeNotPropagated.run({
        path: ".github/workflows/ci.yml",
        text: "…",
        ast: doc,
      }),
    ).toHaveLength(0);
  });

  it("without set -e the `;`-sequence is still flagged", () => {
    const doc = {
      jobs: {
        t: {
          steps: [{ run: "npm test; echo done" }],
        },
      },
    };
    expect(
      exitCodeNotPropagated.run({
        path: ".github/workflows/ci.yml",
        text: "…",
        ast: doc,
      }).length,
    ).toBeGreaterThan(0);
  });
});

describe("M0 #10: QA-PY-105 scopes the page: Page annotation to the test's own signature", () => {
  it("a pure unit test is not branded by another test's page: Page annotation", () => {
    const text =
      "from playwright.sync_api import Page, expect\n" +
      "\n" +
      "def test_ui(page: Page):\n" +
      "    page.goto('https://x')\n" +
      "\n" +
      "def test_parse_config():\n" +
      "    load_config()\n";
    const findings = pyPwNoAssertions.run({ path: "t.py", text });
    expect(findings.map((f) => f.message)).toHaveLength(1);
    expect(findings[0]?.message).toContain("test_ui");
  });
});

describe("M0 #11: QA-PY-011 flags non-empty mutable returns in shared fixtures", () => {
  it("return [1, 2] in a session-scoped fixture is flagged", () => {
    const text =
      '@pytest.fixture(scope="session")\ndef data():\n    return [1, 2]\n';
    expect(pyMutableFixture.run({ path: "conftest.py", text })).toHaveLength(1);
  });

  it("return dict(...) in a session-scoped fixture is flagged", () => {
    const text =
      '@pytest.fixture(scope="session")\ndef cfg():\n    return dict(defaults)\n';
    expect(pyMutableFixture.run({ path: "conftest.py", text })).toHaveLength(1);
  });
});

describe("M0 #12: colAt never returns a negative column at offset 0", () => {
  it("a match at offset 0 in a file ending with a newline gives column 1", () => {
    const text = "page = browser.new_page()\n";
    expect(colAt(text, 0)).toBe(1);
  });

  it("columns stay exact mid-file", () => {
    const text = "abc\ndef\n";
    expect(colAt(text, 4)).toBe(1);
    expect(colAt(text, 6)).toBe(3);
  });
});
