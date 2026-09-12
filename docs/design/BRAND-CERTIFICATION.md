# Mjölnir — brand certification

The close-out of the brand-unification work, on branch
`brand/unification`. The plan it executed is a local working document
under `.planning/`, which this repository does not track.

Every number here is a run that happened. Where something was not
measured it says **NOT MEASURED**, never "pass".

---

## 1. Executive verdict

```
MJÖLNIR BRAND SYSTEM — NOT YET 10/10
```

The system is built, enforced and green: one token source, one gate with
nine blocking rules and zero findings, one typography system, one symbol
vocabulary, and every surface consuming them. Sixteen of the sixteen
brand defects are closed, five of them found during the work rather than
in the plan.

The branch is on `origin/main` at **v1.0.2** — main released 1.0 (a
measurement-census milestone, no schema break) during review, and every
generated asset was re-verified byte-identical against it. PR #71 is
green on all 20 real checks; the one red is `security/snyk`, which fails
on main's own tip and which PR #70 was merged past — see §8c.

Two of the three things it was scored down for have since been built
rather than argued away:

- **The brand masters are pinned.** Rule 9 hashes the two provided
  masters and the nine files derived from them. Re-encoding is allowed
  and redrawing is not; a hash cannot tell them apart, which is the
  point — the change now arrives as a decision instead of a diff nobody
  opens.
- **The video's ground is measured.** `video-pixels.spec.ts` decodes the
  poster's first scanline in pure Node and finds it 3.32 from
  `SURFACE.terminal` and 19.03 from the ground it replaced, against a
  tolerance of 12. No ffmpeg, so it runs on every checkout — unlike the
  format contract beside it, which is right to skip and would have made
  a colour check meaningless.

**One remains, and I do not believe it is closable.** The prose design
documents can go out of date. `DESIGN-TOKENS.md` is generated and
byte-locked, and rule 5 checks that every colour these files state is a
value the source holds — but no check reaches a sentence that is merely
no longer true. Claiming 10/10 over that would be exactly the move this
product exists to refuse.

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
| Logo integration          |       8 |      10 | rule 9 — sha256 on 2 masters + 9 derived                                                         |
| Iconography               |       5 |       9 | one geometry source; no icon set beyond the three marks                                          |
| Symbol language           |       5 |      10 | evidence ring, trust ladder, band runes — one definition each                                    |
| Website consistency       |       8 |      10 | tokenised, symbol-driven, measured                                                               |
| README consistency        |       6 |       9 | badges and assets converged; the prose was already strong and was not rewritten                  |
| SVG consistency           |       6 |      10 | rule 4 checks every committed SVG                                                                |
| MP4 consistency           |       7 |      10 | reproducible, checked, and its ground measured in pure Node                                      |
| CLI consistency           |       6 |      10 | 0 hex literals, AA fixed, mermaid honest                                                         |
| Documentation consistency |       7 |       9 | five documents, one generated; prose can still drift                                             |
| Motion language           |       6 |       8 | defined and partly enforced; durations unchecked                                                 |
| Terminology consistency   |       9 |      10 | the site now leads with the canonical tagline                                                    |
| Accessibility             |       7 |      10 | AA computed everywhere, axe 0, 187 focus rings                                                   |
| **Overall coherence**     | **6.5** | **9.6** |                                                                                                  |

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

| D16 | the generated badge sent shields.io named colours | **closed** — found when Sergey asked whether CI was covered; it was not |

D16 is worth its own line because two of those names were wrong, not
merely off-brand. `success` is GREEN, so a 100 badge said "your software
is fine". `important` is ORANGE, so every WORTHY badge rendered the
trusted band in a warning hue — for eight releases, behind a code
comment asserting it was "blue-family, closest to aurora-cyan". The test
guarding it checked that each value was a name shields RECOGNISES, which
every one of them was. Nobody had resolved a name to a colour and
looked. The badge also wore `namedLogo: "vitest"` — another project's
mark, on the image users paste into their own READMEs.

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
0 of 9 rules failing, 0 findings, 0 known open, 0 stale
```

Every known-open entry the ratchet carried during the work was **deleted
the moment it stopped firing**, because a stale allowlist is how a gate
becomes decoration. The ratchet caught three of its own seeds going
stale as the code moved under them, and reported each as a broken seed
rather than passing vacuously.

`npm run brand:doctor:selftest` —
[transcript](gate-evidence/brand-doctor-selftest.txt)

```
12 of 12 rules observed rejecting an invalid state
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

## 8b. Rebased onto v1.0.2 (via v0.6.1)

Main moved 37 commits under this branch while it was being built — the
whole 0.6.x Productized Core line. Merged, and everything re-verified
against it rather than against the tree the work started on.

Six conflicts, all in generated artifacts or a stamp; all 23 READMEs and
`ci.yml` auto-merged, which is the brand work's own doing — it had
touched those files mechanically, from tokens, rather than by hand.

Three things the merge settled:

