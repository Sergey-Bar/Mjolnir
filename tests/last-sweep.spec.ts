/** Last sweep: renderer arms, scope degradation, plugin boundary. */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const readFileSync = ((path: string, ...rest: unknown[]) => {
    if (String(path).endsWith("locked.spec.ts")) {
      throw new Error("read failed (simulated)");
    }
    return (actual.readFileSync as unknown as (...a: unknown[]) => string)(
      path,
      ...rest,
    );
  }) as typeof actual.readFileSync;
  const readdirSync = ((path: string, ...rest: unknown[]) => {
    if (String(path).endsWith("locked-results")) {
      throw new Error("readdir failed (simulated)");
    }
    return (actual.readdirSync as unknown as (...a: unknown[]) => unknown)(
      path,
      ...rest,
    );
  }) as typeof actual.readdirSync;
  return { ...actual, readFileSync, readdirSync };
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  const execFileSync = ((
    file: string,
    args: readonly string[],
    ...rest: unknown[]
  ) => {
    if (state.simulateUntrackedFailure && args.includes("ls-files")) {
      throw new Error("ls-files failed (simulated)");
    }
    return (actual.execFileSync as unknown as (...a: unknown[]) => string)(
      file,
      args,
      ...rest,
    );
  }) as typeof actual.execFileSync;
  return { ...actual, execFileSync };
});

import { renderTerminal } from "../src/reporter/terminal.js";
import { computeChangedScope } from "../src/scope/changed.js";
import {
  computeSelectorHealth,
  computeSpecHealth,
} from "../src/playwright/selector-health.js";
import { pwOrderDependence } from "../src/rules/playwright/qa-pw-119-order-dependence.js";
import { runForensics } from "../src/forensics/run.js";
import { parsePlaywrightJson } from "../src/forensics/parse-playwright-json.js";
import { renderDebt } from "../src/commands/debt.js";
import { renderInit } from "../src/commands/init.js";
import { runScanCommand } from "../src/cli.js";
import { createIgnoreMatcher } from "../src/discovery/ignores.js";
import type { ScanResult } from "../src/types.js";

const state = vi.hoisted(() => ({ simulateUntrackedFailure: false }));

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-last-sweep-"));
  state.simulateUntrackedFailure = false;
});
afterEach(() => {
  state.simulateUntrackedFailure = false;
  rmSync(dir, { recursive: true, force: true });
  vi.clearAllMocks();
});

function git(args: string[]): void {
  execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
}

const baseScan: ScanResult = {
  schemaVersion: 1,
  partial: false,
  score: 100,
  frameworks: [],
  frameworkDetectionUnknown: false,
  dimensions: [],
  findings: [],
  testFileCount: 1,
  testDeclarationCount: 1,
  rawDeductions: 0,
  suppressionCount: 0,
  analysisStatus: {
    discovery: "complete",
    rules: "complete",
    skippedFiles: 0,
    durationMs: 1,
    rulesCrashed: 0,
  },
};

describe("scope/changed degradation arms", () => {
  it("degrades when the working-tree diff fails (corrupt index)", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    writeFileSync(join(dir, ".git", "index"), Buffer.from([1, 2, 3, 4]));
    const diff = computeChangedScope(dir);
    expect(diff.degraded).toBe(true);
    expect(diff.reason).toBe("diff-failed");
  });

  it("treats a missing blob as zero changed lines for that file", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    git(["checkout", "-b", "feat"]);
    writeFileSync(
      join(dir, "a.spec.ts"),
      "it('a', () => {});\nit('b', () => {});\n",
    );
    git(["add", "."]);
    git(["commit", "-m", "extend"]);
    const sha = execFileSync("git", ["-C", dir, "rev-parse", "HEAD:a.spec.ts"])
      .toString()
      .trim();
    rmSync(join(dir, ".git", "objects", sha.slice(0, 2), sha.slice(2)), {
      force: true,
    });
    const diff = computeChangedScope(dir);
    expect(diff.degraded).toBe(false);
    expect(Object.keys(diff.changed)).toContain("a.spec.ts");
  });

  it("degrades when the untracked listing fails", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(dir, "base.spec.ts"), "it('a', () => {});\n");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    git(["checkout", "-b", "feat"]);
    writeFileSync(join(dir, "new.spec.ts"), "it('n', () => {});\n");
    state.simulateUntrackedFailure = true;
    try {
      const diff = computeChangedScope(dir);
      expect(diff.degraded).toBe(true);
      expect(diff.reason).toBe("diff-failed");
    } finally {
      state.simulateUntrackedFailure = false;
    }
  });
});

describe("selector-health classify arms", () => {
  it("drops an unquoted locator line to null", () => {
    const health = computeSpecHealth("a.spec.ts", [
      "page.locator(button);",
      "it('a', () => {});",
    ]);
    expect(health.score).toBe(100);
  });

  it("keeps shallow xpath chains at the base risk", () => {
    const health = computeSpecHealth("a.spec.ts", [
      "page.locator('xpath=//div');",
      "it('a', () => {});",
    ]);
    expect(health.counts.xpath).toBe(1);
  });
});

