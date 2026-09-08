/**
 * The single source of brand truth.
 *
 * Every colour, typeface and motion constant Mjölnir shows a human —
 * terminal, README SVGs, demo video, website, docs, badges — resolves to
 * a value in this file. Nothing else may define one.
 *
 * WHY THIS EXISTS. Before it, the palette existed in six independent
 * copies: `site/.vitepress/theme/styles/vars.css`, `NORSE` in
 * `src/reporter/theme.ts`, `scripts/readme-svg.ts`,
 * `scripts/video/terminal-page.ts`, `scripts/generate-readme-architecture.ts`
 * and the table in `assets/brand/README.md`. Exactly one pair of those
 * was guarded (site-doctor Check 8, doc ↔ vars.css). The unguarded edges
 * are where the shipped surfaces drifted apart: the terminal and the site
 * disagreed on six semantic roles, the architecture diagram invented its
 * own neutral ramp, and the README badges still carried a palette retired
 * two releases earlier. `scripts/brand-doctor.mjs` now checks every edge
 * against this file.
 *
 * PURITY. Pure data. No I/O, no rendering, no environment access, no
 * imports, no logic. Consumers convert (hex → ANSI triplet, hex → CSS)
 * themselves. Same reason `score-state.ts` is pure: it makes the whole
 * thing golden-testable and safe to ship inside the npm package, where
 * it costs a few hundred bytes and replaces values the package already
 * carried anyway.
 *
 * DERIVATION. The palette is the one derived from the logo in PR #20
 * (brushed steel and forge gold under an aurora, over midnight iron).
 * Where the terminal disagreed with it, the terminal converges — see
 * `PENDING_TERMINAL` below. Full rationale: `assets/brand/README.md`.
 *
 * ACCESSIBILITY. Every foreground token in `BRAND` meets WCAG AA
 * (≥ 4.5:1) against every surface token it is allowed to sit on. That is
 * not a claim, it is `brand-doctor` rule 8, which computes the ratios.
 * The weakest legal pairing is `steelDim` on `ink800` at 5.00:1.
 */

/* ── Brand ───────────────────────────────────────────────────── */

/**
 * The two brand hues plus the neutral they sit on.
 *
 * GOLD IS SCARCE. It means forged / certified / earned / decisive — the
 * primary mark, the FORGED state, one call to action. It is not a paint
 * bucket: gold as default text, default border or default heading is a
 * brand-doctor finding, not a style choice.
 *
 * AURORA is verification energy — the secondary, and the hue that marks
 * the runtime half of the trust ladder.
 */
export const BRAND = {
  gold: "#C19A34",
  goldBright: "#E6BD57",
  goldHot: "#F4DC9C",
  /** Pressed / deepest gold — the only step dark enough to carry white. */
  goldDeep: "#A5811C",
  aurora: "#37ABBD",
  auroraBright: "#45C1D4",
  auroraCyan: "#5CBDE0",
  steel: "#C8CBCF",
  steelDim: "#8B939D",
} as const;

/* ── Surfaces ────────────────────────────────────────────────── */

/**
 * Midnight iron. One ramp, four steps, darkest first.
 *
 * `terminal` and `terminalBar` share one tone deliberately: the window's
 * only seam is a hairline ring and an inset shadow, never a second fill.
 * `chromeDot` is the three window dots — see the note on
 * `PENDING_TERMINAL.chromeDots` for why they are no longer red/amber/green.
 */
export const SURFACE = {
  ink950: "#0A1119",
  ink900: "#0C1420",
  ink850: "#111A29",
  ink800: "#18243A",
  /** Raised panel (cards, elevated surfaces). */
  panel: "#141F33",
  /** Soft fill (inline code, quiet chips). */
  soft: "#1A2740",
  /** Terminal body — the deepest tone, so a terminal reads as recessed. */
  terminal: "#0A1119",
  /** Terminal title bar — the same tone; the seam is shadow, not colour. */
  terminalBar: "#0A1119",
  /** The three window dots. One neutral, not a traffic light. */
  chromeDot: "#18243A",
} as const;

/**
 * The hairline. One neutral, expressed as an RGB triple so the site can
 * set divider, border and gutter as three alphas of the same colour
 * instead of three unrelated greys.
 */
export const HAIRLINE_RGB = "198, 204, 214";

/* ── Text ────────────────────────────────────────────────────── */

export const TEXT = {
  primary: "#EAEEF5",
  secondary: "#ABB6C6",
  muted: "#8B939D",
  /** Ink for text set ON gold (buttons, the FORGED chip). 7.17:1 on `gold`. */
  onGold: "#0A1119",
} as const;

/* ── Status ──────────────────────────────────────────────────── */

