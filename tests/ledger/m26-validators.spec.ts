import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createExternalValidationRecord,
  validateExternalValidationRecord,
  validateGapLedger,
  validateGapLedgerJsonl,
  validateGapLedgerRecord,
  validateGitHubSnapshot,
  validateSupportMatrix,
  validateSupportMatrixRecord,
} from "../../src/ledger/m26-validators.js";

const SCHEMA_DIR = join(import.meta.dirname, "..", "..", "schemas", "m26");

function snapshot(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    provenance: {
      source: "local-export",
      capturedBy: "test",
      population: "all-state",
      networkAccess: false,
      archiveCount: 0,
      liveCount: 0,
      disposition: "NOT_RECONCILED",
    },
    observedAt: "2026-09-25T00:00:00.000Z",
    baseSha: "a".repeat(40),
    issues: [],
    milestones: [],
    pullRequests: [],
    reconciliation: {
      state: "RECONCILED",
      diagnostics: [],
      issue_count: 0,
      milestone_count: 0,
      pull_request_count: 0,
      duplicate_issue_numbers: [],
      cross_milestone_issue_numbers: [],
      counter_mismatches: [],
      not_planned_closures: [],
    },
  };
}

function populatedSnapshot(): Record<string, unknown> {
  const value = snapshot();
  value.issues = [
    {
      number: 1,
      title: "A local issue",
      url: "https://example.invalid/issues/1",
      state: "closed",
      state_reason: "completed",
      milestone: { number: 26, title: "M26" },
      milestone_numbers: [26],
      labels: ["m26"],
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-02T00:00:00.000Z",
      closed_at: "2026-09-02T00:00:00.000Z",
      last_commit_sha: "b".repeat(40),
      last_pull_request_number: 2,
      body_sha256: "c".repeat(64),
      evidence_links: ["local-export#issue-1"],
    },
  ];
  value.milestones = [
    {
      number: 26,
      title: "M26",
      state: "open",
      open_issues: 0,
      closed_issues: 1,
      due_on: null,
      description: null,
    },
  ];
  value.pullRequests = [
    {
      number: 2,
      title: "A local pull request",
      url: "https://example.invalid/pulls/2",
      state: "merged",
      head_sha: "d".repeat(40),
      base_sha: "a".repeat(40),
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-02T00:00:00.000Z",
      merged_at: "2026-09-02T00:00:00.000Z",
    },
  ];
  const reconciliation = value.reconciliation as Record<string, unknown>;
  reconciliation.issue_count = 1;
  reconciliation.milestone_count = 1;
  reconciliation.pull_request_count = 1;
  return value;
}

function gap(
  id: string,
  status: "open" | "fixed" | "ALREADY_FIXED" | "STALE_UNVERIFIABLE" = "open",
  supersedes?: string,
  supersededBy?: string,
): Record<string, unknown> {
  const cleared = status === "fixed" || status === "ALREADY_FIXED";
  return {
    schemaVersion: 1,
    gap_id: id,
    source_url_or_command: "local test fixture",
    source_kind: "test",
    severity: "high",
    category: "contract",
    affected_surface: "ledger",
    affected_version_or_milestone: "M26",
    reproduction_or_proof: "fixture reproduces the state",
    expected_behavior: "the contract remains explicit",
    actual_behavior: "the contract remains explicit",
    user_or_security_impact: "no user impact",
    owner: "qa-owner",
    target_train: "M26",
    status,
    fix_design: "retain the explicit state",
    regression_test: "tests/ledger/m26-validators.spec.ts",
    revalidation_command: "npx vitest run tests/ledger/m26-validators.spec.ts",
    evidence_artifact: "tests/ledger/m26-validators.spec.ts",
    expiry_or_revisit_trigger: "next candidate review",
    rollback_artifact: "revert the ledger record",
    dependencies: [],
    closure_evidence:
      status === "fixed"
        ? {
            candidate: "candidate-1",
            observed_at: "2026-09-25T00:00:00.000Z",
            command: "local fixture",
            result: "PASS",
            artifacts: ["fixture-output.txt"],
          }
        : null,
    // BW-001: a cleared row must carry a revalidation that was actually
    // run, at a named commit. `GAP-M26-002` was written `fixed` citing the
    // script that produced the artifacts it claimed to prove, which is the
    // hole this block closes.
    ...(cleared
      ? {
          revalidation: {
            command: "npx vitest run tests/ledger/m26-validators.spec.ts",
            exit_code: 0,
            observed_at_base_sha: "a".repeat(40),
            observed: "the fixture validator accepts the record",
          },
        }
      : {}),
    ...(supersedes === undefined ? {} : { supersedes }),
    ...(supersededBy === undefined ? {} : { superseded_by: supersededBy }),
  };
}

