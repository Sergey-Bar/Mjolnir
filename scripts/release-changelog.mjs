/**
 * Deterministic CHANGELOG transform for the auto-release path
 * (docs/PUBLISHING.md, "Automated release (default path)").
 *
 * Keep-a-Changelog forbids version bumps with no changelog record, but
 * this repo accumulates MULTIPLE thematic `## [Unreleased] — <title>`
 * sections (Phase 7 + Phase 8 …). This script collapses them under the
 * new version heading:
 *
 * - `## [X.Y.Z] — YYYY-MM-DD` is inserted above the first
 *   `## [Unreleased]` heading.
 * - every `## [Unreleased] — <title>` heading is demoted one level to
 *   `### <title>` under the new version heading (all other content
 *   preserved verbatim — hand-curated text stays authoritative).
 * - ZERO Unreleased sections → a minimal `### Changes since <prev>`
 *   section is appended instead, built from the given PR subjects
 *   (`git log <prev>..HEAD --format=%s`), because PUBLISHING.md forbids
 *   a bump with no changelog record.
 * - Idempotency guard: refuses to run when `## [X.Y.Z]` already exists
 *   (a re-run must not duplicate a version heading).
 *
 * The pure core (`applyChangelogRelease`) is unit-tested; the CLI
 * wrapper reads/writes CHANGELOG.md and shells out to git only for the
 * generated-section fallback.
 */

import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileP = promisify(execFile);

/** `## [Unreleased] — Title` heading line (title captured, em dash). */
const UNRELEASED_HEADING = /^## \[Unreleased\](?: — (.*))?$/;

/**
 * Pure transform. See module doc.
 *
 * @param {string} changelog - full current CHANGELOG.md text.
 * @param {string} version - the version being released, e.g. "0.5.1".
 * @param {string} date - ISO date, e.g. "2026-09-05".
 * @param {string[]} subjects - PR subjects for the generated-section
 *   fallback (used only when there are zero Unreleased sections).
 * @param {string} previousVersion - e.g. "0.5.0", for that fallback.
 * @returns {{ text: string, mode: "released" | "generated" }}
 * @throws when the version heading already exists (idempotency guard).
 */
export function applyChangelogRelease(
  changelog,
  version,
  date,
  subjects,
  previousVersion,
) {
  const versionHeading = `## [${version}] — ${date}`;
  // Dots are literal in the heading text but regex metacharacters:
  // guard must not let `## [0.5.1]` match a `## [0.5.10]` heading.
  const versionHeadingRe = new RegExp(
    `^## \\[${version.replace(/\./g, "\\.")}\\]`,
    "m",
  );
  if (versionHeadingRe.test(changelog)) {
    throw new Error(
      `CHANGELOG already has a [${version}] heading — refusing to run ` +
        `twice for the same version (idempotency guard)`,
    );
  }

  const lines = changelog.split("\n");
  /** @type {string[]} */
  const out = [];
  let seenUnreleased = 0;

  for (const line of lines) {
    const unreleased = UNRELEASED_HEADING.exec(line);
    if (unreleased) {
      if (seenUnreleased === 0) {
        out.push(versionHeading, "");
      }
      seenUnreleased += 1;
      // Demote the thematic title one level; a bare `## [Unreleased]`
      // (no title) contributes no heading of its own.
      const title = (unreleased[1] ?? "").trim();
      if (title) out.push(`### ${title}`);
      continue;
    }
    out.push(line);
  }

  if (seenUnreleased > 0) {
    return { text: out.join("\n"), mode: "released" };
  }

  // Zero Unreleased sections: generate a minimal section so a version
  // bump never ships with no changelog record (PUBLISHING.md). It goes
  // ABOVE the previous release heading — Keep-a-Changelog is
  // newest-first — falling back to a plain append when no released
  // heading exists at all.
  const generated = [
    versionHeading,
    "",
    `### Changes since ${previousVersion}`,
    "",
    ...subjects.map((subject) => `- ${subject}`),
  ];
  const firstReleaseHeading = lines.findIndex((line) => /^## \[/.test(line));
  if (firstReleaseHeading === -1) {
    const joiner = changelog.endsWith("\n") ? "" : "\n";
    return {
      text: `${changelog}${joiner}\n${generated.join("\n")}\n`,
      mode: "generated",
    };
  }
  out.splice(
    firstReleaseHeading,
    0,
    ...generated,
    "", // blank line between the generated block and the heading below
  );
  return { text: out.join("\n"), mode: "generated" };
}

// ── CLI ───────────────────────────────────────────────────────────────

/**
 * PR subjects since a tag (whole history when tag is null) — used only
 * by the generated-section fallback.
 *
 * @param {string | null} tag
 * @returns {Promise<string[]>}
 */
async function subjectsSince(tag) {
  const args = ["log", "--format=%s"];
  if (tag) args.push(`${tag}..HEAD`);
  const { stdout } = await execFileP("git", args);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Last tag reachable from HEAD; null when the repo has no tags.
 *
 * @returns {Promise<string | null>}
 */
async function lastTag() {
  try {
    const { stdout } = await execFileP("git", [
      "describe",
      "--tags",
      "--abbrev=0",
    ]);
    return stdout.trim();
  } catch {
    return null;
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const usage =
    "usage: node scripts/release-changelog.mjs <version> <YYYY-MM-DD> [--changelog <path>]\n" +
    "Collapses every `## [Unreleased]` section under `## [<version>] — <date>`;\n" +
    "with no Unreleased sections, appends a generated section from git subjects.";
  const [version, date] = process.argv.slice(2);
  const changelogFlagIndex = process.argv.indexOf("--changelog");
  const changelogPath =
    changelogFlagIndex !== -1
      ? process.argv[changelogFlagIndex + 1]
      : "CHANGELOG.md";
  if (!version || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(usage);
    process.exit(2);
  }

  const current = readFileSync(changelogPath, "utf8");
  const prevTag = await lastTag();
  const previousVersion = prevTag ? prevTag.replace(/^v/, "") : "start";
  const subjects = await subjectsSince(prevTag);

  const { text, mode } = applyChangelogRelease(
    current,
    version,
    date,
    subjects,
    previousVersion,
  );
  writeFileSync(changelogPath, text);
  console.log(
    `CHANGELOG updated (mode=${mode}): version ${version} dated ${date}` +
      (mode === "generated"
        ? ` — generated section from ${subjects.length} commit(s) since ${previousVersion}`
        : ""),
  );
}
