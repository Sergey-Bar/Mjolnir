# Mjölnir — the brand system

One palette, two typefaces, three marks, and a gate that will not let
them drift apart again.

This is the canonical document. Colour, typography and symbols all live
here rather than in three files that could disagree — which is the same
principle the system itself is built on. The machine-readable form is
[`assets/brand/tokens.json`](../../assets/brand/tokens.json), generated
from [`src/brand/tokens.ts`](../../src/brand/tokens.ts).

| Document                                                   | What it holds                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| **this file**                                              | colour, typography, symbols, the rules that govern them        |
| [`DESIGN-TOKENS.md`](DESIGN-TOKENS.md)                     | the token reference, generated from the source                 |
| [`BRAND-SURFACE-INVENTORY.md`](BRAND-SURFACE-INVENTORY.md) | every surface, its state, and who enforces it                  |
| [`MOTION-SYSTEM.md`](MOTION-SYSTEM.md)                     | how things move, and when they must not                        |
| [`VOICE-AND-TERMINOLOGY.md`](VOICE-AND-TERMINOLOGY.md)     | how it sounds; extends `docs/TERMINOLOGY.md`, never repeats it |

---

## 1. The one rule

**Every colour, typeface and motion constant Mjölnir shows a human
resolves to a value in `src/brand/tokens.ts`. Nothing else may define
one.**

`npm run brand:doctor` fails CI if anything does — eight rules covering
the site variables, the terminal palette, the SVG and video chrome, the
generated assets, this documentation, hex literals anywhere in the
reporter or the generators or the site theme, the badges in all 23
READMEs, and the computed WCAG contrast of every declared pairing.

`npm run brand:doctor:selftest` seeds a deliberate violation of each
rule and requires the gate to reject it, then restores the file. A check
that has never been observed rejecting an invalid state is not evidence.
The transcript is committed at
[`gate-evidence/`](gate-evidence/brand-doctor-selftest.txt).

## 2. Why this exists

The palette used to live in six independent copies: the site's
`vars.css`, `NORSE` in the terminal reporter, the README SVG helpers,
the video's render page, the architecture generator, and a table in the
brand document. Exactly one pair of those was checked.

Every unguarded edge had drifted:

- the terminal and the site disagreed on six semantic roles
- the architecture diagram had invented a seven-step neutral ramp of its
  own that existed nowhere else
- the three README terminal stills wore macOS traffic lights
- the badges in all 23 READMEs still carried a palette retired two
  releases earlier — 92 stale values nobody was counting
- the terminal's error red measured 4.36:1 on its own background, below
  WCAG AA, and nothing had ever computed it

None of that was carelessness. It is what happens to any system whose
consistency depends on people remembering.

## 3. Colour

### The palette

Brushed steel and forge gold under an aurora, over midnight iron —
derived from the logo. See [`DESIGN-TOKENS.md`](DESIGN-TOKENS.md) for
every value.

| Group      | Role                                                            |
| ---------- | --------------------------------------------------------------- |
| `brand`    | gold (4 steps), aurora (3), steel (2)                           |
| `surface`  | the midnight-iron ramp, plus the terminal ground and its chrome |
| `text`     | primary, secondary, muted, and the ink used on gold             |
| `status`   | ok, info, warning, error — non-score status                     |
| `score`    | the four ScoreState bands, plus unmeasured                      |
| `evidence` | E0, E1, E2                                                      |
| `trust`    | L0–L5                                                           |
| `tint`     | pale fills for diagrams rendered on a ground we do not own      |

### Gold is scarce

Gold means **forged, certified, earned, decisive**: the mark, the FORGED
state, one call to action. It is not a paint bucket. Gold as default
text, default border, default heading, or as ornament on a horizontal
rule is a finding, not a style choice — that last one was real, and the
section dividers now carry a neutral lozenge instead.

### Green is not a score colour

`status.ok` is the one green, and it appears only where there is no
worthiness meaning: "autofix applied", "analysis complete". A green
score would say "your software is fine", which is the exact claim this
product refuses to make. `WORTHY` renders in aurora-cyan.

### The badge is peripheral, but not unchecked

`ScoreState` is the truth; the badge is a downstream rendering of it.
That was already documented — and it was being used as cover. The badge
sent shields.io's **named** colours, and two of them did not mean what
the code's comment said they meant: `important` resolves to `#ea7233`,
an orange, so every `WORTHY` badge rendered the trusted band in a
warning hue; `success` resolves to green, so a 100 said "your software
is fine".

It now sends `BADGE_BAND` hex. Those values are deeper than the score
tokens for a reason that is not taste: shields sets the message text in
white and gives you no say in it, so `score.forged` under white measures
1.35:1 — an unreadable badge, shipped to look on-brand. The deep steps
put every band between 4.9 and 6.3:1, where the named colours it
replaced ranged 1.95 to 4.24.

The badge also wore `namedLogo: "vitest"` — someone else's mark, on the
image people paste into their own READMEs. Removed.

### UNKNOWN is neutral, never red

`score.unmeasured` is steel-dim, and so is the "no test files detected"
node in a generated mermaid diagram. "This was not measured" is a
legitimate answer; rendering it as a failure is the same dishonesty as a
CI gate reporting green without having run.

### Accessibility is computed, not asserted

Every foreground token clears WCAG AA against every surface it is
allowed to sit on; the weakest legal pairing is `steelDim` on `ink800`
at 5.00:1. Two tokens (`text.onGold`, `brand.goldDeep`) are backgrounds
and are checked the other way round. Diagram tints are checked for both
text (AA) and stroke (the 3:1 non-text minimum). All of it is
`brand-doctor` rule 8, which does the arithmetic on every run.

