# QA-CI-009 — Sample Findings for Classification

Total sampled: 5 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — .github/workflows/masked-pipes.yml:10

**Message:** Job `test` pipes the test command into another tool without `set -o pipefail`.

```
       5| jobs:
       6|   test:
       7|     runs-on: ubuntu-latest
       8|     steps:
       9|       - uses: actions/checkout@v4
>>>   10|       - run: npm test | tee test-results.log
      11|
      12|   integration:
      13|     runs-on: ubuntu-latest
      14|     steps:
      15|       - uses: actions/checkout@v4
```

**verdict:**

---

## 2. positive-fixtures — .github/workflows/masked-pipes.yml:16

**Message:** Job `integration` pipes the test command into another tool without `set -o pipefail`.

```
      11|
      12|   integration:
      13|     runs-on: ubuntu-latest
      14|     steps:
      15|       - uses: actions/checkout@v4
>>>   16|       - run: yarn test | tee integration.log
      17|
      18|   paged:
      19|     runs-on: ubuntu-latest
      20|     steps:
      21|       - uses: actions/checkout@v4
```

**verdict:**

---

## 3. positive-fixtures — .github/workflows/masked-pipes.yml:22

**Message:** Job `paged` pipes the test command into another tool without `set -o pipefail`.

```
      17|
      18|   paged:
      19|     runs-on: ubuntu-latest
      20|     steps:
      21|       - uses: actions/checkout@v4
>>>   22|       - run: npm test | tee out.txt
      23|
```

**verdict:**

---

## 4. positive-fixtures — .github/workflows/sequenced-gates.yml:10

**Message:** Job `smoke` sequences commands with `; ` after the test command — the test result does not fail the step.

```
       5| jobs:
       6|   smoke:
       7|     runs-on: ubuntu-latest
       8|     steps:
       9|       - uses: actions/checkout@v4
>>>   10|       - run: npm test; npm run lint
      11|
      12|   regression:
      13|     runs-on: ubuntu-latest
      14|     steps:
      15|       - uses: actions/checkout@v4
```

**verdict:**

---

## 5. positive-fixtures — .github/workflows/sequenced-gates.yml:16

**Message:** Job `regression` sequences commands with `; ` after the test command — the test result does not fail the step.

```
      11|
      12|   regression:
      13|     runs-on: ubuntu-latest
      14|     steps:
      15|       - uses: actions/checkout@v4
>>>   16|       - run: pytest; make lint
      17|
      18|   vitest-tee:
      19|     runs-on: ubuntu-latest
      20|     steps:
      21|       - uses: actions/checkout@v4
```

**verdict:**

---
