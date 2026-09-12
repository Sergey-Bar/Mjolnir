/**
 * Forensics guide-sample reproducibility (site UX gap-closure plan, G5).
 *
 * The /guide/forensics page renders two terminal blocks as committed
 * text assets. They were hand-typed once and drifted: the page said
 * "83 / 100" for checkout.spec.ts while the tool printed 86/100, and it
 * silently dropped login.spec.ts (65/100) — on the page whose whole
 * argument is that forensics reads real run data instead of guessing.
 *
 * Mirrors tests/hero-asset-reproducibility.spec.ts: regenerate through
 * the exact code path `npm run docs:forensics-samples` uses and assert
 * the committed files match.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runForensics } from "../../src/forensics/run.js";
import {
  computeSelectorHealth,
  renderSelectorHealth,
} from "../../src/playwright/selector-health.js";
import { createIgnoreMatcher } from "../../src/discovery/ignores.js";

const ROOT = join(import.meta.dirname, "..", "..");
const DEMO_REPO = join(ROOT, "examples", "demo-repo");
const FORENSICS_TXT = join(ROOT, "assets", "readme", "forensics-sample.txt");
const SELECTOR_TXT = join(
  ROOT,
  "assets",
  "readme",
  "selector-health-sample.txt",
);

describe("assets/readme forensics samples reproducibility", () => {
  it("the forensics guide renders both samples via the wrapper component", () => {
    const guide = readFileSync(
      join(ROOT, "site", "guide", "forensics.md"),
      "utf8",
    );
    expect(guide).toContain('<ForensicsSample which="forensics" />');
    expect(guide).toContain('<ForensicsSample which="selector-health" />');
    // The old hand-typed blocks must not come back alongside them.
    expect(guide).not.toMatch(/```text[\s\S]*?SELECTOR HEALTH/);
    expect(guide).not.toMatch(/```text[\s\S]*?FLAKINESS LEADERBOARD/);
  });

  it("forensics-sample.txt is what the real code path prints for the demo fixture", () => {
    const { output } = runForensics(join(DEMO_REPO, "test-results"), {
      writeFlakyMd: false,
    });
    expect(readFileSync(FORENSICS_TXT, "utf8").trimEnd()).toBe(
      output.trimEnd(),
    );
  });

  it("selector-health-sample.txt is what the real code path prints for the demo fixture", () => {
    const rendered = renderSelectorHealth(
      computeSelectorHealth(DEMO_REPO, createIgnoreMatcher(DEMO_REPO)),
    );
    expect(readFileSync(SELECTOR_TXT, "utf8").trimEnd()).toBe(
      rendered.trimEnd(),
    );
  });

  it("the demo fixture stays representative — a flake and a failure (a clean fixture would contradict the page's argument)", () => {
    const { report } = runForensics(join(DEMO_REPO, "test-results"), {
      writeFlakyMd: false,
    });
    expect(report.flakyTests).toBeGreaterThan(0);
    expect(report.failed).toBeGreaterThan(0);
  });

  it("the selector-health sample keeps a scored spec (empty render would ship a lie by omission)", () => {
    const text = readFileSync(SELECTOR_TXT, "utf8");
    expect(text).toContain("SELECTOR HEALTH");
    expect(text).toMatch(/\d+ \/ 100/);
  });
});
