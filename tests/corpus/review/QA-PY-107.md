# QA-PY-107 — Sample Findings for Classification

Total sampled: 3 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-107/test_networkidle.py:6

**Message:** `wait_for_load_state('networkidle')` used.

```
       1| from playwright.sync_api import Page
       2|
       3|
       4| def test_network_idle(page: Page):
       5|     page.goto("/feed")
>>>    6|     page.wait_for_load_state("networkidle")
       7|
       8|
       9| def test_infinite_scroll(page: Page):
      10|     page.goto("/timeline")
      11|     page.wait_for_load_state("networkidle")
```

**verdict:**

---

## 2. positive-fixtures — QA-PY-107/test_networkidle.py:11

**Message:** `wait_for_load_state('networkidle')` used.

```
       6|     page.wait_for_load_state("networkidle")
       7|
       8|
       9| def test_infinite_scroll(page: Page):
      10|     page.goto("/timeline")
>>>   11|     page.wait_for_load_state("networkidle")
      12|
      13|
      14| def test_live_updates(page: Page):
      15|     page.goto("/live")
      16|     page.wait_for_load_state("networkidle")
```

**verdict:**

---

## 3. positive-fixtures — QA-PY-107/test_networkidle.py:16

**Message:** `wait_for_load_state('networkidle')` used.

```
      11|     page.wait_for_load_state("networkidle")
      12|
      13|
      14| def test_live_updates(page: Page):
      15|     page.goto("/live")
>>>   16|     page.wait_for_load_state("networkidle")
      17|
```

**verdict:**

---
