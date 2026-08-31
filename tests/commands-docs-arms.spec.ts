/**
 * Phase 1 coverage: explain.ts, rule-docs.ts and fixture-example.ts
 * residual arms — honest degradation when fixtures are missing, empty,
 * unreadable, or unparseable, and the metadata-optional rendering paths.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { explainRule, renderExplain } from "../src/commands/explain.js";
import {
  collectRuleDocData,
  renderRuleDocMd,
} from "../src/commands/rule-docs.js";
import { firstFixtureFile } from "../src/commands/fixture-example.js";
import { getRule } from "../src/rules/index.js";
import type { QADoctorRule } from "../src/rules/rule.js";

let root: string;
let fixturesRoot: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "mjolnir-docs-arms-"));
  fixturesRoot = join(root, "tests", "fixtures");
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function minimalRule(overrides: Partial<QADoctorRule>): QADoctorRule {
  return {
    id: "QA-TEST-900",
    category: "QA-TEST",
    title: "Probe rule",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    appliesTo: "test-files",
    run: () => [],
    ...overrides,
  };
}

describe("firstFixtureFile", () => {
  it("returns null for an absent or empty fixture directory", () => {
    expect(firstFixtureFile(join(root, "nope"))).toBeNull();
    const empty = join(root, "empty-must-fire");
    mkdirSync(empty, { recursive: true });
    expect(firstFixtureFile(empty)).toBeNull();
  });

  it("skips dot-entries and sorts byte-stably", () => {
    const dir = join(root, "mf");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, ".hidden.ts"), "x");
    writeFileSync(join(dir, "b.spec.ts"), "x");
    writeFileSync(join(dir, "a.spec.ts"), "x");
    expect(firstFixtureFile(dir)).toBe(join(dir, "a.spec.ts"));
  });
});

describe("explainRule degradation", () => {
  it("returns ok without an example when the must-fire dir is empty", () => {
    mkdirSync(join(fixturesRoot, "QA-TEST-001", "must-fire"), {
      recursive: true,
    });
    const result = explainRule("QA-TEST-001", fixturesRoot);
    expect(result.ok).toBe(true);
    expect(result.exampleFinding).toBeUndefined();
  });

  it("returns ok without an example when the fixture entry is unreadable", () => {
    // A subdirectory inside must-fire passes the file listing but cannot
    // be read as text — degradation, not a crash.
    mkdirSync(join(fixturesRoot, "QA-TEST-001", "must-fire", "sub"), {
      recursive: true,
    });
    const result = explainRule("QA-TEST-001", fixturesRoot);
    expect(result.ok).toBe(true);
    expect(result.exampleFinding).toBeUndefined();
  });

  it("returns ok without an example when the rule finds nothing", () => {
    mkdirSync(join(fixturesRoot, "QA-TEST-003", "must-fire"), {
      recursive: true,
    });
    // QA-TEST-003 (no assertions) fires on test bodies without expects —
    // this fixture has one, so the run yields zero findings.
    writeFileSync(
      join(fixturesRoot, "QA-TEST-003", "must-fire", "clean.spec.ts"),
      "it('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    const result = explainRule("QA-TEST-003", fixturesRoot);
    expect(result.ok).toBe(true);
    expect(result.exampleFinding).toBeUndefined();
  });
});

describe("renderExplain metadata-optional paths", () => {
  it("omits language/framework rows and labels the example path unknown", () => {
    const rule = minimalRule({});
    const text = renderExplain({
      ok: true,
      rule,
      exampleFinding: {
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        file: "a.spec.ts",
        line: 1,
        column: 1,
        message: "probe",
        why: "why",
        fix: "fix",
        qaImpact: "HYGIENE",
      },
      // exampleFixturePath deliberately absent — the ?? fallback renders.
    });
    expect(text).not.toContain("Languages:");
    expect(text).not.toContain("Frameworks:");
    expect(text).not.toContain("FP risk:");
    expect(text).toContain("(unknown path)");
  });
});

describe("collectRuleDocData degradation", () => {
  it("keeps the fixture path without a finding when the fixture is unreadable", () => {
    const rule = getRule("QA-TEST-001");
    expect(rule).toBeDefined();
    mkdirSync(join(fixturesRoot, "QA-TEST-001", "must-fire", "sub"), {
      recursive: true,
    });
    const data = collectRuleDocData(rule as QADoctorRule, fixturesRoot);
    expect(data.mustFire.fixturePath).toContain("must-fire");
    expect(data.mustFire.finding).toBeUndefined();
  });

  it("keeps the fixture path without a finding when workflow YAML is malformed", () => {
    const rule = getRule("QA-CI-001");
    expect(rule).toBeDefined();
    mkdirSync(join(fixturesRoot, "QA-CI-001", "must-fire"), {
      recursive: true,
    });
    writeFileSync(
      join(fixturesRoot, "QA-CI-001", "must-fire", "bad.yml"),
      "{[[[[\n",
    );
    const data = collectRuleDocData(rule as QADoctorRule, fixturesRoot);
    expect(data.mustFire.fixturePath).toContain("bad.yml");
    expect(data.mustFire.finding).toBeUndefined();
  });
});

describe("renderRuleDocMd metadata-optional paths", () => {
  it("declares missing trust metadata and renders full fixture paths", () => {
    const rule = minimalRule({});
    const text = renderRuleDocMd({
      rule,
      mustFire: {
        finding: {
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          file: "a.spec.ts",
          line: 1,
          column: 1,
          message: "probe",
          why: "why",
          fix: "fix",
          qaImpact: "HYGIENE",
        },
        // A path that contains no "tests/fixtures/" segment renders whole.
        fixturePath: join(root, "elsewhere", "a.spec.ts"),
      },
      mustNotFire: { fired: false },
      corpusOccurrences: {},
    });
    expect(text).toContain("not declared");
    expect(text).not.toContain("| Languages |");
    expect(text).not.toContain("| Frameworks |");
    expect(text).not.toContain("| Detection strategy |");
    expect(text).not.toContain("| Introduced in |");
    // relOrAbs normalizes separators when no tests/fixtures/ segment exists.
    expect(text).toContain("elsewhere/a.spec.ts");
  });

  it("renders the unknown-path placeholder when the fixture path is absent", () => {
    const text = renderRuleDocMd({
      rule: minimalRule({ id: "QA-TEST-901" }),
      mustFire: {
        finding: {
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          file: "a.spec.ts",
          line: 1,
          column: 1,
          message: "probe",
          why: "why",
          fix: "fix",
          qaImpact: "HYGIENE",
        },
        // fixturePath deliberately absent — relOrAbs gets no path.
      },
      mustNotFire: { fired: false },
      corpusOccurrences: {},
    });
    expect(text).toContain("(unknown path)");
  });
});
