# Brand baseline — the measured before-state

Captured at the start of the brand-unification mission
(`.planning/BRAND-UNIFICATION-PLAN.md`, Phase 0).

**Commit:** `2bb915f` (`chore(release): v0.5.31`)
**Branch:** `brand/system-unification`
**Date:** 2026-09-08

Everything here is a measurement or a verbatim capture. Where something
was not measured it says `NOT MEASURED`, never `PASS`.

---

## 1. Working-tree provenance

The tree was **not clean** when the mission started. Three separate
bodies of pre-existing work were found and each was preserved, none
discarded:

| Pre-existing work                                                                                      | Belongs to this mission?                             | Disposition                                                                                                          |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 3 unclassified corpus verdict stubs (`tests/corpus/verdicts/*.jsonl`)                                  | No — corpus classification work                      | Committed on `p0/repo-state-truth-drift` as `40f2cb5`. **Deliberately not carried** onto `brand/system-unification`. |
| `.claude/commands/mjolnir.md` stamped `v0.5.30` after the `v0.5.31` release                            | No — repo hygiene                                    | Committed as `0791a76` on `p0/…`, cherry-picked to `c488e31` here so the drift gate is green on this branch.         |
| Geist Mono embedding + terminal chrome unification + `flow.svg` removal + README "See it work" rewrite | **Yes** — it is the first half of the plan's Phase 3 | Committed as `8bd5899`.                                                                                              |

Raw captures: [`git-status.before.txt`](git-status.before.txt),
[`git-diff-stat.before.txt`](git-diff-stat.before.txt),
[`head.before.txt`](head.before.txt).

## 2. Test suite — baseline is RED, and the cause is pre-existing

`npm test` at `2bb915f` with the pre-existing tree:

```
Test Files  2 failed | 219 passed | 1 skipped (222)
     Tests  2 failed | 6740 passed | 6 skipped (6748)
  Duration  70.40s
```

| Failing spec                                                                                   | Cause                                                                                        | Related to this mission?                                                                  |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `tests/rules/fp-audit-table.spec.ts` — `unclassified-verdict completeness gate failed (3 > 0)` | The three uncommitted corpus verdict stubs, exactly                                          | No. Removed from this branch by not carrying them; the ratchet is green here.             |
| `tests/integrations/package-smoke.spec.ts` — `Test timed out in 5000ms` spawning the built bin | Environmental: a 5 s budget for a cold child-process spawn of the packed CLI on this machine | No. Not caused by, and not fixed by, this mission. Carried as a known pre-existing flake. |

Neither failure touches brand surfaces. Both are documented rather than
silently fixed (mission rule §2).

## 3. Live deployed site — measured, not assumed

Read from **the deployed page** `https://sergey-bar.github.io/Mjolnir/`,
not a local build.

### Typefaces actually loaded

```
Cinzel 600
Inter 400 / 500 / 600  (+ "Inter Core", "Inter Fallback")
JetBrains Mono 400 / 500
ui-monospace  (fallback, in use)
```

**Geist and Geist Mono are absent.** The README SVG assets and the demo
MP4 use Geist + Geist Mono exclusively. This is defect **D1** verified
against production: a README asset and a website page share no
letterform.

### Tokens resolved on the live page

```
--mj-gold          #c19a34
--mj-gold-bright   #e6bd57
--mj-aurora        #37abbd
--mj-ink-900       #0c1420
--mj-steel         #c8cbcf
--mj-trusted       #5cc4e0
--mj-unworthy      #ec6b66
```

### Hero copy (verbatim)

```
Your tests are lying to you. We prove it.
```

The canonical tagline, in `README.md` and `assets/brand/README.md`, is:

```
Tests tell you what passed. Mjölnir tells you what you can trust.
```

Two different primary claims, in two different voices — the site's is
accusatory, the README's is restrained. Recorded as new defect **D13**
(voice/terminology divergence); it was not in the original plan's D1–D12.

### Runes on the homepage

20 rune-bearing elements. Classified:

| Class                        | Glyphs                            | Semantic?                                                   |
| ---------------------------- | --------------------------------- | ----------------------------------------------------------- |
| `.rune` (hero background)    | ᛗ ᛃ ᛟ ᛚ ᚾ ᛁ ᚱ                     | **No** — decorative wallpaper                               |
| `.feat-rune` (feature cards) | ᛏ ᛗ ᚦ ᚨ ᛟ ᛉ                       | **No** — decorative                                         |
| `.glyph` / verdict           | `ᚦ [STRAINED]` and the hammer art | **Yes** — the `score-state.ts` band rune beside its verdict |

Decision D-D states the rune belongs beside the verdict/state and "must
never become decorative wallpaper". The live site currently violates
that in two places. Recorded as new defect **D14**.

## 4. Real CLI output

[`cli-scan.before.txt`](cli-scan.before.txt) — a real
`tsx src/cli.ts .` run against this repository, `FORCE_COLOR=0`,
exit `0`, score `99/100 WORTHY`, rune `ᛏ [CHARGED]`.

Reproduce with:

```bash
FORCE_COLOR=0 npx tsx src/cli.ts .
```

## 5. Generated asset fingerprints

[`asset-inventory.md`](asset-inventory.md) — sha256 prefix + byte size
for every generated README asset, the video, the poster and the three
brand masters. Phase 12 re-runs the same capture for the after-state.

## 6. Terminal palette contrast (computed)

WCAG 2.1 relative luminance, terminal palette on its own background
`#08090A`:

