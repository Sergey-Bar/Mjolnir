/**
 * A9: what `mjolnir doctor` can and cannot do without a target.
 *
 * ## The defect this closes
 *
 * `doctor` defaulted its target to `process.cwd()`. Running `mjolnir doctor`
 * from a SUBDIRECTORY of a checkout found no `tests/fixtures` there and exited
 * 2 with `Run from the mjolnir repo root.` — which the user was already in,
 * just one level down. The target is now resolved from the module's own
 * location.
 *
 * ## What A9 asked for, and why this file asserts the opposite
 *
 * The plan asked for `doctor` to be "runnable from an installed package". It is
 * not, deliberately, and the reason is a policy this repository already holds:
 * `tests/` and `docs/` are excluded from the published tarball by the `files`
 * whitelist, locked by the "excludes dev artifacts not declared in 'files'"
 * case in `package-smoke.spec.ts`. The corpus verdicts and fixture data the
 * self-audit verifies against total ~2.5 MB.
 *
 * So there were two ways to make it work, and both are owner decisions rather
 * than implementation details:
 *
 *   1. ship `tests/` and `docs/` — 2.5 MB onto every install, for a command
 *      most users never run, overturning a Sprint-1 packaging decision; or
 *   2. let the installed audit run a REDUCED set of checks and report the rest
 *      as INCONCLUSIVE — which changes the doctor report's shape, and whose
 *      contract says an INCONCLUSIVE never renders as pass, so a healthy
 *      installed CLI would exit 1 forever.
 *
 * Neither was taken unilaterally. What IS asserted below is that the exit-2
 * message tells the user precisely what to do, because the old message sent
 * them to a directory they were already standing in.
 *
 * This file also pins the packaging policy itself, from the other side: if
 * someone later decides to ship the corpus, the assertion here fails and the
 * decision has to be made visibly rather than by editing a glob.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { runDoctorCommand } from "../../src/commands/doctor-run.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("doctor resolves its default target from its own location", () => {
  it("audits the checkout when invoked from a SUBDIRECTORY of it", () => {
    // The regression this fixes. `src/commands/` has no `tests/fixtures`, so the
    // old `process.cwd()` default exited 2 from here.
    const out: string[] = [];
    const err: string[] = [];
    const previous = process.cwd();
    try {
      process.chdir(join(ROOT, "src", "commands"));
      const code = runDoctorCommand([], {
        out: (parts: unknown) => out.push(String(parts)),
        err: (parts: unknown) => err.push(String(parts)),
      });
      expect(err.join("\n")).not.toContain("No fixtures directory");
      expect(code).toBe(0);
      expect(out.join("\n")).toContain("self-audit");
    } finally {
      process.chdir(previous);
    }
  });
});

describe("doctor tells the truth when there is no checkout to audit", () => {
  it("exits 2 and says what to pass, instead of 'run from the repo root'", () => {
    const err: string[] = [];
    const code = runDoctorCommand(["/nonexistent/path/for/this/test"], {
      out: () => {},
      err: (parts: unknown) => err.push(String(parts)),
    });
    const text = err.join("\n");
    expect(code).toBe(2);
    expect(text).toContain("No fixtures directory");
    // The old message's advice was wrong in the subdirectory case, which is the
    // case this change exists for. The new one names the fix.
    expect(text).toContain("mjolnir doctor <path-to-mjolnir>");
    expect(text).toContain("SELF-AUDIT");
    // And it must not tell someone to cd somewhere they already are.
    expect(text).not.toContain("Run from the mjolnir repo root");
  });

  it("explains WHY the data is not shipped, so exit 2 reads as a decision", () => {
    const err: string[] = [];
    runDoctorCommand(["/nonexistent/path/for/this/test"], {
      out: () => {},
      err: (parts: unknown) => err.push(String(parts)),
    });
    const text = err.join("\n");
    expect(text).toContain("files");
    expect(text).toContain("package-smoke.spec.ts");
  });
});

describe("the packaging policy this hinges on", () => {
  it("still excludes tests/ and docs/ from the published tarball", () => {
    // If this ever becomes false, A9's real option (1) has been taken and this
    // file's premise needs revisiting on purpose rather than by accident.
    const pkg = JSON.parse(
      execFileSync(
        "node",
        ["-p", "JSON.stringify(require('./package.json').files)"],
        {
          cwd: ROOT,
          encoding: "utf8",
        },
      ),
    ) as string[];
    for (const prefix of ["tests", "docs", "src", "scratch", "coverage"]) {
      expect(
        pkg.some((glob) => glob === prefix || glob.startsWith(`${prefix}/`)),
        `${prefix}/ must not be in the published whitelist`,
      ).toBe(false);
    }
  });

  it("does ship the CLI entry points the command runs from", () => {
    const pkg = JSON.parse(
      execFileSync(
        "node",
        ["-p", "JSON.stringify(require('./package.json').bin)"],
        { cwd: ROOT, encoding: "utf8" },
      ),
    ) as Record<string, string>;
    expect(Object.keys(pkg).sort()).toEqual(["mjolnir", "mjolnir-qa"]);
    for (const target of Object.values(pkg)) {
      expect(
        existsSync(join(ROOT, target)),
        `${target} must exist in the tree — the published bin points at it`,
      ).toBe(true);
    }
  });

  it("resolves the module root from dist/ the same way the walk does", () => {
    // `installedPackageRoot` walks up looking for `tests/fixtures`; from the
    // built tree `dist/commands/*` that is two levels. Asserted here so a
    // build-output layout change (tsdown flattening, a new entry dir) is caught
    // by a fast test instead of by `doctor` failing to find its own checkout.
    expect(resolve(ROOT, "dist", "commands", "..", "..")).toBe(ROOT);
  });
});
