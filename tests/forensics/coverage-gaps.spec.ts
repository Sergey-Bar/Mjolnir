/**
 * Coverage gap tests for run.ts, analyze.ts, and trace.ts.
 *
 * Targets every uncovered line/branch reported by vitest coverage.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runForensics } from "../../src/forensics/run.js";
import {
  analyze,
  renderFlakyMd,
  renderLeaderboard,
  leaderboard,
} from "../../src/forensics/analyze.js";
import {
  parseTraceArtifact,
  parseTraceNdjson,
  traceActionsToRecord,
  extractZipMember,
  LIMITS,
} from "../../src/forensics/trace.js";
import { deflateRawSync } from "node:zlib";

let dir: string;
const createdDirs: string[] = [];

function tmpRepo(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-cov-gap-"));
  createdDirs.push(d);
  return d;
}

beforeEach(() => {
  dir = tmpRepo();
});

afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

const VALID_TRACE =
  JSON.stringify({ type: "before", callId: "c1", apiName: "page.goto" }) +
  "\n" +
  JSON.stringify({ type: "after", callId: "c1", startTime: 1, endTime: 2 }) +
  "\n";

const VALID_REPORT_JSON = JSON.stringify({
  suites: [
    {
      specs: [
        {
          file: "a.spec.ts",
          tests: [{ results: [{ status: "passed", duration: 1 }] }],
        },
      ],
    },
  ],
});

describe("run.ts — oversized single-file (lines 69-82)", () => {
  it("single file exceeding MAX_REPORT_FILE_BYTES is skipped with size-limit reason", () => {
    const bigFile = join(dir, "huge-report.json");
    // Write a file > 1MB (MAX_REPORT_FILE_BYTES)
    writeFileSync(bigFile, "x".repeat(1024 * 1024 + 1));
    const { report } = runForensics(bigFile, { writeFlakyMd: false });
    expect(report.analysisComplete).toBe(false);
    expect(report.skippedReports).toBe(1);
    expect(report.incompleteReasons).toContain("size-limit");
    expect(report.totalTests).toBe(0);
  });
});

describe("run.ts — single-file trace paths (lines 106-123)", () => {
  it("single .trace file with valid data produces a record", () => {
    const traceFile = join(dir, "test.trace");
    writeFileSync(traceFile, VALID_TRACE, "utf8");
    const { report } = runForensics(traceFile, { writeFlakyMd: false });
    expect(report.totalTests).toBe(1);
    expect(report.source).toBe("playwright-trace");
  });

  it("single .ndjson file with valid data produces a record", () => {
    const ndjsonFile = join(dir, "test.ndjson");
    writeFileSync(ndjsonFile, VALID_TRACE, "utf8");
    const { report } = runForensics(ndjsonFile, { writeFlakyMd: false });
    expect(report.totalTests).toBe(1);
    expect(report.source).toBe("playwright-trace");
  });

  it("single .trace file with no actions returns zero records", () => {
    const traceFile = join(dir, "empty.trace");
    writeFileSync(
      traceFile,
      JSON.stringify({ type: "version", version: 1 }) + "\n",
      "utf8",
    );
    const { report } = runForensics(traceFile, { writeFlakyMd: false });
    expect(report.totalTests).toBe(0);
    expect(report.source).toBe("playwright-trace");
  });

  it("single .trace file with hostile data is caught gracefully", () => {
    const traceFile = join(dir, "hostile.trace");
    writeFileSync(traceFile, "not valid json at all\n", "utf8");
    const { report } = runForensics(traceFile, { writeFlakyMd: false });
    expect(report.totalTests).toBe(0);
    expect(report.source).toBe("playwright-trace");
  });
});

describe("run.ts — single-file catch (lines 133-134)", () => {
  it("corrupt single file that readFileSync cannot parse degrades to zero records", () => {
    // A .json file with invalid content — readFileSync succeeds but
    // parseFile returns empty records (JSON.parse fails internally).
    // The catch at 131-134 only fires when readFileSync itself throws.
    // This test verifies the normal degradation path.
    const badFile = join(dir, "bad.json");
    writeFileSync(badFile, "not json{{{");
    const { report } = runForensics(badFile, { writeFlakyMd: false });
    expect(report.totalTests).toBe(0);
  });
});

describe("run.ts — directory walk size-limit (lines 149-153)", () => {
  it("file exceeding MAX_REPORT_FILE_BYTES in directory walk is skipped", () => {
    mkdirSync(join(dir, "reports"));
    // Normal-sized file that will be recognized
    writeFileSync(join(dir, "reports", "good.json"), VALID_REPORT_JSON);
    // Oversized file (> 1MB)
    writeFileSync(
      join(dir, "reports", "huge.json"),
      "x".repeat(1024 * 1024 + 1),
    );
    const { report } = runForensics(join(dir, "reports"), {
      writeFlakyMd: false,
    });
    expect(report.analysisComplete).toBe(false);
    expect(report.skippedReports).toBeGreaterThanOrEqual(1);
    expect(report.incompleteReasons).toContain("size-limit");
    expect(report.totalTests).toBe(1); // the good file was still parsed
  });
});

describe("run.ts — directory walk catch (lines 178-183)", () => {
  it("corrupt .trace file in directory triggers parse-failure via catch block", () => {
    mkdirSync(join(dir, "reports"));
    writeFileSync(join(dir, "reports", "good.json"), VALID_REPORT_JSON);
    // A corrupt .trace file will make parseTraceArtifact throw
    writeFileSync(
      join(dir, "reports", "bad.trace"),
      "this is not valid JSON\n",
      "utf8",
    );
    const { report } = runForensics(join(dir, "reports"), {
      writeFlakyMd: false,
    });
    expect(report.analysisComplete).toBe(false);
    expect(report.skippedReports).toBeGreaterThanOrEqual(1);
    expect(report.incompleteReasons).toContain("parse-failure");
  });

  it("second corrupt file does not duplicate parse-failure reason (line 181 guard)", () => {
    mkdirSync(join(dir, "reports"));
    writeFileSync(join(dir, "reports", "bad1.trace"), "not json{{{", "utf8");
    writeFileSync(join(dir, "reports", "bad2.trace"), "also bad{{{", "utf8");
    const { report } = runForensics(join(dir, "reports"), {
      writeFlakyMd: false,
    });
    expect(report.skippedReports).toBeGreaterThanOrEqual(2);
    const count = report.incompleteReasons.filter(
      (r) => r === "parse-failure",
    ).length;
    expect(count).toBe(1);
  });
});

describe("run.ts — second oversized file in directory walk (line 150 else branch)", () => {
  it("duplicate size-limit reason is not pushed twice", () => {
    mkdirSync(join(dir, "reports"));
    writeFileSync(join(dir, "reports", "good.json"), VALID_REPORT_JSON);
    // Two oversized files — the first pushes "size-limit", the second
    // hits the else branch at line 150 (already in incompleteReasons).
    writeFileSync(
      join(dir, "reports", "huge1.json"),
      "x".repeat(1024 * 1024 + 1),
    );
    writeFileSync(
      join(dir, "reports", "huge2.json"),
      "x".repeat(1024 * 1024 + 1),
    );
    const { report } = runForensics(join(dir, "reports"), {
      writeFlakyMd: false,
    });
    expect(report.skippedReports).toBeGreaterThanOrEqual(2);
    const sizeLimitCount = report.incompleteReasons.filter(
      (r) => r === "size-limit",
    ).length;
    expect(sizeLimitCount).toBe(1);
  });
});

describe("run.ts — second trace file after first sets source (line 168 else branch)", () => {
  it("second trace file does not overwrite source when records already exist", () => {
    mkdirSync(join(dir, "test-results"));
    writeFileSync(
      join(dir, "test-results", "first.trace"),
      VALID_TRACE,
      "utf8",
    );
    writeFileSync(
      join(dir, "test-results", "second.trace"),
      VALID_TRACE,
      "utf8",
    );
    const { report } = runForensics(dir, { writeFlakyMd: false });
    expect(report.totalTests).toBe(2);
    expect(report.source).toBe("playwright-trace");
  });
});

describe("run.ts — deep directory walk (line 302 branch)", () => {
  it("directory nesting deeper than 4 levels is truncated", () => {
    // Create a deeply nested dir with a report at level 5+
    let d = dir;
    for (let i = 0; i < 6; i++) {
      d = join(d, `level${i}`);
    }
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "deep.json"), VALID_REPORT_JSON);
    const { report } = runForensics(dir, { writeFlakyMd: false });
    // The deep file should NOT be found (depth > 4)
    expect(report.totalTests).toBe(0);
  });
});

describe("run.ts — cumulative-size-limit (lines 197-200)", () => {
  it("cumulative bytes exceeding 50MB triggers cumulative-size-limit", () => {
    mkdirSync(join(dir, "reports"));
    // MAX_CUMULATIVE_BYTES = 50 * 1024 * 1024 = 52,428,800
    // 55 files * 980,000 bytes = 53,900,000 > 52,428,800
    const content = "x".repeat(980_000);
    for (let i = 0; i < 55; i++) {
      writeFileSync(join(dir, "reports", `r${i}.json`), content);
    }
    const { report } = runForensics(join(dir, "reports"), {
      writeFlakyMd: false,
    });
    expect(report.incompleteReasons).toContain("cumulative-size-limit");
  });
});

describe("run.ts — traceArtifactName fallback (line 259)", () => {
  it("parent directory is test-results → falls back to file basename", () => {
    const trDir = join(dir, "test-results");
    mkdirSync(trDir);
    writeFileSync(join(trDir, "my-test.trace"), VALID_TRACE, "utf8");
    const { report } = runForensics(trDir, { writeFlakyMd: false });
    expect(report.totalTests).toBe(1);
    expect(report.verdicts[0]?.file).toBe("my-test.trace");
  });
});

describe("run.ts — readdirSync catch and depth guard (lines 302, 307)", () => {
  it("unreadable subdirectory degrades without crashing (line 307)", async () => {
    mkdirSync(join(dir, "reports"));
    writeFileSync(join(dir, "reports", "good.json"), VALID_REPORT_JSON);
    const brokenDir = join(dir, "reports", "broken-sub");
    try {
      const { symlinkSync } = await import("node:fs");
      symlinkSync(join(dir, "does-not-exist"), brokenDir, "junction");
    } catch {
      return; // junctions not supported
    }
    const { report } = runForensics(join(dir, "reports"), {
      writeFlakyMd: false,
    });
    expect(report.totalTests).toBe(1);
  });
});

describe("analyze.ts — renderLeaderboard gaps", () => {
  it("leaderboard sort: same passedOnRetry, different attempts (line 106 branch)", () => {
    const report = analyze(
      [
        {
          file: "a.spec.ts",
          title: "fail-3-attempts",
          attempts: [
            { index: 1, status: "failed", durationMs: 100 },
            { index: 2, status: "failed", durationMs: 100 },
            { index: 3, status: "failed", durationMs: 100 },
          ],
        },
        {
          file: "b.spec.ts",
          title: "fail-1-attempt",
          attempts: [{ index: 1, status: "failed", durationMs: 100 }],
        },
      ],
      "playwright-json",
    );
    const top = leaderboard(report);
    // Both are non-flaky failures (same passedOnRetry=false),
    // but different attempts → line 106 branch taken
    expect(top[0]?.title).toBe("fail-3-attempts");
    expect(top[1]?.title).toBe("fail-1-attempt");
  });

  it("renderLeaderboard with items and partial analysis (lines 152-155)", () => {
    const report = analyze(
      [
        {
          file: "a.spec.ts",
          title: "failing test",
          attempts: [{ index: 1, status: "failed", durationMs: 100 }],
        },
      ],
      "playwright-json",
    );
    report.analysisComplete = false;
    report.skippedReports = 5;
    report.incompleteReasons = ["size-limit", "parse-failure"];
    const output = renderLeaderboard(report);
    expect(output).toContain("FAILING");
    expect(output).toContain("Analysis is partial");
    expect(output).toContain("5 report(s) skipped");
    expect(output).toContain("size-limit, parse-failure");
  });
});

describe("analyze.ts — renderFlakyMd partial analysis", () => {
  it("lines 181-182: empty leaderboard + partial analysis renders warning", () => {
    const report = analyze([], "playwright-json");
    report.analysisComplete = false;
    report.skippedReports = 3;
    report.incompleteReasons = ["parse-failure", "size-limit"];
    const md = renderFlakyMd(report);
    expect(md).toContain("No flaky or failing tests detected");
    expect(md).toContain("Analysis is partial");
    expect(md).toContain("3 report(s) skipped");
  });

  it("lines 199-200: leaderboard items + partial analysis renders warning", () => {
    const report = analyze(
      [
        {
          file: "a.spec.ts",
          title: "flake test",
          attempts: [
            { index: 1, status: "failed", durationMs: 100 },
            { index: 2, status: "passed", durationMs: 100 },
          ],
        },
        {
          file: "b.spec.ts",
          title: "failing test",
          attempts: [{ index: 1, status: "failed", durationMs: 50 }],
        },
      ],
      "playwright-json",
    );
    report.analysisComplete = false;
    report.skippedReports = 2;
    report.incompleteReasons = ["cumulative-size-limit"];
    const md = renderFlakyMd(report);
    expect(md).toContain("TRUE-FLAKE");
    expect(md).toContain("failing");
    expect(md).toContain("Analysis is partial");
    expect(md).toContain("2 report(s) skipped");
  });

  it("renderFlakyMd with items but complete analysis (no partial warning)", () => {
    const report = analyze(
      [
        {
          file: "a.spec.ts",
          title: "flake test",
          attempts: [
            { index: 1, status: "failed", durationMs: 100 },
            { index: 2, status: "passed", durationMs: 100 },
          ],
        },
      ],
      "playwright-json",
    );
    const md = renderFlakyMd(report);
    expect(md).toContain("TRUE-FLAKE");
    expect(md).not.toContain("Analysis is partial");
  });
});

/** Helper: build a minimal ZIP buffer. */
function buildZip(memberName: string, bytes: Buffer, method: 0 | 8): Buffer {
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
  central.writeUInt32LE(0, 42);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(30 + name.length + payload.length, 16);

  return Buffer.concat([local, name, payload, central, name, eocd]);
}

