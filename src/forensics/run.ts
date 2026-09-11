/**
 * `mjolnir forensics <dir-or-file>` — runtime evidence entry point (R4).
 *
 * Accepts either a single report file or a directory. In a directory it
 * looks for, in priority order:
 *   1. report.json / playwright-report.json — Playwright JSON report
 *   2. jest-report.json / vitest-report.json — Jest/Vitest JSON reports
 *   3. *.json (shape-sniffed: Playwright, Jest, Vitest)
 *   4. *.xml                                — JUnit XML reports
 *
 * Writes FLAKY.md next to the scan target unless --no-flaky-md.
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";

import { analyze, renderFlakyMd, renderLeaderboard } from "./analyze.js";
import { parseTraceArtifact } from "./trace.js";
import { looksLikeJestJson, parseJestJson } from "./parse-jest-json.js";
import { parseJunitXml } from "./parse-junit.js";
import { parsePlaywrightJson } from "./parse-playwright-json.js";
import { looksLikeVitestJson, parseVitestJson } from "./parse-vitest-json.js";
import type { ForensicsReport, TestRecord } from "./types.js";

const MAX_FILES = 500;

export interface ForensicsOptions {
  /** Set false to skip writing FLAKY.md. */
  writeFlakyMd?: boolean;
}

export function runForensics(
  target: string,
  options: ForensicsOptions = {},
): {
  report: ForensicsReport;
  output: string;
  flakyMdPath?: string | undefined;
} {
  const records: TestRecord[] = [];
  let source: ForensicsReport["source"] = "playwright-json";

  // Missing target is a "nothing recognized" case, not a crash — the CLI
  // layer maps totalTests === 0 to exit 2 with an honest message.
  const targetExists = existsSync(target);
  if (!targetExists) {
    const report = analyze(records, source);
    return {
      report,
      output: [renderLeaderboard(report), "", renderFlakyMdHint()].join("\n"),
    };
  }

  const stat = statSync(target);
  if (stat.isFile()) {
    // Bug-audit M3: directory mode wraps parseFile in a try/catch and
    // skips unreadable/corrupt files; the single-file path did not — a
    // corrupt report crashed with exit 20 instead of the honest exit 2.
    // Same containment here: corrupt → zero records.
    // R5 (WI-17): trace artifacts (.zip with trace.trace, or raw
    // .trace/.ndjson) are BINARY/NDJSON — read as bytes and ingested
    // through the bounded trace parser (hostile → throw → zero records).
    if (/\.(?:zip|trace|ndjson)$/i.test(target)) {
      try {
        const bytes = readFileSync(target);
        const record = parseTraceArtifact(bytes, traceArtifactName(target));
        if (record === undefined) {
          const report = analyze([], "playwright-trace");
          return {
            report,
            output: [
              renderLeaderboard(report),
              "",
              renderFlakyMdNotWritten(options),
            ].join("\n"),
          };
        }
        const report = analyze([record], "playwright-trace");
        return {
          report,
          output: [renderLeaderboard(report), "", renderFlakyMdHint()].join(
            "\n",
          ),
        };
      } catch {
        /* hostile trace → zero records → honest exit 2 upstream */
        const report = analyze([], "playwright-trace");
        return {
          report,
          output: [
            renderLeaderboard(report),
            "",
            renderFlakyMdNotWritten(options),
          ].join("\n"),
        };
      }
    }
    try {
      const text = readFileSync(target, "utf8");
      const parsed = parseFile(target, text);
      records.push(...parsed.records);
      source = parsed.source;
    } catch {
      /* unreadable or corrupt — zero records → honest exit 2 upstream */
    }
  } else {
    let count = 0;
    for (const full of listFiles(target)) {
      if (++count > MAX_FILES) break;
      try {
        // R5: trace artifacts ride the byte path (see the single-file arm).
        if (/\.(?:zip|trace|ndjson)$/i.test(full)) {
          const bytes = readFileSync(full);
          const record = parseTraceArtifact(bytes, traceArtifactName(full));
          if (record === undefined) continue;
          if (records.length === 0) source = "playwright-trace";
          records.push(record);
          continue;
        }
        const text = readFileSync(full, "utf8");
        const parsed = parseFile(full, text);
        if (parsed.records.length === 0) continue;
        // First recognized file decides the source label.
        if (records.length === 0) source = parsed.source;
        records.push(...parsed.records);
      } catch {
        /* unreadable — skip */
      }
    }
  }

  const report = analyze(records, source);

  let flakyMdPath: string | undefined;
  if ((options.writeFlakyMd ?? true) && report.totalTests > 0) {
    // Bug-audit M2: for a single report FILE the old code joined the file
    // path with "FLAKY.md" → `<file>/FLAKY.md` is not writable — yet the
    // output still claimed "Full details in FLAKY.md". Write next to the
    // file target, and only claim the artifact when it exists.
    const base = stat.isFile() ? dirname(target) : target;
    flakyMdPath = join(base, "FLAKY.md");
    try {
      writeFileSync(flakyMdPath, renderFlakyMd(report));
    } catch {
      flakyMdPath = undefined;
    }
  }

  const output = [
    renderLeaderboard(report),
    "",
    flakyMdPath !== undefined
      ? renderFlakyMdHint()
      : renderFlakyMdNotWritten(options),
  ].join("\n");

  return { report, output, flakyMdPath };
}

