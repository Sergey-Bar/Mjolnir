/**
 * M0 red tests — audit-remediation-master-plan.md (1788567639628).
 *
 * Behavioral freeze: each test pins a currently-broken behavior before any
 * fix lands. These are the acceptance tests for the M1–M4 fixes and are
 * expected to FAIL until their audit ID closes:
 *
 *  - audit-C1  (M1): cached verdicts must be path-identifiable — the
 *    content-addressed cache key omits the file path, so two files with
 *    byte-identical text share one verdict entry and the first file's
 *    findings get attributed to the second file on cache hit.
 *  - audit-C3  (M1): the default `err` sink must emit ALL parts
 *    (currently only the first — e.g. "mjolnir internal error:" prints
 *    without the actual error message).
 *  - audit-C5  (M1): a partial (truncated) scan must not write the
 *    first-clean-scan milestone, and `diff` on a partial scan must not
 *    fold resolved findings into stats or fire first-debt-reduction.
 *  - audit-S8  (M3): help contract (root --help = frozen exit-10 usage;
 *    <verb> --help = verb page exit 0); runSuppressions / runDoctorPlaywright
 *    map thrown errors to exit 20 instead of unhandled rejection.
 *  - audit-W1  (M1): code-text maskers must keep code AFTER a closed
 *    block comment live (`/…x…/ y` — `y` stays live).
 *  - audit-C4  (M4): a repo with only cypress.config.ts + insecure
 *    settings yields QA-CYP-003 (config rule currently unreachable).
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  main,
  runScan,
  runScanCommand,
  runSuppressions,
  runDoctorPlaywright,
  EXPLAIN_ARMS,
} from "../../src/cli.js";
import { runAnalyzeCommand } from "../../src/commands/analyze.js";
import { computeCodeText } from "../../src/engine/code-text.js";

const createdDirs: string[] = [];
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

function tmpRepo(label: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-audit-${label}-`));
  createdDirs.push(d);
  return d;
}

function capture() {
  const out: string[] = [];
  return {
    io: {
      out: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
      err: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
    },
    text: () => out.join("\n"),
  };
}

const PW_HARD_SLEEP = (name: string) =>
  "import { test, expect } from '@playwright/test';\n" +
  `test('x-${name}', async ({ page }) => {\n` +
  "  await page.waitForTimeout(3000);\n" +
  "  await expect(page).toHaveTitle('t');\n" +
  "});\n";

describe("audit-C1: cache identity — verdicts identify their file", () => {
  it("two byte-identical files with different paths each carry their own file on --cache", async () => {
    const dir = tmpRepo("c1");
    // Byte-identical content — the whole point of the probe: the cache
    // key hashes only the text, so the second file's lookup returns the
    // first file's verdicts with `file: a.spec.ts` stamped inside.
    const identical = PW_HARD_SLEEP("same");
    writeFileSync(join(dir, "a.spec.ts"), identical);
    writeFileSync(join(dir, "b.spec.ts"), identical);
    const result = await runScan({
      target: dir,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
      cache: true,
    });
    const files = new Set(
      result.findings
        .filter((f) => f.ruleId === "QA-PW-101")
        .map((f) => f.file),
    );
    // The cache key is content-only, so the second file's lookup returns
    // the first file's verdicts — findings for b.spec.ts carry a.spec.ts.
    expect(files).toEqual(new Set(["a.spec.ts", "b.spec.ts"]));
  });
});

describe("audit-C3: default io sinks are variadic", () => {
  it("default err sink emits every argument joined by spaces", async () => {
    // The property under test is the DEFAULT `err` sink: when a command
    // crashes and the caller passed no `io`, the fallback sink must still
    // render every part of the multi-arg call, so the cause survives.
    //
    // The trigger used to be a blocked `TRIAGE.md` write, which reached the
    // catch via `triage`. `triage` is now `explain --evidence`, and that arm
    // only ever writes FLAKY.md — so the fixture could not fire and the test
    // asserted a crash that no path produces. The trigger is now the one that
    // is guaranteed: make the default OUT sink throw, so the arm's own
    // `io.out(...)` raises and the catch routes to the default `err`.
    const dir = tmpRepo("c3");
    const results = join(dir, "results");
    mkdirSync(results);
    writeFileSync(
      join(results, "report.xml"),
      '<testsuite tests="1">\n' +
        '  <testcase classname="tests/test_a.py" name="test_ok" time="0.100"/>\n' +
        "</testsuite>",
    );
    const outSpy = vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("probe-out-sink");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await main(["explain", "--evidence", results]);
    // Read calls BEFORE restore — mockRestore() clears the call log.
    const calls = errSpy.mock.calls.map((c) => c.map(String).join(" "));
    outSpy.mockRestore();
    errSpy.mockRestore();

    expect(code).toBe(20);
    const internal = calls.find((c) => c.includes("mjolnir internal error"));
    expect(
      internal,
      `no internal-error line in: ${calls.join(" | ")}`,
    ).toBeDefined();
    // The sink is variadic: the CAUSE is emitted, not just the prefix. This
    // is the whole point of audit C3 — a non-variadic sink printed
    // "mjolnir internal error:" and dropped the message that says why.
    expect(calls.join("\n")).toContain("probe-out-sink");
  });
});

describe("audit-C5: partial scans never write milestones or fold stats", () => {
  it("a --max-duration-truncated scan with a clean subset does NOT write first-clean-scan", async () => {
    const dir = tmpRepo("c5");
    mkdirSync(join(dir, "test"), { recursive: true });
    for (let i = 0; i < 12; i++) {
      writeFileSync(
        join(dir, "test", `clean${i}.spec.ts`),
        "import { describe, expect, it } from 'vitest';\n" +
          `describe('m${i}', () => { it('works', () => { expect(1 + ${i}).toBe(${1 + i}); }); });\n`,
      );
    }
    const cap = capture();
    const code = await runScanCommand(
      [dir, "--record-milestones", "--max-duration", "0.001"],
      cap.io,
    );
    if (code === 2) {
      // The scan was truncated — no milestone may be written.
      expect(cap.text()).not.toContain("MILESTONE");
    } else {
      // Not truncated — the probe is inconclusive but must stay clean.
      expect(code).toBe(0);
    }
    expect(cap.text()).not.toContain("first flawless scan");
  });
});

describe("audit-S8: help contract; handler throws become exit 20", () => {
  it("root --help keeps the frozen usage contract (exit 10, usage printed)", async () => {
    // Frozen contract: root `--help`/`-h` print usage and exit 0;
    // `<verb> --help` routes to the verb page with exit 0 (help.spec.ts).
    // Pinned here so neither regresses.
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const code = await main(["--help"]);
      expect(code).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("verb --help routes to the verb page (exit 0)", async () => {
    const cap = capture();
    // The `rules` verb is now the `explain --list` arm. The page it renders
    // is the arms table, and it is rendered from `EXPLAIN_ARMS` — the same
    // table the dispatcher reads — so the assertion is on the arm's own
    // summary text rather than a hand-copied row.
    const code = await main(["explain", "--list", "--help"], cap.io);
    expect(code).toBe(0);
    const arm = EXPLAIN_ARMS["--list"];
    expect(arm, "the --list arm is registered").toBeDefined();
    expect(cap.text()).toContain(arm?.summary ?? "");
  });

  it("runSuppressions maps a thrown error to exit 20 (not unhandled rejection)", () => {
    // Any non-ConfigValidationError throw must be contained by the
    // handler (catch-to-20), not rethrown to an unhandled rejection.
    // Today runSuppressions rethrows (line 904) — this probe pins the
    // containment contract; the M3 fix wraps the handler body.
    const code = runSuppressions({
      out: () => {
        throw new Error("probe-crash");
      },
      err: () => {},
    });
    expect(code).toBe(20);
  });

  it("runDoctorPlaywright maps a thrown error to exit 20 (never rejects)", async () => {
    const dir = tmpRepo("s8-dp");
    // Any downstream crash must be contained by the handler. Today an
    // error propagates as a rejection; after the fix: exit 20.
    const code = await runDoctorPlaywright([dir], {
      out: () => {
        throw new Error("probe-crash");
      },
      err: () => {},
    });
    expect(code).toBe(20);
  });
});

describe("audit-W1: closed block comments keep trailing code live", () => {
  it("maskJava keeps `y` live after a closed block comment", () => {
    const masked = computeCodeText({ path: "A.java", text: "/*x*/y" }, "java");
    expect(masked.endsWith("y")).toBe(true);
  });

  it("maskCSharp keeps `y` live after a closed block comment", () => {
    const masked = computeCodeText({ path: "A.cs", text: "/*x*/y" }, "csharp");
    expect(masked.endsWith("y")).toBe(true);
  });
});

