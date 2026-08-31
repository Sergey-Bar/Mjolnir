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

## Changed-scope coverage

`--scope changed` attributes findings to lines added in your branch vs the
merge-base with `main`. It covers test files (`*.spec.*`, `*.test.*`) plus
GitHub workflow files and Playwright configs in the diff. When the
merge-base can't be resolved — shallow clone, detached HEAD, non-git
target, different default branch — it degrades honestly: findings fall
back to full-file attribution and the report says so. Override the base
ref with `--base <ref>`.
