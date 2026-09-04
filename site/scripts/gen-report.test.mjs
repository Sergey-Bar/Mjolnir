/**
 * Guards the terminal-hero.svg -> report generator, and the site doctor's
 * colour maths. Run: `npm test` in site/.
 *
 * Uses the Node built-in test runner so the site keeps zero test deps.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  decodeXml,
  normalizeColor,
  svgToLines,
  splitGroups,
  parseSummary,
  buildReport,
  extractBands,
  extractConstants,
  LINE_HEIGHT,
  PAD_TOP,
} from "./gen-report.mjs";
import {
  parseColor,
  luminance,
  contrast,
  parseTokens,
  resolve,
} from "./site-doctor.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HERO = join(HERE, "..", "..", "assets", "readme", "terminal-hero.svg");

/* ---------------- generator ---------------- */

/** y for report line `i`, matching scripts/readme-svg.ts's metrics. */
const y = (i) => PAD_TOP + i * LINE_HEIGHT;

// A minimal asset in the exact shape scripts/generate-readme-hero.ts emits:
// a centred chrome title above PAD_TOP, then one <text> per line at x=22,
// one <tspan> per colour run — and NOTHING at all for a blank line.
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
  <g clip-path="url(#winClip)">
    <text x="300" y="22" fill="#a0a0a0" font-size="12" text-anchor="middle">demo-repo &#8212; mjolnir</text>
    <text x="22" y="${y(0)}" xml:space="preserve"><tspan fill="rgb(0,255,0)">$ </tspan><tspan fill="#ede6d6">npx mjolnir-qa@latest</tspan></text>
    <text x="22" y="${y(1)}" xml:space="preserve"><tspan fill="#d7d3c8">  &#9556;&#9552;&#9559;</tspan></text>
    <text x="22" y="${y(3)}" xml:space="preserve"><tspan fill="#d7d3c8">  &#5798; [STRAINED]</tspan></text>
    <text x="22" y="${y(5)}" xml:space="preserve"><tspan fill="#d7d3c8">  </tspan><tspan fill="rgb(224,180,67)">WORTHINESS</tspan><tspan fill="#d7d3c8">  75/100  NEEDS WORK</tspan></text>
    <text x="22" y="${y(6)}" xml:space="preserve"><tspan fill="#d7d3c8">  The hammer holds &#8212; but 24 findings weigh it down.</tspan></text>
    <text x="22" y="${y(7)}" xml:space="preserve"><tspan fill="#d7d3c8">  QA-CI    &#9608;&#9608;&#9619;&#9617;  76</tspan></text>
    <text x="22" y="${y(8)}" xml:space="preserve"><tspan fill="#d7d3c8">  &#9474; 4 &#215; error   &#8722; 32                        &#9474;</tspan></text>
    <text x="22" y="${y(9)}" xml:space="preserve"><tspan fill="#d7d3c8">  &#9474; 3 &#215; warning &#8722;  7 (evidence-discounted)  &#9474;</tspan></text>
    <text x="22" y="${y(10)}" xml:space="preserve"><tspan fill="#d7d3c8">  &#9626; FINDINGS</tspan></text>
    <text x="22" y="${y(11)}" xml:space="preserve"><tspan fill="#d7d3c8">  &#10007; ERROR   QA-CI-009</tspan></text>
    <text x="22" y="${y(12)}" xml:space="preserve"><tspan fill="#d7d3c8">${"─".repeat(12)}</tspan></text>
    <text x="22" y="${y(13)}" xml:space="preserve"><tspan fill="#d7d3c8">  Analysis: complete</tspan></text>
  </g>