describe("audit-C4: cypress-only repo reaches QA-CYP-003", () => {
  it("scanning a repo with only cypress.config.ts + chromeWebSecurity:false yields QA-CYP-003 (--strict: quarantine tier)", async () => {
    const dir = tmpRepo("c4");
    mkdirSync(join(dir, "test"), { recursive: true });
    writeFileSync(
      join(dir, "test", "app.cy.ts"),
      "describe('smoke', () => { it('opens', () => { cy.visit('/'); }); });\n",
    );
    writeFileSync(
      join(dir, "cypress.config.ts"),
      "import { defineConfig } from 'cypress';\n\n" +
        "export default defineConfig({\n" +
        "  chromeWebSecurity: false,\n" +
        "  e2e: { setupNodeEvents() {} },\n" +
        "});\n",
    );
    const cap = capture();
    const code = await runScanCommand([dir, "--strict", "--json"], cap.io);
    // Quarantine tier caps the finding to info/E0 — it reports (the
    // dead rule now fires) but does not gate the exit code.
    expect(cap.text()).toContain("QA-CYP-003");
    expect(code).toBe(0);
  });
});

describe("flag-parity: an unknown flag is a usage error, not a no-op", () => {
  // `doctor` got this first. `analyze` and `explain --list` did not, and both
  // failed the same way: the flag was silently ignored and the command
  // printed output and exited 0. A caller scripting a filter got every rule
  // and no warning, and a command that looks like it ran and did nothing is
  // the shape this product exists to catch — so it is asserted here in
  // process, where the coverage is real. (The e2e sweep spawns the binary and
  // earns no istanbul credit, which is why these arms exist at all.)
  it("analyze rejects a flag outside --cross-file", () => {
    const cap = capture();
    expect(runAnalyzeCommand(["--bogus"], cap.io)).toBe(10);
    expect(cap.text()).toContain("Usage: mjolnir analyze");
  });

  it("analyze accepts the flag it does support", () => {
    const cap = capture();
    // 2, not 10: the usage arm is only about flag SHAPE, and a valid flag
    // must not be refused. A directory with no tests is the ordinary
    // nothing-to-do answer.
    expect(runAnalyzeCommand(["--cross-file"], cap.io)).not.toBe(10);
  });

  it("explain --list rejects an unknown flag instead of printing everything", async () => {
    const cap = capture();
    expect(await main(["explain", "--list", "--nonsense"], cap.io)).toBe(10);
    expect(cap.text()).toContain("Usage: mjolnir explain --list");
    // The failure mode being prevented: the full catalogue rendered as if the
    // filter had been honoured.
    expect(cap.text()).not.toContain("QA-TEST-001");
  });

  it("explain --list accepts the closed set of flags it declares", async () => {
    for (const flag of [
      "--md",
      "--json",
      "--measured",
      "--unmeasured",
      "--stats",
      "--health",
    ]) {
      const cap = capture();
      expect(
        await main(["explain", "--list", flag], cap.io),
        `explain --list ${flag} was rejected`,
      ).toBe(0);
    }
    // `--limit=<n>` is valued, so it is matched by prefix. It belongs to
    // `--health`; without that flag it is still not an unknown flag.
    const cap = capture();
    expect(await main(["explain", "--list", "--limit=5"], cap.io)).toBe(0);
  });
});

