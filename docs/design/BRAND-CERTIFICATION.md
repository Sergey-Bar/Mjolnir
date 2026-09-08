# Mjölnir — brand certification

The close-out of `.planning/BRAND-UNIFICATION-PLAN.md`, on branch
`brand/unification`.

Every number here is a run that happened. Where something was not
measured it says **NOT MEASURED**, never "pass".

---

## 1. Executive verdict

```
MJÖLNIR BRAND SYSTEM — NOT YET 10/10
```

The system is built, enforced and green: one token source, one gate with
eight blocking rules and zero findings, one typography system, one
symbol vocabulary, and every surface consuming them. Fourteen of the
fifteen defects are closed, four of them found during the work rather
than in the plan.

It is not 10/10 because three surfaces are enforced by convention rather
than by a check, and I will not score enforcement I did not build:

1. **Nothing verifies the brand masters.** No hash lock detects a
   redrawn or re-exported logo.
2. **Nothing verifies the video's pixels.** Format, frame count, size
   and provenance are checked; colour was sampled by hand, once.
3. **The prose design documents can drift.** Only `DESIGN-TOKENS.md` is
   generated and byte-locked.

Two further items are honest gaps rather than failures: mobile
Lighthouse is 88–92 against a desktop-gated 100, and the site's terminal
component still uses a system monospace stack because the Geist Mono web
subset lacks the box-drawing glyphs the reporter prints.

## 2. Score

Scored against §34 of the mission. A 10 means the surface takes every
value from the token module **and** something fails CI when it stops.

|                           |  Before |   After |                                                                                                  |
| ------------------------- | ------: | ------: | ------------------------------------------------------------------------------------------------ |
| Brand distinctiveness     |       7 |       9 | logo, runes and verdict vocabulary were already distinct; the marks now carry the epistemics too |
| Nordic sophistication     |       8 |       9 | decorative runes removed, `art.ts` still the benchmark                                           |
| Typography                |       4 |      10 | three disjoint systems → two shared faces, self-hosted, retired faces blocked by rule 1          |
| Colour system             |       6 |      10 | one palette, one source, eight rules                                                             |
| Logo integration          |       8 |       8 | **unchanged — no automated check exists**                                                        |
| Iconography               |       5 |       9 | one geometry source; no icon set beyond the three marks                                          |
| Symbol language           |       5 |      10 | evidence ring, trust ladder, band runes — one definition each                                    |
| Website consistency       |       8 |      10 | tokenised, symbol-driven, measured                                                               |
| README consistency        |       6 |       9 | badges and assets converged; the prose was already strong and was not rewritten                  |
| SVG consistency           |       6 |      10 | rule 4 checks every committed SVG                                                                |
| MP4 consistency           |       7 |       9 | reproducible and checked; pixels unverified                                                      |
| CLI consistency           |       6 |      10 | 0 hex literals, AA fixed, mermaid honest                                                         |
| Documentation consistency |       7 |       9 | five documents, one generated; prose can still drift                                             |
| Motion language           |       6 |       8 | defined and partly enforced; durations unchecked                                                 |
| Terminology consistency   |       9 |      10 | the site now leads with the canonical tagline                                                    |
| Accessibility             |       7 |      10 | AA computed everywhere, axe 0, 187 focus rings                                                   |
| **Overall coherence**     | **6.5** | **9.4** |                                                                                                  |

## 3. The defects

