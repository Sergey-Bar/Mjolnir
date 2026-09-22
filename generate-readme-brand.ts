/**
 * `npm run docs:readme-brand` — the README's brand assets, taken from the
 * website: the aurora hero, the CI scan, a finding's anatomy, the stack
 * strip, the trust ladder and the closing banner.
 *
 * Every colour resolves through src/brand/tokens.ts and every fact comes
 * from a committed source — the demo scan's JSON report and recorded
 * terminal output, the rule registry, the trust rungs — so the brand gate
 * and tests/contract/readme-brand-assets-reproducibility.spec.ts can hold
 * them. Motion plays once and settles on the complete picture; nothing
 * loops, and all of it is inert under prefers-reduced-motion.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { LOGOS } from "../site/.vitepress/theme/logos.ts";
import {
  EVIDENCE_MARKS,
  RUNTIME_BOUNDARY,
  TRUST_RUNGS,
} from "../src/brand/symbols.ts";
import {
  BRAND,
  HAIRLINE_RGB,
  MOTION,
  STATUS,
  SURFACE,
  TEXT,
} from "../src/brand/tokens.ts";
import { RULES } from "../src/rules/index.ts";
import { buildHowItWorksSvg } from "./readme-how-it-works.ts";
import {
  CI_SYSTEMS,
  MONOGRAM,
  NAMES,
  NOT_SHOWN,
} from "../site/.vitepress/theme/stack.ts";
import {
  CHAR_W,
  FONT_SIZE,
  LINE_HEIGHT,
  PAD_BOTTOM,
  PAD_TOP,
  PAD_X,
  TITLE_BAR,
  ansiLineToSpans,
  escapeXml,
  fontFaceCss as monoFaceCss,
  stripAnsi,
  windowClose,
  windowOpen,
} from "./readme-svg.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT_DIR = join(ROOT, "assets", "readme");
const SANS = "MjolnirSans";
const MONO = "MjolnirMono";
const SETTLE = MOTION.easing.settle;
const ENTER = MOTION.easing.enter;
const HAIR = `rgb(${HAIRLINE_RGB})`;

const f = (v: number): string => Number(v.toFixed(1)).toString();
const attr = (s: string): string => escapeXml(s).replaceAll('"', "&quot;");
const sec = (s: number): string => `${Number(s.toFixed(2))}s`;

function sansFaceCss(): string {
  const ttf = join(OUT_DIR, "fonts", "Geist-SemiBold.ttf");
  const b64 = readFileSync(ttf).toString("base64");
  return `@font-face{font-family:"${SANS}";font-style:normal;src:url(data:font/ttf;base64,${b64}) format("truetype")}`;
}

/** The document shell: one style block, one reduced-motion override. */
function svg(
  w: number,
  h: number,
  label: string,
  fonts: string[],
  css: string,
  still: string,
  body: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${attr(label)}">
  <style>
${fonts.join("\n")}
${css}
    @media (prefers-reduced-motion: reduce) { ${still} }
  </style>
${body}
</svg>
`;
}

/** Aurora curtains, a ray field and a lit horizon, all token colours. */
function sky(
  w: number,
  h: number,
  horizonY: number,
  glowAt: "top" | "bottom",
): { defs: string; body: string } {
  const top = glowAt === "top";
  const curtains: Array<[string, number, number, number, number, number]> = top
    ? [
        [BRAND.auroraGreen, 0.15, 0.2, 0.34, 0.46, 0.55],
        [BRAND.auroraCyan, 0.52, 0.12, 0.3, 0.38, 0.42],
        [BRAND.auroraViolet, 0.88, 0.2, 0.3, 0.44, 0.5],
      ]
    : [
        [BRAND.auroraGreen, 0.22, 1, 0.3, 0.62, 0.42],
        [BRAND.auroraCyan, 0.5, 1, 0.3, 0.62, 0.36],
        [BRAND.auroraViolet, 0.78, 1, 0.3, 0.62, 0.42],
      ];
  const defs = [
    ...curtains.map(
      ([c, , , , , o], i) =>
        `<radialGradient id="c${i}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`,
    ),
    `<filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${f(w * 0.022)}"/></filter>`,
    `<filter id="bloom" x="-5%" y="-2000%" width="110%" height="4100%"><feGaussianBlur stdDeviation="9"/></filter>`,
    `<linearGradient id="horizon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${BRAND.auroraGreen}" stop-opacity="0"/><stop offset="0.18" stop-color="${BRAND.auroraGreen}"/><stop offset="0.5" stop-color="${BRAND.auroraCyan}"/><stop offset="0.82" stop-color="${BRAND.auroraViolet}"/><stop offset="1" stop-color="${BRAND.auroraViolet}" stop-opacity="0"/></linearGradient>`,
    `<pattern id="rays" width="24" height="12" patternUnits="userSpaceOnUse"><rect x="22" width="2" height="12" fill="${BRAND.auroraGreen}" fill-opacity="0.09"/></pattern>`,
    `<radialGradient id="rayFade" cx="0.38" cy="${top ? 0.05 : 1}" r="0.7"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient>`,
    `<mask id="rayMask"><rect width="${w}" height="${h}" fill="url(#rayFade)"/></mask>`,
  ].join("\n    ");
  const body = [
    `<g class="sky">`,
    ...curtains.map(
      ([, cx, cy, rx, ry], i) =>
        `  <ellipse cx="${f(w * cx)}" cy="${f(h * cy)}" rx="${f(w * rx)}" ry="${f(h * ry)}" fill="url(#c${i})" filter="url(#soft)"/>`,
    ),
    `  <rect width="${w}" height="${f(top ? h * 0.62 : h)}" y="${f(top ? 0 : 0)}" fill="url(#rays)" mask="url(#rayMask)"/>`,
    `</g>`,
    `<rect class="horizon" x="0" y="${f(horizonY - 1)}" width="${w}" height="1.5" fill="url(#horizon)" filter="url(#bloom)" opacity="0.7"/>`,
    `<rect class="horizon" x="0" y="${f(horizonY - 1)}" width="${w}" height="1.5" fill="url(#horizon)" opacity="0.85"/>`,
  ].join("\n  ");
  return { defs, body };
}

