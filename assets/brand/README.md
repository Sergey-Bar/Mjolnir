# Mjölnir — brand assets

Every file here is rendered, not drawn by hand. This file is about the
FILES; the system that uses them lives in
[`docs/design/`](../../docs/design/BRAND-SYSTEM.md).

| For                                            | Read                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| colour, typography, symbols, the rules         | [`BRAND-SYSTEM.md`](../../docs/design/BRAND-SYSTEM.md)                       |
| every token value                              | [`DESIGN-TOKENS.md`](../../docs/design/DESIGN-TOKENS.md) — generated         |
| what each surface consumes and who enforces it | [`BRAND-SURFACE-INVENTORY.md`](../../docs/design/BRAND-SURFACE-INVENTORY.md) |
| motion                                         | [`MOTION-SYSTEM.md`](../../docs/design/MOTION-SYSTEM.md)                     |
| voice                                          | [`VOICE-AND-TERMINOLOGY.md`](../../docs/design/VOICE-AND-TERMINOLOGY.md)     |

The **logo is the source of truth** for the visual system, and the values
derived from it are the token module, not this page.

## Assets

Every file below is rendered by
[`scripts/generate-brand-marks.ts`](../../scripts/generate-brand-marks.ts)
(`npm run brand:marks`) from two vector sources — the Cinzel wordmark and
the Mansaz rune — each shot at its own native pixel size, not resized
from a larger bitmap. `masters` in `marks.lock.json` names the two large
reference renders below; everything else is a real surface's own size.

| File                                                                        | Rendered as                                   | Use                                                                     |
| --------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| [`logo.png`](logo.png)                                                      | wordmark, 1800×504                            | full lockup — `MJÖLNIR` alone. Reference master.                        |
| [`../readme/logo.png`](../readme/logo.png) · [`.webp`](../readme/logo.webp) | wordmark, 1000×280                            | README header and website hero.                                         |
| [`mark.png`](mark.png)                                                      | monogram, 1235×1235                           | the rune alone — app / package / social icon source. Reference master.  |
| [`icon.png`](icon.png)                                                      | monogram, 512×512                             | npm, GitHub social preview, tooling. Recognisable without the wordmark. |
| `site/public/favicon-32.png` · `favicon-16.png`                             | monogram, native 32 / 16 px                   | browser tab icon.                                                       |
| `site/public/apple-touch-icon.png` · `mark-64.png`                          | monogram, native 180 / 64 px                  | iOS home screen, site nav mark.                                         |
| `site/public/social-card.jpg`                                               | wordmark centered on `--mj-ink-950`, 1200×630 | link previews (og:image / twitter:image).                               |

Rendering each size natively, rather than downscaling one raster, is
deliberate: a hammer illustration shrunk to 16px loses detail it cannot
regain, but a vector wordmark and a single rune stay legible at any size
because each one is its own render, not a resample of a bigger file.

## The motif

`MJÖLNIR` set in Cinzel 600 — the display typeface this system already
uses everywhere else (`TYPOGRAPHY.display`), tracked out. No
illustration: the wordmark IS the logo.

The square/tiny contexts a wordmark cannot survive (favicons, the
npm/social icon) fall back to a single rune — ᛗ, Mansaz — set in the
same vendored FreeMono face the terminal reporter already uses for Runic
coverage. It is not a new choice: it is already the "M" of MJÖLNIR in
the hero runefield's own Elder Futhark spelling of the product's name
(ᛗ ᛃ ᛟ ᛚ ᚾ ᛁ ᚱ — see [`BRAND-SYSTEM.md`](../../docs/design/BRAND-SYSTEM.md)).
It is deliberately not one of the five runes `RUNES` in
[`score-state.ts`](../../src/reporter/score-state.ts) places beside an
actual verdict (ᚲ ᚦ ᛏ ᛟ ᛁ) — the permanent brand mark must never look
like a standing verdict ("this product is always FORGED"). ᛗ appears
elsewhere only as ambient four-rune flourish decoration in
[`art.ts`](../../src/reporter/art.ts), never as a single-glyph state
indicator, so it carries no score meaning on its own.

Use one mark, calmly. Do not add ornament, illustration, or additional
Norse motifs to either mark in product surfaces.

## Colour and type

Not restated here. They are generated from
[`src/brand/tokens.ts`](../../src/brand/tokens.ts) into
[`DESIGN-TOKENS.md`](../../docs/design/DESIGN-TOKENS.md), and the rules
that govern them are in
[`BRAND-SYSTEM.md`](../../docs/design/BRAND-SYSTEM.md).

This page used to hold both. Every one of its twelve palette rows had
drifted from what the code shipped — the gold by dE 8.2, well past what
a designer would notice — and its verdict table documented a light ramp
for a product that is dark-only everywhere. A hand-written table of
values is a promise nobody keeps; `brand-doctor` rule 5 now fails on any
value stated in a design document that the source does not hold.

## Usage rules

- Clear space around the wordmark ≥ the cap-height of the letters.
- Place either mark on `--mj-ink-900` or darker; both are rendered on
  that ground already and are not designed to sit on white.
- Never recolour either mark, and never re-set the wordmark in a
  different typeface or weight than Cinzel 600.
- Below the wordmark's minimum legible width (~180 px), use the
  monogram alone.
- No illustration, bolts, or additional Norse ornaments anywhere in
  product surfaces (site, README, terminal, reports) — the aurora, forge
  glow and ordered runefield in generated hero art are the only hero
  atmosphere, and the terminal state runes are functional (non-colour
  state communication), not decoration.
- The terminal NORSE palette names (`trusted`, `forged`, …) are internal
  token names for the ScoreState bands, not user-facing Norse theming.
