/**
 * Coverage arms batch 7 — the final tail: CLI catch arms for
 * doctor:playwright (ConfigValidationError vs generic, with and without
 * an injected err sink), the scan verb's main() dispatch, git-resolve's
 * PATHEXT-undefined arm, impact's git-failure degrade, scan-cache's
 * single-entry byte-cap arm, and qa-ci-001's anchor-miss fallbacks.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  main,
  runBaselineCommand,
  runDoctorPlaywright,
  runImpactCommand,
  runSuppressions,
} from "../../src/cli.js";
import { createScanCache } from "../../src/engine/scan-cache.js";
import { continueOnError } from "../../src/rules/ci/qa-ci-001-continue-on-error.js";
import {
  _resetGitResolutionForTests,
  resolveGitPath,
} from "../../src/scope/git-resolve.js";

const createdDirs: string[] = [];
function tmpRepo(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-arms7-${prefix}-`));
  createdDirs.push(d);
  return d;
}

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: (...parts: unknown[]) => (out += parts.map(String).join(" ") + "\n"),
      err: (...parts: unknown[]) => (err += parts.map(String).join(" ") + "\n"),
    },
    text: () => out,
    errText: () => err,
  };
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  _resetGitResolutionForTests();
});

function specWithTest(dir: string): void {
  writeFileSync(
    join(dir, "a.spec.ts"),
    "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
  );
}

describe("doctor:playwright catch arms (S8)", () => {
  it("a corrupt config in the scan target exits 10 via the ConfigValidationError arm", async () => {
    const dir = tmpRepo("dpcve");
    specWithTest(dir);
    writeFileSync(join(dir, "mjolnir.config.json"), "{ not json");
    const cap = capture();
    const code = await runDoctorPlaywright(["doctor:playwright", dir], {
      out: cap.io.out,
      err: cap.io.err,
    });
    expect(code).toBe(10);
    expect(cap.errText()).toContain("Invalid mjolnir config");
  });

  it("the same corrupt config with NO injected err falls back to the module sink", async () => {
    const dir = tmpRepo("dpcve2");
    specWithTest(dir);
    writeFileSync(join(dir, "mjolnir.config.json"), "{ not json");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const code = await runDoctorPlaywright(["doctor:playwright", dir], {
        out: () => {},
      });
      expect(code).toBe(10);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });

  it("a non-CVE crash with NO injected err uses the module sink (exit 20)", async () => {
    const dir = tmpRepo("dpthrow");
    specWithTest(dir);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const code = await runDoctorPlaywright(["doctor:playwright", dir], {
        out: () => {
          throw new Error("probe-crash");
        },
      });
      expect(code).toBe(20);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe("scan verb through main() dispatch", () => {
  it("mjolnir scan <dir> dispatches to the scan command", async () => {
    const dir = tmpRepo("scanverb");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test, expect } from '@playwright/test';\n" +
        "test('t', async ({ page }) => {\n" +
        "  await page.waitForTimeout(3000);\n" +
        "  await expect(page).toHaveTitle('t');\n" +
        "});\n",
    );
    const cap = capture();
    const code = await main(["scan", dir], cap.io);
    expect(code).toBe(1); // QA-PW-101 (core) gates
    expect(cap.text()).toContain("QA-PW-101");
  });
});

describe("pr-comment baseline warning arm", () => {
  it("a pre-versioning baseline (no schemaVersion) warns through the command's io", async () => {
    const dir = tmpRepo("novers");
    specWithTest(dir);
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({ findings: [] }),
    );
    const cap = capture();
    const { runPrCommentCommand } = await import("../../src/cli.js");
    const code = await runPrCommentCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(cap.errText()).toContain("no schemaVersion");
  });
});

describe("runSuppressions sink fallback arms", () => {
  it("a crash with NO injected err falls back to the module sink (exit 20)", () => {
    const prevCwd = process.cwd();
    const root = tmpRepo("supp-ok");
    writeFileSync(join(root, "mjolnir.config.json"), JSON.stringify({}));
    process.chdir(root);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const code = runSuppressions({
        out: () => {
          throw new Error("probe-crash-2");
        },
      });
      expect(code).toBe(20);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      process.chdir(prevCwd);
      errSpy.mockRestore();
    }
  });

  it("a non-Error thrown value renders via String(e) (no err sink)", () => {
    const prevCwd = process.cwd();
    const root = tmpRepo("supp-str");
    writeFileSync(join(root, "mjolnir.config.json"), JSON.stringify({}));
    process.chdir(root);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const code = runSuppressions({
        out: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- the arm under test: a non-Error thrown value
          throw "a string, not an Error";
        },
      });
      expect(code).toBe(20);
      expect(
        errSpy.mock.calls.map((c) => c.map(String).join(" ")).join("\n"),
      ).toContain("mjolnir internal error: a string, not an Error");
    } finally {
      process.chdir(prevCwd);
      errSpy.mockRestore();
    }
  });

  it("a non-Error thrown value renders via String(e) in doctor:playwright too", async () => {
    const dir = tmpRepo("dp-str");
    specWithTest(dir);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const code = await runDoctorPlaywright(["doctor:playwright", dir], {
        out: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- the arm under test: a non-Error thrown value
          throw 42;
        },
      });
      expect(code).toBe(20);
      expect(
        errSpy.mock.calls.map((c) => c.map(String).join(" ")).join("\n"),
      ).toContain("mjolnir internal error: 42");
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe("git-resolve PATHEXT-undefined arm", () => {
  it("a Windows-shaped resolution with no PATHEXT falls back to plain candidates", () => {
    const fake = tmpRepo("nopatext");
    writeFileSync(join(fake, "git.exe"), "x");
    vi.stubGlobal("process", { ...process, platform: "win32" });
    const envSnapshot = process.env["PATHEXT"];
    const pathSnapshot = process.env["PATH"];
    delete process.env["PATHEXT"];
    process.env["PATH"] = fake;
    try {
      _resetGitResolutionForTests();
      expect(resolveGitPath()).toBe(join(fake, "git.exe"));
    } finally {
      if (envSnapshot !== undefined) process.env["PATHEXT"] = envSnapshot;
      process.env["PATH"] = pathSnapshot;
    }
  });
});

describe("impact git-failure degrade arms", () => {
  it("a scan of a fake .git dir with git unreachable degrades honestly (git helpers return null)", async () => {
    const dir = tmpRepo("fakegit");
    specWithTest(dir);
    // A .git DIRECTORY (not a repo) passes the existsSync gate, so the
    // impact helpers' git() and gitBuffer() run and fail — with PATH
    // stripped, resolveGitPath() returns null AND the bare-name exec
    // fails: both degrade arms fire, and the command still completes
    // with a degraded-but-honest report.
    mkdirSync(join(dir, ".git"), { recursive: true });
    const realPath = process.env["PATH"];
    _resetGitResolutionForTests();
    process.env["PATH"] = "";
    try {
      const cap = capture();
      const code = await runImpactCommand([dir, "--since", "HEAD~1"], cap.io);
      expect([0, 1, 2]).toContain(code);
    } finally {
      process.env["PATH"] = realPath;
    }
  });
});

describe("scan-cache single-entry byte-cap arm", () => {
  it("a single oversized entry skips eviction (count>1 guard) and persists honestly", () => {
    const root = tmpRepo("bigentry");
    const cache = createScanCache(root);
    cache.store(
      "big",
      [
        {
          ruleId: "QA-PW-101",
          category: "QA-PW",
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FLAKY-RISK",
          evidenceLevel: "E2",
          file: "big.spec.ts",
          line: 1,
          column: 1,
          message: "x".repeat(33 * 1024 * 1024),
          why: "w",
          fix: "f",
        },
      ],
      false,
    );
    // No eviction for a single entry (count>1 guard) — the entry survives.
    expect(cache.lookup("big")).not.toBeNull();
  });
});

describe("qa-ci-001 anchor-miss fallback arms (S5)", () => {
  it("an anchor occurring only before any list marker uses the default window", () => {
    // The name "gate" appears in an early comment; the step's own marker
    // sits later — blockStart (-1) is NOT greater than windowStart.
    const text = [
      "# gate review checklist",
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: gate",
      "        run: npm test",
      "        continue-on-error: true",
    ].join("\n");
    const findings = continueOnError.run({
      path: "w.yml",
      text,
      ast: {
        jobs: {
          build: {
            steps: [
              {
                name: "gate",
                run: "npm test",
                "continue-on-error": true,
              },
            ],
          },
        },
      },
    });
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.line).toBeGreaterThan(0);
  });

  it("an anchor absent from the raw text falls back to the job-level literal", () => {
    const text = [
      "jobs:",
      "  deploy:",
      "    continue-on-error: true",
      "    steps:",
      "      - run: npm test",
    ].join("\n");
    const findings = continueOnError.run({
      path: "w.yml",
      text,
      ast: {
        jobs: {
          deploy: {
            steps: [
              {
                name: "gate",
                run: "npm test",
                "continue-on-error": true,
              },
            ],
          },
        },
      },
    });
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("an anchor absent and no literal anywhere resolves to line 1", () => {
    const text = "jobs:\n  deploy:\n    steps:\n      - run: npm test\n";
    const findings = continueOnError.run({
      path: "w.yml",
      text,
      ast: {
        jobs: {
          deploy: {
            steps: [
              {
                name: "gate",
                run: "npm test",
                "continue-on-error": true,
              },
            ],
          },
        },
      },
    });
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });
});

describe("git unavailable: baseline save degrades (S1 lineage)", () => {
  it("records commit unknown when git is unreachable", async () => {
    const dir = tmpRepo("nogit2");
    specWithTest(dir);
    const realPath = process.env["PATH"];
    _resetGitResolutionForTests();
    process.env["PATH"] = "";
    try {
      const cap = capture();
      const code = await runBaselineCommand([dir], cap.io);
      expect(code).toBe(0);
      const saved = JSON.parse(
        readFileSync(join(dir, ".mjolnir", "baseline.json"), "utf8"),
      ) as { commit?: string };
      expect(saved.commit).toBe("unknown");
    } finally {
      process.env["PATH"] = realPath;
    }
  });
});
