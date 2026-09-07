# QA-CS-106 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorElementHandleTests.cs:66

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

**verdict:**

---

## 2. microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorElementHandleTests.cs:67

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

**verdict:**

---

## 3. microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorElementHandleTests.cs:77

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

**verdict:**

---

## 4. microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorQueryTests.cs:214

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

**verdict:**

---
