#!/usr/bin/env node
/**
 * A user-visible change without a changelog entry is not shipped.
 *
 * `CHANGELOG.md` is hand-written prose, not generated, and it has carried an
 * empty `## [Unreleased]` section for a release. 6.0 shipped
 * `--require-full-coverage`, a new exit-2 coverage path, and fifteen removed
 * verbs and recorded none of them: nothing failed, because nothing compared
 * the working tree to the changelog.
 *
 * What is checked, and the reasoning behind each part:
 *
 *   - The entry must be in the TOP section. A changelog is a sequence of
 *     releases, and an unreleased change belongs in the unreleased entry. A
 *     marker anywhere in an append-only file is the same defect as the
 *     anti-creep exception marker: it disables the check for good after the
 *     first use, so the second release needs no entry either.
 *   - A version bump satisfies it. A version bump IS the release record, and
 *     demanding a separate `[Unreleased]` block on the commit that sets the new
 *     version would make the two disagree on purpose.
 *   - The change must be user-visible. A docs-only edit is not a release
 *     note, and a repository with 102 generated rule pages would otherwise
 *     need an entry for every regeneration.
 *
 * Usage: node scripts/check-unreleased-entry.mjs [--base=<sha>]
 * Exit codes: 0 = nothing to record, 1 = a change needs an entry, 2 = setup error.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const PACKAGE = join(ROOT, "package.json");

/**
 * Paths whose change is not user-visible.
 *
 * A prefix list rather than a glob engine, because the question is "is this a
 * note a reader of the release would want" and that is a judgement about
 * DIRECTORIES, not about patterns. `docs/rules/**` is here for a specific
 * reason: it is 102 generated pages, and requiring a changelog line for each
 * regeneration would train the flag to be set mechanically.
 */
const NOT_USER_VISIBLE = [
  "docs/rules/",
  "docs/adr/",
  "tests/corpus/.cache/",
  "docs/RULE-CAPABILITY-MATRIX.",
  "docs/FP-AUDIT.",
  "docs/BLAST-RADIUS-AUDIT.",
  "docs/COUNT-LOCK.",
  "docs/CORE-READINESS.",
  "docs/QUARANTINE-REMEDIATION.",
  "docs/COVERAGE-EXEMPTIONS.",
  ".github/",
  "gates/",
  "claude/",
  ".kilo/",
];

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * The files to judge, and WHERE the comparison came from.
 *
 * Two sources, because one of them cannot work:
 *
 *   - `git status --porcelain` — the default, for a maintainer's dirty tree.
 *     **In CI the tree is CLEAN**, so this returns nothing and the gate
 *     reports PASS on every run, which is the 6.0 defect it exists to prevent
 *     reproduced inside the gate meant to prevent it. It is the honest answer
 *     to "what is uncommitted", and CI must therefore pass `--base`.
 *   - `git diff --base..HEAD` — the CI path, named in `ci.yml` as
 *     `--base=origin/${{ github.base_ref || 'main' }}`.
 *
 * A RENAME is one porcelain entry of the form `old -> new`, and the first
 * version matched it against the exclusion prefixes using the WHOLE string. So
 * `docs/rules/x.md -> src/x.ts` was exempt because it starts with
 * `docs/rules/` — a new source file hiding behind a deleted doc page. The
 * rename's NEW path is what a release note is about, so both halves are
 * returned and the caller sees the new one.
 */
