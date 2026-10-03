# Classifying the baseline failure

Read on authoring a skill. A sibling file because it is a branch: an agent
running a proper RED never needs to read this, and an agent that cannot run one
needs all of it.

## Match the form to the failure

Classify the baseline failure first. The form that fixes one failure type
measurably backfires on another, so reaching for the same shape every time is a
mistake.

| Baseline failure | Right form |
| --- | --- |
| Skips a rule it knows, under time or sunk-cost pressure | Prohibition plus a rationalization table plus red flags |
| Complies but the output has the wrong shape | A positive recipe: state what the output IS, in order |
| Omits a required element from something it already produces | Structural: make it a required slot in the template |
| Behaviour should depend on a condition | Conditional keyed to something observable |

Two rules that apply to whichever you pick. **No nuance clauses** — "don't X
unless it matters" reopens the negotiation; express a real exception as its own
condition. **Exemption clauses do not scope** — "this doesn't apply to code
blocks" still suppresses code blocks; restructure instead.

For this repository specifically, a skill that restates a law is the wrong
form. `CLAUDE.md` law 2 is enforced by a gate; the skill should route to the
gate and to `rule-author`, not paraphrase the law in softer words.

## When there is no baseline run

A new skill on a workflow nobody has hit has no failure to observe yet. The
substitute is a **discoverability audit**, and it is weaker, so know which you
have. For each load-bearing fact in the draft, ask whether it is reachable from
the repository today: `rg` the live docs, `CLAUDE.md`, `CONTRIBUTING.md` and the
gate source for it.

- **Not found anywhere** → the fact is load-bearing and the skill is earning its
  keep. Say so in the changelog entry.
- **Found in exactly one place, deep in source** → the skill is a pointer. Keep
  it only if reaching the source costs more than the line costs.
- **Found in a doc the agent would plausibly read** → **cut it.** A skill that
  repeats a live doc is a second copy that can drift, and the doc already had a
  reader.

What this does not prove is that the skill *works*. It proves the knowledge was
not already available — necessary, and not sufficient. Only watching an agent
use it answers that. Say which of the two you did: a discoverability audit
reported as a behavioural test is the exact substitution the north-star metric
exists to catch.

## Worked example

The eight skills added to this repository in one session were audited this way
rather than by running a baseline, because no agent had yet attempted the tasks
they cover. `change-gate` came back with nothing reachable outside
`docs/archive/`; the rule-ID prefix table existed only in `src/rules/index.ts`;
the quad-leg vocabulary only in source and an archived plan; the ID non-reuse
rule turned out to be documented already, so that line stayed as a guardrail
rather than as novelty. The audit and its limit are both recorded in the
changelog entry for that change.