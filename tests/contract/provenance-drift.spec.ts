/**
 * P0-5 / Task 2.4.3 — content drift for the provenance-stamped artifacts.
 *
 * `docs/capability-registry.json` and `docs/v6-inventory.json` record the
 * `baseSha` of the commit they were generated from. That is the point of an
 * artifact that says what it was derived from, and it is exactly why those two
 * files cannot join the `npm run docs:regen && git diff --exit-code` staleness
 * gate every other generated artifact uses: a regeneration at commit N writes
 * `baseSha = N`, the committed copy carries the stamp of the commit that
 * generated it, and the two differ on every commit. Adding them there would
 * have turned a stale artifact into a permanently red one — a gate nobody runs,
 * wearing the costume of one that does.
 *
 * So the property that DOES matter is checked instead: did a claim change
 * without the artifact being regenerated? The `baseSha` mismatch is the
 * artifact's age, not a lie about its contents, and ADR 0010 already records
 * what happens when a clock is treated as a claim.
 *
 * Two things are asserted below and the second is the load-bearing one: a
 * perturbed artifact is caught, and a PASS on the real tree leaves every byte
 * of it alone. A drift check that regenerated in place would report the clock
 * rather than the claim — and, worse, would dirty the working tree while
 * `tests/certification/candidate-manifest.spec.ts` was hashing it, which is
 * how this file's own first version produced a `workingTreeSha256 drift`
 * failure in a suite three files away from the cause.
 *
 * Every mutation therefore happens in a `--root` fixture, never in the
 * checkout.
 */

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECK = join(ROOT, "scripts", "check-provenance-artifacts.ts");

/**
 * The two artifacts, and a leaf path inside each that a test can perturb.
 *
 * A LEAF rather than the containing object. The first version replaced
 * `counts` wholesale, which made the diff name the container and left the test
 * asserting on a key the message never mentioned — the assertion passed for the
 * wrong reason until the checker was changed to report dotted paths.
 */
const ARTIFACTS = [
  {
    file: "docs/capability-registry.json",
    nestedPath: ["counts", "entries"],
  },
  { file: "docs/v6-inventory.json", nestedPath: ["counts", "srcFiles"] },
] as const;

/**
 * The `tsx` loader, resolved from `node_modules` and run under
 * `process.execPath`.
 *
 * `npx` and `npm` are batch shims on Windows and `execFileSync` will not spawn
 * one without a shell (EINVAL / ENOENT). `shell: true` would fix the spawn and
 * introduce command injection into a path that interpolates nothing
 * user-supplied but is one refactor from doing so, so the shell is removed
 * instead: the loader is executed as a module. Same command on every platform,
 * and it cannot vanish into a shim.
 *
 * Two earlier versions of this file got the invocation wrong in ways that
 * failed SILENTLY: the spawn error surfaced as a non-zero exit with empty
 * output, so a test read "the gate failed" when the gate had never run. The
 * empty-output branch below turns that back into a harness error, because an
 * empty result must never be read as a verdict.
 */
const TSX_CLI = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