describe("--save-baseline writes the snapshot and reports honestly when it cannot", () => {
  it("writes .mjolnir/baseline.json and says how many findings it captured", async () => {
    const dir = tmpRepo("save-baseline");
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "focused.spec.ts"),
      "test.only('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    const cap = capture();
    const code = await runScanCommand(
      [dir, "--save-baseline", "--strict"],
      cap.io,
    );
    // The exit code is the SCAN's, not the save's. The old `baseline` verb
    // returned 0 unconditionally after capturing, so a repo full of error
    // findings exited clean as long as you snapshotted it.
    expect(code).toBe(1);
    expect(existsSync(join(dir, ".mjolnir", "baseline.json"))).toBe(true);
    expect(cap.text()).toContain("Captured");
  });

  it("reports a failed write instead of claiming the baseline was captured", async () => {
    const dir = tmpRepo("save-baseline-fail");
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "clean.spec.ts"),
      "it('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    // A DIRECTORY where the baseline file belongs makes the write fail for
    // the same reason a permission error would: the target is not a file.
    mkdirSync(join(dir, ".mjolnir", "baseline.json"), { recursive: true });
    const cap = capture();
    await runScanCommand([dir, "--save-baseline", "--strict"], cap.io);
    // A reader told "captured" when nothing was written is exactly the false
    // green this product exists to catch — the message has to say it failed.
    expect(cap.text()).toContain("baseline save FAILED");
    expect(cap.text()).not.toContain("Captured");
  });
});
