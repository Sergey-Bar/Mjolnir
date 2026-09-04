/**
 * The landing page shows one scan in three output shapes — terminal,
 * JSON and SARIF (`.planning/SITE-REDESIGN-PLAN.md` §4, Phase 5). Three
 * tabs that silently showed three different scans would be precisely the
 * drift the site's law exists to prevent, so this locks them together.
 *
 * `scripts/generate-site-formats.ts` and `scripts/generate-readme-hero.ts`
 * must keep identical scan options; if one grows a flag the other lacks,
 * the scores diverge and these assertions fail.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets", "readme");
const SVG_PATH = join(ASSETS, "terminal-hero.svg");
const JSON_PATH = join(ASSETS, "demo-report.json");
const SARIF_PATH = join(ASSETS, "demo-report.sarif");

/** Strips markup to a fixpoint; one pass can leave a tag on nested input. */
function stripTags(s: string): string {
  let prev: string;
  do {
    prev = s;
    s = s.replace(/<[^>]*>/g, "");
  } while (s !== prev);
  return s;
}

/** The score the terminal capture actually shows a reader. */
function scoreFromSvg(svg: string): number {
  const text = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) => stripTags(m[1] ?? ""))
    .join("\n");
  const m = /WORTHINESS\s+(\d+)\/100/.exec(text);
  if (!m?.[1]) throw new Error("no WORTHINESS line in terminal-hero.svg");
  return Number(m[1]);
}

describe("site output-format assets agree with each other", () => {
  it("all three assets exist (the site build consumes them)", () => {
    expect(existsSync(SVG_PATH), "terminal-hero.svg").toBe(true);
    expect(
      existsSync(JSON_PATH),
      "demo-report.json — run `npm run docs:formats`",
    ).toBe(true);
    expect(
      existsSync(SARIF_PATH),
      "demo-report.sarif — run `npm run docs:formats`",
    ).toBe(true);
  });

  // Minimal wire-shape types for the generated demo artifacts.
  const readJson = <T>(path: string): T =>
    JSON.parse(readFileSync(path, "utf8")) as T;
  type JsonReport = {
    score: number;
    schemaVersion: number;
    findings: Array<{ ruleId: string }>;
  };
  type SarifReport = {
    version: string;
    runs: Array<{ results: Array<{ ruleId: string }> }>;
  };

  it("the JSON report's score matches the terminal capture's", () => {
    const json = readJson<JsonReport>(JSON_PATH);
    expect(json.score).toBe(scoreFromSvg(readFileSync(SVG_PATH, "utf8")));
  });

  it("the JSON report keeps the frozen schemaVersion", () => {
    const json = readJson<JsonReport>(JSON_PATH);
    expect(json.schemaVersion).toBe(1);
  });

  it("SARIF carries the same findings as the JSON report", () => {
    const json = readJson<JsonReport>(JSON_PATH);
    const sarif = readJson<SarifReport>(SARIF_PATH);
    const run = sarif.runs[0] as SarifReport["runs"][number];
    expect(sarif.runs).toHaveLength(1);
    expect(run.results).toHaveLength(json.findings.length);
  });

  it("SARIF declares the version the docs promise", () => {
    const sarif = readJson<SarifReport>(SARIF_PATH);
    expect(sarif.version).toBe("2.1.0");
  });

  it("the rule ids in SARIF are all real ids from the JSON report", () => {
    const json = readJson<JsonReport>(JSON_PATH);
    const sarif = readJson<SarifReport>(SARIF_PATH);
    const fromJson = new Set(
      json.findings.map((f: { ruleId: string }) => f.ruleId),
    );
    const run = sarif.runs[0] as SarifReport["runs"][number];
    for (const r of run.results) {
      expect(
        fromJson.has(r.ruleId),
        `SARIF ruleId ${r.ruleId} not in the JSON report`,
      ).toBe(true);
    }
  });
});