| role       | hex           | ratio    | AA       |
| ---------- | ------------- | -------- | -------- |
| bold       | `#EDE6D6`     | 16.03    | pass     |
| forged     | `#F4DC9C`     | 14.77    | pass     |
| default fg | `#D7D3C8`     | 13.32    | pass     |
| trusted    | `#5CC4E0`     | 9.90     | pass     |
| accent     | `#8AB4D8`     | 9.11     | pass     |
| warning    | `#E0A526`     | 9.09     | pass     |
| ok         | `#4FB477`     | 7.71     | pass     |
| info       | `#3FB0A0`     | 7.52     | pass     |
| dim        | `#7C8590`     | 5.33     | pass     |
| **error**  | **`#D0453B`** | **4.36** | **FAIL** |

Site palette on `#0C1420`: lowest is `--mj-steel-dim` / `--vp-c-text-3`
at 5.95 — all pass.

## 7. Lighthouse / axe — the numbers Phase 3 and Phase 8 must not regress

> **Correction, recorded after the fact.** These numbers were measured
> against a **stale `site/.vitepress/dist`**. The site build at `2bb915f`
> does not complete: `site/scripts/gen-report.mjs` throws
> `no FINDINGS heading line in the hero asset`, because commit `9f59bc5`
> (2026-09-07) shortened `terminal-hero.svg` to the score instrument and
> dropped everything from `▚ FINDINGS` down, which that parser required.
> The failure was invisible here because the build command was piped to
> `tail`, so the shell reported the pipeline's exit status and not the
> build's. Recorded as pre-existing defect **D15**; it also means the
> GitHub Pages deploy has been failing since that commit.
>
> The baseline below is therefore a measurement of the last successfully
> built site, not of `2bb915f`. It is kept because it is still the
> honest "before" a reader would have seen on the deployed page — but
> the mobile figures in particular are not a clean comparison against
> anything measured after the build was repaired, and the after-state
> report says so rather than claiming an improvement it cannot support.

Local-server measurements with gzip on and the official Lighthouse
presets, per `site/scripts/lighthouse-run.mjs` — a local floor, not a
promise about production. Raw runs:
[`site-audit.before.txt`](site-audit.before.txt),
[`lighthouse.before.txt`](lighthouse.before.txt).

### axe-core + keyboard + web vitals (`npm run site:audit`)

| page                     | axe violations | keyboard stops | without focus ring | CLS |     LCP |
| ------------------------ | -------------: | -------------: | -----------------: | --: | ------: |
| `/` (landing)            |              0 |             31 |                  0 |   0 | 3172 ms |
| `/guide/getting-started` |              0 |             45 |                  0 |   0 |  264 ms |
| `/rules/`                |              0 |             60 |                  0 |   0 |  244 ms |

### Lighthouse (`npm run site:lighthouse`)

| page                     | desktop perf | a11y | best-practices | seo | mobile perf |
| ------------------------ | -----------: | ---: | -------------: | --: | ----------: |
| `/` (landing)            |          100 |  100 |            100 | 100 |          88 |
| `/guide/getting-started` |           99 |  100 |            100 | 100 |          97 |
| `/rules/`                |           99 |  100 |            100 | 100 |          90 |

Desktop LCP 0.8 s, CLS 0, TBT 0 ms on all three.

**These are the Phase-3 and Phase-8 exit gates.** Not "roughly this" —
these exact numbers or better.

## 8. Defect register (extends the plan's D1–D12)

| ID                                                       | Status at baseline                                                                                                                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 typography — three systems                            | confirmed on the deployed site (§3)                                                                                                                                                                                    |
| D2 two palettes                                          | confirmed (`theme.ts` vs `vars.css`)                                                                                                                                                                                   |
| D3 stale README badges                                   | confirmed, 92 occurrences across 23 files                                                                                                                                                                              |
| D4 third neutral ramp                                    | confirmed, `generate-readme-architecture.ts`                                                                                                                                                                           |
| D5 macOS traffic lights                                  | confirmed in the **three README SVG generators**. Correction to the plan: `scripts/video/terminal-page.ts` is **already clean** (neutral `#323232` dots) — the video is the precedent to converge on, not an offender. |
| D6 terminal `error` fails AA                             | confirmed, 4.36:1 (§6)                                                                                                                                                                                                 |
| D7 six palette copies, one guarded edge                  | confirmed; additionally the brand doc's **verdict** table (`#E5544E` for UNWORTHY) disagrees with `vars.css` (`#ec6b66`) and escapes Check 8, which only parses `--mj-*` palette rows                                  |
| D8 trust ladder unrepresented                            | confirmed                                                                                                                                                                                                              |
| D9 evidence marks unshared                               | confirmed                                                                                                                                                                                                              |
| D10 runes under-deployed                                 | **partially wrong**: the runes are _over_-deployed on the site, decoratively (D14), and under-deployed semantically in the README                                                                                      |
| D11 no `docs/design/`                                    | being fixed by this directory                                                                                                                                                                                          |
| D12 no motion language                                   | confirmed                                                                                                                                                                                                              |
| **D13** voice divergence: site hero vs canonical tagline | new, found at baseline                                                                                                                                                                                                 |
| **D14** decorative rune wallpaper on the homepage        | new, found at baseline                                                                                                                                                                                                 |
| **D15** the site build has been broken since `9f59bc5`   | new, found in Phase 3 when a real build was first attempted; see the correction in §7                                                                                                                                  |
