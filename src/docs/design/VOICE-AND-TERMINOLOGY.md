# Mjölnir — voice

How the product sounds. What the words _mean_ is
[`docs/TERMINOLOGY.md`](../TERMINOLOGY.md), which is the canonical
glossary and is enforced by `tests/contract/docs-consistency.spec.ts` —
this file does not repeat a single definition from it.

---

## 1. The register

Precise. Confident. Restrained. Technical. Honest. Slightly mythic, and
only slightly.

Mjölnir's strongest marketing advantage is that it does not oversell.
The voice has to earn that every sentence: a tool whose entire argument
is "a green pipeline is a claim, not a proof" cannot itself make claims
it has not proved.

The mythology is in the vocabulary the product already owns — worthy,
forged, evidence, trust — not in adjectives. Write like an engineer who
respects the reader, and let the Norse register sit in the nouns.

## 2. Words we do not use

Not without something measured standing behind them:

> revolutionary · game-changing · next-generation · AI-powered magic ·
> effortless · seamless · blazing-fast · simply · just

"Simply" and "just" are on the list for a different reason: they tell a
reader that whatever they are struggling with is easy, which is either
untrue or unkind.

## 3. Claims

- **Say the number, name the source.** "75/100 on the demo repo" beats
  "high accuracy". Every number on a public surface is generated from a
  real scan or it does not ship — that is the site law, and
  `site-doctor` Check 2 enforces it.
- **Name a limit before someone finds it.** The README has a "What
  Mjölnir cannot tell you" section on purpose. It is not a disclaimer,
  it is the argument.
- **Never round silence up.** `UNKNOWN`, `PARTIAL`, "not measured" and
  "no baseline" are answers. Writing around them to sound more
  confident is the failure mode the product exists to attack.
- **Do not let visual polish do what prose may not.** A layout that
  makes a heuristic look deterministic is the same defect as a sentence
  that says so.

## 4. The lines that are fixed

Two, and they are the same everywhere:

```
Mjölnir — Verification Trust Engine
Tests tell you what passed. Mjölnir tells you what you can trust.
```

The site hero once said "Your tests are lying to you. We prove it."
Accusatory, and less accurate: tests are not lying, they are answering
a narrower question than people read them as. Precision is the more
persuasive of the two, and it is the one that is true.

## 5. State vocabulary

The verdict words are contract-stable output, property-locked in
`tests/scoring-precision.spec.ts`. They are not adjustable for tone:

```
UNWORTHY · NEEDS WORK · WORTHY · FORGED · UNKNOWN · PARTIAL
```

`FORGED` is the 100 state and reads as a certification, not as a
superlative. It means zero findings — never "your software is correct".
`verdictFor()` still returns `WORTHY` at 100 to preserve the three-band
public contract.

## 6. In the terminal

The reporter speaks in the same voice, with less room:

- Findings state **what was found, what it costs, how to fix it, and how
  to verify the fix** — in that order.
- Evidence is stamped in the line, not implied: `[E2 · deterministic]`,
  `[E1 · heuristic · measured FP 14% · n=38]`. A measured false-positive
  rate is quoted where one exists and omitted where none does. Never
  estimated.
- The headline per band is a statement about the hammer, not about the
  reader: "The hammer holds — but 27 findings weigh it down."
- Colour never carries a state alone. A rune, a glyph or a word always
  accompanies it, and `--ascii` and `NO_COLOR` must stay meaningful.

## 7. Untrusted text

Finding metadata — file paths, plugin rule messages — is data from
somewhere else and reaches a terminal or a PR comment. `sanitizeData()`
strips ANSI escapes and C0 controls before any renderer sees it. A
hostile filename must not be able to forge output that looks like
Mjölnir speaking.
