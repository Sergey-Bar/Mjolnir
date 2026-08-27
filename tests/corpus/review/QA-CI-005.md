# QA-CI-005 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

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
