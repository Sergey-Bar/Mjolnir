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
  // Left boundary (bug-audit H3): a bare `name\s*=` search matches the
  // tail of `classname` — and pytest writes classname BEFORE name, so
  // every test's title silently became its classname. `(?:^|\s)` anchors
  // the attribute to a real attribute position (and also refuses
  // `data-name=` style lookalikes).
  // QA-2026-08-30: the name is escaped for regex metacharacters as
  // future-proofing — callers currently pass internal literals only.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // eslint-disable-next-line security/detect-non-literal-regexp -- name is regex-escape-quoted one line above — no unescaped metacharacters reach the RegExp
  const m = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  if (m?.[1] !== undefined) return decodeEntities(m[1]);
  // eslint-disable-next-line security/detect-non-literal-regexp -- name is regex-escape-quoted one line above — no unescaped metacharacters reach the RegExp
  const m2 = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*'([^']*)'`, "i").exec(tag);
  return m2?.[1] !== undefined ? decodeEntities(m2[1]) : undefined;
}

export function parseJunitXml(xml: string): TestRecord[] {
  if (xml.length > MAX_INPUT) return [];
  const out: TestRecord[] = [];

  // Iterate <testcase …> … </testcase> or self-closing <testcase …/>.
  // Bug-audit QA-2026-08-30 QA-11: the previous single-regex loop used a
  // lazy `[\s\S]*?<\/testcase>` inner scan; a flood of unclosed
  // `<testcase` starts (20 MB budget, no closer anywhere) made every
  // start rescan the rest of the input — quadratic, minutes of CPU for a
  // 20 MB hostile report. This scan is linear: each index advances past
  // the work it did, and the first unclosed `<testcase` terminates the
  // loop (no closer can exist for any later start either).
  const startRe = /<testcase\b/gi;
  const closeRe = /<\/testcase\s*>/gi;
  let start: RegExpExecArray | null;
  while ((start = startRe.exec(xml)) !== null) {
    const gt = xml.indexOf(">", start.index);
    if (gt === -1) break;
    let attrs = xml.slice(start.index + "<testcase".length, gt);
    let inner: string;
    if (attrs.endsWith("/")) {
      // Self-closing: `<testcase … />`.
      attrs = attrs.slice(0, -1);
      inner = "";
      startRe.lastIndex = gt + 1;
    } else {
      closeRe.lastIndex = gt + 1;
      const close = closeRe.exec(xml);
      if (close === null) break; // unclosed: no later start can close either
      inner = xml.slice(gt + 1, close.index);
      startRe.lastIndex = close.index + close[0].length;
    }
    const name = attr(attrs, "name") ?? "(unnamed)";
    const classname = attr(attrs, "classname") ?? "";
    const timeRaw = attr(attrs, "time");
    const timeSec =
      timeRaw !== undefined && Number.isFinite(Number(timeRaw))
        ? Number(timeRaw)
        : 0;

    const failed = /<(?:failure|error)\b/i.test(inner);
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
