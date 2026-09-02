# Mjölnir Site — Redesign Plan

Status: Phases 0-1 implemented on `site/phase-0-1-truth`; 2-6 proposed · Drafted 2026-09-02 · Target: `site/` (VitePress, GitHub Pages)

## 0. Why this document exists

The site was last reworked in PR #20 (`brand/unified-identity`), which
replaced the palette and the hero lockup. That was a re-skin. This plan is
the layer underneath it: what the site _claims_, how it _proves_ it, and
whether the claims and the proof are still in sync. They are not — §2
records nine measured defects, one of which is a credibility bug on the one
page whose entire argument is "we don't assert what we haven't measured."

Everything in §2 was measured against the live deployment
(`https://sergey-bar.github.io/Mjolnir/`) and the committed source on
2026-09-02. Nothing here is an impression.

## 1. The site law

The product's north-star law is: _never assert verification quality the
evidence does not carry._ The site is currently exempt from its own
product's law. It should not be.

> **Site law.** Every number, verdict and code sample on the site is
> generated from a real scan, or it does not ship. A hand-typed claim about
> the tool's output is a defect of the same class as an unmeasured rule in
> the core tier.

Executable form (Phase 0): `npm run site:doctor` — numbered checks in the
shape of `mjolnir doctor`, wired into `.github/workflows/pages.yml`, with a
committed baseline that ratchets down. A law that CI does not enforce is a
preference, not a law.

## 2. Baseline — measured defects

| #   | Defect                                                                                                                                                                                                                                             | Measurement                                                                                 | Where                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| D1  | **Score drift — credibility bug.** The animated gauge and the image alt text both say `70/100`. The generated asset beside them says `75/100`. Hardcoded in 4 places.                                                                              | `const target = 70`, `score.value = 70` ×2, alt text — vs `WORTHINESS  75/100` in the asset | `Home.vue:94,122,142,313` vs `assets/readme/terminal-hero.svg` |
| D2  | **The report image is 42% of the landing page.** 136 terminal lines rendered as one 1194×3036 SVG, displayed at 950×2416 CSS px — 3.4 viewport heights of a single static image. Text is not selectable, copyable or searchable.                   | `.showcase` = 2795px of a 6681px document                                                   | `Home.vue:305-322`                                             |
| D3  | **Mobile requires horizontal panning to read the demo.** `min-width: 560px` inside a 335px scroller at a 375px viewport; terminal text renders at ~47% of natural size.                                                                            | scrollWidth 560 vs clientWidth 335                                                          | `Home.vue:810`                                                 |
| D4  | **No-JS is a blank page.** `[data-reveal] { opacity: 0 }` with `.is-in` added only by JS. All 17 reveal targets — i.e. every section below the hero. The 4s `revealAll` safety net is also JS.                                                     | 17/17 elements                                                                              | `Home.vue:1109`                                                |
| D5  | **WCAG AA contrast failures.** Five semantic tokens below 4.5:1 in light mode — including every link and every inline `<code>` in the docs — and two more in dark mode against `--vp-c-bg-soft`.                                                   | 24 failing token×surface×theme combinations; see §2.1                                       | `styles/vars.css`                                              |
| D6  | **Motion budget.** 5 infinite animations, ~14 animated elements, all behind the fold. The heaviest is a full-viewport `filter: blur(60px)` conic gradient under `animation: spin 26s infinite`.                                                    | 5 × `infinite`                                                                              | `Home.vue` hero                                                |
| D7  | **Asset weight.** `social-card.png` is 883 KB (1200×630). `logo.webp` is 185 KB and is the LCP element. The 180×180 `apple-touch-icon.png` doubles as the ~24px navbar logo. 10 Google Fonts files load render-blocking from a third-party origin. | file sizes + `config.mts:120-129`                                                           | `site/public/`, `config.mts`                                   |
| D8  | **Decorative rune injected into every `h2`.** `content: "ᛏ"` in `::before` with no alt text — generated content is announced by several screen readers, so every heading on every docs page is prefixed with "Tiwaz".                              | all `.vp-doc h2`                                                                            | `custom.css:57`                                                |
| D9  | **No quality gate.** `pages.yml` runs the catalog generator's unit tests and `vitepress build`. Nothing checks contrast, a11y, asset budget, motion, or that the site's numbers match the tool's. D1 survived because nothing was watching.        | —                                                                                           | `.github/workflows/pages.yml`                                  |

