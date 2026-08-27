# QA-PW-004 — Sample Findings for Classification

Total sampled: 8 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorElementHandle.java:64

**Message:** Brittle XPath selector: `locator("xpath=`.

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

**Message:** Brittle XPath selector: `locator("xpath=`.

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

**Message:** Brittle XPath selector: `locator("xpath=`.

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

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorList.java:32

**Message:** Brittle deep structural CSS selector: `locator("div >> p")`.

```
      27| public class TestLocatorList extends TestBase {
      28|   @Test
      29|   void locatorAllShouldWork() {
      30|     page.setContent("<div><p>A</p><p>B</p><p>C</p></div>");
      31|     List<String> texts = new ArrayList<>();
>>>   32|     for (Locator p : page.locator("div >> p").all()) {
      33|       texts.add(p.textContent());
      34|     }
      35|     assertEquals(asList("A", "B", "C"), texts);
      36|   }
      37|
```

**verdict:**

---

## 5. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageLocatorQuery.java:35

**Message:** Brittle deep structural CSS selector: `locator("div >> p")`.

```
      30|     page.setContent("<section>\n" +
      31|       "    <div><p>A</p></div>\n" +
      32|       "    <div><p>A</p><p>A</p></div>\n" +
      33|       "    <div><p>A</p><p>A</p><p>A</p></div>\n" +
      34|       "  </section>");
>>>   35|     assertEquals(6, page.locator("div >> p").count());
      36|     assertEquals(6, page.locator("div").locator("p").count());
      37|     assertEquals(1, page.locator("div").first().locator("p").count());
      38|     assertEquals(3, page.locator("div").last().locator("p").count());
      39|   }
      40|
```

**verdict:**

---

## 6. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageLocatorQuery.java:48

**Message:** Brittle deep structural CSS selector: `locator("div >> p")`.

```
      43|     page.setContent("<section>\n" +
      44|       "    <div><p>A</p></div>\n" +
      45|       "    <div><p>A</p><p>A</p></div>\n" +
      46|       "    <div><p>A</p><p>A</p><p>A</p></div>\n" +
      47|       "  </section>");
>>>   48|     assertEquals(1, page.locator("div >> p").nth(0).count());
      49|     assertEquals(2, page.locator("div").nth(1).locator("p").count());
      50|     assertEquals(3, page.locator("div").nth(2).locator("p").count());
      51|   }
      52|
      53|   @Test
```

**verdict:**

---

## 7. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageLocatorQuery.java:57

**Message:** Brittle deep structural CSS selector: `locator("*css=div >> p")`.

```
      52|
      53|   @Test
      54|   void shouldThrowOnCaptureWNth() {
      55|     page.setContent("<section><div><p>A</p></div></section>");
      56|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> {
>>>   57|       page.locator("*css=div >> p").nth(1).click();
      58|     });
      59|     assertTrue(e.getMessage().contains("Can't query n-th element"), e.getMessage());
      60|   }
      61|
      62|   @Test
```

**verdict:**

---

## 8. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageLocatorQuery.java:187

**Message:** Brittle XPath selector: `locator("xpath=`.

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
