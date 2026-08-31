# QA-CI-010 — Sample Findings for Classification

Total sampled: 3 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. grafana-grafana — .github/workflows/pr-frontend-unit-tests.yml:112

**Message:** Job `frontend-unit-tests-enterprise` runs tests but its `if:` condition skips it on pull requests.

```
     107|       id-token: write
     108|     needs:
     109|       - detect-changes
     110|       - generate-golden-files
     111|     # Run this workflow for non-PR events (like pushes to `main` or `release-*`) OR for internal PRs (PRs not from forks)
>>>  112|     if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.fork == false && needs.detect-changes.outputs.changed == 'true'
     113|     runs-on: ubuntu-x64-large
     114|     name: "Unit tests (${{ matrix.shard }} / ${{ matrix.total }})"
     115|     strategy:
     116|       fail-fast: false
     117|       matrix:
```

**verdict:**

---

## 2. grafana-grafana — .github/workflows/run-schema-v2-e2e.yml:20

**Message:** Job `dashboard-schema-v2-e2e` runs tests but its `if:` condition skips it on pull requests.

```
      15| jobs:
      16|   dashboard-schema-v2-e2e:
      17|     runs-on: ubuntu-x64-large
      18|     continue-on-error: true
      19|     # Run on `grafana/grafana` pushes (not mirrors), or on non-draft pull requests
>>>   20|     if: (github.event_name == 'push' && github.repository == 'grafana/grafana') || (github.event_name == 'pull_request' && github.event.pull_request.draft == false)
      21|     permissions:
      22|       contents: read
      23|     steps:
      24|       - name: Checkout
      25|         uses: actions/checkout@v5
```

**verdict:**

---

## 3. reflex-dev-reflex — .github/workflows/unit_tests.yml:87

**Message:** Job `unit-tests-macos` runs tests but its `if:` condition skips it on pull requests.

```
      82|       - name: Generate coverage report
      83|         run: uv run coverage html
      84|
      85|   unit-tests-macos:
      86|     timeout-minutes: 30
>>>   87|     if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      88|     strategy:
      89|       fail-fast: false
      90|       matrix:
      91|         python-version: ["3.10", "3.11", "3.12", "3.13", "3.14"]
      92|     runs-on: macos-latest
```

**verdict:**

---