### 2.1 Contrast measurements (light mode)

Computed against all three surfaces declared in `vars.css`, in both
themes — light `#f7f8fa` / `#eef1f5` / `#e7ebf1`, dark `#0c1420` /
`#111a29` / `#1a2740`.

**Correction (2026-09-02, after Check 1 was implemented):** an earlier
draft of this section said dark mode passed throughout. That was measured
against the primary background only. Against `--vp-c-bg-soft` dark fails
too — `--vp-c-text-3` at 3.68:1 and `--mj-unworthy` at 4.05:1. Both are
in the table below. This is the reason Check 1 enumerates every surface
rather than a representative one.

| Token                    | Current   | bg   | bg-alt | bg-soft | Verdict  | Proposed  | Ratios             |
| ------------------------ | --------- | ---- | ------ | ------- | -------- | --------- | ------------------ |
| `--vp-c-brand-1`         | `#a5811c` | 3.43 | 3.22   | 3.05    | **FAIL** | `#7a5f19` | 5.68 / 5.33 / 5.05 |
| `--mj-needswork`         | `#a5811c` | 3.43 | 3.22   | 3.05    | **FAIL** | `#7a5f19` | 5.68 / 5.33 / 5.05 |
| `--mj-trusted`           | `#2596a8` | 3.29 | 3.09   | 2.92    | **FAIL** | `#1b6e7a` | 5.55 / 5.21 / 4.93 |
| `--vp-c-text-3`          | `#6e7a8c` | 4.10 | 3.85   | 3.64    | **FAIL** | `#5c6675` | 5.47 / 5.13 / 4.86 |
| `--mj-unworthy`          | `#c13b37` | 5.01 | 4.69   | 4.45    | marginal | `#b8332f` | 5.56 / 5.22 / 4.94 |
| `--mj-info`              | `#2b7fa8` | 4.20 | 3.94   | 3.73    | **FAIL** | `#26708f` | 5.21 / 4.88 / 4.62 |
| `--vp-c-text-3` _(dark)_ | `#71808f` | 4.56 | 4.31   | 3.68    | **FAIL** | `#8b939d` | 5.95 / 5.61 / 4.80 |
| `--mj-unworthy` _(dark)_ | `#e5544e` | 5.02 | 4.74   | 4.05    | **FAIL** | `#ec6b66` | 6.04 / 5.70 / 4.87 |

The existing scale already contains a passing gold: `--vp-c-brand-3`
(`#6f5717`, 6.48/6.07/5.75). The fix is a shift of which step is the
light-mode default, not a new hue — the brand is not affected.

## 3. Design principles

Decision rules for every choice below. When two options look equally good,
the principle breaks the tie.

1. **Proof over polish.** The most persuasive asset this product has is its
   own output. Anything that delays the visitor's first sight of a real
   verdict is working against the site.
2. **Generated, not typed.** Per §1. If a number appears on the site, a
   script put it there.
3. **Text, not pictures of text.** The report is the product. It should be
   selectable, copyable, searchable, reflowable, and themed by the same
   tokens as the rest of the site.
4. **Motion earns its place or leaves.** One ambient effect, not five.
   Reduced-motion parity is a floor, not a feature.
5. **Restraint is the brand.** The tool's voice is "here is the number,
   here is how we got it, here is where it's ugly." The site should sound
   like the tool.

### 3.1 Explicit anti-principles

The reference set includes a large cluster of motion-showcase libraries
(Magic UI, Aceternity, Eldora, Vengeance, Uiverse, Ripplix, Swishy). Their
house style — beam borders, spotlight cards, animated gradient text,
marquees — is **rejected for this site**, on principle 5. A tool that sells
measured honesty and publishes its own false-positive rates cannot afford
to look like it is compensating. The site already carries more of this than
it should (D6); this plan reduces it.

