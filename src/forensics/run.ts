/**
 * `mjolnir forensics <dir-or-file>` — runtime evidence entry point (R4).
 *
 * Accepts either a single report file or a directory. In a directory it
 * looks for, in priority order:
 *   1. report.json / playwright-report.json — Playwright JSON report
 *   2. *.xml                                — JUnit XML reports
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
import { join } from "node:path";

import { analyze, renderFlakyMd, renderLeaderboard } from "./analyze.js";
import { parseJunitXml } from "./parse-junit.js";
import { parsePlaywrightJson } from "./parse-playwright-json.js";
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
    const text = readFileSync(target, "utf8");
    const parsed = parseFile(target, text);
    records.push(...parsed.records);
    source = parsed.source;
  } else {
    let count = 0;
    for (const full of listFiles(target)) {
      if (++count > MAX_FILES) break;
      try {
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
  const output = [renderLeaderboard(report), "", renderFlakyMdHint()].join(
    "\n",
  );

  let flakyMdPath: string | undefined;
  if ((options.writeFlakyMd ?? true) && report.totalTests > 0) {
    flakyMdPath = join(target, "FLAKY.md");
    try {
      writeFileSync(flakyMdPath, renderFlakyMd(report));
    } catch {
      flakyMdPath = undefined;
    }
  }

  return { report, output, flakyMdPath };
}

function renderFlakyMdHint(): string {
  return "Full details in FLAKY.md (committed artifact).";
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
  try {
    const json: unknown = JSON.parse(text);
    return { records: parsePlaywrightJson(json), source: "playwright-json" };
  } catch {
    return { records: [], source: "playwright-json" };
  }
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
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
      } else if (e.isFile() && /\.(json|xml)$/i.test(e.name)) {
        out.push(full);
      }
    }
  };
  walk(dir, 0);
  return out.map((p) => p);
}
