# QA-PY-104 — Sample Findings for Classification

Total sampled: 12 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-pytest — tests/test_asyncio.py:97

**Message:** Brittle selector (id via query_selector).

```
      92|         async def test_default(page, browser_name):
      93|             assert browser_name == "chromium"
      94|             user_agent = await page.evaluate("window.navigator.userAgent")
      95|             assert "HeadlessChrome" in user_agent
      96|             await page.set_content('<span id="foo">bar</span>')
>>>   97|             assert await page.query_selector("#foo")
      98|     """
      99|     )
     100|     result = testdir.runpytest()
     101|     result.assert_outcomes(passed=1)
     102|
```

**verdict:**

---

## 2. microsoft-playwright-pytest — tests/test_asyncio.py:170

**Message:** Brittle selector (id via query_selector).

```
     165|         """
     166|         import pytest
     167|         @pytest.mark.asyncio
     168|         async def test_multiple_browsers(page):
     169|             await page.set_content('<span id="foo">bar</span>')
>>>  170|             assert page.query_selector("#foo")
     171|     """
     172|     )
     173|     result = testdir.runpytest(
     174|         "--browser", "chromium", "--browser", "firefox", "--browser", "webkit"
     175|     )
```

**verdict:**

---

## 3. microsoft-playwright-pytest — tests/test_asyncio.py:408

**Message:** Brittle selector (id via query_selector).

```
     403|         import pytest
     404|         @pytest.mark.asyncio
     405|         async def test_a(page):
     406|             await page.set_content('<span id="foo">a</span>')
     407|             await page.wait_for_timeout(200)
>>>  408|             assert page.query_selector("#foo")
     409|
     410|         @pytest.mark.asyncio
     411|         async def test_b(page):
     412|             await page.wait_for_timeout(2000)
     413|             await page.set_content('<span id="foo">a</span>')
```

**verdict:**

---

## 4. microsoft-playwright-pytest — tests/test_asyncio.py:414

**Message:** Brittle selector (id via query_selector).

```
     409|
     410|         @pytest.mark.asyncio
     411|         async def test_b(page):
     412|             await page.wait_for_timeout(2000)
     413|             await page.set_content('<span id="foo">a</span>')
>>>  414|             assert page.query_selector("#foo")
     415|
     416|         @pytest.mark.asyncio
     417|         async def test_c(page):
     418|             await page.set_content('<span id="foo">a</span>')
     419|             await page.wait_for_timeout(200)
```

**verdict:**

---

## 5. microsoft-playwright-pytest — tests/test_asyncio.py:420

**Message:** Brittle selector (id via query_selector).

```
     415|
     416|         @pytest.mark.asyncio
     417|         async def test_c(page):
     418|             await page.set_content('<span id="foo">a</span>')
     419|             await page.wait_for_timeout(200)
>>>  420|             assert page.query_selector("#foo")
     421|
     422|         @pytest.mark.asyncio
     423|         async def test_d(page):
     424|             await page.set_content('<span id="foo">a</span>')
     425|             await page.wait_for_timeout(200)
```

**verdict:**

---

## 6. microsoft-playwright-pytest — tests/test_asyncio.py:426

**Message:** Brittle selector (id via query_selector).

```
     421|
     422|         @pytest.mark.asyncio
     423|         async def test_d(page):
     424|             await page.set_content('<span id="foo">a</span>')
     425|             await page.wait_for_timeout(200)
>>>  426|             assert page.query_selector("#foo")
     427|     """
     428|     )
     429|     result = testdir.runpytest(
     430|         "--verbose",
     431|         "--browser",
```

**verdict:**

---

## 7. microsoft-playwright-pytest — tests/test_sync.py:93

**Message:** Brittle selector (id via query_selector).

```
      88|         def test_default(page, browser_name):
      89|             assert browser_name == "chromium"
      90|             user_agent = page.evaluate("window.navigator.userAgent")
      91|             assert "HeadlessChrome" in user_agent
      92|             page.set_content('<span id="foo">bar</span>')
>>>   93|             assert page.query_selector("#foo")
      94|     """
      95|     )
      96|     result = testdir.runpytest()
      97|     result.assert_outcomes(passed=1)
      98|
```

**verdict:**

---

## 8. microsoft-playwright-pytest — tests/test_sync.py:204

**Message:** Brittle selector (id via query_selector).

```
     199| def test_multiple_browsers(testdir: pytest.Testdir) -> None:
     200|     testdir.makepyfile(
     201|         """
     202|         def test_multiple_browsers(page):
     203|             page.set_content('<span id="foo">bar</span>')
>>>  204|             assert page.query_selector("#foo")
     205|     """
     206|     )
     207|     result = testdir.runpytest(
     208|         "--browser", "chromium", "--browser", "firefox", "--browser", "webkit"
     209|     )
```

**verdict:**

---

## 9. microsoft-playwright-pytest — tests/test_sync.py:422

**Message:** Brittle selector (id via query_selector).

```
     417|     testdir.makepyfile(
     418|         """
     419|         def test_a(page):
     420|             page.set_content('<span id="foo">a</span>')
     421|             page.wait_for_timeout(200)
>>>  422|             assert page.query_selector("#foo")
     423|
     424|         def test_b(page):
     425|             page.wait_for_timeout(2000)
     426|             page.set_content('<span id="foo">a</span>')
     427|             assert page.query_selector("#foo")
```

**verdict:**

---

## 10. microsoft-playwright-pytest — tests/test_sync.py:427

**Message:** Brittle selector (id via query_selector).

```
     422|             assert page.query_selector("#foo")
     423|
     424|         def test_b(page):
     425|             page.wait_for_timeout(2000)
     426|             page.set_content('<span id="foo">a</span>')
>>>  427|             assert page.query_selector("#foo")
     428|
     429|         def test_c(page):
     430|             page.set_content('<span id="foo">a</span>')
     431|             page.wait_for_timeout(200)
     432|             assert page.query_selector("#foo")
```

**verdict:**

---

## 11. microsoft-playwright-pytest — tests/test_sync.py:432

**Message:** Brittle selector (id via query_selector).

```
     427|             assert page.query_selector("#foo")
     428|
     429|         def test_c(page):
     430|             page.set_content('<span id="foo">a</span>')
     431|             page.wait_for_timeout(200)
>>>  432|             assert page.query_selector("#foo")
     433|
     434|         def test_d(page):
     435|             page.set_content('<span id="foo">a</span>')
     436|             page.wait_for_timeout(200)
     437|             assert page.query_selector("#foo")
```

**verdict:**

---

## 12. microsoft-playwright-pytest — tests/test_sync.py:437

**Message:** Brittle selector (id via query_selector).

```
     432|             assert page.query_selector("#foo")
     433|
     434|         def test_d(page):
     435|             page.set_content('<span id="foo">a</span>')
     436|             page.wait_for_timeout(200)
>>>  437|             assert page.query_selector("#foo")
     438|     """
     439|     )
     440|     result = testdir.runpytest(
     441|         "--verbose",
     442|         "--browser",
```

**verdict:**

---
