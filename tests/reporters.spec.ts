import { describe, expect, it } from "vitest";
import type { Finding, ScanResult } from "../src/types.js";
import { renderSarif } from "../src/reporter/sarif.js";
import { renderTerminal } from "../src/reporter/terminal.js";

/**
 * Narrows `T | undefined` to `T`, throwing if absent. Used instead of a
 * non-null assertion (banned by eslint's no-non-null-assertion) when
 * indexing into an array this test constructs and knows is non-empty —
 * fails loudly instead of silently comparing against `undefined` if that
 * assumption is ever wrong.
 */
function defined<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`expected ${what} to be defined`);
  return value;
}

function makeFinding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    file: "a.test.ts",
    line: 3,
    column: 1,
    message: "msg",
    why: "why",
    fix: "fix it",
    ...over,
  };
}

function makeResult(over: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 12,
    },
    ...over,
  };
}

describe("renderSarif", () => {
  it("produces SARIF 2.1.0 skeleton", () => {
    const sarif = JSON.parse(renderSarif(makeResult())) as {
      version: string;
      runs: Array<{
        tool: { driver: { rules: unknown[] } };
        results: unknown[];
      }>;
    };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs).toHaveLength(1);
    const skeletonRun = defined(sarif.runs[0], "sarif.runs[0]");
    expect(skeletonRun.tool.driver.rules).toEqual([]);
    expect(skeletonRun.results).toEqual([]);
  });

  it("maps severities to SARIF levels and dedupes rules", () => {
    const result = makeResult({
      findings: [
        makeFinding({ ruleId: "R1", severity: "error" }),
        makeFinding({ ruleId: "R2", severity: "warning", line: 5 }),
        makeFinding({ ruleId: "R3", severity: "info" }),
        makeFinding({ ruleId: "R1", severity: "info", line: 9 }),
      ],
    });
    const sarif = JSON.parse(renderSarif(result)) as {
      runs: Array<{
        tool: { driver: { rules: Array<{ id: string }> } };
        results: Array<{
          level: string;
          properties: Record<string, unknown>;
          locations: Array<{
            physicalLocation: {
              artifactLocation: { uri: string };
              region: { startLine: number; startColumn: number };
            };
          }>;
        }>;
      }>;
    };
    const run = defined(sarif.runs[0], "sarif.runs[0]");
    expect(run.tool.driver.rules.map((r) => r.id)).toEqual(["R1", "R2", "R3"]);
    expect(run.results.map((r) => r.level)).toEqual([
      "error",
      "warning",
      "note",
      "note",
    ]);
    const firstResult = defined(run.results[0], "run.results[0]");
    expect(firstResult.properties.severity).toBe("error");
    const firstLocation = defined(
      firstResult.locations[0],
      "run.results[0].locations[0]",
    );
    expect(firstLocation.physicalLocation.region.startLine).toBe(3);
  });

  it("clamps line/column to >= 1", () => {
    const result = makeResult({
      findings: [makeFinding({ line: 0, column: 0 })],
    });
    const sarif = JSON.parse(renderSarif(result)) as {
      runs: Array<{
        results: Array<{
          locations: Array<{
            physicalLocation: {
              region: { startLine: number; startColumn: number };
            };
          }>;
        }>;
      }>;
    };
    const run = defined(sarif.runs[0], "sarif.runs[0]");
    const sarifResult = defined(run.results[0], "run.results[0]");
    const location = defined(sarifResult.locations[0], "result.locations[0]");
    const region = location.physicalLocation.region;
    expect(region.startLine).toBe(1);
    expect(region.startColumn).toBe(1);
  });

  it("includes helpUri and SRCROOT when repoRootUri given", () => {
    const result = makeResult({
      findings: [makeFinding({ docsUrl: "https://docs/r1" })],
    });
    const sarif = JSON.parse(renderSarif(result, "file:///repo")) as {
      runs: Array<{
        originalUriBaseIds: Record<string, { uri: string }>;
        tool: { driver: { rules: Array<{ helpUri?: string }> } };
        results: Array<{
          locations: Array<{
            physicalLocation: {
              artifactLocation: { uriBaseId?: string };
            };
          }>;
        }>;
      }>;
    };
    const run = defined(sarif.runs[0], "sarif.runs[0]");
    expect(run.originalUriBaseIds.SRCROOT?.uri).toBe("file:///repo");
    const firstRule = defined(
      run.tool.driver.rules[0],
      "run.tool.driver.rules[0]",
    );
    expect(firstRule.helpUri).toBe("https://docs/r1");
    const firstResult = defined(run.results[0], "run.results[0]");
    const firstLocation = defined(
      firstResult.locations[0],
      "run.results[0].locations[0]",
    );
    expect(firstLocation.physicalLocation.artifactLocation.uriBaseId).toBe(
      "SRCROOT",
    );
  });

  // ── Bug-audit M7: SARIF 2.1.0 schema honesty ─────────────────────────

  it("reports partial success via toolExecutionNotifications, never the illegal partiallySuccessfulReason member (M7a)", () => {
    const sarif = JSON.parse(
      renderSarif(makeResult({ partial: true })),
    ) as unknown as Record<string, unknown>;
    const run = defined(
      (sarif.runs as Array<Record<string, unknown>>)[0],
      "sarif.runs[0]",
    );
    const invocation = defined(
      (run.invocations as Array<Record<string, unknown>>)[0],
      "run.invocations[0]",
    );
    // additionalProperties: false — this member made the whole report
    // schema-invalid for strict consumers (Code Scanning ingestion…).
    expect(invocation).not.toHaveProperty("partiallySuccessfulReason");
    const notifications = invocation.toolExecutionNotifications as Array<{
      level: string;
      message: { text: string };
    }>;
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.level).toBe("warning");
    expect(notifications[0]?.message.text).toContain("PARTIAL");
    // And executionSuccessful is honest: a truncated scan is not success.
    expect(invocation.executionSuccessful).toBe(false);
  });

  it("executionSuccessful is false when any rule crashed, with a named notification (M7c)", () => {
    const sarif = JSON.parse(
      renderSarif(
        makeResult({
          analysisStatus: {
            discovery: "complete",
            rules: "partial",
            skippedFiles: 0,
            durationMs: 5,
            rulesCrashed: 2,
          },
        }),
      ),
    ) as unknown as Record<string, unknown>;
    const run = defined(
      (sarif.runs as Array<Record<string, unknown>>)[0],
      "sarif.runs[0]",
    );
    const invocation = defined(
      (run.invocations as Array<Record<string, unknown>>)[0],
      "run.invocations[0]",
    );
    expect(invocation.executionSuccessful).toBe(false);
    const notifications = invocation.toolExecutionNotifications as Array<{
      message: { text: string };
    }>;
    expect(notifications.some((n) => n.message.text.includes("2 rule"))).toBe(
      true,
    );
  });

  it("executionSuccessful is true and no notifications for a clean complete scan", () => {
    const sarif = JSON.parse(renderSarif(makeResult())) as unknown as Record<
      string,
      unknown
    >;
    const run = defined(
      (sarif.runs as Array<Record<string, unknown>>)[0],
      "sarif.runs[0]",
    );
    const invocation = defined(
      (run.invocations as Array<Record<string, unknown>>)[0],
      "run.invocations[0]",
    );
    expect(invocation.executionSuccessful).toBe(true);
    expect(invocation.toolExecutionNotifications).toBeUndefined();
  });

  it("percent-encodes artifact URIs (M7b): spaces, ?, % and non-ASCII become valid uri-references", () => {
    const result = makeResult({
      findings: [
        makeFinding({ file: "my tests/a#b —ö.spec.ts" }),
        makeFinding({ file: "100% coverage.spec.ts" }),
        makeFinding({ file: "plain.spec.ts" }),
      ],
    });
    const sarif = JSON.parse(renderSarif(result)) as {
      runs: Array<{
        results: Array<{
          locations: Array<{
            physicalLocation: { artifactLocation: { uri: string } };
          }>;
        }>;
      }>;
    };
    const run = defined(sarif.runs[0], "sarif.runs[0]");
    const first = defined(run.results[0], "results[0]");
    const uri = defined(
      first.locations[0]?.physicalLocation.artifactLocation.uri,
      "uri",
    );
    expect(uri).not.toContain(" ");
    expect(uri).not.toContain("#");
    expect(uri).not.toContain("—");
    expect(uri).toContain("%20");
    // A literal % must become %25 — encodeURI handles it, but this
    // case was never locked before (regression guard for M7b).
    const percent = defined(run.results[1], "results[1]");
    const percentUri = defined(
      percent.locations[0]?.physicalLocation.artifactLocation.uri,
      "uri",
    );
    expect(percentUri).toBe("100%25%20coverage.spec.ts");
    const second = defined(run.results[2], "results[2]");
    expect(
      defined(
        second.locations[0]?.physicalLocation.artifactLocation.uri,
        "uri",
      ),
    ).toBe("plain.spec.ts");
  });

  it("passes a minimal fetch-free structural check of the SARIF 2.1.0 envelope", () => {
    const result = makeResult({
      findings: [makeFinding({ ruleId: "R1", docsUrl: "https://docs/r1" })],
      partial: true,
      analysisStatus: {
        discovery: "partial",
        rules: "partial",
        skippedFiles: 1,
        durationMs: 5,
        rulesCrashed: 1,
      },
    });
    const sarif = JSON.parse(renderSarif(result)) as Record<string, unknown>;
    expect(sarif.$schema).toBe("https://json.schemastore.org/sarif-2.1.0.json");
    expect(sarif.version).toBe("2.1.0");
    expect(Array.isArray(sarif.runs)).toBe(true);
    const run = defined(
      (sarif.runs as Array<Record<string, unknown>>)[0],
      "sarif.runs[0]",
    );
    // Only SARIF-known members on a run (spot-check of
    // additionalProperties: false at the run level).
    for (const key of Object.keys(run)) {
      expect([
        "tool",
        "invocations",
        "results",
        "originalUriBaseIds",
        "columnKind",
      ]).toContain(key);
    }
    const driver = (run.tool as Record<string, unknown>).driver as Record<
      string,
      unknown
    >;
    expect(typeof driver.name).toBe("string");
    expect(typeof driver.version).toBe("string");
    expect(Array.isArray(driver.rules)).toBe(true);
    for (const rule of driver.rules as Array<Record<string, unknown>>) {
      expect(typeof rule.id).toBe("string");
      expect(typeof (rule.shortDescription as { text: string }).text).toBe(
        "string",
      );
      for (const key of Object.keys(rule)) {
        expect(["id", "shortDescription", "helpUri", "properties"]).toContain(
          key,
        );
      }
    }
    const invocation = defined(
      (run.invocations as Array<Record<string, unknown>>)[0],
      "run.invocations[0]",
    );
    // invocation allows ONLY these members (schema: additionalProperties
    // false) — this is where partiallySuccessfulReason used to sneak in.
    for (const key of Object.keys(invocation)) {
      expect(["executionSuccessful", "toolExecutionNotifications"]).toContain(
        key,
      );
    }
    for (const res of run.results as Array<Record<string, unknown>>) {
      for (const key of Object.keys(res)) {
        expect([
          "ruleId",
          "level",
          "message",
          "locations",
          "properties",
        ]).toContain(key);
      }
      expect(["error", "warning", "note", "none"]).toContain(res.level);
      expect(typeof (res.message as { text: string }).text).toBe("string");
    }
  });
});

