import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ConfigValidationError,
  applySeverityOverrides,
  isSuppressionActive,
  loadConfig,
} from "../../src/config/config.js";
import {
  loadSuppressions,
  renderSuppressions,
} from "../../src/config/suppressions.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cfg-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns empty config when no file present", () => {
    expect(loadConfig(dir)).toEqual({ config: {}, path: null, warnings: [] });
  });

  it("loads mjolnir.config.json", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ gate: "error" }),
    );
    const res = loadConfig(dir);
    expect(res.config.gate).toBe("error");
    expect(res.path).toContain("mjolnir.config.json");
  });

  it("falls back to .mjolnir.json", () => {
    writeFileSync(
      join(dir, ".mjolnir.json"),
      JSON.stringify({ gate: "advisory" }),
    );
    expect(loadConfig(dir).config.gate).toBe("advisory");
  });

  it("does not load a symlinked config file", () => {
    const outside = mkdtempSync(join(tmpdir(), "mjolnir-cfg-outside-"));
    try {
      const outsideFile = join(outside, "secret.json");
      writeFileSync(outsideFile, JSON.stringify({ gate: "error" }), "utf8");
      const link = join(dir, "mjolnir.config.json");
      try {
        symlinkSync(outsideFile, link, "file");
        expect(loadConfig(dir)).toBeNull();
      } catch {
        return;
      }
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejects an oversized regular config file", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      "x".repeat(1024 * 1024 + 1),
    );
    expect(() => loadConfig(dir)).toThrow(ConfigValidationError);
  });

  it("rejects invalid ignore file globs and exclude entries", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ ignore: [{ ruleId: "R", reason: "x", files: [1] }] }),
    );
    expect(() => loadConfig(dir)).toThrow(/files/);
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ exclude: [1] }),
    );
    expect(() => loadConfig(dir)).toThrow(/exclude/);
  });

  it("handles an invalid expiry date explicitly", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [{ ruleId: "R", reason: "x", expires: "not-a-date" }],
      }),
    );
    expect(() => loadConfig(dir)).toThrow(/expires/);
  });

  it("rejects an expiry that is not a YYYY-MM-DD calendar day", () => {
    // Every value here parses with `new Date()`, which is what load-time
    // validation used to check. `isSuppressionActive` reads none of them as
    // the day the author meant: the first two left the entry silently
    // inactive, and the impossible days silently rolled into March.
    for (const expires of [
      "2027-01-01T00:00:00Z",
      "2027-1-1",
      "2027-02-30",
      "2026-02-29",
    ]) {
      writeFileSync(
        join(dir, "mjolnir.config.json"),
        JSON.stringify({ ignore: [{ ruleId: "R", reason: "x", expires }] }),
      );
      expect(() => loadConfig(dir), expires).toThrow(
        `"expires" must be an ISO date (YYYY-MM-DD), got "${expires}"`,
      );
    }
  });

  it("accepts a leap day that exists", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [{ ruleId: "R", reason: "x", expires: "2028-02-29" }],
      }),
    );
    expect(
      loadConfig(dir, { now: new Date("2028-02-28T12:00:00Z") }).warnings,
    ).toEqual([]);
  });

  it("warns about an expired entry on the boundary isSuppressionActive uses", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [{ ruleId: "R", reason: "x", expires: "2026-09-10" }],
      }),
    );
    const before = new Date("2026-09-09T23:59:59Z");
    const onTheDay = new Date("2026-09-10T00:00:00Z");
    expect(loadConfig(dir, { now: before }).warnings).toEqual([]);
    expect(loadConfig(dir, { now: onTheDay }).warnings.join("\n")).toContain(
      'ignore for R has expired (expires "2026-09-10")',
    );
    // The warning and the loader's verdict are the same question.
    const entry = { ruleId: "R", reason: "x", expires: "2026-09-10" };
    expect(isSuppressionActive(entry, before)).toBe(true);
    expect(isSuppressionActive(entry, onTheDay)).toBe(false);
  });

  it("names the file it actually loaded in the unknown-key warning", () => {
    writeFileSync(join(dir, ".mjolnir.json"), JSON.stringify({ ingore: [] }));
    expect(loadConfig(dir).warnings.join("\n")).toContain(
      '.mjolnir.json has an unknown top-level key "ingore"',
    );
  });

  it("throws on invalid JSON", () => {
    writeFileSync(join(dir, "mjolnir.config.json"), "{ nope");
    expect(() => loadConfig(dir)).toThrow(/Invalid mjolnir config/);
  });

  it("throws on invalid gate", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ gate: "yolo" }),
    );
    expect(() => loadConfig(dir)).toThrow(/gate must be/);
  });

  it("throws when ignore entry lacks ruleId", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ ignore: [{ reason: "x" }] }),
    );
    expect(() => loadConfig(dir)).toThrow(/ruleId/);
  });

  it("throws when ignore entry lacks reason", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ ignore: [{ ruleId: "QA-TEST-001" }] }),
    );
    expect(() => loadConfig(dir)).toThrow(/reason/);
  });

  it("throws an actionable ConfigValidationError on a typo'd severityOverrides value (bug-audit M4)", () => {
    // "eror" used to flow through to DEDUCTIONS[bad] = undefined → NaN
    // score, and exitForFindings never matched the bogus severity, so the
    // rule was silently un-gated.
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ severityOverrides: { "QA-TEST-001": "eror" } }),
    );
    let thrown: unknown;
    try {
      loadConfig(dir);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ConfigValidationError);
    expect((thrown as Error).message).toContain("severityOverrides");
    expect((thrown as Error).message).toContain("eror");
    expect((thrown as Error).message).toContain("error|warning|info");
  });

  it("keeps unknown rule IDs in severityOverrides but warns when knownRuleIds is provided (M4)", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ severityOverrides: { "QA-NOPE-999": "warning" } }),
    );
    const res = loadConfig(dir, {
      knownRuleIds: new Set(["QA-TEST-001"]),
    });
    expect(res.config.severityOverrides?.["QA-NOPE-999"]).toBe("warning");
    expect(res.warnings.join("\n")).toContain("QA-NOPE-999");
    expect(res.warnings.join("\n")).toContain("no registered rule");
  });

  it("does not warn about unknown rule IDs when knownRuleIds is not provided", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ severityOverrides: { "QA-PLUGIN-RULE": "info" } }),
    );
    expect(loadConfig(dir).warnings).toEqual([]);
  });
});

