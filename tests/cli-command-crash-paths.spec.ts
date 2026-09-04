/**
 * CLI command handler crash paths + argv negative cases (Test Hardening
 * Plan — coverage-gap closure, negative tests).
 *
 * Every subcommand handler in src/cli.ts (badge, debt, fix, create-rule,
 * handover, init, pw-report, forensics, triage) follows the identical
 * `try { ... } catch (err) { io.err(...); return 20; }` shape — and none
 * of those catch blocks were ever exercised. This is the tool's entire
 * "never crash the user's terminal" safety net for those commands,
 * completely unverified. It also covers argv-parsing edge cases
 * (a flag as the very last token, with nothing after it) that the
 * existing flag-matrix test didn't reach.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  parseArgs,
  runBadgeCommand,
  runBaselineCommand,
  runCreateRuleCommand,
  runDebtCommand,
  runForensicsCommand,
  runHandoverCommand,
} from "../src/cli.js";

describe("parseArgs: a flag as the last token with nothing after it", () => {
  it("--format with no value is a usage error", () => {
    expect(parseArgs(["--format"])).toBeNull();
  });
  it("--scope with no value is a usage error", () => {
    expect(parseArgs(["--scope"])).toBeNull();
  });
  it("--max-duration with no value is a usage error", () => {
    expect(parseArgs(["--max-duration"])).toBeNull();
  });
});

describe("create-rule: id/title argument combinations", () => {
  it("a valid ID but no --title is a usage error", () => {
    const errs: string[] = [];
    const code = runCreateRuleCommand(["QA-PW-999"], {
      out: () => {},
      err: (...a) => errs.push(a.map(String).join(" ")),
    });
    expect(code).toBe(10);
    expect(errs.join("\n")).toMatch(/Usage/);
  });

  it("--title with no ID is a usage error", () => {
    const code = runCreateRuleCommand(["--title", "Some rule"], {
      out: () => {},
      err: () => {},
    });
    expect(code).toBe(10);
  });

  it("an ID that doesn't match the QA-<FAMILY>-<NNN> pattern is a usage error", () => {
    const code = runCreateRuleCommand(["not-a-valid-id", "--title", "x"], {
      out: () => {},
      err: () => {},
    });
    expect(code).toBe(10);
  });
});

describe("command handlers report a crash (exit 20) instead of throwing, when their write target is unwritable", () => {
  let dir: string;
  let origCwd: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mjolnir-crash-path-"));
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "checkout.spec.ts"),
      "it.only('x', () => { expect(true).toBe(true); });\n",
    );
    origCwd = process.cwd();
    process.chdir(dir);
    try {
      chmodSync(dir, 0o555); // read+execute, no write
    } catch {
      /* platform doesn't support this — tests below no-op gracefully */
    }
  });

  afterEach(() => {
    process.chdir(origCwd);
    try {
      chmodSync(dir, 0o755);
    } catch {
      /* already writable or gone */
    }
    rmSync(dir, { recursive: true, force: true });
  });

  function locked(): boolean {
    try {
      writeFileSync(join(dir, "probe.tmp"), "x");
      rmSync(join(dir, "probe.tmp"));
      return false;
    } catch {
      return true;
    }
  }

  it("`badge` reports exit 20 instead of throwing when its output dir is unwritable", async () => {
    if (!locked()) return;
    const errs: string[] = [];
    await expect(
      runBadgeCommand([dir], {
        out: () => {},
        err: (...a) => errs.push(a.map(String).join(" ")),
      }),
    ).resolves.toBe(20);
    expect(errs.join(" ")).toMatch(/internal error/i);
  });

  it("`create-rule` reports exit 20 instead of throwing when the repo root is unwritable", () => {
    if (!locked()) return;
    let code: number | undefined;
    expect(() => {
      code = runCreateRuleCommand(["QA-PW-998", "--title", "x"], {
        out: () => {},
        err: () => {},
      });
    }).not.toThrow();
    expect(code).toBe(20);
  });

  it("`baseline` reports exit 20 instead of throwing when .mjolnir/ can't be written", async () => {
    if (!locked()) return;
    const errs: string[] = [];
    const code = await runBaselineCommand([dir], {
      out: () => {},
      err: (...a) => errs.push(a.map(String).join(" ")),
    });
    expect(code).toBe(20);
    expect(errs.join(" ")).toMatch(/internal error/i);
  });
});

describe("`forensics` reports exit 20 instead of throwing when the target FILE (not dir) is unreadable", () => {
  let dir: string;
  let target: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mjolnir-forensics-crash-"));
    target = join(dir, "report.json");
    writeFileSync(target, "{}");
  });

  afterEach(() => {
    try {
      chmodSync(target, 0o644);
    } catch {
      /* already gone */
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("an unreadable single-file target surfaces as a handled crash, not a thrown exception", () => {
    let madeUnreadable = false;
    try {
      chmodSync(target, 0o000);
      madeUnreadable = true;
    } catch {
      /* unsupported on this platform */
    }
    if (!madeUnreadable) return;

    let code: number | undefined;
    expect(() => {
      code = runForensicsCommand([target], { out: () => {}, err: () => {} });
    }).not.toThrow();
    // Either it's read anyway (some platforms don't enforce this) or it's
    // handled as a clean crash — never an uncaught throw either way.
    expect([2, 20]).toContain(code);
  });
});

describe("`debt` and `handover` still return a documented exit code against an empty repo", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mjolnir-debt-handover-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("`debt` on a directory with no tests at all does not throw", async () => {
    await expect(
      runDebtCommand([dir], { out: () => {}, err: () => {} }),
    ).resolves.toBe(0);
  });

  it("`handover` on a directory with no tests at all does not throw", async () => {
    await expect(
      runHandoverCommand([dir], { out: () => {}, err: () => {} }),
    ).resolves.toBe(0);
  });
});
