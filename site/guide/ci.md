# CI integration

One command generates a PR workflow — advisory by default, never blocking:

```bash
mjolnir ci install
```

Or wire it into GitHub Code Scanning natively via SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Editor and pipeline setup for SARIF: [SARIF integration](/reference/sarif).

<FalseGreenChain />

## Changed-scope coverage

`--scope changed` attributes findings to lines added in your branch vs the
merge-base with `main`. It covers test files (`*.spec.*`, `*.test.*`) plus
GitHub workflow files and Playwright configs in the diff. When the
merge-base can't be resolved — shallow clone, detached HEAD, non-git
target, different default branch — it degrades honestly: findings fall
back to full-file attribution and the report says so. Override the base
ref with `--base <ref>`.

## Choosing the gate

`ci install` writes an **advisory** workflow by default: it reports, it never
blocks. That is the right starting point — a gate that fails on day one gets
disabled on day two.

```bash
mjolnir ci install --gate advisory   # report only (default)
mjolnir ci install --gate warning    # fail on warnings and errors
mjolnir ci install --gate error      # fail on errors only
```

Pass `--force` to overwrite a workflow you have already customised; without
it, `ci install` refuses rather than clobbering your edits.

## Exit codes

The gate is the exit code, so any CI system can consume it — no plugin
needed.

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| `0`  | Clean — nothing at or above the gate                 |
| `1`  | Findings at or above the gate                        |
| `2`  | Partial scan (for example, `--max-duration` ran out) |
| `10` | Usage error — a bad flag or a missing argument       |
| `20` | Internal error                                       |

Full contract: [exit codes and frozen contracts](/reference/exit-codes).

## Turning it on in a repo that already has debt

A first scan of a mature suite will find plenty. Rather than fixing all of it
before the gate goes on, snapshot what exists and gate only on what is new:

```bash
mjolnir baseline          # snapshot today's findings
mjolnir diff              # from now on: new or worsened findings only
```

`--scope changed` does the same job per-branch, and the two compose: the
baseline holds the line on the repo, `--scope changed` holds it on the diff.

## Reporting into the pull request

```bash
mjolnir pr-comment                 # a scoped PR comment, as Markdown
mjolnir impact --since origin/main # what this branch changed about the score
```

Both write Markdown to stdout, so posting them is your CI's job — pipe the
output into `gh pr comment --body-file -` or the equivalent.
