/**
 * Generates the site's report model from `assets/readme/terminal-hero.svg`.
 *
 * The chain of truth is: real scan of `examples/demo-repo` ->
 * `scripts/generate-readme-hero.ts` (`npm run docs:hero`) ->
 * `assets/readme/terminal-hero.svg` (committed, and locked against drift
 * by `tests/hero-asset-reproducibility.spec.ts`) -> this script ->
 * `site/.vitepress/theme/generated/report.json` (build output,
 * gitignored).
 *
 * Two defects made this necessary (`.planning/SITE-REDESIGN-PLAN.md` §2):
 *
 *  - D1: the landing page hand-typed the score. Its gauge and the report's
 *    alt text said 70/100 while the generated asset beside them said
 *    75/100 — on the one page whose argument is that the tool never
 *    asserts what it has not measured.
 *  - D2/D3: the report shipped as a 1194x3036 image, 42% of the page
 *    height, with text that could not be selected, copied or searched,
 *    and that had to be panned sideways on a phone.
 *
 * The SVG generator already splits each line into one <tspan> per colour
 * run, so the same runs re-emit as HTML spans with no new parsing — one
 * source, two renderers. `<TerminalReport>` consumes the groups below.
 *
 * Site law (plan §1): every number, verdict and code sample on the site is
 * generated from a real scan, or it does not ship.
 *
 * Invoked by the site's "prebuild" / "predev" hooks (see
 * site/package.json). Parsing is covered by `scripts/gen-report.test.mjs`.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..");
const REPO = join(SITE, "..");
const ASSETS = join(REPO, "assets", "readme");
const SRC = join(ASSETS, "terminal-hero.svg");
const JSON_SRC = join(ASSETS, "demo-report.json");
const SARIF_SRC = join(ASSETS, "demo-report.sarif");
const MODEL_SRC = join(REPO, "src", "reporter", "score-state.ts");
const SCORER_SRC = join(REPO, "src", "scorer", "scorer.ts");
const BLOB = "https://github.com/Sergey-Bar/Mjolnir/blob/main/assets/readme/";
const OUT_DIR = join(SITE, ".vitepress", "theme", "generated");
const OUT = join(OUT_DIR, "report.json");

/**
 * Strips markup repeatedly until the result stops changing. A single
 * pass of /<[^>]+>/ can leave a tag behind on crafted or nested input
 * ("<<a>script>"), which is why CodeQL flags the one-pass form.
 */
export function stripTags(s) {
  let prev;
  do {
    prev = s;
    s = s.replace(/<[^>]*>/g, "");
  } while (s !== prev);
  return s;
}

/** Reverses the escaping applied by `scripts/readme-svg.ts`'s escapeXml. */
export function decodeXml(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

/** `rgb(224,180,67)` / `#e0b443` -> `#e0b443`. Anything else passes through. */
export function normalizeColor(v) {
  const m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(v.trim());
  if (!m) return v.trim().toLowerCase();
  return (
    "#" +
    [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, "0")).join("")
  );
}

/**
 * Terminal metrics from `scripts/readme-svg.ts`. They are duplicated here
 * rather than imported because that module is TypeScript compiled by the
 * root build, and site/ deliberately runs on plain Node with zero deps.
 * `blankLinesRestored` in the test asserts they still line up.
 */
export const LINE_HEIGHT = 19;
export const PAD_TOP = 36 + 18; // TITLE_BAR + top padding

/**
 * One rendered line per `<text>` element, each carrying its colour runs.
 * `text` is the concatenation, used for structure detection and as the
 * copy/plain-text form.
 *
 * The SVG generator emits nothing at all for a blank line — the gap is
 * implied by the next line's `y`. Rendering the elements in document
 * order would therefore silently compress the report, so blank lines are
 * restored from the coordinates: line index = (y - PAD_TOP) / LINE_HEIGHT.
 * The chrome's centred title sits above PAD_TOP and is returned
 * separately rather than being mistaken for report line 0.
 */
export function svgToLines(svg) {
  const rows = [];
  let title = "";

  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const y = Number(/\by="([-\d.]+)"/.exec(m[1])?.[1] ?? NaN);
    const spans = [
      ...m[2].matchAll(
        /<tspan\b[^>]*\bfill="([^"]*)"[^>]*>([\s\S]*?)<\/tspan>/g,
      ),
    ].map((s) => ({ t: decodeXml(s[2]), c: normalizeColor(s[1]) }));
    const plain = decodeXml(stripTags(m[2]));

    if (!Number.isFinite(y) || y < PAD_TOP) {
      if (!title) title = plain.trim();
      continue;
    }
    rows.push({
      i: Math.round((y - PAD_TOP) / LINE_HEIGHT),
      line: {
        text: spans.length ? spans.map((s) => s.t).join("") : plain,
        spans: spans.length ? spans : plain ? [{ t: plain, c: "" }] : [],
      },
    });
  }

  const lines = [];
  for (const r of rows) {
    while (lines.length < r.i) lines.push({ text: "", spans: [] });
    lines[r.i] = r.line;
  }
  return Object.assign(lines, { title });
}