/* ── 1. hero ─────────────────────────────────────────────────── */

export function buildHeroSvg(): string {
  const [w, h] = [1600, 560];
  const s = sky(w, h, h, "top");
  const css = `
    .ground { fill: ${SURFACE.ink900}; }
    .mark { font-family: ${SANS}; font-size: 22px; letter-spacing: 0.3em; fill: ${TEXT.primary}; }
    .head { font-family: ${SANS}; font-size: 70px; letter-spacing: -0.035em; }
    .was { fill: ${TEXT.muted}; animation: rise 900ms ${SETTLE} 150ms both, dim 1400ms ${SETTLE} 1600ms both; }
    .now { fill: ${TEXT.primary}; animation: rise 900ms ${SETTLE} 450ms both; }
    .sky { animation: dawn 2400ms ${SETTLE} both; }
    @keyframes dawn { from { opacity: 0; } }
    @keyframes rise { from { opacity: 0.15; transform: translateY(14px); } }
    @keyframes dim { from { fill: ${TEXT.primary}; } }`;
  const still = ".was, .now, .sky { animation: none; }";
  const body = `  <defs>
    <clipPath id="frame"><rect width="${w}" height="${h}" rx="16"/></clipPath>
    ${s.defs}
  </defs>
  <g clip-path="url(#frame)">
  <rect class="ground" width="${w}" height="${h}"/>
  ${s.body}
  <text class="mark" x="96" y="104">MJÖLNIR</text>
  <text class="head was" x="96" y="318">Tests tell you what passed.</text>
  <text class="head now" x="96" y="404">Mjölnir tells you what you can trust.</text>
  </g>`;
  return svg(
    w,
    h,
    "Mjölnir. Tests tell you what passed. Mjölnir tells you what you can trust.",
    [sansFaceCss()],
    css,
    still,
    body,
  );
}

/* ── 2. the scan ─────────────────────────────────────────────── */

interface ReportFinding {
  file: string;
  line: number;
  severity: string;
  ruleId: string;
  message: string;
  evidenceLevel: string;
  measuredFpRate: number | null;
  measuredFpN: number | null;
}

const SCAN_FILE = ".github/workflows/ci.yml";

function demoReport(): ReportFinding[] {
  const report = JSON.parse(
    readFileSync(join(OUT_DIR, "demo-report.json"), "utf8"),
  ) as { findings: ReportFinding[] };
  return report.findings;
}

