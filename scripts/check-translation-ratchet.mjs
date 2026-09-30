#!/usr/bin/env node
/**
 * The README-translation gap is ratcheted, not ignored.
 *
 * `npm run docs:translations` is an advisory report and always exits 0; the
 * strict variant exits 1 on all 22 languages today, because they are roughly
 * 12 sections behind and no machine can close that gap. The maintainer chose
 * ADVISORY, deliberately, and that decision is recorded in
 * `scripts/check-readme-translations.mjs`.
 *
 * The honest cost of "advisory" is that nothing in CI notices when the gap
 * WIDENS. A translation can fall further behind, a new language can be added
 * half-finished, and every run reports the same red table nobody reads. That
 * is the state this gate is built to catch.
 *
 * The honest LIMIT of this gate, stated here rather than discovered later:
 * with all 22 languages already not-fresh, the count cannot grow without a
 * 23rd language, so the failing branch is unreachable for the shapes of
 * regression it was written for. The DIRECTION is enforced correctly — an
 * entry above the baseline fails, and a ticked or missing translation counts —
 * but a translation falling further behind does NOT move this number, because
 * it was already counted. What the gate catches is a new language and a
 * restored marker; what it does not catch is decay within a language already
 * counted, and a future version should measure that by a per-language staleness
 * date rather than by a total.
 *
 * The baseline is a committed count, so lowering it is a normal PR and raising
 * it requires a deliberate edit to a data file a reviewer can see — which is
 * the same shape as `HIGH_WATER` in `scripts/check-coverage-ratchet.mjs` and
 * `docs/COVERAGE-GATE.md`.
 *
 * Reusing the strict path's own logic matters: a second, looser rule for the
 * same property is how the strict report and this one would disagree, and a
 * ratchet that disagrees with its own measurement is a comment.
 *
 * Usage: node scripts/check-translation-ratchet.mjs [--init]
 * Exit codes: 0 = at or under baseline, 1 = gap widened, 2 = setup error.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  computeSourceHash,
  extractSections,
  readmeLastChangeDate,
  SOURCE_HASH_MARKER,
  SYNCED_MARKER,
  TRANSLATED_LANGS,
  translationStatus,
} from "./lib/readme-translation-status.mjs";

/**
 * The languages, from the shared list.
 *
 * This file used to carry its own copy of the 22 codes, the two marker
 * regexes, and the two readers — identical to the advisory report's, and
 * "kept in step by hand" with a test that regex-parsed the report's source
 * text. Five duplications of one fact, guarded by a test of formatting. They
 * now live in the module both consumers already import, and the two
 * consumers can no longer disagree about which languages exist.
 */
const LANGS = TRANSLATED_LANGS;

const ROOT = join(import.meta.dirname, "..");
const BASELINE = join(ROOT, "docs", "TRANSLATION-RATCHET.json");

const readmeDate = readmeLastChangeDate();
const currentSourceHash = computeSourceHash();
const sourceSections = (() => {
  try {
    return extractSections(readFileSync(join(ROOT, "README.md"), "utf8"));
  } catch {
    return [];
  }
})();

if (!readmeDate) {
  console.error(
    "translation ratchet: cannot determine when README.md last changed " +
      "(not a git checkout). The ratchet has no fixed input to compare against, " +
      "so it fails rather than reporting a green it cannot justify.",
  );
  process.exit(2);
}

const stale = [];
const missing = [];
for (const code of LANGS) {
  const file = `README.${code}.md`;
  let text;
  try {
    text = readFileSync(join(ROOT, file), "utf8");
  } catch {
    missing.push(code);
    continue;
  }
  const marker = SYNCED_MARKER.exec(text);
  const hash = SOURCE_HASH_MARKER.exec(text);
  if (!marker) {
    missing.push(code);
    continue;
  }
  const { status } = translationStatus({
    readmeDate,
    syncedDate: `${marker[1]}-${marker[2]}-${marker[3]}`,
    sourceHash: hash?.[1] ?? null,
    currentHash: currentSourceHash,
    sourceSections,
    translationSections: extractSections(text),
  });
  if (status !== "fresh") stale.push(code);
}

// A file that cannot be read or carries no marker is a hole in the claim, not
// a clean row, so it counts against the ratchet too. Counting it separately
// keeps the failure message honest about which kind of gap appeared.
const notFresh = new Set([...stale, ...missing]);

if (process.argv.includes("--init")) {
  if (existsSync(BASELINE)) {
    console.error(
      `translation ratchet: ${BASELINE} already exists. Lowering it is a normal ` +
        `change; --init is only for creating it.`,
    );
    process.exit(2);
  }
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        schemaVersion: 1,
        description:
          "Upper bound on the number of README translations that are not fresh. " +
          "Ratcheted, not a target: closing the gap lowers this, widening it is an " +
          "explicit edit a reviewer can see. See scripts/check-translation-ratchet.mjs.",
        translationsNotFresh: notFresh.size,
        languagesTracked: LANGS.length,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`translation ratchet: baseline written at ${notFresh.size}`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(
    `translation ratchet: missing ${BASELINE}. Run \`node scripts/check-translation-ratchet.mjs --init\` ` +
      "once to record the current gap, then ratchet it down.",
  );
  process.exit(2);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
} catch (error) {
  console.error(
    `translation ratchet: ${BASELINE} is unreadable (${error instanceof Error ? error.message : String(error)})`,
  );
  process.exit(2);
}

const ceiling = baseline?.translationsNotFresh;
if (!Number.isInteger(ceiling)) {
  console.error(
    `translation ratchet: ${BASELINE} has no integer translationsNotFresh; a ratchet that cannot be read is not a ratchet`,
  );
  process.exit(2);
}

console.log(
  `README translations: ${notFresh.size} of ${LANGS.length} not fresh (baseline ≤ ${ceiling})`,
);

if (notFresh.size > ceiling) {
  console.error(
    `translation ratchet: ${notFresh.size} translations are not fresh, above the committed ` +
      `baseline of ${ceiling}. A translation may fall behind; it may not fall further ` +
      `behind without a deliberate edit to the baseline. Currently not fresh: ` +
      [...notFresh].sort().join(", "),
  );
  console.error(
    "\nEither fix the translations, or — if widening is deliberate and correct — " +
      `edit translationsNotFresh in docs/TRANSLATION-RATCHET.json and say why in the PR.`,
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      notFresh: notFresh.size,
      baseline: ceiling,
      stale: [...stale].sort(),
      missingMarkers: missing.sort(),
    },
    null,
    2,
  ),
);