This is a judgement call about positioning, and it is Sergey's to overrule.
If overruled, the phases still stand — only §7's budget changes.

## 4. Phases

Each phase has an exit gate. A phase is not done when the code is written;
it is done when the gate passes.

### Phase 0 — Guardrails (no visual change)

Build the enforcement before the work, so improvement is provable and
D1-class regressions cannot recur silently.

- `site/scripts/site-doctor.mjs` — numbered checks, `mjolnir doctor` shape:
  - **Check 1 · Contrast.** Every semantic token against every declared
    surface, both themes, ≥ 4.5:1 (≥ 3:1 for large text and UI borders).
  - **Check 2 · No typed claims.** No score/verdict/count literal in
    `site/` that is not sourced from generated data. Closes D1.
  - **Check 3 · Asset budget.** Per-file cap in `site/public/`; landing
    page total transfer cap. Closes D7.
  - **Check 4 · No-JS.** The built landing HTML must render its content
    with scripting disabled. Closes D4.
  - **Check 5 · Motion budget.** Count of `infinite` animations ≤ budget,
    and every one covered by the `prefers-reduced-motion` block.
  - **Check 6 · a11y.** axe-core against the built landing page, one guide
    page, and the rule catalog. Zero violations.
  - **Check 7 · Links.** No dead internal links in the built output.
- `site/.quality-baseline.json` — committed ratchet, in the manner of
  `tests/corpus/baseline/`.
- Wire into `pages.yml` before `npm run build`, **advisory in this phase**
  (reports, does not block).

**Exit gate:** doctor runs in CI, prints the current D1–D8 failures, and the
baseline is committed. No pixel changes.

### Phase 1 — Truth

The correctness defects. Small diffs, disproportionate value; D1 alone is
worth shipping on its own.

- **D1** — delete the hardcoded `70`. The gauge target, verdict label and
  alt text all read from generated data (Phase 2's `report.json`; until
  then, a minimal generated `score.json`).
- **D5** — apply §2.1's token values.
- **D4** — reveal-on-scroll becomes progressive enhancement: content
  visible by default, JS opts _into_ the animation instead of out of
  invisibility. The `prefers-reduced-motion` block already does the right
  thing and stays.
- **D8** — `content: "ᛏ" / ""` (empty alt text; current Chrome, Safari and
  Firefox all support the alt-text syntax).

**Exit gate:** doctor checks 1, 2, 4, 6 pass. Diff touches colour, one CSS
rule, and the reveal mechanism — no layout change.

### Phase 2 — The report becomes a component

The heart of the redesign. Closes D2 and D3 together, and turns the site's
biggest liability into its best asset.

The pipeline already does 90% of this work. `scripts/readme-svg.ts` exports
`ansiLineToSpans(line) → {text, color}[]`, consumed by
`generate-readme-hero.ts` to emit `<tspan fill=…>`. The same spans emit
`<span style="color:…">` with no new parsing.

- `scripts/readme-svg.ts` — add `ansiToSpanModel` alongside the existing SVG
  emitter. One parser, two renderers.
- `scripts/generate-site-report.ts` → `site/.vitepress/theme/generated/report.json`:
  the spans, plus the parsed structure the page needs — `score`, `verdict`,
  `deductions`, and the section boundaries already visible in the output
  (`DIAGNOSTICS BY CATEGORY` L24, `WHERE POINTS WERE LOST` L28, `FIX THIS
FIRST` L34, `FINDINGS` L38, footer L133).
- `<TerminalReport>` Vue component consuming it:
  - **Verdict block** (asset lines 18–37, ~20 lines) always visible.
  - **Findings** (lines 38–131, 94 lines) behind a disclosure.
  - The 15-line ASCII logo (lines 3–17) is **dropped on the web** — it is
    redundant 900px below the real lockup and is terminal-only value.
  - Real text: selectable, copyable, `Ctrl+F`-able, themed by tokens,
    reflowing at narrow widths instead of panning.