/** The findings the scan draws, in report order. */
export function scanFindings(): ReportFinding[] {
  return demoReport().filter((x) => x.file === SCAN_FILE);
}

function stampOf(x: ReportFinding): string {
  const meaning =
    EVIDENCE_MARKS.find((m) => m.level === x.evidenceLevel)?.meaning ?? "";
  const fp =
    x.measuredFpRate === null || x.measuredFpN === null
      ? "FP not measured"
      : `measured FP ${Math.round(x.measuredFpRate * 100)}% · n=${x.measuredFpN}`;
  return [x.evidenceLevel, meaning, fp].filter(Boolean).join(" · ");
}

const SEV_COLOR: Record<string, string> = {
  error: STATUS.error,
  warning: STATUS.warning,
  info: STATUS.info,
};

function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= max) cur += ` ${word}`;
    else {
      out.push(cur);
      cur = word;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function yamlLine(src: string): string {
  const m = /^(\s*)(- )?([\w.-]+)(:)(.*)$/.exec(src);
  if (!m) return `<tspan>${escapeXml(src)}</tspan>`;
  const [, pad = "", dash = "", key = "", colon = "", rest = ""] = m;
  return `<tspan>${escapeXml(pad + dash)}</tspan><tspan class="k">${escapeXml(key)}</tspan><tspan>${escapeXml(colon + rest)}</tspan>`;
}

export function buildScanSvg(): string {
  const lines = readFileSync(
    join(ROOT, "examples", "demo-repo", SCAN_FILE),
    "utf8",
  )
    .replace(/\n+$/, "")
    .split("\n");
  const findings = scanFindings();
  const w = 800;
  const textX = PAD_X + 5 * CHAR_W;
  const chipX = textX;
  const chipW = w - chipX - PAD_X;
  const maxChars = Math.floor((chipW - 28) / CHAR_W);
  const y0 = TITLE_BAR + 12;

  type Row =
    | { kind: "line"; y: number; n: number; src: string; sev: string }
    | { kind: "chip"; y: number; h: number; x: ReportFinding; body: string[] };
  const rows: Row[] = [];
  let y = y0;
  lines.forEach((src, i) => {
    const n = i + 1;
    const hits = findings.filter((x) => x.line === n);
    const sev = hits.some((x) => x.severity === "error")
      ? "error"
      : hits.some((x) => x.severity === "warning")
        ? "warning"
        : hits.length
          ? "info"
          : "";
    rows.push({ kind: "line", y, n, src, sev });
    y += LINE_HEIGHT;
    for (const x of hits) {
      const body = wrap(`${x.ruleId}  ${x.message}`, maxChars);
      const h = 14 + (body.length + 1) * 18 + 6;
      rows.push({ kind: "chip", y: y + 5, h, x, body });
      y += h + 13;
    }
  });
  const end = y + 10;
  const h = end + PAD_BOTTOM;
  const START = 0.6;
  const SWEEP = 5.4;
  const at = (yy: number): number => START + ((yy - y0) / (end - y0)) * SWEEP;

  const out: string[] = [];
  for (const r of rows) {
    if (r.kind === "line") {
      const base = r.y + 14;
      const d = sec(at(r.y));
      if (r.sev) {
        const c = SEV_COLOR[r.sev] ?? STATUS.info;
        out.push(
          `    <rect class="hl" style="animation-delay:${d}" x="0" y="${f(r.y)}" width="${w}" height="${LINE_HEIGHT}" fill="${c}" fill-opacity="0.13"/>`,
        );
        out.push(
          `    <text class="n hit" style="animation-delay:${d};fill:${c}" x="${PAD_X}" y="${f(base)}" xml:space="preserve">${String(r.n).padStart(3)}</text>`,
        );
      } else {
        out.push(
          `    <text class="n" x="${PAD_X}" y="${f(base)}" xml:space="preserve">${String(r.n).padStart(3)}</text>`,
        );
      }
      out.push(
        `    <text class="src${r.sev ? " lit" : ""}" x="${f(textX)}" y="${f(base)}" xml:space="preserve">${yamlLine(r.src)}</text>`,
      );
    } else {
      const c = SEV_COLOR[r.x.severity] ?? STATUS.info;
      const d = sec(at(r.y - 18));
      const texts = r.body
        .map((ln, i) => {
          const ty = r.y + 14 + 13 + i * 18;
          const t =
            i === 0 && ln.startsWith(r.x.ruleId)
              ? `<tspan class="rid">${escapeXml(r.x.ruleId)}</tspan>${escapeXml(ln.slice(r.x.ruleId.length))}`
              : escapeXml(ln);
          return `      <text class="msg" x="${f(chipX + 16)}" y="${f(ty)}" xml:space="preserve">${t}</text>`;
        })
        .join("\n");
      const sy = r.y + 14 + 13 + r.body.length * 18;
      out.push(`    <g class="chip" style="animation-delay:${d}">
      <rect x="${f(chipX)}" y="${f(r.y)}" width="${f(chipW)}" height="${r.h}" rx="6" fill="${SURFACE.ink850}" stroke="${HAIR}" stroke-opacity="0.16"/>
      <rect x="${f(chipX)}" y="${f(r.y)}" width="2" height="${r.h}" fill="${c}"/>
${texts}
      <text class="stamp" x="${f(chipX + 16)}" y="${f(sy)}">${escapeXml(stampOf(r.x))}</text>
    </g>`);
    }
  }

  const css = `
    text { font-family: ${MONO}; font-size: ${FONT_SIZE}px; }
    .n { fill: ${TEXT.muted}; }
    .src { fill: ${TEXT.secondary}; }
    .src.lit { fill: ${TEXT.primary}; }
    .k { fill: ${BRAND.steel}; }
    .msg { fill: ${TEXT.secondary}; font-size: 12.5px; }
    .rid { fill: ${TEXT.primary}; }
    .stamp { fill: ${TEXT.muted}; font-size: 11.5px; }
    .count { fill: ${TEXT.muted}; font-size: 12px; }
    .hl { animation: glow 500ms ${SETTLE} both; }
    .hit { animation: hit 500ms ${SETTLE} both; }
    .chip { animation: arrive 480ms ${ENTER} both; }
    .beam { opacity: 0; animation: sweep ${sec(SWEEP)} linear ${sec(START)} both; }
    @keyframes glow { from { opacity: 0; } }
    @keyframes hit { from { fill: ${TEXT.muted}; } }
    @keyframes arrive { from { opacity: 0; transform: translateY(-6px); } }
    @keyframes sweep {
      0% { opacity: 0; transform: translateY(${f(y0)}px); }
      4% { opacity: 1; }
      96% { opacity: 1; transform: translateY(${f(end)}px); }
      100% { opacity: 0; transform: translateY(${f(end)}px); }
    }`;
  const still = ".hl, .hit, .chip, .beam { animation: none; }";
  const count = `${findings.length} finding${findings.length === 1 ? "" : "s"}`;
  const body = `${windowOpen(w, h, SCAN_FILE)}
    <text class="count" x="${w - 18}" y="${TITLE_BAR / 2 + 4}" text-anchor="end">${count}</text>
${out.join("\n")}
    <defs>
      <linearGradient id="wash" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${BRAND.auroraCyan}" stop-opacity="0.12"/><stop offset="1" stop-color="${BRAND.auroraCyan}" stop-opacity="0"/></linearGradient>
    </defs>
    <g class="beam">
      <rect x="0" y="-64" width="${w}" height="64" fill="url(#wash)"/>
      <rect x="0" y="0" width="${w}" height="2" fill="url(#aurora)"/>
    </g>
${windowClose(w, h)}`;
  const label =
    `Mjölnir reading ${SCAN_FILE} from the demo repository line by line, ` +
    `and flagging ${count} at the lines it reported: ` +
    findings
      .map((x) => `line ${x.line}, ${x.severity}, ${x.ruleId}: ${x.message}`)
      .join(" ");
  return svg(w, h, label, [monoFaceCss()], css, still, body);
}

/* ── 3. anatomy of a finding ─────────────────────────────────── */

interface DemoScript {
  beats: Array<{ id: string; ansi?: string[] }>;
}

/** The first finding card of the recorded demo scan, verbatim ANSI. */
export function firstCard(): string[] {
  const script = JSON.parse(
    readFileSync(join(ROOT, "assets", "video", "script.demo.json"), "utf8"),
  ) as DemoScript;
  const ansi = script.beats.find((b) => b.id === "hero-scan")?.ansi ?? [];
  const at = ansi.findIndex((l) => stripAnsi(l).trim() === "▍ FINDINGS");
  const start = ansi.findIndex((l, i) => i > at && stripAnsi(l).trim() !== "");
  let stop = start;
  while (stop < ansi.length && stripAnsi(ansi[stop] ?? "").trim() !== "")
    stop++;
  if (at < 0 || start < 0)
    throw new Error("the demo scan printed no finding card");
  return ansi.slice(start, stop);
}

const PARTS = [
  {
    key: "where",
    color: BRAND.auroraGreen,
    title: "Where",
    body: ["The rule, the file", "and the exact line."],
  },
  {
    key: "sure",
    color: BRAND.auroraCyan,
    title: "How sure",
    body: ["E2 counts in full, E1", "half, E0 nothing."],
  },
  {
    key: "fp",
    color: BRAND.auroraViolet,
    title: "How often it is wrong",
    body: ["Measured on hand-", "checked OSS findings."],
  },
  {
    key: "fix",
    color: BRAND.steel,
    title: "The fix",
    body: ["The change that closes", "it. Re-scan to prove it."],
  },
] as const;

export function buildAnatomySvg(): string {
  const card = firstCard();
  const plain = card.map(stripAnsi);
  const longest = Math.max(...plain.map((l) => l.length));
  const ww = Math.ceil(PAD_X * 2 + longest * CHAR_W);
  const wh = Math.ceil(PAD_TOP + card.length * LINE_HEIGHT + PAD_BOTTOM);
  const pad = 24;
  const w = ww + pad * 2;
  const labelsY = pad + wh + 30;
  const h = labelsY + 96;

  const where = /(QA-[A-Z]+-\d+ · \S+:\d+)/.exec(plain[0] ?? "")?.[1] ?? "";
  const stamp = /\[(E\d · [^·\]]+?) · (measured FP [^\]]+?)\]/.exec(
    plain[1] ?? "",
  );
  const fixAt = plain.findIndex((l) => l.trimStart().startsWith("Fix"));
  const marks: Array<{ key: string; row: number; col: number; len: number }> =
    [];
  const mark = (key: string, row: number, needle: string): void => {
    const col = (plain[row] ?? "").indexOf(needle);
    if (needle && col >= 0) marks.push({ key, row, col, len: needle.length });
  };
  mark("where", 0, where);
  mark("sure", 1, stamp?.[1] ?? "");
  mark("fp", 1, stamp?.[2] ?? "");
  for (let r = fixAt; r >= 0 && r < plain.length; r++) {
    const txt = plain[r] ?? "";
    const col = txt.length - txt.trimStart().length;
    marks.push({ key: "fix", row: r, col, len: txt.trim().length });
  }
  if (marks.filter((m) => m.key !== "fix").length !== 3 || fixAt < 0)
    throw new Error(
      "the finding card no longer has where / how sure / FP / fix",
    );

  const order = PARTS.map((p) => p.key as string);
  const delay = (key: string): string => sec(0.5 + order.indexOf(key) * 0.8);
  const colorOf = (key: string): string =>
    PARTS.find((p) => p.key === key)?.color ?? BRAND.steel;

  const rects = marks
    .map((m) => {
      const x = PAD_X + m.col * CHAR_W - 3;
      const y = PAD_TOP + m.row * LINE_HEIGHT - 14;
      return `    <rect class="part" style="animation-delay:${delay(m.key)}" x="${f(x)}" y="${f(y)}" width="${f(m.len * CHAR_W + 6)}" height="${LINE_HEIGHT}" rx="3" fill="${colorOf(m.key)}" fill-opacity="0.16" stroke="${colorOf(m.key)}" stroke-opacity="0.6"/>`;
    })
    .join("\n");
  const text = card
    .map((line, i) => {
      const spans = ansiLineToSpans(line);
      if (spans.length === 0) return "";
      const t = spans
        .map((s) => `<tspan fill="${s.color}">${s.text}</tspan>`)
        .join("");
      return `    <text x="${PAD_X}" y="${f(PAD_TOP + i * LINE_HEIGHT)}" xml:space="preserve">${t}</text>`;
    })
    .join("\n");
  const cw = ww / PARTS.length;
  const labels = PARTS.map((p, i) => {
    const x = pad + i * cw;
    return `  <g class="label" style="animation-delay:${delay(p.key)}">
    <rect x="${f(x)}" y="${labelsY}" width="28" height="3" rx="1.5" fill="${p.color}"/>
    <text class="lt" x="${f(x)}" y="${labelsY + 28}">${escapeXml(p.title)}</text>
    <text class="lb" x="${f(x)}" y="${labelsY + 52}">${escapeXml(p.body[0])}</text>
    <text class="lb" x="${f(x)}" y="${labelsY + 72}">${escapeXml(p.body[1])}</text>
  </g>`;
  }).join("\n");

  const css = `
    text { font-family: ${MONO}; font-size: ${FONT_SIZE}px; }
    .lt { font-family: ${SANS}; font-size: 15px; fill: ${TEXT.primary}; }
    .lb { font-family: ${SANS}; font-size: 12.5px; fill: ${TEXT.secondary}; }
    .part, .label { animation: show 600ms ${SETTLE} both; }
    @keyframes show { from { opacity: 0; } }`;
  const still = ".part, .label { animation: none; }";
  const body = `  <rect width="${w}" height="${h}" rx="14" fill="${SURFACE.ink900}"/>
  <g transform="translate(${pad} ${pad})">
${windowOpen(ww, wh, "demo-repo")}
${rects}
${text}
${windowClose(ww, wh)}
  </g>
${labels}`;
  const label =
    `The first finding of the demo scan, as the terminal prints it, with its four parts marked: ` +
    `where (${where}), how sure (${stamp?.[1] ?? ""}), how often the rule is wrong (${stamp?.[2] ?? ""}), and the fix.`;
  return svg(w, h, label, [monoFaceCss(), sansFaceCss()], css, still, body);
}

