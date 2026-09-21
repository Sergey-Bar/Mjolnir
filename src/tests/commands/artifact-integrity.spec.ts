/**
 * Trust Artifact integrity binding + reproducibility (remediation plan
 * 1789009691197 §9 R9 / growth roadmap WI-23, plan §18).
 *
 * Locked invariants:
 *  - every artifact (md/json/html) embeds its IDENTITY: the machine
 *    anchor (scanId), the bound commit when resolvable, the fired
 *    rule(rev) inventory, and the evidence inventory — never fabricated
 *    (absent ⇒ null, recorded unbound);
 *  - reproducibility: byte-identical regen for the HTML artifact; the
 *    JSON twin stays semantically identical to the MD;
 *  - stale / wrong-run / mismatched-rev / unbound artifacts are
 *    DETECTED and RECORDED — never assumed current (no false-green);
 *  - the HTML artifact is self-contained and hostile-input-safe.
 */

import { describe, expect, it } from "vitest";

import {
  buildArtifactIdentity,
  checkArtifactFreshness,
  renderTrustReportHtml,
  renderTrustReportJson,
  renderTrustReportMarkdown,
} from "../../src/commands/trust-report.js";
import type { ScanResult } from "../../src/types.js";

const SCAN_ID = "a".repeat(64);
const OTHER_SCAN_ID = "b".repeat(64);
const COMMIT = "1234abcd5678ef90";

function finding(
  overrides: Partial<ScanResult["findings"][number]> = {},
): ScanResult["findings"][number] {
  return {
    ruleId: "QA-PW-101",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    detectorRevision: 3,
    evidenceLevel: "E2",
    file: "e2e/shop.spec.ts",
    line: 12,
    column: 3,
    message: "hard sleep",
    why: "why",
    fix: "fix",
    ...overrides,
  };
}

function result(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 96,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [finding()],
    testFileCount: 2,
    testDeclarationCount: 10,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
    trustSummary: {
      level: "L2",
      confidence: 0.7,
      evidenceCoverage: 0.4,
      inconclusiveRate: 0,
      measuredFpOfFiredRules: 0.429,
      provisionalRuleIds: [],
      ceilingReasons: [],
    },
    runIdentity: {
      scanId: SCAN_ID,
      inputFingerprint: "c".repeat(64),
      rulesDigest: "d".repeat(64),
      configFingerprint: "e".repeat(64),
      engineVersion: "test",
    },
    ...overrides,
  };
}

describe("artifact identity binding (§9 R9)", () => {
  it("scanId embeds from runIdentity; absent runIdentity ⇒ null (never fabricated)", () => {
    expect(buildArtifactIdentity(result({})).scanId).toBe(SCAN_ID);
    const bare = result({});
    delete (bare as { runIdentity?: unknown }).runIdentity;
    expect(buildArtifactIdentity(bare).scanId).toBeNull();
  });

  it("commit binds when given; omitted ⇒ null (recorded unbound)", () => {
    expect(buildArtifactIdentity(result({}), COMMIT).commit).toBe(COMMIT);
    expect(buildArtifactIdentity(result({})).commit).toBeNull();
  });

  it("detectorRevisions: deduped, sorted, undefined revisions skipped (no fabricated revs)", () => {
    const noRev = finding({ ruleId: "QA-PW-103" }); // legacy producer: no rev
    delete (noRev as { detectorRevision?: number }).detectorRevision;
    const r = result({
      findings: [
        finding({ ruleId: "QA-PW-104", detectorRevision: 1 }),
        finding({ ruleId: "QA-PW-101", detectorRevision: 3 }),
        finding({ ruleId: "QA-PW-102", detectorRevision: 2 }),
        noRev,
      ],
    });
    const identity = buildArtifactIdentity(r);
    expect(identity.detectorRevisions).toEqual([
      { ruleId: "QA-PW-101", detectorRevision: 3 },
      { ruleId: "QA-PW-102", detectorRevision: 2 },
      { ruleId: "QA-PW-104", detectorRevision: 1 },
    ]);
  });

  it("evidence inventory: totals, corroboration count, per-level counts sorted", () => {
    const r = result({
      findings: [
        finding({ evidenceLevel: "E2" }),
        finding({ ruleId: "QA-PW-102", evidenceLevel: "E1" }),
        finding({
          ruleId: "QA-PW-103",
          evidenceLevel: "E2",
          runtimeCorroboration: {
            level: "defect",
            source: "junit-xml",
            testsExecuted: 1,
            matchedTest: {
              title: "t",
              finalStatus: "failed",
              attempts: 1,
              passedOnRetry: false,
              everFailed: true,
              skipped: false,
            },
          },
        }),
      ],
    });
    const inv = buildArtifactIdentity(r).evidenceInventory;
    expect(inv.totalFindings).toBe(3);
    expect(inv.corroborated).toBe(1);
    expect(inv.byEvidenceLevel).toEqual({ E1: 1, E2: 2 });
  });

  it("every artifact embeds the identity (md / json / html)", () => {
    const r = result({});
    const md = renderTrustReportMarkdown(r, "my-repo", COMMIT);
    expect(md).toContain("## Artifact integrity");
    expect(md).toContain(`**scanId**: ${SCAN_ID}`);
    expect(md).toContain(`**Commit**: ${COMMIT}`);
    expect(md).toContain("`QA-PW-101@3`");

    const json = JSON.parse(renderTrustReportJson(r, COMMIT)) as {
      identity: {
        scanId: string;
        commit: string;
        detectorRevisions: Array<{ ruleId: string; detectorRevision: number }>;
      };
    };
    expect(json.identity.scanId).toBe(SCAN_ID);
    expect(json.identity.commit).toBe(COMMIT);
    expect(json.identity.detectorRevisions).toEqual([
      { ruleId: "QA-PW-101", detectorRevision: 3 },
    ]);

    const html = renderTrustReportHtml(r, "my-repo", COMMIT);
    expect(html).toContain(`id="artifact-integrity"`);
    expect(html).toContain(SCAN_ID);
    expect(html).toContain(COMMIT);
  });

  it("an unbound artifact says SO in every format — never assumed bound", () => {
    const bare = result({});
    delete (bare as { runIdentity?: unknown }).runIdentity;
    const md = renderTrustReportMarkdown(bare, "my-repo");
    expect(md).toContain("unbound (pre-R9 producer — regenerate)");
    expect(md).toContain("unknown (not bound)");
    const json = JSON.parse(renderTrustReportJson(bare)) as {
      identity: { scanId: string | null; commit: string | null };
    };
    expect(json.identity.scanId).toBeNull();
    expect(json.identity.commit).toBeNull();
    const html = renderTrustReportHtml(bare, "my-repo");
    expect(html).toContain("unbound (pre-R9 producer — regenerate)");
  });
});

