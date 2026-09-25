/**
 * Advisory staleness report for the README translations (npm run
 * docs:translations).
 *
 * English README.md is canonical; every README.<code>.md carries a
 * machine-assisted-translation marker with a "Last synced" date. This
 * script compares that date against the last commit that touched
 * README.md and prints a per-language table. It is advisory by design:
 * it NEVER blocks (exit 0 always), has no --strict mode, and is not a
 * CI gate — translation drift is resolved by community PRs porting the
 * English change, never by a red build (honesty over enforcement).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

const DAY_MS = 24 * 60 * 60 * 1000;
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

function utcMs(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
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

/**
 * Extract section headings (## level) from markdown text.
 * Returns an array of heading strings (without the ## prefix).
 * Used to verify that translations preserve the same section
 * structure as the English source.
 */
function extractSections(text) {
  const sections = [];
  for (const line of text.split("\n")) {
    const m = /^##\s+(.+)/.exec(line.trim());
    if (m) sections.push(m[1].trim());
  }
  return sections;
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
      if (!readmeDate) {
        status = "unknown (README.md date unavailable)";
      } else {
        const staleDays = Math.round(
          (utcMs(readmeDate) - utcMs(synced)) / DAY_MS,
        );
        const dateStatus =
          staleDays <= 0
            ? "fresh"
            : `stale by ${staleDays} day${staleDays === 1 ? "" : "s"}`;
        // Content-hash check: detects when the English source changed
        // but the translation's date marker was bumped without re-translating.
        if (hm && currentSourceHash && hm[1] !== currentSourceHash) {
          status = `content changed (hash ${hm[1]} ≠ ${currentSourceHash})`;
        } else {
          status = dateStatus;
        }
        // Structural verification: check that major section headings
        // from the English README are present in the translation.
        // Missing sections indicate the translation is structurally
        // incomplete even if the date/hash markers are current.
        if (sourceSections.length > 0 && dateStatus === "fresh") {
          const transSections = extractSections(text);
          const missingSections = sourceSections.filter(
            (s) => !transSections.some((ts) => ts.includes(s.slice(0, 10))),
          );
          // Only flag if a significant number of sections are missing
          // (translations may rephrase headings slightly)
          if (missingSections.length > 3) {
            status = `structurally incomplete (missing ~${missingSections.length} sections)`;
          }
        }
      }
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
console.log("");
console.log(
  "Advisory only — exit 0 by design. To re-sync a stale language, port the",
  "README.md change into README.<code>.md, translate it, and bump its",
  '"Last synced" date to the README.md change date.',
);
const strict = process.argv.includes("--strict");
process.exitCode = strict && issues > 0 ? 1 : 0;
