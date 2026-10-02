---
name: rule-author
description: Author a new Mjölnir rule end-to-end — rule file, must-fire and must-not-fire fixtures, registry registration, tier, docs and gates — or retire an existing one. Use when asked to add, change, promote or deprecate a QA rule (QA-TEST-NNN, QA-CI-NNN, QA-PW-NNN, QA-PY-NNN, QA-JV-NNN, QA-CS-NNN, QA-CYP-NNN, QA-SE-NNN, QA-ENV-NNN), or to fix a rule whose must-not-fire fixture fires.
---

# Author a Mjölnir rule

The three laws that bind this workflow are in `CLAUDE.md`. Read them before
starting; they are quoted by gates and by `src/commands/doctor.ts`, so a law
change and its quoting sites move in one commit.

- **Law 1 (anti-creep):** every addition to the shipped rule set requires an
  equal-size removal, or an `ANTI-CREEP-EXCEPTION` in the **top** `## `
  changelog entry with the reason. Scoped to that entry on purpose — a marker
  in a past release would disable the ratchet forever.
- **Law 2 (fixture firewall):** a rule without BOTH a must-fire and a
  must-not-fire fixture is not done.
- **Law 3 (north-star):** a rule without a measured FP rate (n ≥ 10) cannot
  ship in the core tier. Core is empty today and the evidence, not a cap, is
  what keeps it there.

## 1. Pick the ID before writing the rule

Families and their ID prefixes:

| Directory | Prefix | Directory | Prefix |
| --- | --- | --- | --- |
| `src/rules/test/` | `QA-TEST-` | `src/rules/playwright/` | `QA-PW-` |
| `src/rules/ci/` | `QA-CI-` | `src/rules/python/` | `QA-PY-` |
| `src/rules/java/` | `QA-JV-` | `src/rules/csharp/` | `QA-CS-` |
| `src/rules/cypress/` | `QA-CYP-` | `src/rules/selenium/` | `QA-SE-` |
| `src/rules/quality/` | `QA-ENV-` | | |

Check the ID is free (`src/rules/index.ts` and `RETIRED_RULE_IDS`), then pick
the next unused number in that family. **IDs are never reused** — not after a
deprecation, not after a removal, not years later. `QA-TEST-042` forever means
what it means today, or nothing.

## 2. Read a sibling before writing

Open one existing rule in the same family and follow its shape. The engine is
regex/text-based; `ast?: unknown` exists in the adapters but is unpopulated
for test files. Do not invent a new export shape.

The `Rule` object needs a correct ID, a `severity`, and a message written in
**QA-speak**: actionable and non-jargon, telling the reader what to do rather
than what the detector noticed. `tier` is optional — `core | extended |
quarantine`. With no valid measurement, `effectiveTier` resolves to
`extended`, which means an unmeasured rule **ships by default** and Law 1
applies. That is the intended default; do not reach for `quarantine` to dodge
the law.

## 3. Fixtures — both sides, always

Create `tests/fixtures/<RULE-ID>/` with both classes:

- a **must-fire** case the rule must report;
- a **must-not-fire** case the rule must stay silent on.

Fixture tests are data-driven and pick up new fixture directories
automatically. **If a must-not-fire case fires, fix the rule, never the
fixture.** Weakening a must-not-fire fixture to reach green is the exact
failure the north-star metric is measured against, and it is worse than a red
build because it is invisible from here on.

The census in `src/v6/fixture-quad-probe.ts` names four legs — `MUST-FIRE`,
`MUST-NOT-FIRE`, `RECALL`, `PRECISION` — and `M3` is the only maturity a rule
earns with all four. The first two are what Law 2 requires; the last two are
corpus verdicts, and a missing leg is printed, not failed. Treat the missing
legs as the work list.

## 4. Register it

Add the rule to the `RULES` array in `src/rules/index.ts`. An unregistered
rule file is invisible to the scan and to every gate that counts rules, which
is how orphans accumulated in the first place.

