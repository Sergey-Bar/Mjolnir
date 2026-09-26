/**
 * Legacy import cannot increase trust (plan V5-014).
 *
 * Four generations of trust artifacts exist in the wild, all predating
 * machine-anchored identity: `.mjolnir/baseline.json`, `.mjolnir/trend.jsonl`,
 * the historical-trust ledger, and the M50 release-proof records. They are real
 * evidence of what was observed. None of it is proof of what produced it.
 *
 * The property under test is the one that gets forgotten: importing a legacy
 * artifact records that history exists, and does NOT upgrade that history. A
 * migrator that emitted VERIFIED would be a supply-chain-grade bug wearing a
 * data-migration costume — it would convert unproven bytes into a basis for
 * release decisions, and the only trace would be a word in a JSON field.
 *
 * Idempotence is asserted for the same reason: records are content-addressed,
 * so a routine command that re-imports on every run would grow history without
 * anyone deciding to.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  appliedMigrationIds,
  importLegacy,
  legacyTrust,
  legacyTrustAllows,
  MIGRATIONS,
} from "../../src/store/legacy-import.js";
import { EvidenceStore } from "../../src/store/evidence-store.js";

function fixture(): { root: string; store: EvidenceStore } {
  const root = mkdtempSync(join(tmpdir(), "mj-legacy-"));
  mkdirSync(join(root, ".mjolnir"), { recursive: true });
  writeFileSync(
    join(root, ".mjolnir", "baseline.json"),
    JSON.stringify({ version: 1, baselineScore: 80, rules: ["QA-TEST-001"] }),
    "utf8",
  );
  writeFileSync(
    join(root, ".mjolnir", "trend.jsonl"),
    [
      JSON.stringify({ at: "2026-01-01", score: 70 }),
      JSON.stringify({ at: "2026-02-01", score: 78 }),
      "not json — a damaged line",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(root, ".mjolnir", "trust-history.jsonl"),
    JSON.stringify({ at: "2026-01-01", level: "L1" }),
    "utf8",
  );
  writeFileSync(
    join(root, "release-proof.jsonl"),
    JSON.stringify({ candidate: "3.0.0", verdict: "GO" }),
    "utf8",
  );
  return { root, store: new EvidenceStore(join(root, ".mjolnir", "store")) };
}

describe("import records history without upgrading it", () => {
  it("every imported record is OPEN, and never VERIFIED", () => {
    const { root, store } = fixture();
    try {
      const report = importLegacy(store, root);
      // The report's trust is the union type, because a caller receiving a
      // report has no business assuming which state it is in.
      expect(report.trust.state).toBe("OPEN");
      if (report.trust.state === "OPEN") {
        expect(report.trust.reason).toMatch(/no run identity/);
      }
      // The store contains real records...
      expect(report.totalDigests).toBeGreaterThan(0);
      // ...and not one of them claims to be verified. A record has no trust
      // field of its own here; the trust is the import's declaration, so the
      // assertion that matters is that no migrator can produce VERIFIED.
      for (const result of report.results) {
        expect(result.format).toMatch(/^legacy-/);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("the registry covers all four legacy formats", () => {
    const { root, store } = fixture();
    try {
      const report = importLegacy(store, root);
      const formats = report.results.map((r) => r.format).sort();
      expect(formats).toEqual([
        "legacy-json",
        "legacy-jsonl",
        "legacy-jsonl",
        "legacy-jsonl",
      ]);
      expect(appliedMigrationIds()).toEqual(
        expect.arrayContaining([
          "baseline@1",
          "trend@1",
          "historical-trust@1",
          "m50-release-proof@1",
        ]),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("a damaged line is counted, not silently skipped", () => {
    const { root, store } = fixture();
    try {
      const trend = importLegacy(store, root).results.find((r) =>
        r.origin.includes("trend"),
      );
      expect(trend?.unreadable).toBe(1);
      expect(trend?.imported).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("a missing legacy file is not an error", () => {
    const root = mkdtempSync(join(tmpdir(), "mj-legacy-empty-"));
    try {
      const store = new EvidenceStore(join(root, "store"));
      const report = importLegacy(store, root);
      expect(report.totalDigests).toBe(0);
      for (const result of report.results) {
        expect(result.unreadable).toBe(0);
        expect(result.imported).toBe(0);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("import is idempotent", () => {
  it("a second run imports nothing and creates no new records", () => {
    const { root, store } = fixture();
    try {
      const first = importLegacy(store, root);
      const firstDigests = store.digests();
      const second = importLegacy(store, root);

      expect(second.totalDigests).toBe(first.totalDigests);
      expect(store.digests()).toEqual(firstDigests);
      expect(second.results.reduce((n, r) => n + r.imported, 0)).toBe(0);
      expect(second.results.reduce((n, r) => n + r.alreadyPresent, 0)).toBe(
        first.results.reduce((n, r) => n + r.imported, 0),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("a third run is still stable", () => {
    const { root, store } = fixture();
    try {
      importLegacy(store, root);
      const after = store.digests().length;
      importLegacy(store, root);
      importLegacy(store, root);
      expect(store.digests().length).toBe(after);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("repeated lines inside one artifact import once", () => {
    const root = mkdtempSync(join(tmpdir(), "mj-legacy-dup-"));
    try {
      mkdirSync(join(root, ".mjolnir"), { recursive: true });
      const line = JSON.stringify({ at: "2026-01-01", score: 70 });
      writeFileSync(
        join(root, ".mjolnir", "trend.jsonl"),
        [line, line, line].join("\n"),
        "utf8",
      );
      const store = new EvidenceStore(join(root, ".mjolnir", "store"));
      const report = importLegacy(store, root);
      const trend = report.results.find((r) => r.origin.includes("trend"));
      expect(trend?.imported).toBe(1);
      expect(trend?.digests).toHaveLength(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("what an OPEN record may be used for", () => {
  it("may be replayed, compared, and displayed", () => {
    const open = legacyTrust();
    expect(legacyTrustAllows(open, "REPLAY_HISTORY")).toBe(true);
    expect(legacyTrustAllows(open, "REGRESSION_COMPARISON")).toBe(true);
    expect(legacyTrustAllows(open, "DISPLAY_PRIOR_OBSERVATION")).toBe(true);
  });

  it("may NEVER be the sole basis for a verdict", () => {
    // This is the whole point of the module. An unverified prior observation
    // can support "worse than last time"; it can never support "clean".
    const open = legacyTrust();
    expect(legacyTrustAllows(open, "SOLE_BASIS_FOR_VERDICT")).toBe(false);
    expect(
      legacyTrustAllows(
        { state: "VERIFIED", scanId: "s" },
        "SOLE_BASIS_FOR_VERDICT",
      ),
    ).toBe(true);
  });

  it("every migration uses the one trust record, so OPEN means one thing", () => {
    // A second wording elsewhere is how a reader ends up unsure whether OPEN
    // carries the same weight in two places.
    expect(legacyTrust().reason).toMatch(/no run identity/);
    expect(legacyTrust().reason).toMatch(/not a basis for a verdict/);
  });

  it("the registry is data, not a hard-coded call list", () => {
    // A custom migration can be supplied, which is what makes the registry
    // worth having rather than a switch statement.
    const root = mkdtempSync(join(tmpdir(), "mj-legacy-custom-"));
    try {
      const store = new EvidenceStore(join(root, "store"));
      let ran = 0;
      const report = importLegacy(store, root, [
        ...MIGRATIONS,
        {
          id: "custom@1",
          format: "custom",
          run: (s) => {
            ran++;
            const envelope = s.put({ custom: true });
            return {
              origin: "custom",
              format: "custom",
              imported: 1,
              alreadyPresent: 0,
              unreadable: 0,
              digests: [envelope.digest],
            };
          },
        },
      ]);
      expect(ran).toBe(1);
      expect(report.results.some((r) => r.format === "custom")).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
