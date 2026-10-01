/**
 * release-trust arms coverage — every honest state the verdict algebra
 * can produce, driven directly (Constitution §4.1: PROVEN/PASS are two
 * layers; a dimension can render FAILED/INCONCLUSIVE/BLOCKED/UNPROVEN/
 * PARTIAL and the strictest-state precedence must hold). The shipped
 * repo's PASS path is locked by tests/contract/release-trust-contract.spec.ts;
 * this suite exercises the NON-PASS and degraded-context arms that the
 * shipped checkout cannot reach.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkAgentSafety,
  checkArtifactIntegrity,
  checkMachineContractVersion,
  checkNonDeterministicFields,
  checkReleaseVersionConsistency,
  checkScopeIntegrity,
  checkZeroNetworkImports,
  computeVerdict,
  fromDoctorChecks,
  releaseTrustJson,
  renderReleaseTrust,
  type DimensionRecord,
  type ReleaseTrustReport,
} from "../../src/commands/release-trust.js";
import { CONTRACT_VERSION } from "../../src/engine/machine-contract.js";

const createdDirs: string[] = [];
function tmpRepo(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-release-trust-arms-"));
  createdDirs.push(d);
  return d;
}
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function dim(overrides: Partial<DimensionRecord> = {}): DimensionRecord {
  return {
    id: "engine-integrity",
    title: "Engine Integrity",
    applicability: { applicableFrom: "1.0.0", required: true },
    requirement: "requirement",
    evidence: "PROVEN",
    determination: "PASS",
    evidenceRefs: ["doctor:x"],
    details: [],
    ...overrides,
  };
}

const cleanInvariant: ReleaseTrustReport["invariant"] = {
  execution: "PROVEN",
  evidence: "PROVEN",
  scope: "PROVEN",
  contract: "satisfied",
  contradictions: "none",
  provenance: "PROVEN",
};

describe("fromDoctorRefs arms", () => {
  it("a passing doctor check ⇒ PROVEN + PASS", () => {
    const r = fromDoctorChecks(
      { checks: [{ name: "x", ok: true, status: "pass", details: ["ok"] }] },
      ["doctor:x"],
    );
    expect(r).toEqual({
      evidence: "PROVEN",
      determination: "PASS",
      details: ["ok"],
    });
  });

  it("a failing doctor check ⇒ PROVEN evidence of a violation, FAILED", () => {
    const r = fromDoctorChecks(
      { checks: [{ name: "x", ok: false, status: "fail", details: ["bad"] }] },
      ["doctor:x"],
    );
    expect(r.evidence).toBe("PROVEN");
    expect(r.determination).toBe("FAILED");
  });

  it("an inconclusive doctor check ⇒ INCONCLUSIVE (blocking)", () => {
    const r = fromDoctorChecks(
      {
        checks: [
          { name: "x", ok: false, status: "inconclusive", details: ["?"] },
        ],
      },
      ["doctor:x"],
    );
    expect(r.determination).toBe("INCONCLUSIVE");
    expect(r.evidence).toBe("INCONCLUSIVE");
  });

  it("a missing doctor check ⇒ INCONCLUSIVE naming it", () => {
    const r = fromDoctorChecks({ checks: [] }, ["doctor:ghost"]);
    expect(r.determination).toBe("INCONCLUSIVE");
    expect(r.details.join(" ")).toContain("missing doctor check doctor:ghost");
  });

  it("non-doctor refs are skipped ⇒ UNPROVEN (no evidence evaluated)", () => {
    const r = fromDoctorChecks({ checks: [] }, ["check:not-a-doctor-ref"]);
    expect(r).toEqual({
      evidence: "UNPROVEN",
      determination: "UNPROVEN",
      details: [],
    });
  });
});

describe("computeVerdict — the strictest-state algebra", () => {
  it("all required PASS with satisfied invariants ⇒ PASS", () => {
    const v = computeVerdict(
      [dim(), dim({ id: "b", title: "B" })],
      cleanInvariant,
    );
    expect(v).toEqual({
      releaseTrust: "PASS",
      strictestState: "PASS",
      requiredCount: 2,
      passedCount: 2,
    });
  });

  it("one required FAILED ⇒ FAILED, strictest FAILED (top precedence)", () => {
    const v = computeVerdict(
      [dim(), dim({ id: "b", determination: "FAILED" })],
      cleanInvariant,
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("FAILED");
    expect(v.passedCount).toBe(1);
  });

  it("BLOCKED beats INCONCLUSIVE and PARTIAL in the strictest-state precedence", () => {
    const v = computeVerdict(
      [
        dim({ id: "b", determination: "INCONCLUSIVE" }),
        dim({ id: "c", determination: "PARTIAL" }),
        dim({ id: "d", determination: "BLOCKED" }),
      ],
      cleanInvariant,
    );
    expect(v.strictestState).toBe("BLOCKED");
  });

  it("an INCONCLUSIVE dimension blocks even with clean invariants", () => {
    const v = computeVerdict(
      [dim({ id: "b", determination: "INCONCLUSIVE" })],
      cleanInvariant,
    );
    expect(v.releaseTrust).toBe("FAILED");
  });

  it("UNPROVEN without any dimension failure renders strictest UNPROVEN", () => {
    const v = computeVerdict(
      [dim({ id: "b", determination: "UNPROVEN", evidence: "UNPROVEN" })],
      cleanInvariant,
    );
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("UNPROVEN");
  });

  it("a violated contract invariant fails the verdict (no dimension failure)", () => {
    const v = computeVerdict([dim()], {
      ...cleanInvariant,
      contract: "violated",
    });
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("UNPROVEN");
  });

  it("present contradictions fail the verdict", () => {
    const v = computeVerdict([dim()], {
      ...cleanInvariant,
      contradictions: "present",
    });
    expect(v.releaseTrust).toBe("FAILED");
  });

  it("provenance UNSUPPORTED is recorded and non-blocking (pre-activation)", () => {
    const v = computeVerdict([dim()], {
      ...cleanInvariant,
      provenance: "UNSUPPORTED",
    });
    expect(v.releaseTrust).toBe("PASS");
  });

  it("a non-required UNSUPPORTED dimension neither blocks nor counts", () => {
    const v = computeVerdict(
      [
        dim(),
        dim({
          id: "future",
          title: "Future Surface",
          applicability: { applicableFrom: "9.9.9", required: false },
          determination: "UNSUPPORTED",
          evidence: "UNSUPPORTED",
        }),
      ],
      cleanInvariant,
    );
    expect(v.releaseTrust).toBe("PASS");
    expect(v.requiredCount).toBe(1);
    expect(v.passedCount).toBe(1);
  });

  it("zero applicable dimensions cannot PASS (nothing was evaluated)", () => {
    const v = computeVerdict([], cleanInvariant);
    expect(v.releaseTrust).toBe("FAILED");
    expect(v.strictestState).toBe("UNPROVEN");
  });
});

describe("structural check arms against degraded contexts", () => {
  it("scope-integrity / agent-safety / artifact-integrity go INCONCLUSIVE on a missing tree", () => {
    const empty = tmpRepo();
    for (const [name, r] of [
      ["scope-integrity", checkScopeIntegrity(empty)],
      ["agent-safety", checkAgentSafety(empty)],
      ["artifact-integrity", checkArtifactIntegrity(empty)],
    ] as const) {
      expect(r.evidence, name).toBe("INCONCLUSIVE");
      expect(r.determination, name).toBe("INCONCLUSIVE");
      expect(r.details.join(" "), name).toContain("missing:");
    }
  });

  it("zero-network: clean src passes, a network import and a fetch call both fail it", () => {
    const clean = tmpRepo();
    mkdirSync(join(clean, "src"), { recursive: true });
    writeFileSync(
      join(clean, "src", "clean.ts"),
      `import { readFileSync } from "node:fs";\nexport const x = 1;\n`,
    );
    expect(checkZeroNetworkImports(clean).determination).toBe("PASS");

    const offender = tmpRepo();
    mkdirSync(join(offender, "src"), { recursive: true });
    writeFileSync(
      join(offender, "src", "bad.ts"),
      `import http from "http";\nexport const x = 1;\n`,
    );
    const failed = checkZeroNetworkImports(offender);
    expect(failed.determination).toBe("FAILED");
    expect(failed.details.join(" ")).toContain('imports "http"');

    const fetcher = tmpRepo();
    mkdirSync(join(fetcher, "src"), { recursive: true });
    writeFileSync(
      join(fetcher, "src", "fetcher.ts"),
      `export async function go(): Promise<unknown> { return fetch("https://example.invalid"); }\n`,
    );
    const fetched = checkZeroNetworkImports(fetcher);
    expect(fetched.determination).toBe("FAILED");
    expect(fetched.details.join(" ")).toContain("performs a fetch invocation");

    // An unparseable file carries no call evidence (ts-morph null arm) and
    // no import match — it must not crash the walk nor fake a violation.
    const unparseable = tmpRepo();
    mkdirSync(join(unparseable, "src"), { recursive: true });
    writeFileSync(
      join(unparseable, "src", "broken.ts"),
      `not typescript at all {{{`,
    );
    expect(checkZeroNetworkImports(unparseable).determination).toBe("PASS");
  });

  it("zero-network with no src directory at all ⇒ PASS (nothing to violate)", () => {
    expect(checkZeroNetworkImports(tmpRepo()).determination).toBe("PASS");
  });

  it("machine-contract-version arms: BLOCKED / INCONCLUSIVE / FAILED / PASS", () => {
    const blocked = tmpRepo();
    expect(checkMachineContractVersion(blocked)).toEqual({
      evidence: "BLOCKED",
      determination: "BLOCKED",
      details: ["docs/machine-contract.md missing"],
    });

    const inconclusive = tmpRepo();
    mkdirSync(join(inconclusive, "docs"), { recursive: true });
    writeFileSync(
      join(inconclusive, "docs", "machine-contract.md"),
      "no literal here",
    );
    const inc = checkMachineContractVersion(inconclusive);
    expect(inc.determination).toBe("INCONCLUSIVE");

    const failed = tmpRepo();
    mkdirSync(join(failed, "docs"), { recursive: true });
    writeFileSync(
      join(failed, "docs", "machine-contract.md"),
      "`contractVersion: 999`",
    );
    const fail = checkMachineContractVersion(failed);
    expect(fail.determination).toBe("FAILED");
    expect(fail.details.join(" ")).toContain(`!= documented 999`);

    const pass = tmpRepo();
    mkdirSync(join(pass, "docs"), { recursive: true });
    writeFileSync(
      join(pass, "docs", "machine-contract.md"),
      `\`contractVersion: ${CONTRACT_VERSION}\``,
    );
    expect(checkMachineContractVersion(pass).determination).toBe("PASS");
  });

  it("release-version-consistency arms: BLOCKED / INCONCLUSIVE / FAILED / PASS", () => {
    expect(checkReleaseVersionConsistency(tmpRepo())).toEqual({
      evidence: "BLOCKED",
      determination: "BLOCKED",
      details: ["package.json or CHANGELOG.md missing"],
    });

    const inconclusive = tmpRepo();
    writeFileSync(join(inconclusive, "package.json"), `{"version":"1.0.0"}`);
    writeFileSync(join(inconclusive, "CHANGELOG.md"), "no version headings");
    expect(checkReleaseVersionConsistency(inconclusive).determination).toBe(
      "INCONCLUSIVE",
    );

    const failed = tmpRepo();
    writeFileSync(join(failed, "package.json"), `{"version":"1.2.0"}`);
    writeFileSync(join(failed, "CHANGELOG.md"), "## [1.0.0] — old\n");
    const fail = checkReleaseVersionConsistency(failed);
    expect(fail.determination).toBe("FAILED");
    expect(fail.details.join(" ")).toContain("1.2.0 != CHANGELOG head 1.0.0");

    const pass = tmpRepo();
    writeFileSync(join(pass, "package.json"), `{"version":"1.2.0"}`);
    writeFileSync(join(pass, "CHANGELOG.md"), "## [1.2.0] — current\n");
    expect(checkReleaseVersionConsistency(pass).determination).toBe("PASS");
  });

  it("release-version-consistency accepts an exact RC heading only", () => {
    const rc = tmpRepo();
    writeFileSync(join(rc, "package.json"), '{"version":"1.2.0-rc.1"}');
    writeFileSync(join(rc, "CHANGELOG.md"), "## [1.2.0-rc.1] — current\n");
    expect(checkReleaseVersionConsistency(rc)).toEqual({
      evidence: "PROVEN",
      determination: "PASS",
      details: ["package.json and CHANGELOG agree on 1.2.0-rc.1"],
    });

    const stableMismatch = tmpRepo();
    writeFileSync(
      join(stableMismatch, "package.json"),
      '{"version":"1.2.0-rc.1"}',
    );
    writeFileSync(
      join(stableMismatch, "CHANGELOG.md"),
      "## [1.2.0] — current\n",
    );
    expect(checkReleaseVersionConsistency(stableMismatch).determination).toBe(
      "FAILED",
    );

    const unsupportedPrerelease = tmpRepo();
    writeFileSync(
      join(unsupportedPrerelease, "package.json"),
      '{"version":"1.2.0-beta.1"}',
    );
    writeFileSync(
      join(unsupportedPrerelease, "CHANGELOG.md"),
      "## [1.2.0-beta.1] — current\n",
    );
    expect(
      checkReleaseVersionConsistency(unsupportedPrerelease).determination,
    ).toBe("INCONCLUSIVE");

    const malformed = tmpRepo();
    writeFileSync(join(malformed, "package.json"), '{"version":"1.02.0"}');
    writeFileSync(join(malformed, "CHANGELOG.md"), "## [1.02.0] — current\n");
    expect(checkReleaseVersionConsistency(malformed).determination).toBe(
      "INCONCLUSIVE",
    );
  });

  it("non-deterministic-fields PASS on the shipped doctor state", () => {
    expect(checkNonDeterministicFields().determination).toBe("PASS");
  });
});

describe("rendering arms", () => {
  it("renderReleaseTrust marks non-applicable dimensions and prints the full verdict", () => {
    const report: ReleaseTrustReport = {
      schema: "mjolnir.release-trust@1",
      release: "9.9.9",
      dimensions: [
        dim(),
        dim({
          id: "future",
          title: "Future Surface",
          applicability: { applicableFrom: "9.9.9", required: false },
          determination: "UNSUPPORTED",
          evidence: "UNSUPPORTED",
        }),
      ],
      invariant: { ...cleanInvariant, provenance: "UNSUPPORTED" },
      verdict: {
        releaseTrust: "PASS",
        strictestState: "PASS",
        requiredCount: 1,
        passedCount: 1,
      },
    };
    const text = renderReleaseTrust(report);
    expect(text).toContain("MJÖLNIR — RELEASE TRUST VERDICT");
    expect(text).toContain("Future Surface (not yet applicable)");
    expect(text).toContain("RELEASE-TRUST: PASS");
    expect(text).toContain("provenance=UNSUPPORTED");

    const json = JSON.parse(releaseTrustJson(report)) as {
      contract: string;
      dimensions: Array<{ id: string; evidenceRefs: string[] }>;
    };
    expect(json.contract).toBe("mjolnir.release-trust@1");
    expect(json.dimensions.map((d) => d.id)).toEqual([
      "engine-integrity",
      "future",
    ]);
  });
});
