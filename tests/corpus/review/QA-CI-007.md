# QA-CI-007 — Sample Findings for Classification

Total sampled: 11 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. streamlit-streamlit — .github/workflows/ai-qa-testing.yml:1

**Message:** Job `post-results` contains a shell retry loop around tests.

```
>>>    1| # AI QA Testing workflow runs QA tests on a PR branch using Cursor CLI
       2| name: AI QA Testing
       3|
       4| on:
       5|   pull_request:
       6|     types: [labeled]
```

**verdict:**

---

## 2. Humanizr-Humanizer — .github/workflows/docs.yml:1

**Message:** Job `record-production-deployment` contains a shell retry loop around tests.

```
>>>    1| name: Documentation
       2|
       3| on:
       4|   pull_request:
       5|   push:
       6|     branches:
```

**verdict:**

---

## 3. keycloak-keycloak — .github/workflows/stability-base-reruns.yml:1

**Message:** Job `base-integration-tests` contains a shell retry loop around tests.

```
>>>    1| name: Stability - Base Reruns
       2|
       3| on:
       4|   workflow_dispatch:
       5|     inputs:
       6|       tests:
```

**verdict:**

---

## 4. github-docs — .github/workflows/local-dev.yml:1

**Message:** Job `local-dev` contains a shell retry loop around tests.

```
>>>    1| name: Local development
       2|
       3| # **What it does**: Basic smoke test to ensure local dev server starts and serves content
       4| # **Why we have it**: Catch catastrophic "npm start is completely broken" scenarios
       5| # **Who does it impact**: Engineers, Contributors.
       6|
```

**verdict:**

---

## 5. positive-fixtures — .github/workflows/more-retry-wrappers.yml:10

**Message:** Job `flaky-e2e` wraps a test command in an automatic retry action.

```
       5| jobs:
       6|   flaky-e2e:
       7|     runs-on: ubuntu-latest
       8|     steps:
       9|       - uses: actions/checkout@v4
>>>   10|       - uses: nick-fields/retry@v3
      11|         with:
      12|           max_tries: 4
      13|           command: npx playwright test --project=smoke
      14|
      15|   regression-retry:
```

**verdict:**

---

## 6. positive-fixtures — .github/workflows/more-retry-wrappers.yml:10

**Message:** Job `regression-retry` wraps a test command in an automatic retry action.

```
       5| jobs:
       6|   flaky-e2e:
       7|     runs-on: ubuntu-latest
       8|     steps:
       9|       - uses: actions/checkout@v4
>>>   10|       - uses: nick-fields/retry@v3
      11|         with:
      12|           max_tries: 4
      13|           command: npx playwright test --project=smoke
      14|
      15|   regression-retry:
```

**verdict:**

---

## 7. positive-fixtures — .github/workflows/more-retry-wrappers.yml:10

**Message:** Job `vitest-retry` wraps a test command in an automatic retry action.

```
       5| jobs:
       6|   flaky-e2e:
       7|     runs-on: ubuntu-latest
       8|     steps:
       9|       - uses: actions/checkout@v4
>>>   10|       - uses: nick-fields/retry@v3
      11|         with:
      12|           max_tries: 4
      13|           command: npx playwright test --project=smoke
      14|
      15|   regression-retry:
```

**verdict:**

---

## 8. positive-fixtures — .github/workflows/more-retry-wrappers.yml:10

**Message:** Job `retry-shard` wraps a test command in an automatic retry action.

```
       5| jobs:
       6|   flaky-e2e:
       7|     runs-on: ubuntu-latest
       8|     steps:
       9|       - uses: actions/checkout@v4
>>>   10|       - uses: nick-fields/retry@v3
      11|         with:
      12|           max_tries: 4
      13|           command: npx playwright test --project=smoke
      14|
      15|   regression-retry:
```

**verdict:**

---

## 9. positive-fixtures — .github/workflows/more-retry-wrappers.yml:10

**Message:** Job `retry-shard` wraps a test command in an automatic retry action.

```
       5| jobs:
       6|   flaky-e2e:
       7|     runs-on: ubuntu-latest
       8|     steps:
       9|       - uses: actions/checkout@v4
>>>   10|       - uses: nick-fields/retry@v3
      11|         with:
      12|           max_tries: 4
      13|           command: npx playwright test --project=smoke
      14|
      15|   regression-retry:
```

**verdict:**

---

## 10. positive-fixtures — .github/workflows/retry-wrappers.yml:16

**Message:** Job `flaky-suite` wraps a test command in an automatic retry action.

```
      11|
      12|   flaky-suite:
      13|     runs-on: ubuntu-latest
      14|     steps:
      15|       - uses: actions/checkout@v4
>>>   16|       - uses: nick-fields/retry@v3
      17|         with:
      18|           max_tries: 3
      19|           command: npx playwright test
      20|
      21|   nightly-e2e:
```

**verdict:**

---

## 11. positive-fixtures — .github/workflows/retry-wrappers.yml:16

**Message:** Job `nightly-e2e` wraps a test command in an automatic retry action.

```
      11|
      12|   flaky-suite:
      13|     runs-on: ubuntu-latest
      14|     steps:
      15|       - uses: actions/checkout@v4
>>>   16|       - uses: nick-fields/retry@v3
      17|         with:
      18|           max_tries: 3
      19|           command: npx playwright test
      20|
      21|   nightly-e2e:
```

**verdict:**

---
