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

| Surface                  | Source of its values                                                    | Enforced by                                                | Before | After |
| ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------- | -----: | ----: |
| **Logo / mark**          | `assets/brand/{logo,mark,icon}.png` — provided masters, re-encoded only | usage rules in `BRAND-SYSTEM.md`; no automated check       |      8 |     8 |
| **Terminal (reporter)**  | `src/brand/tokens.ts` via `theme.ts`                                    | `brand:doctor` rule 2 — 0 hex literals allowed             |      6 |    10 |
| **README SVG assets**    | tokens via `readme-svg.ts` + the four generators                        | rules 3 + 4, and four byte-identical reproducibility specs |      6 |    10 |
| **Architecture diagram** | tokens + `symbols.ts`                                                   | rules 4 + 6, `architecture-asset-reproducibility.spec.ts`  |      5 |    10 |
| **Demo MP4 + poster**    | tokens via `video/terminal-page.ts`; timing from `pacing.ts`            | `video-media.spec.ts` — now checks the **committed** file  |      7 |     9 |
| **Website**              | generated `vars.css` + `symbols.ts`                                     | rules 1 + 6, `site:doctor` 8 checks, axe, Lighthouse       |      8 |    10 |
| **Badges (23 READMEs)**  | `BADGE` tokens                                                          | rule 7, across every README file                           |      3 |    10 |
| **Documentation**        | this directory; `docs/TERMINOLOGY.md` for meanings                      | rule 5, `docs-consistency.spec.ts`, `link-integrity`       |      7 |     9 |
| **Badge (generated)**    | `BADGE_BAND` tokens                                                     | rule 7, plus a seeded revert to a shields named colour     |      2 |    10 |
| **Mermaid output**       | `TINT` tokens                                                           | rules 6 + 8 (text AA + stroke 3:1)                         |      4 |    10 |

Three surfaces are not 10, and the reasons are specific:

- **Logo / mark, 8.** Nothing mechanically checks that the committed
  masters are unmodified or that a surface has not redrawn the hammer.
  The rule is written down and observed; it is not executable. An image
  hash lock would close it.
- **MP4, 9.** The render is reproducible and the shipped artifact is
  checked, but nothing verifies its _pixels_ carry the brand palette —
  the poster corner was sampled by hand once (`#0D121A`, the canonical
  ground through yuv420p). A frame-sampling assertion would close it.
- **Documentation, 9.** `DESIGN-TOKENS.md` is generated and locked;
  these prose files are not, and cannot fully be.

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

`npm run brand:doctor` — eight blocking rules, zero findings, zero
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

`npm run brand:doctor:selftest` seeds a violation of each and requires
rejection: **11 of 11 observed failing**, transcript at
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

1. **No image-hash lock on the brand masters.** Nothing detects a
   redrawn or re-exported logo.
2. **The MP4's pixels are unverified.** Format, size, frame count and
   provenance are checked; colour is not.
3. **`assets/video/script.tour.json` renders a tour video that ships
   nowhere.** It is captured, tested and rendered as a CI artifact only.
4. **Motion is defined but only partly enforced.** `site:doctor` caps
   infinite animations and requires reduced-motion coverage; nothing
   checks a duration against the `MOTION` tokens.
5. **The prose design documents can drift.** Only `DESIGN-TOKENS.md` is
   generated and byte-locked.
6. **Translated READMEs share only their badges.** Their prose is
   community-maintained and advisory by design; structural drift is
   reported by `npm run docs:translations`, never gated.
