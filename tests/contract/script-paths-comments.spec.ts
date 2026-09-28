/**
 * `scripts/check-script-paths.mjs` checks two kinds of path reference, and the
 * second one — inside COMMENTS — was added in 6.0 because the repository's
 * comments turn out to be load-bearing.
 *
 * The concrete case: `src/commands/doctor.ts` documented a cap against
 * `tests/registry-ratchet.spec.ts`, which is really
 * `tests/rules/registry-ratchet.spec.ts`. The gate that "exists for exactly
 * this purpose" was checking npm script bodies only, so a comment pointing a
 * maintainer at a file that does not exist passed. The sweep that followed
 * found 70 such citations across 62 files, all traceable to the test-domain
 * reorg (47e6c25) and never fixed.
 *
 * These assertions pin the RULES, not just the pass, because the rules are
 * where this could go wrong: a historical-record allowance that is too broad
 * would silently exempt every real defect, and a fixture must be able to
 * fail.
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-script-paths.mjs");
const scratch: string[] = [];

interface Result {
  code: number;
  output: string;
}

function run(dir?: string): Result {
  const result = spawnSync(
    process.execPath,
    [
      dir === undefined ? CHECKER : join(dir, "check-script-paths.mjs"),
      dir ?? ROOT,
    ],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  return {
    code: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/**
 * The checker's own summary line.
 *
 * The LAST non-empty line, not the last line: `console.log` terminates with a
 * newline, so `split("\n").pop()` is the empty string and parsing it throws
 * "Unexpected end of JSON input" — an error in the test that looks nothing
 * like the thing it is testing.
 */
function lastJsonLine(output: string): unknown {
  const lines = output.split("\n").filter((line) => line.trim() !== "");
  const last = lines[lines.length - 1];
  expect(last, `no output to parse:\n${output}`).toBeDefined();
  return JSON.parse(last as string);
}

/**
 * A fixture tree: the checker's own inputs, plus one source file whose
 * comment the test controls.
 */
function fixture(comment: string): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-script-paths-"));
  scratch.push(dir);
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });
  mkdirSync(join(dir, "docs"), { recursive: true });
  copyFileSync(CHECKER, join(dir, "check-script-paths.mjs"));
  // A package with no script paths in it, so the npm-script half is quiet
  // and the assertion is about the comment half alone.
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify({ name: "fixture", scripts: { ok: "node -e 0" } }, null, 2)}\n`,
  );
  writeFileSync(
    join(dir, "src", "thing.ts"),
    `// ${comment}\nexport const x = 1;\n`,
  );
  // A real git repository with the files staged. The checker resolves its
  // input through `git ls-files` and `git check-ignore` — that is how it
  // knows a path is TRACKED, which is a stronger claim than "exists" and the
  // whole point of the npm-script half of this gate. A fixture without
  // `.git` tests nothing: every `git` call throws and the checker exits
  // before it reads a single comment.
  execFileSync("git", ["init", "--quiet"], { cwd: dir });
  execFileSync("git", ["add", "-A"], { cwd: dir });
  return dir;
}

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe("the comment path check", () => {
  it("passes on the real repository, having checked the comments too", () => {
    const { code, output } = run();
    expect(output, output).toBeTruthy();
    expect(code, output).toBe(0);
    const report = lastJsonLine(output) as { commentPathRefs: number };
    // A count, not just an exit code: a checker that checked nothing and
    // passed would satisfy the exit code alone.
    expect(report.commentPathRefs).toBeGreaterThan(100);
  });

  it("fails when a comment cites a file that does not exist", () => {
    const { code, output } = run(fixture("see tests/nope.spec.ts for details"));
    expect(code).toBe(1);
    expect(output).toContain('cites "tests/nope.spec.ts"');
  });

  it("accepts a comment citing a file that does exist", () => {
    const dir = fixture("see tests/thing.spec.ts for details");
    writeFileSync(join(dir, "tests", "thing.spec.ts"), "it('x', () => {});\n");
    const { code, output } = run(dir);
    expect(code, output).toBe(0);
  });

  it("accepts a comment RECORDING a deletion", () => {
    // "Was X, unwired and deleted in 6.0" is a true statement about a path
    // that does not exist, and it is the only record of why a module is
    // gone. Requiring the file to exist would push authors to delete the
    // history instead.
    const { code, output } = run(
      fixture("Was src/gone.ts, unwired, and deleted in 6.0"),
    );
    expect(code, output).toBe(0);
  });

  it("does NOT exempt a stale forward reference from the historical wording", () => {
    // The allowance is for sentences that say a file is GONE. A sentence
    // that merely contains "was" while pointing at a live reference must
    // still be checked, or the rule swallows the defect it was added for.
    const { code, output } = run(
      fixture("the ratchet (tests/stale.spec.ts) was what caught it"),
    );
    expect(code).toBe(1);
    expect(output).toContain('cites "tests/stale.spec.ts"');
  });

  it("resolves a .js citation against a .ts file", () => {
    // The repository writes imports as `./foo.js` against a `foo.ts`. Without
    // that resolution every correctly-written reference reads as dangling and
    // the gate reports phantom hits, which is how a gate gets switched off.
    const dir = fixture("imported by src/thing.js in the adapter");
    writeFileSync(join(dir, "src", "thing.js.ts"), "export const y = 1;\n");
    rmSync(join(dir, "src", "thing.js.ts"));
    writeFileSync(join(dir, "src", "thing.ts"), "export const y = 1;\n");
    const { code, output } = run(dir);
    expect(code, output).toBe(0);
  });

  it("skips URLs, which are remote references, not local paths", () => {
    const { code, output } = run(
      fixture("see https://example.com/src/remote.ts for the shape"),
    );
    expect(code, output).toBe(0);
  });

  it("skips template placeholders", () => {
    const { code, output } = run(
      fixture("output goes to tests/corpus/review/<RULE-ID>.md per run"),
    );
    expect(code, output).toBe(0);
  });
});

describe("the real repository's comments", () => {
  it("cite no path that is neither present nor recorded as gone", () => {
    // The assertion this whole file exists to justify, stated once and
    // cheaply: run the gate on the repository and require the exit code. The
    // first two tests prove the gate can FAIL, which is what makes this
    // meaningful — a checker that has never been observed failing is not
    // evidence that the tree is clean.
    const { code, output } = run();
    expect(code, output).toBe(0);
  });

  it("the check covered a meaningful number of references", () => {
    const { output } = run();
    const report = lastJsonLine(output) as {
      commentPathRefs: number;
      scriptPathRefs: number;
    };
    expect(report.commentPathRefs).toBeGreaterThan(100);
    expect(report.scriptPathRefs).toBeGreaterThan(0);
  });
});
