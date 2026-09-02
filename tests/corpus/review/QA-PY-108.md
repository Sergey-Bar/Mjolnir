# QA-PY-108 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-108/test_hardcoded_urls.py:5

**Message:** Hardcoded URL: `goto("https://app.example.com/dashboard"`.

```
       1| from playwright.sync_api import Page
       2|
       3|
       4| def test_prod_page(page: Page):
>>>    5|     page.goto("https://app.example.com/dashboard")
       6|
       7|
       8| def test_api_call(page):
       9|     response = page.request.get("https://api.example.com/v1/users")
      10|     assert response.ok
```

**verdict:**

---

## 2. positive-fixtures — QA-PY-108/test_hardcoded_urls.py:9

**Message:** Hardcoded URL: `request.get("https://api.example.com/v1/users"`.

```
       4| def test_prod_page(page: Page):
       5|     page.goto("https://app.example.com/dashboard")
       6|
       7|
       8| def test_api_call(page):
>>>    9|     response = page.request.get("https://api.example.com/v1/users")
      10|     assert response.ok
      11|
      12|
      13| def test_admin_console(page: Page):
      14|     page.goto("https://admin.example.com/overview")
```

**verdict:**

---

## 3. positive-fixtures — QA-PY-108/test_hardcoded_urls.py:14

**Message:** Hardcoded URL: `goto("https://admin.example.com/overview"`.

```
       9|     response = page.request.get("https://api.example.com/v1/users")
      10|     assert response.ok
      11|
      12|
      13| def test_admin_console(page: Page):
>>>   14|     page.goto("https://admin.example.com/overview")
      15|
      16|
      17| def test_staging_probe(page: Page):
      18|     page.goto("https://staging.example.com/health")
      19|
```

**verdict:**

---

## 4. positive-fixtures — QA-PY-108/test_hardcoded_urls.py:18

**Message:** Hardcoded URL: `goto("https://staging.example.com/health"`.

```
      13| def test_admin_console(page: Page):
      14|     page.goto("https://admin.example.com/overview")
      15|
      16|
      17| def test_staging_probe(page: Page):
>>>   18|     page.goto("https://staging.example.com/health")
      19|
```

**verdict:**

---