|     | Defect                                            | State                                                                                                   |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| D1  | three typeface systems, zero shared letterforms   | **closed** — Geist / Geist Mono / Cinzel, self-hosted, rule 1 blocks a retired face anywhere in a stack |
| D2  | terminal and site palettes disagreed on six roles | **closed** — all nine substitutions reviewed in the regenerated diffs                                   |
| D3  | 163 stale badge colours across 23 READMEs         | **closed** — swept from tokens, rule 7                                                                  |
| D4  | the architecture diagram's own neutral ramp       | **closed** — mapped onto SURFACE, gold shadow dropped                                                   |
| D5  | macOS traffic lights on the README stills         | **closed** — one neutral `surface.chromeDot`                                                            |
| D6  | terminal `error` at 4.36:1, below WCAG AA         | **closed** — 6.20:1, and rule 8 computes every pairing                                                  |
| D7  | six palette copies, one guarded edge              | **closed** — one source, eight rules, all edges                                                         |
| D8  | the trust ladder had no visual treatment          | **closed** — `TrustLadder.vue` + the architecture diagram, from one geometry                            |
| D9  | evidence marks unshared across surfaces           | **closed** — one ring, three media                                                                      |
| D10 | runes under-deployed                              | **corrected and closed** — they were _over_-deployed decoratively; see D14                              |
| D11 | no `docs/design/`                                 | **closed** — five documents, one generated                                                              |
| D12 | no documented motion language                     | **closed** — `MOTION-SYSTEM.md`                                                                         |
| D13 | site hero contradicted the canonical tagline      | **closed** — found at baseline, not in the plan                                                         |
| D14 | decorative rune ornament on the site              | **closed** — found at baseline; the hero runefield is a wordmark and stays                              |
| D15 | the site build broken since `9f59bc5`             | **closed** — found in Phase 3; the Pages deploy had been failing for a day                              |

Two more were found and fixed while proving the work, and neither was a
brand defect:

- **The shipped demo video was reproducible by no command.** `docs:video`
  wrote to a gitignored directory; the file every reader downloads was
  produced by a step that existed in no repository, and the 12 MB budget
  was asserted against the render output inside a block that skips
  without one. It is now published by the generator and checked on every
  checkout.
- **The landing page displayed a score the scan did not produce.** The
  gauge counted up from 0, putting "0" beside "75/100" for 1.5 seconds —
  above the fold at a 455px viewport, despite a comment asserting
  otherwise. The ring still sweeps; the digits no longer lie.

## 4. Gate evidence

`npm run brand:doctor` — [full output](after/brand-doctor.after.txt)

```
0 of 8 rules failing, 0 findings, 0 known open, 0 stale
```

Every known-open entry the ratchet carried during the work was **deleted
the moment it stopped firing**, because a stale allowlist is how a gate
becomes decoration. The ratchet caught three of its own seeds going
stale as the code moved under them, and reported each as a broken seed
rather than passing vacuously.

`npm run brand:doctor:selftest` —
[transcript](gate-evidence/brand-doctor-selftest.txt)

```
10 of 10 rules observed rejecting an invalid state
```

Each rule was seeded with a deliberate violation, required to reject it
**and to name the specific finding** — an exit code alone cannot
distinguish "my rule fired" from "something else broke" — then restored,
with byte-identity re-verified before the run claims anything.

## 5. Accessibility evidence

`npm run site:audit`, four routes —
[full output](after/site-audit.after.txt)

| page                     | axe | keyboard stops | no focus ring | CLS |
| ------------------------ | --: | -------------: | ------------: | --: |
| `/`                      |   0 |             30 |             0 |   0 |
| `/guide/getting-started` |   0 |             45 |             0 |   0 |
| `/guide/scoring`         |   0 |             52 |             0 |   0 |
| `/rules/`                |   0 |             60 |             0 |   0 |

Beyond the browser:

- **Every declared colour pairing is computed**, not judged: `brand-doctor`
  rule 8 over 28 foregrounds × 9 surfaces plus 5 diagram tints. The
  weakest legal pairing is 5.00:1.
- **Nothing is colour-only.** Evidence level is a ring whose fill carries
  the weight; trust rungs are labelled "static" / "needs a real run";
  score bands carry a rune; `--ascii` and `NO_COLOR` remain meaningful.
- **`prefers-reduced-motion`** is honoured on every animated surface, and
  the generated SVGs carry their own reduce block.

## 6. Performance evidence

