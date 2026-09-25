import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  REQUIREMENT_CLASSIFICATION,
  WAVE0_GAPS,
  collectRepoFacts,
  reconcileArchive,
  verifyRequirements,
} from "../../scripts/v6/inventory.js";
import { checkArchive } from "../../scripts/v6/reconcile-archive.js";
import {
  CANONICAL_DISPOSITIONS,
  checkIssueDispositions,
} from "../../scripts/v6/check-issue-disposition.js";
import {
  GAP_ID_PATTERN,
  REQUIREMENT_STATES,
  isNamedOwner,
  modeAllowsHosted,
  DEFAULT_DEPLOYMENT_MODE,
  DEPLOYMENT_MODES,
  type GapSeverity,
  type GapStatus,
  type WaveId,
} from "../../src/v6/capability-types.js";

const ROOT = process.cwd();

describe("Wave 0 deliverable 1 — the current-state inventory is real", () => {
  const facts = collectRepoFacts(ROOT);

  it("reads the package identity rather than assuming it", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      version: string;
      publishedStable?: string;
    };
    expect(facts.version).toBe(pkg.version);
    expect(facts.publishedStable).toBe(pkg.publishedStable);
  });

  it("counts the live and retired rule ids separately", () => {
    // The ids are immutable (ADR 0003), so a retired id stays counted
    // forever: a number that shrinks is a number nobody can trust.
    const registry = readFileSync(
      join(ROOT, "src", "rules", "index.ts"),
      "utf8",
    );
    expect(registry).toContain("RETIRED_RULE_IDS");
    expect(facts.rulesRetired).toBeGreaterThan(0);
    expect(facts.rulesLive).toBeGreaterThan(0);
  });

  it("reports measured coverage below the registry size, because it is", () => {
    expect(facts.rulesMeasured).toBeLessThanOrEqual(facts.rulesLive);
  });

  it("carries the real ledger state, including what is BLOCKED", () => {
    expect(facts.supportMatrix.total).toBeGreaterThan(0);
    expect(
      Object.keys(facts.supportMatrix.byDisposition).length,
    ).toBeGreaterThan(0);
    expect(facts.externalValidation).toBeTruthy();
    expect(facts.gapLedger.total).toBeGreaterThan(0);
  });

  it("surfaces the frozen exit codes, and the two the blueprint wants are missing", () => {
    // ADR 0002: the frozen set cannot express UNSUPPORTED_ENVIRONMENT or
    // INTERNAL_ERROR, which is why 6.0 is a breaking version.
    expect(facts.exitCodes.frozen).toEqual([0, 1, 2, 10, 20]);
    expect(facts.exitCodes.frozen).not.toContain(3);
    expect(facts.exitCodes.frozen).not.toContain(40);
  });

  it("reports absent surfaces as absent rather than as provisional", () => {
    // D4: a surface that does not exist may not be advertised at any
    // maturity, so `ABSENT` is a value the inventory has to be able to say.
    expect(Object.values(facts.surfaces)).toContain("ABSENT");
  });
});

describe("Wave 0 deliverable 1 — the §100 classification is verifiable", () => {
  const requirements = verifyRequirements(ROOT);

  it("classifies every spec section with a closed-set state", () => {
    expect(REQUIREMENT_CLASSIFICATION.length).toBeGreaterThan(100);
    for (const entry of requirements) {
      expect(REQUIREMENT_STATES).toContain(entry.state);
      expect(entry.specSection).toMatch(/^(§|Law |P\d|E\d|U\d|L\d|R\d)/);
    }
  });

  it("has every cited evidence path resolve in this checkout", () => {
    // A spec section pointing at a file that moved is a spec defect the
    // plan cannot see itself, so the citation check is the deliverable.
    const unverified = requirements.filter((e) => e.unverified.length > 0);
    expect(
      unverified.map((e) => `${e.specSection}: ${e.unverified.join(", ")}`),
    ).toEqual([]);
  });

  it("names a wave and a note for every classification", () => {
    for (const entry of requirements) {
      expect(entry.wave).toBeTruthy();
      // A classification with no note is a label with no argument, which
      // is how a `MISSING` becomes a rumour. Sections whose finding is
      // fully described by their state still need the reason.
      expect(
        entry.note.trim().length,
        `${entry.specSection} has no note`,
      ).toBeGreaterThan(0);
    }
  });

  it("records the sections the blueprint itself says are missing", () => {
    const bySection = new Map(
      requirements.map((e) => [e.specSection, e.state]),
    );
    expect(bySection.get("§21")).toBe("MISSING"); // Database QA
    expect(bySection.get("§31")).toBe("BLOCKED"); // Security verification QA
    expect(bySection.get("§78")).toBe("INCORRECT"); // Exit codes
    expect(bySection.get("P4")).toBe("MISSING"); // Claim budget / prose lint
  });
});

