# Mjölnir — verification trust loop (Claude Code command)

<!-- mjolnir:managed v0.6.1 -->

Run `/npx mjolnir-qa@0.6.1 . --scope changed` before finishing any task that touched test code.

- Exit 0 = clean. Exit 1 = new findings on changed lines: fix them (smallest behavior-preserving change) or justify them to the user.
- npx mjolnir-qa@0.6.1 why <file>:<line> explains any finding (evidence level, measured FP rate, fix).
- npx mjolnir-qa@0.6.1 handoff renders a full remediation plan from a saved --json report.
- Agent loop: establish the before-state once with npx mjolnir-qa@0.6.1 baseline (commits .mjolnir/baseline.json); after fixing, npx mjolnir-qa@0.6.1 verify prints the before/after digest — resolved (per §15 lifecycle) / new / unchanged by ruleId+location, and the score delta. Exit 0 clean, 1 new errors, 2 partial or no baseline.
- NEVER suppress a finding merely to obtain a green scan (suppressions live in mjolnir.config.json, require a reason, and expire after 90 days).
- After fixing: re-run the scan, report files changed, report checks not run, report unresolved findings honestly.

<!-- /mjolnir:managed -->
