/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Coverage-completion round 2 (Phase 5–8, CI 100% per-file gate):
 * remaining measured-uncovered branches — the per-file tag derivation
 * through runRules with REAL parses (all tag-pattern arms), the §11.2
 * measurement helpers, and the adapters' framework-filter continue path.
 */

import {
  parseCSharpAst,
  parseJavaAst,
  _resetForTests,
} from "../src/engine/tree-sitter-ast.js";
import type { Tree } from "web-tree-sitter";
import { afterEach, describe, expect, it } from "vitest";

import { javaAdapter } from "../src/adapters/java.js";
import { csharpAdapter } from "../src/adapters/csharp.js";
import { pythonAdapter, pythonFileTags } from "../src/adapters/python.js";
import {
  typescriptAdapter,
  frameworkTagsFromImports,
} from "../src/adapters/typescript.js";
import {
  declaredDetectorRevision,
  effectiveTier,
  hasStaleMeasurement,
  hasValidMeasurement,
  measurementFor,
} from "../src/rules/measurement.js";
import type { QADoctorRule } from "../src/rules/rule.js";

const trees: Tree[] = [];

afterEach(() => {
  _resetForTests();
  for (const t of trees) t.delete();
  trees.length = 0;
});

function frule(
  id: string,
  frameworks: string[],
): { runs: number; rule: Parameters<typeof javaAdapter.runRules>[0][number] } {
  const state = { runs: 0 };
  return {
    get runs() {
      return state.runs;
    },
    rule: {
      id,
      category: "QA-PW",
      appliesTo: ["java", "csharp", "python", "typescript"],
      frameworks,
      run: (ctx) => {
        state.runs++;
        void ctx;
        return [];
      },
    },
  };
}

describe("java adapter — every tag pattern via runRules + real parses", () => {
  it("junit AND testng imports both tag; a cypress-framed rule is filtered", async () => {
    const text =
      "import org.junit.jupiter.api.Test;\nimport org.testng.annotations.Test;\nclass T { @Test public void m() {} }\n";
    const tree = await parseJavaAst(text);
    trees.push(tree!);
    const f = frule("R1", ["cypress"]);
    javaAdapter.runRules(
      [f.rule],
      { path: "T.java", text, ast: tree! },
      () => {},
      undefined,
      undefined,
    );
    expect(f.runs).toBe(0);
  });

  it("selenium import intersects a selenium-framed rule", async () => {
    const text = "import org.openqa.selenium.By;\nclass T { void m() {} }\n";
    const tree = await parseJavaAst(text);
    trees.push(tree!);
    const f = frule("R2", ["selenium"]);
    javaAdapter.runRules(
      [f.rule],
      { path: "T.java", text, ast: tree! },
      () => {},
      undefined,
      undefined,
    );
    expect(f.runs).toBe(1);
  });

  it("playwright import intersects a playwright-framed rule", async () => {
    const text =
      "import com.microsoft.playwright.Page;\nclass T { void m() {} }\n";
    const tree = await parseJavaAst(text);
    trees.push(tree!);
    const f = frule("R3", ["playwright"]);
    javaAdapter.runRules(
      [f.rule],
      { path: "T.java", text, ast: tree! },
      () => {},
      undefined,
      undefined,
    );
    expect(f.runs).toBe(1);
  });
});

describe("csharp adapter — every tag pattern via runRules + real parses", () => {
  it.each([
    ["using NUnit.Framework;", "nunit"],
    ["using Xunit;", "xunit"],
    ["using Microsoft.VisualStudio.TestTools.UnitTesting;", "mstest"],
    ["using OpenQA.Selenium;", "selenium"],
    ["using Microsoft.Playwright;", "playwright"],
    ["using Shouldly;", "shouldly"],
    ["using FluentAssertions;", "shouldly"],
  ])("%s tags %s", async (usingLine, tag) => {
    const text = `${usingLine}\nclass T { void M() {} }\n`;
    const tree = await parseCSharpAst(text);
    trees.push(tree!);
    const f = frule(`R-${tag}`, [tag]);
    csharpAdapter.runRules(
      [f.rule],
      { path: "T.cs", text, ast: tree! },
      () => {},
      undefined,
      undefined,
    );
    expect(f.runs).toBe(1);
  });

  it("a cypress-framed rule is filtered on a nunit-tagged file", async () => {
    const text = "using NUnit.Framework;\nclass T { void M() {} }\n";
    const tree = await parseCSharpAst(text);
    trees.push(tree!);
    const f = frule("R-CYP", ["cypress"]);
    csharpAdapter.runRules(
      [f.rule],
      { path: "T.cs", text, ast: tree! },
      () => {},
      undefined,
      undefined,
    );
    expect(f.runs).toBe(0);
  });
});

