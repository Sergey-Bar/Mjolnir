/**
 * WAVE 5 (GAP-RUNTIME-004): HAR ingestion into network-observation
 * records, with the same honest-degradation contract as every other
 * forensics parser arm.
 *
 * The contract under test:
 *  - discovery: `{log:{entries}}` is recognized BEFORE the test-result
 *    shapes and cannot collide with them;
 *  - one record per entry; HTTP 4xx/5xx and transport errors → failed,
 *    otherwise passed (never a fabricated verdict);
 *  - corrupt/oversized/shapeless HAR degrades to zero records, never a
 *    crash;
 *  - entries without a URL are skipped honestly (no invented identity).
 */

import { describe, expect, it } from "vitest";
import {
  looksLikeHarJson,
  parseHar,
  parseHarJson,
} from "../../src/forensics/parse-har.js";
import { runForensics } from "../../src/forensics/run.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HAR = {
  log: {
    version: "1.2",
    entries: [
      {
        startedDateTime: "2026-09-16T10:00:00.000Z",
        time: 42,
        request: { method: "GET", url: "https://api.example.com/users" },
        response: { status: 200, statusText: "OK" },
      },
      {
        startedDateTime: "2026-09-16T10:00:01.000Z",
        time: 13,
        request: { method: "POST", url: "https://api.example.com/users" },
        response: { status: 500, statusText: "Internal Server Error" },
      },
      {
        startedDateTime: "2026-09-16T10:00:02.000Z",
        time: 7,
        request: { method: "GET", url: "https://down.example.com/" },
        response: { status: 0, _error: "net::ERR_CONNECTION_REFUSED" },
      },
    ],
  },
};

describe("looksLikeHarJson", () => {
  it("recognizes {log:{entries:[]}}", () => {
    expect(looksLikeHarJson(HAR)).toBe(true);
    expect(looksLikeHarJson({ log: { entries: [] } })).toBe(true);
  });

  it("rejects the test-result shapes and non-objects", () => {
    expect(looksLikeHarJson(null)).toBe(false);
    expect(looksLikeHarJson({ testResults: [] })).toBe(false);
    expect(looksLikeHarJson({ log: {} })).toBe(false);
    expect(looksLikeHarJson("string")).toBe(false);
  });
});

describe("parseHarJson", () => {
  const records = parseHarJson(HAR);

  it("emits one record per entry", () => {
    expect(records).toHaveLength(3);
  });

  it("carries the request identity in the title", () => {
    expect(records[0]?.title).toBe("GET https://api.example.com/users");
    expect(records[1]?.title).toBe("POST https://api.example.com/users");
  });

  it("marks 2xx as passed and 4xx/5xx as failed", () => {
    expect(records[0]?.attempts[0]?.status).toBe("passed");
    expect(records[1]?.attempts[0]?.status).toBe("failed");
  });

  it("marks transport errors as failed and sanitizes the error text", () => {
    expect(records[2]?.attempts[0]?.status).toBe("failed");
    expect(records[2]?.errors?.[0]).toContain("CONNECTION_REFUSED");
  });

  it("records the entry duration", () => {
    expect(records[0]?.attempts[0]?.durationMs).toBe(42);
  });

  it("skips entries without a URL (no invented identity)", () => {
    const out = parseHarJson({
      log: { entries: [{ request: { method: "GET" }, response: {} }] },
    });
    expect(out).toHaveLength(0);
  });

  it("degrades shapeless input to zero records", () => {
    expect(parseHarJson(null)).toHaveLength(0);
    expect(parseHarJson({})).toHaveLength(0);
    expect(parseHarJson({ log: {} })).toHaveLength(0);
    expect(parseHarJson({ log: { entries: "nope" } })).toHaveLength(0);
  });
});

describe("parseHar (text entry point)", () => {
  it("parses valid HAR JSON text", () => {
    expect(parseHar(JSON.stringify(HAR))).toHaveLength(3);
  });

  it("degrades corrupt JSON to zero records, never a throw", () => {
    expect(parseHar("{not json")).toHaveLength(0);
  });

  it("degrades oversized input to zero records", () => {
    const huge = "x".repeat(20 * 1024 * 1024 + 1);
    expect(parseHar(huge)).toHaveLength(0);
  });
});

describe("runForensics HAR discovery (end-to-end)", () => {
  it("ingests a .har file and reports source=har", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-har-"));
    try {
      writeFileSync(join(dir, "network.har"), JSON.stringify(HAR));
      const { report } = runForensics(dir, { writeFlakyMd: false });
      expect(report.source).toBe("har");
      expect(report.totalTests).toBe(3);
      expect(report.failed).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a corrupt .har degrades to zero records, never a crash", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-har-bad-"));
    try {
      writeFileSync(join(dir, "broken.har"), "{not json");
      const { report } = runForensics(dir, { writeFlakyMd: false });
      expect(report.totalTests).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
