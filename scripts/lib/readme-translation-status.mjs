import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The decision behind the advisory README-translation report
 * (scripts/check-readme-translations.mjs) AND behind the translation ratchet
 * (scripts/check-translation-ratchet.mjs).
 *
 * The rule lives here, pure and exported, so it can be unit-tested without a
 * git checkout, a clock, or a fixture tree. The wrapper stays a thin CLI.
 *
 * One invariant matters and it is the reason this module exists:
 *
 *   A structural verdict is a fact about CONTENT. It must never be
 *   suppressed by the date signal, which is a fact about HISTORY.
 *
 * The bug this replaces gated the structural check behind
 * `dateStatus === "fresh"`, so the day after README.md changed, every
 * translation reported "stale by 1 day" and the structural verdict vanished
 * from the report entirely. tests/readme-release-status.spec.ts asserts the
 * structural verdict is present in strict mode, so the report lost a finding
 * and the test failed. Which meant the whole advisory report went quiet
 * precisely when a translation was most out of date.
 */

/**
 * The languages this repository translates, and the markers each file carries.
 *
 * Here rather than in either of the two consumers. `check-readme-translations.mjs`
 * (the advisory report) and `check-translation-ratchet.mjs` (the gate) both
 * needed this list, and both had their OWN copy — kept "in step" by hand, with
 * a test that regex-parsed the report's source to catch drift. A test that
 * reads a file's formatting is a test of the formatting; the list belongs in
 * the module both sides already import, which is this one.
 */
export const TRANSLATED_LANGS = Object.freeze([
  "zh",
  "zht",
  "ko",
  "de",
  "es",
  "fr",
  "it",
  "da",
  "ja",
  "pl",
  "ru",
  "no",
  "br",
  "th",
  "tr",
  "uk",
  "bn",
  "gr",
  "vi",
  "he",
  "ar",
  "bs",
]);

/** `Last synced: YYYY-MM-DD` */
export const SYNCED_MARKER = /Last synced:\s*(\d{4})-(\d{2})-(\d{2})/;

/** `<!-- Source hash: abc123 -->` */
export const SOURCE_HASH_MARKER = /<!--\s*Source hash:\s*([a-f0-9]+)\s*-->/;

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Last calendar date (YYYY-MM-DD) a commit touched README.md, or null.
 *
 * Takes the root rather than reading the process's cwd, so a caller
 * inspecting a fixture compares the FIXTURE's history. Both consumers of this
 * module read a real checkout today; the ratchet's fixture runs `git init` and
 * one commit precisely so this has an input to read, and a hard-coded
 * `process.cwd()` would have silently compared the wrong tree's history.
 */
export function readmeLastChangeDate(root) {
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", "README.md"],
      {
        cwd: root,
        encoding: "utf8",
      },
    ).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null; // not a git checkout (e.g. npm-packed tarball)
  }
}

/**
 * Content hash of the English README's translatable sections.
 *
 * Strips badges, shields and HTML blocks so CI-specific changes (badge URLs,
 * version bumps) do not flag translations as stale when the prose is
 * unchanged.
 */
export function computeSourceHash(root) {
  try {
    const text = readFileSync(join(root, "README.md"), "utf8");
    const translatable = text
      .split("\n")
      .filter(
        (line) => !/^(!\[|<!--|<div|<img|\[!\[|<a href)/.test(line.trim()),
      )
      .join("\n");
    return createHash("sha256").update(translatable).digest("hex").slice(0, 12);
  } catch {
    return null;
  }
}

/** Section headings (## level) from markdown text, prefix stripped. */
export function extractSections(text) {
  const sections = [];
  for (const line of text.split("\n")) {
    const m = /^##\s+(.+)/.exec(line.trim());
    if (m) sections.push(m[1].trim());
  }
  return sections;
}

/**
 * Headings present in the English source but absent from a translation.
 * Matched on the first 10 characters so that a translation which lightly
 * rephrases a heading is not reported as missing it.
 */
export function missingSections(sourceSections, translationSections) {
  return sourceSections.filter(
    (s) => !translationSections.some((ts) => ts.includes(s.slice(0, 10))),
  );
}

/**
 * Only flag a translation as structurally incomplete above this many missing
 * headings. Below it, the gap is within the noise of rephrasing.
 */
export const STRUCTURAL_GAP_THRESHOLD = 3;

export function utcMs(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function stalenessInDays(readmeDate, syncedDate) {
  return Math.round((utcMs(readmeDate) - utcMs(syncedDate)) / DAY_MS);
}

export function describeDateStatus(staleDays) {
  return staleDays <= 0
    ? "fresh"
    : `stale by ${staleDays} day${staleDays === 1 ? "" : "s"}`;
}

/**
 * The status cell for one translation.
 *
 * Returns { status, findings } where `findings` is the ordered list of
 * independent problems found, and `status` is what the report prints. Two
 * facts can be true at once: a translation can be behind the English source
 * AND missing whole sections. The report says so, rather than picking one and
 * hiding the other.
 *
 * @param {object} input
 * @param {string|null} input.readmeDate   last date a commit touched README.md
 * @param {string|null} input.syncedDate   the translation's "Last synced" marker
 * @param {string|null} input.sourceHash   the translation's recorded source hash
 * @param {string|null} input.currentHash  the English source's hash right now
 * @param {string[]} input.sourceSections   ## headings in README.md
 * @param {string[]} input.translationSections ## headings in the translation
 * @returns {{status: string, findings: string[]}}
 */
export function translationStatus({
  readmeDate,
  syncedDate,
  sourceHash,
  currentHash,
  sourceSections,
  translationSections,
}) {
  if (!readmeDate) {
    return { status: "unknown (README.md date unavailable)", findings: [] };
  }

  const staleDays = stalenessInDays(readmeDate, syncedDate);
  const dateStatus = describeDateStatus(staleDays);

  // The English source changed but the translation's date marker was bumped
  // without re-translating. This is the strongest claim, and it makes the date
  // comparison meaningless: the translation is not merely behind, it is
  // claiming currency it does not have.
  if (sourceHash && currentHash && sourceHash !== currentHash) {
    return {
      status: `content changed (hash ${sourceHash} ≠ ${currentHash})`,
      findings: ["content changed"],
    };
  }

  const findings = [];
  if (dateStatus !== "fresh") findings.push(dateStatus);

  // Computed unconditionally. This is a content fact; gating it on the date
  // is what made the report go silent the day after every README change.
  if (sourceSections.length > 0) {
    const missing = missingSections(sourceSections, translationSections);
    if (missing.length > STRUCTURAL_GAP_THRESHOLD) {
      findings.push(
        `structurally incomplete (missing ~${missing.length} sections)`,
      );
    }
  }

  return {
    status: findings.length > 0 ? findings.join("; ") : "fresh",
    findings,
  };
}
