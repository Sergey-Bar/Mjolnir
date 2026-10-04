/**
 * Visual Studio TRX ingestion — what `dotnet test` writes.
 *
 * TRX is the .NET equivalent of JUnit XML, and .NET is one of the two
 * ecosystems that could not reach L3 before this existed: `EVIDENCE_CONVENTIONS`
 * recognised no TRX artifact, so a C# or F# run left every finding at `INFERRED`
 * no matter how carefully the rule was written. The rule was not the problem.
 * The evidence was unreadable.
 *
 * Deliberately dependency-free, and a bounded tag-targeted scanner rather than a
 * general XML parser — the same discipline as `parse-junit.ts`. It reads only
 * `<UnitTestResult>` and `<UnitTest>`, which is everything the format promises.
 *
 * TWO THINGS THIS DELIBERATELY DOES NOT INFER
 *
 * **File paths.** TRX carries `className` as a DOTTED CLR type name
 * (`MyNs.MyTests.MyTestClass`), never a source path. `TestRecord.file` is
 * therefore `"unknown"`, exactly as it is for JUnit — a dotted type name is not
 * a path, and mapping one onto the other would invent a source location no run
 * ever reported. That is why test-level runtime corroboration (which matches a
 * finding's line to a test's declaration span) stays unavailable for .NET; see
 * `TestRecord.line`. Honest degradation, and it is stated rather than papered
 * over with a guessed path.
 *
 * **Per-attempt history.** A TRX `UnitTestResult` has ONE outcome. Retries live
 * in `<Execution>` entries under the test definition, keyed by an id the result
 * references, but that is a cross-reference table rather than an ordered
 * attempt log. So each record carries exactly one attempt and TRUE-FLAKE can
 * never fire from this source — the same honest limitation JUnit XML has. The
 * alternative, synthesizing a retry from two definitions with the same name,
 * would invent evidence.
 */

import type { Attempt, RunStatus, TestRecord } from "./types.js";
import { sanitizeErrorText } from "./evidence-hygiene.js";

const MAX_INPUT = 20 * 1024 * 1024; // 20 MB safety bound, same as JUnit

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
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // eslint-disable-next-line security/detect-non-literal-regexp -- name is regex-escape-quoted one line above -- no unescaped metacharacters reach the RegExp
  const m = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  if (m?.[1] !== undefined) return decodeEntities(m[1]);
  // TRX writes some attributes single-quoted in hand-edited and
  // older-producer files. Accepting only double quotes would drop the whole
  // run rather than one attribute.
  // eslint-disable-next-line security/detect-non-literal-regexp -- name is regex-escape-quoted above
  const sq = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*'([^']*)'`, "i").exec(tag);
  if (sq?.[1] !== undefined) return decodeEntities(sq[1]);
  return undefined;
}

/**
 * Does this document look like TRX at all?
 *
 * Shape-sniffed rather than trusted from its location, for the same reason the
 * JUnit path sniffs: a `TestResults/` directory is a convention, and a
 * convention can be wrong. A file that is not a `TestRun` must not be parsed as
 * one and produce confident nonsense.
 */
export function looksLikeTrxXml(text: string): boolean {
  return /<TestRun[\s>]/i.test(text.slice(0, 4096));
}

/**
 * TRX durations are `HH:MM:SS.fffffff`; absent or `-` means "not timed".
 *
 * Parsed by splitting rather than by one pattern. A single regex for this has
 * to be `^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$`, and the nested quantifiers there
 * are what `security/detect-unsafe-regex` flags — correctly in general, since
 * this shape is the usual ReDoS source. Splitting removes the question rather
 * than asserting the pattern is safe today.
 */