function changedFiles() {
  const baseFlag = process.argv.find((arg) => arg.startsWith("--base="));
  if (baseFlag) {
    const base = baseFlag.slice("--base=".length);
    // A missing base ref used to surface as a raw
    // `fatal: ambiguous argument 'origin/main..HEAD'` stack trace, which says
    // nothing about the cause and nothing about the fix. It is a
    // configuration problem — a shallow checkout with no `origin/<base>` —
    // and it is worth saying so, because the failure mode hides itself: on a
    // push to main the base IS HEAD, so the same command resolves and the gate
    // passes. Only a pull request reaches the broken path, so the defect is
    // invisible on the one branch a maintainer watches.
    try {
      git(["rev-parse", "--verify", `${base}^{commit}`]);
    } catch {
      console.error(
        `check-unreleased-entry: the base ref ${JSON.stringify(base)} does not ` +
          "exist in this checkout, so the change set cannot be read.\n" +
          "This is a checkout-depth problem, not a changelog problem. A CI job " +
          "that runs this must fetch the base:\n" +
          "  actions/checkout:\n" +
          "    with:\n" +
          "      fetch-depth: 0\n" +
          "or pass a base that exists locally (`--base=HEAD~1` reads the last " +
          "commit instead of the branch).",
      );
      process.exit(2);
    }
    return git(["diff", "--name-only", `${base}..HEAD`])
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const out = [];
  for (const line of git(["status", "--porcelain"]).split("\n")) {
    if (line.trim() === "") continue;
    const path = line
      .slice(3)
      .trim()
      .replace(/^"(.*)"$/, "$1");
    // A rename/copy is `old -> new`; the new half is the change under review.
    const arrow = path.indexOf(" -> ");
    out.push(arrow === -1 ? path : path.slice(arrow + 4));
  }
  return out;
}

if (!existsSync(CHANGELOG)) {
  console.error(`check-version: missing ${CHANGELOG}`);
  process.exit(2);
}
if (!existsSync(PACKAGE)) {
  console.error(`check-version: missing ${PACKAGE}`);
  process.exit(2);
}

const changelog = readFileSync(CHANGELOG, "utf8");

/**
 * The body of the `## [Unreleased]` section, or `""` when it is absent.
 *
 * The first version took "the first `## ` section" and scanned it for any
 * non-blank, non-`#` line. Three ways to switch that off with a single
 * character, all reproduced in fixtures:
 *
 *   - a `---` rule or an HTML comment in the empty section reads as a body;
 *   - a top section headed `## [9.9.9] — 2030-01-01` satisfied it, because
 *     the code never checked for the `[Unreleased]` token the error message
 *     names;
 *   - demoting every release heading to `#` level made the first `## ` a
 *     SUBHEADING, which then became "the top section".
 *
 * So the section is found BY NAME, and the body excludes anything that is not
 * prose: headings, thematic breaks, and comments. An empty section is empty.
 */
function unreleasedBody() {
  const heading = /^## \[Unreleased\][^\n]*$/m.exec(changelog);
  if (heading === null) return "";
  const rest = changelog.slice(heading.index + heading[0].length);
  const next = /^## /m.exec(rest);
  const section = next === null ? rest : rest.slice(0, next.index);
  return section
    .split("\n")
    .filter(
      (line) =>
        line.trim() !== "" &&
        !line.startsWith("#") &&
        !/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim()) &&
        !/^<!--/.test(line.trim()) &&
        !/^\[.*\]:\s*\S+$/.test(line.trim()),
    )
    .join("\n")
    .trim();
}

const pkg = JSON.parse(readFileSync(PACKAGE, "utf8"));

/**
 * Did the PUBLISHED VERSION change in this range?
 *
 * The first version read `git show HEAD:package.json`, which is right for a
 * dirty local tree and always `false` in the `--base` path CI uses — where the
 * checkout IS `HEAD` and nothing is unstaged. The escape from the gate was
 * therefore unreachable exactly where it mattered.
 *
 * The comparison is now against the BASE: `git show <base>:package.json`, so
 * it answers "did this range change the version", which is the question CI is
 * asking. Locally, with no `--base`, the same comparison against `HEAD`
 * answers "did my working tree change the version", which is the question a
 * maintainer is asking. One comparison, two bases, both correct.
 */
function versionBumped() {
  const baseFlag = process.argv.find((arg) => arg.startsWith("--base="));
  const base =
    baseFlag === undefined ? "HEAD" : baseFlag.slice("--base=".length);
  let committed;
  try {
    committed = JSON.parse(git(["show", `${base}:package.json`]));
  } catch {
    return false; // no previous version to differ from
  }
  if (committed.version !== pkg.version) return true;
  return ["action.yml", "capability-manifest.json"].some((file) => {
    try {
      const before = git(["show", `${base}:${file}`]);
      const after = readFileSync(join(ROOT, file), "utf8");
      const pick = (text) => {
        const m = /"version"\s*:\s*"([^"]+)"|version:\s*v?([\w.+-]+)/.exec(
          text,
        );
        return m?.[1] ?? m?.[2] ?? null;
      };
      const was = pick(before);
      return was !== null && was !== pick(after);
    } catch {
      return false;
    }
  });
}

const changed = changedFiles().filter(
  (file) => !NOT_USER_VISIBLE.some((prefix) => file.startsWith(prefix)),
);
const bumped = versionBumped();
const hasEntry = unreleasedBody().length > 0;

const report = {
  status: changed.length === 0 || hasEntry || bumped ? "PASS" : "FAIL",
  gate: "check-version",
  changedFiles: changed,
  unreleasedEntryPresent: hasEntry,
  versionBumped: bumped,
};

if (report.status === "FAIL") {
  console.error(
    `check-changelog: ${changed.length} user-visible file(s) changed with no \`## [Unreleased]\` ` +
      "entry and no version bump. A release with no note is indistinguishable from a release " +
      "with nothing in it, and 6.0 shipped a flag, an exit code and fifteen removed verbs " +
      "without a line:\n\n" +
      changed
        .slice(0, 12)
        .map((f) => `    ${f}`)
        .join("\n") +
      (changed.length > 12 ? `\n    … and ${changed.length - 12} more` : "") +
      "\n\nAdd the entry, or run with `--base=<sha>` if these are already released.",
  );
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
