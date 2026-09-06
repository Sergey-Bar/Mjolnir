/**
 * Phase 1 coverage: commands/fix.ts residual arms — language dispatch,
 * mask-degraded refusals, stale-line pause recovery, the atomic-write
 * failure paths, and report rendering — driven through planAndApplyFixes
 * with real files in a temp root (behavior-asserting, no stroking).
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Set by the tmp-write failure test; consulted by the fs mock above. */
const state = vi.hoisted(() => ({ failTmpWrites: false }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const writeFileSync = ((path: string, data: string, options?: unknown) => {
    if (state.failTmpWrites && String(path).includes(".mjolnir-")) {
      throw new Error("ENOSPC (simulated)");
    }
    return (actual.writeFileSync as unknown as (...a: unknown[]) => void)(
      path,
      data,
      options,
    );
  }) as typeof actual.writeFileSync;
  return { ...actual, writeFileSync };
});

vi.mock("../../src/engine/code-text.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/engine/code-text.js")>();
  return { ...actual, computeCodeText: vi.fn(actual.computeCodeText) };
});

import { computeCodeText } from "../../src/engine/code-text.js";
import { planAndApplyFixes, renderFixReport } from "../../src/commands/fix.js";
import type { Finding, ScanResult } from "../../src/types.js";

/** Set by the tmp-write failure test; consulted by the fs mock above. */
let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "mjolnir-fix-arms-"));
  state.failTmpWrites = false;
});
afterEach(() => {
  state.failTmpWrites = false;
  rmSync(root, { recursive: true, force: true });
  vi.clearAllMocks();
});

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file: "e2e/a.spec.ts",
    line: 1,
    column: 1,
    message: "Focused test: `test.only(`.",
    why: "why",
    fix: "fix",
    ...overrides,
  };
}

function pauseFinding(overrides: Partial<Finding> = {}): Finding {
  return finding({
    ruleId: "QA-PW-003",
    message: "page.pause() found",
    ...overrides,
  });
}

function scanOf(...findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 50,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [
      { category: "QA-TEST", score: 50, errors: 1, warnings: 0, infos: 0 },
    ],
    findings,
    testFileCount: 1,
    testDeclarationCount: 1,
    rawDeductions: 8,
    suppressionCount: 0,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
      rulesCrashed: 0,
    },
  };
}

const ONLY_SRC = "test.only('a', () => { expect(1 + 1).toBe(2); });\n";

describe("language dispatch through real fixes", () => {
  it.each(["a.spec.ts", "a.js", "b.py", "c.java", "d.cs"])(
    "rewrites .only in %s via the matching language masker",
    (name) => {
      const file = join(root, name);
      writeFileSync(file, ONLY_SRC);
      const results = planAndApplyFixes(scanOf(finding({ file: name })), root);
      expect(results[0]?.status).toBe("applied");
      expect(readFileSync(file, "utf8")).toBe(
        "test('a', () => { expect(1 + 1).toBe(2); });\n",
      );
    },
  );

  it("refuses a fix in a file with no known language (mask would be raw)", () => {
    const file = join(root, "notes.md");
    writeFileSync(file, ONLY_SRC);
    const results = planAndApplyFixes(
      scanOf(finding({ file: "notes.md" })),
      root,
    );
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toContain("masking unavailable");
    expect(readFileSync(file, "utf8")).toContain("test.only");
  });

  it("refuses a page.pause fix when masking cannot see the code view", () => {
    const file = join(root, "pause-notes.md");
    writeFileSync(file, "page.pause() // comment\n");
    const results = planAndApplyFixes(
      scanOf(pauseFinding({ file: "pause-notes.md", line: 1 })),
      root,
    );
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toContain("masking unavailable");
    expect(readFileSync(file, "utf8")).toContain("page.pause()");
  });

  it("refuses when the masker degrades to raw text on a sensitive file", () => {
    mkdirSync(join(root, "e2e"), { recursive: true });
    const file = join(root, "e2e", "degraded.spec.ts");
    writeFileSync(file, ONLY_SRC);
    vi.mocked(computeCodeText).mockImplementationOnce(
      (fileArg: { text: string }) => fileArg.text,
    );
    const results = planAndApplyFixes(
      scanOf(finding({ file: "e2e/degraded.spec.ts" })),
      root,
    );
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toContain("masking unavailable");
    expect(readFileSync(file, "utf8")).toContain("test.only");
  });
});

