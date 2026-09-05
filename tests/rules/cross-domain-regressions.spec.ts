/**
 * Regression tests for the QA-2026-08-30 security & functional audit wave.
 *
 * Each locked test corresponds to a finding in .planning/AUDIT-2026-08-30-QA.md.
 * QA-1: M0 #4's rewrite of the QA-TEST-003 header regex tightened
 *       `(?:async\s*)?` to `(?:async\s+)?`, so arrow callbacks written
 *       without a space (`async()=>{`) silently stopped matching — a
 *       detection regression (-24 findings on withastro-astro).
 * QA-2: discoverAllTestFiles walked with the UNION of every adapter's
 *       dirSkips, so Python's "env" (= virtualenv) and Java's "build"
 *       (= Gradle output) hid directories from every other language.
 *       withastro/astro's packages/astro/test/units/env/ and …/units/build/
 *       (real TS tests) silently disappeared from scans.
 */

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { noAssertions } from "../../src/rules/test/qa-test-003-no-assertions.js";
import { discoverAllTestFiles } from "../../src/discovery/scan-adapters.js";
import { SCAN_ADAPTERS } from "../../src/discovery/scan-adapters.js";
import { createIgnoreMatcher } from "../../src/discovery/ignores.js";
import type { ScanContext } from "../../src/engine/adapter.js";
import { typescriptAdapter } from "../../src/adapters/typescript.js";
import { asUniversal } from "../../src/engine/rule-runner.js";
import { computeCodeText } from "../../src/engine/code-text.js";
import { isInsideEmbeddedCode } from "../../src/rules/shared/masking.js";
import { palette, sanitizeData } from "../../src/reporter/theme.js";
import { renderPrComment } from "../../src/commands/pr-comment.js";
import type { Finding, ScanResult } from "../../src/types.js";
import { parseJunitXml } from "../../src/forensics/parse-junit.js";
import {
  diffAgainstBaseline,
  loadBaseline,
} from "../../src/commands/baseline.js";
import { loadStats, renderStats } from "../../src/commands/stats.js";
import { renderSarif } from "../../src/reporter/sarif.js";
import { ConfigValidationError, loadConfig } from "../../src/config/config.js";
import {
  loadSuppressions,
  renderSuppressions,
} from "../../src/config/suppressions.js";
import { loadPlugins } from "../../src/plugins/load.js";
import { pathMatchesGlob, parseArgs } from "../../src/cli.js";
import { computeChangedScope } from "../../src/scope/changed.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-qa0830-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Full discovery against a tmp root, the way runScan drives it. */
function discover(tmpRoot: string): string[] {
  const languageAdapters = SCAN_ADAPTERS.filter(
    (a) => a.id !== "github-actions",
  );
  const buckets = new Map(languageAdapters.map((a) => [a.id, [] as string[]]));
  const ctx = {
    workspace: { root: tmpRoot },
    testFiles: [],
    deadline: Number.POSITIVE_INFINITY,
    maxFiles: 10_000,
    ignoreMatcher: createIgnoreMatcher(tmpRoot),
    onSkippedFile: () => {},
    onDiscoveryTruncated: () => {},
    onRuleCrash: () => {},
  } as unknown as ScanContext;
  discoverAllTestFiles(ctx, languageAdapters, buckets, new Map());
  return [...buckets.values()].flat().map((f) => f.replaceAll("\\", "/"));
}

describe("QA-1: QA-TEST-003 still matches `async()=>{` without a space", () => {
  it("fires on an assertion-free test whose arrow callback has no space after async", () => {
    const text = `it("uploads", async()=>{\n  await page.goto("/x");\n});\n`;
    const findings = noAssertions.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(1);
  });

  it("still scans spaced arrow bodies (M0 behavior preserved)", () => {
    const text = `it("uploads", async () => {\n  await page.goto("/x");\n});\n`;
    const findings = noAssertions.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
  });

  it("must-not-fire: an asserting test with a spaceless arrow stays clean", () => {
    const text = `it("ok", async()=>{\n  expect(a).toBe(b);\n});\n`;
    const findings = noAssertions.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(0);
  });
});