/**
 * Splits the report into the groups the page renders separately.
 *
 * Boundaries are found by content, not line number, so a report that
 * grows or shrinks still splits correctly; a missing boundary throws
 * rather than silently producing a mis-sliced report.
 *
 * The 15-line ASCII hammer between the command and the verdict is
 * dropped for the web: it sits ~900px below the real logo lockup, so on
 * this page it is redundant. It stays in the README, where it is the
 * only logo there is.
 */
export function splitGroups(lines) {
  const idx = (re, what) => {
    const i = lines.findIndex((l) => re.test(l.text));
    if (i < 0)
      throw new Error(
        `no ${what} line in the hero asset — report format changed?`,
      );
    return i;
  };

  const commandIdx = idx(/npx mjolnir/, "command");
  const worthinessIdx = idx(/\bWORTHINESS\b/, "WORTHINESS");
  const findingsIdx = idx(/▚\s*FINDINGS/, "FINDINGS heading");
  const footerIdx = lines.findIndex(
    (l, i) => i > findingsIdx && /^\s*─{10,}\s*$/.test(l.text),
  );

  // The state chip ("ᚦ [STRAINED]") sits just above the score, with a
  // blank line or two between it and the ASCII hammer. Anchor on the chip
  // itself rather than an offset, so restoring blank lines (or the
  // reporter adding one) cannot slice it off the top of the verdict.
  let verdictStart = worthinessIdx;
  for (let i = worthinessIdx - 1; i >= 0 && i >= worthinessIdx - 4; i--) {
    if (/\[[A-Z][A-Z ]*\]/.test(lines[i].text)) {
      verdictStart = i;
      break;
    }
  }
  verdictStart = Math.max(commandIdx + 1, verdictStart);

  // Named *Lines to leave `verdict` and `findings` to parseSummary's
  // verdict string and finding count — merging the two objects otherwise
  // silently replaces the count with an array.
  return {
    title: lines.title ?? "",
    command: lines[commandIdx].text.trim(),
    verdictLines: lines.slice(verdictStart, findingsIdx),
    findingLines: lines.slice(
      findingsIdx,
      footerIdx < 0 ? lines.length : footerIdx,
    ),
    footerLines: footerIdx < 0 ? [] : lines.slice(footerIdx + 1),
  };
}

/**
 * Pulls the numbers out of the reporter's own output. A parse failure
 * throws rather than falling back to a default: a wrong number here is
 * exactly the defect this script exists to prevent, so the build must
 * fail loudly instead of shipping a plausible guess.
 */
export function parseSummary(lines) {
  const text = lines.map((l) => l.text);
  const scoreLine = text.find((l) => /\bWORTHINESS\b/.test(l));
  if (!scoreLine) {
    throw new Error(
      "no WORTHINESS line in the hero asset — report format changed?",
    );
  }
  const m = /WORTHINESS\s+(\d+)\/(\d+)\s+(\S.*?)\s*$/.exec(scoreLine);
  if (!m) {
    throw new Error(
      `could not parse the WORTHINESS line: ${JSON.stringify(scoreLine)}`,
    );
  }

  const findingsLine = text.find((l) => /\b\d+ findings\b/.test(l));
  const findings = findingsLine
    ? Number(/(\d+) findings/.exec(findingsLine)[1])
    : null;

  // "│ 4 × error   − 32                        │" — the deduction table.
  const deductions = text
    .map((l) =>
      /^\s*│\s*(\d+)\s*×\s*(\w+)\s*[−-]\s*(\d+)\s*(\(.*?\))?\s*│\s*$/.exec(l),
    )
    .filter(Boolean)
    .map((d) => ({
      count: Number(d[1]),
      severity: d[2],
      points: Number(d[3]),
      note: d[4] ? d[4].replace(/[()]/g, "") : null,
    }));

  return {
    score: Number(m[1]),
    outOf: Number(m[2]),
    verdict: m[3],
    findings,
    deductions,
    categories: text
      .filter((l) => /^\s{2,}QA-[A-Z]+\s+[█▓░]+\s+\d+\s*$/.test(l))
      .map((l) => {
        const c = /^\s+(QA-[A-Z]+)\s+[█▓░]+\s+(\d+)\s*$/.exec(l);
        return { family: c[1], score: Number(c[2]) };
      }),
  };
}

/**
 * The same scan in its machine-readable shapes, cut down to what a page
 * can usefully show: the real envelope with the findings array sliced to
 * its first entry. A slice is still generated output — nothing here is
 * retyped or prettified by hand — and the full files are linked.
 *
 * `pick` names the array to slice, so the JSON report and the SARIF log
 * share one implementation despite their different envelopes.
 */
export function excerptDocument(text, pick) {
  const doc = JSON.parse(text);
  const arr = pick(doc);
  const total = Array.isArray(arr.get()) ? arr.get().length : 0;
  arr.set(arr.get().slice(0, 1));
  return { excerpt: JSON.stringify(doc, null, 2), total };
}