/* ── 4. the stack ────────────────────────────────────────────── */

/** Languages, frameworks and CI systems the registry's rules declare. */
export function stackGroups(): Array<{ label: string; items: string[] }> {
  const order = Object.keys(NAMES);
  const rank = (s: string): number =>
    order.includes(s) ? order.indexOf(s) : order.length;
  const langs = new Set<string>();
  const frameworks = new Set<string>();
  const ci = new Set<string>();
  for (const r of RULES as ReadonlyArray<{
    languages?: readonly string[];
    frameworks?: readonly string[];
  }>) {
    for (const l of r.languages ?? []) if (!NOT_SHOWN.has(l)) langs.add(l);
    for (const fw of r.frameworks ?? [])
      if (!NOT_SHOWN.has(fw)) (CI_SYSTEMS.has(fw) ? ci : frameworks).add(fw);
  }
  const show = (set: Set<string>): string[] =>
    [...set]
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map((s) => NAMES[s] ?? s);
  return [
    { label: "Languages", items: show(langs) },
    { label: "Test frameworks", items: show(frameworks) },
    // GitLab runs it through `--format codequality` (docs/GITLAB-CI.md).
    { label: "CI", items: [...show(ci), "GitLab CI"] },
  ];
}

export function buildStackSvg(): string {
  const groups = stackGroups();
  const w = 1200;
  const pad = 32;
  const labelW = 190;
  const cols = 5;
  const cellW = (w - pad * 2 - labelW) / cols;
  const rowH = 46;
  const gap = 22;
  const out: string[] = [];
  let y = pad + 6;
  let k = 0;
  groups.forEach((g, gi) => {
    if (gi > 0) {
      out.push(
        `  <rect x="${pad}" y="${f(y - gap / 2 - 4)}" width="${w - pad * 2}" height="1" fill="${HAIR}" fill-opacity="0.1"/>`,
      );
    }
    out.push(
      `  <text class="group" x="${pad}" y="${f(y + 27)}">${escapeXml(g.label.toUpperCase())}</text>`,
    );
    g.items.forEach((name, i) => {
      const cx = pad + labelW + (i % cols) * cellW;
      const cy = y + Math.floor(i / cols) * rowH;
      const d = sec(0.2 + k++ * 0.05);
      const logo = LOGOS[name];
      const icon = logo
        ? `<path transform="translate(${f(cx)} ${f(cy + 10)}) scale(${f(22 / 24)})" d="${logo}" fill="${TEXT.secondary}"/>`
        : `<rect x="${f(cx + 0.5)}" y="${f(cy + 10.5)}" width="21" height="21" rx="5" fill="none" stroke="${TEXT.secondary}"/><text class="mono" x="${f(cx + 11)}" y="${f(cy + 24.5)}" text-anchor="middle">${escapeXml(MONOGRAM[name] ?? name.slice(0, 2))}</text>`;
      out.push(
        `  <g class="tool" style="animation-delay:${d}">${icon}<text class="name" x="${f(cx + 34)}" y="${f(cy + 27)}">${escapeXml(name)}</text></g>`,
      );
    });
    y += Math.ceil(g.items.length / cols) * rowH + gap;
  });
  const h = Math.ceil(y - gap + pad);
  const css = `
    .group { font-family: ${SANS}; font-size: 12px; letter-spacing: 0.14em; fill: ${TEXT.muted}; }
    .name { font-family: ${SANS}; font-size: 16px; fill: ${TEXT.primary}; }
    .mono { font-family: ${MONO}; font-size: 9px; fill: ${TEXT.secondary}; }
    .tool { animation: arrive 500ms ${ENTER} both; }
    @keyframes arrive { from { opacity: 0; transform: translateY(6px); } }`;
  const still = ".tool { animation: none; }";
  const body = `  <rect width="${w}" height="${h}" rx="14" fill="${SURFACE.ink900}"/>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="13.5" fill="none" stroke="${HAIR}" stroke-opacity="0.14"/>
${out.join("\n")}`;
  const label = groups
    .map((g) => `${g.label}: ${g.items.join(", ")}.`)
    .join(" ");
  return svg(
    w,
    h,
    `Works with your stack. ${label}`,
    [monoFaceCss(), sansFaceCss()],
    css,
    still,
    body,
  );
}