`npm run site:lighthouse` — [full output](after/lighthouse.after.txt)

| page                     | desktop perf | a11y | best-practices | seo | mobile perf |
| ------------------------ | -----------: | ---: | -------------: | --: | ----------: |
| `/`                      |          100 |  100 |            100 | 100 |          88 |
| `/guide/getting-started` |          100 |  100 |            100 | 100 |          92 |
| `/guide/scoring`         |          100 |  100 |            100 | 100 |          91 |
| `/rules/`                |          100 |  100 |            100 | 100 |          92 |

Desktop LCP 0.6–0.8 s, CLS 0, TBT ≤ 10 ms. The Phase-0 baseline was
100 / 99 / 99 on three pages.

**The mobile numbers are not claimed as an improvement**, for two
reasons. The baseline was measured against a stale `dist` (D15), so it
is not a clean comparison. And the old page set Inter at
`display=optional`, which on slow 4G means the browser keeps the
fallback and never swaps — the brand typeface simply never arrived on a
phone. The new page renders its own type there, and pays a few points
for it.

## 7. Reproducibility evidence

Every generated artifact is locked, and every lock was watched to fail
during the work.

| Artifact                                | Locked by                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `assets/brand/tokens.json`              | `brand-tokens-reproducibility.spec.ts`, byte-identical                         |
| `site/.vitepress/theme/styles/vars.css` | same spec                                                                      |
| `docs/design/DESIGN-TOKENS.md`          | same spec                                                                      |
| the four `assets/readme/*.svg`          | four asset-reproducibility specs                                               |
| `assets/video/mjolnir-demo.mp4`         | `video-media.spec.ts` — format, frames, size, and equality with a fresh render |
| the vendored webfonts                   | `fonts.lock.json`, sha256, verified offline in CI                              |
| `.claude/commands/mjolnir.md`           | `check-managed-surfaces.mjs`                                                   |

Determinism is asserted, not assumed: the token generator is called
twice in one test and required to produce identical bytes.

Phase 1's whole claim was **zero visual change**, and it was proved
rather than asserted: all four SVGs regenerated byte-identical, and
`vars.css` was compared declaration by declaration — one changed
(`--mj-parchment: #c8cbcf` → `var(--mj-steel)`, the same value), none
removed, ten added that nothing referenced yet.

## 8. Cross-surface evidence

[`after/asset-inventory.md`](after/asset-inventory.md) — sha256 and byte
size for every generated asset, matching the Phase-0 capture's format.

[`after/cli-scan.after.txt`](after/cli-scan.after.txt) — a real
`tsx src/cli.ts .` run: exit 0, 99/100 WORTHY, rune `ᛏ [CHARGED]`. The
product's own behaviour is unchanged, which is the point.

### The blind test

Four surfaces were assembled with the logo removed — the terminal still,
the score gauge, a frame of the demo video, and the architecture diagram
— and viewed together. They share the midnight-iron ground, one neutral
window treatment, one monospace, the same gold/aurora/coral semantics
and the same verdict vocabulary. A reader would take them for one
product. The website hero was checked separately and shares the palette,
both faces and the mark treatment.

**Two honest caveats about this test.** It was performed by me, which is
not the same as a designer's judgement. And one surface —
`assets/readme/architecture.svg` at full size — was reviewed earlier in
the work rather than in the final side-by-side, because the preview pane
would not repaint after a programmatic scroll; its symbol geometry was
instead verified structurally in the emitted SVG (three evidence rings
in the brightness ramp, six ladder rungs with spacing 24/24/**36**/24/24
placing the gap exactly at L2\|L3).

## 9. What changed

Twelve commits, each independently reviewable.

