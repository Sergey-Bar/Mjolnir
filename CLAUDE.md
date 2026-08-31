# Mjölnir — Laws

The governing laws of this repository. Where a law is executable, the
enforcement lives in `mjolnir doctor` (`src/commands/doctor.ts`); where
it is not yet executable, the gap is a defect to fix, not a rule to
ignore.

## The laws

1. **Anti-creep law.** Every addition to the launch set requires an
   equal-size removal. Executable as the core-tier cap: `CORE_CAP = 65`
   in `src/commands/doctor.ts` — promoting a rule to core requires
   demoting another.
2. **Fixture firewall.** Every rule MUST have fixtures that must-fire
   AND must-not-fire (`tests/fixtures/<RULE-ID>/`). A rule without both
   fixture classes is not done. Never weaken a must-not-fire fixture to
   make tests pass.
3. **North-star law.** The north-star metric is false-proof rate ≈ 0 —
   never assert verification quality the evidence does not carry.
   Rules without a measured FP rate (n ≥ 10) cannot ship in the core
   tier: an unmeasured rule is shipped on an unverified assumption, and
   until it is measured it does not belong in core.

## Provenance

Reconstructed and committed 2026-08-30 after the strategic review of
`.planning/CRITIQUE-REMEDIATION-PLAN.md` (finding F0) established that
the law text was cited by `src/commands/doctor.ts`, `docs/FP-AUDIT.md`,
`.github/copilot-instructions.md`, and
`.planning/AUDIT-2026-08-29.md` while existing in no committed file.
The wording is taken verbatim from those citations. Any change to a law
must update the quoting sites and the
`tests/docs-consistency.spec.ts` assertion in the same commit.
