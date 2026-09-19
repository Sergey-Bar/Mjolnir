/** Final rule-arm probes promoted to real assertions. */
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { brittleSelectors } from "../../src/rules/playwright/qa-pw-004-brittle-selectors.js";
import { pwDeepFrameLocator } from "../../src/rules/playwright/qa-pw-113-deep-frames.js";
import { pwGlobalSetupSharedState } from "../../src/rules/playwright/qa-pw-125-global-setup.js";
import { qaPw140 } from "../../src/rules/playwright/qa-pw-140.js";
import { jvNoAssertions } from "../../src/rules/java/qa-jv-103-no-assertions.js";
import { csNoAssertions } from "../../src/rules/csharp/qa-cs-103-no-assertions.js";
import { pyNoAssertions } from "../../src/rules/python/qa-py-003-no-assertions.js";
import { parseTsSourceFile } from "../helpers/ts-ast-helper.js";
import { hardcodedBaseUrl } from "../../src/rules/playwright/qa-pw-123-hardcoded-url.js";
import { pwBlanketRouteMock } from "../../src/rules/playwright/qa-pw-142-blanket-route.js";
import { emptyTestBody } from "../../src/rules/test/qa-test-010-empty-body.js";
import { computeCodeText } from "../../src/engine/code-text.js";
import { explainRule } from "../../src/commands/explain.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "mjolnir-sweep3-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("rule-arm completion", () => {
  it("QA-PW-140: nested parens inside a screenshot call keep depth accounting", () => {
    const findings = qaPw140.run({
      path: "a.spec.ts",
      text: "await expect(page).toHaveScreenshot({ mask: [page.locator(fn((x)))] });\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("QA-JV-103: nested braces inside a java test body keep depth accounting", () => {
    const findings = jvNoAssertions.run({
      path: "T.java",
      text: "class T {\n  @Test\n  void t() { if (x) { fn((x); } }\n}\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("QA-CS-103: nested braces inside a csharp test body keep depth accounting", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: "class T {\n  [Test]\n  public void T() { if (x) { fn((x); } }\n}\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("QA-PY-003: same-line python body is bounded by the newline", () => {
    expect(
      pyNoAssertions.run({
        path: "test_x.py",
        text: "def test_x(): page.goto('/a')\nassert True\n",
      }),
    ).toHaveLength(1);
    expect(
      pyNoAssertions.run({
        path: "test_x.py",
        text: "def test_x(): page.goto('/a')",
      }),
    ).toHaveLength(1);
  });

  it("QA-PW-125: flags a destructive statement on the last line of a setup file", () => {
    const findings = pwGlobalSetupSharedState.run({
      path: "playwright.config.ts",
      text:
        "import { defineConfig } from '@playwright/test';\n" +
        "globalSetup: './setup.ts'\n" +
        'await query("DROP TABLE users")',
    });
    expect(findings).toHaveLength(1);
  });

  it.each([
    "../config/fixture-typecheck-gate.spec.ts",
    "./rule-arm-completion.spec.ts",
  ])("QA-PW-125: fixture source in %s is not executed", (relativePath) => {
    const text = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    const path = "fixture-author.spec.ts";
    expect(
      pwGlobalSetupSharedState.run({
        path,
        text,
        codeText: computeCodeText({ path, text }, "typescript"),
      }),
    ).toEqual([]);
  });

  it("QA-PW-125: replays every classified mutation at its recorded location", () => {
    const verdicts = readFileSync(
      new URL("../corpus/verdicts/positive-fixtures.jsonl", import.meta.url),
      "utf8",
    )
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line) as {
            ruleId: string;
            file: string;
            line: number;
            verdict: string;
          },
      )
      .filter((row) => row.ruleId === "QA-PW-125");
    expect(verdicts).toHaveLength(10);
    for (const row of verdicts) {
      expect(row.verdict).toBe("TP");
      const text = readFileSync(
        new URL(`../corpus/positive-fixtures/${row.file}`, import.meta.url),
        "utf8",
      );
      const findings = pwGlobalSetupSharedState.run({
        path: row.file,
        text,
        codeText: computeCodeText({ path: row.file, text }, "typescript"),
      });
      expect(findings, row.file).toHaveLength(1);
      expect(findings[0]).toMatchObject({ file: row.file, line: row.line });
    }
  });

  it.each([
    'await query("DROP TABLE users")',
    'execSync("npx prisma migrate deploy")',
    "spawn(`seed shared-db`)",
  ])(
    "QA-PW-125: live mutation remains visible with masked arguments: %s",
    (text) => {
      const path = "global-setup.ts";
      const findings = pwGlobalSetupSharedState.run({
        path,
        text,
        codeText: computeCodeText({ path, text }, "typescript"),
      });
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        file: path,
        line: 1,
        column: text.startsWith("await") ? 7 : 1,
      });
    },
  );

  it.each([
    '// execSync("npx prisma migrate deploy")',
    '/* query("DROP TABLE users") */',
    'const sample = `execSync("npx prisma migrate deploy")`;',
    "const sample = 'await query(\"DROP TABLE users\")';",
  ])("QA-PW-125: setup-file prose is not a live call: %s", (text) => {
    const path = "global-setup.ts";
    expect(
      pwGlobalSetupSharedState.run({
        path,
        text,
        codeText: computeCodeText({ path, text }, "typescript"),
      }),
    ).toEqual([]);
  });

  it("QA-PW-113: frame-locator chains without nesting score zero depth", () => {
    expect(
      pwDeepFrameLocator.run({
        path: "a.spec.ts",
        text: "test('a', () => { page.frameLocator('#f').locator('button'); });\n",
      }),
    ).toEqual([]);
  });

  it("QA-PW-004: CRLF comment and template lines are blanked without eating the newline", () => {
    const text =
      "test('a', () => {\r\n  /* await page.locator('.a.b').click();\r\n  spanning two lines */\r\n  await expect(page).toHaveURL('/x');\r\n});\r\n";
    expect(
      brittleSelectors.run({
        path: "a.spec.ts",
        text,
        ast: parseTsSourceFile(text),
      }),
    ).toEqual([]);
  });

  it.each([
    [
      "QA-PW-123",
      hardcodedBaseUrl,
      "const s = \"page.goto('https://example.com')\";\n",
    ],
    ["QA-PW-142", pwBlanketRouteMock, "const s = \"page.route('**', h)\";\n"],
    ["QA-TEST-010", emptyTestBody, "const s = \"it('a', () => {})\";\n"],
  ])(
    "%s: a call written as string data with nested quotes is skipped",
    (_id, rule, text) => {
      expect(
        rule.run({
          path: "a.spec.ts",
          text,
          codeText: computeCodeText({ path: "a.spec.ts", text }, "typescript"),
        }),
      ).toEqual([]);
    },
  );

  it("explain degrades for a CI rule whose fixture YAML is malformed", () => {
    mkdirSync(join(root, "tests", "fixtures", "QA-CI-001", "must-fire"), {
      recursive: true,
    });
    writeFileSync(
      join(root, "tests", "fixtures", "QA-CI-001", "must-fire", "bad.yml"),
      "{[[[[\n",
    );
    const result = explainRule("QA-CI-001", join(root, "tests", "fixtures"));
    expect(result.ok).toBe(true);
    expect(result.exampleFinding).toBeUndefined();
  });
});
