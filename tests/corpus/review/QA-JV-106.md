# QA-JV-106 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorElementHandle.java:64

**Message:** Brittle selector (xpath= selector).

```
      59|   @Test
      60|   void xpathShouldQueryExistingElement() {
      61|     page.navigate(server.PREFIX + "/playground.html");
      62|     page.setContent("<html><body><div class='second'><div class='inner'>A</div></div></body></html>");
      63|     Locator html = page.locator("html");
>>>   64|     Locator second = html.locator("xpath=./body/div[contains(@class, 'second')]");
      65|     Locator inner = second.locator("xpath=./div[contains(@class, 'inner')]");
      66|     Object content = page.evaluate("e => e.textContent", inner.elementHandle());
      67|     assertEquals("A", content);
      68|   }
      69|
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorElementHandle.java:65

**Message:** Brittle selector (xpath= selector).

```
      60|   void xpathShouldQueryExistingElement() {
      61|     page.navigate(server.PREFIX + "/playground.html");
      62|     page.setContent("<html><body><div class='second'><div class='inner'>A</div></div></body></html>");
      63|     Locator html = page.locator("html");
      64|     Locator second = html.locator("xpath=./body/div[contains(@class, 'second')]");
>>>   65|     Locator inner = second.locator("xpath=./div[contains(@class, 'inner')]");
      66|     Object content = page.evaluate("e => e.textContent", inner.elementHandle());
      67|     assertEquals("A", content);
      68|   }
      69|
      70|   @Test
```

**verdict:**

---

## 3. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorElementHandle.java:74

**Message:** Brittle selector (xpath= selector).

```
      69|
      70|   @Test
      71|   void xpathShouldReturnNullForNonExistingElement() {
      72|     page.setContent("<html><body><div class='second'><div class='inner'>B</div></div></body></html>");
      73|     Locator html = page.locator("html");
>>>   74|     List<ElementHandle> second = html.locator("xpath=/div[contains(@class, 'third')]").elementHandles();
      75|     assertEquals(asList(), second);
      76|   }
      77| }
      78|
```

**verdict:**

---

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageLocatorQuery.java:187

**Message:** Brittle selector (xpath= selector).

```
     182|     page.setContent("<div><span>hello</span></div><div><span>world</span></div>");
     183|     assertThat(page.locator("div", new Page.LocatorOptions().setHas(page.locator("text=world")))).hasCount(1);
     184|     assertEquals("<div><span>world</span></div>", removeHighlight((String) page.locator("div", new Page.LocatorOptions().setHas(page.locator("text=world"))).evaluate("e => e.outerHTML")));
     185|     assertThat(page.locator("div", new Page.LocatorOptions().setHas(page.locator("text='hello'")))).hasCount(1);
     186|     assertEquals("<div><span>hello</span></div>", removeHighlight((String) page.locator("div", new Page.LocatorOptions().setHas(page.locator("text='hello'"))).evaluate("e => e.outerHTML")));
>>>  187|     assertThat(page.locator("div", new Page.LocatorOptions().setHas(page.locator("xpath=./span")))).hasCount(2);
     188|     assertThat(page.locator("div", new Page.LocatorOptions().setHas(page.locator("span")))).hasCount(2);
     189|     assertThat(page.locator("div", new Page.LocatorOptions().setHas(page.locator("span", new Page.LocatorOptions().setHasText("wor"))))).hasCount(1);
     190|     assertEquals("<div><span>world</span></div>", removeHighlight((String) page.locator("div", new Page.LocatorOptions().setHas(
     191|       page.locator("span", new Page.LocatorOptions().setHasText("wor")))).evaluate("e => e.outerHTML")));
     192|     assertThat(page.locator("div", new Page.LocatorOptions()
```

**verdict:**

---
