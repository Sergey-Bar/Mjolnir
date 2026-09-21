/**
 * trace.ts arms coverage — every hostile shape the bounded ingester
 * must classify honestly: NDJSON caps and malformed events, the ZIP
 * reader's corrupt/unbounded arms, compression methods, and the
 * action→record conversions. The happy paths run through
 * tests/false-green/trace.spec.ts.
 */

import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import {
  LIMITS,
  TraceParseError,
  extractZipMember,
  parseTraceArtifact,
  parseTraceNdjson,
  traceActionsToRecord,
} from "../../src/forensics/trace.js";

describe("parseTraceNdjson — bounded-input arms", () => {
  it("more lines than the event cap is unbounded", () => {
    const text = "\n".repeat(LIMITS.maxTraceLines + 1);
    expect(() => parseTraceNdjson(text)).toThrow(TraceParseError);
    expect(() => parseTraceNdjson(text)).toThrow(/events \(limit/);
  });

  it("a single line over the line-bytes cap is corrupt", () => {
    const line = "x".repeat(LIMITS.maxLineBytes + 1);
    expect(() => parseTraceNdjson(line)).toThrow(/event line exceeds/);
  });

  it("garbage JSON mid-stream is corrupt; garbage only in the last line is truncated", () => {
    expect(() =>
      parseTraceNdjson('{"type":"before","callId":"c1"}\n{{{\n{"ok":1}\n'),
    ).toThrow(/not valid JSON/);
    expect(() => parseTraceNdjson("corrupt line")).toThrow(TraceParseError);
  });

  it("non-object events (null, numbers, strings, arrays) are skipped honestly", () => {
    const text = [
      JSON.stringify({ type: "before", callId: "c1", startTime: 1 }),
      "null",
      "42",
      '"a string"',
      "[]",
      JSON.stringify({ type: "after", callId: "c1", startTime: 1, endTime: 2 }),
    ].join("\n");
    const { actions, sawVersionMarker } = parseTraceNdjson(text);
    expect(sawVersionMarker).toBe(false);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.durationMs).toBe(1000);
  });

  it("before/after events without a string callId are skipped", () => {
    const text = [
      JSON.stringify({ type: "before", callId: 7 }),
      JSON.stringify({ type: "after" }),
    ].join("\n");
    expect(parseTraceNdjson(text).actions).toHaveLength(0);
  });

  it("a version marker must be exactly the supported major", () => {
    expect(() =>
      parseTraceNdjson(JSON.stringify({ type: "version", version: 2 })),
    ).toThrow(/not supported/);
    expect(
      parseTraceNdjson(JSON.stringify({ type: "version", version: 1 }))
        .sawVersionMarker,
    ).toBe(true);
  });

  it("an after without a before is dropped from the ordered output; bad windows keep durationMs 0", () => {
    // The output is ordered by BEFORE events — a lone after contributes nothing.
    const orphan = parseTraceNdjson(
      JSON.stringify({ type: "after", callId: "x", startTime: 5, endTime: 9 }),
    );
    expect(orphan.actions).toHaveLength(0);
    // A before followed by windows that yield no duration keeps durationMs 0.
    const backwards = parseTraceNdjson(
      [
        JSON.stringify({ type: "before", callId: "x" }),
        JSON.stringify({
          type: "after",
          callId: "x",
          startTime: 9,
          endTime: 5,
        }),
      ].join("\n"),
    );
    expect(backwards.actions[0]?.durationMs).toBe(0);
    const nonNumeric = parseTraceNdjson(
      [
        JSON.stringify({ type: "before", callId: "x" }),
        JSON.stringify({
          type: "after",
          callId: "x",
          startTime: "a",
          endTime: "b",
        }),
      ].join("\n"),
    );
    expect(nonNumeric.actions[0]?.durationMs).toBe(0);
  });

  it("error objects carry their message, or the honest fallback", () => {
    const withMsg = parseTraceNdjson(
      [
        JSON.stringify({ type: "before", callId: "x" }),
        JSON.stringify({
          type: "after",
          callId: "x",
          error: { message: "boom" },
        }),
      ].join("\n"),
    );
    expect(withMsg.actions[0]?.error?.message).toBe("boom");
    const withoutMsg = parseTraceNdjson(
      [
        JSON.stringify({ type: "before", callId: "x" }),
        JSON.stringify({ type: "after", callId: "x", error: { code: 5 } }),
      ].join("\n"),
    );
    expect(withoutMsg.actions[0]?.error?.message).toBe("action failed");
  });
});