function matrix(
  id: string,
  disposition: "TESTED" | "NOT_APPLICABLE" | "BLOCKED",
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    cell_id: id,
    axis: "surface",
    cell: id.replace("MATRIX-", ""),
    disposition,
    owner: "qa-owner",
    evidence: ["tests/ledger/m26-validators.spec.ts"],
    command: "npx vitest run tests/ledger/m26-validators.spec.ts",
    fixture: "local fixture",
    observed_result: disposition === "TESTED" ? "PASS" : "NOT_RUN",
    resource_budget: { durationMs: 1000 },
    last_candidate: "candidate-1",
    ...(disposition === "NOT_APPLICABLE"
      ? { not_applicable_rationale: "not part of this contract" }
      : {}),
    ...(disposition === "BLOCKED"
      ? {
          blocked_reason: "external evidence is unavailable",
          revisit_trigger: "next external review",
        }
      : {}),
  };
}

function externalPass(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    record_id: "EXT-M26-001",
    protocol: "consented design-partner task",
    owner: "qa-owner",
    status: "PASS",
    execution_status: "RUN",
    candidate: "candidate-1",
    observed_at: "2026-09-25T00:00:00.000Z",
    consent: { state: "CONSENTED", evidence: ["consent-record"] },
    evidence: ["scrubbed-observation"],
    retention: { policy: "30 days", deletion_status: "COMPLETE" },
    support_requests: [],
    claim_review: { status: "COMPLETE", evidence: ["claim-review"] },
    limitations: ["single cohort"],
    result: "task completed",
  };
}

describe("M26 repository-owned schemas", () => {
  it("are valid JSON documents", () => {
    for (const name of [
      "github-snapshot.schema.json",
      "gap-ledger-record.schema.json",
      "support-matrix-record.schema.json",
      "external-validation-record.schema.json",
    ]) {
      const raw = readFileSync(join(SCHEMA_DIR, name), "utf8");
      expect(() => JSON.parse(raw) as unknown).not.toThrow();
    }
  });

  it("keeps absent and non-object inputs fail-closed", () => {
    expect(validateGitHubSnapshot("not-an-object").status).toBe("FAIL");
    expect(validateGapLedgerRecord(null).status).toBe("BLOCKED");
    expect(validateGapLedgerRecord([]).status).toBe("FAIL");
    expect(validateSupportMatrixRecord(null).status).toBe("BLOCKED");
    expect(validateSupportMatrixRecord("not-an-object").status).toBe("FAIL");
    expect(validateExternalValidationRecord([]).status).toBe("FAIL");
    expect(validateGapLedgerJsonl("").status).toBe("BLOCKED");
  });
});

