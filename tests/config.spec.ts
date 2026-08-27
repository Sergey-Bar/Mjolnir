import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applySeverityOverrides,
  isSuppressionActive,
  loadConfig,
} from "../src/config/config.js";
import {
  loadSuppressions,
  renderSuppressions,
} from "../src/config/suppressions.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cfg-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns empty config when no file present", () => {
    expect(loadConfig(dir)).toEqual({ config: {}, path: null });
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

  it("returns empty on unreadable config", () => {
    writeFileSync(join(dir, "mjolnir.config.json"), "{ broken");
    expect(loadSuppressions(dir).total).toBe(0);
  });
});

describe("renderSuppressions", () => {
  it("renders empty state", () => {
    expect(
      renderSuppressions({ total: 0, active: 0, expired: 0, entries: [] }),
    ).toMatch(/No suppressed findings/);
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
    expect(out).toContain("Suppressed findings: 2");
    expect(out).toContain("● QA-A — why (expires 2027-01-01)");
    expect(out).toContain("○ QA-B — old");
  });
});
