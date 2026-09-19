/**
 * `qa-doctor forensics <dir-or-file>` — runtime evidence entry point (R4).
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
import { looksLikeHarJson, parseHarJsonDetailed } from "./parse-har.js";
import type { ForensicsReport, TestRecord } from "./types.js";

const MAX_FILES = 500;
const MAX_REPORT_FILE_BYTES = 1 * 1024 * 1024; // 1MB per file — structured data
const MAX_CUMULATIVE_BYTES = 50 * 1024 * 1024; // 50MB total across directory walk

export interface ForensicsOptions {
  /** Set false to skip writing FLAKY.md. */
  writeFlakyMd?: boolean;
}

/**
 * Run forensics analysis on test result artifacts.
 *
 * Parses test result files (Playwright JSON, JUnit XML, HAR, etc.),
 * analyzes them for flakiness, determinism, and trust signals, and
 * returns a structured report plus rendered output strings.
 *
 * @param target - path to the test result artifact or directory
 * @param options - writeFlakyMd (default true) controls FLAKY.md output
 */
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
  let skippedReports = 0;
  const incompleteReasons: string[] = [];

  // Missing target is a "nothing recognized" case, not a crash — the CLI
  // layer maps totalTests === 0 to exit 2 with an honest message.
  const targetExists = existsSync(target);
  if (!targetExists) {
    const report = analyze(records, source);
    return {
      report,
      output: [
        renderLeaderboard(report),
        "",
        renderFlakyMdNotWritten(options),
      ].join("\n"),
    };
  }

  const stat = statSync(target);
  if (stat.isFile()) {
    // Size guard: a multi-GB report file would exhaust memory on JSON.parse.
    // 1MB is generous for structured test output; larger files are skipped.
    if (stat.size > MAX_REPORT_FILE_BYTES) {
      skippedReports = 1;
      incompleteReasons.push("size-limit");
      const report = analyze([], source);
      report.analysisComplete = false;
      report.skippedReports = skippedReports;
      report.incompleteReasons = incompleteReasons;
      return {
        report,
        output: [
          renderLeaderboard(report),
          "",
          renderFlakyMdNotWritten(options),
        ].join("\n"),
      };
    }
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
        records.push(record);
        source = "playwright-trace";
      } catch {
        /* hostile trace → mark partial and return honest empty report */
        const report = analyze([], "playwright-trace");
        report.analysisComplete = false;
        report.skippedReports = 1;
        report.incompleteReasons = ["parse-failure"];
        return {
          report,
          output: [
            renderLeaderboard(report),
            "",
            renderFlakyMdNotWritten(options),
          ].join("\n"),
        };
      }
    } else {
      try {
        const text = readFileSync(target, "utf8");
        const parsed = parseFile(target, text);
        records.push(...parsed.records);
        source = parsed.source;
        if (parsed.parseFailed) {
          skippedReports = 1;
          incompleteReasons.push("parse-failure");
        }
        if (
          parsed.truncated &&
          !incompleteReasons.includes("entry-count-limit")
        ) {
          incompleteReasons.push("entry-count-limit");
        }
      } catch {
        /* unreadable or corrupt — zero records → honest exit 2 upstream */
        skippedReports = 1;
        incompleteReasons.push("parse-failure");
      }
    }
  } else {
    let count = 0;
    let cumulativeBytes = 0;
    let hitFileLimit = false;
    let hitCumulativeLimit = false;
    const allFiles = listFiles(target);
    for (const full of allFiles) {
      if (++count > MAX_FILES) {
        hitFileLimit = true;
        break;
      }
      try {
        const fileStat = statSync(full);
        if (fileStat.size > MAX_REPORT_FILE_BYTES) {
          skippedReports++;
          if (!incompleteReasons.includes("size-limit")) {
            incompleteReasons.push("size-limit");
          }
          continue;
        }
        cumulativeBytes += fileStat.size;
        if (cumulativeBytes > MAX_CUMULATIVE_BYTES) {
          hitCumulativeLimit = true;
          if (!incompleteReasons.includes("cumulative-size-limit")) {
            incompleteReasons.push("cumulative-size-limit");
          }
          break;
        }
        // R5: trace artifacts ride the byte path (see the single-file arm).
        if (/\.(?:zip|trace|ndjson)$/i.test(full)) {
          const bytes = readFileSync(full);
          const record = parseTraceArtifact(bytes, traceArtifactName(full));
          if (record === undefined) continue;
          if (records.length === 0 || source === "har")
            source = "playwright-trace";
          records.push(record);
          continue;
        }
        const text = readFileSync(full, "utf8");
        const parsed = parseFile(full, text);
        if (parsed.parseFailed) {
          skippedReports++;
          if (!incompleteReasons.includes("parse-failure")) {
            incompleteReasons.push("parse-failure");
          }
        }
        if (
          parsed.truncated &&
          !incompleteReasons.includes("entry-count-limit")
        ) {
          incompleteReasons.push("entry-count-limit");
        }
        if (parsed.records.length === 0) continue;
        if (
          records.length === 0 ||
          (source === "har" && parsed.source !== "har")
        )
          source = parsed.source;
        records.push(...parsed.records);
      } catch {
        /* unreadable — skip */
        skippedReports++;
        if (!incompleteReasons.includes("parse-failure")) {
          incompleteReasons.push("parse-failure");
        }
      }
    }
    // Limit flags are set at the break site, so they are finalized here —
    // not inside the loop, where the `break` would skip the handling.
    // The reason may already be present (pushed at the break), so the
    // increment is unconditional on the flag.
    if (hitFileLimit) {
      if (!incompleteReasons.includes("file-count-limit")) {
        incompleteReasons.push("file-count-limit");
      }
      skippedReports += allFiles.length - count + 1;
    }
    if (hitCumulativeLimit) {
      if (!incompleteReasons.includes("cumulative-size-limit")) {
        incompleteReasons.push("cumulative-size-limit");
      }
      skippedReports += allFiles.length - count + 1;
    }
  }

  const report = analyze(records, source);
  if (skippedReports > 0 || incompleteReasons.length > 0) {
    report.analysisComplete = false;
    report.skippedReports = skippedReports;
    report.incompleteReasons = [
      ...new Set([...report.incompleteReasons, ...incompleteReasons]),
    ];
  }

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
      : report.totalTests === 0 &&
          (report.totalNetworkObservations ?? 0) > 0 &&
          options.writeFlakyMd !== false
        ? "FLAKY.md was not written — network observations do not establish test outcomes."
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
): {
  records: TestRecord[];
  source: ForensicsReport["source"];
  parseFailed?: boolean;
  truncated?: boolean;
} {
  if (
    /\.xml$/i.test(path) ||
    /^\s*<\?xml|<testsuite\b/i.test(text.slice(0, 200))
  ) {
    return { records: parseJunitXml(text), source: "junit-xml" };
  }
  let json: unknown;
  const isHarFile = /\.har$/i.test(path);
  try {
    json = JSON.parse(text);
  } catch {
    return {
      records: [],
      source: isHarFile ? "har" : "playwright-json",
      parseFailed: true,
    };
  }
  // P4 (plan 1788853205786): Jest/Vitest JSON reports. Discovery order
  // matters — Jest and Vitest share the top-level `testResults` key —
  // so the sniffers run BEFORE the Playwright parser would otherwise
  // misread them (Playwright's walk finds no suites and returns zero
  // records, silently dropping the report).
  // WAVE 5 (GAP-RUNTIME-004): HAR network evidence rides the JSON path —
  // its shape ({log:{entries}}) cannot collide with the test-result
  // shapes (testResults/suites), so the discriminator order is stable.
  if (looksLikeHarJson(json)) {
    const parsed = parseHarJsonDetailed(json);
    return {
      records: parsed.records,
      source: "har",
      truncated: parsed.truncated,
    };
  }
  if (
    isHarFile ||
    (json !== null &&
      typeof json === "object" &&
      ["suites", "specs", "testResults"].some(
        (key) =>
          key in json && !Array.isArray((json as Record<string, unknown>)[key]),
      ))
  ) {
    return {
      records: [],
      source: isHarFile ? "har" : "playwright-json",
      parseFailed: true,
    };
  }
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
        /\.(?:json|xml|zip|trace|ndjson|har)$/i.test(e.name)
      ) {
        out.push(full);
      }
    }
  };
  walk(dir, 0);
  return out.map((p) => p);
}