/**
 * Non-score status. `ok` is the one green in the system and it is NOT a
 * score colour — it survives only for contexts with no worthiness
 * meaning ("autofix applied", "analysis complete"). A green score would
 * say "your software is fine", which is the exact claim this product
 * refuses to make.
 */
export const STATUS = {
  ok: "#4FB477",
  info: "#5CC4E0",
  warning: "#E6BD57",
  error: "#EC6B66",
} as const;

/* ── Score bands ─────────────────────────────────────────────── */

/**
 * The four ScoreState bands plus the unmeasured state. Band thresholds
 * and runes live in `src/reporter/score-state.ts`, which stays free of
 * colour — it emits a palette KEY and each surface resolves it here.
 *
 * `unmeasured` is steel-dim on purpose. UNKNOWN is a legitimate answer,
 * not a failure: colouring it red would make "we did not measure this"
 * look like "this is broken", which is precisely the dishonesty the
 * north-star law exists to prevent.
 */
export const SCORE = {
  critical: "#EC6B66",
  warning: "#E6BD57",
  trusted: "#5CC4E0",
  forged: "#F4DC9C",
  unmeasured: "#8B939D",
} as const;

/* ── Evidence levels ─────────────────────────────────────────── */

/**
 * E0 → E1 → E2 is a certainty ramp, and it is deliberately HUE-FREE.
 *
 * Evidence level says how sure we are, not whether the news is good. A
 * deterministic proof (E2) is a defect we are certain about — painting
 * it gold or green would read as an achievement. So certainty is carried
 * by brightness alone, and the *shape* does the real work:
 *
 *     E0  open ring        observation, no weight
 *     E1  half-filled      pattern evidence, half weight
 *     E2  sealed           deterministic proof, full weight
 *
 * Colour never carries this alone (R11): the geometry is the signal and
 * survives `--ascii`, `NO_COLOR` and monochrome print.
 */
export const EVIDENCE = {
  e0: "#8B939D",
  e1: "#ABB6C6",
  e2: "#EAEEF5",
} as const;

/* ── Trust ladder ────────────────────────────────────────────── */

/**
 * L0–L5, and the most important boundary in the product.
 *
 * L0–L2 are STATIC: the neutral steel ramp, brightening to the static
 * ceiling at L2. L3–L5 require a real run, and the hue changes to aurora
 * exactly there. The boundary is a hue break, not a gradient step,
 * because it is a change of kind and not of degree — a static-only
 * finding can never climb past L2, however confident it is.
 *
 * Every surface that draws the ladder must draw that break.
 */
export const TRUST = {
  l0: "#8B939D",
  l1: "#ABB6C6",
  l2: "#C8CBCF",
  l3: "#37ABBD",
  l4: "#45C1D4",
  l5: "#5CC4E0",
} as const;

/** Where the ladder stops being static. Rungs at or above this index
 * require runtime corroboration; nothing below it may be drawn as if it
 * did. */
export const TRUST_RUNTIME_BOUNDARY = 3;

/* ── Typography ──────────────────────────────────────────────── */

/**
 * Two faces carry the whole product, and a third appears only in display
 * moments. Before this, the site used Inter + JetBrains Mono + Cinzel
 * while the README SVGs and the video used Geist + Geist Mono — a README
 * asset and a website page shared no letterform at all.
 *
 * Geist and Geist Mono are vendored (`assets/readme/fonts`,
 * `scripts/video/fonts.ts`) and embedded into the SVGs and the video, so
 * the same shapes render with no network at all. Cinzel is the one
 * display face and is self-hosted.
 *
 * Every stack ends in a real system fallback: the layout must stay
 * graceful when no webfont loads.
 */
