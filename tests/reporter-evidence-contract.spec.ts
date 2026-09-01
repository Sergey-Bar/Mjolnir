/**
 * Reporter evidence-level contract (Master-Stabilization-Plan Sprint 2,
 * Task 12).
 *
 * Upgrade-Plan-v3's trust item #2 requires `confidence`/`evidenceLevel`
 * to appear in user-visible output, not just internal types — an E0
 * (observation-only) finding rendered indistinguishably from an E2
 * (deterministic-defect) finding would silently defeat the whole
 * Honesty Core mechanism. This test audits every *finding* reporter
 * that actually ships (terminal, JSON, SARIF — there is no
 * `--format markdown` for scan findings; `mjolnir rules --md` is a
 * rule-catalog reporter, audited separately below) and asserts the
 * evidence level for a specific finding is recoverable from each one.
 */

import { describe, expect, it } from "vitest";
import {
  deriveEvidenceLevel,
  type Finding,
  type ScanResult,
} from "../src/types.js";
import { renderSarif } from "../src/reporter/sarif.js";
import { renderTerminal } from "../src/reporter/terminal.js";
import {
  buildCatalog,
  renderCatalogMd,
} from "../src/commands/rules-catalog.js";
import { RULES } from "../src/rules/index.js";

function makeFinding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-EVIDENCE",
    category: "QA-TEST",
    severity: "warning",
    confidence: "low",
    findingType: "heuristic-risk",
    qaImpact: "HYGIENE",
    evidenceLevel: "E1",
    file: "evidence.spec.ts",
    line: 7,
    column: 1,
    message: "EVIDENCE-CONTRACT-PROBE",
    why: "why",
    fix: "fix",
    ...over,
  };
}

function makeResult(findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 90,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

describe("evidence level reaches every finding reporter that ships", () => {
  it("JSON: evidenceLevel is a literal field on the serialized finding", () => {
    const result = makeResult([makeFinding({ evidenceLevel: "E2" })]);
    // The JSON contract IS the ScanResult shape — no separate renderer
    // to audit; JSON.stringify is the reporter.
    const json = JSON.parse(JSON.stringify(result)) as ScanResult;
    expect(json.findings[0]?.evidenceLevel).toBe("E2");
  });

  it("SARIF: evidenceLevel appears in result.properties", () => {
    const result = makeResult([makeFinding({ evidenceLevel: "E0" })]);
    const sarif = JSON.parse(renderSarif(result)) as {
      runs: Array<{
        results: Array<{ properties: Record<string, unknown> }>;
      }>;
    };
    const props = sarif.runs[0]?.results[0]?.properties;
    expect(
      props?.evidenceLevel,
      "SARIF result.properties must carry evidenceLevel so a Code " +
        "Scanning consumer can distinguish an observation from a " +
        "deterministic defect, not just severity",
    ).toBe("E0");
  });

  it("terminal: the [E<n> …] tag is visible per finding, distinct per level", () => {
    const e0 = renderTerminal(
      makeResult([makeFinding({ evidenceLevel: "E0", message: "PROBE-E0" })]),
      { isTTY: false },
    );
    const e2 = renderTerminal(
      makeResult([makeFinding({ evidenceLevel: "E2", message: "PROBE-E2" })]),
      { isTTY: false },
    );
    // Card evidence tags name the level AND its epistemic kind.
    expect(e0).toContain("[E0 · observation]");
    expect(e2).toContain("[E2 · deterministic]");
    expect(e0).not.toContain("[E2");
  });

  it("terminal: advisory (E0) findings are called out honestly in the footer", () => {
    const out = renderTerminal(
      makeResult([makeFinding({ evidenceLevel: "E0" })]),
      { isTTY: false },
    );
    expect(out).toMatch(/advisory finding/);
    expect(out).toContain("no score impact");
  });

  it("terminal: falls back to the honest derivation when evidenceLevel is unstamped", () => {
    // A finding that reached the reporter without stampEvidenceLevels
    // having run (e.g. a bug upstream) must still show something
    // derived, never a blank or a false claim.
    const unstamped = makeFinding({
      findingType: "observation",
      confidence: "low",
    });
    delete (unstamped as { evidenceLevel?: string }).evidenceLevel;
    const out = renderTerminal(makeResult([unstamped]), { isTTY: false });
    expect(out).toContain(
      `[${deriveEvidenceLevel("observation", "low")} · observation]`,
    );
  });
});

describe("rule-catalog markdown reporter (mjolnir rules --md)", () => {
  // There is no --format markdown for scan findings (only terminal/
  // json/sarif exist) — the rule catalog is this repo's one markdown
  // reporter, and it carries evidence level per rule.
  it("every catalog row includes the rule's effective evidence level", () => {
    const entries = buildCatalog(RULES);
    expect(entries.length).toBeGreaterThan(0);
    const md = renderCatalogMd(entries);
    const rows = md.split("\n").filter((l) => l.startsWith("| QA-"));
    expect(rows.length).toBe(entries.length);
    for (const row of rows) {
      const id = row.split("|")[1]?.trim();
      const entry = entries.find((e) => e.id === id);
      expect(entry).toBeDefined();
      expect(
        row,
        `rules --md row for ${id} is missing its own evidenceLevel (${entry?.evidenceLevel})`,
      ).toContain(` ${entry?.evidenceLevel} `);
    }
  });
});
