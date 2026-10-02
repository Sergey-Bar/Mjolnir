---
name: prose-honesty
description: Use when reviewing or editing hand-written prose in this repository — a rule doc, an ADR, a runbook, a design note — to strip AI writing tells and inflated claims without changing a single fact. Covers which files are off-limits and what a prose pass may never touch.
---

# Prose honesty

Adapted from `blader/humanizer` (MIT), which builds its pattern list on
Wikipedia's *Signs of AI writing*. The 22 patterns live in `patterns.md`; what
is here is the fence, and the three of them that are not stylistic.

## The fence

**This skill may only touch hand-written prose, and only sentences.** It may
not change a number, a path, a version, a rule ID, a flag name, a claim, or
the strength of any statement.

Do not edit, under any circumstance:

- `CLAUDE.md` — its law text is quoted verbatim by `src/commands/doctor.ts`
  and asserted by `tests/contract/docs-consistency.spec.ts`.
- `.github/copilot-instructions.md` — law copy kept in sync by the same
  assertion.
- `README.md`, `docs/README.md`, `CONTRIBUTING.md` — their rule tables,
  version claims, terminology and measured-FP counts are asserted.
- `docs/claim-registry.json` and every other machine-read JSON. Those are data.
- Anything `npm run docs:regen` produces. The generator will overwrite your
  careful prose on the next run, and the diff gate will show it.
- `tests/` — fixtures are deliberate anti-pattern exhibits. Rewording them
  destroys the evidence.
- `CHANGELOG.md` — it is the append-only record of what each release said.
  Rewriting history to satisfy a style check makes it a second thing it was
  never meant to be.

**The fence is the gate, not a list in this file.** A hand-maintained list here
would rot exactly like the stale entries in `.mjolnirignore` and
`.gitignore` — paths that no longer exist, kept because nobody re-read them.
So there is no list. After any prose pass:

```
npm run frontier:contracts
```

That runs `docs-consistency`, which reads the asserted surfaces and the
canonical vocabulary. If it passes, the prose pass changed nothing that was
load-bearing.

## The patterns

22 patterns, in `patterns.md` beside this file. Read it on a prose pass.

Three of them are the reason this skill exists here rather than as a general
style pass, because they are the shapes an **unearned claim** takes:

| Pattern | Tell | Why it matters in this repository |
| --- | --- | --- |
| Inflated significance | "marking a pivotal moment", "the future looks bright" | States significance the evidence does not carry |
| Borrowed authority | "Experts believe…", "cited in NYT, BBC, FT" | Invents a source for a claim nobody verified |
| Knowledge-limit disclaimers | "while details are limited, it appears…" | Buries the fact that something is unmeasured |

## How to run a pass

1. Read the target once for meaning. Note every number, ID, path and flag in
   it — that is the set you may not alter.
2. Mark the tells, strongest first.
3. Rewrite without treating the original structure as fixed.
4. **Check the rewrite against the original claims.** A name, number, date,
   quote or citation must come from the source or the writer. If a sentence
   needs a detail that is missing, ask — do not invent one.
5. Run `npm run frontier:contracts`.
6. Report which sentences changed and confirm the fact-set is identical.

Show your work: the first rewrite, a short note on anything that still sounds
artificial, then the final version. A prose pass whose output cannot be
diffed against its input is indistinguishable from having rewritten the facts.

## What this is not

It does not make the product's writing more casual. `CLAUDE.md`, the changelog
entries and the design notes in this repository are deliberately long-form —
they carry provenance, reasoning and the arithmetic behind a decision. Stripping
that is not honesty, it is losing the audit trail.

The goal is narrower: no sentence should claim more than the evidence behind
it supports.