describe("trace.ts — zip-bomb post-inflate guard (line 294)", () => {
  it("extractZipMember throws for content exceeding maxDecompressedBytes", () => {
    const hugeContent = "x".repeat(LIMITS.maxDecompressedBytes + 1);
    const zip = buildZip("trace.trace", Buffer.from(hugeContent, "utf8"), 8);
    expect(() => extractZipMember(zip, "trace.trace")).toThrow();
  });
});

describe("trace.ts — duplicate before event (branch 15)", () => {
  it("a second before event with the same callId is ignored (existing !== undefined)", () => {
    const text = [
      JSON.stringify({ type: "before", callId: "c1", apiName: "first" }),
      JSON.stringify({ type: "before", callId: "c1", apiName: "duplicate" }),
      JSON.stringify({ type: "after", callId: "c1", startTime: 1, endTime: 2 }),
    ].join("\n");
    const { actions } = parseTraceNdjson(text);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.apiName).toBe("first");
    expect(actions[0]?.durationMs).toBe(1000);
  });
});

describe("trace.ts — error with message in traceActionsToRecord (branch 28)", () => {
  it("error with a message string uses that message", () => {
    const record = traceActionsToRecord(
      [{ durationMs: 100, error: { message: "specific error" } }],
      "test.trace",
    );
    expect(record?.errors).toContain("specific error");
    expect(record?.attempts[0]?.status).toBe("failed");
  });
});

