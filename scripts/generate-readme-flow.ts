/**
 * README "See it work" flow asset (assets/readme/flow.svg).
 *
 * ONE PICTURE, ONE MOMENT: a suite scores 75, one fix taken from the
 * report is applied, the re-scan proves 90. Drawn at the same 16:9
 * footprint the demo video occupies so it stands in the same slot.
 *
 * DESIGN — deliberately reductive. No cards, no borders, no badges, no
 * code window: hierarchy is carried by size, weight and air alone, and
 * exactly one accent colour (the WORTHY cyan) appears in the whole
 * frame. The "before" is neutral grey and the "after" is lit; that
 * contrast IS the story, so nothing else competes with it.
 *
 * TWO FACES, ONE RULE — mono is for what the machine said, sans is for
 * the editorial voice. The command and the fix are Geist Mono because
 * they are literal terminal text; the numerals, labels and prose are
 * Geist Sans because they are the document speaking. Geist Mono's
 * numerals are unusable at display size: the zero is slashed by default
 * and no OpenType feature ('zero', 'ss01', 'ss02' were all tried)
 * removes it, which reads as a defect at display size.
 *
 * Both families are vendored and inlined as base64 `@font-face` rules so
 * the asset renders identically everywhere — a README picture that
 * depends on the reader's installed fonts is not a reproducible
 * artifact, the same argument scripts/video/fonts.ts makes for the
 * video. Geist Sans is SIL OFL 1.1, licence committed beside the file.
 * Colours are scripts/video/terminal-page.ts's constants.
 *
 * Every NUMBER is read from `assets/video/script.demo.json`'s
 * `assertions` blocks — the same values tests/contract/video-script.spec.ts
 * checks against real CLI output — so this asset cannot drift into
 * claiming a score, finding count or rule ID the demo does not produce.
 * The fix line quotes the two rules' own `fix:` strings in substance:
 * QA-CI-009 prints "Add `shell: bash` with `set -o pipefail`" and "Chain
 * with `&&` instead of `;`"; QA-CI-001 prints "Remove continue-on-error".
 *
 * Layout note: Geist Sans is proportional, so nothing sans is positioned
 * by computed advance. The hero is mirrored about the centre axis with
 * `text-anchor` end/start, which needs no measurement and cannot drift
 * if the metrics change. Only mono runs use the 0.6em advance.
 *
 * Regenerate with `npm run docs:flow`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { SCORE, STATUS, SURFACE, TEXT } from "../src/brand/tokens.js";

import { FONTS, fontPath } from "./video/fonts.js";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "assets", "readme", "flow.svg");
const SANS_TTF = join(ROOT, "assets", "readme", "fonts", "Geist-SemiBold.ttf");

/* ── palette: scripts/video/terminal-page.ts's constants ── */
/* Every colour resolves through src/brand/tokens.ts — this file names
   none of its own, and brand-doctor rule 6 fails if it starts to. The
   two dimness levels the drawing needs (the neutral "before", and the
   captions under it) are the text ramp's own two lower steps, so the
   relationship between them is the one every other surface uses. */
const INK = SURFACE.terminal; // page + terminal body
const BONE = TEXT.primary; // .cmd — the lit "after"
const STEEL = TEXT.secondary; // the neutral "before"
const QUIET = TEXT.muted; // captions; below STEEL, still legible
const GREEN = STATUS.ok; // .prompt
const ACCENT = SCORE.trusted; // the one accent in the frame: WORTHY

const SANS = "MjolnirSans";
const MONO = "MjolnirMono";
/** Geist Mono advance ratio; terminal-page.ts derives its size from it. */
const ADVANCE = 0.6;

/* ── geometry: 900×506 is the footprint of the 16:9 demo video at width=900 ── */
const W = 900;
const H = 506;
const AXIS = W / 2;
const HERO = 108; // the numerals; everything else is small by comparison
const REACH = 86; // half-width of the air the transition occupies

