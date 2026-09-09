# QA-PY-106 — Sample Findings for Classification

Total sampled: 14 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-106/module-e-r4/test_e.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_e_renders() -> None:
       8|     page.goto("/e")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 2. positive-fixtures — QA-PY-106/module-e-s4/test_e.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_e_renders() -> None:
       8|     page.goto("/e")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 3. positive-fixtures — QA-PY-106/module-e-t4/test_e.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_e_renders() -> None:
       8|     page.goto("/e")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 4. positive-fixtures — QA-PY-106/module-n-i4/test_n.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_n_renders() -> None:
       8|     page.goto("/n")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 5. positive-fixtures — QA-PY-106/module-page-e-r3/test_e.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_{name}_renders() -> None:
       8|     page.goto("/{name}")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 6. positive-fixtures — QA-PY-106/module-page-e-s3/test_e.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_{name}_renders() -> None:
       8|     page.goto("/{name}")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 7. positive-fixtures — QA-PY-106/module-page-e-t3/test_e.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_{name}_renders() -> None:
       8|     page.goto("/{name}")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 8. positive-fixtures — QA-PY-106/module-page-i-s3/test_i.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_{name}_renders() -> None:
       8|     page.goto("/{name}")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 9. positive-fixtures — QA-PY-106/module-page-u-s3/test_u.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_{name}_renders() -> None:
       8|     page.goto("/{name}")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 10. positive-fixtures — QA-PY-106/module-r-p4/test_r.py:4

**Message:** Module-level `page = ` — browser state shared across tests.

```
       1| from playwright.sync_api import Page, sync_playwright
       2|
       3| # Module-level page shared by every test below.
>>>    4| page = sync_playwright().start().new_page()
       5|
       6|
       7| def test_r_renders() -> None:
       8|     page.goto("/r")
       9|     assert page.locator("main").is_visible()
```

**verdict:**

---

## 11. positive-fixtures — QA-PY-106/test_module_level_page.py:1

**Message:** Module-level `page = ` — browser state shared across tests.

```
>>>    1| page = browser.new_page()
       2| context = browser.new_context()
       3| browser = playwright.chromium.launch()
       4| browser_context = context.new_page()
       5| browser2 = playwright.webkit.launch()
       6| context2 = browser.new_context()
```

**verdict:**

---

## 12. positive-fixtures — QA-PY-106/test_module_level_page.py:2

**Message:** Module-level `context = ` — browser state shared across tests.

```
       1| page = browser.new_page()
>>>    2| context = browser.new_context()
       3| browser = playwright.chromium.launch()
       4| browser_context = context.new_page()
       5| browser2 = playwright.webkit.launch()
       6| context2 = browser.new_context()
       7|
```

**verdict:**

---

## 13. positive-fixtures — QA-PY-106/test_module_level_page.py:3

**Message:** Module-level `browser = ` — browser state shared across tests.

```
       1| page = browser.new_page()
       2| context = browser.new_context()
>>>    3| browser = playwright.chromium.launch()
       4| browser_context = context.new_page()
       5| browser2 = playwright.webkit.launch()
       6| context2 = browser.new_context()
       7|
```

**verdict:**

---

## 14. positive-fixtures — QA-PY-106/test_module_level_page.py:4

**Message:** Module-level `browser_context = ` — browser state shared across tests.

```
       1| page = browser.new_page()
       2| context = browser.new_context()
       3| browser = playwright.chromium.launch()
>>>    4| browser_context = context.new_page()
       5| browser2 = playwright.webkit.launch()
       6| context2 = browser.new_context()
       7|
```

**verdict:**

---
