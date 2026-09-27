# ADR 0011 — The six claim axes are orthogonal and never merged

**Status:** accepted · **Amends:** A1 §orthogonality · **Affects:** every
renderer, every report, every schema

## Context

The product describes a single object — "a claim about a repository" —
using **six independent axes**:

| Axis               | Vocabulary                                                                         | Question it answers                         |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| **Trust level**    | `L0`–`L5`                                                                          | How much do we trust _this finding_?        |
| **Maturity**       | `M0`–`M5`                                                                          | How much has this _capability_ been proven? |
| **Evidence state** | `FRESH · STALE · FOREIGN · NOT_RUN · PARTIAL · CONTRADICTORY · INVALID · UNKNOWN`  | Is this _evidence_ current and admissible?  |
| **Determination**  | `PASS · FAILED · BLOCKED · INCONCLUSIVE · UNPROVEN · PARTIAL`                      | What is the _verdict_?                      |
| **Lifecycle**      | `PROPOSED · EXPERIMENTAL · PROVISIONAL · VERIFIED · PROVEN · DEPRECATED · RETIRED` | Where is this _rule_ in its career?         |
| **Severity**       | technical · trust impact · policy severity                                         | How much does it _matter_?                  |

None of these is derivable from another. `M5 FIELD_PROVEN` (the
capability is proven) says nothing about whether the _finding_ in front of
you is `L3` or backed by `FRESH` evidence. `STALE` evidence does not make
a verdict `PARTIAL`; it makes it inadmissible. `RETIRED` is a lifecycle
fact, not a severity.

The repository has **already paid for merging two of these axes**:
`src/reporter/score-state.ts:6-9` documents thresholds that
"previously disagreed 3×" between terminal and badge, and
`src/reporter/evidence-tag.ts:1-7` documents a duplicated ternary chain
that had to be collapsed into "a single definition site". Those are the
same defect: one decision, several definitions.

## Decision

**The six axes are orthogonal. No renderer may merge them, and every
renderer must resolve all six from one source.**

1. **Orthogonality is declared, not implied.** `ORTHOGONAL_AXES` in
   `src/v6/maturity.ts` enumerates the six axes with their closed
   vocabularies and is the single declaration of that fact.
2. **One Presentation Model** owns every presentation decision derived
   from the six axes: score state, evidence tag, trust-level rune,
   maturity badge, determination precedence, severity label, palette key,
   headline template, next-action affordance. It is **I/O-free**; each
   surface adapts only palette, rune and width.
3. **A renderer that needs a combined value gets a derived one, with the
   derivation in the model** — never a hardcoded threshold, label or
   badge.
4. **A schema that carries two axes must carry both fields
   independently.** No field may be a blend, and no field may be named
   after one axis while holding the other's vocabulary.
5. **Merging is a test failure**, not a review comment.

## Consequences

**Forbids**

- A token, glyph, label or CLI flag that renders two axes in one glyph.
- A threshold declared outside the threshold registry (ADR 0011's
  companion: L4, `thresholds:parity`).
- A presentation decision in a surface module.
- A schema field whose vocabulary belongs to a different axis than its
  name.

**Costs**

- More surface area in the presentation model, and a Wave-10 migration
  of every renderer.
- Wider output in some places (two columns instead of one merged score).
  That is the point: the merge was the defect.

## Rejected alternatives

| Alternative                                                 | Why rejected                                                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Document the orthogonality and keep per-surface logic       | Documentation is what already failed three times.                                                           |
| One "confidence" field that blends trust level and maturity | Recreates exactly the 3× threshold drift, now with a worse name.                                            |
| Render axes as a composite score                            | ADR 0004 already demoted the composite; a composite _axis_ would be the same problem inside a single value. |

## Enforcement

| Mechanism               | Location                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Declaration             | `ORTHOGONAL_AXES` in `src/v6/maturity.ts`                                                                |
| Single model            | `src/reporter/presentation-model.ts` (Wave 10, U1)                                                       |
| No hardcoded thresholds | `thresholds:parity` (L4) + `presentation:parity` (U1)                                                    |
| Cross-surface agreement | `parity:projection`, `surface:parity` — same repo + SHA + config + version ⇒ same axes, on every surface |
| Golden lock             | `golden:replay` (R2) — render, exit code and digest locked per scenario                                  |
