# QA-PY-104 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-104/brittle-b-a3/test_brittle_b.py:7

**Message:** Brittle selector (absolute DOM path).

```
       2|
       3|
       4| def test_b_workflow(page: Page) -> None:
       5|     """Selector couples to layout position/generated ids."""
       6|     page.goto("/app")
>>>    7|     page.locator("/html/body/div[2]/div[3]/button").click()
       8|     expect(page.locator("#btn-2837")).to_be_visible()
```

**verdict:**

---

## 2. positive-fixtures — QA-PY-104/brittle-e-g3/test_brittle_e.py:7

**Message:** Brittle selector (absolute DOM path).

```
       2|
       3|
       4| def test_e_workflow(page: Page) -> None:
       5|     """Selector couples to layout position/generated ids."""
       6|     page.goto("/app")
>>>    7|     page.locator("/html/body/div[2]/div[3]/button").click()
       8|     expect(page.locator("#btn-2837")).to_be_visible()
```

**verdict:**

---

## 3. positive-fixtures — QA-PY-104/brittle-e-t3/test_brittle_e.py:7

**Message:** Brittle selector (absolute DOM path).

```
       2|
       3|
       4| def test_e_workflow(page: Page) -> None:
       5|     """Selector couples to layout position/generated ids."""
       6|     page.goto("/app")
>>>    7|     page.locator("/html/body/div[2]/div[3]/button").click()
       8|     expect(page.locator("#btn-2837")).to_be_visible()
```

**verdict:**

---

## 4. positive-fixtures — QA-PY-104/brittle-l-c3/test_brittle_l.py:7

**Message:** Brittle selector (absolute DOM path).

```
       2|
       3|
       4| def test_l_workflow(page: Page) -> None:
       5|     """Selector couples to layout position/generated ids."""
       6|     page.goto("/app")
>>>    7|     page.locator("/html/body/div[2]/div[3]/button").click()
       8|     expect(page.locator("#btn-2837")).to_be_visible()
```

**verdict:**

---

## 5. positive-fixtures — QA-PY-104/brittle-o-p3/test_brittle_o.py:7

**Message:** Brittle selector (absolute DOM path).

```
       2|
       3|
       4| def test_o_workflow(page: Page) -> None:
       5|     """Selector couples to layout position/generated ids."""
       6|     page.goto("/app")
>>>    7|     page.locator("/html/body/div[2]/div[3]/button").click()
       8|     expect(page.locator("#btn-2837")).to_be_visible()
```

**verdict:**

---

## 6. positive-fixtures — QA-PY-104/test_inventory_selectors.py:7

**Message:** Brittle selector (xpath= selector).

```
       2| from playwright.sync_api import Page, expect
       3|
       4|
       5| def test_inventory_grid(page: Page):
       6|     page.goto("https://app.example.com/inventory")
>>>    7|     row = page.locator("xpath=//table[@id='inventory']/tr[3]")
       8|     expect(row).to_be_visible()
       9|
      10|
      11| def test_nested_panels(page: Page):
      12|     page.goto("https://app.example.com/panels")
```

**verdict:**

---

## 7. positive-fixtures — QA-PY-104/test_inventory_selectors.py:13

**Message:** Brittle selector (xpath= selector).

```
       8|     expect(row).to_be_visible()
       9|
      10|
      11| def test_nested_panels(page: Page):
      12|     page.goto("https://app.example.com/panels")
>>>   13|     panel = page.locator("xpath=/html/body/div[2]/div/section")
      14|     assert panel.is_visible()
      15|     child = page.locator("div:nth-child(4) > span.price")
      16|     assert child.count() > 0
      17|
      18|
```

**verdict:**

---

## 8. positive-fixtures — QA-PY-104/test_inventory_selectors.py:15

**Message:** Brittle selector (nth-child CSS chain).

```
      10|
      11| def test_nested_panels(page: Page):
      12|     page.goto("https://app.example.com/panels")
      13|     panel = page.locator("xpath=/html/body/div[2]/div/section")
      14|     assert panel.is_visible()
>>>   15|     child = page.locator("div:nth-child(4) > span.price")
      16|     assert child.count() > 0
      17|
      18|
      19| def test_absolute_dom_path(page: Page):
      20|     page.goto("https://app.example.com/admin")
```

**verdict:**

---

## 9. positive-fixtures — QA-PY-104/test_inventory_selectors.py:21

**Message:** Brittle selector (absolute DOM path).

```
      16|     assert child.count() > 0
      17|
      18|
      19| def test_absolute_dom_path(page: Page):
      20|     page.goto("https://app.example.com/admin")
>>>   21|     item = page.locator("/html/body/div[1]/main/ul/li[2]")
      22|     assert item.is_visible()
      23|
```

**verdict:**

---

## 10. positive-fixtures — QA-PY-104/test_rows.py:2

**Message:** Brittle selector (xpath= selector).

```
       1| def test_row_visible(page):
>>>    2|     page.locator('xpath=//div[@id="app"]/div/div[2]/table/tr[3]').click()
       3|     assert page.get_by_text("Details").is_visible()
       4|
```

**verdict:**

---