## 5. Run the gates that cover this change

Not the whole 8-minute suite — `change-gate` maps a diff to the minimum set.
For a rule change that is:

```
npm run frontier:contracts      # tests/contract/ — registry, fixture firewall, ID-immutability
npm run check-fixture-quad      # the census, and it fails on an over-claim of M3
npm run rules:quality:check
npm run test                    # data-driven fixture tests
```

## 6. Regenerate what the change invalidated

A rule file change invalidates the generated surfaces that name it:

```
npm run detector-hashes:update  # detector hashes — a detector's hash is the evidence for its own revision
npm run generate-rule-docs      # docs/rules/<ID>.md
npm run docs:regen              # counts, capability matrix, FP-audit table, README score gauge
npm run golden:update           # ONLY with explicit intent, and you read the diff
npm run claims:check            # if you changed a documented capability
```

`golden:update` rewrites a byte-compared lock. Run it, then read the diff and
be able to explain every changed line. An unexplained golden diff is a
regression, not bookkeeping.

## 7. Report honestly

Report: files created and changed, the commands you ran with their results,
which gates you did NOT run, and any false-positive risk you can see in the
rule you just wrote. `INCONCLUSIVE` is a result; an unrun check reported as run
is a contract violation. See the `evidence` skill.

## Adding to the shipped set — the paperwork

If the rule ships by default, one of these must be true, or `doctor` fails:

1. **Net growth is zero or negative.** Promote one rule and demote another in
   the same commit. No paperwork.
2. **The unreleased changelog entry carries `ANTI-CREEP-EXCEPTION`** with the
   reason. The ratchet compares against `previousBaselineCore` in
   `docs/ANTI-CREEP-BASELINE.json`, not against `baselineCore` — lowering
   `baselineCore` to match a grown tier does not switch the law off, it only
   hides the growth from one edit.

The reason is the part a reviewer has to check. "Needed" is not a reason.

## Retiring or weakening a rule

Governed by `docs/RULE-LIFECYCLE.md`, and deliberately a different policy from
Law 1 — this one covers a rule that is conceptually wrong, not merely noisy. A
tunable FP rate is ordinary maintenance: adjust the regex, add a fixture,
re-run the corpus audit.

1. **Downgrade severity, do not delete.** Set `severity: "info"` and
   `falsePositiveRisk: "high"`. If it should stop running by default, suppress
   it in `mjolnir.config.json` with a `reason`. Code and fixtures stay.
2. **Never repurpose the ID.** A salvageable idea ships as a NEW id with its
   own fixture pairs. The old id stays retired.
3. **Mandatory `CHANGELOG.md` entry** under a `### Deprecated` heading: the ID,
   the actual conceptual flaw (not "too noisy"), what a user with it enabled
   should do, and whether a successor exists.
4. **One minor version of visible deprecation before removal is even
   considered.** Removal is reserved for a rule that is actively misleading at
   any severity — one whose existence implies a guarantee the tool no longer
   makes.
5. **Full removal:** delete the source file and its fixtures, remove the entry
   from `RULES`, add the ID to `RETIRED_RULE_IDS` in the same file.
   `tests/rules.registry.spec.ts` enforces both halves — a retired ID can
   never also be active, and `RETIRED_RULE_IDS` cannot duplicate.

## Common mistakes

- Registering the rule file but not the registry entry, or the reverse.
- Shipping a must-fire fixture and calling Law 2 satisfied.
- "Fixing" a firing must-not-fire fixture instead of the detector.
- Running `golden:update` without reading the diff.
- Adding to `CLAUDE.md` without updating the quoting sites and the
  `tests/contract/docs-consistency.spec.ts` assertion in the same commit.
- Claiming a core tier without `corePromotion` — a human assertion rendered
  with a comment is not measurement, and the registry rejects it.