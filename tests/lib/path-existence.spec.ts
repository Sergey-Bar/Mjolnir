/**
 * One existence check, three callers — and each of the three had a hole.
 *
 * Every artifact claim in this repository is a path inside a file. Three
 * validators read those claims and all three asked the same weak question —
 * "is this field a non-empty string?" — so a citation to a module the carve
 * deleted validated clean. This spec pins the shared check AND each caller,
 * because the class of defect was not "the check was wrong", it was "three
 * checks were written and none of them was strong".
 */

import { describe, expect, it } from "vitest";
import { join } from "node:path";

import {
  assertPathsExist,
  backtickedPaths,
  findMissingPaths,
} from "../../src/lib/path-existence.js";
import { validateGapLedgerRecord } from "../../src/ledger/m26-validators.js";

/** The repository root, resolved from this file rather than from cwd(). */
const ROOT = join(import.meta.dirname, "..", "..");

describe("the shared check", () => {
  it("reports only the claims whose path does not resolve", () => {
    const missing = findMissingPaths(ROOT, [
      { path: "package.json", citedBy: "real" },
      { path: "src/lib/does-not-exist.ts", citedBy: "planted" },
    ]);
    expect(missing).toEqual([
      { path: "src/lib/does-not-exist.ts", citedBy: "planted" },
    ]);
  });

  it("reports the same path cited by two sources, once per source", () => {
    // Two trains citing one dead module is two separate false claims about
    // that file, and the ROADMAP had exactly that shape.
    const missing = findMissingPaths(ROOT, [
      { path: "src/gone.ts", citedBy: "M33" },
      { path: "src/gone.ts", citedBy: "M34" },
    ]);
    expect(missing).toHaveLength(2);
  });

  it("reports one path once when the same source cites it twice", () => {
    const missing = findMissingPaths(ROOT, [
      { path: "src/gone.ts", citedBy: "M33" },
      { path: "src/gone.ts", citedBy: "M33" },
    ]);
    expect(missing).toHaveLength(1);
  });

  it("calls report per missing path so callers keep their own shape", () => {
    const seen: string[] = [];
    assertPathsExist(ROOT, [{ path: "src/a.ts", citedBy: "x" }], (m) =>
      seen.push(`${m.citedBy}:${m.path}`),
    );
    expect(seen).toEqual(["x:src/a.ts"]);
  });
});

describe("backticked paths in rendered markdown", () => {
  it("finds a repo-relative path", () => {
    expect(
      backtickedPaths("see `src/engine/resolution.ts` for details"),
    ).toEqual(["src/engine/resolution.ts"]);
  });

  it("ignores prose, flags, globs and absolute paths", () => {
    const md = [
      "the `gate` is red",
      "run with `--strict`",
      "matches `tests/**/*.spec.ts`",
      "at `/usr/local/bin`",
      "see https://example.com/x.md",
      "one `null` value",
    ].join("\n");
    expect(backtickedPaths(md)).toEqual([]);
  });

  it("ignores a path with spaces — that is prose in backticks", () => {
    expect(backtickedPaths("`the file does not exist here`")).toEqual([]);
  });
});

describe("caller (a): the M26 gap ledger", () => {
  const make = (over: Record<string, unknown>) => ({
    schemaVersion: 1,
    gap_id: "GAP-M26-999",
    severity: "high",
    status: "accepted",
    owner: "core-team",
    source_url_or_command: "n/a",
    source_kind: "audit",
    category: "scoring",
    affected_surface: "engine",
    affected_version_or_milestone: "v6",
    reproduction_or_proof: "n/a",
    expected_behavior: "n/a",
    actual_behavior: "n/a",
    user_or_security_impact: "n/a",
    target_train: "M40",
    fix_design: "n/a",
    // Real paths, on purpose: a fixture naming `tests/ledger/exists.spec.ts`
    // would be testing the check against a fiction, and if that file were ever
    // removed the "passes" arm would start failing for the wrong reason.
    regression_test: "tests/ledger/m26-validators.spec.ts",
    revalidation_command: "n/a",
    evidence_artifact: "docs/M26-GAP-LEDGER.jsonl",
    expiry_or_revisit_trigger: "n/a",
    rollback_artifact: "n/a",
    dependencies: [],
    disposition_reason: "n/a",
    release_consequence: "n/a",
    ...over,
  });

  it("PASSES a record whose cited paths exist", () => {
    const result = validateGapLedgerRecord(make({}), ROOT);
    expect(result.diagnostics.map((d) => d.code)).not.toContain(
      "UNRESOLVED_EVIDENCE_PATH",
    );
  });

  it("BLOCKS a record citing a deleted regression test", () => {
    // The defect: a non-empty string passed. A closure claim whose pointer
    // names a file the carve deleted is unverifiable, and it used to
    // validate PASS.
    const result = validateGapLedgerRecord(
      make({ regression_test: "tests/ledger/deleted-by-the-carve.spec.ts" }),
      ROOT,
    );
    expect(result.diagnostics.map((d) => d.code)).toContain(
      "UNRESOLVED_EVIDENCE_PATH",
    );
    expect(result.status).toBe("BLOCKED");
  });

  it("BLOCKS a record citing a deleted evidence artifact", () => {
    const result = validateGapLedgerRecord(
      make({ evidence_artifact: "docs/removed-artifact.md" }),
      ROOT,
    );
    expect(result.diagnostics.map((d) => d.code)).toContain(
      "UNRESOLVED_EVIDENCE_PATH",
    );
  });

  it("reports no path diagnostics when no root is supplied", () => {
    // A validator over a record has no repository. Inventing one from cwd()
    // would make validity depend on the working directory — the same bug the
    // check removes. Absent root means absent check, not a wrong answer.
    const result = validateGapLedgerRecord(
      make({ regression_test: "tests/ledger/deleted-by-the-carve.spec.ts" }),
    );
    expect(result.diagnostics.map((d) => d.code)).not.toContain(
      "UNRESOLVED_EVIDENCE_PATH",
    );
  });
});