describe("traceActionsToRecord conversions", () => {
  it("an empty action list is undefined (nothing recognized, never a clean bill)", () => {
    expect(traceActionsToRecord([], "x.trace")).toBeUndefined();
  });

  it("timeout phrasing (both spellings) maps to timedOut with the errors attached", () => {
    const r = traceActionsToRecord(
      [
        {
          durationMs: 100,
          error: { message: "Test timeout of 30000ms exceeded." },
        },
        {
          durationMs: 50,
          error: { message: "locator.click: Timeout 5000ms exceeded." },
        },
      ],
      "x.trace",
    );
    expect(r?.attempts[0]?.status).toBe("timedOut");
    expect(r?.errors).toHaveLength(2);
    expect(r?.attempts[0]?.durationMs).toBe(150);
  });

  it("plain failures map to failed; clean runs to passed; the title falls back", () => {
    const failed = traceActionsToRecord(
      [{ durationMs: 10, error: { message: "boom" } }],
      "x.trace",
    );
    expect(failed?.attempts[0]?.status).toBe("failed");
    expect(failed?.title).toBe("(trace)");
    const named = traceActionsToRecord(
      [{ apiName: "page.goto", durationMs: 5 }],
      "x.trace",
    );
    expect(named?.title).toBe("page.goto");
    expect(named?.attempts[0]?.status).toBe("passed");
  });
});

/** Minimal ZIP builder with a selectable compression method. */
function zipWithMember(
  memberName: string,
  bytes: Buffer,
  method: 0 | 8 | 12,
): Buffer {
  const payload = method === 8 ? deflateRawSync(bytes) : bytes;
  const name = Buffer.from(memberName, "utf8");
  const crcTable = (() => {
    const t: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (const b of buf) {
      const entry = crcTable[(c ^ b) & 0xff] ?? 0;
      c = entry ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(crc32(bytes), 14);
  local.writeUInt32LE(payload.length, 18);
  local.writeUInt32LE(bytes.length, 22);
  local.writeUInt16LE(name.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(crc32(bytes), 16);
  central.writeUInt32LE(payload.length, 20);
  central.writeUInt32LE(bytes.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42); // local header offset

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 10); // entry count
  // Central directory sits after local header + name + payload:
  eocd.writeUInt32LE(30 + name.length + payload.length, 16);

  return Buffer.concat([local, name, payload, central, name, eocd]);
}

describe("extractZipMember — the bounded ZIP reader arms", () => {
  it("bytes without an EOCD signature are not a ZIP archive", () => {
    expect(() =>
      extractZipMember(Buffer.from("definitely not a zip"), "trace.trace"),
    ).toThrow(/no EOCD/);
  });

  it("an entry count over the cap is unbounded (hostile archive)", () => {
    const zip = zipWithMember("trace.trace", Buffer.from("x"), 0);
    // Rewrite the EOCD entry count to 201.
    const eocd = zip.length - 22;
    zip.writeUInt16LE(LIMITS.maxZipEntries + 1, eocd + 10);
    expect(() => extractZipMember(zip, "trace.trace")).toThrow(
      /entries \(limit/,
    );
  });

  it("a central-directory signature mismatch is corrupt", () => {
    const zip = zipWithMember("trace.trace", Buffer.from("x"), 0);
    const cdOffset = zip.readUInt32LE(zip.length - 22 + 16);
    zip.writeUInt32LE(0xdeadbeef, cdOffset);
    expect(() => extractZipMember(zip, "trace.trace")).toThrow(
      /central directory signature mismatch/,
    );
  });

  it("a local header signature mismatch is corrupt", () => {
    const zip = zipWithMember("trace.trace", Buffer.from("x"), 0);
    const cdOffset = zip.readUInt32LE(zip.length - 22 + 16);
    const localOffset = zip.readUInt32LE(cdOffset + 42);
    zip.writeUInt32LE(0xdeadbeef, localOffset);
    expect(() => extractZipMember(zip, "trace.trace")).toThrow(
      /local header signature mismatch/,
    );
  });

  it("method 8 inflates; an unknown method is corrupt; a missing member is undefined", () => {
    const deflated = zipWithMember(
      "trace.trace",
      Buffer.from('{"type":"version","version":1}\n', "utf8"),
      8,
    );
    expect(
      extractZipMember(deflated, "trace.trace")?.toString("utf8"),
    ).toContain('"version":1');

    const weird = zipWithMember("trace.trace", Buffer.from("x"), 12);
    expect(() => extractZipMember(weird, "trace.trace")).toThrow(
      /unsupported zip compression method 12/,
    );

    expect(
      extractZipMember(
        zipWithMember("other", Buffer.from("x"), 0),
        "trace.trace",
      ),
    ).toBeUndefined();
  });

  it("parseTraceArtifact: a zip without trace.trace throws; raw NDJSON flows through", () => {
    expect(() =>
      parseTraceArtifact(zipWithMember("other", Buffer.from("x"), 0), "x.zip"),
    ).toThrow(/does not contain trace\.trace/);
    const raw = Buffer.from(
      JSON.stringify({ type: "before", callId: "c1", apiName: "page.goto" }) +
        "\n" +
        JSON.stringify({
          type: "after",
          callId: "c1",
          startTime: 1,
          endTime: 2,
        }),
      "utf8",
    );
    const record = parseTraceArtifact(raw, "x.trace");
    expect(record?.attempts[0]?.status).toBe("passed");
  });
});