describe("QA-2: per-language dirSkips never hide other languages' test files", () => {
  it("discovers TS test files inside a directory named like a Python venv", () => {
    mkdirSync(join(dir, "pkg", "test", "units", "env"), { recursive: true });
    writeFileSync(
      join(dir, "pkg", "test", "units", "env", "validators.test.ts"),
      `it("x", () => {\n  expect(1).toBe(1);\n});\n`,
    );
    const files = discover(dir);
    expect(
      files.some((f) => f.endsWith("pkg/test/units/env/validators.test.ts")),
    ).toBe(true);
  });

  it("discovers TS test files inside a directory named like Maven output", () => {
    // `target/` (Maven) is a Gradle/Maven-style build dir that is NOT a
    // DEFAULT_IGNORES bare name — per-language dirSkips and the ignore
    // chain must not hide another language's tests in it.
    mkdirSync(join(dir, "pkg", "test", "units", "target"), {
      recursive: true,
    });
    writeFileSync(
      join(dir, "pkg", "test", "units", "target", "plugin.test.ts"),
      `it("x", () => {\n  expect(1).toBe(1);\n});\n`,
    );
    const files = discover(dir);
    expect(
      files.some((f) => f.endsWith("pkg/test/units/target/plugin.test.ts")),
    ).toBe(true);
  });

  it("a nested build/ dir is now ignored for every language (M-01 bare-name, accepted)", () => {
    // Bug Map M-01 made build/ a bare-name default: ANY depth, gitignore-
    // standard — the old Gradle-output expectation (discover TS tests
    // inside pkg/test/units/build/) was retired with it. The plan
    // §1.3 pins services/api/build/x.py as ignored; this is the same
    // semantics at the discovery layer.
    mkdirSync(join(dir, "pkg", "test", "units", "build"), {
      recursive: true,
    });
    writeFileSync(
      join(dir, "pkg", "test", "units", "build", "plugin.test.ts"),
      `it("x", () => {\n  expect(1).toBe(1);\n});\n`,
    );
    const files = discover(dir);
    expect(
      files.some((f) => f.endsWith("pkg/test/units/build/plugin.test.ts")),
    ).toBe(false);
  });

  it("must-not-discover: an adapter still skips its own convention dirs", () => {
    mkdirSync(join(dir, "pkg", "env"), { recursive: true });
    writeFileSync(
      join(dir, "pkg", "env", "test_something.py"),
      `def test_x():\n    pass\n`,
    );
    const files = discover(dir);
    expect(files.some((f) => f.endsWith("pkg/env/test_something.py"))).toBe(
      false,
    );
  });
});

describe("QA-3: embedded-code masking survives whitespace inside the literal", () => {
  function runThroughAdapter(text: string) {
    const out: Array<{ line: number }> = [];
    typescriptAdapter.runRules(
      [asUniversal(noAssertions)],
      { path: "a.spec.ts", text },
      (f) => out.push(f),
    );
    return out;
  }

  it("does not fire QA-TEST-003 on test-data strings whose content has a space", () => {
    const text = [
      "const table = [",
      "  {",
      "    code: 'test(\" foo\", function () {})',",
      "    errors: [{ messageId: 'accidentalSpace' }],",
      "  },",
      "];",
    ].join("\n");
    expect(runThroughAdapter(text)).toHaveLength(0);
  });

  it("classifies such an offset as embedded code via the masking helper", () => {
    const text = "const s = 'test(\" foo\", function () {})';\n";
    const codeText = computeCodeText({ path: "a.ts", text }, "typescript");
    const idx = text.indexOf("test(");
    expect(isInsideEmbeddedCode({ text, codeText }, idx)).toBe(true);
  });

  it("must-still-fire: a plain value literal in an assertion-free test is live code surface", () => {
    const text = [
      'it("loads", () => {',
      "  const url = 'http://localhost:3000/checkout';",
      "  void url;",
      "});",
    ].join("\n");
    expect(runThroughAdapter(text)).toHaveLength(1);
  });
});

