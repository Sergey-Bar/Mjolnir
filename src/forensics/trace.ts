/**
 * Playwright trace ingester (product-gap master plan §9 R5 / WI-17).
 *
 * Deterministic, offline, bounded, version-aware: ingests a Playwright
 * per-test trace — the `trace.trace` NDJSON stream inside `trace.zip`, or
 * a raw `.trace`/`.ndjson` stream — into Evidence-Core-compatible test
 * records. One record per trace artifact (the per-test trace convention:
 * Playwright writes one trace.zip per test under test-results/).
 *
 * Hostility contract (the false-green invariant): a corrupt, truncated,
 * enormous, or unsupported-version trace THROWS — the caller's
 * containment (run.ts) turns that into zero records and the CLI maps
 * totalTests === 0 to exit 2. A hostile trace can never read as a green
 * empty suite.
 *
 * Bounds (the parser refuses, never streams unbounded):
 *  - at most MAX_TRACE_LINES NDJSON events,
 *  - at most MAX_LINE_BYTES per event line,
 *  - at most MAX_DECOMPRESSED_BYTES total decompressed output (zip-bomb
 *    guard), at most MAX_ZIP_ENTRIES zip members inspected,
 *  - the zip reader inflates only the `trace.trace` member, raw-deflate
 *    via node:zlib — no third-party archive dependency.
 *
 * Version awareness: a `{type:"version", version:N}` event with N outside
 * the supported set (1) aborts with an explicit unsupported-version
 * error. Unknown event types are skipped — the parser extracts only the
 * facts it understands (action start/end pairs, errors), never invents
 * records for shapes it does not know.
 */

import { inflateRawSync } from "node:zlib";
import type { Attempt, TestRecord } from "./types.js";

export const LIMITS = {
  maxTraceLines: 50_000,
  maxLineBytes: 1_000_000,
  maxDecompressedBytes: 64_000_000,
  maxZipEntries: 200,
} as const;

/** The only trace-stream major format this parser understands (v1). */
const SUPPORTED_TRACE_VERSION = 1;

export class TraceParseError extends Error {
  readonly kind: "corrupt" | "truncated" | "unsupported-version" | "unbounded";
  constructor(kind: TraceParseError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

interface TraceAction {
  apiName?: string;
  error?: { message?: string };
  durationMs: number;
}

interface ParsedTraceStream {
  actions: TraceAction[];
  sawVersionMarker: boolean;
}

/**
 * Parses the NDJSON event stream into action facts. Throws
 * TraceParseError on corrupt lines, oversized lines, unbounded input, or
 * an unsupported version marker.
 */
export function parseTraceNdjson(text: string): ParsedTraceStream {
  const lines = text.split("\n");
  if (lines.length > LIMITS.maxTraceLines) {
    throw new TraceParseError(
      "unbounded",
      `trace stream has ${lines.length} events (limit ${LIMITS.maxTraceLines})`,
    );
  }
  let decompressed = 0;
  const actions = new Map<string, TraceAction>();
  const order: string[] = [];
  let sawVersionMarker = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.length === 0) continue;
    decompressed += line.length;
    if (decompressed > LIMITS.maxDecompressedBytes) {
      throw new TraceParseError(
        "unbounded",
        `trace stream exceeds ${LIMITS.maxDecompressedBytes} decompressed bytes`,
      );
    }
    if (line.length > LIMITS.maxLineBytes) {
      throw new TraceParseError(
        "corrupt",
        `event line exceeds ${LIMITS.maxLineBytes} bytes`,
      );
    }
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      // A truncated stream ends mid-line; a corrupt stream garbles
      // anywhere. Both are the same honest rejection — the caller
      // distinguishes via the error kind upstream.
      throw new TraceParseError(
        text.endsWith(line) && lines.indexOf(raw) === lines.length - 1
          ? "truncated"
          : "corrupt",
        "event line is not valid JSON",
      );
    }
    if (event === null || typeof event !== "object") continue;
    const ev = event as {
      type?: unknown;
      version?: unknown;
      callId?: unknown;
      apiName?: unknown;
      error?: unknown;
      startTime?: unknown;
      endTime?: unknown;
    };
    if (ev.type === "version") {
      sawVersionMarker = true;
      if (
        typeof ev.version !== "number" ||
        ev.version !== SUPPORTED_TRACE_VERSION
      ) {
        throw new TraceParseError(
          "unsupported-version",
          `trace format version ${String(ev.version)} not supported (supported: ${SUPPORTED_TRACE_VERSION})`,
        );
      }
      continue;
    }
    if (ev.type !== "before" && ev.type !== "after") continue;
    if (typeof ev.callId !== "string") continue;
    const existing = actions.get(ev.callId);
    if (ev.type === "before") {
      if (existing === undefined) {
        const apiName = typeof ev.apiName === "string" ? ev.apiName : undefined;
        actions.set(ev.callId, {
          ...(apiName !== undefined ? { apiName } : {}),
          durationMs: 0,
        });
        order.push(ev.callId);
      }
      continue;
    }
    // after: close the action.
    const action = existing ?? { durationMs: 0 };
    const start = typeof ev.startTime === "number" ? ev.startTime : undefined;
    const end = typeof ev.endTime === "number" ? ev.endTime : undefined;
    if (start !== undefined && end !== undefined && end >= start) {
      action.durationMs = Math.round((end - start) * 1000);
    }
    if (
      ev.error !== null &&
      typeof ev.error === "object" &&
      ev.error !== undefined
    ) {
      const msg = (ev.error as { message?: unknown }).message;
      action.error =
        typeof msg === "string"
          ? { message: msg }
          : { message: "action failed" };
    }
    actions.set(ev.callId, action);
  }

  return {
    actions: order
      .map((id) => actions.get(id))
      .filter((a): a is TraceAction => a !== undefined),
    sawVersionMarker,
  };
}

