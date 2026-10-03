---
name: evidence
description: The agent safety contract for Mjölnir — never claim trustworthiness without evidence, never manufacture evidence, never convert INCONCLUSIVE to pass, never suppress findings to get green. Use when reporting a scan result, verifying a fix, handing off work, summarising what was done, or when you are about to say a task is finished, clean, passing or trustworthy.
---

# Evidence before claims

The whole product is the claim that verification quality should be provable.
An agent that reports a fix without running the check breaks that claim in the
one place nobody audits automatically: the message to the person reading it.

These are not style preferences. Each maps to a defect class the product
exists to detect.

## The contract

- **AGENT CLAIM ≠ VERIFICATION.** A claim you did not verify with a fresh
  scan is not a result, it is a guess.
- **NEVER declare trustworthiness without evidence.** Evidence exists only as
  Mjölnir's own deterministic output — scan, `ci verify`, `explain`,
  `trust-report`. Your reading of the diff is not evidence.
- **NEVER manufacture, edit, or synthesize evidence.** Do not hand-write a
  report, hand-edit a JSON artifact, or describe an output you did not see.
- **NEVER convert INCONCLUSIVE to pass.** INCONCLUSIVE is integrity —
  insufficient evidence, recorded honestly. Laundering it into success is the
  failure the north-star metric is measured against.
- **NEVER suppress findings or weaken rules to get green.** A green scan
  obtained by suppression is a false-green, not a fix.

## The loop and its preconditions

Three states, each with a precondition that must hold before you enter it:

| State | Precondition |
| --- | --- |
| **FIX** | a proven actionable defect — not a suspicion |
| **RESCAN** | changed-scope identification — you know what changed |
| **PROOF** | fresh post-fix execution evidence — you ran it after the change |

A "fixed" claim without rescan evidence is a contract violation, not a
rounding error. Every one of these actions stays auditable: report the commands
you ran and their outputs. Never summarise an unrun check as run.

## The scan commands

The pinned version and the exact wording live in the managed instruction
surfaces (`.claude/commands/mjolnir.md`, `.kilo/command/mjolnir.md`), which
carry the `mjolnir:managed` stamp and are checked against what
`mjolnir install` would write. Read the version from there rather than
hard-coding it here, so this skill cannot drift from the surface.

The loop, in order:

1. Establish the before-state once with a baseline write.
2. Fix, with the smallest behaviour-preserving change.
3. Re-scan changed scope.
4. `ci verify` prints the before/after digest — resolved (per §15 lifecycle) /
   new / unchanged, by ruleId and location — plus the score delta. Exit 0
   clean, 1 new errors, 2 partial or no baseline.

Exit 2 is a real outcome, not a failure to hide. It means the digest could not
be computed, which is precisely the case where a claim would be unearned.

## What to report

Give the person reading it four things, in this order:

1. **Commands run**, with their exit codes.
2. **Result**, or `INCONCLUSIVE` with what evidence is missing.
3. **Checks not run**, and why.
4. **Files changed.**

Unresolved findings are reported as unresolved. A summary that reads green and
was assembled from partial checks is the specific artefact this skill exists to
stop producing.

## The false-proof rate

The north-star metric is false-proof rate ≈ 0 — never assert verification
quality the evidence does not carry. Two consequences that catch agents out:

- **A measured FP rate needs n ≥ 10.** A rate from three samples is not a rate.
- **Unmeasured is a state, not a zero.** Reporting "0 % false positives" for a
  rule nobody has measured is a fabricated result, and `mjolnir explain`
  reports which rules are measured and which are not precisely so nobody has to
  guess.

## Before you send

- [ ] Did I run the check, or am I describing one I believe would pass?
- [ ] Is any number in my report from an output I actually saw?
- [ ] Did I convert an inconclusive into a pass anywhere?
- [ ] Did I get green by suppressing, by weakening a fixture, or by lowering a
      threshold?
- [ ] Have I named the checks I skipped?