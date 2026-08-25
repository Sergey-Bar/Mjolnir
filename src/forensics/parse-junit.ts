/**
 * JUnit XML ingestion — the lingua franca of CI runners (pytest --junitxml,
 * jest-junit, xUnit, Maven Surefire…).
 *
 * Deliberately dependency-free: a bounded, tag-targeted scanner over the
 * small subset of XML that JUnit reports actually use (<testsuite>,
 * <testcase>, <failure>, <error>, <skipped>). Not a general XML parser.
 *
 * Retry evidence is unavailable in classic JUnit XML (one testcase per
 * test), so each record has exactly one attempt — flake detection then
 * relies on cross-run aggregation by callers.
 */

import type { Attempt, TestRecord } from "./types.js";

const MAX_INPUT = 20 * 1024 * 1024; // 20 MB safety bound

function decodeEntities(s: string): string {
  return s
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  if (m?.[1] !== undefined) return decodeEntities(m[1]);
  const m2 = new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i").exec(tag);
  return m2?.[1] !== undefined ? decodeEntities(m2[1]) : undefined;
}

export function parseJunitXml(xml: string): TestRecord[] {
  if (xml.length > MAX_INPUT) return [];
  const out: TestRecord[] = [];

  // Iterate <testcase …> … </testcase> or self-closing <testcase …/>.
  const caseRe = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase\s*>)/gi;
  let m: RegExpExecArray | null;
  while ((m = caseRe.exec(xml)) !== null) {
    const attrs = m[1] ?? "";
    const inner = m[3] ?? "";
    const name = attr(attrs, "name") ?? "(unnamed)";
    const classname = attr(attrs, "classname") ?? "";
    const timeRaw = attr(attrs, "time");
    const timeSec =
      timeRaw !== undefined && Number.isFinite(Number(timeRaw))
        ? Number(timeRaw)
        : 0;

    const failed = /<(failure|error)\b/i.test(inner);
    const skipped = /<skipped\b/i.test(inner);

    const status = skipped ? "skipped" : failed ? "failed" : "passed";
    const attempt: Attempt = {
      index: 1,
      status,
      durationMs: Math.round(timeSec * 1000),
    };
    out.push({
      file: classname || "unknown",
      title: name,
      attempts: [attempt],
    });
  }
  return out;
}
