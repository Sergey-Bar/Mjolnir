# Mjölnir — verification trust loop (Claude Code command)

<!-- mjolnir:managed v0.5.13 -->

Run `/npx mjolnir-qa@0.5.13 . --scope changed` before finishing any task that touched test code.

- Exit 0 = clean. Exit 1 = new findings on changed lines: fix them (smallest behavior-preserving change) or justify them to the user.
- npx mjolnir-qa@0.5.13 why <file>:<line> explains any finding (evidence level, measured FP rate, fix).
- npx mjolnir-qa@0.5.13 handoff renders a full remediation plan from a saved --json report.
- NEVER suppress a finding merely to obtain a green scan (suppressions live in mjolnir.config.json, require a reason, and expire after 90 days).
- After fixing: re-run the scan, report files changed, report checks not run, report unresolved findings honestly.

<!-- /mjolnir:managed -->
