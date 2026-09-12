/**
 * `docs/design/DESIGN-TOKENS.md`, generated from the token module.
 *
 * The reference has to be generated for the same reason `vars.css` is:
 * a document that states values by hand is a document that will
 * eventually state values the code does not hold. That already happened
 * here — the brand document's palette table had drifted from `vars.css`
 * on every one of its twelve rows, and its verdict table documented a
 * light ramp for a product that is dark-only everywhere.
 *
 * Split out of `generate-brand-tokens.ts` so that file stays about the
 * two machine surfaces and this one is about prose.
 */

import {
  BADGE,
  BRAND,
  EVIDENCE,
  MOTION,
  SCORE,
  STATUS,
  SURFACE,
  TEXT,
  TINT,
  TRUST,
  TYPOGRAPHY,
} from "../src/brand/tokens.js";

type Row = readonly [name: string, value: string, note?: string];

function table(title: string, intro: string, rows: readonly Row[]): string {
  const body = rows
    .map(([n, v, note]) => `| \`${n}\` | \`${v}\` | ${note ?? ""} |`)
    .join("\n");
  return `### ${title}\n\n${intro}\n\n| Token | Value | |\n| --- | --- | --- |\n${body}\n`;
}

const COLOUR_SECTIONS = (): string =>
  [
    table("brand", "The two brand hues and the neutral they sit on.", [
      ["brand.gold", BRAND.gold, "primary — scarce"],
      ["brand.goldBright", BRAND.goldBright, "primary on dark"],
      ["brand.goldHot", BRAND.goldHot, "highlight, FORGED"],
      ["brand.goldDeep", BRAND.goldDeep, "pressed; background only"],
      ["brand.aurora", BRAND.aurora, "secondary — verification energy"],
      ["brand.auroraBright", BRAND.auroraBright, "secondary on dark"],
      ["brand.auroraCyan", BRAND.auroraCyan, "informational"],
      ["brand.steel", BRAND.steel, "neutral bright"],
      ["brand.steelDim", BRAND.steelDim, "muted"],
    ]),
    table("surface", "Midnight iron. One ramp, darkest first.", [
      ["surface.ink950", SURFACE.ink950, "deepest — hero, terminal"],
      ["surface.ink900", SURFACE.ink900, "page"],
      ["surface.ink850", SURFACE.ink850, "surface"],
      ["surface.ink800", SURFACE.ink800, "raised"],
      ["surface.panel", SURFACE.panel, "card"],
      ["surface.soft", SURFACE.soft, "inline code, quiet chips"],
      ["surface.terminal", SURFACE.terminal, "terminal body"],
      ["surface.terminalBar", SURFACE.terminalBar, "title bar — same tone"],
      ["surface.chromeDot", SURFACE.chromeDot, "the window dots, one neutral"],
    ]),
    table("text", "One text ramp. Every surface uses it.", [
      ["text.primary", TEXT.primary],
      ["text.secondary", TEXT.secondary],
      ["text.muted", TEXT.muted],
      ["text.onGold", TEXT.onGold, "ink for text set ON gold"],
    ]),
    table("status", "Non-score status. `ok` is never a score colour.", [
      ["status.ok", STATUS.ok, "non-score success only"],
      ["status.info", STATUS.info],
      ["status.warning", STATUS.warning],
      ["status.error", STATUS.error],
    ]),
    table(
      "score",
      "The ScoreState bands. Thresholds and runes live in `src/reporter/score-state.ts`.",
      [
        ["score.critical", SCORE.critical, "0–49 · UNWORTHY · ᚲ"],
        ["score.warning", SCORE.warning, "50–79 · NEEDS WORK · ᚦ"],
        ["score.trusted", SCORE.trusted, "80–99 · WORTHY · ᛏ"],
        ["score.forged", SCORE.forged, "100 · FORGED · ᛟ"],
        ["score.unmeasured", SCORE.unmeasured, "UNKNOWN · ᛁ — never red"],
      ],
    ),
    table(
      "evidence",
      "A hue-free brightness ramp: certainty is not a value judgement.",
      [
        ["evidence.e0", EVIDENCE.e0, "observation · open ring · no weight"],
        ["evidence.e1", EVIDENCE.e1, "pattern evidence · half ring · half"],
        ["evidence.e2", EVIDENCE.e2, "deterministic proof · sealed · full"],
      ],
    ),
    table(
      "trust",
      "Neutral steel below the runtime boundary, aurora above it.",
      [
        ["trust.l0", TRUST.l0, "observation only · static"],
        ["trust.l1", TRUST.l1, "heuristic static"],
        ["trust.l2", TRUST.l2, "deterministic static — the static ceiling"],
        ["trust.l3", TRUST.l3, "the finding's file executed · **runtime**"],
        ["trust.l4", TRUST.l4, "the finding's test executed · runtime"],
        ["trust.l5", TRUST.l5, "the run verdict corroborates · runtime"],
      ],
    ),
    table(
      "tint",
      "Pale fills for mermaid diagrams, which render on a ground this palette does not own. Listed `fill / stroke / text`.",
      Object.entries(TINT).map(
        ([k, t]) => [`tint.${k}`, `${t.fill} / ${t.stroke} / ${t.text}`] as Row,
      ),
    ),
    table("badge", "shields.io takes hex without the `#`.", [
      ["badge.primary", BADGE.primary],
      ["badge.label", BADGE.label],
      ["badge.secondary", BADGE.secondary],
    ]),
  ].join("\n");

const MOTION_ROWS = (): string =>
  [
    ...Object.entries(MOTION.duration).map(
      ([k, v]) => `| \`motion.duration.${k}\` | ${v}ms |`,
    ),
    ...Object.entries(MOTION.easing).map(
      ([k, v]) => `| \`motion.easing.${k}\` | \`${v}\` |`,
    ),
  ].join("\n");

export function buildTokensDoc(banner: readonly string[]): string {
  return `<!--
  ${banner[0]}
  ${banner[1]}
  ${banner[2]}
-->

# Mjölnir — design tokens

The generated reference. The source is
[\`src/brand/tokens.ts\`](../../src/brand/tokens.ts); the machine surface
is [\`assets/brand/tokens.json\`](../../assets/brand/tokens.json). What the
tokens MEAN, and the rules that govern using them, is
[\`BRAND-SYSTEM.md\`](BRAND-SYSTEM.md).

Regenerate with \`npm run brand:tokens\`.

## Colour

${COLOUR_SECTIONS()}
## Typography

| Role | Family | Weights |
| --- | --- | --- |
| display | ${TYPOGRAPHY.display.family} | ${TYPOGRAPHY.display.weights.join(", ")} |
| sans | ${TYPOGRAPHY.sans.family} | ${TYPOGRAPHY.sans.weights.join(", ")} |
| mono | ${TYPOGRAPHY.mono.family} | ${TYPOGRAPHY.mono.weights.join(", ")} |
| runes (fallback) | ${TYPOGRAPHY.runes.family} | — |

Body line-height ${TYPOGRAPHY.lineHeight.body}; display tracking
${TYPOGRAPHY.display.letterSpacing.tight}–${TYPOGRAPHY.display.letterSpacing.widest}.

## Motion

| Token | Value |
| --- | --- |
${MOTION_ROWS()}

See [\`MOTION-SYSTEM.md\`](MOTION-SYSTEM.md) for when each is used, and for
the rule that every one of them is inert under
\`prefers-reduced-motion: reduce\`.
`;
}
