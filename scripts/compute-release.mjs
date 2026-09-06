/**
 * Pure release-bump decision logic for the auto-release path (merge to
 * `main` → publish with zero manual commands — see docs/PUBLISHING.md,
 * "Automated release (default path)").
 *
 * Input: the commit subjects since the last release tag, plus an async
 * labels-lookup function (injected so the decision is unit-testable
 * without GitHub; the CLI wrapper supplies `gh pr view`). Output:
 * `{ bump, skip, reason }` where bump is one of "major" | "minor" |
 * "patch".
 *
 * Policy (plan .kilo/plans/1788579000817):
 * - PR labels release:major / release:minor / release:skip drive the
 *   bump; no label = patch (the default).
 * - Labels are OR-ed across the whole range since the last tag: the
 *   highest bump wins (major > minor > patch).
 * - release:skip excludes that PR's commits from the release decision;
 *   if EVERY commit in the range is skip (or the range is empty) the
 *   release is skipped entirely.
 * - A commit whose PR number cannot be resolved, or whose label lookup
 *   fails, falls back to patch with a warning — a lookup blip must
 *   never fail (or silently drop) a release.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileP = promisify(execFile);

/** Bump ranks; higher wins. patch is the default, not a label. */
const BUMP_RANK = { patch: 1, minor: 2, major: 3 };

/** PR labels that raise the bump. `release:skip` is handled separately. */
const LABEL_TO_BUMP = {
  "release:major": "major",
  "release:minor": "minor",
};

/**
 * Extract the PR number from a squash-merge subject like
 * "site: … (#29)". Returns null when there is none (direct pushes).
 *
 * @param {string} subject
 * @returns {number | null}
 */
export function prNumberFromSubject(subject) {
  const m = subject.match(/\(#(\d+)\)/);
  return m ? Number(m[1]) : null;
}

/**
 * Decide the bump for a batch of commits since the last release tag.
 *
 * @param {ReadonlyArray<{ subject: string }>} commits - any order; the
 *   bump is a range-wide max, not a per-commit sequence.
 * @param {(pr: number) => Promise<string[]>} lookupLabels - resolves a
 *   PR number to its label names. Throwing simulates a failed `gh`
 *   lookup (treated as patch-with-warning per PR, never fatal).
 * @returns {Promise<{ bump: "major"|"minor"|"patch", skip: boolean, reason: string, warnings: string[] }>}
 */
export async function computeRelease(commits, lookupLabels) {
  /** @type {string[]} */
  const warnings = [];
  if (commits.length === 0) {
    return {
      bump: "patch",
      skip: true,
      reason: "no commits since last tag",
      warnings,
    };
  }

  let bump = "patch";
  let contributing = 0;
  let skipped = 0;

  for (const { subject } of commits) {
    const pr = prNumberFromSubject(subject);
    if (pr === null) {
      // Direct push (or a squash-merge convention change): no label
      // signal available. Defaults to patch, never blocks the release.
      contributing += 1;
      warnings.push(`no PR number in subject — patch default: "${subject}"`);
      continue;
    }
    let labels;
    try {
      labels = await lookupLabels(pr);
    } catch (err) {
      contributing += 1;
      const message = err instanceof Error ? err.message : String(err);
      warnings.push(
        `label lookup failed for PR #${pr} — patch default (${message})`,
      );
      continue;
    }
    if (labels.includes("release:skip")) {
      skipped += 1;
      continue;
    }
    contributing += 1;
    for (const label of Object.keys(LABEL_TO_BUMP)) {
      if (labels.includes(label)) {
        const candidate = LABEL_TO_BUMP[label];
        if (BUMP_RANK[candidate] > BUMP_RANK[bump]) {
          bump = candidate;
        }
      }
    }
  }

  if (contributing === 0) {
    return {
      bump: "patch",
      skip: true,
      reason: `all ${skipped} commit(s) since last tag labeled release:skip`,
      warnings,
    };
  }
  return {
    bump,
    skip: false,
    reason: `${contributing} release commit(s), ${skipped} skipped, max bump = ${bump}`,
    warnings,
  };
}

// ── CLI (thin wrapper for the workflow step) ──────────────────────────

/**
 * Run `git describe --tags --abbrev=0` in the current repo.
 *
 * @returns {Promise<string | null>} the last reachable tag, or null
 *   when the repo has no tags at all (first release).
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

/**
 * Commit subjects for a git revision range ("" range = whole history).
 *
 * @param {string} range
 * @returns {Promise<string[]>}
 */
async function subjectsForRange(range) {
  const args = ["log", "--format=%s"];
  if (range) args.push(range);
  const { stdout } = await execFileP("git", args);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * `gh pr view <n> --json labels` → label names. Throws on any failure;
 * the caller turns that into the patch-with-warning fallback.
 *
 * @param {number} pr
 * @returns {Promise<string[]>}
 */
async function lookupLabelsViaGh(pr) {
  const { stdout } = await execFileP("gh", [
    "pr",
    "view",
    String(pr),
    "--json",
    "labels",
    "--jq",
    "[.labels[].name]",
  ]);
  return JSON.parse(stdout);
}

/**
 * Local dry-run entry point: `node scripts/compute-release.mjs` walks
 * git for the range since the last tag and resolves labels via `gh`.
 * The GitHub Actions step calls the same path with --github-output so
 * the bump lands in $GITHUB_OUTPUT.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const githubOutput = process.argv.includes("--github-output");
  const rangeFlagIndex = process.argv.indexOf("--range");
  const rangeFlag =
    rangeFlagIndex !== -1 ? process.argv[rangeFlagIndex + 1] : undefined;

  let range = rangeFlag;
  if (range === undefined) {
    const tag = await lastTag();
    range = tag ? `${tag}..HEAD` : "";
  }

  const commits = (await subjectsForRange(range)).map((subject) => ({
    subject,
  }));
  /** Cache — a PR appears once per squash merge, but rebases can repeat. */
  const cache = new Map();
  const decision = await computeRelease(commits, async (pr) => {
    const cached = cache.get(pr);
    if (cached) return cached;
    const labels = await lookupLabelsViaGh(pr);
    cache.set(pr, labels);
    return labels;
  });

  for (const warning of decision.warnings) {
    console.log(`::warning::${warning}`);
  }
  console.log(JSON.stringify(decision, null, 2));

  if (githubOutput) {
    const outputFile = process.env.GITHUB_OUTPUT;
    if (!outputFile) {
      throw new Error("--github-output requires $GITHUB_OUTPUT to be set");
    }
    const { appendFileSync } = await import("node:fs");
    appendFileSync(
      outputFile,
      `bump=${decision.bump}\nskip=${decision.skip}\n`,
    );
  }
  if (decision.skip) {
    // Skipping a release is a SUCCESS outcome (plan: "succeed with
    // notice") — the job's skip output drives the release job's `if`.
    console.log(`::notice::Release skipped: ${decision.reason}`);
  }
  process.exitCode = 0;
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await main();
}
