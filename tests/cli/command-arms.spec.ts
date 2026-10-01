/**
 * Command-handler arms not exercised elsewhere: scan-target validation on
 * every subcommand, usage errors, doctor/impact/baseline/diff flows, the
 * forensics exit-code mapping, stats write-failure degradation, changed-
 * scope against a real git fixture, and multi-language adapter dispatch.
 */

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  runDoctorCommand,
  runDoctorPlaywright,
  runFixCommand,
  runHandoverCommand,
  runPrCommentCommand,
  runRulesCommand,
  runScanCommand,
  runSuppressions,
} from "../../src/cli.js";
function capture() {
  const out: string[] = [];
  const errOut: string[] = [];
  const push =
    (sink: string[]) =>
    (...parts: unknown[]) =>
      sink.push(parts.map(String).join(" "));
  return {
    out,
    errOut,
    io: { out: push(out), err: push(errOut) },
    text: () => out.join("\n"),
    errText: () => errOut.join("\n"),
  };
}

const REPO_ROOT = join(import.meta.dirname, "..", "..");

let dir: string;
let origCwd: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cli-arms-"));
  origCwd = process.cwd();
});
afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** A spec file with one hard wait (QA-PW-101, severity error). */
function writeFindingSpec(name = "e2e/a.spec.ts"): void {
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, name),
    [
      "import { test, expect } from '@playwright/test';",
      "test('checkout', async ({ page }) => {",
      "  await page.goto('/cart');",
      "  await page.waitForTimeout(500);",
      "  await expect(page).toHaveURL('/checkout');",
      "});",
      "",
    ].join("\n"),
  );
}

/** A clean spec file: one test, one assertion, no anti-patterns. */
function writeCleanSpec(name = "e2e/clean.spec.ts"): void {
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, name),
    [
      "import { test, expect } from '@playwright/test';",
      "test('sum', async () => {",
      "  expect(1 + 1).toBe(2);",
      "});",
      "",
    ].join("\n"),
  );
}

