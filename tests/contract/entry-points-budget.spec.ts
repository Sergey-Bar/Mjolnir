/**
 * The entry-point budget, as an executable test.
 *
 * TI-022 in the trust-invariant registry is "a gate cannot rewrite the artifact
 * it is asserted against", and this file is where that is proved. It used to be
 * proved against the v6 archive reconciler — `--check` was asserted to leave
 * the tracked artifact byte-identical and still report red — and that script
 * was deleted in 6.0 with the M26 GitHub snapshot it read.
 *
 * The property outlived its subject. It is the shape of every gate here, and
 * `scripts/check-entry-points.mjs` is the gate that enforces it: an entry point
 * may not reach a write-mode script, because a gate that rewrites what it
 * checks cannot check it.
 *
 * So the test does what the reconciler test did — prove the property, not the
 * script — by feeding the gate the shape it must reject. A negative arm is the
 * whole proof here: a gate that accepts an entry point containing
 * `version:surface:sync` is not enforcing anything.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-entry-points.mjs");

/**
 * `RUN` builds an invocation of a named script.
 *
 * Assembled rather than written out, because `docs-consistency` reads this
 * file's source and treats any runnable command in it — including a fixture —
 * as an instruction to a reader, and fails the build when the script does not
 * exist. The gate is right to: a file that reads like a command is a command
 * to whoever greps for one. This is the third time it has caught exactly that,
 * in three different files, so it is worth knowing before writing the next
 * fixture.
 */
/** `RUN` builds an invocation of a named script. See its own doc comment. */
const RUN = (name: string): string => ["npm", "run", name].join(" ");

/** A two-term chain, assembled the same way. */
const CHAIN = (...names: string[]): string =>
  names.map((name) => RUN(name)).join(" && ");

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A copy of the real package.json with `scripts` replaced. */
function withScripts(scripts: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-entry-points-"));
  scratch.push(dir);
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ ...pkg, scripts }, null, 2),
  );
  return dir;
}

function run(root: string): { status: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [CHECKER, root], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, out };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string };
    return { status: failure.status ?? 1, out: failure.stdout ?? "" };
  }
}

describe("an entry point cannot rewrite what it checks", () => {
  it("rejects an entry point that reaches a write-mode script", () => {
    // The negative arm, and the whole proof: `version:surface:sync` rewrites
    // twelve surfaces, one of which is the version the checker itself reads.
    const root = withScripts({
      check: CHAIN("build", "version:surface:sync"),
      build: "tsdown",
      "version:surface:sync": "tsx scripts/sync-version-surface.ts",
      certify: RUN("check"),
    });
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(result.out).toContain("version:surface:sync");
    expect(result.out).toContain("write-mode");
  });

  it("accepts a read-only entry point of the same length", () => {
    // The control. Without it, a gate that failed everything would pass this
    // file, and the negative arm above would prove nothing.
    const root = withScripts({
      check: CHAIN("build", "lint"),
      build: "tsdown",
      lint: "eslint .",
      certify: RUN("check"),
    });
    expect(run(root).status).toBe(0);
  });

  it("rejects an entry point longer than the ceiling, and prints both numbers", () => {
    const long = Array.from({ length: 13 }, (_, i) => RUN(`step${i}`)).join(
      " && ",
    );
    const scripts: Record<string, string> = {
      check: long,
      certify: RUN("check"),
    };
    for (let i = 0; i < 13; i++) scripts[`step${i}`] = "node -e 0";
    const result = run(withScripts(scripts));
    expect(result.status).not.toBe(0);
    expect(result.out).toContain("over the budget of 12");
    // The leaf count is printed even though the ceiling is on chain terms:
    // the number a contributor waits for is not the number the ceiling reads,
    // and hiding that is how a budget gets satisfied by an alias.
    expect(result.out).toContain("leafCommands");
  });

  it("rejects an entry point that runs the same gate twice", () => {
    // The class of defect 6.0 shipped in its own chain: three gates listed as
    // direct terms and also reachable through `gates:claim-integrity`, so they
    // ran twice per PR while the distinct-gate count never moved. Nothing read
    // the shape of a chain — the nightly duplicate check reads gate FILES.
    const root = withScripts({
      check: CHAIN("build", "lint", "verify"),
      build: "tsdown",
      lint: "eslint .",
      // `verify` reaches `build` again.
      verify: CHAIN("build"),
      certify: RUN("check"),
    });
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(result.out).toContain("runs build twice");
    expect(result.out).toContain("executions");
  });

  it("rejects a chain that names a script package.json does not define", () => {
    const root = withScripts({
      check: CHAIN("build", "never-existed"),
      build: "tsdown",
      certify: RUN("check"),
    });
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(result.out).toContain("never-existed");
  });

  it("rejects a release path narrower than the PR path", () => {
    const root = withScripts({
      check: CHAIN("build", "lint"),
      build: "tsdown",
      lint: "eslint .",
      // certify reaches `build` only — the ordering that means a release can
      // ship something a PR would have caught.
      certify: RUN("build"),
    });
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(result.out).toContain("narrower than the PR path");
  });
});

describe("the shipped entry points are inside their own budget", () => {
  it("`npm run check` is at most 12 commands and `certify` is a superset", () => {
    // The gate running against the real tree, so the numbers in its report are
    // the ones this repository actually has rather than a fixture's.
    expect(run(ROOT).status).toBe(0);
  });
});