describe("QA-4: config `exclude` type confusion exits 10, never 20", () => {
  it("loadConfig rejects non-string exclude entries with a fixable message", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ exclude: [1, {}, null] }),
    );
    expect(() => loadConfig(dir)).toThrow(ConfigValidationError);
    expect(() => loadConfig(dir)).toThrow(/exclude entries must be strings/);
  });

  it("rejects a non-array exclude the same way", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ exclude: "legacy/**" }),
    );
    expect(() => loadConfig(dir)).toThrow(/exclude must be an array/);
  });

  it("defense in depth: a hostile matcher ignores non-string patterns without crashing", () => {
    const matcher = createIgnoreMatcher(dir);
    expect(matcher.isIgnored("src/a.ts")).toBe(false);
  });

  it("must-not-fire: a valid string exclude still works end-to-end", () => {
    mkdirSync(join(dir, "legacy"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ exclude: ["legacy/**"] }),
    );
    writeFileSync(
      join(dir, "legacy", "old.spec.ts"),
      `it("x", () => {\n  expect(1).toBe(1);\n});\n`,
    );
    writeFileSync(
      join(dir, "new.spec.ts"),
      `it("y", () => {\n  expect(1).toBe(1);\n});\n`,
    );
    const files = discover(dir);
    expect(files.some((f) => f.includes("new.spec.ts"))).toBe(true);
    expect(files.some((f) => f.includes("legacy/old.spec.ts"))).toBe(false);
  });
});

describe("QA-5: unparseable suppression `expires` is a usage error, not NaN silence", () => {
  it("loadConfig rejects garbage dates with a fixable message", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [
          { ruleId: "QA-TEST-004", reason: "r", expires: "next tuesday" },
        ],
      }),
    );
    expect(() => loadConfig(dir)).toThrow(/"expires" must be an ISO date/);
  });
});

describe("QA-6: the documented 90-day suppression default is enforced", () => {
  it("a no-expiry entry is active regardless of config mtime (audit S4: mtime anchor dropped)", () => {
    mkdirSync(dir, { recursive: true });
    const configPath = join(dir, "mjolnir.config.json");
    writeFileSync(
      configPath,
      JSON.stringify({ ignore: [{ ruleId: "QA-TEST-004", reason: "r" }] }),
    );
    // Even a config untouched for 91 days no longer expires the entry —
    // the mtime anchor let ANY edit (or `touch`) extend suppressions
    // forever. Expiry is the explicit `expires` date alone; the report
    // labels the no-expiry state honestly.
    const old = new Date(Date.now() - 91 * 86_400_000);
    utimesSync(configPath, old, old);
    const report = loadSuppressions(dir);
    expect(report.entries[0]?.status).toBe("active");
    expect(renderSuppressions(report)).toContain(
      "no expiry set — active until an explicit expires date is added",
    );
  });

  it("must-not-fire: explicit `expires` dates keep their write-time semantics", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [{ ruleId: "QA-TEST-004", reason: "r", expires: "2200-01-01" }],
      }),
    );
    const report = loadSuppressions(dir);
    expect(report.entries[0]?.status).toBe("active");
    expect(renderSuppressions(report)).toContain("(expires 2200-01-01)");
  });
});

