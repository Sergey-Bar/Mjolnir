/**
 * The decision behind the advisory README-translation report
 * (scripts/check-readme-translations.mjs).
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

const DAY_MS = 24 * 60 * 60 * 1000;

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