describe("isSuppressionActive", () => {
  const now = new Date("2026-08-24T00:00:00Z");

  it("active without expiry", () => {
    expect(isSuppressionActive({ ruleId: "R", reason: "r" }, now)).toBe(true);
  });

  it("active before expiry", () => {
    expect(
      isSuppressionActive(
        { ruleId: "R", reason: "r", expires: "2027-01-01" },
        now,
      ),
    ).toBe(true);
  });

  it("expired after expiry date", () => {
    expect(
      isSuppressionActive(
        { ruleId: "R", reason: "r", expires: "2020-01-01" },
        now,
      ),
    ).toBe(false);
  });
});

describe("applySeverityOverrides", () => {
  it("overrides matching rule severities only", () => {
    const findings = [
      { ruleId: "A", severity: "error" as const },
      { ruleId: "B", severity: "error" as const },
    ];
    applySeverityOverrides(findings, {
      severityOverrides: { A: "warning" },
    });
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[1]?.severity).toBe("error");
  });

  it("never applies an invalid severity from a programmatically-built config (M4 defense in depth)", () => {
    const findings = [{ ruleId: "A", severity: "error" as const }];
    applySeverityOverrides(findings, {
      severityOverrides: { A: "eror" } as unknown as Record<string, "error">,
    });
    // An invalid override must be ignored, not applied — applying it used
    // to NaN the score and un-gate the rule.
    expect(findings[0]?.severity).toBe("error");
  });
});

describe("suppressions report", () => {
  it("empty report when no config", () => {
    expect(loadSuppressions(dir)).toEqual({
      total: 0,
      active: 0,
      expired: 0,
      entries: [],
    });
  });

  it("classifies active vs expired entries", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [
          { ruleId: "QA-A", reason: "tracked elsewhere" },
          { ruleId: "QA-B", reason: "old debt", expires: "2020-01-01" },
        ],
      }),
    );
    const rep = loadSuppressions(dir);
    expect(rep.total).toBe(2);
    expect(rep.active).toBe(1);
    expect(rep.expired).toBe(1);
  });

  it("enforces suppressions in the alternate .mjolnir.json config name too (bug-audit M6)", () => {
    // loadSuppressions used to read only mjolnir.config.json — entries in
    // the alternate name were silently unenforced.
    writeFileSync(
      join(dir, ".mjolnir.json"),
      JSON.stringify({
        ignore: [{ ruleId: "QA-C", reason: "tracked in the other name" }],
      }),
    );
    const rep = loadSuppressions(dir);
    expect(rep.total).toBe(1);
    expect(rep.active).toBe(1);
  });

  it("propagates a corrupted config instead of lying with an empty report (bug-audit M6)", () => {
    // The old swallow turned `{ broken` into total: 0 — so
    // `mjolnir suppressions` printed "Full transparency maintained."
    // while the scan path failed loudly on the same file.
    writeFileSync(join(dir, "mjolnir.config.json"), "{ broken");
    expect(() => loadSuppressions(dir)).toThrow(ConfigValidationError);
  });
});

describe("renderSuppressions", () => {
  it("renders empty state", () => {
    expect(
      renderSuppressions({ total: 0, active: 0, expired: 0, entries: [] }),
    ).toMatch(/No configured suppression entries/);
  });

  it("renders governance header and entries with status glyphs", () => {
    const out = renderSuppressions({
      total: 2,
      active: 1,
      expired: 1,
      entries: [
        {
          ruleId: "QA-A",
          reason: "why",
          status: "active",
          expires: "2027-01-01",
        },
        { ruleId: "QA-B", reason: "old", status: "expired" },
      ],
    });
    expect(out).toContain("QUALITY GOVERNANCE");
    expect(out).toContain("Configured entries:    2");
    expect(out).toContain("● QA-A — why (expires 2027-01-01)");
    expect(out).toContain("○ QA-B — old");
  });
});
