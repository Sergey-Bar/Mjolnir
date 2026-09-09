# QA-PY-108 — Sample Findings for Classification

Total sampled: 14 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-104/test_inventory_selectors.py:6

**Message:** Hardcoded URL: `goto("https://app.example.com/inventory"`.

```
       1| import re
       2| from playwright.sync_api import Page, expect
       3|
       4|
       5| def test_inventory_grid(page: Page):
>>>    6|     page.goto("https://app.example.com/inventory")
       7|     row = page.locator("xpath=//table[@id='inventory']/tr[3]")
       8|     expect(row).to_be_visible()
       9|
      10|
      11| def test_nested_panels(page: Page):
```

**verdict:**

---

## 2. positive-fixtures — QA-PY-104/test_inventory_selectors.py:12

**Message:** Hardcoded URL: `goto("https://app.example.com/panels"`.

```
       7|     row = page.locator("xpath=//table[@id='inventory']/tr[3]")
       8|     expect(row).to_be_visible()
       9|
      10|
      11| def test_nested_panels(page: Page):
>>>   12|     page.goto("https://app.example.com/panels")
      13|     panel = page.locator("xpath=/html/body/div[2]/div/section")
      14|     assert panel.is_visible()
      15|     child = page.locator("div:nth-child(4) > span.price")
      16|     assert child.count() > 0
      17|
```

**verdict:**

---

## 3. positive-fixtures — QA-PY-104/test_inventory_selectors.py:20

**Message:** Hardcoded URL: `goto("https://app.example.com/admin"`.

```
      15|     child = page.locator("div:nth-child(4) > span.price")
      16|     assert child.count() > 0
      17|
      18|
      19| def test_absolute_dom_path(page: Page):
>>>   20|     page.goto("https://app.example.com/admin")
      21|     item = page.locator("/html/body/div[1]/main/ul/li[2]")
      22|     assert item.is_visible()
      23|
```

**verdict:**

---

## 4. positive-fixtures — QA-PY-108/test_hardcoded_admin.py:6

**Message:** Hardcoded URL: `goto("https://admin.example.test/dashboard"`.

```
       1| from playwright.sync_api import Page, expect
       2|
       3|
       4| def test_admin_dashboard(page: Page) -> None:
       5|     """Hardcoded origin: breaks when environments change."""
>>>    6|     page.goto("https://admin.example.test/dashboard")
       7|     expect(page.locator("#dashboard")).to_be_visible()
       8|
```

**verdict:**

---

## 5. positive-fixtures — QA-PY-108/test_hardcoded_apibase.py:6

**Message:** Hardcoded URL: `goto("https://api.example.test/ui/settings"`.

```
       1| from playwright.sync_api import Page, expect
       2|
       3|
       4| def test_api_settings(page: Page) -> None:
       5|     """API base hardcoded instead of the configured baseURL."""
>>>    6|     page.goto("https://api.example.test/ui/settings")
       7|     expect(page.locator("#settings")).to_be_visible()
       8|
```

**verdict:**

---

## 6. positive-fixtures — QA-PY-108/test_hardcoded_checkout.py:6

**Message:** Hardcoded URL: `goto("https://shop.example.test/checkout"`.

```
       1| from playwright.sync_api import Page, expect
       2|
       3|
       4| def test_checkout_page(page: Page) -> None:
       5|     """Hardcoded origin on the checkout flow."""
>>>    6|     page.goto("https://shop.example.test/checkout")
       7|     expect(page.locator("#pay")).to_be_visible()
       8|
```

**verdict:**

---

## 7. positive-fixtures — QA-PY-108/test_hardcoded_origin.py:6

**Message:** Hardcoded URL: `goto("https://app.example.test/settings"`.

```
       1| from playwright.sync_api import Page, expect
       2|
       3|
       4| def test_settings_page(page: Page) -> None:
       5|     """Hardcoded origin: breaks when environments change."""
>>>    6|     page.goto("https://app.example.test/settings")
       7|     expect(page.locator("#settings")).to_be_visible()
       8|
```

**verdict:**

---

## 8. positive-fixtures — QA-PY-108/test_hardcoded_profile.py:6

**Message:** Hardcoded URL: `goto("https://shop.example.test/profile"`.

```
       1| from playwright.sync_api import Page, expect
       2|
       3|
       4| def test_profile_settings(page: Page) -> None:
       5|     """Hardcoded origin on the profile flow."""
>>>    6|     page.goto("https://shop.example.test/profile")
       7|     expect(page.locator("#profile")).to_be_visible()
       8|
```

**verdict:**

---

## 9. positive-fixtures — QA-PY-108/test_hardcoded_rootnav.py:6

**Message:** Hardcoded URL: `goto("https://www.example.test/"`.

```
       1| from playwright.sync_api import Page, expect
       2|
       3|
       4| def test_root_navigation(page: Page) -> None:
       5|     """Hardcoded origin in a smoke test."""
>>>    6|     page.goto("https://www.example.test/")
       7|     expect(page.locator("header")).to_be_visible()
       8|
```

**verdict:**

---

## 10. positive-fixtures — QA-PY-108/test_hardcoded_urls.py:5

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

## 11. positive-fixtures — QA-PY-108/test_hardcoded_urls.py:9

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

## 12. positive-fixtures — QA-PY-108/test_hardcoded_urls.py:14

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

## 13. positive-fixtures — QA-PY-108/test_hardcoded_urls.py:18

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

## 14. positive-fixtures — QA-PY-108/test_staging_navigation.py:6

**Message:** Hardcoded URL: `goto("https://staging-admin.example.test/console"`.

```
       1| from playwright.sync_api import Page, expect
       2|
       3|
       4| def test_admin_console_reachable(page: Page) -> None:
       5|     """Points at the shared staging host instead of baseURL."""
>>>    6|     page.goto("https://staging-admin.example.test/console")
       7|     expect(page.locator("#console")).to_be_visible()
       8|
```

**verdict:**

---
