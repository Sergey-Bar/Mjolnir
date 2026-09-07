/**
 * Detector revision integrity — proof-of-coverage tests
 * (certification-audit Phase 3.5, G4/D8v2 anti-false-green, §23).
 *
 * Each test proves a hash property the OLD `String(rule.run)` technique
 * provably lacked:
 *   (a) module-scope constant mutation → hash CHANGES (the blind spot);
 *   (b) configFiles metadata-only mutation → hash CHANGES (the exact
 *       QA-PW-124 bypass class);
 *   (c) prettier-style whitespace/comment-only rewrite → hash UNCHANGED
 *       (no meaningless churn);
 *   plus manifest mechanics: stale-manifest detection, regen-without-bump
 *       base-diff WARN (check C), and byte-determinism.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  annotationFor,
  computeRuleLogicHash,
  diffManifests,
  metadataForRule,
  moduleTokenStream,
  serializeManifest,
  type DetectorHashManifest,
  type RuleHashMetadata,
} from "../../src/engine/detector-hash.js";
import { checkRevisionIntegrity } from "../../src/commands/doctor.js";
import { minimalRules } from "./helpers.js";

const BASE_MODULE = [
  'import { defineRule } from "../rule.js";',
  "const BAD = /xpath=/gm;",
  'export const r = defineRule({ id: "QA-T-001", severity: "info", run(ctx) { return BAD.test(ctx.text) ? [] : []; } });',
  "",
].join("\n");

function meta(overrides: Partial<RuleHashMetadata> = {}): RuleHashMetadata {
  return {
    appliesTo: "test-files",
    configRule: undefined,
    configFiles: undefined,
    frameworks: undefined,
    tier: undefined,
    severity: "info",
    confidence: "high",
    findingType: "deterministic-defect",
    evidenceLevel: undefined,
    overlapWith: undefined,
    ...overrides,
  };
}

let tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
  tmpDirs = [];
});

describe("token stream (G4 contract)", () => {
  it("preserves regex/string literal token texts exactly", () => {
    const stream = moduleTokenStream(BASE_MODULE);
    expect(stream).toContain("/xpath=/gm");
    expect(stream).toContain('"../rule.js"');
  });

  it("excludes comments and inter-token whitespace", () => {
    const withComments = [
      "// a leading comment block",
      "/* and a block */",
      BASE_MODULE.replace(
        "const BAD = /xpath=/gm;",
        "const BAD = /xpath=/gm;   // trailing",
      ),
    ].join("\n");
    expect(moduleTokenStream(withComments)).toBe(
      moduleTokenStream(BASE_MODULE),
    );
  });
});

describe("computeRuleLogicHash — the two proven bypass classes", () => {
  it("(a) mutating a module-scope regex constant CHANGES the hash (String(run) blind spot)", () => {
    const h1 = computeRuleLogicHash(meta(), BASE_MODULE);
    const h2 = computeRuleLogicHash(
      meta(),
      BASE_MODULE.replace("/xpath=/gm", "/xpath=/gi"),
    );
    expect(h1).not.toBe(h2);
  });

  it("(b) mutating configFiles metadata only CHANGES the hash (QA-PW-124 class)", () => {
    const h1 = computeRuleLogicHash(meta(), BASE_MODULE);
    const h2 = computeRuleLogicHash(
      meta({ configFiles: ["^playwright\\.config\\.(?:ts|js|mjs|cts)$"] }),
      BASE_MODULE,
    );
    expect(h1).not.toBe(h2);
  });

  it("(c) a prettier-style whitespace/comment rewrite does NOT churn the hash", () => {
    const h1 = computeRuleLogicHash(meta(), BASE_MODULE);
    const reformatted = BASE_MODULE.replace(
      "run(ctx) {",
      "run(ctx) {\n      // reformatted: comment added, inter-token whitespace changed\n    ",
    );
    expect(computeRuleLogicHash(meta(), reformatted)).toBe(h1);
  });

  it("mutating control flow CHANGES the hash", () => {
    const h1 = computeRuleLogicHash(meta(), BASE_MODULE);
    const h2 = computeRuleLogicHash(
      meta(),
      BASE_MODULE.replace("? [] : []", "? [] : [{}]").replace(
        "return BAD.test(ctx.text)",
        "return BAD.test(ctx.text) && false || true",
      ),
    );
    expect(h1).not.toBe(h2);
  });
});

