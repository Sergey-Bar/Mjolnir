/**
 * The README's "how it works" diagram, composed for the README's own
 * width: 880px wide and shown at 1:1, so no text on it is ever drawn
 * smaller than it was set. The poster (architecture.svg) says the same
 * thing at 1600×900 for slides; GitHub shrinks that until it cannot be
 * read, which is why this exists.
 *
 * Same sources as the poster: the demo script's assertions, the demo
 * report, the scorer's own verdict and bands, the registry's rule title,
 * the evidence marks and the trust rungs. The website's look — midnight
 * ink, aurora accents, Geist — and its motion rules: each section
 * arrives once and settles, and all of it is still under reduced motion.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EVIDENCE_MARKS,
  evidenceMarkSvg,
  RUNTIME_BOUNDARY,
  TRUST_RUNGS,
} from "../src/brand/symbols.js";
import {
  BRAND,
  HAIRLINE_RGB,
  MOTION,
  SCORE,
  SURFACE,
  TEXT,
} from "../src/brand/tokens.js";
import { deriveScoreState } from "../src/reporter/score-state.js";
import { RULES } from "../src/rules/index.js";
import { escapeXml, fontFaceCss as monoFaceCss } from "./readme-svg.js";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const W = 880;
const PAD = 32;
const IN = W - PAD * 2;
const GAP = 16;
const COL = (IN - GAP * 2) / 3;
const SANS = "MjolnirSans";
const MONO = "MjolnirMono";
const ADV = 0.6;
const HAIR = `rgb(${HAIRLINE_RGB})`;
const SETTLE = MOTION.easing.settle;

const n = (v: number): string => Number(v.toFixed(1)).toString();

interface Beat {
  id: string;
  assertions?: {
    score?: number;
    findingCount?: number;
    errorCount?: number;
    requiredFindings?: string[];
  };
}
interface ReportFinding {
  ruleId: string;
  file: string;
  line: number;
  evidenceLevel: string;
  measuredFpRate: number | null;
  measuredFpN: number | null;
}

/** Every fact the diagram states, from committed, generated sources. */
export function howItWorksFacts(): {
  score: number;
  findings: number;
  errors: number;
  rule: string;
  title: string;
  where: ReportFinding;
} {
  const script = JSON.parse(
    readFileSync(join(ROOT, "assets", "video", "script.demo.json"), "utf8"),
  ) as { beats: Beat[] };
  const a = script.beats.find((b) => b.id === "hero-scan")?.assertions;
  const rule = a?.requiredFindings?.[0];
  if (
    typeof a?.score !== "number" ||
    typeof a.findingCount !== "number" ||
    typeof a.errorCount !== "number" ||
    !rule
  )
    throw new Error("hero-scan assertions are incomplete");
  const report = JSON.parse(
    readFileSync(join(ROOT, "assets", "readme", "demo-report.json"), "utf8"),
  ) as { findings: ReportFinding[] };
  const where = report.findings.find((x) => x.ruleId === rule);
  if (!where) throw new Error(`demo-report.json has no ${rule} finding`);
  return {
    score: a.score,
    findings: a.findingCount,
    errors: a.errorCount,
    rule,
    title: RULES.find((r) => r.id === rule)?.title ?? "",
    where,
  };
}

/* ── primitives ──────────────────────────────────────────────── */

interface Tx {
  size: number;
  fill: string;
  family?: string;
  anchor?: "middle" | "end";
  ls?: number;
}

