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
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractSections,
  translationStatus,
} from "./lib/readme-translation-status.mjs";

const ROOT = join(import.meta.dirname, "..");

/** The 22 translations + their switcher labels (English excluded). */
const LANGS = [
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
];

const SYNCED_RE = /Last synced:\s*(\d{4})-(\d{2})-(\d{2})/;
const SOURCE_HASH_RE = /<!--\s*Source hash:\s*([a-f0-9]+)\s*-->/;

/** Last calendar date (YYYY-MM-DD) a commit touched README.md, or null. */
function readmeLastChangeDate() {
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", "README.md"],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null; // not a git checkout (e.g. npm-packed tarball) — advisory only
  }
}

/**
 * Content hash of the English README's translatable sections.
 * Strips badges, shields, and HTML blocks so that CI-specific
 * changes (badge URLs, version bumps) don't flag translations
 * as stale when the actual prose is unchanged.
 */
function computeSourceHash() {
  try {
    const text = readFileSync(join(ROOT, "README.md"), "utf8");
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
    const m = SYNCED_RE.exec(text);
    const hm = SOURCE_HASH_RE.exec(text);
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
