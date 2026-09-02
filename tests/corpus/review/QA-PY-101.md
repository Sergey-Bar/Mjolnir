# QA-PY-101 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-101/test_sync_async_mix.py:4

**Message:** Async test `test_login_flow` in a file importing playwright.sync_api.

```
       1| from playwright.sync_api import sync_playwright
       2|
       3|
>>>    4| async def test_login_flow(page):
       5|     await page.goto("/login")
       6|
       7|
       8| async def test_signup_flow(page):
       9|     await page.goto("/signup")
```

**verdict:**

---

## 2. positive-fixtures — QA-PY-101/test_sync_async_mix.py:8

**Message:** Async test `test_signup_flow` in a file importing playwright.sync_api.

```
       3|
       4| async def test_login_flow(page):
       5|     await page.goto("/login")
       6|
       7|
>>>    8| async def test_signup_flow(page):
       9|     await page.goto("/signup")
      10|
      11|
      12| async def test_profile_flow(page):
      13|     await page.goto("/profile")
```

**verdict:**

---

## 3. positive-fixtures — QA-PY-101/test_sync_async_mix.py:12

**Message:** Async test `test_profile_flow` in a file importing playwright.sync_api.

```
       7|
       8| async def test_signup_flow(page):
       9|     await page.goto("/signup")
      10|
      11|
>>>   12| async def test_profile_flow(page):
      13|     await page.goto("/profile")
      14|
      15|
      16| async def test_settings_flow(page):
      17|     await page.goto("/settings")
```

**verdict:**

---

## 4. positive-fixtures — QA-PY-101/test_sync_async_mix.py:16

**Message:** Async test `test_settings_flow` in a file importing playwright.sync_api.

```
      11|
      12| async def test_profile_flow(page):
      13|     await page.goto("/profile")
      14|
      15|
>>>   16| async def test_settings_flow(page):
      17|     await page.goto("/settings")
      18|
```

**verdict:**

---
