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

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  checkUnclassifiedCompleteness,
  checkUnsureAdjudication,
  collectUnclassified,
  collectUnsure,
  loadUnclassifiedCeiling,
  loadUnsureCeiling,
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

describe("renderFpAuditMd", () => {
  it("produces valid markdown from a fixture baseline", () => {
    const md = renderFpAuditMd([
      {
        name: "example-repo",
        countsByRule: { "QA-TEST-001": 2, "QA-PW-004": 1 },
        totalFindings: 3,
      },
    ]);
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
    expect(renderFpAuditMd(baselines)).toBe(renderFpAuditMd(baselines));
  });

  it("handles a repo with zero findings honestly, not by omission", () => {
    const md = renderFpAuditMd([
      { name: "clean-repo", countsByRule: {}, totalFindings: 0 },
    ]);
    expect(md).toContain("## clean-repo");
    expect(md).toContain("No findings recorded");
  });

  it("does not silently ignore an unrecognized repo name", () => {
    // Repos without a CORPUS_NOTES entry still render — no note/link,
    // but never a crash or a dropped section.
    const md = renderFpAuditMd([
      { name: "unknown-repo", countsByRule: { X: 1 }, totalFindings: 1 },
    ]);
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

describe("unclassified-verdict completeness ratchet (bug-audit B4.29, L13)", () => {
  it("collectUnclassified() counts blank verdict rows per file", () => {
    const report = collectUnclassified();
    expect(report.total).toBe(
      Object.values(report.byFile).reduce((a, b) => a + b, 0),
    );
  });

  it("the committed ceiling is an upper bound — a growing backlog fails the generator", () => {
    const report = collectUnclassified();
    const ceiling = loadUnclassifiedCeiling();
    // The generator itself must pass right now (the docs-drift CI job
    // runs it); this is the same check main() performs before writing.
    expect(() => checkUnclassifiedCompleteness(report, false)).not.toThrow();
    // And the committed ceiling must actually bound the current state —
    // otherwise the ratchet is decoration.
    for (const [file, count] of Object.entries(report.byFile)) {
      expect(
        count,
        `${file} has more unclassified rows than its committed ceiling allows`,
      ).toBeLessThanOrEqual(ceiling.byFile[file] ?? 0);
    }
  });

  it("any growth beyond the committed ceiling throws with the offending file named", () => {
    const ceiling = loadUnclassifiedCeiling();
    // The --update branch below rewrites the COMMITTED ceiling file —
    // snapshot and restore it so the test leaves the ratchet untouched.
    const committed = readFileSync(
      join(ROOT, "tests", "corpus", "verdicts", "unclassified-ceiling.json"),
      "utf8",
    );
    try {
      const grown = {
        total: ceiling.total + 3,
        byFile: { ...ceiling.byFile, "new-repo.jsonl": 3 },
      };
      let message = "";
      try {
        checkUnclassifiedCompleteness(grown, false);
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      expect(message).toContain("completeness gate failed");
      // --update records instead of failing (the review escape hatch).
      expect(() => checkUnclassifiedCompleteness(grown, true)).not.toThrow();
    } finally {
      writeFileSync(
        join(ROOT, "tests", "corpus", "verdicts", "unclassified-ceiling.json"),
        committed,
      );
    }
  });
});

describe("UNSURE adjudication ratchet (plan §11.5)", () => {
  it("collectUnsure() counts UNSURE rows per rule and the total is their sum", () => {
    const report = collectUnsure();
    expect(report.total).toBe(
      Object.values(report.byRule).reduce((a, b) => a + b, 0),
    );
  });

  it("the committed ceiling is an upper bound — a growing UNSURE backlog fails the generator", () => {
    const report = collectUnsure();
    const ceiling = loadUnsureCeiling();
    // The generator itself must pass right now (the docs-drift CI job
    // runs it); this is the same check main() performs before writing.
    expect(() => checkUnsureAdjudication(report, false)).not.toThrow();
    // And the committed ceiling must actually bound the current state —
    // otherwise the ratchet is decoration.
    for (const [ruleId, count] of Object.entries(report.byRule)) {
      expect(
        count,
        `${ruleId} has more UNSURE rows than its committed ceiling allows`,
      ).toBeLessThanOrEqual(ceiling.byRule[ruleId] ?? 0);
    }
  });

  it("any growth beyond the committed ceiling throws with the offending rule named; --update records instead", () => {
    const ceiling = loadUnsureCeiling();
    const committed = readFileSync(
      join(ROOT, "tests", "corpus", "verdicts", "unsure-ceiling.json"),
      "utf8",
    );
    try {
      const grown = {
        total: ceiling.total + 2,
        byRule: { ...ceiling.byRule, "QA-NOPE-999": 2 },
      };
      let message = "";
      try {
        checkUnsureAdjudication(grown, false);
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      expect(message).toContain("UNSURE adjudication gate failed");
      // --update records instead of failing (the review escape hatch).
      expect(() => checkUnsureAdjudication(grown, true)).not.toThrow();
    } finally {
      writeFileSync(
        join(ROOT, "tests", "corpus", "verdicts", "unsure-ceiling.json"),
        committed,
      );
    }
  });

  it("a shrinking backlog never fails — adjudication lowers the ceiling", () => {
    const report = collectUnsure();
    expect(() => checkUnsureAdjudication(report, false)).not.toThrow();
  });
});
