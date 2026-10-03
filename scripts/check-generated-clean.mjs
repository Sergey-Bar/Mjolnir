#!/usr/bin/env node
/**
 * Are the generated artifacts current with the inputs they were built from?
 *
 * WHY THIS IS A SCRIPT AND NOT INLINE SHELL
 *
 * Four workflows each carried their own copy of this assertion, and the copies
 * were not equivalent: `ci.yml` ran a whole-tree `git diff --exit-code` plus an
 * untracked-file sweep, while `corpus-audit.yml`, `release.yml` and
 * `stable-release.yml` ran only `git diff --exit-code -- docs/`. The weaker
 * three cannot see an UNTRACKED generated file, so the docs page of a newly
 * added rule shipped silently through them. Four copies of a correctness
 * check is four things to keep equal and a reason to extract one.
 *
 * It is also not reachable from `npm run check`, which is the point rather than
 * an omission. `check` runs the generators and then inspects nothing, so a
 * generator that rewrites a committed file leaves the tree green by
 * construction — that is exactly how QA-PW-117 and QA-JV-101 were promoted to
 * `core` in code and in CHANGELOG.md while `docs/rules/QA-PW-117.md`,
 * `docs/rules/QA-JV-101.md` and `docs/DEPTH-ADJUDICATION.md` went on claiming
 * `extended` at n=24 and n=23. Asserting after regenerating is checking the
 * generator against itself. This asserts the COMMITTED tree against the
 * generators' contract, and is meant to be run against a clean checkout with
 * no regeneration step at all.
 *
 * IT REWRITES NOTHING
 *
 * Read-only by construction: `git status` and `git diff` only. That is what
 * makes it safe on a working tree that holds unreleased human work — the
 * adjudication records under `tests/corpus/verdicts/` are evidence, not
 * scratch, and no staleness check may cost anyone their evidence.
 *
 * USAGE
 *
 *   npm run docs:staleness              generated surfaces only (local default)
 *   npm run docs:staleness -- --all     the whole tree, as `ci.yml` gates it
 *
 * `--all` additionally fails on a modification anywhere in the tree, which is
 * how a generator writing OUTSIDE `GENERATED_SURFACES` gets caught: the
 * allowlist cannot police itself, and a generator that escapes it is a defect
 * in the allowlist, not a pass.
 */

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Entry-point guard, duplicated rather than imported.
 *
 * `scripts/lib/is-main-module.ts` is the shared helper and seventeen scripts use
 * it — but those are TypeScript run through `tsx`, which resolves the `.ts`.
 * This file is deliberately plain `.mjs` executed by bare `node`, with no build
 * step and no dependencies, because it runs in CI BEFORE anything is built. Node
 * will not resolve `./lib/is-main-module.js` to the `.ts` on disk, and the build
 * output that would satisfy it is not committed.
 *
 * Not hypothetical: importing it broke `npm run docs:staleness` in all four
 * workflows that call it, with ERR_MODULE_NOT_FOUND on a clean CI checkout
 * while passing on a developer machine that had run a build. A gate that works
 * locally and dies in CI is the worst of both, so the guard is duplicated here
 * with the reason attached.
 */
function isMainModule(importMetaUrl) {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(argv1);
  } catch {
    return importMetaUrl === pathToFileURL(argv1).href;
  }
}

/**
 * What `npm run docs:regen` writes, by generator.
 *
 * Kept as an explicit list rather than derived, because deriving it means
 * running the generators, and running the generators is the thing this script
 * exists to avoid needing. The cost of an explicit list is that it can fall
 * behind; `tests/contract/generated-surfaces.spec.ts` is what pays that cost,
 * by asserting every workflow calls this script and that the list still names
 * each generator's declared output.
 *
 * `tests/corpus/verdicts/` is deliberately absent and must stay absent. Those
 * files are hand-adjudicated evidence; a generator that "refreshed" them would
 * destroy the record of who judged what.
 */
export const GENERATED_SURFACES = [
  "assets/brand/tokens.json",
  "assets/readme",
  "docs/CERTIFICATION-POLICY.md",
  "docs/COUNT-LOCK.md",
  "docs/CORE-READINESS.md",
  "docs/DEPTH-ADJUDICATION.md",
  "docs/FP-AUDIT.md",
  "docs/README.md",
  "docs/RULE-CAPABILITY-MATRIX.json",
  "docs/RULE-CAPABILITY-MATRIX.md",
  "docs/design/DESIGN-TOKENS.md",
  "docs/machine-contract.md",
  "docs/rules",
  "site/.vitepress/theme/styles/vars.css",
  "site/reference/roadmap.md",
  "src/rules/measured-fp.generated.ts",
  "tests/corpus/detector-hashes.json",
  "tests/golden",
  // docs:counts stamps census sentinels into these two prose surfaces.
  "README.md",
  "docs/MEASUREMENT-CLOSEOUT.md",
];

