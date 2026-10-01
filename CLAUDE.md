# Mjölnir — Laws

The governing laws of this repository. Where a law is executable, the
enforcement lives in `mjolnir doctor` (`src/commands/doctor.ts`); where
it is not yet executable, the gap is a defect to fix, not a rule to
ignore.

## The laws

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
   tier**, which is currently empty, while law 1 governs the **shipped set**.
   Applying this requirement to all 45 shipping rules would fail it
   immediately; that is a policy decision about what the product may ship,
   not a defect, and it is unresolved rather than settled by this file.

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