export const TYPOGRAPHY = {
  display: {
    family: "Cinzel",
    weights: [600],
    stack: `"Cinzel", "Trajan Pro", "Iowan Old Style", Georgia, "Times New Roman", serif`,
    /** Display type is caps or title-case, always tracked out. */
    letterSpacing: { tight: "0.04em", wide: "0.18em", widest: "0.32em" },
  },
  sans: {
    family: "Geist",
    weights: [400, 500, 600],
    stack: `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
  },
  mono: {
    family: "Geist Mono",
    weights: [400, 500],
    /** `MjolnirMono` is the embedded @font-face name used inside SVG and
     * the video render page; the web stack names the real family. */
    embeddedFamily: "MjolnirMono",
    stack: `"Geist Mono", ui-monospace, "SFMono-Regular", "Cascadia Mono", Consolas, monospace`,
  },
  /** Rune glyph fallback only — never a text face. */
  runes: { family: "FreeMono", embeddedFamily: "MjolnirRunes" },
  /** Body copy sits at 1.7; the display face never sets body copy. */
  lineHeight: { body: 1.7, tight: 1.35 },
} as const;

/* ── Motion ──────────────────────────────────────────────────── */

/**
 * Deliberate, heavy, controlled. Motion in Mjölnir exists to show a
 * state changing — a scan resolving, a score settling, a finding
 * arriving — never to decorate.
 *
 * The easing is asymmetric on purpose: quick to leave, slow to settle,
 * like something heavy coming to rest. Nothing loops, nothing pulses,
 * nothing glows. Every animation must be inert under
 * `prefers-reduced-motion: reduce`.
 */
export const MOTION = {
  duration: {
    instant: 0,
    quick: 120,
    base: 240,
    slow: 480,
    /** State-change moments only (a score resolving to its band). */
    forge: 900,
  },
  easing: {
    /** Default: leaves quickly, settles slowly. */
    settle: "cubic-bezier(0.2, 0, 0, 1)",
    /** Entrances. */
    enter: "cubic-bezier(0.16, 1, 0.3, 1)",
    linear: "linear",
  },
} as const;

/* ── Badges ──────────────────────────────────────────────────── */

/**
 * shields.io takes hex without the `#`. These are the ONLY colours any
 * badge in any of the 23 READMEs may use — brand-doctor rule 7 checks
 * all of them. They previously carried `C9A227`/`0B0F17`/`2E8C7F`, a
 * palette retired in PR #20 and still shipping 92 times across the
 * translated set.
 */
export const BADGE = {
  primary: "C19A34",
  label: "0A1119",
  secondary: "37ABBD",
} as const;

/* ── Terminal palette, pending convergence ───────────────────── */

/**
 * TEMPORARY. The terminal's shipped values, quoted here so Phase 1 of
 * the brand-unification plan is a pure refactor with zero visual change
 * — and so the divergence is visible in exactly one place instead of
 * being invisible across six.
 *
 * Every entry below is a role that disagrees with the canonical token it
 * names. Phase 4 retargets `src/reporter/theme.ts` and the SVG/video
 * chrome to the canonical values, regenerates the assets, and deletes
 * this block. `brand-doctor` rule 2 fails until then, by design: the
 * gate reports the drift it was built to report rather than being
 * taught to ignore it.
 *
 *   role        shipped     canonical         why it changes
 *   ────────────────────────────────────────────────────────────────
 *   background  #08090A     SURFACE.terminal  neutral near-black → the brand's ink
 *   fg          #D7D3C8     TEXT.secondary    warm parchment → the one text ramp
 *   bold        #EDE6D6     TEXT.primary      bone white → the one text ramp
 *   accent      #8AB4D8     BRAND.steel       frost blue → brushed steel
 *   info        #3FB0A0     BRAND.aurora      teal → aurora
 *   warning     #E0A526     STATUS.warning    amber → forge gold
 *   error       #D0453B     STATUS.error      rune-red at 4.36:1 → 6.20:1 (fixes the one AA failure)
 *   dim         #7C8590     TEXT.muted        weathered stone → steel-dim
 *   chromeDots  3 × macOS   SURFACE.chromeDot red/amber/green → one neutral dot
 *
 * `ok`, `trusted` and `forged` already agree with the canonical tokens
 * and are absent from this block.
 */
export const PENDING_TERMINAL = {
  background: "#08090A",
  foreground: "#D7D3C8",
  bold: "#EDE6D6",
  accent: "#8AB4D8",
  info: "#3FB0A0",
  warning: "#E0A526",
  error: "#D0453B",
  dim: "#7C8590",
  /** macOS traffic lights in the three README SVG generators, in draw
   * order. Replaced by one neutral `SURFACE.chromeDot`. */
  chromeDots: ["#ff5f56", "#ffbd2e", "#27c93f"],
  /** The video's own window dot. Already neutral — it is the precedent
   * the README stills converge on — but `#323232` is a bare grey that
   * belongs to no ramp. Becomes `SURFACE.chromeDot`. */
  videoChromeDot: "#323232",
  /** The video's removed-line red. Differs from both the terminal's
   * `error` and the canonical `STATUS.error`; a third red for one
   * purpose. Becomes `STATUS.error`. */
  videoRemove: "#E5544E",
} as const;

/**
 * TEMPORARY. Three off-ramp neutrals the site still holds, quoted here
 * so the drift is visible in one place.
 *
 *   shipped                  canonical         why it changes
 *   ──────────────────────────────────────────────────────────────────
 *   heroInk    #0b1420       SURFACE.ink900    one hex off the ramp, for no reason
 *   heroMuted  #9aa6b6       TEXT.secondary    a fourth text grey
 *   heroNameTop #dfe4ec      BRAND.steel       a gradient stop above the steel ramp
 *
 * Inter and JetBrains Mono used to be quoted here too. They are gone:
 * the site now ships Geist and Geist Mono, the faces the README SVGs and
 * the demo video already embed, self-hosted from site/public/fonts.
 */
export const PENDING_SITE = {
  heroInk: "#0b1420",
  heroMuted: "#9aa6b6",
  heroNameTop: "#dfe4ec",
} as const;

/**
 * TEMPORARY, same deal: the neutral ramp
 * `scripts/generate-readme-architecture.ts` invented for itself. Neither
 * `vars.css` nor `NORSE` contains any of these. Phase 4 maps each onto
 * the `SURFACE` ramp and deletes this block.
 *
 *   shipped    role in the diagram        canonical
 *   ───────────────────────────────────────────────────────
 *   #0C0E12    page                       SURFACE.ink950
 *   #0E1013    band fill                  SURFACE.ink900
 *   #15181D    card fill                  SURFACE.ink850
 *   #1C2026    card stroke                SURFACE.ink800
 *   #39414B    hairline                   SURFACE.ink800
 *   #5A6169    quiet label                TEXT.muted
 *   #4A3D1B    gold shadow                (dropped — gold needs no shadow tint)
 */
export const PENDING_ARCHITECTURE = {
  page: "#0C0E12",
  band: "#0E1013",
  card: "#15181D",
  cardStroke: "#1C2026",
  hairline: "#39414B",
  quietLabel: "#5A6169",
  goldShadow: "#4A3D1B",
} as const;

/* ── CSS emission ────────────────────────────────────────────── */

/**
 * The `--mj-*` spelling of the tokens above, in emission order. The
 * generator (`npm run brand:tokens`) writes
 * `site/.vitepress/theme/styles/vars.css` from this list, so the site
 * cannot hold a value this file does not.
 *
 * Names are kept exactly as PR #20 shipped them — every rule in the
 * VitePress theme already resolves them, and renaming tokens to tidy the
 * vocabulary would be churn with no reader-visible benefit.
 */
export const CSS_TOKENS: readonly (readonly [
  name: string,
  value: string,
  comment?: string,
])[] = [
  ["--mj-ink-950", SURFACE.ink950, "deepest background (hero, terminal)"],
  ["--mj-ink-900", SURFACE.ink900, "page background"],
  ["--mj-ink-850", SURFACE.ink850, "surface"],
  ["--mj-ink-800", SURFACE.ink800, "raised surface"],
  ["--mj-steel", BRAND.steel, "neutral bright — headings on ink"],
  ["--mj-steel-dim", BRAND.steelDim, "muted text on ink"],
  ["--mj-gold", BRAND.gold, "primary brand — scarce"],
  ["--mj-gold-bright", BRAND.goldBright, "primary on dark"],
  ["--mj-gold-hot", BRAND.goldHot, "highlight, forged"],
  ["--mj-aurora", BRAND.aurora, "secondary — verification energy"],
  ["--mj-aurora-bright", BRAND.auroraBright, "secondary on dark"],
  ["--mj-aurora-cyan", BRAND.auroraCyan, "informational"],
] as const;

/** Semantic score/verdict tokens, emitted after the palette. */
export const CSS_SEMANTIC: readonly (readonly [
  name: string,
  value: string,
  comment?: string,
])[] = [
  ["--mj-trusted", SCORE.trusted, "score band 80–99"],
  ["--mj-trusted-bright", "#7FD4EA", "trusted, hover"],
  ["--mj-forged-hot", SCORE.forged, "score 100"],
  ["--mj-needswork", SCORE.warning, "score band 50–79"],
  ["--mj-unworthy", SCORE.critical, "score band 0–49"],
  ["--mj-info", STATUS.info, "informational"],
  ["--mj-ok", STATUS.ok, "non-score success only — never a score colour"],
  ["--mj-e0", EVIDENCE.e0, "observation"],
  ["--mj-e1", EVIDENCE.e1, "pattern evidence"],
  ["--mj-e2", EVIDENCE.e2, "deterministic proof"],
  ["--mj-l0", TRUST.l0, "trust L0 — static"],
  ["--mj-l1", TRUST.l1, "trust L1 — static"],
  ["--mj-l2", TRUST.l2, "trust L2 — static ceiling"],
  ["--mj-l3", TRUST.l3, "trust L3 — runtime begins"],
  ["--mj-l4", TRUST.l4, "trust L4 — runtime"],
  ["--mj-l5", TRUST.l5, "trust L5 — runtime verdict"],
] as const;