interface Beat {
  id: string;
  assertions?: {
    score?: number;
    errorCount?: number;
    findingCount?: number;
    requiredFindings?: string[];
    absentFindings?: string[];
  };
}

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function round(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Advance width of `n` MONO characters at `size`, plus letter-spacing. */
function monoWidth(n: number, size: number, spacing = 0): number {
  return n * (size * ADVANCE + spacing);
}

interface TextOpts {
  size?: number;
  fill?: string;
  family?: string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
}

function text(x: number, y: number, s: string, opts: TextOpts = {}): string {
  const a = opts.anchor ?? "start";
  const parts = [
    `x="${round(x)}"`,
    `y="${round(y)}"`,
    `font-size="${opts.size ?? 11}"`,
    `fill="${opts.fill ?? BONE}"`,
  ];
  if (opts.family) parts.push(`font-family="${opts.family}"`);
  if (a !== "start") parts.push(`text-anchor="${a}"`);
  if (opts.spacing) parts.push(`letter-spacing="${opts.spacing}"`);
  return `  <text ${parts.join(" ")}>${esc(s)}</text>`;
}

/** A drawn arrow — never a typed glyph, so no face needs to cover it. */
function arrow(x1: number, x2: number, y: number, color: string): string {
  return [
    `  <line x1="${round(x1)}" y1="${round(y)}" x2="${round(x2 - 5)}" y2="${round(y)}" stroke="${color}" stroke-width="1.25"/>`,
    `  <path d="M ${round(x2 - 6.5)} ${round(y - 4)} L ${round(x2)} ${round(y)} L ${round(x2 - 6.5)} ${round(y + 4)} Z" fill="${color}"/>`,
  ].join("\n");
}

type Item = { t: string; fill?: string } | { gap: number } | { arrow: number };

/** One centred MONO line of mixed text and drawn arrows, on real advances. */
function monoRun(cy: number, size: number, items: Item[]): string {
  const measure = (i: Item): number =>
    "t" in i ? monoWidth(i.t.length, size) : "gap" in i ? i.gap : i.arrow;
  const total = items.reduce((a, i) => a + measure(i), 0);
  let x = (W - total) / 2;
  const out: string[] = [];
  for (const i of items) {
    if ("t" in i) {
      out.push(
        text(x, cy + size * 0.35, i.t, {
          size,
          fill: i.fill ?? QUIET,
          family: MONO,
        }),
      );
    } else if ("arrow" in i) {
      out.push(arrow(x + 6, x + i.arrow - 6, cy, QUIET));
    }
    x += measure(i);
  }
  return out.join("\n");
}

/** `@font-face` rules, inlined as data URIs. Mono Regular + Sans SemiBold
 * only: Mono Bold is not used anywhere, and carrying it would add ~190KB
 * of base64 for nothing. */
function fontFaceCss(): string {
  const mono = FONTS.find(
    (f) => f.family === "MjolnirMono" && f.weight === 400,
  );
  if (!mono) throw new Error("Geist Mono Regular is no longer vendored");
  const face = (family: string, path: string): string =>
    `@font-face{font-family:"${family}";font-style:normal;src:url(data:font/ttf;base64,${readFileSync(path).toString("base64")}) format("truetype")}`;
  return [face(MONO, fontPath(mono)), face(SANS, SANS_TTF)].join("\n");
}

/**
 * Builds the flow SVG and returns it — no writes, so a reproducibility
 * spec can compare the committed file against a freshly built one.
 */
export function buildFlowSvg(): string {
  const script = JSON.parse(
    readFileSync(join(ROOT, "assets", "video", "script.demo.json"), "utf8"),
  ) as { beats: Beat[] };

  const find = (id: string): NonNullable<Beat["assertions"]> => {
    const a = script.beats.find((b) => b.id === id)?.assertions;
    if (!a) throw new Error(`script.demo.json has no assertions for "${id}"`);
    return a;
  };
  const before = find("hero-scan");
  const after = find("hero-rescan");

  for (const [name, v] of Object.entries({
    "before.score": before.score,
    "before.findingCount": before.findingCount,
    "before.errorCount": before.errorCount,
    "after.score": after.score,
    "after.findingCount": after.findingCount,
    "after.errorCount": after.errorCount,
  })) {
    if (typeof v !== "number")
      throw new Error(`script.demo.json is missing ${name}`);
  }

  // The rules the demo proves present before and absent after — the whole
  // point of the picture, so they are read, never typed.
  const closed = (before.requiredFindings ?? []).filter((r) =>
    (after.absentFindings ?? []).includes(r),
  );
  if (closed.length < 2)
    throw new Error(
      "expected at least 2 rules present in hero-scan and absent in hero-rescan",
    );

  /* ── the hero: mirrored about the axis, so no sans metric is assumed ── */
  const baseline = 254;
  const optical = baseline - HERO * 0.34;
  const hero = [
    text(AXIS - REACH, baseline, String(before.score), {
      size: HERO,
      fill: STEEL,
      family: SANS,
      anchor: "end",
      spacing: -1.5,
    }),
    text(AXIS + REACH, baseline, String(after.score), {
      size: HERO,
      fill: BONE,
      family: SANS,
      anchor: "start",
      spacing: -1.5,
    }),
    text(AXIS - REACH, baseline + 34, "NEEDS WORK", {
      size: 10.5,
      fill: STEEL,
      family: SANS,
      anchor: "end",
      spacing: 3,
    }),
    text(AXIS + REACH, baseline + 34, "WORTHY", {
      size: 10.5,
      fill: ACCENT,
      family: SANS,
      anchor: "start",
      spacing: 3,
    }),
    text(AXIS, optical - 21, "ONE FIX", {
      size: 8.5,
      fill: QUIET,
      family: SANS,
      anchor: "middle",
      spacing: 3.4,
    }),
    arrow(AXIS - 42, AXIS + 42, optical, STEEL),
    text(AXIS, optical + 29, "RE-SCANNED", {
      size: 8.5,
      fill: QUIET,
      family: SANS,
      anchor: "middle",
      spacing: 3.4,
    }),
  ].join("\n");

  const body = [
    /* eyebrow */
    text(AXIS, 74, "THE VERIFICATION LOOP", {
      size: 9.5,
      fill: QUIET,
      family: SANS,
      anchor: "middle",
      spacing: 5.4,
    }),
    /* the command — mono, because it is literal terminal text */
    monoRun(116, 11.5, [
      { t: "$", fill: GREEN },
      { gap: 7 },
      { t: "npx mjolnir-qa@latest", fill: STEEL },
    ]),
    hero,
    /* what the fix was — mono, because it is literal code */
    text(
      AXIS,
      350,
      "set -o pipefail   ·   && not ;   ·   no continue-on-error",
      {
        size: 12.5,
        fill: BONE,
        family: MONO,
        anchor: "middle",
      },
    ),
    /* the document's own voice — sans */
    text(
      AXIS,
      374,
      `the fix the report printed — closes ${closed.join(" and ")}`,
      { size: 10.5, fill: QUIET, family: SANS, anchor: "middle" },
    ),
    /* the counts, as transitions — mono data, drawn arrows */
    monoRun(422, 11, [
      { t: `${before.findingCount} findings`, fill: STEEL },
      { arrow: 30 },
      { t: `${after.findingCount}`, fill: STEEL },
      { gap: 34 },
      { t: `${before.errorCount} errors`, fill: STEEL },
      { arrow: 30 },
      { t: `${after.errorCount}`, fill: STEEL },
    ]),
    /* the line the whole asset exists to earn */
    text(
      AXIS,
      468,
      `${after.score}, not 100 — the suite's other problems are still real.`,
      { size: 13, fill: STEEL, family: SANS, anchor: "middle" },
    ),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="${SANS}, sans-serif" role="img" aria-labelledby="flowTitle">
  <title id="flowTitle">Mjölnir end to end: npx mjolnir-qa@latest scores ${before.score}/100 NEEDS WORK with ${before.findingCount} findings and ${before.errorCount} errors; one fix from the report — set -o pipefail, &amp;&amp; instead of a semicolon, and no continue-on-error — closes ${closed.join(" and ")}; the re-scan proves ${after.score}/100 WORTHY with ${after.findingCount} findings and ${after.errorCount} error left. ${after.score}, not 100, because the suite's other problems are still real.</title>
  <style>
${fontFaceCss()}
  </style>
  <rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="${INK}"/>
${body}
</svg>
`;
}

const isMain = process.argv[1]
  ? fileURLToPath(new URL(`file://${process.argv[1].replaceAll("\\", "/")}`))
  : "";
if (isMain.endsWith("generate-readme-flow.ts")) {
  writeFileSync(OUT, buildFlowSvg(), "utf8");
  process.stdout.write(`wrote ${OUT}\n`);
}
