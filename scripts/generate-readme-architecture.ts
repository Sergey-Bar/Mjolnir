/**
 * README / docs architecture asset (assets/readme/architecture.svg).
 *
 * The "how it works" picture, 1600×900. Its sibling assets/readme/flow.svg
 * is the "see it work" one-run story; this one is the system: what
 * Mjölnir reads, what it does with it, and what can actually be trusted.
 *
 * HONESTY NOTES — claims a naive version of this diagram would make that
 * this repository does NOT support, checked against source before drawing:
 *   · Mutation testing / "mutation reports": no such capability exists
 *     (`grep -rn mutant src/` finds the word only in unrelated comments).
 *     Drawing it would also contradict the brief's own anti-overclaim rule.
 *   · Jest / Vitest JSON run reports: src/forensics/run.ts ingests
 *     Playwright JSON and JUnit XML and nothing else. Jest and Vitest are
 *     supported as TEST FRAMEWORKS for static analysis only, so they
 *     appear under TEST SUITE and never under RUN ARTIFACTS.
 *   · PASS / BLOCK / INVESTIGATE are not product vocabulary on their own,
 *     so they are drawn as READINGS of the frozen exit codes (0/1/2)
 *     rather than as invented states — the mapping is shown, not asserted.
 * The topology is drawn honestly: the suite and the workflows are READ
 * statically (dashed), only a real run yields artifacts (gold), and only
 * those artifacts can lift a finding onto the runtime rungs of the ladder.
 *
 * Numbers come from `assets/video/script.demo.json`'s assertions — the
 * values tests/contract/video-script.spec.ts checks against real CLI
 * output — and are labelled EXAMPLE RESULT with the repo they came from,
 * so no reader can mistake 75 for a universal or permanent score. The
 * finding's title is QA-CI-009's own `title:` string.
 *
 * TYPOGRAPHY — two faces, one rule: mono is what the machine said (rule
 * IDs, flags, formats, exit codes), sans is the document's own voice.
 * Both are vendored and inlined as base64 so the asset never depends on
 * the reader's installed fonts. Geist Sans is proportional, so no sans
 * text is positioned by computed advance — it is anchored, never
 * measured. Only mono runs use the 0.6em advance.
 *
 * LAYOUT — every band is a named constant. An earlier draft collided
 * three times inside the engine because offsets were written relative to
 * whatever happened to be above them; the bands exist so that cannot
 * recur.
 *
 * Regenerate with `npm run docs:architecture`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { FONTS, fontPath } from "./video/fonts.js";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "assets", "readme", "architecture.svg");
const SANS_TTF = join(ROOT, "assets", "readme", "fonts", "Geist-SemiBold.ttf");

const SANS = "MjolnirSans";
const MONO = "MjolnirMono";
const ADV = 0.6; // Geist Mono advance ratio

const W = 1600;
const H = 900;

/* ── vertical grid ── */
const AHA_Y = 158;
const MAIN_TOP = 245;
const MAIN_BOTTOM = 685;
const LOOP_RULE = 712;
const FOOT_Y = 838;

/* ── columns ── */
const IN_X = 64;
const IN_W = 260;
const ART_X = 352;
const ART_W = 148;
const BUS_X = 524;
const ENG_X = 552;
const ENG_W = 608;
const OUT_X = 1200;
const OUT_W = 336;
const RIGHT = 1536;

interface Beat {
  id: string;
  assertions?: {
    score?: number;
    errorCount?: number;
    findingCount?: number;
    requiredFindings?: string[];
  };
}

const esc = (s: string): string =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const n = (v: number): string =>
  Number.isInteger(v) ? String(v) : v.toFixed(2);

/** Advance width of `c` MONO characters at `size`. */
const mw = (c: number, size: number): number => c * size * ADV;

interface T {
  size?: number;
  fill?: string;
  family?: string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
}

function text(x: number, y: number, s: string, o: T = {}): string {
  const p = [
    `x="${n(x)}"`,
    `y="${n(y)}"`,
    `font-size="${o.size ?? 12}"`,
    `fill="${o.fill ?? "var(--text)"}"`,
    `font-family="${o.family ?? SANS}"`,
  ];
  if (o.anchor && o.anchor !== "start") p.push(`text-anchor="${o.anchor}"`);
  if (o.spacing) p.push(`letter-spacing="${o.spacing}"`);
  return `    <text ${p.join(" ")}>${esc(s)}</text>`;
}