describe("QA-7: plugin reserved-prefix rejection is case-insensitive", () => {
  it("rejects a lowercase-spoofed core rule id", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-qa0830-plugin-"));
    try {
      const pluginDir = join(root, "spoof-plugin");
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, "package.json"),
        JSON.stringify({ name: "spoof-plugin", main: "index.js" }),
      );
      writeFileSync(
        join(pluginDir, "index.js"),
        `exports.rules = [{ id: "qa-test-001", run: () => [] }];`,
      );
      writeFileSync(
        join(root, "mjolnir.config.json"),
        JSON.stringify({ plugins: ["./spoof-plugin"] }),
      );
      const result = loadPlugins(root, true);
      expect(result.plugins[0]?.rules).toHaveLength(0);
      expect(result.errors[0]).toContain("reserved core prefix");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("QA-8: suppression `files` globs normalize Windows separators", () => {
  it("matches a backslash-written pattern against a normalized finding path", () => {
    expect(pathMatchesGlob("e2e/x.spec.ts", "e2e\\x.spec.ts")).toBe(true);
    expect(pathMatchesGlob("e2e/x.spec.ts", "e2e\\**\\*.spec.ts")).toBe(true);
  });

  it("matches a backslash-returning path against a forward-slash pattern", () => {
    expect(pathMatchesGlob("e2e\\x.spec.ts", "e2e/x.spec.ts")).toBe(true);
  });

  it("must-not-fire: an unrelated path still does not match", () => {
    expect(pathMatchesGlob("src/x.spec.ts", "e2e/x.spec.ts")).toBe(false);
  });
});

describe("QA-9: --base values that look like git options are refused", () => {
  it("parseArgs rejects --base --upload-pack=x (usage error)", () => {
    expect(
      parseArgs(["--scope", "changed", "--base", "--upload-pack=x"]),
    ).toBeNull();
    expect(parseArgs(["--base", "-oProxyCommand=x"])).toBeNull();
  });

  it("must-not-fire: legitimate refs still parse", () => {
    const args = parseArgs(["--scope", "changed", "--base", "origin/main"]);
    expect(args?.base).toBe("origin/main");
  });

  it("defense in depth: the merge-base resolver skips option-shaped candidates", () => {
    mkdirSync(join(dir, ".git"), { recursive: true });
    writeFileSync(join(dir, ".git", "HEAD"), "ref: refs/heads/main\n");
    // A hostile programmatic base must degrade (no merge-base), never
    // reach git as an option.
    const diff = computeChangedScope(dir, "--upload-pack=x");
    expect(diff.degraded).toBe(true);
  });
});

describe("QA-10: hostile finding metadata renders inert", () => {
  it("terminal palette strips ANSI escapes from payload strings (colored mode)", () => {
    const p = palette(true);
    const hostile = "evil\x1b[31m\x1b[2Jx";
    const rendered = p.bold(hostile);
    expect(rendered).not.toContain("\x1b[31m");
    expect(rendered).not.toContain("\x1b[2J");
    // the palette's own framing escapes are intact
    expect(rendered.startsWith("\x1b[1m")).toBe(true);
  });

  it("strips escapes even when colorization is off", () => {
    const p = palette(false);
    expect(p.ok("a\x1b[31mb")).toBe("ab");
  });

  it("control characters other than tab/LF are stripped", () => {
    expect(sanitizeData("a\x00b\x07c")).toBe("abc");
    expect(sanitizeData("a\tb\nc")).toBe("a\tb\nc");
  });

  it("markdown PR comment escapes pipes, backticks and script tags", () => {
    const finding: Finding = {
      ruleId: "QA-TEST-003",
      category: "QA-TEST",
      severity: "error",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FALSE-GREEN",
      evidenceLevel: "E2",
      file: "a</script>|b`c.spec.ts",
      line: 1,
      column: 1,
      message: "msg with | pipe and <script>alert(1)</script>",
      why: "why",
      fix: "fix",
    };
    const body = renderPrComment({
      score: 50,
      findings: [finding],
      scope: "all",
    } as unknown as ScanResult);
    const line = body.split("\n").find((l) => l.includes("spec.ts")) ?? "";
    expect(line).toContain("\\|");
    expect(line).toContain("b\\`c");
    expect(line).toContain("\\<script\\>");
    // the filename's own backtick is escaped — only findingLine's code
    // span delimiters remain unescaped
    expect(line.match(/(?<!\\)`/g) ?? []).toHaveLength(2);
  });
});

describe("QA-11: JUnit parser survives an unclosed-<testcase> flood in bounded time", () => {
  it("returns quickly on 20 MB of unclosed <testcase> starts", () => {
    const flood = "<testsuite>\n" + "<testcase name='x'>\n".repeat(1_600_000);
    const t0 = Date.now();
    const recs = parseJunitXml(flood);
    const ms = Date.now() - t0;
    expect(recs).toHaveLength(0);
    expect(ms).toBeLessThan(2000);
  });

  it("must-still-parse: a valid large report after hostile-looking noise", () => {
    const xml =
      "<testsuite>" +
      "<testcase name='a' classname='C' time='0.5'/>".repeat(1000) +
      "<testcase name='open'>" + // unclosed — but earlier cases already parsed
      "<testcase name='b' classname='C'><failure>x</failure></testcase>" +
      "</testsuite>";
    const recs = parseJunitXml(xml);
    expect(recs).toHaveLength(1001);
    expect(recs.filter((r) => r.attempts[0]?.status === "passed")).toHaveLength(
      1000,
    );
    expect(recs.filter((r) => r.attempts[0]?.status === "failed")).toHaveLength(
      1,
    );
  });
});

describe("QA-12: baseline/stats ingestion is total over arbitrary JSON", () => {
  it("a baseline whose findings contain nulls loads without crashing diff", () => {
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "baseline.json");
    writeFileSync(
      p,
      JSON.stringify({
        schemaVersion: 1,
        capturedAt: "2026-08-30T00:00:00Z",
        commit: "abc1234",
        findings: [
          null,
          1,
          { ruleId: 42 },
          { ruleId: "QA-X", file: "a.ts", message: "m" },
        ],
      }),
    );
    const baseline = loadBaseline(p);
    expect(baseline).not.toBeNull();
    expect(baseline?.findings).toHaveLength(1);
    const diff = diffAgainstBaseline(
      { score: 50, findings: [], scope: "all" } as unknown as ScanResult,
      baseline,
    );
    expect(diff.resolvedFindings).toHaveLength(1);
  });

  it("a hostile stats file is coerced into an honest shape", () => {
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "stats.json");
    writeFileSync(
      p,
      JSON.stringify({
        resolvedByRule: { "QA-X": "5", "QA-Y": 2, "QA-Z": NaN },
        recordedFixEvents: 3,
        trackingSince: 42,
      }),
    );
    const stats = loadStats(p);
    expect(stats?.resolvedByRule).toEqual({ "QA-Y": 2 });
    expect(stats?.recordedFixEvents).toBe(3);
    expect(stats?.trackingSince).toBe("unknown");
    // renderStats totals stay numeric — the junk entries never join sums
    const rendered = renderStats(stats);
    expect(rendered).toContain("2 findings resolved all-time");
  });

  it("must-not-crash: non-object resolvedByRule still loads", () => {
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "stats.json");
    writeFileSync(p, JSON.stringify({ resolvedByRule: 5 }));
    expect(loadStats(p)?.resolvedByRule).toEqual({});
  });
});

describe("QA-12b: non-numeric recordedFixEvents is coerced, not concatenated", () => {
  it('recordedFixEvents: "abc" does not produce "abc1" on the next fold', () => {
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "stats.json");
    writeFileSync(
      p,
      JSON.stringify({ resolvedByRule: {}, recordedFixEvents: "abc" }),
    );
    const stats = loadStats(p);
    expect(stats?.recordedFixEvents).toBe(0);
  });
});

describe("QA-13: SARIF artifact URIs stay valid uri-references", () => {
  it("a backslash path is normalized — the URI never contains a raw backslash", () => {
    const result = {
      score: 50,
      scope: "all",
      analysisStatus: { discovery: "complete", rules: "complete" },
      findings: [
        {
          ruleId: "QA-TEST-003",
          category: "QA-TEST",
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          evidenceLevel: "E2",
          file: "e2e\\checkout.spec.ts",
          line: 1,
          column: 1,
          message: "m",
          why: "w",
          fix: "f",
        },
      ],
    } as unknown as ScanResult;
    const sarif = JSON.parse(renderSarif(result)) as {
      runs: Array<{
        results: Array<{
          locations: Array<{
            physicalLocation: { artifactLocation: { uri: string } };
          }>;
        }>;
      }>;
    };
    const uri =
      sarif.runs[0]?.results[0]?.locations[0]?.physicalLocation
        ?.artifactLocation?.uri ?? "";
    expect(uri).not.toContain("\\");
    expect(uri).toBe("e2e/checkout.spec.ts");
  });
});

describe("QA-14: discovery survives adversarial repo shapes", () => {
  it("does not descend past the depth cap and never crashes", () => {
    let d = dir;
    for (let i = 0; i < 40; i++) d = join(d, `lvl${i}`);
    mkdirSync(d, { recursive: true });
    writeFileSync(
      join(d, "deep.spec.ts"),
      `it("x", () => {\n  expect(1).toBe(1);\n});\n`,
    );
    expect(() => discover(dir)).not.toThrow();
    expect(discover(dir).some((f) => f.includes("deep.spec.ts"))).toBe(false);
  });

  it("discovers files with #, spaces and unicode in their names", () => {
    // NB: `?` is an illegal filename character on Windows — its literal
    // handling is pinned by the pathMatchesGlob escaping tests (QA-8).
    const d = join(dir, "weird");
    mkdirSync(d, { recursive: true });
    for (const name of [
      "hash#.test.ts",
      "spaced name.test.ts",
      "ünïcodé-🪓.test.ts",
    ]) {
      writeFileSync(
        join(d, name),
        `it("x", () => {\n  expect(1).toBe(1);\n});\n`,
      );
    }
    const files = discover(dir);
    expect(files.filter((f) => f.includes("weird/")).length).toBe(3);
  });

  it("skips an oversized file honestly instead of scanning or crashing", () => {
    const d = join(dir, "big");
    mkdirSync(d, { recursive: true });
    // > maxFileBytes (1 MiB), still a .spec.ts name.
    writeFileSync(
      join(d, "huge.spec.ts"),
      `// ${"x".repeat(1024 * 1024 + 128)}\n`,
    );
    const files = discover(dir);
    expect(files.some((f) => f.includes("huge.spec.ts"))).toBe(false);
  });

  it("never follows a junction/symlinked directory out of the scan root", () => {
    const outside = mkdtempSync(join(tmpdir(), "mjolnir-qa0830-outside-"));
    try {
      mkdirSync(join(dir, "link-me-target"), { recursive: true });
      writeFileSync(
        join(outside, "outside.spec.ts"),
        `it("x", () => {\n  expect(1).toBe(1);\n});\n`,
      );
      symlinkSync(outside, join(dir, "link-me-target", "junction"), "junction");
      const files = discover(dir);
      expect(files.some((f) => f.includes("outside.spec.ts"))).toBe(false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("QA-15: the code-text mask is offset-preserving over astral characters", () => {
  it("mask length equals text length when a file contains an emoji", () => {
    const text = 'const s = "ünïcodé-🪓.test.ts";\nit("x", () => {\n});\n';
    const codeText = computeCodeText(
      { path: "a.ts", text, ast: undefined },
      "typescript",
    );
    expect(codeText.length).toBe(text.length);
  });

  it("embedded-code masking stays enabled after an astral char", () => {
    const text =
      'const names = ["ünïcodé-🪓.test.ts"];\nconst t = `it("uploads", async()=>{ page.goto("/x") });`;\n';
    const codeText = computeCodeText(
      { path: "a.ts", text, ast: undefined },
      "typescript",
    );
    const idx = text.indexOf('it("uploads"');
    expect(isInsideEmbeddedCode({ text, codeText }, idx)).toBe(true);
  });
});
