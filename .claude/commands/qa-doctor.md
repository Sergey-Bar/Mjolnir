# QA Doctor — verification trust loop (Claude Code command)

<!-- qa-doctor:managed v2.0.0 -->

Run `/npx qa-doctor-cli@2.0.0 . --scope changed` before finishing any task that touched test code.

- Exit 0 = clean. Exit 1 = new findings on changed lines: fix them (smallest behavior-preserving change) or justify them to the user.
- npx qa-doctor-cli@2.0.0 why <file>:<line> explains any finding (evidence level, measured FP rate, fix).
- npx qa-doctor-cli@2.0.0 handoff renders a full remediation plan from a saved --json report.
- Agent loop: establish the before-state once with npx qa-doctor-cli@2.0.0 baseline (commits .qa-doctor/baseline.json); after fixing, npx qa-doctor-cli@2.0.0 verify prints the before/after digest — resolved (per §15 lifecycle) / new / unchanged by ruleId+location, and the score delta. Exit 0 clean, 1 new errors, 2 partial or no baseline.
- NEVER suppress a finding merely to obtain a green scan (suppressions live in qa-doctor.config.json, require a reason, and expire after 90 days).
- After fixing: re-run the scan, report files changed, report checks not run, report unresolved findings honestly.

## Agent safety contract (non-negotiable)

- NEVER declare test health without evidence. AGENT CLAIM ≠ VERIFICATION: a claim you did not verify with a fresh scan is not a result, it is a guess.
- NEVER manufacture, edit, or synthesize evidence. Evidence exists only as QA Doctor's own deterministic output (scan / verify / triage / forensics / trust-report).
- NEVER convert INCONCLUSIVE to pass. INCONCLUSIVE is integrity — insufficient evidence is recorded honestly, never laundered into success.
- NEVER suppress findings or weaken rules to get green. A green scan obtained by suppression is a false-green, not a fix.
- Loop preconditions: FIX requires a proven actionable defect; RESCAN requires changed-scope identification; PROOF requires fresh post-fix execution evidence. A "fixed" claim without rescan evidence is a contract violation.
- All agent actions stay auditable: report the commands you ran and their outputs; never summarize an unrun check as run.

<!-- /qa-doctor:managed -->