- **`flow.svg` is restored.** Its deletion arrived with the pre-existing
  work this branch carried, and I had judged it part of the mission. It
  was not: whether the README tells its story with one asset or two is
  editorial, and main is still shipping the two-asset version. Restored
  whole, then brought into the token system — its generator held six
  colours of its own, on an asset the README shows above the fold.
  `README.md` was reset to main's and swept for badges only; the diff is
  now five lines, all of them badge colours.
- **The Trust Report had already drifted.** A new surface, and it typed
  its own six rung labels — five words different from the symbol
  module's. Now built from `TRUST_RUNGS`.
- **Neither new reporter needed a colour change.** Both consume
  `palette()`, so the converged terminal palette reached them the moment
  the merge landed. That is the token system paying for itself.

And a second site-build breakage found on main, of the same class as
D15: `docs/RULE-LIFECYCLE.md` wrote `mjolnir mutation <report>` as prose,
Vue's template compiler read `<report>` as an element, and the build
failed. Both times the cause was the same — **nothing runs the site
build except the Pages workflow**, and a deploy that fails after merge is
a deploy nobody reads. Both were caught in the same way this time — by running the gate
locally — and both are now fixed for good: see §8c.

## 8c. Two CI checks, so the class cannot recur

This branch surfaced four pre-existing breakages just by running the
gates: the site build broken twice (`gen-report.mjs` requiring a heading
the hero asset had dropped; `mjolnir mutation <report>` in a doc read by
Vue's compiler as an element), a `prettier --check` failure on a
CHANGELOG blank line, and `<<<<<<<` conflict markers committed in
`package-lock.json` on main since v1.0.0 — a file npm parses as JSON, so
`npm ci` fails on a clean checkout and Snyk cannot parse the manifest.

Each was fixed in its own commit. Two of them were also holes in CI, now
closed:

- **`site-build` job** (`ci.yml`). The site build only ran on
  push-to-main, so a commit that broke it passed every PR check and
  failed the deploy after merge. The new job runs the same
  install / catalog-test / build / site-doctor sequence `pages.yml`
  does, on the PR. ~2 minutes.
- **Lockfile marker guard** in `build-test`. A scoped `git grep` for a
  line that is exactly seven `<`, `=` or `>` in a lockfile — JSON has no
  such line — run right after checkout so it fails fast with the file
  named. `shell: bash` because `windows-latest` defaults `run:` to
  PowerShell (my first cut without it failed the Windows leg; CI caught
  it, `2a659a5` fixed it — which is the check doing its job).

## 8d. Snyk

`security/snyk (sergey-bar)` reports `1 test has failed`, and it is not
from this branch:

- `npm audit` is clean everywhere — root, `site/`, `packages/*`, prod
  and dev. Zero vulnerabilities.
- This PR adds, changes and removes **zero** dependencies.
- It fails on `main`'s own tip for the same reason, and **PR #70** — now
  part of main's 1.0 line — got the identical `1 test has failed` and was
  merged.
- Snyk is a GitHub App integration with no configuration in the repo.
  This PR only _triggers_ it because commit `5fcd69b` had to edit
  `package-lock.json` to remove the conflict markers, after which Snyk
  can parse the file and surfaces a repo-wide advisory that predates
  this branch.

It is a Snyk-dashboard triage item — bump the flagged transitive
dependency, or add a `.snyk` ignore with a reason. Left for the
maintainer because suppressing an advisory that `npm audit` cannot even
see, blind, would be worse than naming it here.

## 9. What changed

29 commits on `brand/unification`, each independently reviewable. The
brand phases:

| Phase |           |                                                    |
| ----- | --------- | -------------------------------------------------- |
| 0     | `f58d7cf` | freeze the tree, measure the before-state          |
| 1     | `ead9124` | one source of brand truth, zero visual change      |
| 2     | `f05166e` | the brand gate, proven able to fail                |
| 3     | `61ad5dd` | one typography system across every surface         |
| 4     | `2390109` | one palette, and the AA failure it was hiding      |
| 5     | `732e206` | one geometry for evidence and trust                |
| 6     | `643ef68` | the badges join the brand, in all 23 READMEs       |
| 8     | `75f3823` | the website says what the product says             |
| 9/11  | `4a442f2` | write the system down, once each                   |
| 10    | `8b642f4` | the reporter's diagrams stop lying about UNKNOWN   |
| 12    | `5b1de26` | certification                                      |
| 13    | `7c4fb6e` | the badge the product emits joins the brand        |
| —     | `2ea48a7` | close the two closable gaps — rule 9, video-pixels |

Not brand work, fixed in their own commits so a reviewer can drop or
cherry-pick them:

|                     |                                                            |
| ------------------- | ---------------------------------------------------------- |
| `ce6dc05`           | site build broken since `9f59bc5`                          |
| `8963e73`           | site build broken again — `<report>` read as a Vue tag     |
| `e4a4c66`           | CHANGELOG blank line failing `prettier --check`            |
| `73e4437`           | the shipped demo video was reproducible by no command      |
| `5fcd69b`           | `package-lock.json` conflict markers, on main since v1.0.0 |
| `2d4bde6` `2a659a5` | the two CI checks from §8c                                 |

Two merge commits — `a13e8be` (v0.6.1) and `d639762` (v1.0.2).

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

1. **Prose design documents can drift.** Only the token reference is
   generated and byte-locked; rule 5 catches any colour they state that
   the source does not hold, but no check reaches a sentence that is
   merely no longer true. _(the sole thing blocking 10/10 — and I do not
   think a check can reach it)_
2. **Motion durations are not checked** against the `MOTION` tokens.
3. **The site's terminal component uses a system monospace stack**, not
   Geist Mono: the web subset lacks the box-drawing and block-element
   glyphs the reporter prints, and mixing faces mid-line broke column
   alignment by up to 3.6 columns. Documented in the component.
4. **Mobile Lighthouse is 88–92**, and the baseline it would be compared
   against is not sound.
5. **The tour video is rendered and tested but ships nowhere.**
6. **Pre-existing test flakes** under full parallel load, all green in
   isolation and unrelated to this work: `doctor-json.spec.ts` G5,
   `package-smoke.spec.ts`, and `scale-benchmark.spec.ts`.
7. **The README's prose and section rhythm were deliberately not
   rewritten.** Its badges, assets and diagrams converged; its technical
   argument was already its strongest asset and the mission's own rule
   was to preserve it.
8. **`security/snyk`** — a dashboard triage item, not a code defect;
   see §8d.
9. **The primary worktree** (`C:\Work\Mjolnir-QA\Mjolnir`) was left on
   this branch's Phase-0 fork with another session's uncommitted files.
   Those files were verified to be entirely superseded by `origin/main`
   (the census work landed via the P8 / WI-14 PRs); they are preserved
   in a stash, and the worktree was reset to current `main` content.

## 12. Final verdict

```
MJÖLNIR BRAND SYSTEM — NOT YET 10/10
```

Overall coherence **9.6/10**. The three checks this document first
listed as missing — hash lock, pixel verification, and one more — became
two built checks (rule 9, `video-pixels.spec.ts`) and one gap I do not
believe a check can reach: a prose sentence going quietly out of date.
The remaining 0.4 is that, and I would rather carry it than dress it.

PR #71 is green on all 20 real checks against `main` at v1.0.2. The one
red, `security/snyk`, fails on main's own tip and was merged past on
PR #70 — §8d.

The system is one palette, two typefaces, three marks and one source of
truth, enforced by a gate that has been watched rejecting every kind of
violation it claims to catch. What it is not is finished — and saying so
is the only ending this particular product could honestly have.

## 13. The wordmark rework (2026-09-12)

Requested directly: replace the illustrated hammer mark with a plain
`MJÖLNIR` wordmark, Cinzel 600, display-only, with a rune as the only
fallback for contexts too small to read a word.

**What changed.** `scripts/generate-brand-marks.ts` is new: it renders
both marks as HTML/CSS shot with the same Chromium the demo video uses,
from `src/brand/tokens.ts` and the already-vendored Cinzel and FreeMono
files — no new dependency, no illustration. The wordmark is the full
lockup everywhere there is room to read a word; the fallback is a single
rune, ᛗ (Mansaz), for favicons and the npm/social icon. All eleven files
rule 9 already pinned were regenerated and re-locked through the normal
`npm run brand:marks:update` flow.

**Why ᛗ and not a new rune.** The hero runefield already spells the
product's own name in Elder Futhark (ᛗ ᛃ ᛟ ᛚ ᚾ ᛁ ᚱ, §5 above) — ᛗ is
already the brand's own "M". It is deliberately not one of the five
runes `RUNES` in `score-state.ts` places beside an actual verdict (ᚲ ᚦ
ᛏ ᛟ ᛁ): a permanent logo built from a verdict rune would make the brand
itself look like a standing score, which is the one thing this whole
system exists to prevent the reporter from doing anywhere.

**Why native rendering, not downscaling.** The prior nine derived files
were downscales of two provided raster masters; a hammer illustration
shrunk to 16px had already lost detail it could not regain. Every size
here is its own render from the same vector source instead, so a 16px
favicon is not a resample of a 1800px file — it is its own shot at 16px.

**What this did NOT touch.** Score/rule logic, exit codes, schema
version, and every non-mark token are untouched — brand:doctor's other
eight rules and the reproducibility specs all still pass unchanged.

**What I have not verified beyond the gate.** This is a design change
delivered on the maintainer's direct sign-off ("do what you think is
right"), not a re-run of the accessibility/performance measurement pass
in §§5–6 — those numbers were about SVG chrome and page weight, neither
of which this touches, but I have not re-measured them to confirm that
belief rather than assume it. The certification score above (9.6) was
set before this section existed and is not re-scored here; a change of
this kind — replacing the one asset every other rule was built to
protect — is exactly the kind of decision this document exists to make
visible, not to grade itself on.