function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  o: { r?: number; fill?: string; stroke?: string; sw?: number } = {},
): string {
  const p = [
    `x="${n(x)}"`,
    `y="${n(y)}"`,
    `width="${n(w)}"`,
    `height="${n(h)}"`,
    `rx="${o.r ?? 10}"`,
    `fill="${o.fill ?? "var(--surface)"}"`,
  ];
  if (o.stroke) p.push(`stroke="${o.stroke}"`, `stroke-width="${o.sw ?? 1}"`);
  return `    <rect ${p.join(" ")}/>`;
}

const eyebrow = (
  x: number,
  y: number,
  s: string,
  fill = "var(--quiet)",
): string => text(x, y, s, { size: 10, fill, spacing: 2.6 });

const CHIP = 10.5;
const chipW = (s: string): number => mw(s.length, CHIP) + 16;

function chips(x: number, y: number, items: string[], gap = 7): string {
  let cx = x;
  const out: string[] = [];
  for (const s of items) {
    const w = chipW(s);
    out.push(rect(cx, y, w, 21, { r: 5, fill: "var(--chip)" }));
    out.push(
      text(cx + 8, y + 14.5, s, {
        size: CHIP,
        fill: "var(--muted)",
        family: MONO,
      }),
    );
    cx += w + gap;
  }
  return out.join("\n");
}

/** Straight connector using a reusable marker from <defs>. */
function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  o: {
    m?: "arrow" | "arrow-gold" | null;
    dash?: boolean;
    color?: string;
    sw?: number;
  } = {},
): string {
  const c = o.color ?? "var(--edge-lit)";
  const d = o.dash ? ` stroke-dasharray="3 4"` : "";
  const m = o.m === null ? "" : ` marker-end="url(#${o.m ?? "arrow"})"`;
  return `    <line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${c}" stroke-width="${o.sw ?? 1.4}"${d}${m}/>`;
}

/**
 * A mono word-chain with arrows between the words, laid out on real
 * advances. Returns the markup and the x where the chain ends.
 */
function chain(
  x: number,
  y: number,
  words: Array<[string, string]>,
  size = 10.5,
  gap = 26,
): { svg: string; end: number } {
  let cx = x;
  const out: string[] = [];
  words.forEach(([w, fill], i) => {
    out.push(text(cx, y, w, { size, fill, family: MONO }));
    cx += mw(w.length, size);
    if (i < words.length - 1) {
      out.push(line(cx + 7, y - 3.5, cx + gap - 7, y - 3.5, { sw: 1.1 }));
      cx += gap;
    }
  });
  return { svg: out.join("\n"), end: cx };
}

function fontFaceCss(): string {
  const mono = FONTS.find(
    (f) => f.family === "MjolnirMono" && f.weight === 400,
  );
  if (!mono) throw new Error("Geist Mono Regular is no longer vendored");
  const face = (fam: string, p: string): string =>
    `@font-face{font-family:"${fam}";font-style:normal;src:url(data:font/ttf;base64,${readFileSync(p).toString("base64")}) format("truetype")}`;
  return [face(MONO, fontPath(mono)), face(SANS, SANS_TTF)].join("\n");
}