function parseDuration(raw: string | undefined): number {
  if (raw === undefined) return 0;
  const text = raw.trim();
  const dot = text.indexOf(".");
  const clock = dot === -1 ? text : text.slice(0, dot);
  const fraction = dot === -1 ? "" : text.slice(dot + 1);

  const parts = clock.split(":");
  if (parts.length !== 3) return 0;
  const [h, m, s] = parts;
  if (h === undefined || m === undefined || s === undefined) return 0;
  if (!/^\d+$/.test(h) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(s))
    return 0;

  // TRX writes seven fractional digits. Only the first three can change a
  // millisecond, and the remainder are truncated rather than rounded — rounding
  // would make two adjacent durations collide, and flake ordering is decided on
  // exact ordering.
  const millis =
    fraction.length === 0 ? 0 : Number(fraction.slice(0, 3).padEnd(3, "0"));
  return Number(h) * 3_600_000 + Number(m) * 60_000 + Number(s) * 1000 + millis;
}

/**
 * TRX `outcome` to a run status.
 *
 * The mapping is stated rather than inferred from a default, because the
 * dangerous direction here is a silent default: an outcome this engine has
 * never seen must not read as `passed`. Every unrecognised value maps to
 * `skipped`, which is the non-claiming direction — a skipped test contributes
 * nothing to "the suite passed" — rather than to a status that would let it.
 *
 * TRX also has outcomes that are not verdicts at all (`Warning`, `Pending`,
 * `Expired`). They are treated the same way, deliberately.
 */
export function mapTrxOutcome(outcome: string | undefined): RunStatus {
  switch ((outcome ?? "").toLowerCase()) {
    case "passed":
    case "completed":
      return "passed";
    case "failed":
    case "error":
      return "failed";
    case "timeout":
      return "timedOut";
    case "aborted":
    case "interrupted":
      return "interrupted";
    case "notexecuted":
    case "skipped":
    case "inconclusive":
    case "notrunnable":
    case "pending":
      return "skipped";
    default:
      return "skipped";
  }
}

function tagOf(xml: string, name: string): string[] {
  const out: string[] = [];
  // eslint-disable-next-line security/detect-non-literal-regexp -- internal literal tag names only
  const re = new RegExp(`<${name}\\b[^>]*>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (m[0] !== undefined) out.push(m[0]);
    if (out.length > 200_000) break; // hard bound on matches
  }
  return out;
}

/** The text of a `<Message>` child, used as the failure's error text. */
function messageOf(text: string, near: number): string | undefined {
  const window = text.slice(near, near + 2000);
  const m = /<Message[^>]*>([\s\S]{0,1500}?)<\/Message>/i.exec(window);
  if (m?.[1] === undefined) return undefined;
  const cleaned = sanitizeErrorText(
    decodeEntities(m[1].replace(/<[^>]*>/g, " ")).trim(),
  );
  return cleaned.length === 0 ? undefined : cleaned;
}

/**
 * Parse a TRX document into test records.
 *
 * Returns an empty array for a document that is not TRX rather than throwing:
 * discovery sniffs before parsing, and a caller that hands us a non-TRX file
 * should get "no evidence here", not an exception that aborts a whole run
 * report.
 */
export function parseTrxXml(xml: string): TestRecord[] {
  if (xml.length > MAX_INPUT) return [];
  if (!looksLikeTrxXml(xml)) return [];

  const byTestId = new Map<string, string>(); // testId -> display name
  for (const tag of tagOf(xml, "UnitTest")) {
    const id = attr(tag, "id");
    const name = attr(tag, "name");
    if (id !== undefined && name !== undefined) byTestId.set(id, name);
  }

  const records: TestRecord[] = [];
  const resultRe =
    /<UnitTestResult\b([^>]*)>([\s\S]{0,4000}?)(?=<UnitTestResult\b|<\/Results>)/gi;
  let m: RegExpExecArray | null;
  while ((m = resultRe.exec(xml)) !== null) {
    const attrs = m[1] ?? "";
    const inner = m[2] ?? "";
    const testName = attr(attrs, "testName") ?? attr(attrs, "testId");
    if (testName === undefined) continue;
    const status = mapTrxOutcome(attr(attrs, "outcome"));
    const attempt: Attempt = {
      index: 1,
      status,
      durationMs: parseDuration(attr(attrs, "duration")),
    };
    const error = messageOf(inner, 0);
    records.push({
      file: "unknown",
      title: testName,
      attempts: [attempt],
      evidenceKind: "test",
      ...(error === undefined ? {} : { errors: [error] }),
    });
    if (records.length > 200_000) break;
  }
  return records;
}
