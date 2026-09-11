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
  buildReleaseTrust,
  checkAgentSafety,
  checkArtifactIntegrity,
  checkMachineContractVersion,
  checkNonDeterministicFields,
  checkReleaseVersionConsistency,
  checkScopeIntegrity,
  checkZeroNetworkImports,
  compareSemver,
  computeVerdict,
  fromDoctorChecks,
  releaseTrustJson,
  renderReleaseTrust,
  runReleaseTrustCommand,
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

describe("compareSemver (applicability gate)", () => {
  it.each([
    ["1.2.3", "1.2.4", -1],
    ["2.0.0", "1.9.9", 1],
    ["1.2.3", "1.2.3", 0],
    ["1.2", "1.2.0", 0],
    // parseInt("x") falls back to 0 — "1.x.3" parses as 1.0.3, which is
    // LESS than 1.2.4 at the minor position.
    ["1.x.3", "1.2.4", -2],
  ] as const)("%s vs %s ⇒ %i", (a, b, expected) => {
    expect(compareSemver(a, b)).toBe(expected);
  });
});

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

describe("CLI verb arms (frozen exit contract)", () => {
  it("unknown flags ⇒ usage error 10", () => {
    const errs: unknown[] = [];
    const code = runReleaseTrustCommand(["--bogus"], {
      out: () => {},
      err: (m) => errs.push(m),
    });
    expect(code).toBe(10);
    expect(errs.map(String).join(" ")).toContain(
      "Usage: mjolnir release-trust",
    );
  });

  it("a non-mjolnir directory ⇒ honest BLOCKED exit 2", () => {
    const errs: unknown[] = [];
    const code = runReleaseTrustCommand([tmpRepo()], {
      out: () => {},
      err: (m) => errs.push(m),
    });
    expect(code).toBe(2);
    expect(errs.map(String).join(" ")).toContain("No fixtures directory at");
  });

  it("the shipped repo renders PASS (exit 0) in both text and --json modes", () => {
    const outs: unknown[] = [];
    const code = runReleaseTrustCommand([], {
      out: (m) => outs.push(m),
      err: () => {},
    });
    // On failure the rendered verdict block IS the diagnosis: print it
    // with the assertion so the failing dimension is never a mystery.
    expect(code, outs.map(String).join("\n")).toBe(0);
    expect(outs.map(String).join("\n")).toContain("RELEASE-TRUST: PASS");

    const jsonOuts: unknown[] = [];
    const jsonCode = runReleaseTrustCommand(["--json"], {
      out: (m) => jsonOuts.push(m),
      err: () => {},
    });
    expect(jsonCode).toBe(0);
    const parsed = JSON.parse(jsonOuts.map(String).join("\n")) as {
      contract: string;
    };
    expect(parsed.contract).toBe("mjolnir.release-trust@1");
  });

  it("a hostile fixtures root degrades to an honest non-PASS exit, never a crash", () => {
    const repo = tmpRepo();
    mkdirSync(join(repo, "tests", "fixtures"), { recursive: true });
    mkdirSync(join(repo, "src"), { recursive: true });
    // buildReleaseTrust's baseline reads (package.json + CHANGELOG.md).
    writeFileSync(join(repo, "package.json"), `{"version":"1.0.0"}`);
    writeFileSync(join(repo, "CHANGELOG.md"), "## [1.0.0] — x\n");
    writeFileSync(
      join(repo, "src", "bad.ts"),
      `import axios from "axios";\nexport const x = 1;\n`,
    );
    const outs: unknown[] = [];
    const errs: unknown[] = [];
    const code = runReleaseTrustCommand([repo], {
      out: (m) => outs.push(m),
      err: (m) => errs.push(m),
    });
    // Zero-network violation ⇒ a required dimension FAILED ⇒ exit 1
    // (the frozen non-PASS code), with the verdict block still rendered.
    expect(code).toBe(1);
    expect(errs.map(String).join(" ").length).toBe(0);
    expect(outs.map(String).join("\n")).toContain("RELEASE-TRUST: FAILED");
  });
});

describe("buildReleaseTrust on a degraded repo (doctor arms end-to-end)", () => {
  it("a repo whose doctor checks go inconclusive renders INCONCLUSIVE evidence, not a fake PASS", () => {
    const repo = tmpRepo();
    mkdirSync(join(repo, "tests", "fixtures"), { recursive: true });
    // buildReleaseTrust's baseline reads (package.json + CHANGELOG.md).
    writeFileSync(join(repo, "package.json"), `{"version":"1.0.0"}`);
    writeFileSync(join(repo, "CHANGELOG.md"), "## [1.0.0] — x\n");
    const report = buildReleaseTrust(join(repo, "tests", "fixtures"));
    // The DOCTOR-DERIVED dimensions have no fixtures content to evaluate:
    // they must be honest about it (never a fabricated PASS). The
    // context-free structural checks (zero-network, determinism, version
    // consistency) legitimately still evaluate on the temp tree.
    const doctorDerived = report.dimensions.filter((d) =>
      d.evidenceRefs.some((r) => r.startsWith("doctor:")),
    );
    expect(doctorDerived.length).toBeGreaterThan(0);
    for (const d of doctorDerived) {
      expect(d.determination, d.id).not.toBe("PASS");
    }
    expect(report.verdict.releaseTrust).toBe("FAILED");
  });
});
