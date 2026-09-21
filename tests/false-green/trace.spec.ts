/**
 * False-Green corpus — trace ingester cases (plan §9 R5 / WI-17). The
 * hostile-input invariant for the Playwright trace surface: corrupt,
 * truncated, enormous, and unsupported-version traces degrade to the
 * zero-record exit-2 state — never a green empty suite. The positive
 * control (a hand-built stored ZIP + a valid raw stream) proves the
 * parser ingests real artifacts, so the rejections are precision, not
 * blindness.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runForensics } from "../../src/forensics/run.js";
import {
  LIMITS,
  TraceParseError,
  parseTraceArtifact,
  parseTraceNdjson,
} from "../../src/forensics/trace.js";

const VALID_EVENT_LINE = (apiName: string): string =>
  JSON.stringify({ type: "before", callId: "c1", apiName, startTime: 1 });
const VALID_AFTER_LINE =
  JSON.stringify({ type: "after", callId: "c1", startTime: 1, endTime: 2.5 }) +
  "\n";

/** Hand-built stored (method-0) ZIP with one member — exercises the reader. */
function storedZip(memberName: string, bytes: Buffer): Buffer {
  const chunks: Buffer[] = [];
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
  const crc = crc32(bytes);
  const name = Buffer.from(memberName, "utf8");

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8); // stored
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(bytes.length, 18);
  local.writeUInt32LE(bytes.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);
  chunks.push(local, name, bytes);
  const localEnd = chunks.reduce((s, b) => s + b.length, 0);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 10);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(bytes.length, 20);
  central.writeUInt32LE(bytes.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  chunks.push(central, name);
  const centralStart = localEnd;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralStart, 16);
  chunks.push(eocd);
  return Buffer.concat(chunks);
}

function forensicsOnTrace(
  name: string,
  bytes: Buffer,
): {
  report: ReturnType<typeof runForensics>["report"];
  dir: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "fg-trace-"));
  writeFileSync(join(dir, name), bytes);
  const { report } = runForensics(join(dir, name), { writeFlakyMd: false });
  return { report, dir };
}

describe("trace ingester — hostile inputs degrade to the exit-2 state", () => {
  it("fg-parser-trace-corrupt: garbage lines → zero records", () => {
    const { report, dir } = forensicsOnTrace(
      "x.trace",
      Buffer.from("not json\n{{{{\n", "utf8"),
    );
    rmSync(dir, { recursive: true, force: true });
    expect(report.totalTests).toBe(0);
    expect(report.source).toBe("playwright-trace");
  });

  it("fg-parser-trace-truncated: a cut final line → zero records", () => {
    const { report, dir } = forensicsOnTrace(
      "x.trace",
      Buffer.from(
        VALID_EVENT_LINE("page.goto") + "\n" + '{"type":"after","callI',
        "utf8",
      ),
    );
    rmSync(dir, { recursive: true, force: true });
    expect(report.totalTests).toBe(0);
  });

  it("fg-parser-trace-enormous: beyond the event cap → refused", () => {
    const lines: string[] = [];
    for (let i = 0; i <= LIMITS.maxTraceLines; i++) {
      lines.push(
        JSON.stringify({ type: "before", callId: `c${i}`, apiName: "x" }),
      );
    }
    expect(() => parseTraceNdjson(lines.join("\n"))).toThrowError(
      TraceParseError,
    );
  });

  it("fg-parser-trace-mismatched-version: an unsupported version marker aborts", () => {
    expect(() =>
      parseTraceNdjson(
        JSON.stringify({ type: "version", version: 999 }) + "\n",
      ),
    ).toThrowError(/not supported/);
  });

  it("fg-parser-trace-zip-valid: the positive control — a real stored zip ingests", () => {
    const ndjson = VALID_EVENT_LINE("page.goto") + "\n" + VALID_AFTER_LINE;
    const { report, dir } = forensicsOnTrace(
      "trace.zip",
      storedZip("trace.trace", Buffer.from(ndjson, "utf8")),
    );
    rmSync(dir, { recursive: true, force: true });
    expect(report.totalTests).toBe(1);
    expect(report.source).toBe("playwright-trace");
    expect(report.verdicts[0]?.finalStatus ?? "x").toBe("passed");
  });
});

describe("trace ingester — bounds and positive behavior (containment contract)", () => {
  it("a passing action stream yields one passed record with paired duration", () => {
    const { actions } = parseTraceNdjson(
      VALID_EVENT_LINE("page.click") + "\n" + VALID_AFTER_LINE,
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]?.durationMs).toBe(1500);
  });

  it("an after.error marks the record failed; a timeout message marks timedOut", () => {
    const failing =
      VALID_EVENT_LINE("expect") +
      "\n" +
      JSON.stringify({
        type: "after",
        callId: "c1",
        startTime: 1,
        endTime: 3,
        error: { message: "expect(received).toBe(expected) failed" },
      }) +
      "\n";
    const rec = parseTraceArtifact(Buffer.from(failing, "utf8"), "t");
    expect(rec?.attempts[0]?.status).toBe("failed");

    const timing =
      VALID_EVENT_LINE("page.click") +
      "\n" +
      JSON.stringify({
        type: "after",
        callId: "c1",
        startTime: 1,
        endTime: 2,
        error: { message: "Test timeout of 5000ms exceeded." },
      }) +
      "\n";
    const rec2 = parseTraceArtifact(Buffer.from(timing, "utf8"), "t");
    expect(rec2?.attempts[0]?.status).toBe("timedOut");
  });

  it("a zip without trace.trace is rejected as corrupt", () => {
    expect(() =>
      parseTraceArtifact(storedZip("other.txt", Buffer.from("x")), "trace.zip"),
    ).toThrowError(/trace\.trace/);
  });
});
