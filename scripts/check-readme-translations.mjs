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

const readmeDate = readmeLastChangeDate();
const rows = [];

for (const [code, label] of LANGS) {
  const file = `README.${code}.md`;
  let status;
  let synced = "—";
  try {
    const text = readFileSync(join(ROOT, file), "utf8");
    const m = SYNCED_RE.exec(text);
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
        status =
          staleDays <= 0
            ? "fresh"
            : `stale by ${staleDays} day${staleDays === 1 ? "" : "s"}`;
      }
    }
  } catch {
    status = "FILE MISSING";
  }
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
process.exitCode = 0;