describe("GitHub snapshot validator", () => {
  it("accepts a reconciled local snapshot with separate collections", () => {
    const result = validateGitHubSnapshot(snapshot());
    expect(result.status).toBe("PASS");
    expect(result.valid).toBe(true);
  });

  it("validates issue, milestone, and pull-request records independently", () => {
    expect(validateGitHubSnapshot(populatedSnapshot()).status).toBe("PASS");
  });

  it("blocks an absent snapshot", () => {
    const result = validateGitHubSnapshot(undefined);
    expect(result.status).toBe("BLOCKED");
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "GITHUB_SNAPSHOT_ABSENT",
    );
  });

  it("does not treat NOT_RUN reconciliation as a pass", () => {
    const value = snapshot();
    const reconciliation = value.reconciliation as Record<string, unknown>;
    reconciliation.state = "NOT_RUN";
    expect(validateGitHubSnapshot(value).status).toBe("BLOCKED");
  });

  it("records network provenance without making a network call", () => {
    const value = snapshot();
    const provenance = value.provenance as Record<string, unknown>;
    provenance.networkAccess = true;
    const result = validateGitHubSnapshot(value);
    expect(result.status).toBe("BLOCKED");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "NETWORK_ACCESS",
    );
  });

  it("does not hide malformed or duplicate issue records", () => {
    const malformed = populatedSnapshot();
    const issue = (malformed.issues as Record<string, unknown>[])[0];
    if (issue) {
      issue.title = 1;
      issue.state = "unknown";
      issue.milestone = 1;
      issue.labels = [""];
      issue.created_at = "not-a-date";
      issue.body_sha256 = "not-a-sha";
    }
    const milestone = (malformed.milestones as Record<string, unknown>[])[0];
    if (milestone) milestone.state = "unknown";
    const pullRequest = (
      malformed.pullRequests as Record<string, unknown>[]
    )[0];
    if (pullRequest) pullRequest.head_sha = "not-a-sha";
    expect(validateGitHubSnapshot(malformed).status).toBe("FAIL");

    const mismatch = populatedSnapshot();
    const mismatchMilestone = (
      mismatch.milestones as Record<string, unknown>[]
    )[0];
    if (mismatchMilestone) mismatchMilestone.open_issues = 1;
    expect(validateGitHubSnapshot(mismatch).status).toBe("BLOCKED");

    const duplicate = populatedSnapshot();
    const duplicateIssue = (duplicate.issues as Record<string, unknown>[])[0];
    if (duplicateIssue)
      duplicate.issues = [duplicateIssue, { ...duplicateIssue }];
    expect(validateGitHubSnapshot(duplicate).status).toBe("BLOCKED");
  });
});