function runCheckOn(root: string = ROOT): { code: number; output: string } {
  if (!existsSync(TSX_CLI)) {
    throw new Error(
      `${TSX_CLI} is missing — run \`npm ci\` before this suite. The gate did ` +
        "not run, so this is a harness failure and not a verdict.",
    );
  }
  try {
    const stdout = execFileSync(
      process.execPath,
      [TSX_CLI, CHECK, `--root=${root}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    return { code: 0, output: stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    if (output.trim() === "") {
      throw new Error(
        "The drift check produced no output. Either it could not start or it " +
          "exited before printing, and an empty result must not be read as a " +
          "verdict.",
        { cause: error },
      );
    }
    return { code: err.status ?? 1, output };
  }
}

/**
 * A throwaway root holding copies of the two artifacts.
 *
 * Only the artifacts are copied, because only they are read. The generator
 * still runs against the real repository — the checker's `root` selects which
 * artifacts to COMPARE, not which tree to render from — so a perturbed copy is
 * compared against a genuine render of the real tree.
 */
function fixtureTree(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-provenance-fixture-"));
  mkdirSync(join(dir, "docs"), { recursive: true });
  for (const { file } of ARTIFACTS)
    copyFileSync(join(ROOT, file), join(dir, file));
  return dir;
}

const fixtures: string[] = [];

afterEach(() => {
  while (fixtures.length > 0) {
    const dir = fixtures.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

/** Set a nested value by path, walking the containers. */
function setNested(
  root: unknown,
  path: readonly string[],
  value: unknown,
): void {
  let cursor = root as Record<string, unknown>;
  for (const key of path.slice(0, -1)) {
    const next = cursor[key];
    if (typeof next !== "object" || next === null) {
      throw new Error(
        `no object at ${path.slice(0, path.indexOf(key) + 1).join(".")}`,
      );
    }
    cursor = next as Record<string, unknown>;
  }
  const leaf = path[path.length - 1];
  if (leaf === undefined) throw new Error("empty perturbation path");
  cursor[leaf] = value;
}

describe("provenance-stamped artifacts are checked for content, not for age", () => {
  it("the committed artifacts pass, and the report states what it excluded", () => {
    const { code, output } = runCheckOn(ROOT);
    expect(code, output).toBe(0);
    // The report must name its exclusions. A PASS that does not is
    // indistinguishable from a check that would have failed on a stale
    // `baseSha` — which is the one thing this check must NOT do.
    expect(output).toContain("baseSha/observedAt/generatedBy excluded");
  });

  it("a changed claim in either artifact is caught, and the message names it", () => {
    for (const { file, nestedPath } of ARTIFACTS) {
      const dir = fixtureTree();
      fixtures.push(dir);
      const path = join(dir, file);
      const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
      setNested(parsed, nestedPath, 999_999);
      writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n", "utf8");

      const run = runCheckOn(dir);
      expect(run.code, `${file}: ${run.output}`).toBe(1);
      expect(run.output).toContain("content drift");
      expect(run.output).toContain(nestedPath.join("."));
    }
  });

  it("a baseSha that does not match HEAD is NOT drift", () => {
    const dir = fixtureTree();
    fixtures.push(dir);
    const path = join(dir, "docs/capability-registry.json");
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<
      string,
      unknown
    >;
    parsed["baseSha"] = "0".repeat(40);
    writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n", "utf8");

    const run = runCheckOn(dir);
    expect(run.code, run.output).toBe(0);
  });

  it("a missing artifact is reported, not skipped", () => {
    const dir = fixtureTree();
    fixtures.push(dir);
    rmSync(join(dir, "docs", "v6-inventory.json"));
    const run = runCheckOn(dir);
    expect(run.code).toBe(1);
    expect(run.output).toContain("missing");
  });

  it("the check writes nothing to the tree it inspects", () => {
    for (const { file } of ARTIFACTS) {
      const path = join(ROOT, file);
      const before = readFileSync(path, "utf8");
      expect(runCheckOn(ROOT).code, file).toBe(0);
      expect(readFileSync(path, "utf8"), file).toBe(before);
    }
  });

  it("the checker takes --root, which is what makes the fixtures possible", () => {
    // Asserted by USE rather than by reading the source: every fixture test
    // above passes `--root`, so a checker that ignored the flag would compare
    // the real artifacts, find them clean, and every negative test would fail
    // loudly. The first version also asserted `toContain("--root=")` on the
    // checker's own text, which is a test of the file's formatting.
    const dir = fixtureTree();
    fixtures.push(dir);
    const path = join(dir, "docs", "v6-inventory.json");
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<
      string,
      unknown
    >;
    parsed["baseSha"] = "0".repeat(40);
    writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n", "utf8");
    // Unchanged content, but a mutated PROVENANCE key: if `--root` were
    // ignored this would still pass, and if the provenance exclusion were
    // wrong the run above would not have.
    expect(runCheckOn(dir).code).toBe(0);
  });
});