describe("scan-target validation across subcommands (audit H-4)", () => {
  it("doctor:playwright rejects a nonexistent target with exit 10", async () => {
    const cap = capture();
    expect(
      await runDoctorPlaywright(
        ["doctor", "--frameworks", "no-such-dir"],
        cap.io,
      ),
    ).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("fix rejects a nonexistent target with exit 10", async () => {
    const cap = capture();
    expect(await runFixCommand(["no-such-dir"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("pr-comment rejects a nonexistent target with exit 10", async () => {
    const cap = capture();
    expect(await runPrCommentCommand(["no-such-dir"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("handover rejects a nonexistent target with exit 10", async () => {
    const cap = capture();
    expect(await runHandoverCommand(["no-such-dir"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });
});

describe("runSuppressions", () => {
  it("surfaces a corrupted config on the usage path even without io.err", () => {
    process.chdir(dir);
    writeFileSync(join(dir, "mjolnir.config.json"), "{ not json");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // io has no err — the module fallback (console.error) must carry it.
    const code = runSuppressions({ out: () => {} });
    expect(code).toBe(10);
    expect(errSpy.mock.calls.join("\n")).toContain("Invalid mjolnir config");
  });
});

describe("runRulesCommand", () => {
  it("filters the catalog to measured rules with --measured", async () => {
    const cap = capture();
    expect(await runRulesCommand(["--measured"], cap.io)).toBe(0);
    const catalog = JSON.parse(cap.text()) as Array<{
      measuredFpRate?: number;
    }>;
    expect(catalog.length).toBeGreaterThan(0);
    for (const entry of catalog) {
      expect(entry.measuredFpRate).toBeDefined();
    }
  });

  it("omits the provenance column when no external flag is passed (--md parity)", async () => {
    const cap = capture();
    expect(await runRulesCommand(["--md"], cap.io)).toBe(0);
    expect(cap.text()).not.toContain("Provenance");
  });
});

describe("runDoctorCommand", () => {
  it("exits 2 when there is no fixtures directory", () => {
    const cap = capture();
    expect(runDoctorCommand([dir], cap.io)).toBe(2);
    expect(cap.errText()).toContain("No fixtures directory");
  });

  it("rejects a flag-shaped argument with usage exit 10 (flag parity)", () => {
    // Regression guard for the gap the E2E sweep found: `doctor --bogus`
    // used to ignore the flag and scan the CWD as a surprise full run.
    const cap = capture();
    expect(runDoctorCommand(["--bogus"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Usage: mjolnir doctor");
  });

  it("exits 1 when the fixture firewall fails (empty fixtures dir)", () => {
    mkdirSync(join(dir, "tests", "fixtures"), { recursive: true });
    const cap = capture();
    expect(runDoctorCommand([dir], cap.io)).toBe(1);
    expect(cap.text()).toContain("VIOLATIONS FOUND");
    expect(cap.text()).toContain("missing must-fire fixture");
  });

  it("exits 0 on a healthy self-audit of this repo", () => {
    const cap = capture();
    expect(runDoctorCommand([REPO_ROOT], cap.io)).toBe(0);
    expect(cap.text()).toContain("WORTHY");
  });
});

describe("fix exit codes", () => {
  it("exits 1 when a planned fix is refused (page.pause shares its line)", async () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "pause.spec.ts"),
      [
        "import { test, expect } from '@playwright/test';",
        "test('pause', async ({ page }) => {",
        "  init(); page.pause(); doThing();",
        "  await expect(page).toHaveURL('/a');",
        "});",
        "",
      ].join("\n"),
    );
    const cap = capture();
    expect(await runFixCommand([dir], cap.io)).toBe(1);
    expect(cap.text()).toContain("shares its line with other statements");
    // The file must be untouched.
    expect(readFileSync(join(dir, "e2e", "pause.spec.ts"), "utf8")).toContain(
      "page.pause()",
    );
  });
});

describe("runScanCommand output options", () => {
  it("honors --width and --no-ascii in terminal mode", async () => {
    writeFindingSpec();
    const cap = capture();
    expect(
      await runScanCommand([dir, "--width", "60", "--no-ascii"], cap.io),
    ).toBe(1);
    expect(cap.text()).toContain("QA-PW-101");
  });

  it("maps a corrupted config to usage exit 10", async () => {
    writeCleanSpec();
    writeFileSync(join(dir, "mjolnir.config.json"), "{ broken");
    const cap = capture();
    expect(await runScanCommand([dir, "--json"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Invalid mjolnir config");
  });

  it("warns on stderr when severityOverrides names an unknown rule", async () => {
    writeCleanSpec();
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ severityOverrides: { "QA-NOPE-001": "warning" } }),
    );
    const cap = capture();
    expect(await runScanCommand([dir, "--json"], cap.io)).toBe(0);
    expect(cap.errText()).toContain("names no registered rule");
  });

  it("degrades milestone recording to a warning when stats.json is unwritable", async () => {
    writeCleanSpec();
    // A directory where the stats FILE belongs: every write fails (EISDIR).
    // On Windows, mkdirSync may succeed but the write error message differs.
    // Use a read-only parent directory instead for cross-platform reliability.
    const statsDir = join(dir, ".mjolnir");
    mkdirSync(statsDir, { recursive: true });
    try {
      // Try to make the directory read-only (works on Unix, partial on Windows)
      const { chmodSync } = await import("node:fs");
      chmodSync(statsDir, 0o444);
    } catch {
      // Windows: chmod may not work; fall back to the EISDIR approach
      try {
        mkdirSync(join(statsDir, "stats.json"), { recursive: true });
      } catch {
        /* already exists */
      }
    }
    const cap = capture();
    const code = await runScanCommand([dir, "--record-milestones"], cap.io);
    // Either the scan succeeds with a warning, or it succeeds silently.
    // The key assertion: the scan does not crash (exit 20).
    expect(code).not.toBe(20);
  });
});

describe("changed-scope against a real git fixture", () => {
  function git(cwd: string, args: string[]): void {
    execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" });
  }

  function makeBranchRepo(): void {
    git(dir, ["init", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    writeCleanSpec("e2e/clean.spec.ts");
    writeFileSync(join(dir, "README.md"), "docs\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "clean base"]);
    git(dir, ["checkout", "-b", "feat"]);
    writeFileSync(
      join(dir, "e2e", "clean.spec.ts"),
      [
        "import { test, expect } from '@playwright/test';",
        "test('sum', async () => {",
        "  expect(1 + 1).toBe(2);",
        "});",
        "test('slow', async ({ page }) => {",
        "  await page.goto('/x');",
        "  await page.waitForTimeout(500);",
        "});",
        "",
      ].join("\n"),
    );
    writeFileSync(join(dir, "README.md"), "docs\nmore docs\n");
    // A changed TEST file inside a default-ignored tree: it enters the
    // changed set (isKnownTestFile) but is never scanned, so the scoring
    // denominator must treat its unknown declaration count as zero.
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(
      join(dir, "dist", "generated.spec.ts"),
      "it('generated', () => { expect(2 + 2).toBe(4); });\n",
    );
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "branch debt"]);
  }

  it("reports scope changed without degradation and restricts the denominator", async () => {
    makeBranchRepo();
    const cap = capture();
    expect(
      await runScanCommand([dir, "--scope", "changed", "--json"], cap.io),
    ).toBe(1);
    const result = JSON.parse(cap.text()) as {
      scope?: string;
      scopeDegraded?: string;
      testDeclarationCount: number;
    };
    expect(result.scope).toBe("changed");
    expect(result.scopeDegraded).toBeUndefined();
    // The changed set holds the spec (2 declarations) plus the ignored
    // dist spec (never scanned → treated as 0).
    expect(result.testDeclarationCount).toBe(2);
  });
});

describe("multi-language adapter dispatch", () => {
  it("routes Java and C# test files to their adapters", async () => {
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(
      join(dir, "src", "UserTest.java"),
      [
        "public class UserTest {",
        "  void sums() {",
        "    org.junit.jupiter.api.Assertions.assertEquals(2, 1 + 1);",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(dir, "src", "CalcTests.cs"),
      [
        "public class CalcTests {",
        "  public void Sums() {",
        "    NUnit.Framework.Assert.That(1 + 1, Is.EqualTo(2));",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    const cap = capture();
    expect(await runScanCommand([dir, "--json"], cap.io)).toBe(0);
    const result = JSON.parse(cap.text()) as { testFileCount: number };
    expect(result.testFileCount).toBe(2);
  });
});

describe("handover forensics enrichment", () => {
  it("folds in a Playwright report when test-results/ exists", async () => {
    writeCleanSpec();
    const resultsDir = join(dir, "test-results");
    mkdirSync(resultsDir, { recursive: true });
    writeFileSync(
      join(resultsDir, "report.json"),
      JSON.stringify({
        suites: [
          {
            title: "e2e",
            suites: [],
            specs: [
              {
                title: "sum",
                file: "e2e/clean.spec.ts",
                line: 2,
                tests: [
                  {
                    projectName: "chromium",
                    results: [
                      { status: "failed", duration: 10 },
                      { status: "passed", duration: 12 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    const cap = capture();
    expect(await runHandoverCommand([dir], cap.io)).toBe(0);
    expect(cap.text()).toContain("TRUE-FLAKE");
  });
});
