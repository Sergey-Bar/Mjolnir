# QA-PY-011 — Sample Findings for Classification

Total sampled: 1 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pytest-dev-pytest — doc/en/example/fixtures/test_fixtures_order_scope.py:6

**Message:** Fixture `order` is session-scoped and returns a mutable collection.

```
       1| from __future__ import annotations
       2|
       3| import pytest
       4|
       5|
>>>    6| @pytest.fixture(scope="session")
       7| def order():
       8|     return []
       9|
      10|
      11| @pytest.fixture
```

**verdict:**

---