describe("page.pause stale-line recovery", () => {
  it("searches forward first, then backward, for the nearest pause-only line", () => {
    const file = join(root, "p1.spec.ts");
    // Finding claims line 3 (which holds other code); the only pause-only
    // line sits BELOW it and the forward search must find it.
    writeFileSync(
      file,
      [
        "import { test } from '@playwright/test';",
        "test('a', async ({ page }) => {",
        "  await page.goto('/x');",
        "  await page.pause();",
        "  await expect(page).toHaveURL('/y');",
        "});",
        "",
      ].join("\n"),
    );
    const results = planAndApplyFixes(
      scanOf(pauseFinding({ file: "p1.spec.ts", line: 3 })),
      root,
    );
    expect(results[0]?.status).toBe("applied");
    expect(readFileSync(file, "utf8")).not.toContain("page.pause()");
  });

  it("falls back to the nearest pause-only line above a stale target", () => {
    const file = join(root, "p2.spec.ts");
    // Finding claims the last line; the pause-only line sits ABOVE.
    writeFileSync(
      file,
      [
        "import { test } from '@playwright/test';",
        "test('a', async ({ page }) => {",
        "  await page.pause();",
        "  await page.goto('/x');",
        "  await expect(page).toHaveURL('/y');",
        "});",
        "",
      ].join("\n"),
    );
    const results = planAndApplyFixes(
      scanOf(pauseFinding({ file: "p2.spec.ts", line: 6 })),
      root,
    );
    expect(results[0]?.status).toBe("applied");
    expect(readFileSync(file, "utf8")).not.toContain("page.pause()");
  });

  it("reports not-found when the stale target is past EOF and no pause-only line exists", () => {
    const file = join(root, "p3.spec.ts");
    writeFileSync(
      file,
      [
        "import { test } from '@playwright/test';",
        "test('a', async () => {",
        "  expect(1 + 1).toBe(2);",
        "});",
        "",
      ].join("\n"),
    );
    const results = planAndApplyFixes(
      scanOf(pauseFinding({ file: "p3.spec.ts", line: 999 })),
      root,
    );
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toContain("pattern not found in code");
    expect(readFileSync(file, "utf8")).not.toContain("page.pause");
  });

  it("verifies a second finding on the same (already fixed) pause line against the original", () => {
    const file = join(root, "p4.spec.ts");
    writeFileSync(
      file,
      [
        "import { test } from '@playwright/test';",
        "test('a', async ({ page }) => {",
        "  await page.pause();",
        "  await expect(page).toHaveURL('/y');",
        "});",
        "",
      ].join("\n"),
    );
    // Two findings on the SAME line: the first edit applies; the second
    // finds nothing left to change but is provable against the original
    // (the count went down), so it is not reported as a failure.
    const results = planAndApplyFixes(
      scanOf(
        pauseFinding({ file: "p4.spec.ts", line: 3 }),
        pauseFinding({ file: "p4.spec.ts", line: 3 }),
      ),
      root,
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("applied");
  });
});

describe("atomic-write failure paths", () => {
  it("reports the planned fixes as failed when the temp write fails, leaving no litter", () => {
    const file = join(root, "w.spec.ts");
    writeFileSync(file, ONLY_SRC);
    state.failTmpWrites = true;
    const results = planAndApplyFixes(
      scanOf(finding({ file: "w.spec.ts" })),
      root,
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toBe("write failed — file left untouched");
    expect(readFileSync(file, "utf8")).toContain("test.only");
    const siblings = readdirSync(root);
    expect(siblings.every((n) => !n.includes(".mjolnir-"))).toBe(true);
  });

  it("refuses up-front when the target file is not writable", () => {
    const file = join(root, "ro.spec.ts");
    writeFileSync(file, ONLY_SRC);
    chmodSync(file, 0o444);
    try {
      const results = planAndApplyFixes(
        scanOf(finding({ file: "ro.spec.ts" })),
        root,
      );
      expect(results[0]?.status).toBe("failed");
      expect(results[0]?.description).toBe(
        "write failed — file left untouched",
      );
      expect(readFileSync(file, "utf8")).toContain("test.only");
    } finally {
      chmodSync(file, 0o644);
    }
  });
});

describe("containment guard", () => {
  it("refuses a finding whose path escapes the scan root", () => {
    const results = planAndApplyFixes(
      scanOf(finding({ file: "../outside.spec.ts" })),
      root,
    );
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toContain("path escapes scan root");
  });

  it("refuses when the scan root itself cannot be resolved", () => {
    const results = planAndApplyFixes(
      scanOf(finding({ file: "e2e/a.spec.ts" })),
      join(root, "does-not-exist"),
    );
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.description).toContain("path escapes scan root");
  });
});

describe("report rendering covers every status", () => {
  it("renders applied, planned, failed and unchanged markers", () => {
    const report = renderFixReport(
      [
        {
          file: "a.spec.ts",
          ruleId: "QA-TEST-001",
          line: 1,
          status: "applied",
          description: "Remove `.only` focus modifier",
        },
        {
          file: "b.spec.ts",
          ruleId: "QA-TEST-001",
          line: 2,
          status: "planned",
          description: "Remove `.only` focus modifier",
        },
        {
          file: "c.spec.ts",
          ruleId: "QA-PW-003",
          line: 3,
          status: "failed",
          description: "write failed — file left untouched",
        },
        {
          file: "d.spec.ts",
          ruleId: "QA-TEST-001",
          line: 4,
          status: "unchanged",
          description: "nothing to do",
        },
      ],
      false,
    );
    expect(report).toContain("✓ [QA-TEST-001] a.spec.ts:1");
    expect(report).toContain("▸ [QA-TEST-001] b.spec.ts:2");
    expect(report).toContain("✗ [QA-PW-003] c.spec.ts:3");
    expect(report).toContain("· [QA-TEST-001] d.spec.ts:4");
    expect(report).toContain("1 applied");
    expect(report).toContain("1 planned");
    expect(report).toContain("1 not applied");
  });

  it("renders the honest empty state when no fixes are available", () => {
    const report = renderFixReport([], false);
    expect(report).toContain("No safe auto-fixes available");
  });
});