describe("manifest mechanics", () => {
  it("serialization is byte-deterministic (sorted ids, stable field order)", () => {
    const m: DetectorHashManifest = {
      "QA-B-002": { logicHash: "b".repeat(64), detectorRevision: 1 },
      "QA-A-001": { logicHash: "a".repeat(64), detectorRevision: 2 },
    };
    const s1 = serializeManifest(m);
    const entry = m["QA-A-001"];
    if (!entry) throw new Error("unreachable");
    const s2 = serializeManifest({ ...m, "QA-A-001": { ...entry } });
    expect(s1).toBe(s2);
    expect(s1.indexOf("QA-A-001")).toBeLessThan(s1.indexOf("QA-B-002"));
    expect(s1.endsWith("\n")).toBe(true);
  });

  it("diffManifests flags hash-changed-same-revision as WARN-able and revision-changed as INFO", () => {
    const base: DetectorHashManifest = {
      "QA-A-001": { logicHash: "a".repeat(64), detectorRevision: 1 },
      "QA-B-002": { logicHash: "b".repeat(64), detectorRevision: 1 },
      "QA-C-003": { logicHash: "c".repeat(64), detectorRevision: 1 },
      "QA-D-004": { logicHash: "d".repeat(64), detectorRevision: 1 },
    };
    const head: DetectorHashManifest = {
      "QA-A-001": { logicHash: "CHANGED".padEnd(64, "0"), detectorRevision: 1 }, // WARN class
      "QA-B-002": { logicHash: "CHANGED".padEnd(64, "0"), detectorRevision: 2 }, // legit bump
      "QA-C-003": { logicHash: "c".repeat(64), detectorRevision: 1 }, // untouched
      // QA-D-004 removed
      "QA-E-005": { logicHash: "e".repeat(64), detectorRevision: 1 }, // added
    };
    const findings = diffManifests(base, head);
    const byId = new Map(findings.map((f) => [f.ruleId, f] as const));
    expect(byId.get("QA-A-001")?.kind).toBe("hash-changed-same-revision");
    expect(byId.get("QA-B-002")?.kind).toBe("revision-changed");
    expect(byId.get("QA-D-004")?.kind).toBe("removed");
    expect(byId.get("QA-E-005")?.kind).toBe("added");
    expect(byId.has("QA-C-003")).toBe(false);
    const warnFinding = byId.get("QA-A-001");
    const infoFinding = byId.get("QA-B-002");
    expect(warnFinding && annotationFor(warnFinding)).toContain("::warning::");
    expect(infoFinding ? annotationFor(infoFinding) : "x").toBeUndefined();
  });

  it("(e) regen-without-bump emits the WARN annotation, not silence", () => {
    // The exact regen-only-PR scenario: the manifest was regenerated over
    // a changed module without a revision bump. The doctor's blocking
    // checks pass (manifest is current), so the ONLY control is the
    // base-diff WARN — assert it is emitted, never silent.
    const base: DetectorHashManifest = {
      "QA-A-001": { logicHash: "old".padEnd(64, "0"), detectorRevision: 1 },
    };
    const head: DetectorHashManifest = {
      "QA-A-001": { logicHash: "new".padEnd(64, "0"), detectorRevision: 1 },
    };
    const warnings = diffManifests(base, head)
      .map(annotationFor)
      .filter((a) => a !== undefined);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("QA-A-001");
    expect(warnings[0]).toContain("behavior-neutrality");
  });
});

