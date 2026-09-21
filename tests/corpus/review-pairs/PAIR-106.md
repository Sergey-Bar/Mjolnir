# PAIR-106 — cross-language side-by-side review aid

> Review aid only — decides nothing. Classify each finding in its own
> rule sheet / verdict row; use this view to keep verdicts CONSISTENT
> across the language family (same pattern ⇒ same verdict class in
> every language, unless the language genuinely changes the case).

Rules in this family: QA-JV-106, QA-CS-106, QA-PY-104

## QA-JV-106 — 4 sampled finding(s)

### microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorElementHandle.java:64

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

**verdict:** (unclassified)

### microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorElementHandle.java:65

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

**verdict:** (unclassified)

### microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorElementHandle.java:74

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

**verdict:** (unclassified)

### microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageLocatorQuery.java:187

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

**verdict:** (unclassified)

## QA-CS-106 — 4 sampled finding(s)

### microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorElementHandleTests.cs:66

**Message:** Brittle selector (xpath= selector).

```
      61|     [PlaywrightTest("locator-element-handle.spec.ts", "xpath should query existing element")]
      62|     public async Task XPathShouldQueryExistingElement()
      63|     {
      64|         await Page.SetContentAsync("<html><body><div class=\"second\"><div class=\"inner\">A</div></div></body></html>");
      65|         var html = Page.Locator("html");
>>>   66|         var second = html.Locator("xpath=./body/div[contains(@class, 'second')]");
      67|         var inner = second.Locator("xpath=./div[contains(@class, 'inner')]");
      68|         var content = await Page.EvaluateAsync<string>("e => e.textContent", await inner.ElementHandleAsync());
      69|         Assert.AreEqual("A", content);
      70|     }
      71|
```

**verdict:** (unclassified)

### microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorElementHandleTests.cs:67

**Message:** Brittle selector (xpath= selector).

```
      62|     public async Task XPathShouldQueryExistingElement()
      63|     {
      64|         await Page.SetContentAsync("<html><body><div class=\"second\"><div class=\"inner\">A</div></div></body></html>");
      65|         var html = Page.Locator("html");
      66|         var second = html.Locator("xpath=./body/div[contains(@class, 'second')]");
>>>   67|         var inner = second.Locator("xpath=./div[contains(@class, 'inner')]");
      68|         var content = await Page.EvaluateAsync<string>("e => e.textContent", await inner.ElementHandleAsync());
      69|         Assert.AreEqual("A", content);
      70|     }
      71|
      72|     [PlaywrightTest("locator-element-handle.spec.ts", "xpath should return null for non-existing element")]
```

**verdict:** (unclassified)

### microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorElementHandleTests.cs:77

**Message:** Brittle selector (xpath= selector).

```
      72|     [PlaywrightTest("locator-element-handle.spec.ts", "xpath should return null for non-existing element")]
      73|     public async Task XPathShouldReturnNullForNonExistingElement()
      74|     {
      75|         await Page.SetContentAsync("<html><body><div class=\"second\"><div class=\"inner\">A</div></div></body></html>");
      76|         var html = Page.Locator("html");
>>>   77|         var second = await html.Locator("xpath=/div[contains(@class, 'third')]").ElementHandlesAsync();
      78|         Assert.AreEqual(0, second.Count);
      79|     }
      80| }
      81|
```

**verdict:** (unclassified)

### microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorQueryTests.cs:214

**Message:** Brittle selector (xpath= selector).

```
     209|         await Page.SetContentAsync("<div><span>hello</span></div><div><span>world</span></div>");
     210|         await Expect(Page.Locator("div", new() { Has = Page.Locator("text=world") })).ToHaveCountAsync(1);
     211|         Assert.AreEqual("<div><span>world</span></div>", await Page.Locator("div", new() { Has = Page.Locator("text=world") }).EvaluateAsync<string>("e => e.outerHTML"));
     212|         await Expect(Page.Locator("div", new() { Has = Page.Locator("text=hello") })).ToHaveCountAsync(1);
     213|         Assert.AreEqual("<div><span>hello</span></div>", await Page.Locator("div", new() { Has = Page.Locator("text=hello") }).EvaluateAsync<string>("e => e.outerHTML"));
>>>  214|         await Expect(Page.Locator("div", new() { Has = Page.Locator("xpath=./span") })).ToHaveCountAsync(2);
     215|         await Expect(Page.Locator("div", new() { Has = Page.Locator("span") })).ToHaveCountAsync(2);
     216|         await Expect(Page.Locator("div", new() { Has = Page.Locator("span", new() { HasTextString = "wor" }) })).ToHaveCountAsync(1);
     217|         Assert.AreEqual("<div><span>world</span></div>", await Page.Locator("div", new() { Has = Page.Locator("span", new() { HasTextString = "wor" }) }).EvaluateAsync<string>("e => e.outerHTML"));
     218|         await Expect(Page.Locator("div", new() { HasTextString = "wor", Has = Page.Locator("span") })).ToHaveCountAsync(1);
     219|     }
```

**verdict:** (unclassified)

## QA-PY-104 — 0 sampled finding(s)

_(no review sheet yet — debt, see top-up status)_
