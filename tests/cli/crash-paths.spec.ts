/**
 * CLI command handler crash paths + argv negative cases (Test Hardening
 * Plan — coverage-gap closure, negative tests).
 *
 * Every subcommand handler in src/cli.ts follows the identical
 * `try { ... } catch (err) { internalErrorMessage(...); return 20; }` shape —
 * and none of those catch blocks were ever exercised. This is the tool's
 * entire "never crash the user's terminal" safety net for those commands,
 * completely unverified. It also covers argv-parsing edge cases
 * (a flag as the very last token, with nothing after it) that the
 * existing flag-matrix test didn't reach.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  internalErrorMessage,
  parseArgs,
  runFixCommand,
  runHandoverCommand,
  runStatsCommand,
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

describe("command handlers report a crash (exit 20) instead of throwing", () => {
  // The property is the CONTAINMENT contract, not the specific way the write
  // fails: every handler wraps its body in try/catch and maps a throw to
  // exit 20, so a user never gets an unhandled rejection on their terminal.
  //
  // The original arms made the write target unwritable with `chmod 0o555`,
  // which is a no-op on Windows — the fixture's own comment admitted the
  // tests "no-op gracefully" there, so half the suite verified nothing on the
  // platform most contributors run. The throw is injected at the IO boundary
  // instead: deterministic everywhere, and it exercises the same catch.
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mjolnir-crash-path-"));
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "checkout.spec.ts"),
      "it.only('x', () => { expect(true).toBe(true); });\n",
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("handover maps a throwing out sink to 20, never a rejection", async () => {
    await expect(
      runHandoverCommand([dir], {
        out: () => {
          throw new Error("probe-out");
        },
        err: () => {},
      }),
    ).resolves.toBe(20);
  });

  it("stats maps a throwing out sink to 20, never a rejection", () => {
    expect(
      runStatsCommand([dir], {
        out: () => {
          throw new Error("probe-out");
        },
        err: () => {},
      }),
    ).toBe(20);
  });

  it("fix maps a throwing out sink to 20, never a rejection", async () => {
    await expect(
      runFixCommand([dir], {
        out: () => {
          throw new Error("probe-out");
        },
        err: () => {},
      }),
    ).resolves.toBe(20);
  });

  it("the crash path names the cause on the injected err sink", async () => {
    const seen: string[] = [];
    await runHandoverCommand([dir], {
      out: () => {
        throw new Error("probe-cause");
      },
      err: (...parts) => seen.push(parts.map(String).join(" ")),
    });
    expect(seen.join("\n")).toContain("probe-cause");
  });
});

describe("`handover` still returns a documented exit code against an empty repo", () => {
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
