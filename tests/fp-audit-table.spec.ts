/**
 * Count-lock table generator (Master-Stabilization-Plan Sprint 2, Task 10).
 *
 * The generator (`scripts/generate-fp-audit-table.ts`) turns the
 * committed `tests/corpus/baseline/*.json` files into a markdown page —
 * it must never be hand-edited, since the whole point is that it cannot
 * drift from what `npm run corpus:regression` actually measured. This test
 * proves the render function produces valid, deterministic markdown
 * from a fixture baseline, independent of whatever the real baseline
 * currently contains.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  registryRuleIds,
  renderFpAuditMd,
  renderMeasuredFpAudit,
} from "../scripts/generate-fp-audit-table.js";
import { RULES } from "../src/rules/index.js";

const ROOT = join(import.meta.dirname, "..");
const BASELINE_DIR = join(ROOT, "tests", "corpus", "baseline");
const AUDIT_SOURCE = readFileSync(
  join(ROOT, "tests", "corpus", "audit.ts"),
  "utf8",
);
const GENERATOR_SOURCE = readFileSync(
  join(ROOT, "scripts", "generate-fp-audit-table.ts"),
  "utf8",
);

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

describe("renderFpAuditMd", () => {
  it("produces valid markdown from a fixture baseline", () => {
    const md = renderFpAuditMd(
      [
        {
          name: "example-repo",
          countsByRule: { "QA-TEST-001": 2, "QA-PW-004": 1 },
          totalFindings: 3,
        },
      ],
      FIXED_DATE,
    );
    expect(md).toContain("# Corpus Count Lock");
    expect(md).toContain("## example-repo");
    expect(md).toContain("| QA-PW-004 | 1 |");
    expect(md).toContain("| QA-TEST-001 | 2 |");
    expect(md).toContain("Total findings: **3**");
    expect(md).toContain("npm run corpus:regression");
  });

  it("is deterministic for identical input", () => {
    const baselines = [
      {
        name: "a",
        countsByRule: { "QA-TEST-001": 1 },
        totalFindings: 1,
      },
    ];
    expect(renderFpAuditMd(baselines, FIXED_DATE)).toBe(
      renderFpAuditMd(baselines, FIXED_DATE),
    );
  });

  it("handles a repo with zero findings honestly, not by omission", () => {
    const md = renderFpAuditMd(
      [{ name: "clean-repo", countsByRule: {}, totalFindings: 0 }],
      FIXED_DATE,
    );
    expect(md).toContain("## clean-repo");
    expect(md).toContain("No findings recorded");
  });

  it("does not silently ignore an unrecognized repo name", () => {
    // Repos without a CORPUS_NOTES entry still render — no note/link,
    // but never a crash or a dropped section.
    const md = renderFpAuditMd(
      [{ name: "unknown-repo", countsByRule: { X: 1 }, totalFindings: 1 }],
      FIXED_DATE,
    );
    expect(md).toContain("## unknown-repo");
    expect(md).toContain("| X | 1 |");
  });
});

describe("generated docs/COUNT-LOCK.md", () => {
  it("exists and is non-empty (generated at least once)", () => {
    const outPath = join(ROOT, "docs", "COUNT-LOCK.md");
    const content = readFileSync(outPath, "utf8");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("# Corpus Count Lock");
  });

  it("covers every committed baseline file", () => {
    const outPath = join(ROOT, "docs", "COUNT-LOCK.md");
    const content = readFileSync(outPath, "utf8");
    const baselineNames = readdirSync(BASELINE_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
    expect(baselineNames.length).toBeGreaterThan(0);
    for (const name of baselineNames) {
      expect(
        content,
        `docs/COUNT-LOCK.md is missing a section for baseline "${name}" — ` +
          `regenerate with npm run fp-audit:generate`,
      ).toContain(`## ${name}`);
    }
  });
});

describe("coverage denominator is the whole registry", () => {
  // Regression lock for a real, shipped defect: registryRuleIds() used to
  // grep source for `id: "QA-…"`, which misses every rule declared as a
  // positional factory argument by the Phase 6 families. Seven real rules
  // (QA-CS-106/110/111, QA-JV-106/110/111, QA-PY-104 — all Java/C#/Python)
  // were invisible, so the honesty document reported the rule base as 84
  // when it was 91, understating exactly the newest adapters' coverage.
  it("registryRuleIds() returns every registered rule, not a regex subset", () => {
    const ids = registryRuleIds();
    expect(ids).toHaveLength(RULES.length);
    expect(new Set(ids)).toEqual(new Set(RULES.map((r) => r.id)));
  });

  it("includes the family-declared rules a source grep would miss", () => {
    const ids = new Set(registryRuleIds());
    for (const id of [
      "QA-CS-106",
      "QA-CS-110",
      "QA-CS-111",
      "QA-JV-106",
      "QA-JV-110",
      "QA-JV-111",
      "QA-PY-104",
    ]) {
      expect(ids.has(id), `${id} missing from the coverage denominator`).toBe(
        true,
      );
    }
  });

  it("renders the coverage line against the registry size", () => {
    const md = renderMeasuredFpAudit(
      [
        { ruleId: "QA-TEST-001", verdict: "TP" },
        { ruleId: "QA-TEST-001", verdict: "FP" },
      ],
      new Date("2026-01-01"),
      registryRuleIds(),
    );
    expect(md).toContain(`/${RULES.length} rules measured`);
  });
});

describe("CORPUS_NOTES stays in sync with tests/corpus/audit.ts", () => {
  it("every repo name in audit.ts's CORPUS list has a CORPUS_NOTES entry", () => {
    const nameMatches = [...AUDIT_SOURCE.matchAll(/name:\s*"([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(nameMatches.length).toBeGreaterThan(0);
    for (const name of nameMatches) {
      expect(
        GENERATOR_SOURCE,
        `tests/corpus/audit.ts's CORPUS list has "${name}" but ` +
          `scripts/generate-fp-audit-table.ts's CORPUS_NOTES does not — ` +
          `the generated page would show that repo with no source link.`,
      ).toContain(`"${name}"`);
    }
  });
});
