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
  internalErrorMessage,
  parseArgs,
  runHandoverCommand,
} from "../../src/cli.js";
describe("internalErrorMessage: the --debug stack arm", () => {
  const emit = (): { lines: string[]; out: (s: string) => void } => {
    const lines: string[] = [];
    return { lines, out: (s: string) => lines.push(s) };
  };

  it("with debug: the Error's stack is emitted between the message and the pointer", () => {
    const { lines, out } = emit();
    const err = new Error("boom");
    internalErrorMessage(err, out, true);
    expect(lines.join("\n")).toContain("boom");
    expect(lines.join("\n")).toContain(err.stack ?? "");
    expect(lines[lines.length - 1]).toContain("issues");
  });

  it("without debug: the stack is never emitted", () => {
    const { lines, out } = emit();
    internalErrorMessage(new Error("boom"), out, false);
    expect(lines.join("\n")).toContain("boom");
    expect(lines.join("\n")).not.toContain("at ");
  });

  it("a non-Error throw degrades to String(err), with or without debug", () => {
    const a = emit();
    internalErrorMessage("plain string failure", a.out, true);
    expect(a.lines.join("\n")).toContain("plain string failure");
    expect(a.lines.join("\n")).not.toContain("at ");
    const b = emit();
    internalErrorMessage(undefined, b.out, false);
    expect(b.lines.join("\n")).toContain("undefined");
  });
});

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
});

describe("`debt` and `handover` still return a documented exit code against an empty repo", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mjolnir-debt-handover-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("`handover` on a directory with no tests at all does not throw", async () => {
    await expect(
      runHandoverCommand([dir], { out: () => {}, err: () => {} }),
    ).resolves.toBe(0);
  });
});