describe("python adapter — import forms", () => {
  it("plain `import pytest` tags pytest (PY-003 no-assertions surface)", () => {
    expect(
      pythonFileTags({ path: "test_a.py", text: "import pytest\n" }),
    ).toEqual(["pytest"]);
  });

  it("`from x import y` tags the module prefix", () => {
    expect(
      pythonFileTags({
        path: "test_a.py",
        text: "from selenium.webdriver import By\n",
      }),
    ).toEqual(["selenium"]);
  });

  it("no recognized module → empty tags → open-when-unknown through runRules", () => {
    let runs = 0;
    pythonAdapter.runRules(
      [
        {
          id: "R",
          category: "QA-TEST",
          appliesTo: ["python"],
          frameworks: ["pytest"],
          run: () => {
            runs++;
            return [];
          },
        },
      ],
      {
        path: "test_a.py",
        text: "import collections\n\ndef test_a():\n    pass\n",
      },
      () => {},
      undefined,
      undefined,
    );
    expect(runs).toBe(1);
  });

  it("a pytest-tagged file skips a rule framed for a different framework (filter skip arm)", () => {
    let ran = 0;
    pythonAdapter.runRules(
      [
        {
          id: "R-UNI",
          category: "QA-TEST",
          appliesTo: ["python"],
          frameworks: ["unittest"],
          run: () => {
            ran++;
            return [];
          },
        },
      ],
      { path: "test_a.py", text: "import pytest\n\ndef test_a():\n    pass\n" },
      () => {},
      undefined,
      undefined,
    );
    expect(ran).toBe(0);
  });
});

describe("typescript adapter — frameworkTagsFromImports arms", () => {
  it("every declared IMPORT_TAG_RULES tag fires", () => {
    expect(
      frameworkTagsFromImports('import { test } from "@playwright/test";'),
    ).toEqual(["playwright"]);
    expect(
      frameworkTagsFromImports('import { chromium } from "playwright";'),
    ).toEqual(["playwright"]);
    expect(frameworkTagsFromImports('import "cypress";')).toEqual(["cypress"]);
    expect(
      frameworkTagsFromImports('import { describe } from "vitest";'),
    ).toEqual(["vitest"]);
    expect(
      frameworkTagsFromImports('import { describe } from "@jest/globals";'),
    ).toEqual(["jest"]);
    expect(
      frameworkTagsFromImports('import { mount } from "@vue/test-utils";'),
    ).toEqual(["vitest"]);
    expect(
      frameworkTagsFromImports('import { Builder } from "selenium-webdriver";'),
    ).toEqual(["selenium"]);
    expect(
      frameworkTagsFromImports('import { remote } from "webdriverio";'),
    ).toEqual(["webdriverio"]);
    expect(
      frameworkTagsFromImports('import puppeteer from "puppeteer";'),
    ).toEqual(["puppeteer"]);
  });

  it("runRules continues past the filter: a playwright-tagged spec runs a playwright-framed rule", () => {
    let runs = 0;
    typescriptAdapter.runRules(
      [
        {
          id: "R",
          category: "QA-PW",
          appliesTo: ["typescript"],
          frameworks: ["playwright"],
          run: () => {
            runs++;
            return [];
          },
        },
      ],
      { path: "a.spec.ts", text: 'import { test } from "@playwright/test";\n' },
      () => {},
      undefined,
      undefined,
    );
    expect(runs).toBe(1);
  });
});

// ─── §11.2 measurement helpers — the unmeasured function ────────────

function fakeRule(
  id: string,
  detectorRevision?: number,
  tier?: "core" | "extended" | "quarantine",
): QADoctorRule {
  return {
    id,
    category: "QA-TEST",
    title: id,
    severity: "info",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    appliesTo: "test-files",
    ...(detectorRevision !== undefined ? { detectorRevision } : {}),
    ...(tier !== undefined ? { tier } : {}),
    run: () => [],
  };
}

describe("measurement helpers (§11.2/§07)", () => {
  it("declaredDetectorRevision: omitted → 1; declared → the value", () => {
    expect(declaredDetectorRevision(fakeRule("X"))).toBe(1);
    expect(declaredDetectorRevision(fakeRule("X", 3))).toBe(3);
  });

  it("measurementFor: known rule → its record; unknown → undefined", () => {
    expect(measurementFor("QA-JV-103")).toBeDefined();
    expect(measurementFor("QA-JV-103")?.n).toBeGreaterThanOrEqual(10);
    expect(measurementFor("QA-NOPE-000")).toBeUndefined();
  });

  it("hasValidMeasurement: revision match → true; mismatch → false", () => {
    // QA-JV-103 is measured at rev 2 in the committed sidecar.
    expect(hasValidMeasurement(fakeRule("QA-JV-103", 2))).toBe(true);
    expect(hasValidMeasurement(fakeRule("QA-JV-103", 1))).toBe(false);
  });

  it("hasStaleMeasurement: mismatch → true; match or unknown → false", () => {
    expect(hasStaleMeasurement(fakeRule("QA-JV-103", 1))).toBe(true);
    expect(hasStaleMeasurement(fakeRule("QA-JV-103", 2))).toBe(false);
    expect(hasStaleMeasurement(fakeRule("QA-NOPE-000", 1))).toBe(false);
  });

  it("effectiveTier: omitted tier → measurement-dependent default", () => {
    // Measured-at-current-rev rule with no declared tier → core.
    expect(effectiveTier(fakeRule("QA-JV-103", 2))).toBe("core");
    // Unknown rule (no measurement) with no declared tier → extended.
    expect(effectiveTier(fakeRule("QA-NOPE-000"))).toBe("extended");
    // Declared tier always wins.
    expect(
      effectiveTier(fakeRule("QA-NOPE-000", undefined, "quarantine")),
    ).toBe("quarantine");
  });
});
