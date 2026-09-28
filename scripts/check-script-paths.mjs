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

/**
 * A path cited inside a COMMENT, in `src/**`, `scripts/**` or `tests/**`.
 *
 * The same failure as above, one level over: a comment naming a file that has
 * been renamed or deleted is a comment the next maintainer follows and finds
 * nothing. It is worth checking because the repository's own comments are
 * load-bearing here — `src/commands/doctor.ts` documented a cap against
 * `tests/rules/registry-ratchet.spec.ts`, which is `tests/rules/registry-ratchet.spec.ts`,
 * and the gate that supposedly polices path references was checking only
 * npm scripts.
 *
 * Deliberately narrow, because a comment checker that cries wolf gets
 * switched off:
 *
 *   - only files under the ROOTS, and only source extensions;
 *   - only a token that has a directory component AND a known source
 *     extension, so prose like "the engine" is not a path;
 *   - lines containing a URL are skipped wholesale — `https://…/foo.ts` is a
 *     remote reference and a local existence check is the wrong question;
 *   - globs are skipped: `dist/**` describes a set, not a file.
 */
const COMMENT_ROOTS = ["src", "scripts", "tests"];
const SOURCE_EXT = /\.(?:ts|mts|cts|tsx|mjs|cjs|js|json|md|ya?ml)$/;
const URL_LINE = /\bhttps?:\/\//;
const GLOB = /[*?[]/;
/** `<RULE-ID>`, `{family}`, `…` — a TEMPLATE, not a reference. */
const PLACEHOLDER = /[<>{}…]/;

/**
 * A comment BLOCK that RECORDS a deletion rather than pointing at a file.
 *
 * "Was `src/reporter/score-state.ts`, unwired and deleted in 6.0" is a true
 * statement about a path that does not exist, and it is exactly the kind of
 * sentence a reader needs. Requiring the file to exist would push authors to
 * delete the history instead, which loses the only record of why a module is
 * gone. The defect this gate exists for is the opposite case: a comment
 * pointing at a file that was renamed or deleted WITHOUT saying so.
 *
 * Matched over the whole CONTIGUOUS BLOCK rather than the single line,
 * because these sentences wrap: the path sits on one line and the word
 * "deleted" three lines below it, and a line-scoped test would have flagged
 * the correct sentence and nothing else.
 *
 * The word list is DELETION VERBS ONLY, and "was"/"were" are deliberately
 * absent. They were in the first version and the exemption immediately ate
 * the defect the gate exists for: "the ratchet (tests/stale.spec.ts) WAS what
 * caught it" contains "was" and is a live reference to a file that does not
 * exist. An exemption broad enough to cover every sentence that mentions a
 * past state is an exemption for everything.
 */
const HISTORICAL =
  /\b(?:used to|formerly|no longer|deleted|removed|renamed|replaced by|gone)\b/i;

function commentPathTokens(text) {
  const out = [];
  const lines = text.split("\n");
  let block = "";
  const flush = () => {
    if (block.trim() !== "")
      out.push(...extractTokens(block, HISTORICAL.test(block)));
    block = "";
  };
  for (const line of lines) {
    const isComment =
      /^\s*\/\//.test(line) ||
      /^\s*\*(?!\/)/.test(line) ||
      /^\s*\/\*+\s*$/.test(line);
    if (!isComment) {
      flush();
      continue;
    }
    // Strip the comment markers; the payload after them is what a reader
    // would follow.
    block += `${line.replace(/^\s*\*+\/?\s?/, "").replace(/^\s*\/\/+\s?/, "")}\n`;
  }
  flush();
  return out;
}

function extractTokens(block, isHistorical) {
  const out = [];
  for (const rawLine of block.split("\n")) {
    if (URL_LINE.test(rawLine)) continue;
    for (const token of rawLine.split(/[\s,;:()[\]{}"'`]+/)) {
      const clean = token.replace(/[.,;]+$/, "");
      if (!COMMENT_ROOTS.some((r) => clean.startsWith(`${r}/`))) continue;
      if (GLOB.test(clean) || PLACEHOLDER.test(clean)) continue;
      if (!SOURCE_EXT.test(clean)) continue;
      if (ILLUSTRATIVE.has(clean)) continue;
      if (isHistorical) continue;
      out.push(clean);
    }
  }
  return out;
}

/**
 * Paths that are EXAMPLES in prose, not references.
 *
 * Each one is cited by a comment that is using it to illustrate a shape —
 * "a test at `tests/foo.spec.ts`". An existence check on an example is a
 * check that can only ever fail, and a gate that cannot pass is a gate that
 * gets switched off. Listed rather than pattern-matched, because a pattern
 * that guesses at "looks like an example" would also swallow a real typo.
 */
const ILLUSTRATIVE = new Set([
  "tests/foo.spec.ts",
  "src/foo.test.ts",
  "src/out.ts",
  "tests/roast.spec.ts",
  "tests/control.spec.ts",
  "tests/slow.spec.mts",
  "tests/contract-schema.spec.ts",
  "tests/fixtures/QA-X-001/must-not-fire/y.ts",
]);

/**
 * Does `token` name a file that exists?
 *
 * Resolves the `.js`-against-`.ts` convention the whole repository writes
 * imports with, because a source import says `./foo.js` and the file is
 * `foo.ts`. Without that, every correctly-written reference in a comment
 * reads as dangling, and a gate that reports 82 phantom hits gets disabled
 * rather than fixed.
 */
function resolves(root, token) {
  if (existsSync(join(root, token))) return true;
  const candidates = [
    token.replace(/\.js$/, ".ts"),
    token.replace(/\.js$/, ".tsx"),
    token.replace(/\.mjs$/, ".mts"),
    token.replace(/\.cjs$/, ".cts"),
  ];
  return candidates.some((candidate) => existsSync(join(root, candidate)));
}
const danglingComments = [];
let commentRefs = 0;
for (const rel of trackedPaths()) {
  if (!COMMENT_ROOTS.some((r) => rel.startsWith(`${r}/`))) continue;
  if (!/\.(?:ts|mts|mjs|cjs|js)$/.test(rel)) continue;
  if (!existsSync(join(root, rel))) continue;
  for (const token of commentPathTokens(
    readFileSync(join(root, rel), "utf8"),
  )) {
    commentRefs += 1;
    if (!resolves(root, token)) {
      danglingComments.push(`${rel}: cites "${token}", which does not exist.`);
    }
  }
}

if (danglingComments.length > 0) {
  console.error(
    `script:paths: ${danglingComments.length} comment(s) cite a path that does ` +
      `not exist, out of ${commentRefs} checked:`,
  );
  for (const note of danglingComments) console.error(`script:paths: ${note}`);
  console.error(
    "script:paths: a comment naming a missing file sends the next maintainer " +
      "looking for something that was renamed or deleted. Fix the reference, or " +
      "drop the line.",
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "PASS",
    npmScripts: Object.keys(pkg.scripts ?? {}).length,
    /** Path tokens inside npm script bodies. */
    scriptPathRefs: checked,
    /** Path tokens inside source comments — the check 6.0 added. */
    commentPathRefs: commentRefs,
  }),
);