describe("gap ledger validators", () => {
  it("accepts a complete open record and a JSONL supersession chain", () => {
    const first = gap("GAP-M26-001", "open", undefined, "GAP-M26-002");
    const second = gap("GAP-M26-002", "fixed", "GAP-M26-001");
    expect(validateGapLedgerRecord(first).status).toBe("PASS");
    const result = validateGapLedger([first, second]);
    expect(result.status).toBe("PASS");
    const jsonl = `${JSON.stringify(first)}\n${JSON.stringify(second)}\n`;
    expect(validateGapLedgerJsonl(jsonl).status).toBe("PASS");
  });

  it("blocks aggregation while an open release blocker lacks closure", () => {
    const value = gap("GAP-M26-RELEASE");
    value.severity = "release-blocker";
    expect(validateGapLedgerRecord(value).status).toBe("PASS");
    expect(validateGapLedger([value]).status).toBe("BLOCKED");
    expect(validateGapLedgerJsonl(JSON.stringify(value)).status).toBe(
      "BLOCKED",
    );
  });

  it("rejects duplicate stable IDs", () => {
    const result = validateGapLedger([gap("GAP-M26-001"), gap("GAP-M26-001")]);
    expect(result.status).toBe("FAIL");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "DUPLICATE_GAP_ID",
    );
  });

  it("requires closure evidence for a closed record", () => {
    const value = gap("GAP-M26-001", "fixed");
    value.closure_evidence = null;
    const result = validateGapLedgerRecord(value);
    expect(result.status).toBe("FAIL");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "MISSING_CLOSURE_EVIDENCE",
    );
  });

  it("rejects an unowned record", () => {
    const value = gap("GAP-M26-001");
    value.owner = "UNOWNED";
    expect(validateGapLedgerRecord(value).status).toBe("FAIL");
  });

  it("refuses to clear a gap with no revalidation (BW-001)", () => {
    // The specific hole GAP-M26-002 fell through: a row typed `fixed` with
    // a PASS recorded, and no way to tell which tree that PASS described.
    for (const status of ["fixed", "ALREADY_FIXED"] as const) {
      const value = gap("GAP-M26-001", status);
      delete value.revalidation;
      const result = validateGapLedgerRecord(value);
      expect(result.status, status).toBe("FAIL");
      expect(
        result.diagnostics.map((d) => d.code),
        status,
      ).toContain("FIX_WITHOUT_REVALIDATION");
    }
  });

  it("refuses a revalidation that is missing its commit", () => {
    // A PASS with no base SHA is the same hole one field narrower.
    const value = gap("GAP-M26-001", "fixed");
    delete (value.revalidation as Record<string, unknown>).observed_at_base_sha;
    expect(
      validateGapLedgerRecord(value).diagnostics.map((d) => d.code),
    ).toContain("FIX_WITHOUT_REVALIDATION");
  });

  it("treats STALE_UNVERIFIABLE as NOT cleared, so it cannot unblock a release", () => {
    // An unverifiable claim must never be able to satisfy a gate. This is
    // the reason the class exists separately from `open`.
    const value = gap("GAP-M26-RELEASE", "open");
    value.status = "STALE_UNVERIFIABLE";
    value.severity = "release-blocker";
    expect(validateGapLedgerRecord(value).status).toBe("PASS");
    expect(validateGapLedger([value]).status).toBe("BLOCKED");
  });

  it("clears a release blocker whose revalidation passed (ALREADY_FIXED)", () => {
    const value = gap("GAP-M26-RELEASE", "ALREADY_FIXED");
    value.severity = "release-blocker";
    expect(validateGapLedgerRecord(value).status).toBe("PASS");
    expect(validateGapLedger([value]).status).toBe("PASS");
  });

  it("still blocks a release blocker whose revalidation FAILED", () => {
    const value = gap("GAP-M26-RELEASE", "ALREADY_FIXED");
    value.severity = "release-blocker";
    (value.revalidation as Record<string, unknown>).exit_code = 1;
    // The row claims it is fixed and records that the command failed. That
    // contradiction is a hard error, not a warning: the record asserts
    // something its own evidence refutes, so it fails validation outright
    // rather than quietly blocking.
    const result = validateGapLedgerRecord(value);
    expect(result.diagnostics.map((d) => d.code)).toContain("UNRUN_CLOSURE");
    expect(result.status).toBe("FAIL");
    expect(validateGapLedger([value]).status).toBe("FAIL");
  });

  it("requires reciprocal supersession links", () => {
    const first = gap("GAP-M26-001", "open", undefined, "GAP-M26-002");
    const second = gap("GAP-M26-002");
    const result = validateGapLedger([first, second]);
    expect(result.status).toBe("FAIL");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "SUPERSESSION_LINK_MISMATCH",
    );
  });

  it("rejects malformed JSONL and dependency cycles", () => {
    expect(validateGapLedgerJsonl("not-json").status).toBe("FAIL");
    const first = gap("GAP-M26-001");
    const second = gap("GAP-M26-002");
    first.dependencies = ["GAP-M26-002"];
    second.dependencies = ["GAP-M26-001"];
    const result = validateGapLedger([first, second]);
    expect(result.status).toBe("FAIL");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "DEPENDENCY_CYCLE",
    );
  });

  it("reports malformed required fields and supersession values", () => {
    const value = gap("GAP-M26-001");
    value.severity = "unknown";
    value.status = "accepted";
    value.dependencies = "not-an-array";
    value.closure_evidence = { candidate: "candidate-1" };
    value.supersedes = "not-an-id";
    value.superseded_by = "not-an-id";
    const result = validateGapLedgerRecord(value);
    expect(result.status).toBe("FAIL");
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

describe("support matrix validators", () => {
  it("accepts a tested cell with either command or fixture evidence", () => {
    const value = matrix("MATRIX-SURFACE-CLI", "TESTED");
    delete value.fixture;
    expect(validateSupportMatrixRecord(value).status).toBe("PASS");
  });

  it("accepts tested and explicitly not-applicable cells", () => {
    const result = validateSupportMatrix([
      matrix("MATRIX-SURFACE-CLI", "TESTED"),
      matrix("MATRIX-SURFACE-SITE", "NOT_APPLICABLE"),
    ]);
    expect(result.status).toBe("PASS");
  });

  it("keeps blocked cells blocked", () => {
    const record = matrix("MATRIX-SURFACE-REMOTE", "BLOCKED");
    expect(validateSupportMatrixRecord(record).status).toBe("BLOCKED");
    expect(validateSupportMatrix([record]).status).toBe("BLOCKED");
  });

  it("blocks missing finite cells and rejects missing evidence fields", () => {
    const expected = validateSupportMatrix(
      [matrix("MATRIX-SURFACE-CLI", "TESTED")],
      ["MATRIX-SURFACE-CLI", "MATRIX-SURFACE-REMOTE"],
    );
    expect(expected.status).toBe("BLOCKED");
    const record = matrix("MATRIX-SURFACE-CLI", "TESTED");
    delete record.evidence;
    expect(validateSupportMatrixRecord(record).status).toBe("BLOCKED");
  });

  it("requires a rationale for not-applicable and a reason for blocked", () => {
    const notApplicable = matrix("MATRIX-SURFACE-SITE", "NOT_APPLICABLE");
    delete notApplicable.not_applicable_rationale;
    expect(validateSupportMatrixRecord(notApplicable).status).toBe("FAIL");

    const blocked = matrix("MATRIX-SURFACE-REMOTE", "BLOCKED");
    delete blocked.revisit_trigger;
    expect(validateSupportMatrixRecord(blocked).status).toBe("FAIL");

    const tested = matrix("MATRIX-SURFACE-CLI", "TESTED");
    tested.observed_result = "NOT_RUN";
    expect(validateSupportMatrixRecord(tested).status).toBe("FAIL");
  });

  it("rejects malformed matrix fields and duplicate cells", () => {
    const value = matrix("MATRIX-SURFACE-CLI", "TESTED");
    value.schemaVersion = 2;
    value.cell_id = "bad";
    value.owner = "UNOWNED";
    value.evidence = [];
    value.command = 1;
    value.fixture = "";
    value.observed_result = "";
    value.resource_budget = {};
    value.last_candidate = "";
    expect(validateSupportMatrixRecord(value).status).toBe("FAIL");

    const first = matrix("MATRIX-SURFACE-CLI", "TESTED");
    const duplicate = validateSupportMatrix([
      first,
      matrix("MATRIX-SURFACE-CLI", "TESTED"),
    ]);
    expect(duplicate.status).toBe("FAIL");
  });
});

describe("external validation validator", () => {
  it("defaults an absent record to BLOCKED and NOT_RUN", () => {
    const record = createExternalValidationRecord();
    expect(record.status).toBe("BLOCKED");
    expect(record.execution_status).toBe("NOT_RUN");
    const result = validateExternalValidationRecord(record);
    expect(result.status).toBe("BLOCKED");
    expect(result.valid).toBe(false);
  });

  it("rejects a PASS claim without candidate-bound evidence", () => {
    const value = externalPass();
    value.evidence = [];
    const result = validateExternalValidationRecord(value);
    expect(result.status).toBe("BLOCKED");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "EXTERNAL_VALIDATION_PASS_UNSUPPORTED",
    );
  });

  it("accepts a complete consented record", () => {
    expect(validateExternalValidationRecord(externalPass()).status).toBe(
      "PASS",
    );
  });

  it("keeps malformed and missing external records fail-closed", () => {
    expect(validateExternalValidationRecord(undefined).status).toBe("BLOCKED");
    const value = externalPass();
    value.consent = { state: "NOT_RECORDED", evidence: [] };
    value.status = "PASS";
    const result = validateExternalValidationRecord(value);
    expect(result.status).toBe("BLOCKED");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "EXTERNAL_VALIDATION_PASS_UNSUPPORTED",
    );
  });

  it("rejects malformed external protocol fields", () => {
    const value = externalPass();
    value.schemaVersion = 2;
    value.record_id = "bad";
    value.owner = "UNASSIGNED";
    value.status = "UNKNOWN";
    value.execution_status = "UNKNOWN";
    value.consent = { state: "UNKNOWN", evidence: [1] };
    value.retention = { policy: "", deletion_status: "UNKNOWN" };
    value.claim_review = { status: "UNKNOWN", evidence: [1] };
    value.candidate = 1;
    value.observed_at = "not-a-date";
    value.evidence = [1];
    expect(validateExternalValidationRecord(value).status).toBe("FAIL");
  });
});
