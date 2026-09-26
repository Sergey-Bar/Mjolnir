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
 * `docs/…` path must name a path that exists. Glob patterns (anything with a
 * `*`, `?` or `[`) are exempt — a glob is a rule, not a reference.
 *
 * This is a structural check on strings, so it cannot know whether a script
 * does the right thing. It only knows that a script is not pointing at
 * nothing, which is the half that fails silently.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

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

console.log(
  JSON.stringify({ status: "PASS", pathReferences: checked, dangling: 0 }),
);