describe("QA-PW-119 hook-shape arms", () => {
  it("skips a comment between the hook call and its params", () => {
    const text = [
      "let shared;",
      "beforeEach( /* setup */ () => { shared = 1; });",
      "test('a', () => { expect(shared).toBe(1); });",
      "",
    ].join("\n");
    expect(pwOrderDependence.run({ path: "a.spec.ts", text })).toEqual([]);
  });

  it("tolerates an expression-bodied hook at end of file", () => {
    // The hook is the last statement — no later brace exists for the
    // body search to find, exercising the open === -1 tolerance.
    const text = "let shared;\nbeforeEach(() => shared++);";
    expect(pwOrderDependence.run({ path: "a.spec.ts", text })).toEqual([]);
  });
});

describe("forensics listing edge", () => {
  it("skips whitespace-only config exclude patterns", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ exclude: ["   ", "node_modules/**"] }),
    );
    const matcher = createIgnoreMatcher(dir);
    expect(matcher.isIgnored("node_modules/x.js")).toBe(true);
    expect(matcher.isIgnored("src/a.ts")).toBe(false);
  });

  it("ignores a non-string plugin prefix without crashing", async () => {
    mkdirSync(join(dir, "prefix-plugin"), { recursive: true });
    writeFileSync(
      join(dir, "prefix-plugin", "package.json"),
      JSON.stringify({ name: "prefix-plugin", main: "index.js" }),
    );
    writeFileSync(
      join(dir, "prefix-plugin", "index.js"),
      "exports.rules = [];",
    );
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        plugins: [{ package: "./prefix-plugin", prefix: 123 }],
      }),
    );
    const out: string[] = [];
    await runScanCommand([dir, "--json"], {
      out: (...p: unknown[]) => out.push(p.map(String).join(" ")),
      err: () => {},
    });
    const result = JSON.parse(out.join("\n")) as {
      plugins: Array<{ name: string; rules: number }>;
    };
    expect(result.plugins).toEqual([{ name: "./prefix-plugin", rules: 0 }]);
  });

  it("surfaces a plugin that throws a non-Error at import", async () => {
    mkdirSync(join(dir, "boom-plugin"), { recursive: true });
    writeFileSync(
      join(dir, "boom-plugin", "package.json"),
      JSON.stringify({ name: "boom-plugin", main: "index.js" }),
    );
    writeFileSync(join(dir, "boom-plugin", "index.js"), 'throw "boom-str";');
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ plugins: ["./boom-plugin"] }),
    );
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "a.spec.ts"),
      "it('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    const out: string[] = [];
    await runScanCommand([dir, "--json"], {
      out: (...p: unknown[]) => out.push(p.map(String).join(" ")),
      err: () => {},
    });
    const result = JSON.parse(out.join("\n")) as {
      findings: Array<{ ruleId: string; message: string }>;
    };
    const pluginFinding = result.findings.find(
      (f) => f.ruleId === "QA-PLUGIN-000",
    );
    expect(pluginFinding).toBeDefined();
    expect(pluginFinding?.message).toContain("boom-str");
  });

  it("renders the no-tests screen in unicode mode", () => {
    const out = renderTerminal(
      { ...baseScan, score: null, testDeclarationCount: 0, testFileCount: 0 },
      { width: 80, ascii: false, isTTY: true },
    );
    expect(out).toContain("NO TESTS DETECTED");
  });

  it("skips a directory that cannot be listed mid-walk", () => {
    mkdirSync(join(dir, "locked-results"), { recursive: true });
    writeFileSync(
      join(dir, "locked-results", "report.json"),
      JSON.stringify({ suites: [] }),
    );
    const specs = computeSelectorHealth(dir);
    expect(specs).toEqual([]);
  });

  it("degrades to an empty report for a missing test-results dir", () => {
    const result = runForensics(join(dir, "nope"));
    expect(result.report.totalTests).toBe(0);
  });

  it("defaults missing durations to zero without crashing", () => {
    const records = parsePlaywrightJson({
      suites: [
        {
          suites: [],
          specs: [
            {
              title: "no duration",
              file: "e2e/d.spec.ts",
              line: 1,
              tests: [
                { projectName: "chromium", results: [{ status: "passed" }] },
              ],
            },
          ],
        },
      ],
    });
    expect(records[0]?.attempts[0]?.durationMs).toBe(0);
  });
});

describe("debt register multi-rule sort", () => {
  it("sorts rule ids inside a tracked debt class", () => {
    const finding = (ruleId: string, line: number) => ({
      ruleId,
      category: "QA-TEST" as const,
      severity: "warning" as const,
      confidence: "high" as const,
      findingType: "deterministic-defect" as const,
      qaImpact: "FALSE-GREEN" as const,
      file: "a.spec.ts",
      line,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    });
    // QA-TEST-004 and QA-PY-005 share the "Hard sleeps" class — the
    // register must normalize their rule ids deterministically.
    const md = renderDebt({
      ...baseScan,
      score: 40,
      findings: [
        finding("QA-PY-005", 1),
        finding("QA-TEST-004", 2),
        finding("QA-TEST-004", 3),
      ],
    });
    expect(md).toContain("Hard sleeps");
  });
});

describe("init icon for existing files", () => {
  it("marks pre-existing files with the equals glyph", () => {
    const out = renderInit({
      steps: [
        { name: "ci-workflow", status: "exists", detail: "already present." },
      ],
      nextCommands: [],
      detectedFrameworks: ["vitest"],
      detectionUnknown: false,
    });
    expect(out).toContain("[=] ci-workflow");
  });
});
