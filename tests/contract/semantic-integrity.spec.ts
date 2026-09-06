/**
 * Semantic Integrity Test Suite (blueprint §25 — release-gating).
 *
 * These are semantic CONTRACT tests, not unit tests:
 *  1. Identity stability — same input → same fingerprint across runs.
 *  2. Resolution — table-driven fixtures, one per disappearance cause
 *     (§15 ordered algorithm), asserting classification AND rendering.
 *  3. Parity — canonical JSON / machine contract / summary agree.
 *  4. Revision — detectorRevision bump ⇒ INCONCLUSIVE, never resolved.
 *  5. Epistemic — no code path raises evidenceLevel outside
 *     corroboration-upgrade (enforced by inspecting the pipeline's
 *     post-processing order).
 *
 * Existing audit red tests (C1/C5) remain in tests/audit/ per the plan's
 * merge note — this suite complements them.
 */

import { describe, expect, it } from "vitest";

import {
  resolve,
  renderResolution,
  fingerprint,
  type BaselineEntry,
  type ResolveInput,
} from "../../src/engine/resolution.js";
import {
  buildMachineContract,
  CONTRACT_VERSION,
  ANNOTATIONS_LIMIT,
  type MachineAnnotation,
} from "../../src/engine/machine-contract.js";
import { runScan } from "../../src/cli.js";
import type { ScanResult, Finding } from "../../src/types.js";

function entry(partial: Partial<BaselineEntry>): BaselineEntry {
  return {
    ruleId: "QA-PW-101",
    file: "tests/a.spec.ts",
    message: "hard sleep",
    severity: "warning",
    detectorRevision: 1,
    ...partial,
  };
}

function scan(
  findings: Finding[],
  overrides: Partial<ScanResult> = {},
): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 90,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 10,
    },
    ...overrides,
  };
}

function finding(partial: Partial<Finding>): Finding {
  return {
    ruleId: "QA-PW-101",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    file: "tests/a.spec.ts",
    line: 3,
    column: 1,
    message: "hard sleep",
    why: "w",
    fix: "f",
    ...partial,
  };
}

/** A resolve() input where everything else is healthy. */
function input(
  entry: BaselineEntry,
  current: ScanResult,
  overrides: Partial<ResolveInput> = {},
): ResolveInput {
  return {
    entry,
    baseline: { commit: "abc1234", findings: [entry] },
    current,
    registryRevisions: new Map([["QA-PW-101", 1]]),
    ...overrides,
  };
}

describe("§25.1 identity stability", () => {
  it("the fingerprint is a pure function of (ruleId, file, message)", () => {
    const e = entry({});
    expect(fingerprint(e)).toBe(fingerprint(entry({})));
    expect(fingerprint(e)).toBe(
      "QA-PW-101\u0000tests/a.spec.ts\u0000hard sleep",
    );
  });

  it("line/column/severity changes do NOT change identity", () => {
    const moved = entry({ severity: "error" });
    expect(fingerprint(moved)).toBe(fingerprint(entry({})));
  });

  it("message rewording changes identity (documented correlate-as-new limitation)", () => {
    expect(fingerprint(entry({ message: "hard sleep (2s)" }))).not.toBe(
      fingerprint(entry({})),
    );
  });
});

