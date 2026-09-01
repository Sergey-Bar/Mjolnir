/**
 * `--tone blunt` (Sprint 9 Task 40, Master-Stabilization-Plan.md).
 *
 * Plan-mandated assertions:
 * - Off by default.
 * - Opt-in only.
 * - No output targets a person or author name.
 * - Score-neutral: exit code, score and JSON schema remain identical.
 * - Golden lock unaffected.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runScanCommand } from "../src/cli.js";
import { bluntMessage, BLUNT_RULE_IDS } from "../src/reporter/tone-blunt.js";
import { RULES } from "../src/rules/index.js";
import type { Finding } from "../src/types.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs.length = 0;
});

function makeFixtureWithFindings(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-roast-"));
  dirs.push(d);
  mkdirSync(join(d, "e2e"), { recursive: true });
  writeFileSync(
    join(d, "e2e", "a.spec.ts"),
    "import { test, expect } from '@playwright/test';\n" +
      "test.only('roast me', async ({ page }) => {\n" +
      "  await page.goto('http://localhost:3000');\n" +
      "  await page.waitForTimeout(5000);\n" +
      "  expect(true).toBe(true);\n" +
      "});\n",
  );
  return d;
}

function capture() {
  const out: string[] = [];
  return {
    io: {
      out: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
      err: () => {},
    },
    text: () => out.join("\n"),
  };
}

describe("--tone blunt is off by default", () => {
  it("default output uses the standard finding message, not blunt tone", async () => {
    const dir = makeFixtureWithFindings();
    const cap = capture();
    await runScanCommand([dir], cap.io);
    // Standard messages use technical names, not blunt commentary.
    expect(cap.text()).not.toContain("prayer");
    expect(cap.text()).not.toContain("congratulations");
  });
});

describe("--tone blunt opt-in changes terminal messages", () => {
  it("produces different, blunter messages when explicitly opted in", async () => {
    const dir = makeFixtureWithFindings();
    const cap = capture();
    await runScanCommand([dir, "--tone", "blunt"], cap.io);
    // At least one blunt message should appear — e.g. the sleep rule.
    expect(cap.text()).toMatch(/prayer|congratulations|lie|fix it or suppress/);
  });

  it("never targets a person or author name", async () => {
    const dir = makeFixtureWithFindings();
    const cap = capture();
    await runScanCommand([dir, "--tone", "blunt"], cap.io);
    const text = cap.text();
    // Should not contain "you" addressing an author, "your" possessive
    // about the developer personally, or generic offensive words.
    // (This is an imperfect heuristic; the plan says "never mocks a
    // person" — verify the specific messages don't.)
    expect(text).not.toMatch(/\byour code\b/i);
    expect(text).not.toMatch(/\byou should\b/i);
    expect(text).not.toMatch(/\bidiot\b/i);
    expect(text).not.toMatch(/\bstupid\b/i);
  });
});

describe("score-neutrality (--tone blunt)", () => {
  it("exit code is identical with and without --tone blunt", async () => {
    const dir = makeFixtureWithFindings();
    const code1 = await runScanCommand([dir], capture().io);
    const code2 = await runScanCommand([dir, "--tone", "blunt"], capture().io);
    expect(code1).toBe(code2);
  });

  it("--json output is completely unaffected by --tone blunt", async () => {
    const dir = makeFixtureWithFindings();
    const cap1 = capture();
    await runScanCommand([dir, "--json"], cap1.io);
    const cap2 = capture();
    await runScanCommand([dir, "--json", "--tone", "blunt"], cap2.io);
    // JSON output must be structurally identical — tone only applies to
    // terminal. durationMs is wall-clock non-deterministic between runs,
    // so compare everything except that single field.
    const obj1 = JSON.parse(cap1.text()) as Record<string, unknown>;
    const obj2 = JSON.parse(cap2.text()) as Record<string, unknown>;
    const strip = (o: Record<string, unknown>) => {
      const copy = JSON.parse(JSON.stringify(o)) as Record<string, unknown>;
      if (
        typeof copy.analysisStatus === "object" &&
        copy.analysisStatus !== null
      ) {
        delete (copy.analysisStatus as Record<string, unknown>).durationMs;
      }
      return copy;
    };
    expect(strip(obj1)).toEqual(strip(obj2));
  });

  it("--format sarif output is completely unaffected by --tone blunt", async () => {
    const dir = makeFixtureWithFindings();
    const cap1 = capture();
    await runScanCommand([dir, "--format", "sarif"], cap1.io);
    const cap2 = capture();
    await runScanCommand(
      [dir, "--format", "sarif", "--tone", "blunt"],
      cap2.io,
    );
    // Same structural comparison, ignoring wall-clock durationMs.
    const obj1 = JSON.parse(cap1.text()) as Record<string, unknown>;
    const obj2 = JSON.parse(cap2.text()) as Record<string, unknown>;
    expect(obj1.version).toBe("2.1.0");
    expect(obj2.version).toBe("2.1.0");
    // SARIF results array should be identical (tone never touches SARIF).
    const runs1 = (obj1 as { runs: Array<{ results: unknown[] }> }).runs;
    const runs2 = (obj2 as { runs: Array<{ results: unknown[] }> }).runs;
    expect(runs1[0]?.results).toEqual(runs2[0]?.results);
  });
});

describe("bluntMessage — unit coverage", () => {
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

  it("returns a specific blunt message for a known rule", () => {
    const msg = bluntMessage(finding({ ruleId: "QA-PW-101" }));
    expect(msg).toContain("prayer");
  });

  it("returns a default blunt fallback for an unknown rule", () => {
    const msg = bluntMessage(finding({ ruleId: "QA-UNKNOWN-999" }));
    expect(msg).toContain("fix it or suppress it");
    expect(msg).toContain("Hard sleep detected");
  });

  it("never includes author names or file paths in the blunt message itself", () => {
    const msg = bluntMessage(
      finding({ ruleId: "QA-CI-002", file: "alice-workflow.yml" }),
    );
    expect(msg).not.toContain("alice");
  });
});

describe("blunt map is aligned with the rule registry (bug-audit M8)", () => {
  const REGISTERED = new Set(RULES.map((r) => r.id));

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

  function bluntTextFor(ruleId: string): string | undefined {
    // bluntMessage falls back for unmapped rules; detect a mapped entry
    // by checking the fallback suffix is absent.
    const msg = bluntMessage(finding({ ruleId, message: "SENTINEL" }));
    return msg.includes("SENTINEL — fix it or suppress it") ? undefined : msg;
  }

  const RULE_TITLES = new Map(RULES.map((r) => [r.id, r.title]));

  // The previously-stale entries: the blunt text must now describe the
  // defect the RULE actually detects (keyword from the rule's own title).
  const FAMILY_SPOT_CHECKS: Array<[string, RegExp]> = [
    ["QA-PW-104", /trial/i], // old text mocked test.only
    ["QA-PW-105", /poll/i], // old text described hardcoded URLs
    ["QA-PW-112", /testid/i], // old text described CSS class selectors
    ["QA-PW-119", /order|conga|runs first/i], // old text described shared page
    ["QA-TEST-006", /retr/i], // old text described empty bodies
    ["QA-TQUAL-001", /mock/i], // old text described no-assertions
    ["QA-TQUAL-002", /proven|true/i], // old text described mock-only
    ["QA-PW-140", /screenshot|pixel/i], // old text described no-assertions
    ["QA-PW-115", /shared/i], // the shared-page text lives here now
    ["QA-PW-118", /network idle|race/i],
  ];

  for (const [ruleId, pattern] of FAMILY_SPOT_CHECKS) {
    it(`${ruleId}'s blunt text describes its actual defect (title: "${RULE_TITLES.get(ruleId) ?? "UNREGISTERED"}")`, () => {
      const text = bluntTextFor(ruleId);
      expect(text, `${ruleId} has no blunt entry`).toBeDefined();
      expect(text).toMatch(pattern);
    });
  }

  it("every blunt map key is a registered rule ID — no dead keys (M8)", () => {
    // Dead keys (QA-TQUAL-003, QA-TEST-005 historically) mock defects for
    // rules that never existed and silently fall through to the default.
    expect(BLUNT_RULE_IDS.length).toBeGreaterThan(30);
    for (const key of BLUNT_RULE_IDS) {
      expect(
        REGISTERED.has(key),
        `blunt map key "${key}" matches no registered rule`,
      ).toBe(true);
    }
  });
});
