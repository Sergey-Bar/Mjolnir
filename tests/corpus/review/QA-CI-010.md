# QA-CI-010 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

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

## 4. streamlit-streamlit — .github/workflows/publish-component-v2-lib.yml:26

**Message:** Job `publish-component-v2-lib` runs tests but its `if:` condition skips it on pull requests.

```
      21|   contents: read
      22|   id-token: write
      23|
      24| jobs:
      25|   publish-component-v2-lib:
>>>   26|     if: ${{ github.repository == 'streamlit/streamlit' && github.event_name == 'workflow_dispatch' }}
      27|     runs-on: ubuntu-latest
      28|     environment: release
      29|
      30|     steps:
      31|       - name: Checkout repository
```

**verdict:**

---

## 5. nocodb-nocodb — .github/workflows/jest-unit-test.yml:21

**Message:** Job `jest-unit-test` runs tests but its `if:` condition skips it on pull requests.

```
      16|   workflow_dispatch:
      17| jobs:
      18|   jest-unit-test:
      19|     runs-on: ubicloud-standard-2
      20|     timeout-minutes: 20
>>>   21|     if: ${{ github.event_name == 'push' || contains(github.event.pull_request.labels.*.name, 'trigger-CI') || !github.event.pull_request.draft || inputs.force == true }}
      22|     steps:
      23|       - name: Checkout
      24|         uses: actions/checkout@v4
      25|         with:
      26|           fetch-depth: 0
```

**verdict:**

---

## 6. positive-fixtures — .github/workflows/more-pr-skipped.yml:8

**Message:** Job `e2e` runs tests but its `if:` condition skips it on pull requests.

```
       3| on: [push]
       4|
       5| jobs:
       6|   e2e:
       7|     runs-on: ubuntu-latest
>>>    8|     if: github.event_name == 'workflow_dispatch'
       9|     steps:
      10|       - uses: actions/checkout@v4
      11|       - run: npx playwright test
      12|
      13|   nightly:
```

**verdict:**

---

## 7. positive-fixtures — .github/workflows/more-pr-skipped.yml:15

**Message:** Job `nightly` runs tests but its `if:` condition skips it on pull requests.

```
      10|       - uses: actions/checkout@v4
      11|       - run: npx playwright test
      12|
      13|   nightly:
      14|     runs-on: ubuntu-latest
>>>   15|     if: github.event_name != 'pull_request'
      16|     steps:
      17|       - uses: actions/checkout@v4
      18|       - run: pytest
      19|
      20|   main-only-suite:
```

**verdict:**

---

## 8. positive-fixtures — .github/workflows/pr-skipped.yml:10

**Message:** Job `test` runs tests but its `if:` condition skips it on pull requests.

```
       5|     branches: [main]
       6|
       7| jobs:
       8|   test:
       9|     runs-on: ubuntu-latest
>>>   10|     if: github.event_name != 'pull_request'
      11|     steps:
      12|       - uses: actions/checkout@v4
      13|       - run: npm test
      14|
      15|   e2e:
```

**verdict:**

---

## 9. positive-fixtures — .github/workflows/pr-skipped.yml:17

**Message:** Job `e2e` runs tests but its `if:` condition skips it on pull requests.

```
      12|       - uses: actions/checkout@v4
      13|       - run: npm test
      14|
      15|   e2e:
      16|     runs-on: ubuntu-latest
>>>   17|     if: github.event_name == 'push'
      18|     steps:
      19|       - uses: actions/checkout@v4
      20|       - run: npx playwright test
      21|
      22|   main-only:
```

**verdict:**

---

## 10. positive-fixtures — .github/workflows/pr-skipped.yml:24

**Message:** Job `main-only` runs tests but its `if:` condition skips it on pull requests.

```
      19|       - uses: actions/checkout@v4
      20|       - run: npx playwright test
      21|
      22|   main-only:
      23|     runs-on: ubuntu-latest
>>>   24|     if: github.ref == 'refs/heads/main'
      25|     steps:
      26|       - uses: actions/checkout@v4
      27|       - run: vitest run
      28|
```

**verdict:**

---