describe("freshness detection (stale / wrong-run / mismatched-rev / unbound)", () => {
  const current = buildArtifactIdentity(result({}));

  it("same scanId + same revisions ⇒ CURRENT", () => {
    const f = checkArtifactFreshness(
      buildArtifactIdentity(result({})),
      current,
    );
    expect(f).toEqual({ verdict: "CURRENT", scanId: SCAN_ID });
  });

  it("different scanId ⇒ STALE (the artifact describes another run)", () => {
    const artifact = {
      ...buildArtifactIdentity(result({})),
      scanId: OTHER_SCAN_ID,
    };
    const f = checkArtifactFreshness(artifact, current);
    expect(f.verdict).toBe("STALE");
    if (f.verdict === "STALE") {
      expect(f.artifactScanId).toBe(OTHER_SCAN_ID);
      expect(f.currentScanId).toBe(SCAN_ID);
    }
  });

  it("same scanId with drifted revisions ⇒ MISMATCHED-REVISIONS, each drift class named", () => {
    const artifact = {
      ...buildArtifactIdentity(result({})),
      detectorRevisions: [
        { ruleId: "QA-PW-101", detectorRevision: 2 }, // rev bumped since
        { ruleId: "QA-PW-090", detectorRevision: 1 }, // retired since
      ],
    };
    const driftedCurrent = {
      ...current,
      detectorRevisions: [
        { ruleId: "QA-PW-101", detectorRevision: 3 },
        { ruleId: "QA-PW-140", detectorRevision: 1 }, // new since
      ],
    };
    const f = checkArtifactFreshness(artifact, driftedCurrent);
    expect(f.verdict).toBe("MISMATCHED-REVISIONS");
    if (f.verdict === "MISMATCHED-REVISIONS") {
      // A rev bump, a retirement, and a new rule are distinct
      // remediations — the diagnosis names each class explicitly.
      expect(f.drifted).toEqual([
        "QA-PW-090@1 (retired)",
        "QA-PW-101@2 -> 3",
        "QA-PW-140@1 (new)",
      ]);
    }
  });

  it("artifact without scanId ⇒ UNBOUND (pre-R9 producer, recorded)", () => {
    const artifact = { ...current, scanId: null };
    const f = checkArtifactFreshness(artifact, current);
    expect(f.verdict).toBe("UNBOUND");
    if (f.verdict === "UNBOUND") expect(f.reason).toContain("pre-R9");
  });

  it("current scan without runIdentity ⇒ UNBOUND (nothing to bind against)", () => {
    const f = checkArtifactFreshness(current, { ...current, scanId: null });
    expect(f.verdict).toBe("UNBOUND");
    if (f.verdict === "UNBOUND") expect(f.reason).toContain("runIdentity");
  });

  it("precedence: a different run is STALE even when revisions also drifted", () => {
    const artifact = {
      ...buildArtifactIdentity(result({})),
      scanId: OTHER_SCAN_ID,
      detectorRevisions: [],
    };
    expect(checkArtifactFreshness(artifact, current).verdict).toBe("STALE");
  });
});

describe("HTML artifact (WI-23/R9): reproducibility + self-containment", () => {
  it("same ScanResult + label + commit ⇒ byte-identical HTML, twice", () => {
    const r = result({});
    expect(renderTrustReportHtml(r, "my-repo", COMMIT)).toBe(
      renderTrustReportHtml(r, "my-repo", COMMIT),
    );
  });

  it("no wall-clock, no absolute paths, zero external resources", () => {
    const html = renderTrustReportHtml(result({}), "my-repo", COMMIT);
    expect(html).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(html).not.toMatch(/[A-Z]:\\\\|\/Users\/|\/home\//);
    // Self-contained: no scripts, no linked stylesheets, no images, no
    // network references anywhere.
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<link");
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("hostile interpolations are escaped (a finding message cannot inject HTML)", () => {
    const r = result({
      findings: [
        finding({ message: "<script>alert(1)</script> & <b>bold</b>" }),
      ],
    });
    const html = renderTrustReportHtml(r, "repo");
    expect(html).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt;",
    );
    expect(html).not.toContain("<script>alert(1)");
  });

  it("the five-question structure matches the MD (semantic twin)", () => {
    const r = result({});
    const html = renderTrustReportHtml(r, "my-repo", COMMIT);
    for (const section of [
      "Trust verdict",
      "Confidence",
      "Top trust risks",
      "Next action",
      "Artifact integrity",
    ]) {
      expect(html, section).toContain(section);
    }
    expect(html).toContain("43%"); // measured FP 0.429 — same number as MD
  });
});
