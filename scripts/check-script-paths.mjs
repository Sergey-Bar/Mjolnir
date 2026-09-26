/**
 * `script:paths` — every path a package script names must exist.
 *
 * Usage: node scripts/check-script-paths.mjs [repo-root]
 *
 * THE DEFECT THIS EXISTS TO MAKE IMPOSSIBLE
 *
 * `frontier:contracts` named 24 test files. Nineteen of them had been deleted
 * by the `cc5fcb88` cleanup and its follow-up. Vitest treats a missing path as
 * "no tests here" rather than an error, so the script exited 0 and printed
 * "57 passed" — while nineteen contract suites never ran. Anyone reading that
 * number, including CI, was reading a fiction produced by silence.
 *
 * This is the same failure class as the rest of the BITTERSWEET work, and it
 * is the most dangerous variant, because a test file that is MISSING and a test
 * file that is GREEN are indistinguishable from the outside. A gate that
 * passes because its subject is absent has certified nothing.
 *
 * THE RULE
 *
 * Any `package.json` script that names a `tests/…`, `src/…`, `scripts/…` or
 * `docs/…` path must name a path that exists — AND that is tracked by git.
 * Glob patterns (anything with a `*`, `?` or `[`) are exempt: a glob is a
 * rule, not a reference.
 *
 * The second half is not a refinement, it is the half that bites. A script can
 * point at a file that exists in the working tree but was never committed, so
 * the gate passes locally and CI fails on a fresh checkout with no such file.
 * "Exists on my disk" and "ships" are different claims, and a release gate
 * has to check the second one.
 *
 * This is a structural check on strings, so it cannot know whether a script
 * does the right thing. It only knows that a script is not pointing at
 * nothing, and not pointing at something that will not be there.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/** Everything git knows about, so "tracked" can be asked once. */
function trackedPaths() {
  const out = execFileSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return new Set(
    out.split("\n").map((line) => line.trim().replaceAll("\\", "/")),
  );
}

let tracked;
function isTracked(path) {
  tracked ??= trackedPaths();
  return tracked.has(path);
}

/**
 * Git tracks files, never directories, so `git ls-files` has no entry for
 * `tests/integrations` even when it holds a dozen tracked specs. Asking
 * "is this path tracked?" about a directory is therefore always false, and
 * treating that as a violation would fail the gate on every directory a
 * script legitimately points at.
 *
 * So a directory counts as present when it holds at least one TRACKED file.
 * An empty directory, or one holding only untracked files, still fails — which
 * is the case that actually matters, because that is what CI would see.
 */
function ships(path) {
  if (isTracked(path)) return true;
  if (!existsSync(join(root, path))) return false;
  try {
    return readdirSync(join(root, path), { withFileTypes: true }).some(
      (entry) => {
        const child = `${path}/${entry.name}`;
        return entry.isDirectory() ? ships(child) : isTracked(child);
      },
    );
  } catch {
    return false;
  }
}

/** Roots a script may reference, and the directories a glob may start with. */
const ROOTS = ["tests/", "src/", "scripts/", "docs/", "site/", "enterprise/"];

/** A token that references a file rather than describing a pattern. */
function isPathToken(token) {
  if (!ROOTS.some((prefix) => token.startsWith(prefix))) return false;
  // A glob describes a set; a bare path is a reference. `tests/` alone is a
  // directory, and `*.ts` is a pattern — neither can be checked for existence
  // and neither is a silent-absence risk.
  if (token.includes("*") || token.includes("?") || token.includes("[")) {
    return false;
  }
  if (token.endsWith("/")) return false;
  if (token.startsWith("dist/") || token.startsWith("node_modules/")) {
    return false;
  }
  return true;
}

const problems = [];
const uncommitted = [];
let checked = 0;

for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
  if (typeof command !== "string") continue;
  // Split on whitespace; scripts in this repo do not embed paths inside
  // quotes or shell variables, and a quoted path would be caught by the
  // existence check on the unquoted token anyway.
  for (const token of command.split(/\s+/)) {
    if (!isPathToken(token)) continue;
    checked += 1;
    if (!existsSync(join(root, token))) {
      problems.push(
        `scripts.${name}: "${token}" does not exist. A script that names a ` +
          `path which is gone still reports success, because the absence is ` +
          `silent. Remove the reference, or restore the file.`,
      );
      continue;
    }
    if (!ships(token)) {
      uncommitted.push(
        `scripts.${name}: "${token}" exists but is not committed. It works on ` +
          `this machine and fails on a fresh checkout, which is the worst ` +
          `possible split: the gate is green here and red in CI. Commit it, ` +
          `or remove the reference.`,
      );
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`script:paths: ${problem}`);
  console.error(
    `script:paths: ${problems.length} dangling path(s) across ` +
      `${pkg.scripts ? Object.keys(pkg.scripts).length : 0} scripts.`,
  );
  process.exit(1);
}

if (uncommitted.length > 0) {
  for (const note of uncommitted) console.error(`script:paths: ${note}`);
  console.error(
    `script:paths: ${uncommitted.length} reference(s) to a path that is not ` +
      `committed. This gate is in certify, so this is a release blocker, not ` +
      `a style note.`,
  );
  process.exit(1);
}

console.log(
  JSON.stringify({ status: "PASS", pathReferences: checked, dangling: 0 }),
);