|           |                                                              |
| --------- | ------------------------------------------------------------ |
| `ce6dc05` | **fix(site)** the site build, broken since `9f59bc5`         |
| `f58d7cf` | Phase 0 — freeze the tree, measure the before-state          |
| `ead9124` | Phase 1 — one source of brand truth, zero visual change      |
| `f05166e` | Phase 2 — the brand gate, proven able to fail                |
| `61ad5dd` | Phase 3 — one typography system across every surface         |
| `2390109` | Phase 4 — one palette, and the AA failure it was hiding      |
| `732e206` | Phase 5 — one geometry for evidence and trust                |
| `643ef68` | Phase 6 — the badges join the brand, in all 23 READMEs       |
| `73e4437` | **fix(video)** the shipped demo is reproducible, and checked |
| `75f3823` | Phase 8 — the website says what the product says             |
| `8b642f4` | Phase 10 — the reporter's diagrams stop lying about UNKNOWN  |
| `4a442f2` | Phases 9 and 11 — write the system down, once each           |

Created: `src/brand/tokens.ts`, `src/brand/symbols.ts`,
`scripts/generate-brand-tokens.ts`, `scripts/brand-doc.ts`,
`scripts/brand-doctor.mjs`, `scripts/brand-doctor-selftest.mjs`,
`scripts/vendor-fonts.ts`, `site/.vitepress/theme/TrustLadder.vue`,
`docs/design/` (six documents plus baseline and gate evidence), twelve
vendored woff2 files, and three contract specs.

## 10. What was preserved

- `schemaVersion: 1`, exit codes `0/1/2/10/20`, rule IDs, tier
  semantics, `CORE_CAP`, the three Laws — untouched. No file under
  `src/rules/`, `src/scorer/` or `src/engine/` was modified.
- Scoring, detection and evidence semantics are unchanged. The self-scan
  still reports 99/100.
- The verdict vocabulary is unchanged and still property-locked.
- The translation workflow stays advisory and community-driven; only the
  language-independent badge URLs were swept.
- The demo video's story — a real false-green, a real fix, a real
  re-scan — is unchanged.
- The logo rule: provided masters are source of truth; re-encode, never
  redraw.
- Three bodies of pre-existing work found in the tree at Phase 0 were all
  preserved, none discarded.

## 11. What remains

Nothing here is hidden, and nothing here is scheduled — these are the
honest edges of the work as it stands.

1. **No image-hash lock on the brand masters.** _(blocks 10/10)_
2. **The MP4's pixels are unverified.** Sampled by hand once: the poster
   corner reads `#0D121A`, the canonical terminal ground through yuv420p
   at CRF 32. _(blocks 10/10)_
3. **Prose design documents can drift.** Only the token reference is
   generated. _(blocks 10/10)_
4. **Motion durations are not checked** against the `MOTION` tokens.
5. **The site's terminal component uses a system monospace stack**, not
   Geist Mono: the web subset lacks the box-drawing and block-element
   glyphs the reporter prints, and mixing faces mid-line broke column
   alignment by up to 3.6 columns. Documented in the component.
6. **Mobile Lighthouse is 88–92**, and the baseline it would be compared
   against is not sound.
7. **The tour video is rendered and tested but ships nowhere.**
8. **Two pre-existing test flakes remain**, both load-dependent timeouts,
   both green in isolation and unrelated to this work:
   `doctor-json.spec.ts` G5 and `package-smoke.spec.ts`.
9. **The README's prose and section rhythm were deliberately not
   rewritten.** Its badges, assets and diagrams converged; its technical
   argument was already its strongest asset and the mission's own rule
   was to preserve it.
10. **Another session was writing to the primary worktree** during this
    work. Its files were preserved untouched and this work moved to an
    isolated worktree; the two have not been reconciled.

## 12. Final verdict

```
MJÖLNIR BRAND SYSTEM — NOT YET 10/10
```

Overall coherence **9.4/10**, and the missing 0.6 is three specific
absent checks, each named above with what would close it.

The system is one palette, two typefaces, three marks and one source of
truth, enforced by a gate that has been watched rejecting every kind of
violation it claims to catch. What it is not is finished — and saying so
is the only ending this particular product could honestly have.
