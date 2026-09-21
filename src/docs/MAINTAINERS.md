# Maintainers — roles, expectations, and the path to co-maintainership

The bus-factor program (product-gap-remediation master plan P9, plan
1788853205786, decision 10): Mjölnir is maintained by a solo maintainer,
and that is a stated risk, not a secret. This document makes the project
operable by _more than one human_ — the governance stays per
[GOVERNANCE](CONTRIBUTING.md#governance) and the normative lawbook stays
[docs/CERTIFICATION-POLICY.md](CERTIFICATION-POLICY.md); what changes is
who can execute the work.

## The roles ladder

Each role is defined by what it may do **without owner sign-off**.
Higher roles include everything below them.

| Role           | May do (without owner)                                                                                                                                                     | Gate to enter                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Triage**     | Label issues per the routing table in [SUPPORT](../SUPPORT.md); close duplicates; ask for missing fixture/repro info                                                       | Demonstrated judgment on 10 triaged issues; no code access needed                                                    |
| **Classifier** | Run the [adjudication kit](ADJUDICATION-KIT.md) on review sheets — call TP / FP / UNSURE to the documented standard; their verdicts enter the measured-FP corpus           | Adjudication kit worked example reproduced exactly; 3 sheets spot-checked by an existing classifier with ≤ 1 dispute |
| **Rule-owner** | Own a rule end-to-end: fix, retune, fixtures both directions, revision bumps, the RULE-LIFECYCLE entry — everything §07/§11 requires, with the corpus verdicts as evidence | 10 consecutive clean adjudications; one rule fixed end-to-end (retune or migration) merged through the standing gate |
| **Release**    | Run the [publishing runbook](PUBLISHING.md): version job, dist-tags, changelog, GitHub release — and the green-CI release gate (Law 12)                                    | Rule-owner + one supervised release; 2FA on npm is the identity boundary (see OWNER-RUNBOOK)                         |

**Nobody, at any rung, classifies around the evidence rules** (axiom A4:
adjudication is human; L1–L6, Laws 1–22 in CERTIFICATION-POLICY bind
every role equally). The kit exists to make _any_ careful human
adjudicate to the same standard — not to automate judgment.

## Expectations (every role)

- The [standing gate](../CONTRIBUTING.md#the-standing-gate) is green
  before anything merges. No exceptions, no skipping hooks.
- Records over memory: verdicts land in the corpus, decisions in
  RULE-LIFECYCLE / the plan archive — if it isn't recorded, it didn't
  happen.
- Honesty over optics: an UNSURE row is a _contribution_; a guessed TP/FP
  poisons the measured-FP corpus that gates the whole registry.

## The path to co-maintainer

1. Enter the ladder (any rung).
2. Reach **rule-owner** and carry at least three full §11 rule cycles
   (fix → re-measure → lifecycle entry).
3. Co-maintainer = rule-owner + release, sustained: a quarter of active
   merges, a clean supervised release, and no containment incidents.
4. The owner grants repo write + npm collaborator (see OWNER-RUNBOOK's
   handover section). The grant is revocable and auditable — the
   succession audit (below) checks it.

## Escalation / decision model

- Normative disputes (a rule change that bends a law): the lawbook wins;
  escalate to the owner only for a _lawbook amendment_ — which is an
  owner decision by construction (CERTIFICATION-POLICY is owner-ratified).
- Everything else: the highest rung present decides; the decision is
  recorded in the PR thread.
- Owner unavailability: the [owner-runbook](OWNER-RUNBOOK.md) separates
  identity-bound operations (blocked, honestly) from executable ones
  (proceed and record). The succession audit measures exactly this split.

## Succession audit

`docs/BUS-FACTOR-AUDIT.md` is refreshed with every release: every
operation needed for a release + adjudication cycle, marked
**executable** (by whom, runbook link) or **identity-bound** (why). The
P9 exit bar: an adjudication cycle operable end-to-end by a second
human; publishing remains identity-bound until a co-maintainer exists.