function tx(x: number, y: number, s: string, o: Tx): string {
  const a = [
    `x="${n(x)}"`,
    `y="${n(y)}"`,
    `font-family="${o.family ?? SANS}"`,
    `font-size="${o.size}"`,
    `fill="${o.fill}"`,
  ];
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`);
  if (o.ls) a.push(`letter-spacing="${o.ls}"`);
  return `<text ${a.join(" ")}>${escapeXml(s)}</text>`;
}

const mono = (
  x: number,
  y: number,
  s: string,
  size: number,
  fill: string,
  ls = 0,
): string => tx(x, y, s, { size, fill, family: MONO, ls });

let clipId = 0;

/** A card: fill, hairline edge, and optionally the website's 2px top accent. */
function card(
  x: number,
  y: number,
  w: number,
  h: number,
  o: {
    fill?: string;
    edge?: string;
    edgeOpacity?: number;
    accent?: string;
    r?: number;
  } = {},
): string {
  const r = o.r ?? 12;
  const id = `k${clipId++}`;
  const accent = o.accent
    ? `<clipPath id="${id}"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}"/></clipPath><rect clip-path="url(#${id})" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="2" fill="${o.accent}"/>`
    : "";
  return (
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="${o.fill ?? SURFACE.ink850}"/>` +
    accent +
    `<rect x="${n(x + 0.5)}" y="${n(y + 0.5)}" width="${n(w - 1)}" height="${n(h - 1)}" rx="${r - 0.5}" fill="none" stroke="${o.edge ?? HAIR}" stroke-opacity="${o.edgeOpacity ?? 0.14}"/>`
  );
}

function chips(x: number, y: number, items: string[]): string {
  let cx = x;
  return items
    .map((s) => {
      const w = s.length * 11.5 * ADV + 16;
      const out = `<rect x="${n(cx)}" y="${n(y)}" width="${n(w)}" height="22" rx="5" fill="${SURFACE.ink800}"/>${mono(cx + 8, y + 15, s, 11.5, TEXT.secondary)}`;
      cx += w + 6;
      return out;
    })
    .join("");
}

/** The website's chapter frame: a hairline, a 56px accent, a numbered tag. */
function chapter(y: number, num: string, label: string, color: string): string {
  return (
    `<rect x="${PAD}" y="${n(y)}" width="${IN}" height="1" fill="${HAIR}" fill-opacity="0.12"/>` +
    `<rect x="${PAD}" y="${n(y - 0.5)}" width="56" height="2" fill="${color}"/>` +
    `<text x="${PAD}" y="${n(y + 32)}" font-family="${MONO}" font-size="11" letter-spacing="2.2"><tspan fill="${color}">${num}</tspan><tspan fill="${TEXT.secondary}" dx="12">${escapeXml(label)}</tspan></text>`
  );
}

const chevron = (x: number, y: number): string =>
  `<path d="M${n(x - 3)} ${n(y - 5)} L${n(x + 2)} ${n(y)} L${n(x - 3)} ${n(y + 5)}" fill="none" stroke="${BRAND.steelDim}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;

function drop(
  x: number,
  y1: number,
  y2: number,
  label: string,
  runtime: boolean,
): string {
  const c = runtime ? BRAND.aurora : BRAND.steelDim;
  const dash = runtime ? "" : ` stroke-dasharray="3 4"`;
  const mid = (y1 + y2) / 2;
  const lw = label.length * 10 * ADV + label.length * 1.6 + 12;
  return (
    `<line x1="${n(x)}" y1="${n(y1)}" x2="${n(x)}" y2="${n(y2 - 6)}" stroke="${c}" stroke-width="1.4"${dash}/>` +
    `<path d="M${n(x - 5)} ${n(y2 - 7)} L${n(x)} ${n(y2)} L${n(x + 5)} ${n(y2 - 7)} Z" fill="${c}"/>` +
    `<rect x="${n(x - lw / 2)}" y="${n(mid - 9)}" width="${n(lw)}" height="18" rx="4" fill="${SURFACE.ink900}"/>` +
    tx(x + 0.8, mid + 3.5, label, {
      size: 10,
      fill: runtime ? BRAND.auroraBright : TEXT.muted,
      family: MONO,
      anchor: "middle",
      ls: 1.6,
    })
  );
}

function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= max) cur += ` ${w}`;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const SCORE_TONE: Record<string, string> = {
  error: SCORE.critical,
  warning: SCORE.warning,
  trusted: SCORE.trusted,
  forged: SCORE.forged,
  dim: SCORE.unmeasured,
};

/** The README's plain words for each rung, broken where a column wraps. */
const RUNG_WORDS = [
  ["Noted"],
  ["Looks like", "the problem"],
  ["Proven in", "the code"],
  ["The file ran"],
  ["The test ran"],
  ["The run", "agrees"],
];

/* ── the diagram ─────────────────────────────────────────────── */

export function buildHowItWorksSvg(): string {
  clipId = 0;
  const f = howItWorksFacts();
  const state = deriveScoreState(f.score);
  const sections: string[] = [];
  const bars: string[] = [];
  const defs: string[] = [];
  const section = (i: number, body: string): void => {
    sections.push(
      `<g class="sec" style="animation-delay:${i * 120}ms">${body}</g>`,
    );
  };

  /* header */
  section(
    0,
    [
      mono(PAD, 58, "HOW IT WORKS", 11, BRAND.auroraCyan, 2.4),
      tx(PAD, 102, "A green pipeline is a claim.", {
        size: 30,
        fill: TEXT.muted,
        ls: -0.6,
      }),
      tx(PAD, 140, "Here is how Mjölnir checks it.", {
        size: 30,
        fill: TEXT.primary,
        ls: -0.6,
      }),
      tx(
        PAD,
        178,
        "It reads your suite and your workflows as written and, when you have one,",
        {
          size: 14,
          fill: TEXT.secondary,
        },
      ),
      tx(
        PAD,
        199,
        "the report of a real run. It never runs your tests or executes your code.",
        {
          size: 14,
          fill: TEXT.secondary,
        },
      ),
    ].join(""),
  );

  /* 01 — what it reads */
  const s1 = 236;
  const cy = s1 + 50;
  const ch = 128;
  const inputs: Array<[string, string, string, string[], boolean]> = [
    [
      "Test suite",
      "read statically",
      "never executed",
      ["playwright", "jest", "vitest"],
      false,
    ],
    [
      "CI pipeline",
      "workflows · jobs",
      "steps · gates",
      ["continue-on-error", "|| true"],
      false,
    ],
    [
      "Real run evidence",
      "the report of a run",
      "that already finished",
      ["playwright json", "junit xml"],
      true,
    ],
  ];
  const engineY = cy + ch + 52;
  section(
    1,
    chapter(s1, "01", "WHAT IT READS", BRAND.auroraGreen) +
      inputs
        .map(([title, a, b, cs, runtime], i) => {
          const x = PAD + i * (COL + GAP);
          const tag = runtime
            ? mono(
                x + COL - 18 - 7 * 10 * ADV - 7 * 1.6,
                cy + 30,
                "RUNTIME",
                10,
                BRAND.auroraBright,
                1.6,
              )
            : "";
          return (
            card(
              x,
              cy,
              COL,
              ch,
              runtime
                ? {
                    edge: BRAND.aurora,
                    edgeOpacity: 0.55,
                    accent: BRAND.aurora,
                  }
                : {},
            ) +
            tag +
            tx(x + 18, cy + 34, title, { size: 16, fill: TEXT.primary }) +
            mono(x + 18, cy + 58, a, 12, TEXT.secondary) +
            mono(x + 18, cy + 76, b, 12, TEXT.secondary) +
            chips(x + 18, cy + 92, cs) +
            drop(
              x + COL / 2,
              cy + ch,
              engineY,
              runtime ? "RUNTIME" : "STATIC",
              runtime,
            )
          );
        })
        .join(""),
  );

  /* the engine */
  const eh = 396;
  const stageW = (IN - 32 - 4 * 20) / 5;
  const stages = [
    "DISCOVER",
    "ANALYZE",
    "CORRELATE",
    "WEIGH EVIDENCE",
    "MEASURE",
  ];
  const colL = PAD + 28;
  const colR = W / 2 + 12;
  const rowsY = engineY + 236;
  section(
    2,
    card(PAD, engineY, IN, eh, {
      fill: SURFACE.ink950,
      edgeOpacity: 0.18,
      accent: "url(#aurora)",
      r: 14,
    }) +
      tx(W / 2 + 4.5, engineY + 58, "MJÖLNIR", {
        size: 30,
        fill: TEXT.primary,
        anchor: "middle",
        ls: 9,
      }) +
      tx(W / 2 + 1.5, engineY + 84, "VERIFICATION TRUST ENGINE", {
        size: 11,
        fill: BRAND.auroraCyan,
        family: MONO,
        anchor: "middle",
        ls: 3,
      }) +
      stages
        .map((s, i) => {
          const x = PAD + 16 + i * (stageW + 20);
          const y = engineY + 110;
          return (
            `<rect x="${n(x)}" y="${n(y)}" width="${n(stageW)}" height="38" rx="8" fill="${SURFACE.ink850}" stroke="${HAIR}" stroke-opacity="0.16"/>` +
            tx(x + stageW / 2 + 0.6, y + 23.5, s, {
              size: 11,
              fill: TEXT.primary,
              family: MONO,
              anchor: "middle",
              ls: 1.2,
            }) +
            (i < stages.length - 1 ? chevron(x + stageW + 10.5, y + 19) : "")
          );
        })
        .join("") +
      `<rect x="${PAD + 20}" y="${engineY + 176}" width="${IN - 40}" height="1" fill="${HAIR}" fill-opacity="0.1"/>` +
      mono(colL, engineY + 208, "EVIDENCE STREAMS", 11, TEXT.muted, 2.2) +
      ["Test quality", "CI integrity", "Runtime forensics", "Selector health"]
        .map(
          (s, i) =>
            `<circle cx="${colL + 3}" cy="${n(rowsY + i * 30 - 5)}" r="3" fill="${BRAND.auroraCyan}"/>` +
            tx(colL + 16, rowsY + i * 30, s, { size: 15, fill: TEXT.primary }),
        )
        .join("") +
      mono(colR, engineY + 208, "EVIDENCE MODEL", 11, TEXT.muted, 2.2) +
      EVIDENCE_MARKS.map((m, i) => {
        const y = rowsY + i * 30;
        const weight = m.fill === 0 ? "none" : m.fill === 0.5 ? "half" : "full";
        return (
          evidenceMarkSvg(m, colR + 8, y - 5, 8) +
          tx(colR + 26, y, m.level, { size: 15, fill: TEXT.primary }) +
          tx(colR + 54, y, m.meaning, { size: 14, fill: TEXT.secondary }) +
          tx(W - PAD - 28, y, `weight ${weight}`, {
            size: 12,
            fill: TEXT.muted,
            family: MONO,
            anchor: "end",
          })
        );
      }).join("") +
      tx(colR, rowsY + 3 * 30, "Evidence level is earned, not assumed.", {
        size: 13,
        fill: TEXT.muted,
      }) +
      tx(
        W / 2,
        engineY + eh - 24,
        "signals in · evidence out · nothing executed",
        {
          size: 11.5,
          fill: TEXT.muted,
          family: MONO,
          anchor: "middle",
        },
      ),
  );

  /* 02 — how far it was checked */
  const s2 = engineY + eh + 44;
  const ly = s2 + 50;
  const lh = 196;
  const lcol = (IN - 48 - 5 * 12) / 6;
  const base = ly + 122;
  const lastRung = TRUST_RUNGS.length - 1;
  const rungH = (i: number): number =>
    i >= RUNTIME_BOUNDARY ? 48 + (i - RUNTIME_BOUNDARY) * 16 : 16 + i * 10;
  TRUST_RUNGS.forEach((r, i) => {
    defs.push(
      `<linearGradient id="r${i}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${r.color}" stop-opacity="0.45"/><stop offset="1" stop-color="${r.color}"/></linearGradient>`,
    );
    const x = PAD + 24 + i * (lcol + 12);
    const h = rungH(i);
    bars.push(
      `<rect class="bar" style="animation-delay:${600 + i * 100}ms" x="${n(x)}" y="${n(base - h)}" width="${n(lcol)}" height="${h}" rx="3" fill="url(#r${i})"/>`,
    );
  });
  const bx = PAD + 24 + RUNTIME_BOUNDARY * (lcol + 12) - 6;
  section(
    3,
    chapter(s2, "02", "HOW FAR IT WAS CHECKED", BRAND.auroraCyan) +
      card(PAD, ly, IN, lh, { fill: SURFACE.ink950, edgeOpacity: 0.16 }) +
      `<line x1="${n(bx)}" y1="${ly + 16}" x2="${n(bx)}" y2="${ly + lh - 16}" stroke="${BRAND.aurora}" stroke-opacity="0.75" stroke-dasharray="3 4"/>` +
      tx(bx + 10, ly + 32, "A real run starts here", {
        size: 12,
        fill: BRAND.auroraBright,
      }) +
      bars.join("") +
      TRUST_RUNGS.map((r, i) => {
        const x = PAD + 24 + i * (lcol + 12);
        const words = RUNG_WORDS[i] ?? [r.meaning];
        return (
          mono(x, base + 24, r.level, 12, r.runtime ? r.color : TEXT.muted) +
          words
            .map((w, k) =>
              tx(x, base + 44 + k * 17, w, { size: 13, fill: TEXT.primary }),
            )
            .join("")
        );
      }).join("") +
      tx(
        PAD,
        ly + lh + 30,
        `L${RUNTIME_BOUNDARY}–L${lastRung} require a real run. Static analysis can never claim them.`,
        {
          size: 13,
          fill: TEXT.secondary,
        },
      ),
  );

  /* 03 — what can be trusted */
  const s3 = ly + lh + 70;
  const oy = s3 + 50;
  const oh = 214;
  const [c1, c2, c3] = [0, 1, 2].map((i) => PAD + i * (COL + GAP)) as [
    number,
    number,
    number,
  ];
  const mark = EVIDENCE_MARKS.find((m) => m.level === f.where.evidenceLevel);
  const titleLines = wrap(f.title, Math.floor((COL - 36) / (12.5 * ADV)));
  const barW = COL - 36;
  const runs: Array<{ tone: string; from: number; to: number }> = [];
  for (let v = 0; v <= 100; v++) {
    const tone = deriveScoreState(v).color;
    const last = runs[runs.length - 1];
    if (last && last.tone === tone) last.to = v;
    else runs.push({ tone, from: v, to: v });
  }
  const segW = barW - 2 * (runs.length - 1);
  let sx = c2 + 18;
  const band = runs
    .map((r) => {
      const w = Math.max(3, ((r.to - r.from + 1) / 101) * segW);
      const out = `<rect x="${n(sx)}" y="${oy + 182}" width="${n(w)}" height="6" rx="1.5" fill="${SCORE_TONE[r.tone] ?? SCORE.unmeasured}"/>`;
      sx += w + 2;
      return out;
    })
    .join("");
  const markerX = c2 + 18 + ((f.score + 0.5) / 101) * barW;
  const exits: Array<[string, string]> = [
    ["0", "clean"],
    ["1", "findings at or above gate"],
    ["2", "inconclusive — treat as failure"],
    ["10", "usage error"],
    ["20", "internal error"],
  ];
  section(
    4,
    chapter(s3, "03", "WHAT CAN BE TRUSTED", BRAND.auroraViolet) +
      /* findings */
      card(c1, oy, COL, oh) +
      mono(c1 + 18, oy + 32, "FINDINGS", 11, TEXT.muted, 2.2) +
      (mark ? evidenceMarkSvg(mark, c1 + COL - 44, oy + 28, 6) : "") +
      mono(c1 + COL - 32, oy + 32, f.where.evidenceLevel, 12, TEXT.primary) +
      chips(c1 + 18, oy + 50, [f.rule]) +
      titleLines
        .map((l, i) => mono(c1 + 18, oy + 102 + i * 19, l, 12.5, TEXT.primary))
        .join("") +
      mono(
        c1 + 18,
        oy + 152,
        f.where.measuredFpRate === null || f.where.measuredFpN === null
          ? "FP not yet measured"
          : `measured FP ${Math.round(f.where.measuredFpRate * 100)}% · n=${f.where.measuredFpN}`,
        11.5,
        TEXT.secondary,
      ) +
      mono(
        c1 + 18,
        oy + oh - 26,
        `${f.where.file}:${f.where.line}`,
        11,
        TEXT.muted,
      ) +
      /* score */
      card(c2, oy, COL, oh) +
      mono(c2 + 18, oy + 32, "WORTHINESS SCORE", 11, TEXT.muted, 2.2) +
      mono(c2 + 18, oy + 52, "EXAMPLE RESULT", 10, BRAND.auroraBright, 1.6) +
      tx(c2 + 16, oy + 128, String(f.score), {
        size: 64,
        fill: TEXT.primary,
        ls: -2.5,
      }) +
      tx(c2 + 104, oy + 100, state.verdict, {
        size: 13,
        fill: SCORE_TONE[state.color] ?? TEXT.primary,
        ls: 1.8,
      }) +
      mono(c2 + 104, oy + 124, "/100", 16, TEXT.muted) +
      mono(
        c2 + 18,
        oy + 160,
        `${f.findings} findings · ${f.errors} errors`,
        11.5,
        TEXT.secondary,
      ) +
      band +
      `<rect x="${n(markerX - 1)}" y="${oy + 176}" width="2" height="18" rx="1" fill="${TEXT.primary}"/>` +
      /* gate */
      card(c3, oy, COL, oh) +
      mono(c3 + 18, oy + 32, "CI GATE", 11, TEXT.muted, 2.2) +
      mono(
        c3 + COL - 18 - 6 * 10 * ADV - 6 * 1.6,
        oy + 32,
        "FROZEN",
        10,
        TEXT.muted,
        1.6,
      ) +
      exits
        .map(
          ([code, meaning], i) =>
            mono(c3 + 18, oy + 64 + i * 24, code, 13, TEXT.primary) +
            tx(c3 + 50, oy + 64 + i * 24, meaning, {
              size: 13,
              fill: TEXT.secondary,
            }),
        )
        .join("") +
      tx(
        PAD,
        oy + oh + 30,
        "Verification trust, not business correctness. Exit codes are frozen, so CI logic can depend on them.",
        { size: 13, fill: TEXT.secondary },
      ),
  );

  /* 04 — the agent loop */
  const s4 = oy + oh + 70;
  const loop = ["SCAN", "EVIDENCE", "HANDOFF", "AI AGENT", "RE-SCAN", "PROOF"];
  const pw = (IN - 5 * 20) / 6;
  const py = s4 + 116;
  section(
    5,
    chapter(s4, "04", "AGENT LOOP", BRAND.auroraViolet) +
      tx(PAD, s4 + 70, "AI writes the fix. Mjölnir verifies the fix.", {
        size: 20,
        fill: TEXT.primary,
        ls: -0.3,
      }) +
      tx(
        PAD,
        s4 + 94,
        "Proof comes from the re-scan, never from the agent's own report of success.",
        {
          size: 13,
          fill: TEXT.secondary,
        },
      ) +
      loop
        .map((s, i) => {
          const x = PAD + i * (pw + 20);
          const last = i === loop.length - 1;
          return (
            `<rect x="${n(x)}" y="${py}" width="${n(pw)}" height="38" rx="8" fill="${SURFACE.ink850}" stroke="${last ? BRAND.auroraCyan : HAIR}" stroke-opacity="${last ? 0.7 : 0.16}"/>` +
            tx(x + pw / 2 + 0.6, py + 23.5, s, {
              size: 11,
              fill: last ? BRAND.auroraCyan : TEXT.primary,
              family: MONO,
              anchor: "middle",
              ls: 1.2,
            }) +
            (last ? "" : chevron(x + pw + 10.5, py + 19))
          );
        })
        .join(""),
  );

  /* never */
  const s5 = py + 38 + 44;
  section(
    6,
    `<rect x="${PAD}" y="${s5}" width="${IN}" height="1" fill="${HAIR}" fill-opacity="0.12"/>` +
      mono(PAD, s5 + 34, "MJÖLNIR NEVER", 11, TEXT.muted, 2.2) +
      mono(
        PAD,
        s5 + 58,
        "runs your tests · executes your code · replaces your framework · proves business correctness",
        12,
        TEXT.secondary,
      ),
  );

  const H = s5 + 90;
  const css = `
${monoFaceCss()}
@font-face{font-family:"${SANS}";font-style:normal;src:url(data:font/ttf;base64,${readFileSync(join(ROOT, "assets", "readme", "fonts", "Geist-SemiBold.ttf")).toString("base64")}) format("truetype")}
    .sec { animation: rise 800ms ${SETTLE} both; }
    .bar { transform-box: fill-box; transform-origin: bottom; animation: grow 900ms ${SETTLE} both; }
    @keyframes rise { from { opacity: 0; transform: translateY(12px); } }
    @keyframes grow { from { transform: scaleY(0); } }`;
  const label =
    "How Mjölnir works. It reads the test suite and the CI pipeline statically, and the report of a real run when there is one. " +
    "It discovers, analyzes, correlates, weighs evidence and measures across four evidence streams: test quality, CI integrity, runtime forensics and selector health. " +
    "Every finding carries an evidence level — E0 observation, E1 pattern evidence, E2 deterministic proof, weighted none, half and full — " +
    `and a trust level from L0 to L${lastRung}; L${RUNTIME_BOUNDARY} and above need a real run. ` +
    `What can be trusted: findings such as ${f.rule}, a worthiness score (example result ${f.score} of 100, ${state.verdict}), and a CI gate on the frozen exit codes 0, 1, 2, 10 and 20. ` +
    "In the agent loop, AI writes the fix and Mjölnir re-scans to prove it. Mjölnir never runs your tests, executes your code, replaces your framework or proves business correctness.";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(label).replaceAll('"', "&quot;")}">
  <style>
${css}
    @media (prefers-reduced-motion: reduce) { .sec, .bar { animation: none; } }
  </style>
  <defs>
    <linearGradient id="aurora" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${BRAND.auroraGreen}"/><stop offset="0.5" stop-color="${BRAND.auroraCyan}"/><stop offset="1" stop-color="${BRAND.auroraViolet}"/></linearGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>
    ${defs.join("\n    ")}
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${SURFACE.ink900}"/>
    <rect width="${W}" height="2" fill="url(#aurora)"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="15.5" fill="none" stroke="${HAIR}" stroke-opacity="0.14"/>
  ${sections.join("\n  ")}
</svg>
`;
}