export function buildArchitectureSvg(): string {
  const script = JSON.parse(
    readFileSync(join(ROOT, "assets", "video", "script.demo.json"), "utf8"),
  ) as { beats: Beat[] };
  const scan = script.beats.find((b) => b.id === "hero-scan")?.assertions;
  if (!scan) throw new Error("script.demo.json has no hero-scan assertions");
  const { score, findingCount, errorCount } = scan;
  if (
    typeof score !== "number" ||
    typeof findingCount !== "number" ||
    typeof errorCount !== "number"
  )
    throw new Error("hero-scan assertions are incomplete");
  const rule = (scan.requiredFindings ?? [])[0];
  if (!rule) throw new Error("hero-scan names no findings");

  const g: string[] = [];

  /* ═══════════ header ═══════════ */
  g.push(`  <g id="header">`);
  g.push(
    text(IN_X, 72, "Tests tell you what passed.", {
      size: 25,
      fill: "var(--quiet)",
    }),
  );
  g.push(
    text(IN_X, 110, "Mjölnir tells you what you can trust.", { size: 31 }),
  );
  g.push(
    text(RIGHT, 72, "NO EVIDENCE.  NO PROOF.", {
      size: 11,
      fill: "var(--accent)",
      spacing: 2.8,
      anchor: "end",
    }),
  );
  g.push(
    text(RIGHT, 98, "A green pipeline is a claim, not a proof.", {
      size: 12,
      fill: "var(--quiet)",
      anchor: "end",
    }),
  );
  g.push(`  </g>`);

  /* ═══════════ the aha strip ═══════════ */
  g.push(`  <g id="why">`);
  g.push(
    `    <line x1="${IN_X}" y1="${AHA_Y - 26}" x2="${RIGHT}" y2="${AHA_Y - 26}" stroke="var(--edge)"/>`,
  );
  g.push(eyebrow(IN_X, AHA_Y, "WITHOUT", "var(--quiet)"));
  const without = chain(IN_X + 96, AHA_Y, [
    ["tests", "var(--quiet)"],
    ["pass", "var(--quiet)"],
    ["looks green", "var(--quiet)"],
  ]);
  g.push(without.svg);
  g.push(eyebrow(IN_X, AHA_Y + 30, "WITH", "var(--accent)"));
  const withM = chain(IN_X + 96, AHA_Y + 30, [
    ["tests", "var(--muted)"],
    ["run", "var(--muted)"],
    ["artifacts", "var(--muted)"],
    ["evidence", "var(--muted)"],
    ["MJÖLNIR", "var(--accent)"],
    ["trust", "var(--text)"],
  ]);
  g.push(withM.svg);
  g.push(`  </g>`);

  /* ═══════════ inputs ═══════════ */
  const IN_H = 100;
  const IN_GAP = 120;
  const inputs: Array<[string, string, string[]]> = [
    [
      "TEST SUITE",
      "read statically · never executed",
      ["playwright", "jest", "vitest"],
    ],
    [
      "CI PIPELINE",
      "workflows · jobs · steps · gates",
      ["continue-on-error", "|| true"],
    ],
    [
      "TEST RUN",
      "an execution that already finished",
      ["retries", "failures", "skips"],
    ],
  ];
  g.push(`  <g id="inputs">`);
  g.push(eyebrow(IN_X, MAIN_TOP - 24, "WHAT THE SYSTEM PRODUCES"));
  inputs.forEach(([title, sub, cs], i) => {
    const y = MAIN_TOP + i * IN_GAP;
    g.push(rect(IN_X, y, IN_W, IN_H, { r: 12, stroke: "var(--edge)" }));
    g.push(text(IN_X + 18, y + 30, title, { size: 14 }));
    g.push(text(IN_X + 18, y + 50, sub, { size: 10.5, fill: "var(--quiet)" }));
    g.push(chips(IN_X + 18, y + 62, cs));
  });
  g.push(`  </g>`);

  /* ═══════════ run artifacts ═══════════ */
  const ART_Y = MAIN_TOP + 2 * IN_GAP;
  g.push(`  <g id="run-artifacts">`);
  g.push(
    rect(ART_X, ART_Y, ART_W, IN_H, { r: 12, stroke: "var(--accent-dim)" }),
  );
  g.push(
    text(ART_X + 16, ART_Y + 30, "REAL RUN", {
      size: 13,
      fill: "var(--accent)",
    }),
  );
  g.push(
    text(ART_X + 16, ART_Y + 46, "EVIDENCE", {
      size: 13,
      fill: "var(--accent)",
    }),
  );
  g.push(chips(ART_X + 16, ART_Y + 56, ["playwright json"]));
  g.push(chips(ART_X + 16, ART_Y + 80, ["junit xml"]));
  g.push(`  </g>`);

  /* ═══════════ connectors: three signals merge on one bus ═══════════ */
  const m1 = MAIN_TOP + IN_H / 2;
  const m2 = MAIN_TOP + IN_GAP + IN_H / 2;
  const m3 = ART_Y + IN_H / 2;
  const busMid = (m1 + m3) / 2;
  g.push(`  <g id="connectors">`);
  g.push(line(IN_X + IN_W, m1, BUS_X, m1, { m: null, dash: true }));
  g.push(line(IN_X + IN_W, m2, BUS_X, m2, { m: null, dash: true }));
  g.push(line(IN_X + IN_W, m3, ART_X, m3, { m: null }));
  g.push(
    line(ART_X + ART_W, m3, BUS_X, m3, { m: null, color: "var(--accent)" }),
  );
  g.push(
    `    <line x1="${BUS_X}" y1="${m1}" x2="${BUS_X}" y2="${m3}" stroke="var(--edge-lit)" stroke-width="1.4"/>`,
  );
  g.push(
    line(BUS_X, busMid, ENG_X - 4, busMid, {
      m: "arrow-gold",
      color: "var(--accent)",
    }),
  );
  g.push(
    text(ART_X + 30, m1 - 12, "STATIC", {
      size: 9,
      fill: "var(--quiet)",
      spacing: 1.6,
    }),
  );
  g.push(
    text(ART_X, ART_Y - 10, "RUNTIME", {
      size: 9,
      fill: "var(--accent)",
      spacing: 1.6,
    }),
  );
  g.push(`  </g>`);

  /* ═══════════ mjolnir core ═══════════ */
  const CX = ENG_X + ENG_W / 2;
  const PL = ENG_X + 28; // left gutter
  const PR = ENG_X + 330; // right column
  /* named bands — nothing is positioned relative to its neighbour */
  const Y_NAME = 296;
  const Y_SUB = 318;
  const Y_STAGE = 344;
  const Y_COL_LABEL = 412;
  const Y_STREAM = [434, 456, 478, 500];
  const Y_SIG = 436;
  const Y_EV_BASE = 508;
  const Y_EV_TEXT = 524;
  const Y_EV_NOTE = 544;
  const Y_TL_LABEL = 578;
  const Y_TL_BASE = 612;
  const Y_TL_TICK = 626;
  const Y_TL_NOTE = 655;

  g.push(`  <g id="mjolnir-core">`);
  g.push(
    rect(ENG_X, MAIN_TOP, ENG_W, MAIN_BOTTOM - MAIN_TOP, {
      r: 18,
      fill: "var(--engine)",
      stroke: "var(--accent-dim)",
      sw: 1.25,
    }),
  );
  g.push(
    text(CX, Y_NAME, "MJÖLNIR", { size: 38, anchor: "middle", spacing: 4 }),
  );
  g.push(
    text(CX, Y_SUB, "VERIFICATION TRUST ENGINE", {
      size: 10,
      fill: "var(--accent)",
      anchor: "middle",
      spacing: 3.6,
    }),
  );

  const stages = [
    "DISCOVER",
    "ANALYZE",
    "CORRELATE",
    "WEIGH EVIDENCE",
    "MEASURE",
  ];
  const SW_ = 100;
  const SG = 13;
  let sx = ENG_X + (ENG_W - (SW_ * 5 + SG * 4)) / 2;
  stages.forEach((s, i) => {
    g.push(rect(sx, Y_STAGE, SW_, 30, { r: 7, fill: "var(--chip)" }));
    g.push(
      text(sx + SW_ / 2, Y_STAGE + 20, s, {
        size: s.length > 10 ? 8.5 : 9.5,
        fill: "var(--muted)",
        anchor: "middle",
        spacing: 1.2,
      }),
    );
    if (i < 4)
      g.push(
        line(sx + SW_ + 2, Y_STAGE + 15, sx + SG - 2 + SW_, Y_STAGE + 15, {
          sw: 1.1,
        }),
      );
    sx += SW_ + SG;
  });

  /* left column: the streams */
  g.push(eyebrow(PL, Y_COL_LABEL, "EVIDENCE STREAMS"));
  [
    "TEST QUALITY",
    "CI INTEGRITY",
    "RUNTIME FORENSICS",
    "SELECTOR HEALTH",
  ].forEach((s, i) => {
    g.push(
      `    <circle cx="${n(PL + 3)}" cy="${n((Y_STREAM[i] as number) - 4)}" r="2.5" fill="var(--accent)"/>`,
    );
    g.push(text(PL + 15, Y_STREAM[i] as number, s, { size: 11.5 }));
  });

  /* right column: the evidence model */
  g.push(eyebrow(PR, Y_COL_LABEL, "EVIDENCE MODEL"));
  const sig = chain(
    PR,
    Y_SIG,
    [
      ["SIGNAL", "var(--quiet)"],
      ["EVIDENCE", "var(--muted)"],
      ["TRUST", "var(--accent)"],
    ],
    9.5,
    22,
  );
  g.push(sig.svg);
  const ev: Array<[string, string, number, string]> = [
    ["E0", "observation", 16, "var(--quiet)"],
    ["E1", "pattern evidence", 30, "var(--muted)"],
    ["E2", "deterministic proof", 48, "var(--accent)"],
  ];
  ev.forEach(([code, label, h, color], i) => {
    const x = PR + i * 84;
    g.push(rect(x, Y_EV_BASE - h, 7, h, { r: 3, fill: color }));
    g.push(text(x + 14, Y_EV_BASE - h + 12, code, { size: 13, fill: color }));
    g.push(text(x, Y_EV_TEXT, label, { size: 9, fill: "var(--quiet)" }));
  });
  g.push(
    text(PR, Y_EV_NOTE, "weight  none · half · full", {
      size: 9.5,
      fill: "var(--quiet)",
      family: MONO,
    }),
  );
  g.push(
    text(PR, Y_EV_NOTE + 16, "Evidence level is earned, not assumed.", {
      size: 10.5,
      fill: "var(--muted)",
    }),
  );

  /* trust ladder — subordinate to E0/E1/E2 */
  g.push(eyebrow(PL, Y_TL_LABEL, "TRUST LADDER"));
  for (let i = 0; i < 6; i++) {
    const bx = PL + i * 24;
    const bh = 6 + i * 3.2;
    g.push(
      rect(bx, Y_TL_BASE - bh, 14, bh, {
        r: 2,
        fill: i >= 3 ? "var(--accent)" : "var(--edge-lit)",
      }),
    );
    g.push(
      text(bx + 7, Y_TL_TICK, `L${i}`, {
        size: 8.5,
        fill: "var(--quiet)",
        anchor: "middle",
      }),
    );
  }
  g.push(
    text(PL + 172, Y_TL_BASE - 12, "L3–L5 require a real run.", {
      size: 10.5,
      fill: "var(--muted)",
    }),
  );
  g.push(
    text(PL + 172, Y_TL_BASE + 4, "Static analysis can never claim them.", {
      size: 10.5,
      fill: "var(--quiet)",
    }),
  );
  g.push(
    text(CX, Y_TL_NOTE, "signals in · evidence out · nothing executed", {
      size: 9.5,
      fill: "var(--quiet)",
      anchor: "middle",
      family: MONO,
    }),
  );
  g.push(`  </g>`);

  /* ═══════════ outputs ═══════════ */
  g.push(`  <g id="outputs">`);
  g.push(
    line(ENG_X + ENG_W + 4, busMid, OUT_X - 6, busMid, {
      m: "arrow-gold",
      color: "var(--accent)",
    }),
  );
  g.push(eyebrow(OUT_X, MAIN_TOP - 24, "WHAT CAN BE TRUSTED"));

  /* findings */
  g.push(rect(OUT_X, MAIN_TOP, OUT_W, 100, { r: 12, stroke: "var(--edge)" }));
  g.push(eyebrow(OUT_X + 18, MAIN_TOP + 26, "FINDINGS"));
  g.push(
    text(OUT_X + OUT_W - 18, MAIN_TOP + 26, "E2", {
      size: 13,
      fill: "var(--accent)",
      anchor: "end",
    }),
  );
  g.push(chips(OUT_X + 18, MAIN_TOP + 38, [rule]));
  g.push(
    text(
      OUT_X + 18,
      MAIN_TOP + 82,
      "Test command does not propagate exit code",
      {
        size: 10.5,
        fill: "var(--muted)",
      },
    ),
  );

  /* worthiness — explicitly an example */
  const WY = 365;
  g.push(rect(OUT_X, WY, OUT_W, 135, { r: 12, stroke: "var(--edge)" }));
  g.push(eyebrow(OUT_X + 18, WY + 26, "WORTHINESS SCORE"));
  g.push(
    text(OUT_X + OUT_W - 18, WY + 26, "EXAMPLE RESULT", {
      size: 8.5,
      fill: "var(--accent)",
      spacing: 1.6,
      anchor: "end",
    }),
  );
  g.push(text(OUT_X + 18, WY + 92, String(score), { size: 52, spacing: -1 }));
  g.push(
    text(OUT_X + 100, WY + 72, "NEEDS WORK", {
      size: 11,
      fill: "var(--warning)",
      spacing: 2,
    }),
  );
  g.push(
    text(OUT_X + 100, WY + 92, "/100", { size: 14, fill: "var(--quiet)" }),
  );
  g.push(
    text(
      OUT_X + 18,
      WY + 118,
      `${findingCount} findings · ${errorCount} errors · normalized`,
      {
        size: 10,
        fill: "var(--quiet)",
        family: MONO,
      },
    ),
  );
  g.push(`  </g>`);

  /* ═══════════ decision ═══════════ */
  const DY = 520;
  g.push(`  <g id="decision">`);
  g.push(
    rect(OUT_X, DY, OUT_W, MAIN_BOTTOM - DY, { r: 12, stroke: "var(--edge)" }),
  );
  g.push(eyebrow(OUT_X + 18, DY + 26, "CI GATE"));
  g.push(
    text(OUT_X + OUT_W - 18, DY + 26, "TRUST DECISION", {
      size: 10,
      fill: "var(--muted)",
      spacing: 2.6,
      anchor: "end",
    }),
  );
  const gate: Array<[string, string, string, string]> = [
    ["0", "clean", "PASS", "var(--success)"],
    ["1", "findings at/above gate", "BLOCK", "var(--warning)"],
    ["2", "partial scan", "INVESTIGATE", "var(--muted)"],
    ["10", "usage error", "", "var(--quiet)"],
    ["20", "internal error", "", "var(--quiet)"],
  ];
  gate.forEach(([code, label, state, color], i) => {
    const y = DY + 52 + i * 20;
    g.push(
      text(OUT_X + 18, y, code, { size: 11.5, fill: color, family: MONO }),
    );
    g.push(text(OUT_X + 48, y, label, { size: 10, fill: "var(--quiet)" }));
    if (state)
      g.push(
        text(OUT_X + OUT_W - 18, y, state, {
          size: 10,
          fill: color,
          spacing: 1.4,
          anchor: "end",
        }),
      );
  });
  g.push(
    text(
      OUT_X + 18,
      DY + 152,
      "Verification trust, not business correctness.",
      {
        size: 10,
        fill: "var(--muted)",
      },
    ),
  );
  g.push(`  </g>`);

  /* ═══════════ agent loop ═══════════ */
  g.push(`  <g id="agent-loop">`);
  g.push(
    `    <line x1="${IN_X}" y1="${LOOP_RULE}" x2="${RIGHT}" y2="${LOOP_RULE}" stroke="var(--edge)"/>`,
  );
  g.push(eyebrow(IN_X, LOOP_RULE + 34, "AGENT LOOP"));
  g.push(
    text(IN_X, LOOP_RULE + 62, "AI writes the fix. Mjölnir verifies the fix.", {
      size: 15,
    }),
  );
  g.push(
    text(
      IN_X,
      LOOP_RULE + 82,
      "Proof comes from the re-scan, never from the agent's report of success.",
      {
        size: 10.5,
        fill: "var(--quiet)",
      },
    ),
  );
  const loop = ["SCAN", "EVIDENCE", "HANDOFF", "AI AGENT", "RE-SCAN", "PROOF"];
  const LW = 96;
  const LG = 14;
  const loopY = LOOP_RULE + 46;
  let lx = RIGHT - (LW * loop.length + LG * (loop.length - 1));
  loop.forEach((s, i) => {
    const lit = s === "PROOF";
    g.push(
      rect(lx, loopY, LW, 32, {
        r: 8,
        fill: "var(--chip)",
        ...(lit ? { stroke: "var(--accent-dim)" } : {}),
      }),
    );
    g.push(
      text(lx + LW / 2, loopY + 20, s, {
        size: 9.5,
        fill: lit ? "var(--accent)" : "var(--muted)",
        anchor: "middle",
        spacing: 1.3,
      }),
    );
    if (i < loop.length - 1)
      g.push(
        line(lx + LW + 1, loopY + 16, lx + LW + LG - 1, loopY + 16, {
          sw: 1.1,
        }),
      );
    lx += LW + LG;
  });
  /* PROOF returns to the engine — the loop closes on Mjölnir, not on the
   * agent. The path runs below the loop row, then rises into the bottom
   * edge of the Mjölnir panel, so the arrowhead lands on the hero rather
   * than in empty space. */
  const px = RIGHT - LW / 2;
  const backY = loopY + 54;
  g.push(
    `    <path d="M ${n(px)} ${n(loopY + 32)} L ${n(px)} ${n(backY)} L ${n(CX)} ${n(backY)} L ${n(CX)} ${n(MAIN_BOTTOM + 5)}" fill="none" stroke="var(--accent-dim)" stroke-width="1.2" stroke-dasharray="3 4" marker-end="url(#arrow-gold)"/>`,
  );
  g.push(
    text(CX + 12, backY - 7, "re-verified by Mjölnir", {
      size: 9.5,
      fill: "var(--quiet)",
    }),
  );
  g.push(`  </g>`);

  /* ═══════════ boundaries + self-verification ═══════════ */
  g.push(`  <g id="boundaries">`);
  g.push(eyebrow(IN_X, FOOT_Y, "MJÖLNIR", "var(--muted)"));
  g.push(
    text(
      IN_X + 92,
      FOOT_Y,
      "reads · analyzes · correlates · measures · reports · gates",
      {
        size: 10.5,
        fill: "var(--muted)",
        family: MONO,
      },
    ),
  );
  g.push(eyebrow(IN_X, FOOT_Y + 22, "NEVER", "var(--quiet)"));
  g.push(
    text(
      IN_X + 92,
      FOOT_Y + 22,
      "runs your tests · executes your code · replaces your framework · proves business correctness",
      {
        size: 10.5,
        fill: "var(--quiet)",
        family: MONO,
      },
    ),
  );
  g.push(`  </g>`);

  g.push(`  <g id="self-verification">`);
  g.push(
    text(RIGHT, FOOT_Y, "Mjölnir scans Mjölnir in its own CI.", {
      size: 11.5,
      fill: "var(--muted)",
      anchor: "end",
    }),
  );
  g.push(
    text(
      RIGHT,
      FOOT_Y + 22,
      "A verification trust engine must itself be verifiable.",
      {
        size: 10.5,
        fill: "var(--quiet)",
        anchor: "end",
      },
    ),
  );
  g.push(`  </g>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="archTitle archDesc">
  <title id="archTitle">Mjölnir — Verification Trust Engine: how it works</title>
  <desc id="archDesc">Without Mjölnir a pipeline goes tests, pass, looks green. With Mjölnir it goes tests, run, artifacts, evidence, Mjölnir, trust. Mjölnir reads three signals: the test suite and the CI pipeline statically, and the artifacts of a run that already finished — Playwright JSON and JUnit XML — which are the only real run evidence it ingests. It discovers, analyzes, correlates, weighs evidence and measures, across four evidence streams: test quality, CI integrity, runtime forensics and selector health. Every finding is stamped E0 observation, E1 pattern evidence, or E2 deterministic proof, weighted none, half and full; evidence level is earned, not assumed. A trust ladder from L0 to L5 shows the top three rungs require a real run, so static analysis can never claim them. Mjölnir never runs your tests, executes your code, replaces your framework, or proves business correctness. Out come findings such as ${rule}, Test command does not propagate exit code, at evidence level E2; an example worthiness score from examples/demo-repo of ${score} out of 100 labelled NEEDS WORK, from ${findingCount} findings and ${errorCount} errors; and a CI gate mapping the frozen exit codes to a trust decision: 0 clean is pass, 1 findings at or above the gate is block, 2 partial scan is investigate, 10 usage error, 20 internal error. That is verification trust, not business correctness. An agent loop runs scan, evidence, handoff, AI agent, re-scan, proof, and the proof returns to Mjölnir for re-verification: AI writes the fix, Mjölnir verifies the fix.</desc>
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7.5" refY="4" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
      <path d="M0,0.5 L7.5,4 L0,7.5 Z" fill="var(--edge-lit)"/>
    </marker>
    <marker id="arrow-gold" markerWidth="9" markerHeight="9" refX="8.5" refY="4.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
      <path d="M0,0.5 L8.5,4.5 L0,8.5 Z" fill="var(--accent)"/>
    </marker>
  </defs>
  <style>
${fontFaceCss()}
    :root{
      --bg:#08090A; --surface:#0E1013; --engine:#0C0E12; --chip:#15181D;
      --edge:#1C2026; --edge-lit:#39414B;
      --text:#EDE6D6; --muted:#8B939D; --quiet:#5A6169;
      --accent:#C19A34; --accent-dim:#4A3D1B;
      --success:#4FB477; --warning:#C19A34;
    }
  </style>
  <rect x="0" y="0" width="${W}" height="${H}" fill="var(--bg)"/>
${g.join("\n")}
</svg>
`;
}

const isMain = process.argv[1]
  ? fileURLToPath(new URL(`file://${process.argv[1].replaceAll("\\", "/")}`))
  : "";
if (isMain.endsWith("generate-readme-architecture.ts")) {
  writeFileSync(OUT, buildArchitectureSvg(), "utf8");
  process.stdout.write(`wrote ${OUT}\n`);
}