function renderFlakyMdHint(): string {
  return "Full details in FLAKY.md (committed artifact).";
}

/** Honest fallback for every case where FLAKY.md was NOT written (M2). */
function renderFlakyMdNotWritten(options: ForensicsOptions): string {
  if (options.writeFlakyMd === false) {
    return "FLAKY.md not written (--no-flaky-md).";
  }
  return "FLAKY.md was not written — nothing recognized to report (or the target directory is not writable).";
}

/**
 * R5: the trace artifact's test identity. The per-test trace convention
 * parks each trace at `test-results/<sanitized-test-title>/trace.zip` —
 * the parent directory carries the test identity (sanitized, lossy but
 * honest); a bare `.trace`/`.ndjson` file falls back to its own name.
 */
function traceArtifactName(fullPath: string): string {
  const dir = dirname(fullPath);
  const base = dir.split(/[\\/]/).pop() ?? "";
  if (base === "test-results" || base === "" || base === ".") {
    return fullPath.split(/[\\/]/).pop() ?? "unknown";
  }
  return base;
}

function parseFile(
  path: string,
  text: string,
): { records: TestRecord[]; source: ForensicsReport["source"] } {
  if (
    /\.xml$/i.test(path) ||
    /^\s*<\?xml|<testsuite\b/i.test(text.slice(0, 200))
  ) {
    return { records: parseJunitXml(text), source: "junit-xml" };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { records: [], source: "playwright-json" };
  }
  // P4 (plan 1788853205786): Jest/Vitest JSON reports. Discovery order
  // matters — Jest and Vitest share the top-level `testResults` key —
  // so the sniffers run BEFORE the Playwright parser would otherwise
  // misread them (Playwright's walk finds no suites and returns zero
  // records, silently dropping the report).
  if (looksLikeJestJson(json)) {
    return { records: parseJestJson(json), source: "jest-json" };
  }
  if (looksLikeVitestJson(json)) {
    return { records: parseVitestJson(json), source: "vitest-json" };
  }
  // parsePlaywrightJson is total over arbitrary JSON (Bug-audit M3's
  // Array.isArray guards) — no catch arm here, or coverage would pin a
  // dead branch and the reader would assume a throw that cannot happen.
  return { records: parsePlaywrightJson(json), source: "playwright-json" };
}

function listFiles(dir: string): string[] {
  // A missing directory is handled by the readdirSync catch below — the
  // walk degrades to an empty listing instead of crashing.
  const out: string[] = [];
  const walk = (d: string, depth: number): void => {
    if (depth > 4 || out.length > MAX_FILES) return;
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) {
        if (["node_modules", ".git"].includes(e.name)) continue;
        walk(full, depth + 1);
      } else if (
        e.isFile() &&
        /\.(?:json|xml|zip|trace|ndjson)$/i.test(e.name)
      ) {
        out.push(full);
      }
    }
  };
  walk(dir, 0);
  return out.map((p) => p);
}
