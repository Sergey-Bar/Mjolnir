/**
 * `mjolnir share` — the argument arms, and the exit codes they return.
 *
 * `tests/contract/share-artifact.spec.ts` proves what the artifact IS. This
 * file proves what the command does when a reader gets the invocation wrong,
 * which is the half that decides whether a wrong invocation is a message or a
 * crash.
 *
 * Why this file exists at all: `src/commands/share.ts` measured 79.45%
 * statements and 77.61% lines against a per-file floor of 80, so
 * `vitest.config.ts`'s `perFile: true` failed the whole run — and every one of
 * the uncovered lines was in the argument loop below. A command whose usage
 * error paths had never been executed is a command whose usage error paths are
 * unknown, and the coverage number was the only thing saying so. The fix is
 * these tests, not a floor change and not an exemption: the arms are reachable
 * and cheap, and there is nothing about them that a fixture would have to fake.
 *
 * The exit codes are asserted rather than observed, because they are FROZEN
 * (0 / 1 / 2 / 10 / 20 — `docs/VERSIONING.md`, enforced by
 * `tests/contract/exit-code-contract-docs.spec.ts`). A usage error is 10 and an
 * unexpected internal failure is 20; if either drifts, the version contract
 * drifts with it and that is not a decision a test should absorb silently.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { runShareCommand } from "../../src/commands/share.js";
import type { Output } from "../../src/cli-io.js";

const DEMO = join(import.meta.dirname, "..", "..", "examples", "demo-repo");

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** Captured IO, so each arm can be asserted on both the code and the message. */
function capture(): {
  io: { out: Output; err: Output };
  out: string[];
  err: string[];
} {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: {
      out: (...parts) => void out.push(parts.map(String).join(" ")),
      err: (...parts) => void err.push(parts.map(String).join(" ")),
    },
    out,
    err,
  };
}

describe("mjolnir share rejects a malformed invocation before it scans", () => {
  it("--out with no value is a usage error, and names the flag", async () => {
    const { io, err } = capture();
    expect(await runShareCommand(["--out"], io)).toBe(10);
    expect(err.join("\n")).toContain("--out needs a file path");
  });

  it("--out with an empty value is the same error, not a write to the CWD", async () => {
    // The empty string is the arm a reader hits when a shell variable expands
    // to nothing. Treating it as "no --out given" would silently write
    // `mjolnir-trust-report.html` into whatever directory they were standing
    // in, which is the opposite of what the empty value meant.
    const { io, err } = capture();
    expect(await runShareCommand(["--out", ""], io)).toBe(10);
    expect(err.join("\n")).toContain("--out needs a file path");
  });

  it("--max-duration with a non-number is a usage error", async () => {
    const { io, err } = capture();
    expect(await runShareCommand(["--max-duration", "soon"], io)).toBe(10);
    expect(err.join("\n")).toContain(
      "--max-duration needs a positive number of seconds",
    );
  });

  it("--max-duration with a non-positive number is the same error", async () => {
    // Zero and negative are the arms that matter: `0` reads as "no budget",
    // which would truncate every scan and report a clean table over a scan that
    // never finished.
    for (const value of ["0", "-1"]) {
      const { io, err } = capture();
      expect(await runShareCommand(["--max-duration", value], io)).toBe(10);
      expect(err.join("\n")).toContain(
        "--max-duration needs a positive number of seconds",
      );
    }
  });

  it("--max-duration with no value at all is the same error", async () => {
    const { io, err } = capture();
    expect(await runShareCommand(["--max-duration"], io)).toBe(10);
    expect(err.join("\n")).toContain(
      "--max-duration needs a positive number of seconds",
    );
  });

  it("an unknown flag is a usage error that quotes the flag", async () => {
    const { io, err } = capture();
    expect(await runShareCommand(["--json"], io)).toBe(10);
    expect(err.join("\n")).toContain('unknown flag "--json"');
  });

  it("a second positional argument is refused, not silently ignored", async () => {
    // The command takes one target. Accepting two and scanning the first would
    // produce a report about a repository the reader did not ask for, which is
    // the false-green shape this tool exists to catch.
    const { io, err } = capture();
    expect(await runShareCommand([DEMO, "src"], io)).toBe(10);
    expect(err.join("\n")).toContain('unexpected argument "src"');
  });
});

describe("mjolnir share --help answers without scanning", () => {
  it("prints the usage and exits 0", async () => {
    const { io, out } = capture();
    expect(await runShareCommand(["--help"], io)).toBe(0);
    const text = out.join("\n");
    expect(text).toContain("mjolnir share [target]");
    expect(text).toContain("--max-duration <sec>");
    // Exit 0 with the gate command named, because that is the sentence the
    // whole artifact exists to deliver.
    expect(text).toContain("no network");
  });

  it("-h is the same flag", async () => {
    const { io, out } = capture();
    expect(await runShareCommand(["-h"], io)).toBe(0);
    expect(out.join("\n")).toContain("mjolnir share [target]");
  });

  it("accepts a valid --max-duration, and says nothing about it", async () => {
    // `--help` after the flag rather than instead of it: the argument loop is
    // the thing under test, so the positive arm is reached without paying for
    // a scan. Before this the value was assigned on a path nothing executed,
    // which is why the assignment was one of the uncovered lines.
    const { io, err, out } = capture();
    expect(await runShareCommand(["--max-duration", "30", "--help"], io)).toBe(
      0,
    );
    expect(err).toEqual([]);
    expect(out.join("\n")).toContain("mjolnir share [target]");
  });
});

describe("an unwritable destination is exit 20, not an uncaught throw", () => {
  it("reports the failure and returns 20", async () => {
    // `--out` under an existing FILE: `mkdirSync` on the parent raises
    // ENOTDIR after the scan has already run, which is the one place the
    // command's own `try` can be reached. A command that throws here takes
    // the process with it and reports nothing — and a share command that
    // fails silently is how somebody ships an empty report believing it
    // succeeded.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-share-"));
    scratch.push(dir);
    const blocker = join(dir, "not-a-directory");
    writeFileSync(blocker, "", "utf8");

    const { io, err } = capture();
    const code = await runShareCommand(
      [DEMO, "--out", join(blocker, "trust.html")],
      io,
    );

    expect(code).toBe(20);
    expect(err.join("\n")).toContain("mjolnir share:");
  }, 120_000);
});
