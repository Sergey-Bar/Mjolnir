# QA-PY-101 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-101/a-h2/test_a.py:16

**Message:** Async test `test_a_async` in a file importing playwright.sync_api.

```
      11|         page = browser.new_page()
      12|         page.goto("/a")
      13|         page.wait_for_selector(".loaded")
      14|
      15|
>>>   16| async def test_a_async() -> None:
      17|     async with async_playwright() as p:
      18|         browser = await p.chromium.launch()
      19|         page = await browser.new_page()
      20|         await page.goto("/a")
      21|         page.wait_for_selector(".loaded")
```

**verdict:**

---

## 2. positive-fixtures — QA-PY-101/a-mix-v21/test_a_mix.py:15

**Message:** Async test `test_a_dashboard` in a file importing playwright.sync_api.

```
      10| @pytest.fixture
      11| def page_fixture():
      12|     yield from launch_sync()
      13|
      14|
>>>   15| async def test_a_dashboard(page_fixture):
      16|     await page_fixture.goto("/a")
      17|     assert await page_fixture.locator(".ready").is_visible()
```

**verdict:**

---

## 3. positive-fixtures — QA-PY-101/a-mix-w21/test_a_mix.py:15

**Message:** Async test `test_a_dashboard` in a file importing playwright.sync_api.

```
      10| @pytest.fixture
      11| def page_fixture():
      12|     yield from launch_sync()
      13|
      14|
>>>   15| async def test_a_dashboard(page_fixture):
      16|     await page_fixture.goto("/a")
      17|     assert await page_fixture.locator(".ready").is_visible()
```

**verdict:**

---

## 4. positive-fixtures — QA-PY-101/i-m2/test_i.py:16

**Message:** Async test `test_i_async` in a file importing playwright.sync_api.

```
      11|         page = browser.new_page()
      12|         page.goto("/i")
      13|         page.wait_for_selector(".loaded")
      14|
      15|
>>>   16| async def test_i_async() -> None:
      17|     async with async_playwright() as p:
      18|         browser = await p.chromium.launch()
      19|         page = await browser.new_page()
      20|         await page.goto("/i")
      21|         page.wait_for_selector(".loaded")
```

**verdict:**

---

## 5. positive-fixtures — QA-PY-101/o-mix-p21/test_o_mix.py:15

**Message:** Async test `test_o_dashboard` in a file importing playwright.sync_api.

```
      10| @pytest.fixture
      11| def page_fixture():
      12|     yield from launch_sync()
      13|
      14|
>>>   15| async def test_o_dashboard(page_fixture):
      16|     await page_fixture.goto("/o")
      17|     assert await page_fixture.locator(".ready").is_visible()
```

**verdict:**

---

## 6. positive-fixtures — QA-PY-101/test_sync_async_mix.py:4

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

## 7. positive-fixtures — QA-PY-101/test_sync_async_mix.py:8

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

## 8. positive-fixtures — QA-PY-101/test_sync_async_mix.py:12

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

## 9. positive-fixtures — QA-PY-101/test_sync_async_mix.py:16

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

## 10. positive-fixtures — QA-PY-101/y-s2/test_y.py:16

**Message:** Async test `test_y_async` in a file importing playwright.sync_api.

```
      11|         page = browser.new_page()
      12|         page.goto("/y")
      13|         page.wait_for_selector(".loaded")
      14|
      15|
>>>   16| async def test_y_async() -> None:
      17|     async with async_playwright() as p:
      18|         browser = await p.chromium.launch()
      19|         page = await browser.new_page()
      20|         await page.goto("/y")
      21|         page.wait_for_selector(".loaded")
```

**verdict:**

---