describe("trace.ts — ZIP signatures 0x05 and 0x07 (branch 46)", () => {
  it("parseTraceArtifact detects ZIP with bytes[2] = 0x05 (span descriptor)", () => {
    const traceContent =
      JSON.stringify({ type: "before", callId: "c1", apiName: "test" }) +
      "\n" +
      JSON.stringify({
        type: "after",
        callId: "c1",
        startTime: 1,
        endTime: 2,
      }) +
      "\n";
    const zip = buildZip("trace.trace", Buffer.from(traceContent, "utf8"), 0);
    // Modify bytes[2] to 0x05 — isZip will be true, but extractZipMember
    // will throw because local header expects 0x03.
    zip[2] = 0x05;
    expect(() => parseTraceArtifact(zip, "test.zip")).toThrow();
  });

  it("parseTraceArtifact detects ZIP with bytes[2] = 0x07 (archive extra data)", () => {
    const traceContent =
      JSON.stringify({ type: "before", callId: "c1", apiName: "test" }) +
      "\n" +
      JSON.stringify({
        type: "after",
        callId: "c1",
        startTime: 1,
        endTime: 2,
      }) +
      "\n";
    const zip = buildZip("trace.trace", Buffer.from(traceContent, "utf8"), 0);
    zip[2] = 0x07;
    expect(() => parseTraceArtifact(zip, "test.zip")).toThrow();
  });
});