- Extend `tests/hero-asset-reproducibility.spec.ts` to cover the JSON, so
  the web report cannot drift from the tool any more than the SVG can.
- Keep `terminal-hero.svg` — the README still needs it.

**Exit gate:** the rendered report is byte-reproducible from a real scan;
landing document height ≤ 4200px (from 6681); zero horizontal scroll at
360px; report text passes a copy-paste round-trip.

### Phase 3 — Proof above the fold

- Hero becomes: lockup (smaller) · one-line claim · **the verdict card**
  (score ring + verdict line + the three-row deduction table, all from
  `report.json`) · CTA · copy command.
- The existing gauge moves up and stops being decorative — it shows the
  same 75 the report shows, because both read one source.

**Exit gate:** a real verdict is visible without scrolling at 1280×720 and
390×844. LCP element is text or the re-encoded logo.

### Phase 4 — Motion and performance budget

- One ambient hero effect. Recommend keeping the aurora and dropping the
  runefield: the runes already carry the motif in the dividers, the section
  headings and the feature cards.
- Replace the animated `filter: blur(60px)` layer with a pre-blurred static
  gradient animated on `transform` only — the blur filter is the expensive
  part, and it is plausibly what tore screenshot capture on the live page
  during this audit (suggestive, not proven).
- `social-card.png` 883 KB → ≤ 150 KB. `logo.webp` 185 KB → ≤ 60 KB at the
  same 960×480. Dedicated small navbar mark instead of the 180×180 touch
  icon. **The logo artwork is not redrawn or reinterpreted — re-encoding
  only.**
- Fonts: trim Cinzel to the weights actually used and Inter from five
  weights to three. Self-hosting is an open decision (§8).

**Exit gate:** doctor checks 3 and 5 pass; Lighthouse performance ≥ 95 on
the landing page; CLS ≤ 0.05.

### Phase 5 — Information architecture and content

- **Surface the rule catalog.** It is the best-built thing on the site
  (URL-synced filters, 92 rows, real search) and is reachable only from the
  nav. Add a landing-page preview: five rows plus "browse all 91 rules".
- **Tabbed output formats** on the report — `terminal` / `json` / `sarif`,
  the same scan in three shapes. The one pattern worth taking from the
  reference set (shadcn/Ant docs), and product-true rather than decorative.
- **Replace the generic six-feature grid** with four real findings drawn
  from catalog data — rule ID, the code that fires it, the fix — each
  linking into the catalog.
- **Fill the thin docs.** `guide/ci.md` is 28 lines and stops before the
  things a reader actually has to decide: which gate to choose, what the
  exit codes mean in a pipeline, and how to adopt it in a repo that
  already has debt. (`reference/sarif.md` and `reference/contributing.md`
  are 7 lines of frontmatter around an `@include` — an earlier draft of
  this plan called them thin, which was wrong: they render the full
  repo doc.)

**Exit gate:** every claim on the landing page links to a page that
substantiates it.

### Phase 6 — Craft

- Typographic scale and vertical rhythm audited as a system rather than
  per-section; the five `RuneDivider`s currently do the spacing work a
  scale should do.
- Visible focus rings on every interactive element; full keyboard pass
  through the catalog filters.
- Light/dark parity check on every page, not just the landing page.
- A real 404.

**Exit gate:** axe clean across all page types; manual keyboard pass;
light/dark screenshot parity.

## 5. Proposed landing page structure

| #   | Section                  | Change                                                             |
| --- | ------------------------ | ------------------------------------------------------------------ |
| 1   | Hero + verdict card      | rebuilt (Phase 3)                                                  |
| 2   | One command, one verdict | tightened; the CI one-liner and exit-code semantics                |
| 3   | The report               | `<TerminalReport>`, verdict open / findings disclosed, format tabs |
| 4   | Evidence ladder E0/E1/E2 | keep — this is the differentiator                                  |
| 5   | Measured, not asserted   | keep; already generated from `rules.data.json`                     |
| 6   | What it catches          | four real findings, replacing the six generic feature cards        |
| 7   | Rule catalog preview     | new                                                                |
| 8   | Not another linter       | keep, tightened                                                    |
| 9   | Final CTA                | keep                                                               |

