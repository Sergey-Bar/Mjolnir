/**
 * Bus-factor contract (product-gap-remediation master plan P9, plan
 * 1788853205786 — flag 10, decision 10): the program's artifacts exist,
 * are tracked, cross-link correctly, and CODEOWNERS pins the surfaces
 * whose integrity IS the bus-factor guarantee.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("bus-factor program artifacts (P9)", () => {
  it("the four artifacts exist and are tracked", () => {
    for (const rel of [
      "docs/MAINTAINERS.md",
      "docs/OWNER-RUNBOOK.md",
      "docs/ADJUDICATION-KIT.md",
      "docs/BUS-FACTOR-AUDIT.md",
      ".github/CODEOWNERS",
    ]) {
      expect(existsSync(join(ROOT, rel)), `${rel} missing`).toBe(true);
      expect(gitTracked(rel), `${rel} is not git-tracked`).toBe(true);
    }
  });

  it("MAINTAINERS.md defines the roles ladder with entry gates and links the kit", () => {
    const t = read("docs/MAINTAINERS.md");
    for (const role of ["Triage", "Classifier", "Rule-owner", "Release"]) {
      expect(t, `ladder missing the ${role} role`).toContain(role);
    }
    expect(t).toContain("ADJUDICATION-KIT");
    expect(t).toContain("CERTIFICATION-POLICY");
    expect(t).toContain("succession audit");
    // A4 preserved: no role automates adjudication.
    expect(t.toLowerCase()).toContain("adjudication is human");
  });

  it("OWNER-RUNBOOK marks every operation runbooked or identity-bound — nothing silent", () => {
    const t = read("docs/OWNER-RUNBOOK.md");
    expect(t).toContain("identity-bound");
    expect(t).toContain("runbooked");
    expect(t).toContain("npm publish");
    expect(t.toLowerCase()).toContain("marketplace");
    expect(t.toLowerCase()).toContain("adjudication");
    // The handover section exists (the grant path for a co-maintainer).
    expect(t).toContain("Handover");
  });

  it("the adjudication kit documents the standard, the worked example, and the ratchet", () => {
    const t = read("docs/ADJUDICATION-KIT.md");
    for (const verdict of ["TP", "FP", "UNSURE"]) {
      expect(t, `kit missing the ${verdict} standard`).toContain(verdict);
    }
    expect(t.toLowerCase()).toContain("fully worked");
    expect(t).toContain("corpus:regression");
    // The ratchet rules are present and anti-Goodhart.
    expect(t).toContain("Blank-verdict rows block");
    expect(t).toContain("never rewritten");
  });

  it("the succession audit separates executable from identity-bound with pointers", () => {
    const t = read("docs/BUS-FACTOR-AUDIT.md");
    expect(t).toContain("identity-bound");
    expect(t).toContain("OWNER-RUNBOOK.md");
    expect(t).toContain("Adjudication cycle");
    expect(t).toContain("honest residue");
  });

  it("CODEOWNERS pins the corpus verdicts and the program docs", () => {
    const t = read(".github/CODEOWNERS");
    expect(t).toContain("/tests/corpus/verdicts/");
    expect(t).toContain("/docs/CERTIFICATION-POLICY.md");
    expect(t).toContain("@Sergey-Bar");
  });

  it("CONTRIBUTING's governance section points at the program", () => {
    const t = read("CONTRIBUTING.md");
    expect(t).toContain("MAINTAINERS.md");
    expect(t).toContain("OWNER-RUNBOOK.md");
    expect(t).toContain("ADJUDICATION-KIT.md");
  });
});

function gitTracked(rel: string): boolean {
  try {
    return (
      execFileSync("git", ["ls-files", "--error-unmatch", rel], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim().length > 0
    );
  } catch {
    return false;
  }
}