describe("trace.ts — parseTraceArtifact ZIP path (line 333)", () => {
  it("stored ZIP (method 0) with trace.trace member", () => {
    const traceContent =
      JSON.stringify({
        type: "before",
        callId: "c1",
        apiName: "page.goto",
      }) +
      "\n" +
      JSON.stringify({
        type: "after",
        callId: "c1",
        startTime: 1,
        endTime: 2,
      }) +
      "\n";
    const zip = buildZip("trace.trace", Buffer.from(traceContent, "utf8"), 0);
    const record = parseTraceArtifact(zip, "test-trace.zip");
    expect(record).toBeDefined();
    expect(record?.title).toBe("page.goto");
    expect(record?.attempts[0]?.status).toBe("passed");
  });

  it("deflated ZIP (method 8) with trace.trace member", () => {
    const traceContent =
      JSON.stringify({
        type: "before",
        callId: "c1",
        apiName: "page.click",
      }) +
      "\n" +
      JSON.stringify({
        type: "after",
        callId: "c1",
        startTime: 10,
        endTime: 20,
      }) +
      "\n";
    const zip = buildZip("trace.trace", Buffer.from(traceContent, "utf8"), 8);
    const record = parseTraceArtifact(zip, "test-trace-deflated.zip");
    expect(record).toBeDefined();
    expect(record?.title).toBe("page.click");
    expect(record?.attempts[0]?.durationMs).toBe(10000);
  });
});
