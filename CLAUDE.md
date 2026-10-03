# Mjölnir — Laws

The governing laws of this repository. Where a law is executable, the
enforcement lives in `mjolnir doctor` (`src/commands/doctor.ts`); where
it is not yet executable, the gap is a defect to fix, not a rule to
ignore.

## The laws

0. **Surface law (6.0).** The governed surface is every capability the
   product claims, not only the rule set. Adding a CLI verb, an npm script, a
   gate, a generator or a documented format requires an equal-size removal or a
   recorded `ANTI-CREEP-EXCEPTION` in `CHANGELOG.md` with the reason.
   `npm run check` is the whole PR path and it is at most 12 commands;
   `npm run entry-points:check` is what enforces the number, so "the surface
   grew" cannot be a fact nobody measures. `CLAUDE.md`, `README.md`,
   `docs/ROADMAP.yaml`, `gates/*.json` and `package.json` are the surfaces
   this applies to. Law 1 is the rule-set arm of this law, not the whole of it.
1. **Anti-creep law.** Every addition to the launch set requires an
   equal-size removal. The launch set is the rules that ship in the default
   report — every rule whose effective tier is not `quarantine`, which is 45 of
   79 today. Executed as two independent caps in
   `src/commands/doctor.ts`: the absolute `CORE_CAP` and the net-growth
   ratchet in `docs/ANTI-CREEP-BASELINE.json`. Growth past the recorded
   baseline must be matched by a demotion out of the set, or recorded as an
   `ANTI-CREEP-EXCEPTION` in `CHANGELOG.md` with the reason.
   See `docs/ANTI-CREEP.md`.
2. **Fixture firewall.** Every rule MUST have fixtures that must-fire
   AND must-not-fire (`tests/fixtures/<RULE-ID>/`). A rule without both
   fixture classes is not done. Never weaken a must-not-fire fixture to
   make tests pass.
3. **North-star law.** The north-star metric is false-proof rate ≈ 0 —
   never assert verification quality the evidence does not carry.
   Rules without a measured FP rate (n ≥ 10) cannot ship in the core
   tier: an unmeasured rule is shipped on an unverified assumption, and
   until it is measured it does not belong in core.
   Note the deliberate difference from law 1: this one governs the **core
   tier**, which holds 2 rules today (`QA-PW-117`, `QA-JV-101`, each at
   n=35 with zero observed false positives), while law 1 governs the
   **shipped set**. Applying this requirement to all 45 shipping rules would
   fail it immediately; that is a policy decision about what the product may
   ship, not a defect, and it is unresolved rather than settled by this file.
   The tier a rule holds and the evidence that put it there are recorded in
   `docs/RULE-CONSTITUTION.json` (P1), `docs/CORE-CERTIFICATION.json` (P2)
   and `docs/TIER-HISTORY.json` (P3), all three gated.

## Provenance

Reconstructed and committed 2026-08-30 after the strategic review of
`.planning/CRITIQUE-REMEDIATION-PLAN.md` (finding F0) established that
the law text was cited by `src/commands/doctor.ts`, `docs/FP-AUDIT.md`,
`.github/copilot-instructions.md`, and
`.planning/AUDIT-2026-08-29.md` while existing in no committed file.
The wording is taken verbatim from those citations. Any change to a law
must update the quoting sites and the
`tests/docs-consistency.spec.ts` assertion in the same commit.

Law 1 was amended 2026-10-01 to name the shipped set rather than the core
tier, which is what it always described. The quoting sites updated with it:
`docs/ANTI-CREEP.md`, `docs/ANTI-CREEP-BASELINE.json`, `.github/copilot-instructions.md`,
`tests/contract/docs-consistency.spec.ts`, and `src/commands/doctor.ts`.

Law 0 was added 2026-10-02 (6.0). Law 1 was scoped to the shipped rule set,
and a rule set is the easiest surface to measure — so every other surface grew
unchecked: 139 npm scripts, 137 script files, 16 verbs and three overlapping
capability registries, all with drift gates that caught none of it. The law now
names the surface rather than the one part of it that was easy to count.
`tests/contract/docs-consistency.spec.ts` reads this file, so widening the law
is itself gated on the quoting sites being updated in the same commit.

**The cut the law prompted was measured and declined.** `npm run check` is ~8
minutes: the test suite is 79 % of it and all 38 gates together are 100 seconds.
Cutting the gate surface from 39 to 12 would save under 15 % of the wait, by
deleting checks that caught six real defects during 6.0. The numbers and the
arithmetic are in the 6.0.0-rc.1 CHANGELOG entry, so the question does not have
to be re-argued from counts. The lever that would move the wait is splitting
the suite so the slow e2e tail runs beside the fast tests — CI work, not a
surface cut.