</svg>`;

test("decodeXml reverses the generator's escaping", () => {
  assert.equal(decodeXml("a &amp; b &lt;c&gt; &#8212; d"), "a & b <c> — d");
  // &amp; must be decoded last, or "&amp;lt;" would become "<".
  assert.equal(decodeXml("&amp;lt;"), "&lt;");
});

test("normalizeColor folds the two forms the SVG emits", () => {
  assert.equal(normalizeColor("rgb(224,180,67)"), "#e0b443");
  assert.equal(normalizeColor("#EDE6D6"), "#ede6d6");
  assert.equal(normalizeColor("rgb(0, 0, 0)"), "#000000");
});

test("svgToLines joins the tspans of each line and keeps their colours", () => {
  const lines = svgToLines(SAMPLE);
  assert.equal(lines[0].text, "$ npx mjolnir-qa@latest");
  assert.deepEqual(lines[0].spans, [
    { t: "$ ", c: "#00ff00" },
    { t: "npx mjolnir-qa@latest", c: "#ede6d6" },
  ]);
});

test("svgToLines separates the chrome title from report line 0", () => {
  const lines = svgToLines(SAMPLE);
  assert.equal(lines.title, "demo-repo — mjolnir");
  assert.ok(
    !lines.some((l) => l.text.includes("demo-repo")),
    "title must not become a line",
  );
});

test("svgToLines restores blank lines from the y coordinates", () => {
  const lines = svgToLines(SAMPLE);
  // The sample has no <text> at index 2 or 4 — those are blank lines that
  // only exist as a gap in y. Losing them silently compresses the report.
  assert.equal(
    lines[2].text,
    "",
    "gap at index 2 must come back as a blank line",
  );
  assert.equal(
    lines[4].text,
    "",
    "gap at index 4 must come back as a blank line",
  );
  assert.equal(lines[3].text, "  ᚦ [STRAINED]");
  assert.match(lines[5].text, /WORTHINESS/);
});

test("parseSummary reads the verdict off the reporter's own output", () => {
  const s = parseSummary(svgToLines(SAMPLE));
  assert.equal(s.score, 75);
  assert.equal(s.outOf, 100);
  assert.equal(s.verdict, "NEEDS WORK");
  assert.equal(s.findings, 24);
  assert.deepEqual(s.categories, [{ family: "QA-CI", score: 76 }]);
  assert.deepEqual(s.deductions, [
    { count: 4, severity: "error", points: 32, note: null },
    { count: 3, severity: "warning", points: 7, note: "evidence-discounted" },
  ]);
});

test("parseSummary throws rather than guessing when the format changes", () => {
  assert.throws(
    () => parseSummary([{ text: "nothing here" }]),
    /no WORTHINESS line/,
  );
  assert.throws(
    () => parseSummary([{ text: "  WORTHINESS ???" }]),
    /could not parse/,
  );
});

test("splitGroups drops the ASCII hammer but keeps the state chip", () => {
  const g = splitGroups(svgToLines(SAMPLE));
  assert.equal(g.command, "$ npx mjolnir-qa@latest");
  assert.ok(
    !g.verdictLines.some((l) => l.text.includes("╔")),
    "the ASCII hammer must not reach the web report",
  );
  assert.match(
    g.verdictLines[0].text,
    /\[STRAINED\]/,
    "the state chip anchors the verdict block",
  );
  assert.match(g.findingLines[0].text, /FINDINGS/);
  assert.ok(
    !g.findingLines.some((l) => /^\s*─+\s*$/.test(l.text)),
    "the footer rule ends the findings group",
  );
  assert.equal(g.footerLines[0].text.trim(), "Analysis: complete");
});

test("splitGroups throws on a report missing a boundary", () => {
  const lines = svgToLines(SAMPLE).filter((l) => !/FINDINGS/.test(l.text));
  assert.throws(() => splitGroups(lines), /FINDINGS heading/);
});

test("buildReport keeps the finding COUNT and the finding LINES apart", () => {
  const r = buildReport(SAMPLE);
  assert.equal(
    typeof r.findings,
    "number",
    "findings is the count from the reporter",
  );
  assert.ok(
    Array.isArray(r.findingLines),
    "findingLines is the rendered block",
  );
});

test(
  "the committed hero asset still parses",
  { skip: !existsSync(HERO) },
  () => {
    const r = buildReport(readFileSync(HERO, "utf8"));
    assert.ok(
      Number.isInteger(r.score) && r.score >= 0 && r.score <= 100,
      `score ${r.score}`,
    );
    assert.equal(r.outOf, 100);
    assert.match(r.verdict, /^(WORTHY|NEEDS WORK|UNWORTHY|FORGED)$/);
    assert.ok(r.categories.length > 0, "expected at least one category row");
    assert.ok(r.deductions.length > 0, "expected a deduction table");
    assert.ok(r.verdictLines.length > 0 && r.findingLines.length > 0);

    // The verdict block is the part that stays visible on a phone, so its
    // width is a load-bearing property, not an incidental one.
    const widest = Math.max(...r.verdictLines.map((l) => [...l.text].length));
    assert.ok(
      widest <= 60,
      `verdict block is ${widest} columns — too wide for a 360px screen`,
    );
  },
);

/* ---------------- doctor colour maths ---------------- */

test("parseColor handles the forms vars.css uses", () => {
  assert.deepEqual(parseColor("#a5811c"), [165, 129, 28]);
  assert.deepEqual(parseColor("#abc"), [170, 187, 204]);
  assert.deepEqual(parseColor("rgba(20, 27, 43, 0.1)"), [20, 27, 43]);
  assert.equal(parseColor("linear-gradient(90deg, #000, #fff)"), null);
});

test("contrast matches the WCAG reference points", () => {
  assert.equal(+contrast([0, 0, 0], [255, 255, 255]).toFixed(2), 21);
  assert.equal(+contrast([18, 52, 86], [18, 52, 86]).toFixed(2), 1);
  assert.ok(luminance([255, 255, 255]) > luminance([0, 0, 0]));
});

test("parseTokens and resolve follow var() chains", () => {
  const css = [
    ":root {",
    "  --a: #112233;",
    "  --b: var(--a);",
    "  --loop: var(--loop);",
    "}",
    ".dark {",
    "  --a: #ffffff;",
    "}",
  ].join("\n");
  const light = parseTokens(css, ":root");
  const dark = { ...light, ...parseTokens(css, ".dark") };
  assert.deepEqual(resolve(light, "--b"), [17, 34, 51]);
  assert.deepEqual(resolve(dark, "--b"), [255, 255, 255]);
  assert.equal(
    resolve(light, "--loop"),
    null,
    "a self-referencing var must not hang",
  );
  assert.equal(resolve(light, "--missing"), null);
});

/* ---------------- G8: scoring extraction (ScoreExplainer feed) ---------------- */

test("extractBands parses the real score-state.ts into the four bands", () => {
  const src = readFileSync(
    join(HERE, "..", "..", "src", "reporter", "score-state.ts"),
    "utf8",
  );
  const bands = extractBands(src);
  assert.deepEqual(bands, [
    { min: 100, verdict: "FORGED" },
    { min: 80, verdict: "WORTHY" },
    { min: 50, verdict: "NEEDS WORK" },
    { min: 0, verdict: "UNWORTHY" },
  ]);
});

test("extractBands throws loudly when the model changes shape", () => {
  assert.throws(
    () => extractBands("export function deriveScoreState() { return null }"),
    /no `score >= N` thresholds found/,
  );
});

test("extractConstants reads the two scorer constants", () => {
  const src = readFileSync(
    join(HERE, "..", "..", "src", "scorer", "scorer.ts"),
    "utf8",
  );
  assert.deepEqual(extractConstants(src), { k: 5, smoothing: 1 });
});

test("buildScoring: report without transparency fields yields no scoring block", () => {
  const r = buildReport(SAMPLE, JSON.stringify({ score: 75 }), null);
  assert.equal(r.scoring, undefined);
});

test("buildScoring: the real demo report yields the reconciled strip payload", () => {
  const r = buildReport(
    SAMPLE,
    readFileSync(
      join(HERE, "..", "..", "assets", "readme", "demo-report.json"),
      "utf8",
    ),
    null,
  );
  assert.ok(
    r.scoring,
    "demo report carries rawDeductions — scoring must exist",
  );
  assert.equal(r.scoring.rawDeductions, 40);
  assert.equal(r.scoring.declarations, 7);
  // Site-law reconciliation: the formula on the page must reproduce the
  // scan's own score from these generated numbers.
  const { rawDeductions, declarations, constants } = r.scoring;
  const score =
    100 -
    Math.min(
      100,
      (rawDeductions / (declarations + constants.smoothing)) * constants.k,
    );
  assert.equal(Math.round(score), r.score);
});