/* ── 5. the trust ladder ─────────────────────────────────────── */

/** The README's own plain words for each rung (its trust-level table). */
const RUNG_NAMES = [
  "Noted",
  "Looks like the problem",
  "Proven in the code",
  "The file ran",
  "The test ran",
  "The run agrees",
];

export function buildLadderSvg(): string {
  const w = 1200;
  const pad = 32;
  const n = TRUST_RUNGS.length;
  const gap = 16;
  const colW = (w - pad * 2 - gap * (n - 1)) / n;
  const barTop = pad + 36;
  const barH = 170;
  const base = barTop + barH;
  const h = base + 96;
  const height = (i: number): number =>
    i >= RUNTIME_BOUNDARY
      ? 0.64 + (i - RUNTIME_BOUNDARY) * 0.18
      : 0.18 + i * 0.12;
  const defs: string[] = [];
  const bars: string[] = [];
  TRUST_RUNGS.forEach((r, i) => {
    const x = pad + i * (colW + gap);
    const bh = barH * height(i);
    defs.push(
      `<linearGradient id="r${i}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${r.color}" stop-opacity="0.45"/><stop offset="1" stop-color="${r.color}"/></linearGradient>`,
    );
    const d = sec(0.25 + i * 0.11);
    const sweep = r.runtime
      ? `<g clip-path="url(#bar${i})"><rect class="sweep" style="animation-delay:${sec(1.2 + i * 0.14)}" x="${f(x)}" y="${f(base - bh)}" width="${f(colW)}" height="${f(bh)}" fill="url(#shine)"/></g>`
      : "";
    defs.push(
      `<clipPath id="bar${i}"><rect x="${f(x)}" y="${f(base - bh)}" width="${f(colW)}" height="${f(bh)}" rx="3"/></clipPath>`,
    );
    bars.push(`  <g class="rung" style="animation-delay:${d}">
    <rect x="${f(x)}" y="${f(base - bh)}" width="${f(colW)}" height="${f(bh)}" rx="3" fill="url(#r${i})"/>
    ${sweep}
  </g>
  <text class="code${r.runtime ? " run" : ""}" x="${f(x)}" y="${base + 30}"${r.runtime ? ` style="fill:${r.color}"` : ""}>${r.level}</text>
  <text class="name" x="${f(x)}" y="${base + 56}">${escapeXml(RUNG_NAMES[i] ?? r.meaning)}</text>`);
  });
  const lineX = pad + RUNTIME_BOUNDARY * (colW + gap) - gap / 2;
  const css = `
    .code { font-family: ${MONO}; font-size: 14px; fill: ${TEXT.muted}; }
    .name { font-family: ${SANS}; font-size: 15px; fill: ${TEXT.primary}; }
    .edge { font-family: ${SANS}; font-size: 13px; fill: ${BRAND.auroraBright}; }
    .rung { transform-box: fill-box; transform-origin: bottom; animation: grow 900ms ${SETTLE} both; }
    .sweep { transform-box: fill-box; opacity: 0; animation: pass 1300ms ${SETTLE} both; }
    @keyframes grow { from { transform: scaleY(0); } }
    @keyframes pass { 0% { opacity: 1; transform: translateY(100%); } 99% { opacity: 1; } 100% { opacity: 0; transform: translateY(-100%); } }`;
  const still = ".rung, .sweep { animation: none; }";
  const body = `  <defs>
    <linearGradient id="shine" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${TEXT.primary}" stop-opacity="0"/><stop offset="0.5" stop-color="${TEXT.primary}" stop-opacity="0.45"/><stop offset="1" stop-color="${TEXT.primary}" stop-opacity="0"/></linearGradient>
    ${defs.join("\n    ")}
  </defs>
  <rect width="${w}" height="${h}" rx="14" fill="${SURFACE.ink950}"/>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="13.5" fill="none" stroke="${HAIR}" stroke-opacity="0.14"/>
  <line x1="${f(lineX)}" y1="${pad - 6}" x2="${f(lineX)}" y2="${h - pad + 6}" stroke="${BRAND.aurora}" stroke-opacity="0.7" stroke-dasharray="3 4"/>
  <text class="edge" x="${f(lineX + 12)}" y="${pad + 8}">A real run starts here</text>
${bars.join("\n")}`;
  const label =
    "The trust ladder, L0 to L5. " +
    TRUST_RUNGS.map(
      (r, i) => `${r.level}: ${RUNG_NAMES[i] ?? r.meaning}.`,
    ).join(" ") +
    ` L${RUNTIME_BOUNDARY} and above need a real run report.`;
  return svg(w, h, label, [monoFaceCss(), sansFaceCss()], css, still, body);
}

