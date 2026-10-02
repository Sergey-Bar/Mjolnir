---
name: skill-author
description: Use when creating a new agent skill in `.claude/skills/`, editing an existing one, or deciding whether a workflow deserves a skill at all. Covers the frontmatter contract, description wording, token budgets, and the baseline-failure discipline for this repository's skill tree.
---

# Author a skill

Adapted from `obra/superpowers` `writing-skills` (MIT), scoped to this
repository. The load-bearing idea is unchanged: **a skill is TDD applied to
process documentation.** If you have not watched an agent get this wrong
without the skill, you do not know the skill teaches the right thing.

## What a skill is

A reference guide for a proven technique, pattern or procedure — reusable
across tasks. Not the story of how you solved one problem once. If the content
belongs in `CLAUDE.md` rather than a skill, put it in `CLAUDE.md`: laws are
asserted by `tests/contract/docs-consistency.spec.ts`, skills are not, and a
law that is only prose is not a gate.

## Where it goes

```
.claude/skills/<name>/SKILL.md
```

`.claude/skills/` is the tracked location — `.gitignore` ignores `.kilo/`,
`.agents/` and the rest of the agent-tool state, so a skill written there is
never committed and never shared. `kilo.json` points `skills.paths` at
`.claude/skills`, so one copy serves both harnesses.

## The frontmatter contract

```yaml
---
name: skill-name          # MUST equal the directory name
description: Use when …
---
```

- `name` — lowercase letters, numbers and hyphens only. **It must match the
  parent directory name**, or the skill does not load on Kilo.
- `description` — third person, max 1024 characters. Start with "Use when".
- Keep the frontmatter under 500 characters if you can; it is loaded into
  every session whether or not the skill fires.

## Description = when to use, not what it does

This is the highest-leverage part of the whole file, and getting it wrong is
how a skill gets skipped.

An agent reads the description to decide whether to open the skill. A
description that summarises the workflow becomes a shortcut the agent follows
instead of reading the body — the body becomes documentation nobody opens.

```yaml
# ❌ summarises the workflow; the agent does one review and stops
description: Use for reviews — dispatches a subagent per task with review between tasks

# ✅ triggering conditions only
description: Use when reviewing a branch or uncommitted changes in this repository
```

Also: no first person, no "I can help you", and use the words a person would
actually type — `false-green`, `quarantine`, `must-not-fire`, `fixture`, `verb
budget`, `stale stamp` — not synonyms the agent would not search for.

## Token efficiency

Every skill description is resident context. Bodies load on demand. So the
question a body has to answer is: **what is the cheapest shape that still gets
the procedure followed?**

Sort the content first, because the two shapes have different budgets.

**A procedure** is read front to back and every line executes in order. It has a
word budget — a hard figure, set from the measured maximum so that "is this over
budget?" has an answer instead of a judgement call. `budget.md` beside this file
carries the number, the measurement behind it, and how to re-take it. Split an
over-budget procedure into branches, not fragments: a branch gets a heading you
can jump to, a fragment gets re-read in a different order and the order was the
point.

**A lookup table** is scanned for one row: prefixes, pattern catalogues,
claim-to-evidence pairs. It is **always** a sibling file, never part of
`SKILL.md`. Nobody reads twenty-two patterns to fix one sentence, so the other
twenty-one are context bought for nothing. `prose-honesty` moved its catalogue
to `patterns.md` for exactly this, taking its body from 126 lines to 85.

> The upstream figure this started from was "under 500 words". It was wrong for
> this tree, and eight of eight skills broke it on the first pass — which is the
> shape of a target nobody measured rather than a target anybody met. The number
> above is the measured ceiling of the current tree, not a wish. `budget.md`
> beside this file carries the measurement, how to re-take it, and why the
> ceiling moved. If you raise it again, say why in the same place; a ceiling
> that moves silently is the arithmetic of law 0's `baselineCore` edit, and it
> does not switch the law off.

Other levers, in the order they pay:

- Cross-reference another skill by name ("REQUIRED: use `change-gate`"), not
  by path — a path reference force-loads the file and burns the context the link
  was meant to save.
- Prefer the command over the catalogue of its flags; run `--help`.
- One good example beats five mediocre ones.
- Do not restate a law a gate already enforces. Route to the gate instead; a
  softer paraphrase of law 2 is a rule with no test attached to it.

## Match the form to the failure

Classify the baseline failure first — the form that fixes one failure type
measurably backfires on another, so reaching for the same shape every time is a
mistake. The classification table, the two shaping rules, and what to do when
there is no baseline run to classify are in `baseline-failure.md` beside this
file.

## Rationalization table

Collect the excuses from baseline runs, verbatim, and put them in a table:

| Excuse | Reality |
| --- | --- |
| "The fixture is obviously fine" | The must-not-fire case is the evidence. Fix the rule. |
| "I'll run the full check later" | The full check is eight minutes and it does not retroactively cover the change. |

Add a red-flags list for the self-check:

## Red flags — stop and start over

- A skill written before the baseline run
- A `npm run` command in a skill that does not exist in `package.json`
- A skill that restates a law instead of routing to the gate that enforces it
- An edit to an existing skill with no baseline run first

## The checklist

**RED.** Write a pressure scenario. Run it without the skill and write down
what the agent did, in its own words. That text is the material the skill has
to answer.

If you cannot run one yet, `baseline-failure.md` carries the substitute and its
limit. Use it, and say in the changelog entry which of the two you ran — a
discoverability audit reported as a behavioural test is the exact substitution
the north-star metric exists to catch.

**GREEN.** Write the smallest skill that addresses those specific failures.
Not the general topic — those failures.

**REFACTOR.** Run it again. New rationalisation appears; add an explicit
counter and re-run.

**Quality.** Frontmatter valid and `name` matches the directory. Description
is triggering conditions only. Body under budget. Quick-reference table.
Common-mistakes section. No narrative.

**Deploy.** Run `npm run lint` and `npm run typecheck`, then ask the agent
whether the skill appears in its available list. Skills are re-scanned at the
start of a session; `/reload` picks up a change without a new one.

## Why the repo checks will catch the mechanical mistakes

A tracked skill is scanned by `tests/contract/docs-consistency.spec.ts`, which
fails any `npm run <script>` that `package.json` does not define. That gate has
already shipped once as a real defect — 91 generated rule pages told the reader
to run a script whose name had been renamed — so the trap is live, and a
command in prose is exactly the thing it greps for.

Before committing a skill: `npm run lint`, `npm run typecheck`, and
`npx vitest run tests/contract/docs-consistency.spec.ts`.