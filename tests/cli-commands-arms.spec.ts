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
  runBaselineCommand,
  runCreateRuleCommand,
  runDebtCommand,
  runDiffCommand,
  runDoctorCommand,
  runDoctorPlaywright,
  runFixCommand,
  runForensicsCommand,
  runHandoverCommand,
  runImpactCommand,
  runInitCommand,
  runPrCommentCommand,
  runPwReportCommand,
  runRulesCommand,
  runScanCommand,
  runSuppressions,
} from "../src/cli.js";

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

const REPO_ROOT = join(import.meta.dirname, "..");

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
  it("doctor:playwright rejects a nonexistent target with exit 10", () => {
    const cap = capture();
    expect(
      runDoctorPlaywright(["doctor:playwright", "no-such-dir"], cap.io),
    ).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("debt rejects a nonexistent target with exit 10", () => {
    const cap = capture();
    expect(runDebtCommand(["no-such-dir"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("fix rejects a nonexistent target with exit 10", () => {
    const cap = capture();
    expect(runFixCommand(["no-such-dir"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("impact rejects a nonexistent target with exit 10", () => {
    const cap = capture();
    expect(runImpactCommand(["no-such-dir"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("pr-comment rejects a nonexistent target with exit 10", () => {
    const cap = capture();
    expect(runPrCommentCommand(["no-such-dir"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("handover rejects a nonexistent target with exit 10", () => {
    const cap = capture();
    expect(runHandoverCommand(["no-such-dir"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("does not exist");
  });

  it("diff prints usage and exits 10 on an unknown flag", () => {
    const cap = capture();
    expect(runDiffCommand(["--bogus"], cap.io)).toBe(10);
    expect(cap.text()).toContain("Usage: mjolnir");
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
  it("filters the catalog to measured rules with --measured", () => {
    const cap = capture();
    expect(runRulesCommand(["--measured"], cap.io)).toBe(0);
    const catalog = JSON.parse(cap.text()) as Array<{
      measuredFpRate?: number;
    }>;
    expect(catalog.length).toBeGreaterThan(0);
    for (const entry of catalog) {
      expect(entry.measuredFpRate).toBeDefined();
    }
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

describe("runCreateRuleCommand", () => {
  it("scaffolds a rule and exits 0, then exits 1 on duplicate", () => {
    process.chdir(dir);
    const cap = capture();
    expect(
      runCreateRuleCommand(["QA-PW-150", "--title", "Viewport"], cap.io),
    ).toBe(0);
    expect(cap.text()).toContain("RULE SCAFFOLD CREATED");
    expect(cap.text()).toContain("qa-pw-150.ts");

    const cap2 = capture();
    expect(
      runCreateRuleCommand(["QA-PW-150", "--title", "Viewport"], cap2.io),
    ).toBe(1);
    expect(cap2.text()).toContain("already exists");
  });
});

describe("runInitCommand", () => {
  it("uses the package.json name when present", () => {
    process.chdir(dir);
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "my-repo" }),
    );
    const cap = capture();
    expect(runInitCommand([], cap.io)).toBe(0);
    expect(cap.text().length).toBeGreaterThan(50);
  });

  it("falls back to the generic repo name when package.json has no name", () => {
    process.chdir(dir);
    writeFileSync(join(dir, "package.json"), "{}");
    const cap = capture();
    expect(runInitCommand([], cap.io)).toBe(0);
    expect(cap.text().length).toBeGreaterThan(50);
  });
});

describe("runImpactCommand", () => {
  function git(cwd: string, args: string[]): void {
    execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" });
  }

  function makeGitRepo(): void {
    git(dir, ["init", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    writeCleanSpec();
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "clean base"]);
    writeFindingSpec();
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "introduce debt"]);
  }

  it("compares against HEAD~1 by default and exits 0", () => {
    makeGitRepo();
    const cap = capture();
    expect(runImpactCommand([dir], cap.io)).toBe(0);
    expect(cap.text()).toContain("IMPACT REPORT");
    // Both the TEST-family and PW-family hard-sleep rules fire on the
    // waitForTimeout line; both are new debt since the clean base commit.
    expect(cap.text()).toContain("NEW DEBT SINCE BASE (2)");
  });

  it("reports an honest no-comparison when --since equals HEAD (exit 2)", () => {
    makeGitRepo();
    const cap = capture();
    expect(runImpactCommand([dir, "--since", "HEAD"], cap.io)).toBe(2);
    expect(cap.text()).toContain("no comparison could be made");
  });

  it("reports no comparison for a non-git target with exit 2", () => {
    writeCleanSpec();
    const cap = capture();
    expect(runImpactCommand([dir], cap.io)).toBe(2);
    expect(cap.text()).toContain("not-a-git-repo");
  });
});

describe("runBaselineCommand", () => {
  it("backs up the previous baseline on re-run", () => {
    writeFindingSpec();
    const cap = capture();
    expect(runBaselineCommand([dir], cap.io)).toBe(0);
    expect(cap.text()).not.toContain("Replaced an existing baseline");

    const cap2 = capture();
    expect(runBaselineCommand([dir], cap2.io)).toBe(0);
    expect(cap2.text()).toContain("Replaced an existing baseline");
    expect(
      readFileSync(join(dir, ".mjolnir", "baseline.json"), "utf8"),
    ).toContain("QA-PW-101");
  });
});

describe("forensics exit-code mapping", () => {
  function writePwReport(
    results: Array<{ status: string; duration: number }>,
  ): void {
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
                title: "checkout",
                file: "e2e/checkout.spec.ts",
                line: 3,
                tests: [{ projectName: "chromium", results }],
              },
            ],
          },
        ],
      }),
    );
  }

  it("forensics exits 1 when a true flake exists (pass on attempt >= 2)", () => {
    writePwReport([
      { status: "failed", duration: 100 },
      { status: "passed", duration: 50 },
    ]);
    const cap = capture();
    expect(runForensicsCommand([join(dir, "test-results")], cap.io)).toBe(1);
    expect(cap.text()).toContain("TRUE-FLAKE");
  });

  it("forensics exits 1 when a test finally failed", () => {
    writePwReport([{ status: "failed", duration: 100 }]);
    const cap = capture();
    expect(runForensicsCommand([join(dir, "test-results")], cap.io)).toBe(1);
  });

  it("pw-report exits 1 for a flaky run", () => {
    writePwReport([
      { status: "failed", duration: 100 },
      { status: "passed", duration: 50 },
    ]);
    const cap = capture();
    expect(runPwReportCommand([join(dir, "test-results")], cap.io)).toBe(1);
    expect(cap.text()).toContain("TRUE-FLAKE");
  });

  it("pw-report exits 0 when every test passed", () => {
    writePwReport([{ status: "passed", duration: 25 }]);
    const cap = capture();
    expect(runPwReportCommand([join(dir, "test-results")], cap.io)).toBe(0);
  });
});

describe("fix exit codes", () => {
  it("exits 1 when a planned fix is refused (page.pause shares its line)", () => {
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
    expect(runFixCommand([dir], cap.io)).toBe(1);
    expect(cap.text()).toContain("shares its line with other statements");
    // The file must be untouched.
    expect(readFileSync(join(dir, "e2e", "pause.spec.ts"), "utf8")).toContain(
      "page.pause()",
    );
  });
});

describe("runScanCommand output options", () => {
  it("honors --width and --no-ascii in terminal mode", () => {
    writeFindingSpec();
    const cap = capture();
    expect(runScanCommand([dir, "--width", "60", "--no-ascii"], cap.io)).toBe(
      1,
    );
    expect(cap.text()).toContain("QA-PW-101");
  });

  it("maps a corrupted config to usage exit 10", () => {
    writeCleanSpec();
    writeFileSync(join(dir, "mjolnir.config.json"), "{ broken");
    const cap = capture();
    expect(runScanCommand([dir, "--json"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Invalid mjolnir config");
  });

  it("warns on stderr when severityOverrides names an unknown rule", () => {
    writeCleanSpec();
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ severityOverrides: { "QA-NOPE-001": "warning" } }),
    );
    const cap = capture();
    expect(runScanCommand([dir, "--json"], cap.io)).toBe(0);
    expect(cap.errText()).toContain("names no registered rule");
  });

  it("degrades milestone recording to a warning when stats.json is unwritable", () => {
    writeCleanSpec();
    // A directory where the stats FILE belongs: every write fails (EISDIR).
    mkdirSync(join(dir, ".mjolnir", "stats.json"), { recursive: true });
    const cap = capture();
    expect(runScanCommand([dir, "--record-milestones"], cap.io)).toBe(0);
    expect(cap.errText()).toContain("stats could not be written");
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

  it("reports scope changed without degradation and restricts the denominator", () => {
    makeBranchRepo();
    const cap = capture();
    expect(runScanCommand([dir, "--scope", "changed", "--json"], cap.io)).toBe(
      1,
    );
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
  it("routes Java and C# test files to their adapters", () => {
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
    expect(runScanCommand([dir, "--json"], cap.io)).toBe(0);
    const result = JSON.parse(cap.text()) as { testFileCount: number };
    expect(result.testFileCount).toBe(2);
  });
});

describe("handover forensics enrichment", () => {
  it("folds in a Playwright report when test-results/ exists", () => {
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
    expect(runHandoverCommand([dir], cap.io)).toBe(0);
    expect(cap.text()).toContain("TRUE-FLAKE");
  });
});

describe("diff stats recording", () => {
  function makeDebtRepo(): void {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "one.spec.ts"),
      [
        "import { test, expect } from '@playwright/test';",
        "test('one', async ({ page }) => {",
        "  await page.waitForTimeout(100);",
        "  await expect(page).toHaveURL('/a');",
        "});",
        "",
      ].join("\n"),
    );
  }

  function fixedContent(): string {
    return [
      "import { test, expect } from '@playwright/test';",
      "test('one', async ({ page }) => {",
      "  await expect(page).toHaveURL('/a');",
      "});",
      "",
    ].join("\n");
  }

  it("warns when resolved findings cannot be recorded (stats unwritable)", () => {
    makeDebtRepo();
    const capBase = capture();
    expect(runBaselineCommand([dir], capBase.io)).toBe(0);
    writeFileSync(join(dir, "e2e", "one.spec.ts"), fixedContent());
    // stats.json as a directory: both the resolved-counter write and the
    // milestone write must fail into warnings, not crash the diff.
    mkdirSync(join(dir, ".mjolnir", "stats.json"), { recursive: true });
    const cap = capture();
    expect(runDiffCommand([dir], cap.io)).toBe(0);
    expect(cap.errText()).toContain("counters not recorded");
    expect(cap.errText()).toContain("milestone not recorded");
  });

  it("announces the first-debt-reduction milestone exactly once", () => {
    makeDebtRepo();
    const capBase = capture();
    expect(runBaselineCommand([dir], capBase.io)).toBe(0);

    writeFileSync(join(dir, "e2e", "one.spec.ts"), fixedContent());
    const cap1 = capture();
    expect(runDiffCommand([dir], cap1.io)).toBe(0);
    expect(cap1.text()).toContain("MILESTONE: first debt reduction recorded");

    // Second diff witnesses another resolution but must NOT re-announce.
    const cap2 = capture();
    expect(runDiffCommand([dir], cap2.io)).toBe(0);
    expect(cap2.text()).not.toContain("MILESTONE:");
  });
});
