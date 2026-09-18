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
- **Required checks**:
  - `build-test (ubuntu-latest, 22)` — CI matrix
  - `self-scan` — QA Doctor self-scan gate
  - `certification` — Doctor + determinism verify
- **Require branches to be up to date before merging**: ✅ Enabled

### Branch Rules

- **Restrict who can push to matching branches**: ✅ Enabled (allow only PRs)
- **Do not allow force pushes**: ✅ Enabled
- **Do not allow deletions**: ✅ Enabled

### Commit Signing (Optional, Recommended)

- **Require signed commits**: ✅ Enabled (improves Code-Review score)

## Verification

After applying these settings, run:

```bash
gh api repos/Sergey-Bar/Mjolnir/branches/main/protection --jq '.required_status_checks.contexts'
```

Or check the live scorecard: https://api.securityscorecards.dev/projects/github.com/Sergey-Bar/Mjolnir
