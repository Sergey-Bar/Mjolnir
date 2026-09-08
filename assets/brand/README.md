# Mjölnir — brand assets

The provided masters and everything downscaled from them. This file is
about the FILES; the system that uses them lives in
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

| File                                                                        | Source                                 | Use                                                                              |
| --------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| [`logo.png`](logo.png)                                                      | provided master (≈1800 px)             | full lockup — hammer + `MJÖLNIR` + `VERIFICATION TRUST ENGINE`. Archival master. |
| [`../readme/logo.png`](../readme/logo.png) · [`.webp`](../readme/logo.webp) | downscaled to 1000 px                  | README header and website hero.                                                  |
| [`mark.png`](mark.png)                                                      | provided master (1235 px, transparent) | the hammer alone — app / package / social icon source.                           |
| [`icon.png`](icon.png)                                                      | downscaled from `mark.png` (512 px)    | npm, GitHub social preview, tooling. Recognisable without the wordmark.          |
| `site/public/favicon-32.png` · `favicon-16.png`                             | downscaled from `mark.png`             | browser tab icon.                                                                |
| `site/public/apple-touch-icon.png`                                          | 180 px                                 | iOS home screen, site nav mark.                                                  |
| `site/public/social-card.jpg`                                               | 1200×630, `logo.png` on `--mj-ink-950` | link previews (og:image / twitter:image).                                        |

The downscaled set is produced from the two masters by simple canvas
resize (`ctx.drawImage`) at the target width, keeping the aspect ratio —
16 / 32 / 180 / 512 px from `mark.png`, 1000 px from `logo.png`.

## The motif

A Norse war-hammer seen head-on: a peaked, tiered steel head engraved with
Vegvísir knotwork, a gold-scroll collar, a wrapped haft with three gold
studs, and an openwork gold foot ending in a diamond pommel. An aurora
frames it in the full lockup.

Use one mark, calmly. Do not add extra hammers, bolts, lightning or
knotwork in product surfaces; the master mark's own engraving is
grandfathered.

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

- Clear space around the lockup ≥ the height of the hammer head.
- Place the mark on `--mj-ink-900` or darker, or on white. Never recolour it.
- Minimum lockup width ≈ 180 px; below that use the hammer mark alone.
- No lightning bolts and no additional Norse ornaments in product
  surfaces (site, README, terminal, reports). The master mark's own
  engraving is grandfathered; everything drawn in code stays calm —
  aurora, forge glow and the ordered runefield are the only hero
  atmosphere, and the terminal state runes are functional (non-color
  state communication), not decoration.
- The terminal NORSE palette names (`trusted`, `forged`, …) are internal
  token names for the ScoreState bands, not user-facing Norse theming.