/** Converts action facts into one Evidence-Core-compatible record. */
export function traceActionsToRecord(
  actions: TraceAction[],
  artifact: string,
): TestRecord | undefined {
  if (actions.length === 0) return undefined;
  let failed = false;
  let timedOut = false;
  let totalMs = 0;
  const errors: string[] = [];
  for (const a of actions) {
    totalMs += a.durationMs;
    if (a.error !== undefined) {
      failed = true;
      const msg = a.error.message ?? "action failed";
      errors.push(msg);
      // Playwright's timeout errors read "Test timeout of Xms exceeded."
      // (and some surfaces write "timed out") — both mark timedOut.
      if (/timed\s*out|timeout\s+of/i.test(msg)) timedOut = true;
    }
  }
  const status: Attempt["status"] = timedOut
    ? "timedOut"
    : failed
      ? "failed"
      : "passed";
  return {
    file: artifact,
    title: actions[0]?.apiName ?? "(trace)",
    attempts: [{ index: 1, status, durationMs: totalMs }],
    ...(errors.length > 0 ? { errors } : {}),
  };
}

// ── ZIP reader (bounded, offline, node:zlib only) ────────────────────

/**
 * Extracts one member's bytes from a ZIP archive. Bounded: at most
 * LIMITS.maxZipEntries central-directory entries are inspected, and the
 * inflated output is capped (a zip bomb cannot stream past the cap —
 * inflateRawSync is given the member's compressed size as the ceiling
 * window and the result length is checked).
 */
export function extractZipMember(
  zip: Buffer,
  memberName: string,
): Buffer | undefined {
  // End-of-central-directory: scan the last 64 KiB for the PK\x05\x06
  // signature (the comment may follow it).
  const eocdScanStart = Math.max(0, zip.length - 65_536);
  let eocd = -1;
  for (let i = zip.length - 22; i >= eocdScanStart; i--) {
    if (
      zip[i] === 0x50 &&
      zip[i + 1] === 0x4b &&
      zip[i + 2] === 0x05 &&
      zip[i + 3] === 0x06
    ) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) {
    throw new TraceParseError("corrupt", "not a ZIP archive (no EOCD)");
  }
  const entryCount = zip.readUInt16LE(eocd + 10);
  if (entryCount > LIMITS.maxZipEntries) {
    throw new TraceParseError(
      "unbounded",
      `zip has ${entryCount} entries (limit ${LIMITS.maxZipEntries})`,
    );
  }
  const cdOffset = zip.readUInt32LE(eocd + 16);
  let ptr = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (
      zip[ptr] !== 0x50 ||
      zip[ptr + 1] === undefined ||
      zip[ptr + 1] !== 0x4b ||
      zip[ptr + 2] !== 0x01 ||
      zip[ptr + 3] !== 0x02
    ) {
      throw new TraceParseError(
        "corrupt",
        "central directory signature mismatch",
      );
    }
    const method = zip.readUInt16LE(ptr + 10);
    const compressedSize = zip.readUInt32LE(ptr + 20);
    const nameLen = zip.readUInt16LE(ptr + 28);
    const extraLen = zip.readUInt16LE(ptr + 30);
    const commentLen = zip.readUInt16LE(ptr + 32);
    const localOffset = zip.readUInt32LE(ptr + 42);
    const name = zip.slice(ptr + 46, ptr + 46 + nameLen).toString("utf8");
    ptr += 46 + nameLen + extraLen + commentLen;
    if (name !== memberName) continue;
    // Local file header: skip its own name/extra (sizes may differ from
    // the central directory when data descriptors are used).
    if (
      zip[localOffset] !== 0x50 ||
      zip[localOffset + 1] !== 0x4b ||
      zip[localOffset + 2] !== 0x03 ||
      zip[localOffset + 3] !== 0x04
    ) {
      throw new TraceParseError("corrupt", "local header signature mismatch");
    }
    const lNameLen = zip.readUInt16LE(localOffset + 26);
    const lExtraLen = zip.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = zip.slice(dataStart, dataStart + compressedSize);
    if (method === 0) return Buffer.from(raw);
    if (method === 8) {
      const out = inflateRawSync(raw, {
        // Zip-bomb guard: refuse to inflate beyond the cap.
        maxOutputLength: LIMITS.maxDecompressedBytes,
      });
      if (out.length > LIMITS.maxDecompressedBytes) {
        throw new TraceParseError(
          "unbounded",
          `member inflates beyond ${LIMITS.maxDecompressedBytes} bytes`,
        );
      }
      return out;
    }
    throw new TraceParseError(
      "corrupt",
      `unsupported zip compression method ${method}`,
    );
  }
  return undefined;
}

/**
 * Full ingest: a trace artifact's BYTES (zip or raw NDJSON) → one test
 * record, or undefined when the stream carries no recognizable actions
 * (the caller treats undefined as "nothing recognized" — never a clean
 * bill).
 */
export function parseTraceArtifact(
  bytes: Buffer,
  artifactName: string,
): TestRecord | undefined {
  const isZip =
    bytes.length > 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);
  let text: string;
  if (isZip) {
    const member = extractZipMember(bytes, "trace.trace");
    if (member === undefined) {
      throw new TraceParseError(
        "corrupt",
        "trace.zip does not contain trace.trace",
      );
    }
    text = member.toString("utf8");
  } else {
    text = bytes.toString("utf8");
  }
  const { actions } = parseTraceNdjson(text);
  return traceActionsToRecord(actions, artifactName);
}