## 6. What the reference set actually contributes

| Source                                                                           | Verdict                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shadcn/ui, Ant Design, Flowbite, DaisyUI, HeroUI, Headless UI, Float UI, Open UI | **Not adopted.** Component libraries for applications. This is a docs site with one landing page; VitePress already provides the shell. Worth reading Ant's and shadcn's _documentation_ patterns — tabbed examples (Phase 5), anchored API tables. |
| Magic UI, Aceternity, Eldora, Vengeance, Uiverse, Ripplix, Swishy                | **Rejected** on §3.1.                                                                                                                                                                                                                               |
| anime.js, Lottie, Jitter                                                         | **One narrow use.** If the report ever animates (typing replay of a real scan), `generate-readme-demo.ts` already produces an animated SVG. Not a Phase 1–6 item.                                                                                   |
| Designspells, Recent, Dark.design, UI.live                                       | Inspiration galleries. Reading material, not adoptable.                                                                                                                                                                                             |
| Iconsax                                                                          | **Marginal.** The site uses a handful of ad-hoc inline SVGs. A consistent set would help slightly; not worth a dependency yet.                                                                                                                      |
| shaders.com                                                                      | **No.** A WebGL hero contradicts every principle in §3.                                                                                                                                                                                             |

The honest summary: the reference set is 90% component libraries and motion
showcases, and this site needs neither. Its problems are truth, weight and
information architecture.

## 7. Non-goals

- No framework change. VitePress stays.
- No component library adopted.
- No redraw or reinterpretation of the logo artwork — `assets/brand/`
  remains the single source of truth (re-encoding for weight is in scope,
  redesign is not).
- No change to the terminal reporter's palette. That is the separate
  deferred item from PR #20 and it ripples into golden/snapshot tests.
- No analytics, no third-party tracking. The footer says "zero telemetry"
  and it should stay true.

## 8. Open decisions

1. **Self-host fonts?** Removes a third-party render-blocking request and
   the IP disclosure to Google, at the cost of ~200 KB in the repo.
   Arguably a consistency issue: the footer says "Local-first · zero
   telemetry" while every page load calls `fonts.googleapis.com`.
   Recommend: yes.
2. **Rune motif intensity.** Dividers + headings + feature cards + drifting
   hero field is four channels for one motif. Recommend: keep dividers and
   headings, drop the hero field.
3. **Which repo does the landing page scan?** The current demo scores
   75/100 "NEEDS WORK". Recommend keeping it — a tool that shows itself a
   flattering number contradicts §1.
4. **Dark-default stays?** `appearance: "dark"` is set. Recommend: yes, but
   light mode must pass AA regardless (Phase 1).

## 9. Sequencing

Phase 0 → 1 are independent of the rest and worth shipping alone; D1 is a
credibility bug that should not wait for a redesign. Phase 2 is the
critical path for 3 and 5. Phase 4 can run in parallel with 3. Phase 6
last, by definition.

## 10. Implementation record

Phases 0-6 implemented on `site/phase-0-1-truth`, 2026-09-02. Measured
outcomes, including the gates that were not met.

### Gate results