export function excerptJson(text) {
  const r = excerptDocument(text, (d) => ({
    get: () => d.findings ?? [],
    set: (v) => (d.findings = v),
  }));
  return { ...r, href: BLOB + "demo-report.json" };
}

export function excerptSarif(text) {
  const r = excerptDocument(text, (d) => ({
    get: () => d.runs?.[0]?.results ?? [],
    set: (v) => {
      if (d.runs?.[0]) d.runs[0].results = v;
    },
  }));
  return { ...r, href: BLOB + "demo-report.sarif" };
}

/**
 * Extracts the score→band table from src/reporter/score-state.ts — the
 * model file is the single source of truth, so the site's verdict-band
 * ruler is parsed from it, never retyped. Each `score >= N` branch
 * contributes {min: N, verdict}; the final `return` (no threshold) is
 * the floor band. gen-report.test.mjs locks the result: if
 * deriveScoreState changes shape, the site build fails here rather than
 * the page drifting from the model.
 */
export function extractBands(modelSource) {
  const bands = [];
  const re = /score >= (\d+)\)\s*{[\s\S]{0,200}?verdict:\s*"([A-Z ]+)"/g;
  for (const m of modelSource.matchAll(re)) {
    bands.push({ min: Number(m[1]), verdict: m[2] });
  }
  if (bands.length === 0) {
    throw new Error(
      "extractBands: no `score >= N` thresholds found in score-state.ts — " +
        "deriveScoreState changed shape; re-sync the site's band parser.",
    );
  }
  // The floor band (everything below the lowest threshold) is the final
  // `return` of deriveScoreState — the last verdict literal after the
  // last `score >= ` threshold.
  const afterLast = modelSource.slice(modelSource.lastIndexOf("score >= "));
  const verdicts = [...afterLast.matchAll(/verdict:\s*"([A-Z ]+)"/g)];
  if (verdicts.length === 0) {
    throw new Error(
      "extractBands: could not find the floor band's verdict in score-state.ts.",
    );
  }
  bands.push({ min: 0, verdict: verdicts[verdicts.length - 1][1] });
  return bands.sort((a, b) => b.min - a.min);
}

/** Reads the scorer's two public constants from src/scorer/scorer.ts. */
export function extractConstants(scorerSource) {
  const k = /export const NORMALIZATION_K = (\d+(?:\.\d+)?)/.exec(scorerSource);
  const s = /export const SMOOTHING_C = (\d+(?:\.\d+)?)/.exec(scorerSource);
  if (!k || !s) {
    throw new Error(
      "extractConstants: NORMALIZATION_K / SMOOTHING_C not found in " +
        "scorer.ts — re-sync the site's scoring parser.",
    );
  }
  return { k: Number(k[1]), smoothing: Number(s[1]) };
}

export function buildReport(svg, jsonText, sarifText) {
  const lines = svgToLines(svg);
  const scoring = buildScoring(jsonText);
  return {
    ...parseSummary(lines),
    ...splitGroups(lines),
    // ScoreExplainer (site UX plan G8): the worked arithmetic strip and
    // the verdict-band ruler are generated from the demo scan's own
    // transparency fields plus the scorer's constants, parsed from the
    // model sources above — the page cannot drift from the model.
    ...(scoring ? { scoring } : {}),
    formats: {
      json: jsonText ? excerptJson(jsonText) : null,
      sarif: sarifText ? excerptSarif(sarifText) : null,
    },
    source: "assets/readme/terminal-hero.svg",
    note: "Generated by site/scripts/gen-report.mjs — do not edit by hand.",
  };
}

/**
 * G8: the worked-arithmetic payload. Present only when the demo scan's
 * JSON report carries the transparency fields; absent otherwise (the
 * component then renders its explicit "cannot be shown" note — never a
 * plausible-looking default, the D1 failure mode).
 */
function buildScoring(jsonText) {
  if (!jsonText) return null;
  const doc = JSON.parse(jsonText);
  if (typeof doc.rawDeductions !== "number") return null;
  return {
    rawDeductions: doc.rawDeductions,
    declarations: doc.testDeclarationCount,
    constants: extractConstants(readFileSync(SCORER_SRC, "utf8")),
    bands: extractBands(readFileSync(MODEL_SRC, "utf8")),
  };
}

function main() {
  const r = buildReport(
    readFileSync(SRC, "utf8"),
    readFileSync(JSON_SRC, "utf8"),
    readFileSync(SARIF_SRC, "utf8"),
  );
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(r, null, 2) + "\n");
  console.log(
    `Wrote ${OUT} — ${r.score}/${r.outOf} ${r.verdict}, ${r.findings} findings`,
  );
  console.log(
    `  groups: ${r.verdictLines.length} verdict / ${r.findingLines.length} finding / ` +
      `${r.footerLines.length} footer lines (${r.deductions.length} deduction rows)`,
  );
  console.log(
    `  formats: json excerpt 1 of ${r.formats.json.total}, ` +
      `sarif excerpt 1 of ${r.formats.sarif.total}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