/**
 * Artifacts deliberately NOT watched here, and why.
 *
 * `docs/capability-registry.json`, `docs/v6-inventory.json`, `docs/CI-MATRIX.json`,
 * `docs/DOMAIN-COVERAGE.json`, `docs/FRAMEWORK-MATRIX.json`,
 * `docs/LANGUAGE-MATRIX.json` and `docs/SURFACE-MATURITY.json` carry a `baseSha`
 * that names the commit they were generated from, and that value is *meant* to
 * lag: an artifact generated three commits ago is not lying about its contents,
 * it is three commits old. `docs:provenance-drift` already checks these files
 * for real content drift with the provenance keys excluded, and it does that
 * properly.
 *
 * This script cannot: `git status` sees "modified" for a restamp and for a real
 * content change alike, so watching them here would report FAIL on every commit
 * that regenerates and no failure at all on the drift that matters. One check
 * doing a thing badly is worse than one check doing it well, so these are left
 * to the gate that can tell the difference.
 */

/** Runs git and returns stdout, or throws with git's own stderr. */
function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** NUL-separated so a path containing a space or a quote survives intact. */
function gitLines(args) {
  const out = git(args);
  return out.split("\0").filter((s) => s.length > 0);
}

/**
 * Does `path` fall under a generated surface? A surface names a file or a
 * directory; a directory covers everything beneath it, which is how a new
 * rule's page is caught without naming all 79 of them.
 */
export function isGenerated(path, surfaces = GENERATED_SURFACES) {
  const norm = path.replace(/\\/g, "/");
  return surfaces.some((surface) => {
    const s = surface.replace(/\\/g, "/").replace(/\/$/, "");
    return norm === s || norm.startsWith(`${s}/`);
  });
}

function main(argv) {
  const all = argv.includes("--all");

  // `git status --porcelain -z` with NUL framing: XY<space>path, and for
  // renames a second NUL-separated path. Reading this with a line split
  // corrupts any path containing a newline, which is legal on the platform
  // this runs on and would turn a real failure into a silent pass.
  const entries = gitLines([
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ]);
  const problems = [];
  // Reported so a reader can tell "scanned the tree and it was clean" from
  // "the scan itself saw nothing", which are the same PASS and not the same
  // evidence. A check whose scope silently collapses to empty is how a gate
  // ends up green because it stopped running.
  let inspected = 0;

  for (let i = 0; i < entries.length; i++) {
    const record = entries[i];
    if (record.length < 4) continue;
    const code = record.slice(0, 2);
    // Verified against git rather than assumed: under `-z` a rename or copy
    // emits `R  <new>\0<old>\0` — the DESTINATION is in the record and the
    // SOURCE is the following entry. Checking the record alone misses a
    // generator that rewrote a generated file and a human who had moved it,
    // which is precisely the shape of a rename inside a generated directory,
    // so both paths are collected.
    const paths = [record.slice(3)];
    if (code[0] === "R" || code[0] === "C") {
      const source = entries[i + 1];
      if (source !== undefined) {
        paths.push(source);
        i++;
      }
    }

    const tracked = code !== "??";
    for (const path of paths) {
      inspected++;
      if (!all && !isGenerated(path)) continue;
      problems.push({
        path,
        state: tracked ? "modified" : "untracked",
        generated: isGenerated(path),
      });
    }
  }

  const report = {
    status: problems.length === 0 ? "PASS" : "FAIL",
    scope: all ? "whole tree" : "generated surfaces",
    checked: all
      ? "every tracked and untracked path"
      : `${GENERATED_SURFACES.length} generated surface(s)`,
    inspectedPaths: inspected,
    problems,
    // Named so a reader knows which half failed: `git diff` cannot see an
    // untracked file, so an untracked generated page is the case that shipped.
    hint:
      problems.length === 0
        ? null
        : "generated artifacts are stale — run `npm run docs:regen` and commit the result",
  };

  console.log(JSON.stringify(report, null, 2));
  if (problems.length > 0) {
    for (const p of problems) {
      console.error(`  ${p.state === "untracked" ? "??" : " M"} ${p.path}`);
    }
    return 1;
  }
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
