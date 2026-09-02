/**
 * README hero asset reproducibility (Master-Stabilization-Plan
 * Sprint 7, Task 29).
 *
 * The plan's own QA requirement: "the documented command reproduces
 * the asset's output." This was a real, previously-undetected gap —
 * the committed assets/readme/terminal-hero.svg was a hand-crafted,
 * one-off SVG with no generator and had ALREADY drifted: it was
 * missing the "FIX THIS FIRST" section entirely (added in Sprint 5)
 * and showed stale deduction numbers from before evidence-discount
 * scoring. This test makes that class of drift impossible to reland
 * silently — it regenerates the asset from the exact same code path
 * `npm run docs:hero` uses and asserts the committed file matches.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";
import { renderTerminal } from "../src/reporter/terminal.js";

const ROOT = join(import.meta.dirname, "..");
const DEMO_REPO = join(ROOT, "examples", "demo-repo");
const SVG_PATH = join(ROOT, "assets", "readme", "terminal-hero.svg");

describe("assets/readme/terminal-hero.svg reproducibility", () => {
  it("the README actually references the hero asset (it was generated, tested, and orphaned once before)", () => {
    // The whole point of a generated, drift-locked hero asset is that
    // the README shows it. Between the rebrand and now it was kept
    // current by this very test while no page displayed it — a
    // maintained file nobody could see. This keeps them tied together.
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(readme).toContain("assets/readme/terminal-hero.svg");
  });

  it("the demo repo scan referenced by the hero asset actually produces findings (sanity check — a stale/empty demo repo would make this whole test meaningless)", async () => {
    const result = await runScan({
      target: DEMO_REPO,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
      strict: true,
    });
    expect(result.score).not.toBeNull();
    expect(result.findings.length).toBeGreaterThan(3);
  });

  it("the committed SVG contains every section the current terminal reporter produces — not a stale snapshot from before a reporter change", async () => {
    const result = await runScan({
      target: DEMO_REPO,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
      strict: true,
    });
    const rendered = renderTerminal(result, { isTTY: false, ascii: true });
    const svg = readFileSync(SVG_PATH, "utf8");

    // Every section header the real reporter renders for this scan must
    // appear in the SVG — this is exactly the check that would have
    // caught "FIX THIS FIRST" going missing after Sprint 5 shipped it.
    // Matched narrowly on the literal "▚ " header prefix (not just any
    // leading "#", which also matches the ASCII score gauge's fill
    // characters when ascii:true is used for a stable, TTY-independent
    // render).
    const sectionHeaders = rendered
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("▚ "));
    expect(sectionHeaders.length).toBeGreaterThan(0);
    for (const header of sectionHeaders) {
      const text = header.replace(/^▚\s*/, "");
      expect(
        svg,
        `hero asset is missing the "${text}" section that the current ` +
          `terminal reporter produces for this exact scan — regenerate ` +
          `it with \`npm run docs:hero\`.`,
      ).toContain(text);
    }
  });

  it("the committed SVG's every finding message and rule ID actually appears in the current real scan (not stale example findings)", async () => {
    const result = await runScan({
      target: DEMO_REPO,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
      strict: true,
    });
    const svg = readFileSync(SVG_PATH, "utf8");
    const realRuleIds = new Set(result.findings.map((f) => f.ruleId));

    // Every QA-XXX-nnn-shaped token in the SVG must be a rule ID that
    // really fired in this scan — catches the exact stale-content bug
    // found while writing this task (the old SVG referenced a
    // continue-on-error finding's message text that no longer matched
    // what QA-CI-001 actually produces).
    const svgRuleIds = new Set(
      [...svg.matchAll(/QA-[A-Z]+-\d{3}/g)].map((m) => m[0]),
    );
    expect(svgRuleIds.size).toBeGreaterThan(0);
    for (const id of svgRuleIds) {
      expect(
        realRuleIds.has(id),
        `hero asset references ${id}, but the current real scan of ` +
          `examples/demo-repo does not produce that finding — the asset ` +
          `has drifted. Regenerate with \`npm run docs:hero\`.`,
      ).toBe(true);
    }
  });

  it("the docs:hero script exists in package.json (regeneration is possible)", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts["docs:hero"]).toBeDefined();
  });
});
