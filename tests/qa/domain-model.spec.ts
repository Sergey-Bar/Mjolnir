import { describe, expect, it } from "vitest";
import {
  QA_DOMAIN_IDS,
  QA_DOMAIN_RECORDS,
  type QaDomainModel,
  type QaDomainRecord,
  type QaEvidenceReference,
  serializeQaDomainModel,
  stableStringify,
  validateQaDomainModel,
} from "../../src/qa/domain-model.js";

const CANDIDATE = "candidate-2";

function evidence(
  id: string,
  candidate = CANDIDATE,
  state: QaEvidenceReference["state"] = "FRESH",
  support: QaEvidenceReference["support"] = "SUPPORTED",
): QaEvidenceReference {
  return {
    id,
    source: `local-evidence/${id}`,
    candidate,
    state,
    support,
    observedAt: "2026-09-25T00:00:00.000Z",
  };
}

function record(
  domain: QaDomainRecord["domain"],
  overrides: Record<string, unknown> = {},
): QaDomainRecord {
  return {
    id: `${domain}-1`,
    domain,
    maturity: "MEASURED",
    source: "local model",
    runtimeEvidence: [evidence(`${domain}-runtime`)],
    externalEvidence: [],
    owner: "qa-owner",
    limitation: "bounded local evidence",
    trustBoundary: "repository evidence only",
    nextAction: "rerun the domain check",
    candidate: CANDIDATE,
    ...overrides,
  };
}

function model(records: QaDomainRecord[]): QaDomainModel {
  return {
    schemaVersion: 1,
    candidate: CANDIDATE,
    records,
  };
}

describe("M31 QA domain model", () => {
  it("defines the bounded domain set", () => {
    expect(QA_DOMAIN_IDS).toEqual([
      "requirements",
      "risk",
      "test-strategy",
      "test-data",
      "api",
      "accessibility",
      "performance",
      "security",
      "mobile",
      "exploratory-observability",
      "release-evidence",
    ]);
  });

  it("publishes bounded records for every domain", () => {
    expect(QA_DOMAIN_RECORDS.map((candidate) => candidate.domain)).toEqual([
      ...QA_DOMAIN_IDS,
    ]);
    for (const candidate of QA_DOMAIN_RECORDS) {
      expect(candidate.maturity).toBeTruthy();
      expect(candidate.source).toBeTruthy();
      expect(candidate.runtimeEvidence).toEqual([]);
      expect(candidate.externalEvidence).toEqual([]);
      expect(candidate.owner).toBeTruthy();
      expect(candidate.limitation).toBeTruthy();
      expect(candidate.trustBoundary).toBeTruthy();
      expect(candidate.nextAction).toBeTruthy();
    }

    const result = validateQaDomainModel({
      schemaVersion: 1,
      candidate: "M31",
      records: QA_DOMAIN_RECORDS,
    });
    expect(result.status).toBe("PARTIAL");
    expect(result.gating).toBe(false);
  });

  it("keeps missing links blocking", () => {
    const result = validateQaDomainModel(
      model([
        record("requirements", {
          links: ["RISK-MISSING"],
        }),
      ]),
    );

    expect(result.status).toBe("FAIL");
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "MISSING_LINK",
    );
  });

  it("keeps unsupported evidence non-gating unless PASS is claimed", () => {
    const partial = validateQaDomainModel(
      model([
        record("security", {
          maturity: "PARTIAL",
          runtimeEvidence: [
            evidence("unsupported", CANDIDATE, "FRESH", "UNSUPPORTED"),
          ],
        }),
      ]),
    );
    expect(partial.status).toBe("PARTIAL");
    expect(partial.valid).toBe(true);
    expect(partial.gating).toBe(false);
    expect(partial.nonGatingDomains).toContain("security");

    const forgedPass = validateQaDomainModel(
      model([
        record("security", {
          maturity: "CERTIFIED",
          claim: "PASS",
          runtimeEvidence: [
            evidence("unsupported", CANDIDATE, "FRESH", "UNSUPPORTED"),
          ],
        }),
      ]),
    );
    expect(forgedPass.status).toBe("FAIL");
    expect(
      forgedPass.diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("UNSUPPORTED_EVIDENCE");
  });

  it("accepts a linked model with current supported evidence", () => {
    const result = validateQaDomainModel(
      model([
        record("requirements", { links: ["risk-1"] }),
        record("risk", {
          id: "risk-1",
          links: ["requirements-1"],
          externalEvidence: [evidence("external-review")],
        }),
      ]),
    );

    expect(result.status).toBe("PASS");
    expect(result.valid).toBe(true);
    expect(result.gating).toBe(true);
  });

  it("rejects malformed model envelopes without throwing", () => {
    const result = validateQaDomainModel({
      schemaVersion: 2,
      candidate: "",
      records: "not-an-array",
    });

    expect(result.status).toBe("FAIL");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "SCHEMA_VERSION",
        "MISSING_CANDIDATE",
        "MISSING_RECORDS",
      ]),
    );
  });

  it("keeps an empty slice partial", () => {
    const result = validateQaDomainModel(model([]));

    expect(result.status).toBe("PARTIAL");
    expect(result.valid).toBe(true);
    expect(result.gating).toBe(false);
  });

  it("blocks stale candidate evidence without turning a candidate slice into a pass", () => {
    const result = validateQaDomainModel(
      model([
        record("performance", {
          runtimeEvidence: [evidence("old-run", "candidate-1", "STALE")],
        }),
      ]),
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.gating).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "STALE_CANDIDATE",
    );
  });

  it("rejects a blank PASS claim", () => {
    const result = validateQaDomainModel(
      model([
        record("api", {
          claim: "PASS",
          source: " ",
          runtimeEvidence: [],
        }),
      ]),
    );

    expect(result.status).toBe("FAIL");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "BLANK_PASS_CLAIM",
    );
  });

  it("serializes equivalent models deterministically", () => {
    const requirement = record("requirements", {
      links: ["risk-1"],
      runtimeEvidence: [evidence("runtime-b"), evidence("runtime-a")],
    });
    const risk = record("risk", {
      id: "risk-1",
      links: ["requirements-1"],
      runtimeEvidence: [evidence("runtime-c")],
    });
    const first = serializeQaDomainModel(model([risk, requirement]));
    const second = serializeQaDomainModel(model([requirement, risk]));

    expect(first).toBe(second);
    expect(stableStringify(model([risk, requirement]))).toBe(
      stableStringify(model([requirement, risk])),
    );
    expect(first.endsWith("\n")).toBe(true);
  });
});
