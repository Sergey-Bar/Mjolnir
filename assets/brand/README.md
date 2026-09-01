# Mjölnir — Brand System

The single visual identity for Mjölnir. The **logo is the source of truth**;
the website ([`site/`](../../site)) and the README render the same system —
same mark, same palette, same type, same verdict colours.

## Assets

| File                                                                        | Source                                 | Use                                                                              |
| --------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| [`logo.png`](logo.png)                                                      | provided master (≈1800 px)             | full lockup — hammer + `MJÖLNIR` + `VERIFICATION TRUST ENGINE`. Archival master. |
| [`../readme/logo.png`](../readme/logo.png) · [`.webp`](../readme/logo.webp) | downscaled to 1000 px                  | README header and website hero.                                                  |
| [`mark.png`](mark.png)                                                      | provided master (1235 px, transparent) | the hammer alone — app / package / social icon source.                           |
| [`icon.png`](icon.png)                                                      | downscaled from `mark.png` (512 px)    | npm, GitHub social preview, tooling. Recognisable without the wordmark.          |
| `site/public/favicon-32.png` · `favicon-16.png`                             | downscaled from `mark.png`             | browser tab icon.                                                                |
| `site/public/apple-touch-icon.png`                                          | 180 px                                 | iOS home screen, site nav mark.                                                  |
| `site/public/social-card.png`                                               | 1200×630, `logo.png` on `--mj-ink-950` | link previews (og:image / twitter:image).                                        |

The downscaled set is produced from the two masters by simple canvas
resize (`ctx.drawImage`) at the target width, keeping the aspect ratio —
16 / 32 / 180 / 512 px from `mark.png`, 1000 px from `logo.png`.

## The motif

A Norse war-hammer seen head-on: a peaked, tiered steel head engraved with
Vegvísir knotwork, a gold-scroll collar, a wrapped haft with three gold
studs, and an openwork gold foot ending in a diamond pommel. An aurora and
gold lightning frame it in the full lockup.

Use one mark, calmly. Do not add extra hammers, bolts or knotwork.

## Colour system

Derived from the logo: brushed steel, forge gold, aurora over midnight.
Tokens live in [`site/.vitepress/theme/styles/vars.css`](../../site/.vitepress/theme/styles/vars.css).

| Token                | Light     | Dark | Role                                          |
| -------------------- | --------- | ---- | --------------------------------------------- |
| `--mj-ink-950`       | `#080B12` | —    | deepest background (hero)                     |
| `--mj-ink-900`       | `#0B0F17` | —    | app / page background (dark)                  |
| `--mj-ink-850`       | `#0F1420` | —    | surface                                       |
| `--mj-ink-800`       | `#141B2B` | —    | raised surface                                |
| `--mj-steel`         | `#C6CCD6` | —    | neutral bright — hammer head, headings on ink |
| `--mj-steel-dim`     | `#8A93A0` | —    | muted text on ink                             |
| `--mj-gold`          | `#C9A227` | —    | **primary brand**                             |
| `--mj-gold-bright`   | `#E0B443` | —    | primary brand on dark — accents, focus        |
| `--mj-gold-hot`      | `#F2D488` | —    | highlight, hover                              |
| `--mj-aurora`        | `#2FB8A6` | —    | secondary — verification energy               |
| `--mj-aurora-bright` | `#37D4C6` | —    | secondary on dark                             |
| `--mj-aurora-cyan`   | `#56C7E8` | —    | informational state                           |

### Semantic — status & verdict

Score colors follow the ScoreState model (`src/reporter/score-state.ts`) —
one mapping, every surface. Bands: critical 0–49, warning 50–79,
trusted 80–99, forged 100.

| Verdict                | Token                             | Light                        | Dark                         |
| ---------------------- | --------------------------------- | ---------------------------- | ---------------------------- |
| `UNWORTHY` / critical  | `--mj-unworthy` / `--mj-critical` | `#C13B37`                    | `#E5544E`                    |
| `NEEDS WORK` / warning | `--mj-needswork` / `--mj-warning` | `#A5811C`                    | `#E6BD57`                    |
| `WORTHY` / trusted     | `--mj-trusted`                    | `#2596A8`                    | `#5CC4E0`                    |
| `FORGED` (score 100)   | `--mj-forged`                     | gradient `#8A6D1E → #A5811C` | gradient `#F4DC9C → #E6BD57` |
| informational          | `--mj-info`                       | `#2B7FA8`                    | `#5CC4E8`                    |

The terminal NORSE palette mirrors the same bands: `trusted: #5CC4E0`,
`forged: #F4DC9C`.

**Green is no longer a score color.** `WORTHY` scores render in
aurora-cyan (trusted); Yggdrasil green (`ok`) survives only for non-score
success contexts (e.g. "autofix applied", "analysis complete"). The same
verdict colours drive the website gauge, the README badges and the
rule-catalog severity chips. The shields.io badge maps the bands to the
closest named colors (`red` / `yellow` / `important` / `success`) — the
badge is peripheral, ScoreState remains the truth.

## Typography

| Face                         | Use                              | Fallback                     |
| ---------------------------- | -------------------------------- | ---------------------------- |
| **Cinzel** (600/700)         | display headings, runic accents  | `Trajan Pro, Georgia, serif` |
| **Inter** (400–700)          | body, UI                         | `system-ui, sans-serif`      |
| **JetBrains Mono** (400/500) | code, commands, rule IDs, scores | `ui-monospace, monospace`    |

Display type is title-case or all-caps with `letter-spacing: 0.04–0.32em`;
body stays at `line-height: 1.7`. Never set body copy in the display face.

**Score typography rules:**

- Scores are **always JetBrains Mono** — the digits never appear in the
  display face.
- Verdict labels (`UNWORTHY / NEEDS WORK / WORTHY / FORGED`) are
  display-face caps with `letter-spacing ≥ 0.18em`, colored by band.
- Restraint: the score digits carry no color; color lands on the verdict
  word and the instrument (gauge/hammer) only.

## Usage rules

- Clear space around the lockup ≥ the height of the hammer head.
- Place the mark on `--mj-ink-900` or darker, or on white. Never recolour it.
- Minimum lockup width ≈ 180 px; below that use the hammer mark alone.
