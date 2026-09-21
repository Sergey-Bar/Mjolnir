/**
 * F1 (certification-audit remediation): schema-incomplete reports must be
 * rejected by the SHARED loader, not crash downstream.
 *
 * Audit evidence (QA/FINAL-RELEASE/evidence/151186b/false-green/
 * fg-partial-summary.out): a hand-written minimal report
 * `{schemaVersion:1, partial:true, score:100, findings:[],
 * analysisStatus:{...}}` — schema-1-shaped but WITHOUT the required
 * `frameworks` array — crashed `summary` with an uncaught TypeError at
 * `result.frameworks.length` (exit 1 + raw stack) instead of the
 * documented invalid-report contract: exit 2 + message on stderr,
 * never a stack.
 *
 * The fix lives in report-io.validateReportJson (one loader, one
 * validation, one error shape — the header contract), so summary,
 * handoff AND why are all pinned here through their public handlers.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { Output } from "../../src/cli-io.js";
import { runHandoffCommand } from "../../src/commands/handoff.js";
import { runSummaryCommand } from "../../src/commands/summary.js";
import { runWhyCommand } from "../../src/commands/why.js";

let dir: string | undefined;
afterEach(() => {
  if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

/** The EXACT audit fixture shape: schema-1 header, no `frameworks`. */
function schemaIncompleteReport(): string {
  return JSON.stringify({
    schemaVersion: 1,
    partial: true,
    score: 100,
    findings: [],
    analysisStatus: {
      mode: "static",
      note: "hand-written stub discovered by the Cycle-0 audit",
    },
  });
}

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: ((s: unknown) => (out += `${String(s)}\n`)) as Output,
      err: ((s: unknown) => (err += `${String(s)}\n`)) as Output,
    },
    text: () => out,
    errText: () => err,
  };
}

function writeFixture(name: string): string {
  dir ??= mkdtempSync(join(tmpdir(), "mjolnir-f1-invalid-"));
  const p = join(dir, name);
  writeFileSync(p, schemaIncompleteReport());
  return p;
}

describe("F1 — schema-incomplete report (no frameworks array) is an honest exit 2", () => {
  it("summary: exit 2 + message on stderr, never a stack, never exit 1", () => {
    const p = writeFixture("fg-partial.json");
    const cap = capture();
    expect(runSummaryCommand([p], cap.io)).toBe(2);
    expect(cap.errText()).toContain('missing a "frameworks" array');
    expect(cap.errText()).toContain("complete Mjölnir --json report");
    expect(cap.errText()).not.toMatch(/TypeError|at \S+:\d+/);
  });

  it("handoff: exit 2 with the same shared-loader message", () => {
    const p = writeFixture("fg-partial.json");
    const cap = capture();
    expect(runHandoffCommand([p], cap.io)).toBe(2);
    expect(cap.errText()).toContain('missing a "frameworks" array');
    expect(cap.errText()).not.toMatch(/TypeError|at \S+:\d+/);
  });

  it("why (saved-report mode): exit 2 with the same shared-loader message", async () => {
    const p = writeFixture("fg-partial.json");
    const cap = capture();
    expect(await runWhyCommand(["src/a.ts:1", "--json", p], cap.io)).toBe(2);
    expect(cap.errText()).toContain('missing a "frameworks" array');
    expect(cap.errText()).not.toMatch(/TypeError|at \S+:\d+/);
  });

  it("a COMPLETE report still loads (frameworks present → no regression)", () => {
    dir ??= mkdtempSync(join(tmpdir(), "mjolnir-f1-invalid-"));
    const p = join(dir, "complete.json");
    writeFileSync(
      p,
      JSON.stringify({
        schemaVersion: 1,
        partial: false,
        score: 100,
        frameworks: [],
        frameworkDetectionUnknown: true,
        dimensions: [],
        findings: [],
      }),
    );
    const cap = capture();
    expect(runHandoffCommand([p], cap.io)).toBe(0);
    expect(cap.text()).toContain("Fix Handoff");
  });
});
