/**
 * Category consistency across the three `--category` verbs
 * (certification-audit Phase 1.3, F3/D6).
 *
 * scan, why and handoff must agree on what a valid category is: every
 * RULE_CATEGORIES value accepted, unknown values rejected with exit 10
 * in ALL three, and the registry's categories ⊆ the closed set. The
 * shared validator (isValidCategory) is the mechanism; these tests pin
 * the observable behavior per verb through the public handlers.
 */

import { describe, expect, it } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { RULE_CATEGORIES, isValidCategory } from "../../src/types.js";
import { runWhyCommand } from "../../src/commands/why.js";
import { runHandoffCommand } from "../../src/commands/handoff.js";
import { runScanCommand } from "../../src/cli.js";
import type { Output } from "../../src/cli-io.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEMO = join(ROOT, "examples", "demo-repo");

type Sink = {
  out: string[];
  err: string[];
  io: { out: Output; err: Output };
};

function sink(): Sink {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: {
      out: (s: unknown) => out.push(String(s)),
      err: (s: unknown) => err.push(String(s)),
    },
  };
}

describe("category consistency across verbs (F3/D6)", () => {
  it("the closed set has the 13 documented categories, in D6 order", () => {
    expect(RULE_CATEGORIES).toEqual([
      "QA-TEST",
      "QA-TQUAL",
      "QA-PW",
      "QA-CI",
      "QA-PY",
      "QA-ENV",
      "QA-JV",
      "QA-CS",
      "QA-CYP",
      "QA-SE",
      "QA-WDIO",
      "QA-PPTR",
      "QA-APM",
    ]);
  });

  it("the shared validator agrees with the closed set (case-sensitive)", () => {
    for (const c of RULE_CATEGORIES) expect(isValidCategory(c)).toBe(true);
    expect(isValidCategory("QA-NOPE")).toBe(false);
    expect(isValidCategory(undefined)).toBe(false);
    expect(isValidCategory("qa-test")).toBe(false);
  });

  it("why: unknown --category is a usage error (exit 10) in every position", async () => {
    for (const argv of [
      ["--category", "QA-NOPE", DEMO, "1"],
      [DEMO, "1", "--category", "QA-NOPE"],
      [DEMO, "1", "--category"], // missing value
    ]) {
      const { io, err } = sink();
      const code = await runWhyCommand(argv, io);
      expect(code, JSON.stringify(argv)).toBe(10);
      expect(err.join("\n")).toContain("unknown --category");
      expect(err.join("\n")).toContain("Valid categories:");
    }
  });

  it("handoff: unknown --category is a usage error (exit 10) before file IO", () => {
    const { io, err } = sink();
    // A missing report would exit 10 later ("report file not found") —
    // but the category check must fire FIRST (parse-time validation).
    const code = runHandoffCommand(
      ["--category", "QA-NOPE", "/no/report.json"],
      io,
    );
    expect(code).toBe(10);
    expect(err.join("\n")).toContain("unknown --category");
  });

  it("scan: unknown --category is a usage error (exit 10) — contract kept", async () => {
    const { io, err } = sink();
    const code = await runScanCommand(["--category", "QA-NOPE", DEMO], io);
    expect(code).toBe(10);
    expect(err.join("\n")).toContain("category");
  });

  it(
    "every RULE_CATEGORIES value is accepted by why (exit 0 or 1, never 10)",
    { timeout: 120_000 },
    async () => {
      // One live why invocation per category against a REAL demo-repo
      // file (the location must parse for the usage-error distinction to
      // be observable). Each runs a real scan — 13 × ~1.5s on a dev
      // box, more on loaded CI — so journey-class timeout headroom.
      for (const cat of RULE_CATEGORIES) {
        const { io } = sink();
        const code = await runWhyCommand(
          [join(DEMO, "e2e", "login.spec.ts") + ":1", "--category", cat],
          io,
        );
        expect(code, `category ${cat}`).toBeLessThan(10);
      }
    },
  );

  it("every RULE_CATEGORIES value passes handoff parsing (no unknown-category error)", () => {
    for (const cat of RULE_CATEGORIES) {
      const { err, io } = sink();
      // Point at a missing report: handoff exits 10 with "report file
      // not found" — but NOT with "unknown --category". The category
      // must pass parsing to reach the file check.
      const code = runHandoffCommand(
        ["--category", cat, "/no/report.json"],
        io,
      );
      expect(code, `category ${cat}`).toBe(10);
      expect(err.join("\n")).not.toContain("unknown --category");
    }
  });

  it(
    "end-to-end: a valid --category filters the why view without a usage error",
    { timeout: 60_000 },
    async () => {
      const { io, out } = sink();
      const code = await runWhyCommand(
        [join(DEMO, "e2e", "login.spec.ts") + ":1", "--category", "QA-SE"],
        io,
      );
      // 0 = filtered findings rendered, 1 = none matched the category —
      // both are successful category handling; 10 would be a usage error.
      expect([0, 1]).toContain(code);
      expect(out.length).toBeGreaterThan(0);
    },
  );
});
