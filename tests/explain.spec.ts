/**
 * `qa-doctor explain` (Master-Stabilization-Plan Sprint 5, Task 19).
 *
 * The plan's own bar: "explain returns real content for 100% of
 * registered rule IDs — no rule can ship unexplainable." This is
 * checked directly against the live RULES registry so a newly added
 * rule with no fixture (a fixture-firewall violation `doctor` already
 * catches) would also fail here, not silently render an empty example.
 */

import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { explainRule, renderExplain } from "../src/commands/explain.js";
import { RULES } from "../src/rules/index.js";
import { runExplainCommand } from "../src/cli.js";

const FIXTURES_ROOT = join(import.meta.dirname, "fixtures");

describe("explainRule — 100% of registered rules", () => {
  it.each(RULES.map((r) => r.id))(
    "%s produces a real example from its own must-fire fixture",
    (id) => {
      const result = explainRule(id, FIXTURES_ROOT);
      expect(result.ok).toBe(true);
      expect(
        result.exampleFinding,
        `${id} has no example finding — either its must-fire fixture is ` +
          `missing/empty, or the rule doesn't fire on its own fixture ` +
          `(a fixture-firewall violation).`,
      ).toBeDefined();
      expect(result.exampleFinding?.why.length).toBeGreaterThan(0);
      expect(result.exampleFinding?.fix.length).toBeGreaterThan(0);
      expect(result.exampleFinding?.message.length).toBeGreaterThan(0);
    },
  );
});

describe("explainRule — error handling", () => {
  it("returns ok:false with a helpful message for an unknown rule ID", () => {
    const result = explainRule("QA-NOPE-999", FIXTURES_ROOT);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("QA-NOPE-999");
    expect(result.error).toContain("mjolnir rules");
  });

  it("degrades honestly (metadata only, no fabricated example) when the fixtures root doesn't exist", () => {
    const result = explainRule(
      "QA-TEST-004",
      join(FIXTURES_ROOT, "does-not-exist"),
    );
    expect(result.ok).toBe(true);
    expect(result.rule).toBeDefined();
    expect(result.exampleFinding).toBeUndefined();
  });
});

describe("renderExplain — snapshot stability per rule (determinism law)", () => {
  it.each(RULES.map((r) => r.id))(
    "%s renders identically across repeated calls",
    (id) => {
      const a = renderExplain(explainRule(id, FIXTURES_ROOT));
      const b = renderExplain(explainRule(id, FIXTURES_ROOT));
      expect(a).toBe(b);
    },
  );

  it("renders every required section for a rule with an example", () => {
    const text = renderExplain(explainRule("QA-TEST-004", FIXTURES_ROOT));
    expect(text).toContain("QA-TEST-004");
    expect(text).toContain("Severity:");
    expect(text).toContain("Confidence:");
    expect(text).toContain("Evidence:");
    expect(text).toContain("QA impact:");
    expect(text).toContain("WHAT WAS FOUND");
    expect(text).toContain("WHY IT MATTERS");
    expect(text).toContain("HOW TO FIX");
    expect(text).toContain("HOW TO VERIFY THE FIX");
  });

  it("renders an honest no-example message instead of fabricating one", () => {
    const text = renderExplain(
      explainRule("QA-TEST-004", join(FIXTURES_ROOT, "does-not-exist")),
    );
    expect(text).toContain("No example available");
    expect(text).not.toContain("WHAT WAS FOUND");
  });

  it("renders a failure message for an unknown rule", () => {
    const text = renderExplain(explainRule("QA-NOPE-999", FIXTURES_ROOT));
    expect(text).toContain("explain failed");
    expect(text).toContain("QA-NOPE-999");
  });
});

describe("runExplainCommand (CLI handler)", () => {
  it("exits 0 and prints the rule's explanation", () => {
    let out = "";
    const code = runExplainCommand(
      ["QA-TEST-004", "--fixtures-root", FIXTURES_ROOT],
      { out: (s) => (out += s), err: () => {} },
    );
    expect(code).toBe(0);
    expect(out).toContain("QA-TEST-004");
  });

  it("exits 10 (usage error) with no rule ID given", () => {
    let errOut = "";
    const code = runExplainCommand([], {
      out: () => {},
      err: (s) => (errOut += s),
    });
    expect(code).toBe(10);
    expect(errOut).toContain("Usage");
  });

  it("exits 10 (usage error) for an unknown rule ID", () => {
    const code = runExplainCommand(
      ["QA-NOPE-999", "--fixtures-root", FIXTURES_ROOT],
      {
        out: () => {},
        err: () => {},
      },
    );
    expect(code).toBe(10);
  });

  it("defaults to <cwd>/tests/fixtures when --fixtures-root is omitted", () => {
    // Run from this repo's own root implicitly via process.cwd() — the
    // test runner's cwd during `npm test` is the qa-doctor repo root.
    let out = "";
    const code = runExplainCommand(["QA-TEST-004"], {
      out: (s) => (out += s),
      err: () => {},
    });
    expect(code).toBe(0);
    expect(out).toContain("WHAT WAS FOUND");
  });
});
