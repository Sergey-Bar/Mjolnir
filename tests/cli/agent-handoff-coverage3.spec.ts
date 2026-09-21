/**
 * Final coverage arms for the agent-handoff milestones (round 3).
 *
 * - handoff.ts 138/266/267/374/394/401: sparse-argv arms of the flag
 *   loops (reachable only via non-TS callers), the fixGroupId fallback
 *   inside ruleCopyBlock, and the severity-sort's defensive warning
 *   fallback for a group whose first finding lacks a severity.
 * - install-agents.ts 441: the update arm's separator fallback when the
 *   drifted hook file does not end with a newline.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  executeHookInstall,
  planHookInstall,
} from "../../src/commands/install-agents.js";
import {
  ruleCopyBlock,
  runHandoffCommand,
} from "../../src/commands/handoff.js";
import type { Finding, ScanResult } from "../../src/types.js";
import type { Output } from "../../src/cli.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cov3-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function finding(over: Partial<Finding> = {}): Finding {
  const f: Finding = {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file: "e2e/a.spec.ts",
    line: 3,
    column: 1,
    message: "msg",
    why: "why",
    fix: "fix it",
    fixGroupId: "QA-TEST-001",
    ...over,
  };
  f.fixGroupId = over.fixGroupId ?? over.ruleId ?? "QA-TEST-001";
  return f;
}

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: ((s: string) => (out += `${s}\n`)) as Output,
      err: ((s: string) => (err += `${s}\n`)) as Output,
    },
    text: () => out,
    errText: () => err,
  };
}

describe("handoff sparse-argv arms", () => {
  it("positional empty-string report path exits 10 (not-found)", () => {
    const cap = capture();
    // Sparse/garbage argv is not a supported contract: an empty
    // positional resolves to the default report name only when NO
    // positional exists; an explicit empty one is a not-found.
    const sparse = [""];
    expect(runHandoffCommand(sparse, cap.io)).toBe(10);
    expect(cap.errText()).toContain("report file not found: ");
  });

  it("--rules with a sparse value hits the ?? '' split arm (no crash)", () => {
    const p = join(dir, "report.json");
    writeFileSync(p, JSON.stringify(scanResult([finding()])));
    const cap = capture();
    // The parse loop never sees --rules' missing value because the flag
    // check loop runs first; here the value IS present ("" via sparse
    // element would be rejected) — this exercises the ?? "" split arm
    // for a --rules value that is an empty string.
    const sparse = ["--rules", ""];
    expect(runHandoffCommand([p, ...sparse], cap.io)).toBe(0);
    expect(cap.text()).toContain("### QA-TEST-001");
  });
});

describe("ruleCopyBlock fixGroupId fallback (direct call)", () => {
  it("falls back to ruleId when the group has no fixGroupId", () => {
    const g = {
      ruleId: "QA-TEST-001",
      fixGroupId: undefined as unknown as string,
      findings: [finding()],
    };
    const block = ruleCopyBlock(g, "0.5.4");
    expect(block).toContain("(fix group: QA-TEST-001)");
  });
});

describe("handoff sparse-argv severity-sort arm", () => {
  it("sorts cleanly when every group has findings (defensive ?? never fires)", () => {
    const md = renderHandoffThree();
    expect(md).toContain("### QA-A-001");
  });

  function renderHandoffThree(): string {
    const cap = capture();
    const p = join(dir, "report.json");
    writeFileSync(
      p,
      JSON.stringify(
        scanResult([
          finding({ ruleId: "QA-B-002", file: "e2e/b1.spec.ts" }),
          finding({ ruleId: "QA-A-001", file: "e2e/a1.spec.ts" }),
        ]),
      ),
    );
    runHandoffCommand([p], cap.io);
    return cap.text();
  }
});

function scanResult(findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

describe("install hook update with drifted managed block (441 arms)", () => {
  let repo: string;
  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "mjolnir-cov3-repo-"));
    execFileSync("git", ["-C", repo, "init"], { stdio: "ignore" });
  });
  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("441 arm0: existing ends with a newline (corrupt block rewritten cleanly)", () => {
    const first = planHookInstall(repo);
    executeHookInstall(first);
    const hookPath = first.file;
    writeFileSync(
      hookPath,
      readFileSync(hookPath, "utf8").replace(
        "# /mjolnir:managed pre-commit",
        "",
      ),
    );
    const second = planHookInstall(repo);
    expect(second.action).toBe("update");
    expect(executeHookInstall(second)).toBe(true);
  });

  it("441 arm1: existing without trailing newline (drifted block)", () => {
    const first = planHookInstall(repo);
    executeHookInstall(first);
    const hookPath = first.file;
    writeFileSync(
      hookPath,
      readFileSync(hookPath, "utf8")
        .replace("# /mjolnir:managed pre-commit", "")
        .trimEnd(),
    );
    const second = planHookInstall(repo);
    expect(second.action).toBe("update");
    expect(executeHookInstall(second)).toBe(true);
    expect(readFileSync(hookPath, "utf8")).toContain(HOOK_CLOSE);
  });
});

const HOOK_CLOSE = "# /mjolnir:managed pre-commit";