describe("checkRevisionIntegrity (doctor check, blocking)", () => {
  // Dependency-free synthetic module (no ../rule.js import — the synthetic
  // tree has no node_modules): walkRuleLike accepts any exported object
  // with id:string + run:function. The manifest is always built through
  // the SAME metadataForRule path the doctor uses, so only the property
  // under test can cause a mismatch.
  const SYNTHETIC_MODULE = [
    "export const r = {",
    '  id: "QA-T-900",',
    '  severity: "info",',
    '  confidence: "high",',
    '  findingType: "deterministic-defect",',
    '  appliesTo: "test-files",',
    "  run: () => [],",
    "};",
    "",
  ].join("\n");

  function makeRepo(
    manifest: DetectorHashManifest,
    moduleText: string,
  ): string {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-revint-"));
    tmpDirs.push(root);
    mkdirSync(join(root, "tests", "corpus"), { recursive: true });
    mkdirSync(join(root, "src", "rules"), { recursive: true });
    writeFileSync(
      join(root, "tests", "corpus", "detector-hashes.json"),
      JSON.stringify(manifest),
    );
    writeFileSync(join(root, "src", "rules", "synthetic.ts"), moduleText);
    return root;
  }

  /** Manifest hash built exactly the way the doctor computes current hashes. */
  function attestedHash(moduleText: string): string {
    const rule = minimalRules.one();
    return computeRuleLogicHash(metadataForRule(rule), moduleText);
  }

  it("FAILS when the manifest is missing (INCONCLUSIVE must not render as pass)", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-revint-"));
    tmpDirs.push(root);
    const result = checkRevisionIntegrity(root, [minimalRules.one()]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("INCONCLUSIVE");
  });

  it("FAILS when the manifest is unreadable", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-revint-"));
    tmpDirs.push(root);
    mkdirSync(join(root, "tests", "corpus"), { recursive: true });
    mkdirSync(join(root, "src", "rules"), { recursive: true });
    writeFileSync(
      join(root, "tests", "corpus", "detector-hashes.json"),
      "{ nope",
    );
    const result = checkRevisionIntegrity(root, [minimalRules.one()]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("unreadable/malformed");
  });

  it("(d) FAILS when a module changed but the manifest was NOT regenerated (check A)", () => {
    const rule = minimalRules.one();
    const root = makeRepo(
      {
        [rule.id]: {
          logicHash: attestedHash(SYNTHETIC_MODULE),
          detectorRevision: 1,
        },
      },
      SYNTHETIC_MODULE.replace('severity: "info"', 'severity: "warning"'), // module mutated after attestation
    );
    const result = checkRevisionIntegrity(root, [minimalRules.one()]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("source identity changed");
  });

  it("FAILS when the declared revision drifted from the manifest (check B)", () => {
    const rule = minimalRules.one();
    const root = makeRepo(
      {
        [rule.id]: {
          logicHash: attestedHash(SYNTHETIC_MODULE),
          detectorRevision: 3,
        },
      },
      SYNTHETIC_MODULE,
    );
    const result = checkRevisionIntegrity(root, [minimalRules.one()]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain(
      "manifest revision 3 ≠ declared",
    );
  });

  it("FAILS when an attested rule left the registry (stale manifest)", () => {
    const rule = minimalRules.one();
    const root = makeRepo(
      {
        [rule.id]: {
          logicHash: attestedHash(SYNTHETIC_MODULE),
          detectorRevision: 1,
        },
        "QA-GHOST-777": { logicHash: "y".repeat(64), detectorRevision: 1 },
      },
      SYNTHETIC_MODULE,
    );
    const result = checkRevisionIntegrity(root, [minimalRules.one()]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("not in the registry");
  });

  it("PASSES a reconciled manifest (hashes + revisions + registry all agree)", () => {
    const rule = minimalRules.one();
    const root = makeRepo(
      {
        [rule.id]: {
          logicHash: attestedHash(SYNTHETIC_MODULE),
          detectorRevision: 1,
        },
      },
      SYNTHETIC_MODULE,
    );
    const result = checkRevisionIntegrity(root, [minimalRules.one()]);
    expect(result.ok).toBe(true);
    expect(result.details.join("\n")).toContain("attested");
  });
});
