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
  parseHarJsonDetailed,
} from "../../src/forensics/parse-har.js";
import { runForensics } from "../../src/forensics/run.js";
import {
  analyze,
  renderFlakyMd,
  renderLeaderboard,
} from "../../src/forensics/analyze.js";
import { runForensicsCommand } from "../../src/cli-handlers.js";
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

describe("network observation contracts", () => {
  it.each([-1, -1000, Number.NaN, Number.POSITIVE_INFINITY])(
    "normalizes unavailable duration %s",
    (time) => {
      const records = parseHarJson({
        log: { entries: [{ ...HAR.log.entries[0], time }] },
      });
      expect(records[0]?.attempts[0]?.durationMs).toBe(0);
    },
  );

  it("preserves URL sanitization and rejects unknown HTTP outcomes", () => {
    const records = parseHarJson({
      log: {
        entries: [
          {
            request: {
              url: "https://user:password@example.com/path?token=secret#fragment",
            },
            response: { status: 200 },
          },
          {
            request: { url: "https://example.com/unknown" },
            response: { status: 0 },
          },
          {
            request: { url: "https://example.com/invalid" },
            response: { status: 999 },
          },
        ],
      },
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.title).toBe("GET https://example.com/path");
  });

  it("propagates the HAR entry cap even when most entries are unreadable", () => {
    const dir = mkdtempSync(join(tmpdir(), "qa-doctor-har-limit-"));
    try {
      const entries = [
        HAR.log.entries[0],
        ...Array.from({ length: 20_000 }, () => null),
      ];
      writeFileSync(
        join(dir, "network.har"),
        JSON.stringify({ log: { entries } }),
      );
      const { report } = runForensics(dir, { writeFlakyMd: false });
      expect(report.totalNetworkObservations).toBe(1);
      expect(report.analysisComplete).toBe(false);
      expect(report.incompleteReasons).toContain("entry-count-limit");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("clamps unavailable negative durations and retains the parser bound", () => {
    const entry = {
      request: { url: "https://example.com" },
      response: { status: 500 },
      time: -1000,
    };
    const parsed = parseHarJsonDetailed({
      log: { entries: Array.from({ length: 20_001 }, () => entry) },
    });
    expect(parsed.truncated).toBe(true);
    expect(parsed.records).toHaveLength(20_000);
    expect(parsed.records[0]?.attempts[0]?.durationMs).toBe(0);
    expect(() =>
      renderLeaderboard(analyze(parsed.records, "har")),
    ).not.toThrow();
  });

  it("segregates observations from test verdicts, durations, retries and classification", () => {
    const report = analyze(
      [
        ...parseHarJson(HAR),
        {
          file: "test.spec.ts",
          title: "actual test",
          attempts: [{ index: 1, status: "passed", durationMs: 100 }],
        },
      ],
      "har",
    );
    expect(report.totalTests).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.flakyTests).toBe(0);
    expect(report.retriedTests).toBe(0);
    expect(report.totalDurationMs).toBe(100);
    expect(report.verdicts.map((v) => v.title)).toEqual(["actual test"]);
    expect(report.totalNetworkObservations).toBe(3);
    expect(report.failedNetworkObservations).toBe(2);
    expect(report.networkObservations?.[1]).toMatchObject({
      outcome: "failed",
      durationMs: 13,
    });
    expect(report.networkObservations?.[1]).not.toHaveProperty("forensic");
    for (const output of [renderLeaderboard(report), renderFlakyMd(report)]) {
      expect(output).toContain("3 network observations");
      expect(output).toContain("2 network failures");
      expect(output).toContain("not test outcomes");
      expect(output).not.toContain("nothing suspicious");
    }
  });

  it.each([false, true])(
    "preserves mixed-directory test counts regardless of HAR discovery order (%s)",
    (harFirst) => {
      const dir = mkdtempSync(join(tmpdir(), "qa-doctor-har-mixed-"));
      try {
        writeFileSync(
          join(dir, harFirst ? "a.har" : "z.har"),
          JSON.stringify(HAR),
        );
        writeFileSync(
          join(dir, "report.xml"),
          '<testsuite><testcase name="ok" time="0.1"/></testsuite>',
        );
        const { report } = runForensics(dir, { writeFlakyMd: false });
        expect(report.totalTests).toBe(1);
        expect(report.source).toBe("junit-xml");
        expect(report.failed).toBe(0);
        expect(report.totalNetworkObservations).toBe(3);
        expect(report.failedNetworkObservations).toBe(2);
        expect(
          runForensicsCommand([dir, "--no-flaky-md"], {
            out: () => {},
            err: () => {},
          }),
        ).toBe(1);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  it("reports network-only evidence as insufficient for test verification", () => {
    const dir = mkdtempSync(join(tmpdir(), "qa-doctor-har-cli-"));
    try {
      const path = join(dir, "network.har");
      writeFileSync(path, JSON.stringify(HAR));
      const errors: string[] = [];
      const output: string[] = [];
      expect(
        runForensicsCommand([path, "--no-flaky-md"], {
          out: (s) => output.push(String(s)),
          err: (s) => errors.push(String(s)),
        }),
      ).toBe(2);
      expect(errors.join("\n")).toContain("Network observations recognized");
      expect(errors.join("\n")).not.toContain("No test results recognized");
      expect(output.join("\n")).not.toContain("nothing suspicious");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
    const dir = mkdtempSync(join(tmpdir(), "qa-doctor-har-"));
    try {
      writeFileSync(join(dir, "network.har"), JSON.stringify(HAR));
      const { report } = runForensics(dir, { writeFlakyMd: false });
      expect(report.source).toBe("har");
      expect(report.totalTests).toBe(0);
      expect(report.failed).toBe(0);
      expect(report.totalNetworkObservations).toBe(3);
      expect(report.failedNetworkObservations).toBe(2);
      expect(report.verdicts).toEqual([]);
      expect(report.networkObservations).toHaveLength(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a corrupt .har degrades to zero records, never a crash", () => {
    const dir = mkdtempSync(join(tmpdir(), "qa-doctor-har-bad-"));
    try {
      writeFileSync(join(dir, "broken.har"), "{not json");
      const { report } = runForensics(dir, { writeFlakyMd: false });
      expect(report.totalTests).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
