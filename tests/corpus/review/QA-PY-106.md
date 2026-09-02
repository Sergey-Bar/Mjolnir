# QA-PY-106 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-106/test_module_level_page.py:1

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

## 2. positive-fixtures — QA-PY-106/test_module_level_page.py:2

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

## 3. positive-fixtures — QA-PY-106/test_module_level_page.py:3

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

## 4. positive-fixtures — QA-PY-106/test_module_level_page.py:4

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