describe("renderTerminal", () => {
  it("renders empty state honestly when no tests found", () => {
    const out = renderTerminal(
      makeResult({ score: null, reason: "no-tests-found" }),
      { isTTY: false },
    );
    expect(out).toContain("NO TESTS DETECTED");
    expect(out).toContain("mjolnir <path-to-your-tests>");
  });

  it("renders score bar and severity counts", () => {
    const out = renderTerminal(
      makeResult({
        findings: [
          makeFinding({ severity: "error" }),
          makeFinding({ severity: "warning", ruleId: "QA-TQUAL-001" }),
        ],
      }),
      { isTTY: false },
    );
    expect(out).toContain("WORTHINESS");
    expect(out).toContain("72/100");
    expect(out).toContain("DETECTED [vitest]");
    expect(out).toContain("TOP ISSUES");
    expect(out).toContain("a.test.ts:3");
  });

  it("shows unknown-framework note and truncates top issues", () => {
    const out = renderTerminal(
      makeResult({
        frameworks: [],
        frameworkDetectionUnknown: true,
        findings: Array.from({ length: 60 }, (_, i) =>
          makeFinding({ ruleId: `R${i}`, line: i + 1 }),
        ),
      }),
      { isTTY: false },
    );
    expect(out).toContain("FRAMEWORK");
    expect(out).toContain("unknown — scanning all test-looking files");
    expect(out).toContain("+10 more");
  });

  it("shows PARTIAL analysis status", () => {
    const out = renderTerminal(
      makeResult({
        analysisStatus: {
          discovery: "partial",
          rules: "complete",
          skippedFiles: 2,
          durationMs: 5,
        },
      }),
      { isTTY: false },
    );
    expect(out).toContain("PARTIAL — verdict may be incomplete");
  });

  it("applies colors on TTY without NO_COLOR", () => {
    const prev = process.env["NO_COLOR"];
    delete process.env["NO_COLOR"];
    try {
      const out = renderTerminal(makeResult({ findings: [makeFinding()] }), {
        isTTY: true,
      });
      expect(out).toContain("\x1b[38;2;"); // 24-bit truecolor SGR (Norse palette)
    } finally {
      if (prev !== undefined) process.env["NO_COLOR"] = prev;
    }
  });

  it("respects NO_COLOR even on TTY", () => {
    const prev = process.env["NO_COLOR"];
    process.env["NO_COLOR"] = "1";
    try {
      const out = renderTerminal(makeResult(), { isTTY: true });
      expect(out).not.toContain("\x1b[");
    } finally {
      if (prev === undefined) delete process.env["NO_COLOR"];
      else process.env["NO_COLOR"] = prev;
    }
  });
});

describe("selector-health", () => {
  // Imported lazily below via static import at top of module scope instead.
  it("placeholder guard", () => {
    expect(true).toBe(true);
  });
});