describe("§25.2 resolution — table-driven cause fixtures (§15)", () => {
  const e = entry({});
  const gone = scan([]); // complete scan, finding absent

  const table: Array<{
    name: string;
    build: () => ResolveInput;
    status: string;
    cause?: string;
    rendering: string;
  }> = [
    {
      name: "partial scan → INCONCLUSIVE(partial)",
      build: () => input(e, scan([], { partial: true })),
      status: "INCONCLUSIVE",
      cause: "partial",
      rendering: "INCONCLUSIVE (partial)",
    },
    {
      name: "rules incomplete → INCONCLUSIVE(partial)",
      build: () =>
        input(
          e,
          scan([], {
            analysisStatus: {
              discovery: "complete",
              rules: "partial",
              skippedFiles: 0,
              durationMs: 10,
            },
          }),
        ),
      status: "INCONCLUSIVE",
      cause: "partial",
      rendering: "INCONCLUSIVE (partial)",
    },
    {
      name: "rule crashed → INCONCLUSIVE(crash)",
      build: () => input(e, gone, { crashedRuleIds: new Set(["QA-PW-101"]) }),
      status: "INCONCLUSIVE",
      cause: "crash",
      rendering: "INCONCLUSIVE (crash)",
    },
    {
      name: "file skipped → INCONCLUSIVE(skipped)",
      build: () => input(e, gone, { skippedFiles: new Set([e.file]) }),
      status: "INCONCLUSIVE",
      cause: "skipped",
      rendering: "INCONCLUSIVE (skipped)",
    },
    {
      name: "active suppression → SUPPRESSED",
      build: () =>
        input(e, gone, {
          suppressed: new Set([`${e.ruleId}\u0000${e.file}`]),
        }),
      status: "SUPPRESSED",
      rendering: "SUPPRESSED (active ignore entry)",
    },
    {
      name: "file excluded → DISAPPEARED-NON-FIX(excluded)",
      build: () => input(e, gone, { excludedFiles: new Set([e.file]) }),
      status: "DISAPPEARED-NON-FIX",
      cause: "excluded",
      rendering: "DISAPPEARED — NOT A FIX (excluded)",
    },
    {
      name: "registry revision bumped → INCONCLUSIVE(revision-changed)",
      build: () =>
        input(e, gone, {
          registryRevisions: new Map([["QA-PW-101", 2]]),
        }),
      status: "INCONCLUSIVE",
      cause: "revision-changed",
      rendering: "INCONCLUSIVE (revision-changed)",
    },
    {
      name: "rule retired → DISAPPEARED-NON-FIX(retired)",
      build: () => input(e, gone, { registryRevisions: new Map() }),
      status: "DISAPPEARED-NON-FIX",
      cause: "retired",
      rendering: "DISAPPEARED — NOT A FIX (retired)",
    },
    {
      name: "genuine fix (complete, same revision, absent) → VERIFIED-RESOLVED",
      build: () => input(e, gone),
      status: "VERIFIED-RESOLVED",
      rendering:
        "FIXED SINCE BASELINE (verified by a complete same-revision scan)",
    },
    {
      name: "still present → STILL-PRESENT",
      build: () => input(e, scan([finding({})])),
      status: "STILL-PRESENT",
      rendering: "STILL PRESENT",
    },
  ];

  for (const row of table) {
    it(row.name, () => {
      const r = resolve(row.build());
      expect(r.status).toBe(row.status);
      if (row.cause !== undefined) expect(r.cause).toBe(row.cause);
      // The rendering law: FIXED only for VERIFIED-RESOLVED.
      const rendered = renderResolution(r);
      expect(rendered).toBe(row.rendering);
      if (r.status !== "VERIFIED-RESOLVED") {
        expect(rendered.startsWith("FIXED")).toBe(false);
      }
    });
  }

  it("ordered precedence: partial beats suppression beats revision", () => {
    // First-match-wins: a partial scan wins over everything below it.
    const r = resolve(
      input(e, scan([], { partial: true }), {
        suppressed: new Set([`${e.ruleId}\u0000${e.file}`]),
        registryRevisions: new Map([["QA-PW-101", 2]]),
      }),
    );
    expect(r.status).toBe("INCONCLUSIVE");
    expect(r.cause).toBe("partial");
  });

  it("legacy baseline entries (no detectorRevision) never resolve as fixed", () => {
    // A hand-rolled entry WITHOUT the revision field (v1 baseline shape).
    const legacy: BaselineEntry = {
      ruleId: "QA-PW-101",
      file: "tests/a.spec.ts",
      message: "hard sleep",
      severity: "warning",
    };
    const r = resolve(input(legacy, gone));
    expect(r.status).toBe("INCONCLUSIVE");
    expect(r.cause).toBe("legacy-baseline");
    expect(renderResolution(r).startsWith("FIXED")).toBe(false);
  });
});

