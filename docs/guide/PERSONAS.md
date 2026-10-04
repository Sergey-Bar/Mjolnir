# Who this is for, and the one command each

Three people use this tool, and they need three different things from it. The
failure mode this file exists to prevent is a README that describes one of them
and leaves the other two to guess.

Every command below is **executed by a test**. `tests/contract/persona-matrix.spec.ts`
parses this file, checks that each verb exists in the CLI's own registry, and
runs the flags that are safe to run without a repository. A row that names a
command the engine does not have fails the build, so this table cannot describe a
product that no longer exists.

| Persona                                              | The one command                                   | What they get                                                                                       | The trust claim it supports                                                                                                                                      | The gap that remains                                                                                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **QA engineer** — "is my suite lying to me?"         | `npx mjolnir-qa@6.0.0-rc.1 . --scope changed`     | Findings on changed lines only, with exit `1` when any reach the gate.                              | The scan is deterministic: same tree, same findings. That is what makes a red build mean something.                                                              | It says nothing about whether the _tests themselves_ are honest. A suite that asserts nothing passes every structural check this tool makes.                                                                 |
| **Senior SDET** — "what is my blind spot?"           | `npx mjolnir-qa@6.0.0-rc.1 stats`                 | Per-rule measured FP rate, or an explicit _unmeasured_ state where no verdicts exist.               | The number is derived from hand-classified corpus verdicts, not asserted. 6 of 79 rules currently have none, and the tool says so rather than implying coverage. | The corpus is 37 public repositories. It is not your codebase, and a rate measured elsewhere is evidence about a rate, not about your suite.                                                                 |
| **Specialized tester** — "can I trust this finding?" | `npx mjolnir-qa@6.0.0-rc.1 explain <file>:<line>` | For one finding: which rule, what evidence level, the measured FP rate or its absence, and the fix. | The finding carries its own provenance. Where runtime corroboration exists it travels with the finding, so _verified_ and _assumed_ are distinguishable.         | Runtime corroboration needs a recognised test report. Four conventions are recognised; everything else stops at `INFERRED`, because inventing a claim there would be the one thing this product must not do. |

## The three commands, and why these three

**`--scope changed`** for the QA engineer, because the first question is never
"is my codebase clean" — it is "did I make this worse". Scanning everything on
every push is how a gate gets muted.

**`stats`** for the SDET, because the second question is "where would I be
wrong". A tool that only reports what it found cannot answer it; the measured
false-positive rate per rule is the honest version of that answer, and the rules
with no measurement are the interesting half of it.

**`explain`** for the specialized tester, because the third question is "why do I
believe you". A finding without provenance is an assertion, and this project's
entire claim is that its output is not.

## What none of the three commands do

- **None of them reaches L3 for Python or .NET.** Evidence discovery recognises
  four run-report conventions (`docs/HOLDOUT-SPLIT.json` and
  `src/discovery/evidence-discovery.ts`). A rule that cannot find a run report
  cannot corroborate against one, so a Python finding is `INFERRED` however
  carefully it was written.
- **None of them measures whether the test suite is meaningful.** That is a
  different class of tool, and pretending otherwise would be the overclaim this
  repository's whole governance exists to prevent.
- **None of them publishes a number you can compare across versions.** The
  scoring model changed at `scoringModelVersion` 2.0.0 (ADR 0014), so a score
  from before that boundary is not comparable with one after it. See
  `docs/ENGINE-FREEZE.md`.
