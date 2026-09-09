# QA-PY-107 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-107/a-idle-k2/test_a.py:7

**Message:** `wait_for_load_state('networkidle')` used.

```
       2|
       3|
       4| def test_a_networkidle(page: Page) -> None:
       5|     """networkidle wait on a websocket-heavy page — never settles."""
       6|     page.goto("/a")
>>>    7|     page.wait_for_load_state("networkidle")
       8|     expect(page.locator(".loaded")).to_be_visible()
```

**verdict:**

---

## 2. positive-fixtures — QA-PY-107/e-idle-t2/test_e.py:7

**Message:** `wait_for_load_state('networkidle')` used.

```
       2|
       3|
       4| def test_e_networkidle(page: Page) -> None:
       5|     """networkidle wait on a websocket-heavy page — never settles."""
       6|     page.goto("/e")
>>>    7|     page.wait_for_load_state("networkidle")
       8|     expect(page.locator(".loaded")).to_be_visible()
```

**verdict:**

---

## 3. positive-fixtures — QA-PY-107/i-idle-f2/test_i.py:7

**Message:** `wait_for_load_state('networkidle')` used.

```
       2|
       3|
       4| def test_i_networkidle(page: Page) -> None:
       5|     """networkidle wait on a websocket-heavy page — never settles."""
       6|     page.goto("/i")
>>>    7|     page.wait_for_load_state("networkidle")
       8|     expect(page.locator(".loaded")).to_be_visible()
```

**verdict:**

---

## 4. positive-fixtures — QA-PY-107/i-idle-l2/test_i.py:7

**Message:** `wait_for_load_state('networkidle')` used.

```
       2|
       3|
       4| def test_i_networkidle(page: Page) -> None:
       5|     """networkidle wait on a websocket-heavy page — never settles."""
       6|     page.goto("/i")
>>>    7|     page.wait_for_load_state("networkidle")
       8|     expect(page.locator(".loaded")).to_be_visible()
```

**verdict:**

---

## 5. positive-fixtures — QA-PY-107/n-idle-i2/test_n.py:7

**Message:** `wait_for_load_state('networkidle')` used.

```
       2|
       3|
       4| def test_n_networkidle(page: Page) -> None:
       5|     """networkidle wait on a websocket-heavy page — never settles."""
       6|     page.goto("/n")
>>>    7|     page.wait_for_load_state("networkidle")
       8|     expect(page.locator(".loaded")).to_be_visible()
```

**verdict:**

---

## 6. positive-fixtures — QA-PY-107/s-idle-u2/test_s.py:7

**Message:** `wait_for_load_state('networkidle')` used.

```
       2|
       3|
       4| def test_s_networkidle(page: Page) -> None:
       5|     """networkidle wait on a websocket-heavy page — never settles."""
       6|     page.goto("/s")
>>>    7|     page.wait_for_load_state("networkidle")
       8|     expect(page.locator(".loaded")).to_be_visible()
```

**verdict:**

---

## 7. positive-fixtures — QA-PY-107/test_networkidle.py:6

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

## 8. positive-fixtures — QA-PY-107/test_networkidle.py:11

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

## 9. positive-fixtures — QA-PY-107/test_networkidle.py:16

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

## 10. positive-fixtures — QA-PY-107/u-idle-a2/test_u.py:7

**Message:** `wait_for_load_state('networkidle')` used.

```
       2|
       3|
       4| def test_u_networkidle(page: Page) -> None:
       5|     """networkidle wait on a websocket-heavy page — never settles."""
       6|     page.goto("/u")
>>>    7|     page.wait_for_load_state("networkidle")
       8|     expect(page.locator(".loaded")).to_be_visible()
```

**verdict:**

---