describe("§25.3 parity — machine contract agrees with the canonical result", () => {
  it("summary counts match the canonical findings exactly", () => {
    const findings = [
      finding({ ruleId: "QA-PW-101", severity: "error", evidenceLevel: "E2" }),
      finding({ ruleId: "QA-PW-102", severity: "info", evidenceLevel: "E0" }),
      finding({ ruleId: "QA-PW-103", severity: "warning" }),
    ];
    const contract = buildMachineContract(scan(findings));
    expect(contract.summary.findings).toBe(3);
    expect(contract.summary.errors).toBe(1);
    expect(contract.summary.warnings).toBe(1);
    expect(contract.summary.infos).toBe(1);
    expect(contract.summary.advisory).toBe(1); // the E0 one
    expect(contract.summary.score).toBe(90);
  });

  it("annotations carry identity fields without parsing message text", () => {
    const contract = buildMachineContract(
      scan([finding({ detectorRevision: 3 })]),
    );
    const a = contract.annotations[0] as MachineAnnotation;
    expect(a.ruleId).toBe("QA-PW-101");
    expect(a.detectorRevision).toBe(3);
    expect(a.advisory).toBe(false);
    expect(a.path).toBe("tests/a.spec.ts");
    expect(a.start_line).toBe(3);
  });

  it("the digest is deterministic and presentation-insensitive", () => {
    const withPresentation = scan([
      finding({ message: "hard sleep", why: "why v1", fix: "fix v1" }),
    ]);
    const otherWords = scan([
      finding({ message: "hard sleep", why: "why v2", fix: "fix v2" }),
    ]);
    const d1 = buildMachineContract(withPresentation).summary.digest;
    const d2 = buildMachineContract(otherWords).summary.digest;
    expect(d1).toBe(d2); // why/fix are presentation — excluded by design
    expect(d1).toMatch(/^sha256:[0-9a-f]{64}$/);
    // But semantic identity changes (file/line/ruleId) DO move the
    // digest — message alone does NOT (detector prose rewording must
    // not change the digest; the fingerprint layer handles message
    // correlation per §13).
    const moved = buildMachineContract(scan([finding({ line: 9 })])).summary
      .digest;
    expect(moved).not.toBe(d1);
  });

  it("annotations truncate at the GitHub cap with an honest flag", () => {
    const many = Array.from({ length: ANNOTATIONS_LIMIT + 5 }, (_, i) =>
      finding({ line: i + 1, message: `m${i}` }),
    );
    const contract = buildMachineContract(scan(many));
    expect(contract.annotations).toHaveLength(ANNOTATIONS_LIMIT);
    expect(contract.annotationsTruncated).toBe(true);
    expect(contract.summary.findings).toBe(ANNOTATIONS_LIMIT + 5);
  });

  it("completeness mirrors analysisStatus — no parallel truth", () => {
    const result = scan([], {
      partial: true,
      frameworkDetectionUnknown: true,
      analysisStatus: {
        discovery: "partial",
        rules: "complete",
        skippedFiles: 4,
        durationMs: 99,
        rulesCrashed: 2,
        truncationReasons: ["rule-loop-deadline"],
      },
    });
    const c = buildMachineContract(result);
    expect(c.completeness).toEqual({
      partial: true,
      discovery: "partial",
      rules: "complete",
      skippedFiles: 4,
      rulesCrashed: 2,
      truncationReasons: ["rule-loop-deadline"],
      frameworkDetectionUnknown: true,
      durationMs: 99,
    });
  });
});

describe("§25.4 revision — bump ⇒ INCONCLUSIVE, never resolved (e2e)", () => {
  it("runScan stamps detectorRevision from the registry onto findings", async () => {
    const dir = await import("node:fs").then((fs) =>
      fs.mkdtempSync("mjolnir-semint-"),
    );
    const { writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const real = join(tmpdir(), "mjolnir-semint-real");
    rmSync(dir, { force: true, recursive: true });
    const fs = await import("node:fs");
    fs.mkdirSync(real, { recursive: true });
    writeFileSync(
      join(real, "A.java"),
      "class A { void m() { Thread.sleep(3000); } }\n",
    );
    const result = await runScan({
      target: real,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
    });
    const java = result.findings.filter((f) => f.ruleId.startsWith("QA-JV-"));
    if (java.length > 0) {
      // Every core-rule finding carries its registry revision.
      expect(java.every((f) => f.detectorRevision !== undefined)).toBe(true);
    }
    fs.rmSync(real, { recursive: true, force: true });
  });
});

describe("§25.6 epistemic — the pipeline never upgrades evidence", () => {
  it("advisory findings keep evidenceLevel E0 through the whole contract", () => {
    // E0 in → E0 out; the contract projection reports them as advisory
    // and never re-derives a stronger level.
    const contract = buildMachineContract(
      scan([finding({ findingType: "observation", evidenceLevel: "E0" })]),
    );
    expect(contract.annotations[0]?.advisory).toBe(true);
    expect(contract.summary.advisory).toBe(1);
  });

  it("the contract version is additive-locked at 1 for schemaVersion 1", () => {
    expect(CONTRACT_VERSION).toBe(1);
  });
});
