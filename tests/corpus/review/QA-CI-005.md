# QA-CI-005 — Sample Findings for Classification

Total sampled: 5 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pytest-dev-pytest — .github/workflows/test.yml:310

**Message:** Job `build` consumes a coverage artifact that no step generates.

```
     305|       shell: bash
     306|       env:
     307|         _PYTEST_TOX_POSARGS_JUNIT: --junitxml=junit.xml
     308|       run: tox run -e ${{ matrix.tox_env }}-coverage --installpkg `find dist/*.tar.gz`
     309|
>>>  310|     - name: Upload coverage to Codecov
     311|       if: "matrix.use_coverage"
     312|       uses: codecov/codecov-action@fb8b3582c8e4def4969c97caa2f19720cb33a72f
     313|       with:
     314|         fail_ci_if_error: false
     315|         files: ./coverage.xml
```

**verdict:**

---

## 2. pytest-dev-pytest — .github/workflows/test.yml:310

**Message:** Job `build` consumes a coverage upload that no step generates.

```
     305|       shell: bash
     306|       env:
     307|         _PYTEST_TOX_POSARGS_JUNIT: --junitxml=junit.xml
     308|       run: tox run -e ${{ matrix.tox_env }}-coverage --installpkg `find dist/*.tar.gz`
     309|
>>>  310|     - name: Upload coverage to Codecov
     311|       if: "matrix.use_coverage"
     312|       uses: codecov/codecov-action@fb8b3582c8e4def4969c97caa2f19720cb33a72f
     313|       with:
     314|         fail_ci_if_error: false
     315|         files: ./coverage.xml
```

**verdict:**

---

## 3. nextauthjs-next-auth — .github/workflows/release.yml:129

**Message:** Job `test` consumes a coverage artifact that no step generates.

```
     124|         name: Upload Playwright artifacts
     125|         with:
     126|           name: playwright-traces
     127|           path: "**/packages/next-auth/test-results/*/trace.zip"
     128|           retention-days: 7
>>>  129|       - uses: codecov/codecov-action@v4
     130|         if: always()
     131|         name: Coverage
     132|         with:
     133|           token: ${{ secrets.CODECOV_TOKEN }}
     134|
```

**verdict:**

---

## 4. nextauthjs-next-auth — .github/workflows/release.yml:129

**Message:** Job `test` consumes a coverage upload that no step generates.

```
     124|         name: Upload Playwright artifacts
     125|         with:
     126|           name: playwright-traces
     127|           path: "**/packages/next-auth/test-results/*/trace.zip"
     128|           retention-days: 7
>>>  129|       - uses: codecov/codecov-action@v4
     130|         if: always()
     131|         name: Coverage
     132|         with:
     133|           token: ${{ secrets.CODECOV_TOKEN }}
     134|
```

**verdict:**

---

## 5. grafana-grafana — .github/workflows/check-frontend-test-coverage.yml:1

**Message:** Job `coverage` consumes a coverage artifact that no step generates.

```
>>>    1| name: Check Frontend Test Coverage
       2|
       3| on:
       4|   pull_request:
       5|     branches: [main]
       6|     types: [opened, synchronize, reopened, labeled, unlabeled]
```

**verdict:**

---
