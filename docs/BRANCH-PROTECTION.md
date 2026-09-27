# Branch Protection — Recommended Settings

These settings maximize the OpenSSF Scorecard [Branch-Protection](https://securityscorecards.dev/) check.

## Required Settings

### Pull Request Requirements

- **Require a pull request before merging**: ✅ Enabled
- **Required approving reviews**: 1 minimum
- **Dismiss stale pull request approvals when new commits are pushed**: ✅ Enabled
- **Require review from Code Owners**: Optional (recommended)

### Status Checks

- **Require status checks to pass before merging**: ✅ Enabled
- **Required checks** — the enforced set is ruleset `01` (11 contexts, all
  from GitHub Actions). These are the checks that can block a merge:
  - `build-test (ubuntu-latest, 22)` / `(ubuntu-latest, 24)` /
    `(windows-latest, 22)` / `(macos-latest, 22)` — CI matrix
  - `property-tests` — property suite
  - `fuzz` — fuzz suite
  - `site-build` — site build + `site:doctor`
  - `workflow-lint` — actionlint + `npm run ci:standard`
  - `self-scan` — Mjölnir self-scan gate
  - `certification` — doctor self-audit + determinism verify
  - `generated-docs-drift` — regenerated docs/golden lock must match
- **Running but deliberately NOT required** — these report on every PR and
  are read by reviewers, but a red result does not block a merge:
  - `scan` / `publish` (Mjölnir PR report), `detector-revision-diff`
    (advisory annotation by design — a hard fail would only manufacture
    routine revision bumps), `Analyze (javascript-typescript)` /
    `Analyze (actions)` (CodeQL Advanced), `scan-pr` / `scan-scheduled`
    (OSV-Scanner).
- **Require branches to be up to date before merging**: ✅ Enabled
  (`strict_required_status_checks_policy` — this is what makes a merge
  provably reproducible from a green PR, and why a separate post-merge
  re-verification workflow is unnecessary).

### Branch Rules

- **Restrict who can push to matching branches**: ✅ Enabled (allow only PRs)
- **Do not allow force pushes**: ✅ Enabled
- **Do not allow deletions**: ✅ Enabled

### Commit Signing (Optional, Recommended)

- **Require signed commits**: ✅ Enabled (improves Code-Review score)

## Verification

The required checks live in ruleset `01`, not in branch protection, so
`branches/main/protection` will not list them. Read the enforced set from the
ruleset instead:

```bash
gh api repos/Sergey-Bar/Mjolnir/rulesets/21800825 \
  --jq '.rules[] | select(.type=="required_status_checks")
        | .parameters.required_status_checks[].context'
```

Or check the live scorecard: https://api.securityscorecards.dev/projects/github.com/Sergey-Bar/Mjolnir