## 4. Typography

| Role                                 | Face           | Weights     |
| ------------------------------------ | -------------- | ----------- |
| Display — `MJÖLNIR`, `FORGED`, marks | **Cinzel**     | 600         |
| Body, UI                             | **Geist**      | 400/500/600 |
| Code, terminal, scores, rule IDs     | **Geist Mono** | 400/500     |
| Rune glyph fallback only             | FreeMono       | —           |

Two faces carry the whole product. Before this the website loaded Inter,
JetBrains Mono and Cinzel while the README SVGs and the demo video
embedded Geist and Geist Mono: **a README asset and a website page
shared no letterform at all.**

- **Self-hosted.** `npm run brand:fonts` vendors the latin and latin-ext
  woff2 subsets into `site/public/fonts` and pins each by sha256.
  `npm run brand:fonts:check` re-verifies the committed bytes offline,
  and that is what CI runs. The build never fetches a font, and the page
  needs no third party to render its own wordmark.
- **The SVGs and the video embed the TTFs** as base64, so a README still
  and a video frame are the same shapes with no network at all.
- **Every stack ends in a real system fallback.** The layout must stay
  graceful when no webfont loads.
- **A retired face may not return, even as a fallback.** A fallback
  entry downloads nothing but it still renders, which is how a page ends
  up looking like two products on a machine that happens to have Inter.
  `brand-doctor` rule 1 fails on the name appearing anywhere in a stack.
- **Never set body copy in the display face.** Display is caps or
  title-case, tracked out 0.04–0.32em; body sits at line-height 1.7.
- **Scores are always mono.** The digits never appear in the display
  face; colour lands on the verdict word and the instrument, not the
  number.

## 5. Symbols

Three marks carry the product's epistemics. Their geometry lives in
[`src/brand/symbols.ts`](../../src/brand/symbols.ts), so the SVG
generators, the website and the terminal draw the same idea in their own
medium. Two rules govern all of them:

1. **Geometry carries the meaning; colour only reinforces it.** Every
   mark is distinguishable in monochrome, under `--ascii`, and under
   `NO_COLOR`.
2. **A mark may never overstate what the product knows.**

### Evidence — a ring that fills

|      | Mark | ASCII | Means               | Weight |
| ---- | ---- | ----- | ------------------- | ------ |
| `E0` | ○    | `( )` | observation         | none   |
| `E1` | ◐    | `(-)` | pattern evidence    | half   |
| `E2` | ●    | `(#)` | deterministic proof | full   |

The fill fraction **is** the scorer's weight, so a reader who never
finds the legend still learns that E1 counts for half of E2, because it
looks like half of E2. The half state is a true half-disc, not a lighter
ring, so it survives monochrome print.

The ramp is deliberately **hue-free**. Certainty is not good news: an E2
finding is a defect we are sure about, and painting it gold or green
would say something the model does not. The site's chip previously used
the score-band colours here — red for E2, blue for E0 — which made one
palette carry two unrelated axes.

### Trust — a ladder that breaks

```
L0  L1  L2  │  L3  L4  L5
static      │  runtime required
```

L0–L2 are the neutral steel ramp, brightening to the static ceiling.
L3–L5 are aurora. Between them is a real gap and a rule.

A gradient would say "more of the same". The break says what is true:
**a static-only finding cannot reach L3 however confident it is.** Any
surface drawing this ladder must draw the break, which is why
`RUNTIME_BOUNDARY` is exported rather than each drawing hardcoding 3.

### Runes — beside a state, never as ornament

The band runes come from
[`score-state.ts`](../../src/reporter/score-state.ts) and belong beside
the verdict they name:

| Band       | Rune |                                        |
| ---------- | ---- | -------------------------------------- |
| critical   | ᚲ    | Kaunan — the torch that burns          |
| warning    | ᚦ    | Thurisaz — the giant at the gate       |
| trusted    | ᛏ    | Tiwaz — victory in worthy hands        |
| forged     | ᛟ    | Othala — the completed, inherited work |
| unmeasured | ᛁ    | Isa — stillness; nothing was measured  |

They are functional: a non-colour signal accompanying a state (R11).
They are **not** decoration. A rune on a feature card, centring a
horizontal rule, or used as a list bullet is a finding — all three were
real, and all three are gone.

The one exception is the hero runefield: ᛗ ᛃ ᛟ ᛚ ᚾ ᛁ ᚱ, read left to
right, is MJÖLNIR in Elder Futhark. That is a wordmark, not wallpaper.

### The mark

The logo is `MJÖLNIR` set in Cinzel 600 — no illustration. Below the
wordmark's legible width it falls back to a single rune, ᛗ (Mansaz) —
the same "M" the hero runefield above already spells the name with, and
deliberately not one of the five verdict runes in the table above, so
the permanent mark can never read as a standing score.

`assets/brand/mark.png` and `logo.png` are the rendered source of truth
(`scripts/generate-brand-marks.ts`, `npm run brand:marks`). Regenerating
and re-locking are how a deliberate change happens; adding illustration,
ornament, or a different typeface to either mark in product surfaces is
not.

## 6. What the visual system must never imply

The brand exists to reinforce the product's epistemics, not to decorate
around them. Nothing in it may suggest that:

- 100 means the software is correct — it means zero findings
- green means guaranteed correctness
- a heuristic is a deterministic proof
- a static scan is a runtime proof
- `UNKNOWN` is a failure

If a visual change would make any of those read as true, it is rejected
however good it looks.
