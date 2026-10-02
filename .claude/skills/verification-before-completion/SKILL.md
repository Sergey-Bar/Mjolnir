---
name: verification-before-completion
description: Use before claiming work is complete, fixed, clean or passing — before committing, opening a PR, handing a task off, or moving to the next task. Requires running the verification command fresh and reading its output before making any success claim.
---

# Verification before completion

Adapted from `obra/superpowers` `verification-before-completion` (MIT),
aligned to this repository's laws.

**Core principle: evidence before claims, always.**

**Violating the letter of this rule is violating the spirit of this rule.**

## The gate function

Before any status claim or expression of satisfaction:

1. **IDENTIFY** — what command proves this specific claim?
2. **RUN** — the full command, fresh, in this message.
3. **READ** — the whole output, the exit code, the failure count.
4. **VERIFY** — does the output actually say what you are about to say?
5. **THEN** — claim it, with the evidence attached.

Skipping a step is not verifying. It is reporting a guess in the present tense.

## The Iron Law

```
NO COMPLETION CLAIM WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the command in this message, you cannot claim it passes.
A run from earlier in the session, from a previous session, or from CI is
evidence about that run, not about now.

## Claim → required evidence

| Claim | Requires | Not sufficient |
| --- | --- | --- |
| Tests pass | the test command's output: N passed, 0 failed | "should pass", a previous run |
| Lint is clean | `npm run lint`, exit 0 | a partial file, or a typecheck passing |
| It typechecks | `npm run typecheck` | lint passing — they are different compilers |
| The gate passes | that gate's own exit code | the suite passing; 38 gates are 100 seconds of the eight minutes |
| The bug is fixed | the original symptom no longer reproduces | the code changed |
| A regression test works | red → green → revert → red → restore → green | a test that passed on the first run |
| The docs are regenerated | the regen ran and the diff is read | assuming the generator is idempotent |
| An agent finished | read its VCS diff and verify it yourself | the agent said "done" |
| The claim is registered | `npm run claims:check` | the sentence being in the README |

Two traps specific to this repository:

- **`npm run lint` passing is not `npm run typecheck` passing.** They are two of
  the twelve leaves of `npm run check` precisely because they cannot be merged.
- **A severity or tier change changes scores wherever that rule fired.** The
  test suite passing does not mean the golden lock still matches. Run
  `npm run golden:update`, read the diff, and be able to explain every line.

## Red flags — stop

- "should", "probably", "seems to", "looks right"
- Any positive statement about the state of the work before a command ran
- Committing, pushing or opening a PR without a fresh run
- Trusting a subagent's success report without reading its diff
- Partial verification presented as full verification
- Tired, and finishing anyway — exhaustion is not an exemption
- Reporting a skipped check as if it had passed

## Rationalization table

| Excuse | Reality |
| --- | --- |
| "The narrow gates cover it" | They may. Say which ones, and that the rest were skipped. |
| "I'm confident" | Confidence is not evidence; it is the feeling of not having checked. |
| "Just this once" | No exception. Once is the minimum. |
| "The full check takes eight minutes" | That is why `change-gate` exists — run the row that covers the diff, and report that you did. |
| "It's only docs" | `docs:regen` and the claim gates make docs a counted surface. |
| "The spirit is fine, the letter is pedantic" | The letter is the spirit with a test attached. |

## Before you send

- [ ] Did I run the check, or am I describing one I believe would pass?
- [ ] Is every number in my report from an output I actually saw?
- [ ] Did any inconclusive become a pass?
- [ ] Did I get green by suppressing, by weakening a must-not-fire fixture, or
      by lowering a threshold?
- [ ] Have I named the checks I skipped?

The `evidence` skill carries the full agent safety contract — the scan loop,
the exit codes, and the four things a report must contain. Read it before
writing up a result.