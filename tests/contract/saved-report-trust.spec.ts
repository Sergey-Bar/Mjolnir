/**
 * Saved reports are validated for IDENTITY, not just shape (plan V5-012,
 * G-V5-034).
 *
 * `report-io` has always validated a saved report's SHAPE. It never validated
 * its IDENTITY: a structurally perfect report produced by a different tree,
 * a different commit, or a different candidate loaded exactly like a fresh one,
 * and every trust conclusion drawn from it was attributed to whichever machine
 * happened to read the file.
 *
 * The law under test: importing a legacy or foreign artifact can never
 * INCREASE trust. Provenance is not conferred by import (Trust Constitution
 * law 12), so an unbound report is OPEN — readable, replayable as history, and
 * never a pass.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  classifySavedReport,
  loadSavedReport,
  loadSavedReportStrict,
  requireVerifiedReport,
  type SavedReportTrust,
} from "../../src/commands/report-io.js";
import type { ScanResult } from "../../src/types.js";

const RUN_IDENTITY = {
  scanId: "s".repeat(64),
  inputFingerprint: "i".repeat(64),
  rulesDigest: "r".repeat(64),
  configFingerprint: "c".repeat(64),
  engineVersion: "4.0.0-rc.1",
  commit: "a".repeat(40),
};

function report(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 90,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    testFileCount: 1,
    testDeclarationCount: 2,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
    ...overrides,
  };
}

function write(dir: string, value: ScanResult): string {
  const path = join(dir, "report.json");
  writeFileSync(path, JSON.stringify(value), "utf8");
  return path;
}

describe("classification is honest about what the report proves", () => {
  it("a machine-anchored report is VERIFIED", () => {
    const trust = classifySavedReport(report({ runIdentity: RUN_IDENTITY }));
    expect(trust.state).toBe("VERIFIED");
    if (trust.state === "VERIFIED") {
      expect(trust.scanId).toBe(RUN_IDENTITY.scanId);
      expect(trust.commit).toBe(RUN_IDENTITY.commit);
    }
  });

  it("a legacy report with no identity is OPEN, not verified", () => {
    // The whole point. A report with no run identity is history; rendering it
    // as a trusted run is how trust gets inferred from provenance-less bytes.
    const trust = classifySavedReport(report());
    expect(trust.state).toBe("OPEN");
    if (trust.state === "OPEN") expect(trust.reason).toMatch(/no run identity/);
  });

  it("an identity with no scanId is OPEN", () => {
    const trust = classifySavedReport(
      report({ runIdentity: { ...RUN_IDENTITY, scanId: "" } }),
    );
    expect(trust.state).toBe("OPEN");
  });

  it("a report from a different run is OPEN when the caller knows the run", () => {
    const trust = classifySavedReport(report({ runIdentity: RUN_IDENTITY }), {
      scanId: "d".repeat(64),
    });
    expect(trust.state).toBe("OPEN");
    if (trust.state === "OPEN") expect(trust.reason).toMatch(/different run/);
  });

  it("a report from a different commit is OPEN", () => {
    const trust = classifySavedReport(report({ runIdentity: RUN_IDENTITY }), {
      commit: "b".repeat(40),
    });
    expect(trust.state).toBe("OPEN");
    if (trust.state === "OPEN") expect(trust.reason).toMatch(/commit/);
  });

  it("a report bound to another candidate is OPEN", () => {
    const trust = classifySavedReport(
      report({
        runIdentity: {
          ...RUN_IDENTITY,
          candidate: {
            manifestId: "mjolnir-qa@4.0.0-rc.1",
            state: "RELEASE_CANDIDATE",
            candidateSha: "e".repeat(40),
            baseSha: "f".repeat(40),
            packageSha256: "1".repeat(64),
            lockfileSha256: "2".repeat(64),
            owner: "maintainers",
            releaseAuthorizationState: "AUTHORIZED",
          },
        },
      }),
      { candidateManifestId: "mjolnir-qa@5.0.0" },
    );
    expect(trust.state).toBe("OPEN");
    if (trust.state === "OPEN") expect(trust.reason).toMatch(/candidate/);
  });

  it("a matching expectation stays VERIFIED", () => {
    expect(
      classifySavedReport(report({ runIdentity: RUN_IDENTITY }), {
        scanId: RUN_IDENTITY.scanId,
        commit: RUN_IDENTITY.commit,
      }).state,
    ).toBe("VERIFIED");
  });

  it("classification is pure — it does not upgrade anything", () => {
    const input = report();
    const first = classifySavedReport(input);
    const second = classifySavedReport(input);
    expect(first).toEqual(second);
    // Reading a legacy report repeatedly must never converge on VERIFIED.
    expect(classifySavedReport(input).state).toBe("OPEN");
  });
});

describe("the strict loader travels with the content", () => {
  it("returns the trust state alongside the parsed report", () => {
    const dir = mkdtempSync(join(tmpdir(), "mj-trust-"));
    try {
      const verified = loadSavedReportStrict(
        write(dir, report({ runIdentity: RUN_IDENTITY })),
      );
      expect(verified.trust.state).toBe("VERIFIED");
      expect(verified.result.score).toBe(90);
      expect(verified.path).toContain("report.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("requireVerifiedReport refuses anything that is not VERIFIED", () => {
    const dir = mkdtempSync(join(tmpdir(), "mj-trust-"));
    try {
      const open = loadSavedReportStrict(write(dir, report()));
      expect(() =>
        requireVerifiedReport(open, (t: SavedReportTrust) =>
          t.state === "OPEN" ? t.reason : "unverified",
        ),
      ).toThrow(/no run identity/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the plain loader still parses a legacy report (readability is not lost)", () => {
    // Legacy reports must remain USABLE — as history. Refusing to parse them
    // would strand every artifact predating machine-anchored identity.
    const dir = mkdtempSync(join(tmpdir(), "mj-trust-"));
    try {
      expect(loadSavedReport(write(dir, report())).score).toBe(90);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("shape validation still rejects malformed JSON", () => {
  it("rejects a report whose partial flag contradicts its analysis status", () => {
    const dir = mkdtempSync(join(tmpdir(), "mj-trust-"));
    try {
      const contradictory = report({
        partial: false,
        analysisStatus: {
          discovery: "partial",
          rules: "partial",
          skippedFiles: 3,
          durationMs: 1,
        },
      });
      expect(() => loadSavedReport(write(dir, contradictory))).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
