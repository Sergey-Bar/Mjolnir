# Mjölnir — brand surface inventory

Every surface that shows a human a colour, a typeface or a mark: what
it is, where its values come from, and what stops it drifting.

The scores are honest, not generous. A 10 means the surface takes every
value from the token module **and** something fails CI when it stops.

Measured at `brand/unification`. The outcome, with every measurement and
every remaining gap, is
[`BRAND-CERTIFICATION.md`](BRAND-CERTIFICATION.md).

---

## The surfaces

| Surface                  | Source of its values                                          | Enforced by                                                | Before | After |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------- | -----: | ----: |
| **Logo / mark**          | `generate-brand-marks.ts` — Cinzel wordmark + ᛗ rune monogram | **rule 9** — sha256 on 2 masters + 9 derived files         |      8 |    10 |
| **Terminal (reporter)**  | `src/brand/tokens.ts` via `theme.ts`                          | `brand:doctor` rule 2 — 0 hex literals allowed             |      6 |    10 |
| **README SVG assets**    | tokens via `readme-svg.ts` + the four generators              | rules 3 + 4, and four byte-identical reproducibility specs |      6 |    10 |
| **Architecture diagram** | tokens + `symbols.ts`                                         | rules 4 + 6, `architecture-asset-reproducibility.spec.ts`  |      5 |    10 |
| **Demo MP4 + poster**    | tokens via `video/terminal-page.ts`; timing from `pacing.ts`  | `video-media.spec.ts` + `video-pixels.spec.ts` (pure Node) |      7 |    10 |
| **Website**              | generated `vars.css` + `symbols.ts`                           | rules 1 + 6, `site:doctor` 8 checks, axe, Lighthouse       |      8 |    10 |
| **Badges (23 READMEs)**  | `BADGE` tokens                                                | rule 7, across every README file                           |      3 |    10 |
| **Documentation**        | this directory; `docs/TERMINOLOGY.md` for meanings            | rule 5, `docs-consistency.spec.ts`, `link-integrity`       |      7 |     9 |
| **Badge (generated)**    | `BADGE_BAND` tokens                                           | rule 7, plus a seeded revert to a shields named colour     |      2 |    10 |
| **Mermaid output**       | `TINT` tokens                                                 | rules 6 + 8 (text AA + stroke 3:1)                         |      4 |    10 |

One surface is not 10:

- **Documentation, 9.** `DESIGN-TOKENS.md` is generated and byte-locked,
  and rule 5 checks that every colour these prose files state is a value
  the source holds. What no check can reach is a sentence that is simply
  out of date. This one is not closable, and pretending otherwise would
  be the failure the rest of the document is about.

The two that were open here are now closed, and both were closed by
building the check rather than by re-reading the surface:

- **Logo / mark, 8 → 10.** Rule 9 pins all eleven rendered marks by
  sha256, whether the source is a hand-provided master (the original
  hammer illustration) or, since the wordmark rework, a generator run
  (`generate-brand-marks.ts`). Either way a regenerated file with
  different bytes is still a change to what a reader sees, and the lock
  makes it arrive as a decision instead of a diff nobody opens.
  `npm run brand:marks:update` is how you say yes.
- **MP4, 9 → 10.** `video-pixels.spec.ts` decodes the poster's first
  scanline in pure Node — zlib is built in, and row 0 needs no other row
  — and measures its ground. It is 3.32 from `SURFACE.terminal` and
  19.03 from the ground it replaced, against a tolerance of 12: wide
  enough for yuv420p at CRF 32, far too narrow for a different colour.
  No ffmpeg, so unlike the format contract beside it, it runs on every
  checkout rather than only on the machine that just rendered.

## What each surface consumes

```
src/brand/tokens.ts ───┬─→ theme.ts ──────────────→ terminal
   (+ symbols.ts)      ├─→ readme-svg.ts ─────────→ hero / demo / gauge SVG
                       ├─→ generate-readme-architecture.ts → architecture SVG
                       ├─→ video/terminal-page.ts ─→ MP4 + poster
                       ├─→ mermaid.ts ────────────→ --format mermaid
                       └─→ npm run brand:tokens ──┬→ assets/brand/tokens.json
                                                  ├→ site vars.css → website
                                                  └→ docs/design/DESIGN-TOKENS.md
```

Fonts follow the same shape: vendored once, sha256-locked, embedded into
the SVGs and the video as base64 and served same-origin to the site.

## The gate

`npm run brand:doctor` — nine blocking rules, zero findings, zero
known-open, zero stale.

| #   | Rule                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------- |
| 1   | every `--mj-*` in `vars.css` equals the token module, and no retired typeface appears in any stack    |
| 2   | the terminal palette equals the token module; no hex literals                                         |
| 3   | SVG and video chrome equal the token module                                                           |
| 4   | the generators, and every committed `assets/readme/*.svg`, carry only token colours                   |
| 5   | every colour a hand-written design document states is a value the source holds                        |
| 6   | no unapproved hex outside the token module, across `src/reporter/**`, `scripts/**` and the site theme |
| 7   | badges in all 23 READMEs **and** the one the product generates use only token values                  |
| 8   | every declared pairing meets WCAG AA, computed — plus the diagram tints' text and stroke              |
| 9   | the two brand masters and the nine files derived from them are byte-for-byte what they were           |

`npm run brand:doctor:selftest` seeds a violation of each and requires
rejection: **12 of 12 observed failing**, transcript at
[`gate-evidence/brand-doctor-selftest.txt`](gate-evidence/brand-doctor-selftest.txt).

`site:doctor` Check 8 delegates to rule 5 rather than keeping a second
copy — the duplication it would otherwise be is the exact defect the
gate exists to prevent.

Two CI surfaces are deliberately absent from this table:
`src/commands/pr-comment.ts` renders Markdown, which carries no colour,
and `src/reporter/github.ts` emits workflow annotations whose colour
GitHub owns. Both were reviewed for vocabulary; neither has a palette to
enforce.

## Known remaining gaps

Listed because they are real, not because they are comfortable.

1. **`assets/video/script.tour.json` renders a tour video that ships
   nowhere.** It is captured, tested and rendered as a CI artifact only.
2. **Motion is defined but only partly enforced.** `site:doctor` caps
   infinite animations and requires reduced-motion coverage; nothing
   checks a duration against the `MOTION` tokens.
3. **The prose design documents can drift.** Only `DESIGN-TOKENS.md` is
   generated and byte-locked.
4. **Translated READMEs share only their badges.** Their prose is
   community-maintained and advisory by design; structural drift is
   reported by `npm run docs:translations`, never gated.
