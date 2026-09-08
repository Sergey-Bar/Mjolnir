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

## Colour system

Derived from the logo: brushed steel, forge gold, aurora over midnight.
Tokens live in [`site/.vitepress/theme/styles/vars.css`](../../site/.vitepress/theme/styles/vars.css).

| Token                | Light     | Dark | Role                                          |
| -------------------- | --------- | ---- | --------------------------------------------- |
| `--mj-ink-950`       | `#0A1119` | —    | deepest background (hero)                     |
| `--mj-ink-900`       | `#0C1420` | —    | app / page background (dark)                  |
| `--mj-ink-850`       | `#111A29` | —    | surface                                       |
| `--mj-ink-800`       | `#18243A` | —    | raised surface                                |
| `--mj-steel`         | `#C8CBCF` | —    | neutral bright — hammer head, headings on ink |
| `--mj-steel-dim`     | `#8B939D` | —    | muted text on ink                             |
| `--mj-gold`          | `#C19A34` | —    | **primary brand**                             |
| `--mj-gold-bright`   | `#E6BD57` | —    | primary brand on dark — accents, focus        |
| `--mj-gold-hot`      | `#F4DC9C` | —    | highlight, hover                              |
| `--mj-aurora`        | `#37ABBD` | —    | secondary — verification energy               |
| `--mj-aurora-bright` | `#45C1D4` | —    | secondary on dark                             |
| `--mj-aurora-cyan`   | `#5CBDE0` | —    | informational state                           |

### Semantic — status & verdict

Score colors follow the ScoreState model (`src/reporter/score-state.ts`) —
one mapping, every surface. Bands: critical 0–49, warning 50–79,
trusted 80–99, forged 100.

There is one column, not two. The site is dark-only (`config.mts`
`appearance: "force-dark"`), the terminal is dark, and the README assets
are dark — so a light ramp would be a documented palette nothing ships.
This table previously carried one, and its dark column had drifted too:
it named `#E5544E` for `UNWORTHY` and `#5CC4E8` for informational where
the code shipped `#EC6B66` and `#5CC4E0`. `brand-doctor` rule 5 now
parses these rows, which is why it can no longer happen quietly.

| Verdict                | Token                             | Shipped                      |
| ---------------------- | --------------------------------- | ---------------------------- |
| `UNWORTHY` / critical  | `--mj-unworthy` / `--mj-critical` | `#EC6B66`                    |
| `NEEDS WORK` / warning | `--mj-needswork` / `--mj-warning` | `#E6BD57`                    |
| `WORTHY` / trusted     | `--mj-trusted`                    | `#5CC4E0`                    |
| `FORGED` (score 100)   | `--mj-forged`                     | gradient `#F4DC9C → #E6BD57` |
| informational          | `--mj-info`                       | `#5CC4E0`                    |
| unmeasured / `UNKNOWN` | `--mj-steel-dim`                  | `#8B939D`                    |

`UNKNOWN` is deliberately neutral, never red. It is a legitimate answer —
"this was not measured" is not "this is broken" — and colouring it as a
failure would be the same dishonesty as a CI gate reporting green
without having run.

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
- No lightning bolts and no additional Norse ornaments in product
  surfaces (site, README, terminal, reports). The master mark's own
  engraving is grandfathered; everything drawn in code stays calm —
  aurora, forge glow and the ordered runefield are the only hero
  atmosphere, and the terminal state runes are functional (non-color
  state communication), not decoration.
- The terminal NORSE palette names (`trusted`, `forged`, …) are internal
  token names for the ScoreState bands, not user-facing Norse theming.