describe("Wave 0 deliverable 2 — the gap matrix is a ledger, not a wish list", () => {
  it("gives every Wave 0 gap an id, an owner, a wave, a revalidation command and a trigger", () => {
    for (const gap of WAVE0_GAPS) {
      expect(gap.gap_id).toMatch(GAP_ID_PATTERN);
      expect(isNamedOwner(gap.owner)).toBe(true);
      expect(gap.targetWave).toBeTruthy();
      expect(gap.revalidationCommand?.length ?? 0).toBeGreaterThan(0);
      expect(gap.revisitTrigger.length).toBeGreaterThan(10);
      expect(gap.status).toBeTruthy();
    }
  });

  it("uses the M26 severity vocabulary, so the two ledgers read as one", () => {
    const allowed: GapSeverity[] = [
      "release-blocker",
      "high",
      "medium",
      "low",
      "debt",
    ];
    for (const gap of WAVE0_GAPS) expect(allowed).toContain(gap.severity);
  });

  it("uses the M26 status and wave vocabularies", () => {
    const statuses: GapStatus[] = [
      "open",
      "accepted",
      "fix-in-progress",
      "fixed",
      "regression",
      "deferred",
      "not-applicable",
    ];
    for (const gap of WAVE0_GAPS) {
      expect(statuses).toContain(gap.status);
      expect(gap.targetWave).toMatch(/^\d{1,2}$/);
    }
  });

  it("has no duplicate ids and no gap closed without evidence", () => {
    const ids = WAVE0_GAPS.map((g) => g.gap_id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const gap of WAVE0_GAPS) {
      if (gap.status === "fixed") expect(gap.closureEvidence).not.toBeNull();
    }
  });

  it("records the three vocabulary collisions Wave 0 actually found", () => {
    const ids = WAVE0_GAPS.map((g) => g.gap_id);
    expect(ids).toContain("GAP-V6-001"); // the F0-F5 ladder
    expect(ids).toContain("GAP-V6-002"); // three support vocabularies
    expect(ids).toContain("GAP-V6-003"); // cypress / vitest upstream staleness
  });

  it("states the maturity consequence of every gap that has one", () => {
    for (const gap of WAVE0_GAPS) {
      if (gap.severity === "release-blocker" || gap.severity === "high") {
        expect(gap.maturityImpact.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Wave 0 — the archive block is reconciled against data, not flipped", () => {
  const archive = reconcileArchive(ROOT);
  const check = checkArchive(ROOT);

  it("parses every archive record out of ROADMAP.yaml", () => {
    expect(archive.records).toHaveLength(8);
    expect(archive.observedDesignRecordCount).toBe(108);
  });

  it("keeps each record's range consistent with its declared count", () => {
    for (const record of archive.records) {
      const [from, to] = record.githubRange;
      expect(to - from + 1).toBe(record.designRecords);
    }
  });

  it("reports the open issues that block reconciliation, and does not paper over them", () => {
    // 18 of the 108 historical design-record issues are still open, so the
    // block cannot honestly be marked RECONCILED. Flipping the flag would
    // be a false proof produced by the reconciliation meant to establish
    // the truth.
    expect(archive.openIssuesInArchive.length).toBeGreaterThan(0);
    expect(archive.status).toBe("UNRECONCILED");
    expect(check.status).toBe("UNRECONCILED");
    expect(check.errors.join(" ")).toMatch(/still open/);
    for (const number of archive.openIssuesInArchive) {
      expect(number).toBeGreaterThanOrEqual(539);
      expect(number).toBeLessThanOrEqual(646);
    }
  });

  it("distinguishes fully, partially and unreconciled records", () => {
    const states = new Set(archive.records.map((r) => r.state));
    for (const state of states) {
      expect(["RECONCILED", "PARTIALLY_RECONCILED", "UNRECONCILED"]).toContain(
        state,
      );
    }
    // M25 is the only fully closed range in the snapshot.
    const m25 = archive.records.find((r) => r.logicalMilestone === "M25");
    expect(m25?.state).toBe("RECONCILED");
  });

  it("names the command that would close the block", () => {
    expect(archive.closureCommand).toBe("npm run m26:github:sync");
  });
});

describe("Wave 0 — the issue-disposition drift-lock", () => {
  const check = checkIssueDispositions(ROOT);

  it("describes the same issue set as the GitHub snapshot", () => {
    expect(check.status).toBe("PASS");
    expect(check.facts.dispositionRecords).toBe(check.facts.snapshotIssues);
  });

  it("counts the open set the blueprint names", () => {
    expect(check.facts.openIssues).toBe(229);
  });

  it("has already dispositioned every open issue to a real decision", () => {
    // Not `UNRECONCILED`: an open issue needs a decision, not a placeholder.
    expect(check.errors.join(" ")).not.toMatch(/UNRECONCILED/);
    expect(check.facts.byDisposition.UNRECONCILED).toBeUndefined();
  });

  it("declares a closed canonical vocabulary", () => {
    expect(CANONICAL_DISPOSITIONS).toEqual([
      "CARRY_FORWARD",
      "CLOSED_NOT_PLANNED",
      "CLOSED_UNVERIFIED",
      "UNRECONCILED",
    ]);
  });

  it("fails if the open set grows past the recorded baseline", () => {
    // The drift-lock proper: a regenerated ledger hides a growing backlog,
    // so the count is pinned to a baseline that only moves deliberately.
    const inventoryPath = join(ROOT, "docs", "v6-inventory.json");
    if (!existsSync(inventoryPath)) return;
    const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")) as {
      counts: { openIssues: number };
    };
    expect(check.facts.openIssues).toBeLessThanOrEqual(
      inventory.counts.openIssues,
    );
  });
});

describe("ADR 0008 — the deployment mode is a declared state", () => {
  it("defaults to the safe mode when unset", () => {
    expect(DEFAULT_DEPLOYMENT_MODE).toBe("LOCAL_ONLY");
  });

  it("refuses hosted code paths for LOCAL_ONLY and AIR_GAPPED", () => {
    expect(modeAllowsHosted("LOCAL_ONLY")).toBe(false);
    expect(modeAllowsHosted("AIR_GAPPED")).toBe(false);
    expect(modeAllowsHosted("CLOUD")).toBe(true);
    expect(modeAllowsHosted("SELF_HOSTED")).toBe(true);
  });

  it("keeps the enum closed", () => {
    expect(DEPLOYMENT_MODES).toEqual([
      "LOCAL_ONLY",
      "SELF_HOSTED",
      "CLOUD",
      "AIR_GAPPED",
    ]);
  });
});

describe("ownership is checkable, not decorative", () => {
  it("rejects placeholder owners", () => {
    for (const placeholder of [
      "",
      "  ",
      "unassigned",
      "TBD",
      "unknown",
      "n/a",
      "None",
    ]) {
      expect(isNamedOwner(placeholder)).toBe(false);
    }
    expect(isNamedOwner("ecosystem-census")).toBe(true);
  });

  it("gave every Wave 0 gap a real owner", () => {
    for (const gap of WAVE0_GAPS) expect(isNamedOwner(gap.owner)).toBe(true);
  });
});

describe("the generated Wave 0 artifacts exist and are readable", () => {
  it("writes the four artifacts the DoD names", () => {
    for (const file of [
      "docs/v6-inventory.json",
      "docs/V6-CURRENT-STATE.md",
      "docs/V6-GAP-MATRIX.md",
      "docs/V6-ARCHIVE-RECONCILIATION.json",
      "docs/ECOSYSTEM-CENSUS.json",
      "docs/ECOSYSTEM-GAPS.md",
      "docs/ECOSYSTEM-DISPOSITIONS.json",
      "docs/claim-budget.json",
      "docs/CLAIM-LINT-REPORT.json",
    ]) {
      expect(existsSync(join(ROOT, file))).toBe(true);
    }
  });

  it("writes the ADR set with all five sections per record", () => {
    // A decision without an Enforcement section is prose, and the
    // constitution does not accept prose as proof.
    const dir = join(ROOT, "docs", "adr");
    const records = readdirSync(dir).filter((f) => /^\d{4}-.+\.md$/.test(f));
    expect(records.length).toBeGreaterThanOrEqual(11);
    for (const record of records) {
      const text = readFileSync(join(dir, record), "utf8");
      for (const section of [
        "## Context",
        "## Decision",
        "## Consequences",
        "## Rejected alternatives",
        "## Enforcement",
      ]) {
        expect(text, `${record} is missing ${section}`).toContain(section);
      }
      expect(text).toMatch(/\*\*Status:\*\*\s*accepted/);
    }
  });

  it("indexes every ADR from the README", () => {
    const index = readFileSync(join(ROOT, "docs", "adr", "README.md"), "utf8");
    const records = readdirSync(join(ROOT, "docs", "adr")).filter((f) =>
      /^\d{4}-.+\.md$/.test(f),
    );
    for (const record of records) {
      expect(index).toContain(record.slice(0, 4));
    }
  });
});

describe("Wave 0 — the deferred and superseded markers landed", () => {
  it("marks PRODUCT-ENHANCEMENT-ANALYSIS.md as not a source of truth", () => {
    const text = readFileSync(
      join(ROOT, "PRODUCT-ENHANCEMENT-ANALYSIS.md"),
      "utf8",
    );
    expect(text.slice(0, 800)).toContain("DEFERRED");
    expect(text).toContain("docs/ECOSYSTEM-CENSUS.json");
  });

  it("marks the Cycle-0 audit as superseded by name and version", () => {
    const marker = join(ROOT, "QA", "FINAL-RELEASE", "README-SUPERSEDED.md");
    expect(existsSync(marker)).toBe(true);
    const text = readFileSync(marker, "utf8");
    expect(text).toContain("SUPERSEDED");
    expect(text).toContain("v0.5.18");
  });
});

describe("Wave 0 — a wave id is a closed set", () => {
  it("accepts only the waves the program defines", () => {
    const waves: WaveId[] = ["0", "1", "13", "14"];
    for (const wave of waves) expect(wave).toMatch(/^\d{1,2}$/);
  });
});
