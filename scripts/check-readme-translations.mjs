/**
 * Advisory staleness report for the README translations (npm run
 * docs:translations).
 *
 * English README.md is canonical; every README.<code>.md carries a
 * machine-assisted-translation marker with a "Last synced" date. This
 * script compares that date against the last commit that touched
 * README.md and prints a per-language table.
 *
 * ADVISORY, AND THE MAINTAINER CONFIRMED IT SHOULD STAY THAT WAY.
 * `docs:translations` — this script with no flag — always exits 0, and it is
 * what `certify` and `certify:ci` run. `--strict` exits 1 on any language
 * that is not fresh, and is available for local use via
 * `docs:translations:check`.
 *
 * 6.0 history, because the reasoning is worth keeping and it CHANGED. The
 * header used to deny all three of these: it claimed the script could not
 * block, that no strict mode existed, and that it "is not a CI gate".
 * `--strict` had existed since the script was written, and the second denial
 * was the real defect. A3 repaired it by making the strict path real and
 * wiring it. The maintainer then reviewed the consequence — 22 translations
 * roughly 12 sections behind README.md, a gap that predates the repository's
 * current shape and cannot be closed by a machine — and chose ADVISORY.
 *
 * So the strict variant is not in CI, deliberately. Removing the 6 command
 * rows this release invalidated was done by hand, and the structural gap is
 * a translation task, not a build failure. What survives from the repair is
 * the part that was true all along: the strict path works, it is exercised
 * by a spec, and the header no longer lies about what the script does.
 *
 * The honest cost: with this advisory, nothing in CI fails when a
 * translation falls behind. That is the decision's real weakness and it is
 * recorded here rather than discovered in six months. The mitigation is that
 * `docs:translations` prints the table on every certify run, so the drift is
 * visible in the log to anyone reading one.
 */
import { readFileSync } from "node:fs";
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

const ROOT = join(import.meta.dirname, "..");

/**
 * The translations + their switcher labels, derived from the shared list.
 *
 * The LABELS are this report's business — only the rendered table shows them.
 * The SET of languages is not: it is a fact about the repository, it lives in
 * `scripts/lib/readme-translation-status.mjs`, and both this report and the
 * translation ratchet read it from there. Two hand-maintained copies of
 * "which languages exist", kept in step by a test that regex-parsed this
 * file's source text, is the arrangement the ratchet was written to end.
 *
 * A label that is missing renders as the code itself, so an unlabelled
 * language degrades visibly rather than silently disappearing from the table.
 */
const LANG_LABELS = new Map([
  ["zh", "简体中文"],
  ["zht", "繁體中文"],
  ["ko", "한국어"],
  ["de", "Deutsch"],
  ["es", "Español"],
  ["fr", "Français"],
  ["it", "Italiano"],
  ["da", "Dansk"],
  ["ja", "日本語"],
  ["pl", "Polski"],
  ["ru", "Русский"],
  ["no", "Norsk"],
  ["br", "Português (Brasil)"],
  ["th", "ไทย"],
  ["tr", "Türkçe"],
  ["uk", "Українська"],
  ["bn", "বাংলা"],
  ["gr", "Ελληνικά"],
  ["vi", "Tiếng Việt"],
  ["he", "עברית"],
  ["ar", "العربية"],
  ["bs", "Bosanski"],
]);
const LANGS = TRANSLATED_LANGS.map((code) => [
  code,
  LANG_LABELS.get(code) ?? code,
]);

const readmeDate = readmeLastChangeDate();
const currentSourceHash = computeSourceHash();
const sourceSections = (() => {
  try {
    return extractSections(readFileSync(join(ROOT, "README.md"), "utf8"));
  } catch {
    return [];
  }
})();

const rows = [];
let issues = 0;

for (const [code, label] of LANGS) {
  const file = `README.${code}.md`;
  let status;
  let synced = "—";
  try {
    const text = readFileSync(join(ROOT, file), "utf8");
    const m = SYNCED_MARKER.exec(text);
    const hm = SOURCE_HASH_MARKER.exec(text);
    if (!m) {
      status = "MISSING MARKER";
    } else {
      synced = `${m[1]}-${m[2]}-${m[3]}`;
      status = translationStatus({
        readmeDate,
        syncedDate: synced,
        sourceHash: hm?.[1] ?? null,
        currentHash: currentSourceHash,
        sourceSections,
        translationSections: extractSections(text),
      }).status;
    }
  } catch {
    status = "FILE MISSING";
  }
  if (status !== "fresh") issues += 1;
  rows.push({ label, file, synced, status });
}

const pad = (s, n) => (s.length >= n ? s : s + " ".repeat(n - s.length));
const w = {
  label: Math.max(...rows.map((r) => r.label.length), "language".length),
  file: Math.max(...rows.map((r) => r.file.length), "file".length),
  synced: Math.max(...rows.map((r) => r.synced.length), "last synced".length),
  status: Math.max(...rows.map((r) => r.status.length), "status".length),
};

console.log(`README.md last change: ${readmeDate ?? "unavailable"}`);
console.log("");
console.log(
  `${pad("language", w.label)}  ${pad("file", w.file)}  ${pad("last synced", w.synced)}  status`,
);
console.log(
  `${pad("-".repeat(w.label), w.label)}  ${pad("-".repeat(w.file), w.file)}  ${pad("-".repeat(w.synced), w.synced)}  ${"-".repeat(w.status)}`,
);
for (const r of rows) {
  console.log(
    `${pad(r.label, w.label)}  ${pad(r.file, w.file)}  ${pad(r.synced, w.synced)}  ${r.status}`,
  );
}
const strict = process.argv.includes("--strict");
console.log("");
console.log(
  strict
    ? `Enforcing: ${issues} language(s) not fresh → exit 1. To re-sync one, port the`
    : "Advisory only (no --strict) — exit 0 by design. Add --strict to enforce.",
);
console.log(
  "README.md change into README.<code>.md, translate it, and bump its",
  '"Last synced" date to the README.md change date.',
);
process.exitCode = strict && issues > 0 ? 1 : 0;
