/**
 * Tests for `mjolnir fix` — safe auto-fix with proof (Tier 1 #3).
 */

import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  planAndApplyFixes,
  planFix,
  renderFixReport,
} from "../src/commands/fix.js";
import type { Finding, ScanResult } from "../src/types.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-fix-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function finding(ruleId: string, file: string, message: string): Finding {
  return {
    ruleId,
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file,
    line: 1,
    column: 1,
    message,
    why: "",
    fix: "",
  };
}

function scan(findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 50,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

describe("planFix", () => {
  it("plans .only removal for QA-TEST-001", () => {
    const edit = planFix(
      finding("QA-TEST-001", "a.spec.ts", "`.only` focus modifier committed."),
    );
    expect(edit?.description).toBe("Remove `.only` focus modifier");
  });

  it("returns null for non-fixable rules", () => {
    expect(planFix(finding("QA-TEST-003", "a.ts", "no assertions"))).toBeNull();
  });
});

describe("planAndApplyFixes", () => {
  it("removes .only and verifies the fix", () => {
    const file = "only.spec.ts";
    writeFileSync(
      join(dir, file),
      "test.only('x', () => { expect(1).toBe(1); });\n",
    );
    const results = planAndApplyFixes(
      scan([finding("QA-TEST-001", file, "`.only` focus modifier committed.")]),
      dir,
    );
    expect(results[0]?.status).toBe("applied");
    const after = readFileSync(join(dir, file), "utf8");
    expect(after).toContain("test('x'");
    expect(after).not.toContain(".only");
  });

  it("renames fit/fdescribe", () => {
    const file = "focused.spec.ts";
    writeFileSync(
      join(dir, file),
      "fit('works', () => {});\nfdescribe('suite', () => {});\n",
    );
    const results = planAndApplyFixes(
      scan([
        finding("QA-TEST-001", file, "Focused test committed: `fit(`"),
        finding("QA-TEST-001", file, "Focused test committed: `fdescribe(`"),
      ]),
      dir,
    );
    expect(results.every((r) => r.status === "applied")).toBe(true);
    const after = readFileSync(join(dir, file), "utf8");
    expect(after).toContain("it('works'");
    expect(after).toContain("describe('suite'");
    expect(after).not.toMatch(/\bfit\s*\(/);
  });

  it("dry-run reports the fix as planned, not failed, and leaves the file untouched", () => {
    const file = "dry.spec.ts";
    const before = "test.only('x', () => {});\n";
    writeFileSync(join(dir, file), before);
    const results = planAndApplyFixes(
      scan([finding("QA-TEST-001", file, "`.only` focus modifier committed.")]),
      dir,
      { dryRun: true },
    );
    expect(readFileSync(join(dir, file), "utf8")).toBe(before);
    // Audit R-6: a successful dry run is a plan, not a failure.
    expect(results[0]?.status).toBe("planned");
  });

  it("never rewrites .only inside strings or comments (audit R-4)", () => {
    const file = "masked.spec.ts";
    writeFileSync(
      join(dir, file),
      [
        "test.only('real', () => {});",
        `const src = "test.only('in string', () => {})";`,
        "// test.only('in comment', () => {});",
        "",
      ].join("\n") + "\n",
    );
    const results = planAndApplyFixes(
      scan([finding("QA-TEST-001", file, "`.only` focus modifier committed.")]),
      dir,
    );
    expect(results[0]?.status).toBe("applied");
    const after = readFileSync(join(dir, file), "utf8");
    expect(after).toContain("test('real'");
    expect(after).toContain(`test.only('in string'`);
    expect(after).toContain("// test.only('in comment'");
  });

  it("reports a string-only .only as not-fixable instead of editing test data", () => {
    const file = "string-only.spec.ts";
    writeFileSync(
      join(dir, file),
      `const src = "test.only('in string', () => {})";\n`,
    );
    const results = planAndApplyFixes(
      scan([finding("QA-TEST-001", file, "`.only` focus modifier committed.")]),
      dir,
    );
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toContain("strings and comments");
    expect(readFileSync(join(dir, file), "utf8")).toBe(
      `const src = "test.only('in string', () => {})";\n`,
    );
  });

  it("leaves no temp file behind after an applied fix (audit R-5)", () => {
    const file = "tmp.spec.ts";
    writeFileSync(join(dir, file), "test.only('x', () => {});\n");
    const results = planAndApplyFixes(
      scan([finding("QA-TEST-001", file, "`.only` focus modifier committed.")]),
      dir,
    );
    expect(results[0]?.status).toBe("applied");
    const leftovers = readdirSync(dir).filter((f) =>
      f.endsWith(".mjolnir-tmp"),
    );
    expect(leftovers).toEqual([]);
  });

  it("refuses to write through a link that escapes the scan root (audit R-7)", () => {
    const outside = mkdtempSync(join(tmpdir(), "qa-fix-outside-"));
    try {
      mkdirSync(join(outside, "sub"), { recursive: true });
      const victim = join(outside, "sub", "victim.spec.ts");
      writeFileSync(victim, "test.only('x', () => {});\n");
      // A junction (Windows, no privilege needed) or dir symlink (POSIX)
      // inside the scan root pointing OUTSIDE it must not smuggle a
      // write past the path-containment guard.
      const link = join(dir, "innocent");
      try {
        symlinkSync(join(outside, "sub"), link, "junction");
      } catch {
        try {
          symlinkSync(join(outside, "sub"), link, "dir");
        } catch {
          return; // link privileges unavailable in this environment — skip
        }
      }
      const results = planAndApplyFixes(
        scan([
          finding(
            "QA-TEST-001",
            "innocent/victim.spec.ts",
            "`.only` focus modifier committed.",
          ),
        ]),
        dir,
      );
      expect(results[0]?.status).toBe("failed");
      expect(results[0]?.description).toContain("escapes scan root");
      // The file behind the link is untouched.
      expect(readFileSync(victim, "utf8")).toContain(".only");
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("leaves files untouched when verification fails", () => {
    // A message claiming .only but a file without one — proof must fail.
    const file = "unproven.spec.ts";
    const before = "test('fine', () => {});\n";
    writeFileSync(join(dir, file), before);
    const results = planAndApplyFixes(
      scan([finding("QA-TEST-001", file, "`.only` focus modifier committed.")]),
      dir,
    );
    expect(results[0]?.status).toBe("failed");
    expect(readFileSync(join(dir, file), "utf8")).toBe(before);
  });

  it("does not touch unrelated findings", () => {
    const file = "other.spec.ts";
    const before = "it('ok', () => { expect(1).toBe(1); });\n";
    writeFileSync(join(dir, file), before);
    const results = planAndApplyFixes(
      scan([finding("QA-TEST-003", file, "Test contains no assertions.")]),
      dir,
    );
    expect(results).toHaveLength(0);
    expect(readFileSync(join(dir, file), "utf8")).toBe(before);
  });

  it("reports failed for missing files — never silent", () => {
    const results = planAndApplyFixes(
      scan([finding("QA-TEST-001", "ghost.spec.ts", "`.only`")]),
      dir,
    );
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toContain("file unreadable");
  });

  it("removes page.pause() calls", () => {
    const file = "pause.spec.ts";
    const before =
      "test('a', async ({ page }) => {\n  await page.pause();\n  await page.click('#x');\n});\n";
    writeFileSync(join(dir, file), before);
    const results = planAndApplyFixes(
      scan([finding("QA-PW-003", file, "Remove `page.pause()` call")]),
      dir,
    );
    expect(results[0]?.status).toBe("applied");
    const after = readFileSync(join(dir, file), "utf8");
    expect(after).not.toContain("page.pause");
    expect(after).toContain("page.click");
  });

  it("skips files over the size cap without touching them", () => {
    const file = "huge.spec.ts";
    // > 512 KB — the MAX_FILE_BYTES guard.
    writeFileSync(join(dir, file), "// " + "x".repeat(600 * 1024));
    const results = planAndApplyFixes(
      scan([finding("QA-TEST-001", file, "`.only` focus modifier committed.")]),
      dir,
    );
    expect(results).toHaveLength(0);
  });

  it("reports failed when write target is unwritable", () => {
    // A DIRECTORY named like the spec makes readFileSync throw EISDIR —
    // the fix cannot be proven either way and must be reported, not skipped.
    mkdirSync(join(dir, "blocked.spec.ts"), { recursive: true });
    const results = planAndApplyFixes(
      scan([
        finding(
          "QA-TEST-001",
          "blocked.spec.ts",
          "`.only` focus modifier committed.",
        ),
      ]),
      dir,
    );
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toContain("file unreadable");
  });

  it("plans page.pause removal via planFix", () => {
    const edit = planFix(finding("QA-TEST-001", "a.ts", "page.pause() found"));
    expect(edit?.description).toBe("Remove `page.pause()` call");
  });

  it("returns null for QA-TEST-001 messages with no known pattern", () => {
    expect(
      planFix(finding("QA-TEST-001", "a.ts", "something else")),
    ).toBeNull();
  });
});

describe("renderFixReport", () => {
  it("renders honest empty state", () => {
    const text = renderFixReport([], false);
    expect(text).toContain("No safe auto-fixes available");
  });

  it("marks dry-run output and renders planned fixes with their own status", () => {
    const text = renderFixReport(
      [
        {
          file: "a.ts",
          ruleId: "QA-TEST-001",
          line: 1,
          status: "planned",
          description: "Remove `.only` focus modifier",
        },
      ],
      true,
    );
    expect(text).toContain("FIX PLAN (dry-run)");
    expect(text).toContain("▸");
    expect(text).toContain("1 planned");
    expect(text).not.toContain("not applied");
  });
});
