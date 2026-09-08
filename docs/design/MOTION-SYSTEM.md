# Mjölnir — the motion system

Motion exists to show a state changing. Nothing here moves to be
noticed.

Before this document, motion was **constrained but never defined**:
`scripts/video/pacing.ts` pinned the video's timing, `site-doctor`
Check 5 capped infinite animations, and nothing said what a Mjölnir
transition is. Those two mechanisms stay; this writes down the language
they were already enforcing.

---

## 1. The principle

A scan resolving, a score settling, a finding arriving, a report
scrolling past — these are state changes, and motion makes them legible.
Everything else is still.

Deliberate, heavy, controlled. Quick to leave, slow to settle, like
something with mass coming to rest. Nothing pulses, nothing glows,
nothing loops for atmosphere.

## 2. The constants

From [`src/brand/tokens.ts`](../../src/brand/tokens.ts) — `MOTION`:

| Token     | ms  | Use                                              |
| --------- | --- | ------------------------------------------------ |
| `instant` | 0   | no transition                                    |
| `quick`   | 120 | hover, focus, a control acknowledging a press    |
| `base`    | 240 | the default for anything that moves              |
| `slow`    | 480 | a panel opening, a section revealing             |
| `forge`   | 900 | a state change worth watching — a score settling |

| Easing   | Curve                           | Use                                     |
| -------- | ------------------------------- | --------------------------------------- |
| `settle` | `cubic-bezier(0.2, 0, 0, 1)`    | default; leaves quickly, settles slowly |
| `enter`  | `cubic-bezier(0.16, 1, 0.3, 1)` | entrances                               |
| `linear` | `linear`                        | progress only                           |

Asymmetric on purpose. A symmetric ease reads as light; this reads as
weight.

## 3. Rules

- **`prefers-reduced-motion: reduce` is honoured everywhere.** Not
  softened — inert. Every animated surface must render its final state
  immediately, and a score gauge in particular must show the score, not
  an empty ring. `site-doctor` Check 5 requires every infinite animation
  to be covered, and the generated SVGs carry their own
  `@media (prefers-reduced-motion: reduce)` block.
- **At most four infinite animations on a page**, enforced by
  `site-doctor`. The site currently ships three.
- **The page must be correct with no JavaScript at all.** Values are
  rendered server-side at their real numbers; animation only moves an
  already-correct page. An empty gauge reading 0/100 while a counter
  spins up would be the page asserting something false for as long as
  the animation lasts.
- **No motion carries meaning on its own.** If an animation is the only
  thing communicating a state, the state is not communicated.
- **No parallax, no scroll-jacking, no particles, no cinematic
  transitions, no constant glow.**

## 4. The video

The demo is 42.7 seconds at 2560×1440 / 30 fps, and its timing is data,
not feel: `pacing.ts` holds every constant, and the renderer is a pure
function of (script, pacing, frame index) with no wall clock anywhere.
That is what makes the timeline reproducible rather than merely
repeatable.

| Constant               | Demo | Tour |
| ---------------------- | ---: | ---: |
| frames per typed char  |    3 |    3 |
| frames per output line |    2 |    6 |
| frames per patch line  |    4 |    6 |
| hold after a beat      |   70 |  110 |
| final hold             |   90 |  120 |
| linger                 |   75 |   90 |

`lingerOn` is content-derived: a revealed line containing `WORTHINESS`
earns an extra pause, because the score is the point of the report and
otherwise scrolls out of view within two seconds. Content-derived means
deterministic — the same capture pauses in the same places.

Pacing lives outside the committed scripts deliberately. Those files are
evidence, and a contract asserts they still match what the CLI prints;
if timing lived there too, retiming a beat would read as CLI output
drift and the content contract would cry wolf over a purely
presentational edit.

**The story is not a motion decision.** A real false-green CI gate,
found; the fix the tool itself printed, applied; a real re-scan proving
it. Every frame is real CLI output. Motion may change how that is paced.
It may not change what it shows, and no frame may be composed to imply
a result the scan did not produce.

## 5. Encoding

`npm run docs:video` renders and publishes in one step; the committed
`assets/video/mjolnir-demo.mp4` is what it produces, and
`video-media.spec.ts` checks the committed file on every checkout. CRF
is calibrated to the 12 MB budget by measurement — 31.2 MB at 18,
18.7 MB at 24, 9.9 MB at 32 — not chosen by feel.