/* ── 6. closing ──────────────────────────────────────────────── */

export function buildClosingSvg(): string {
  const [w, h] = [1600, 420];
  const s = sky(w, h, h, "bottom");
  const css = `
    .ground { fill: ${SURFACE.ink900}; }
    .big { font-family: ${SANS}; font-size: 104px; letter-spacing: -0.05em; fill: ${TEXT.primary}; animation: rise 900ms ${SETTLE} 200ms both; }
    .sky { animation: dawn 2400ms ${SETTLE} both; }
    @keyframes dawn { from { opacity: 0; } }
    @keyframes rise { from { opacity: 0.15; transform: translateY(14px); } }`;
  const still = ".big, .sky { animation: none; }";
  const body = `  <defs>
    <clipPath id="frame"><rect width="${w}" height="${h}" rx="16"/></clipPath>
    ${s.defs}
  </defs>
  <g clip-path="url(#frame)">
  <rect class="ground" width="${w}" height="${h}"/>
  ${s.body}
  <text class="big" x="${w / 2}" y="238" text-anchor="middle">Run it on your repo.</text>
  </g>`;
  return svg(w, h, "Run it on your repo.", [sansFaceCss()], css, still, body);
}

/** Every asset this script owns, by file name under assets/readme/. */
export const BRAND_ASSETS: Record<string, () => string> = {
  "hero.svg": buildHeroSvg,
  "scan.svg": buildScanSvg,
  "finding-anatomy.svg": buildAnatomySvg,
  "stack.svg": buildStackSvg,
  "trust-ladder.svg": buildLadderSvg,
  "closing.svg": buildClosingSvg,
  "how-it-works.svg": buildHowItWorksSvg,
};

function main(): void {
  for (const [file, build] of Object.entries(BRAND_ASSETS)) {
    writeFileSync(join(OUT_DIR, file), build());
    console.log(`Wrote assets/readme/${file}`);
  }
}

if (process.argv[1]?.endsWith("generate-readme-brand.ts")) main();