| Phase | Gate                                                                             | Result                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Doctor runs in CI, baseline committed                                            | **Met.** `npm run site:doctor`; Checks 1-5 implemented, 6-7 report as GAP.                                                                                                                                                                                                                                                                                                                |
| 1     | Checks 1, 2, 4, 6 pass                                                           | **Partly met.** 1, 2 and 4 pass. Check 6 (axe) is unimplemented, so it is a gap, not a pass.                                                                                                                                                                                                                                                                                              |
| 2     | Byte-reproducible; height ≤ 4200px; no sideways scroll at 360px; copy round-trip | **Partly met.** Reproducible by construction (regenerated from the drift-locked SVG each build). No sideways scroll at 360px, and the verdict block fits without panning. **Height gate missed: 5414px**, not ≤ 4200 — but the page also gained a 575px section in Phase 5, and the defect the gate stood for is resolved: the report went from 2795px (42% of the page) to 1104px (20%). |
| 3     | Verdict visible without scrolling at 1280×720 and 390×844                        | **Met.** Card bottom 709px of 720, and 587px of 844.                                                                                                                                                                                                                                                                                                                                      |
| 4     | Checks 3 and 5 pass; Lighthouse ≥ 95; CLS ≤ 0.05                                 | **Partly met.** Checks 3 and 5 pass. **Lighthouse and CLS not measured** — no Lighthouse in this environment; the claim is unverified, not met.                                                                                                                                                                                                                                           |
| 5     | Every landing claim links to a page that substantiates it                        | **Met**, with one deviation — see below.                                                                                                                                                                                                                                                                                                                                                  |
| 6     | axe clean; keyboard pass; light/dark parity                                      | **Partly met.** Focus states, the 404 and the divider rhythm shipped; contrast parity is proven by Check 1 across both themes. **axe was not run** (Check 6 gap) and no manual keyboard pass was performed.                                                                                                                                                                               |

### Deviation from §5

The six feature cards were **kept**, not replaced by four real findings.
They describe capabilities the rule list does not convey (runtime
forensics, selector health, local-first), and each already links to a
page that substantiates it. The intent behind the item — real rules with
real numbers on the landing page — is served by the new catalog preview
(§5 row 7), which shows five rules selected mechanically from the
registry with their measured FP rates, including an unflattering 19%.

### D10 — found during implementation, not in the original audit

Rendering the report as HTML surfaced a defect the image could not have:
the site's mono face is JetBrains Mono from Google Fonts, whose served
subsets carry no U+2500 box-drawing or U+2580 block glyphs. Those fell
back to a different font, so the deduction table and the score bars
rendered up to **3.6 columns narrow** against the rest of the line —
a report whose columns did not line up. Fixed by giving the terminal the
same font stack `scripts/readme-svg.ts` declares on the SVG. Residual
misalignment is ≤ 0.44 columns on three decorative symbols (`ᚦ`, `✗`,
`ℹ`) that no monospace face carries.

### Two corrections to §2

1. D5 originally said dark mode passed throughout. It was measured
   against the primary background only; Check 1 found three dark failures
   against `--vp-c-bg-soft`. Both themes are now clean. (Recorded in
   §2.1.)
2. The animated `filter: blur(60px)` was flagged in D6 as _plausibly_
   the cause of screenshot capture tearing on the live page. After Phase
   4 removed it, capture works — that is support for the guess, not proof,
   but it is no longer only a guess.

### Checks 6 and 7, and a bug in the checker itself

Both declared gaps were closed. Check 6 is **structural accessibility**
over the built HTML — deliberately not called an axe audit, because it is
not one: it covers `lang`, image `alt`, accessible names on links and
buttons, positive `tabindex`, duplicate ids and heading-order jumps across
all 105 pages. Check 7 validates every internal href against the built
output, which sidesteps the reason VitePress's own checker is disabled
(the `@include`d repo docs carry links that `config.mts` rewrites at
render time — by build output they are final).

**D11 — the checker was silently vacuous.** On first run both checks
"passed". They passed because `` in the patterns had become a literal
backspace byte (U+0008), so `/<img.../` matched nothing, ever. Four
of the six a11y sub-checks were dead and reported success. Found by
injecting known violations into the built HTML and confirming each one is
caught — a check that has never been seen to fail is not evidence of
anything. All seven sub-checks are now proven to fire.

Two false positives were also removed after inspecting the real markup:
a bare `alt` is an _empty_ alt (correct for a decorative image, not a
missing one), and a control whose `title` is bound in a client-only
effect — VitePress's appearance switch fills it in `watchPostEffect`,
which never runs during SSR — cannot be judged from static HTML at all.

### Still open

- A full axe-core audit and a manual keyboard pass.
- Lighthouse performance and CLS are unmeasured.
- The four decisions in §8 are still unanswered; §4's recommendations
  were followed for the rune field (dropped) and the demo repo (kept at
  75/100). Fonts remain on Google Fonts, trimmed from ten files to six.
