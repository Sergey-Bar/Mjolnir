# QA-CS-106 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextDeviceTests.cs:72

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      67|             IsMobile = true,
      68|         });
      69|         var page = await context.NewPageAsync();
      70|
      71|         await page.GotoAsync(Server.Prefix + "/input/scrollable.html");
>>>   72|         var element = await page.QuerySelectorAsync("#button-91");
      73|         await element.ClickAsync();
      74|         Assert.AreEqual("clicked", await element.TextContentAsync());
      75|     }
      76| }
      77|
```

**verdict:**

---

## 2. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleBoundingBoxTests.cs:76

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      71|     {
      72|         await Page.SetContentAsync(@"
      73|                   <svg xmlns=""http://www.w3.org/2000/svg"" width=""500"" height=""500"">
      74|                     <rect id=""theRect"" x=""30"" y=""50"" width=""200"" height=""300""></rect>
      75|                   </svg>");
>>>   76|         var element = await Page.QuerySelectorAsync("#therect");
      77|         var pwBoundingBox = await element.BoundingBoxAsync();
      78|         var webBoundingBox = await Page.EvaluateAsync<ElementHandleBoundingBoxResult>(@"e => {
      79|                     const rect = e.getBoundingClientRect();
      80|                     return { x: rect.x, y: rect.y, width: rect.width, height: rect.height};
      81|                 }", element);
```

**verdict:**

---

## 3. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleContentFrameTests.cs:34

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      29|     [PlaywrightTest("elementhandle-content-frame.spec.ts", "should work")]
      30|     public async Task ShouldWork()
      31|     {
      32|         await Page.GotoAsync(Server.EmptyPage);
      33|         await FrameUtils.AttachFrameAsync(Page, "frame1", Server.EmptyPage);
>>>   34|         var elementHandle = await Page.QuerySelectorAsync("#frame1");
      35|         var frame = await elementHandle.ContentFrameAsync();
      36|         Assert.AreEqual(Page.Frames.ElementAt(1), frame);
      37|     }
      38|
      39|     [PlaywrightTest("elementhandle-content-frame.spec.ts", "should work for cross-process iframes")]
```

**verdict:**

---

## 4. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleContentFrameTests.cs:44

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      39|     [PlaywrightTest("elementhandle-content-frame.spec.ts", "should work for cross-process iframes")]
      40|     public async Task ShouldWorkForCrossProcessIframes()
      41|     {
      42|         await Page.GotoAsync(Server.EmptyPage);
      43|         await FrameUtils.AttachFrameAsync(Page, "frame1", Server.CrossProcessPrefix + "/empty.html");
>>>   44|         var elementHandle = await Page.QuerySelectorAsync("#frame1");
      45|         var frame = await elementHandle.ContentFrameAsync();
      46|         Assert.AreEqual(Page.Frames.ElementAt(1), frame);
      47|     }
      48|
      49|     [PlaywrightTest("elementhandle-content-frame.spec.ts", "should work for cross-frame evaluations")]
```

**verdict:**

---

## 5. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleConvenienceTests.cs:34

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      29| {
      30|     [PlaywrightTest("elementhandle-convenience.spec.ts", "should have a nice preview")]
      31|     public async Task ShouldHaveANicePreview()
      32|     {
      33|         await Page.GotoAsync(Server.Prefix + "/dom.html");
>>>   34|         var outer = await Page.QuerySelectorAsync("#outer");
      35|         var inner = await Page.QuerySelectorAsync("#inner");
      36|         var check = await Page.QuerySelectorAsync("#check");
      37|         var text = await inner.EvaluateHandleAsync("e => e.firstChild");
      38|         await Page.EvaluateAsync("() => 1");  // Give them a chance to calculate the preview.
      39|         Assert.AreEqual("JSHandle@<div id=\"outer\" name=\"value\">…</div>", outer.ToString());
```

**verdict:**

---

## 6. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleConvenienceTests.cs:35

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      30|     [PlaywrightTest("elementhandle-convenience.spec.ts", "should have a nice preview")]
      31|     public async Task ShouldHaveANicePreview()
      32|     {
      33|         await Page.GotoAsync(Server.Prefix + "/dom.html");
      34|         var outer = await Page.QuerySelectorAsync("#outer");
>>>   35|         var inner = await Page.QuerySelectorAsync("#inner");
      36|         var check = await Page.QuerySelectorAsync("#check");
      37|         var text = await inner.EvaluateHandleAsync("e => e.firstChild");
      38|         await Page.EvaluateAsync("() => 1");  // Give them a chance to calculate the preview.
      39|         Assert.AreEqual("JSHandle@<div id=\"outer\" name=\"value\">…</div>", outer.ToString());
      40|         Assert.AreEqual("JSHandle@<div id=\"inner\">Text,↵more text</div>", inner.ToString());
```

**verdict:**

---

## 7. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleConvenienceTests.cs:36

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      31|     public async Task ShouldHaveANicePreview()
      32|     {
      33|         await Page.GotoAsync(Server.Prefix + "/dom.html");
      34|         var outer = await Page.QuerySelectorAsync("#outer");
      35|         var inner = await Page.QuerySelectorAsync("#inner");
>>>   36|         var check = await Page.QuerySelectorAsync("#check");
      37|         var text = await inner.EvaluateHandleAsync("e => e.firstChild");
      38|         await Page.EvaluateAsync("() => 1");  // Give them a chance to calculate the preview.
      39|         Assert.AreEqual("JSHandle@<div id=\"outer\" name=\"value\">…</div>", outer.ToString());
      40|         Assert.AreEqual("JSHandle@<div id=\"inner\">Text,↵more text</div>", inner.ToString());
      41|         Assert.AreEqual("JSHandle@#text=Text,↵more text", text.ToString());
```

**verdict:**

---

## 8. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleConvenienceTests.cs:49

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      44|
      45|     [PlaywrightTest("elementhandle-convenience.spec.ts", "getAttribute should work")]
      46|     public async Task GetAttributeShouldWork()
      47|     {
      48|         await Page.GotoAsync(Server.Prefix + "/dom.html");
>>>   49|         var handle = await Page.QuerySelectorAsync("#outer");
      50|
      51|         Assert.AreEqual("value", await handle.GetAttributeAsync("name"));
      52|         Assert.AreEqual("value", await Page.GetAttributeAsync("#outer", "name"));
      53|     }
      54|
```

**verdict:**

---

## 9. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleConvenienceTests.cs:59

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      54|
      55|     [PlaywrightTest("elementhandle-convenience.spec.ts", "innerHTML should work")]
      56|     public async Task InnerHTMLShouldWork()
      57|     {
      58|         await Page.GotoAsync(Server.Prefix + "/dom.html");
>>>   59|         var handle = await Page.QuerySelectorAsync("#outer");
      60|
      61|         Assert.AreEqual("<div id=\"inner\">Text,\nmore text</div>", await handle.InnerHTMLAsync());
      62|         Assert.AreEqual("<div id=\"inner\">Text,\nmore text</div>", await Page.InnerHTMLAsync("#outer"));
      63|     }
      64|
```

**verdict:**

---

## 10. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleConvenienceTests.cs:69

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      64|
      65|     [PlaywrightTest("elementhandle-convenience.spec.ts", "innerText should work")]
      66|     public async Task InnerTextShouldWork()
      67|     {
      68|         await Page.GotoAsync(Server.Prefix + "/dom.html");
>>>   69|         var handle = await Page.QuerySelectorAsync("#inner");
      70|
      71|         Assert.AreEqual("Text, more text", await handle.InnerTextAsync());
      72|         Assert.AreEqual("Text, more text", await Page.InnerTextAsync("#inner"));
      73|     }
      74|
```

**verdict:**

---

## 11. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleConvenienceTests.cs:91

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      86|
      87|     [PlaywrightTest("elementhandle-convenience.spec.ts", "textContent should work")]
      88|     public async Task TextContentShouldWork()
      89|     {
      90|         await Page.GotoAsync(Server.Prefix + "/dom.html");
>>>   91|         var handle = await Page.QuerySelectorAsync("#outer");
      92|
      93|         Assert.AreEqual("Text,\nmore text", await handle.TextContentAsync());
      94|         Assert.AreEqual("Text,\nmore text", await Page.TextContentAsync("#outer"));
      95|     }
      96|
```

**verdict:**

---

## 12. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleConvenienceTests.cs:220

**Message:** Brittle selector (id via QuerySelectorAsync).

```
     215|     [PlaywrightTest("elementhandle-convenience.spec.ts", "isEditable should work")]
     216|     public async Task IsEditableShouldWork()
     217|     {
     218|         await Page.SetContentAsync(@"<input id=input1 disabled><textarea></textarea><input id=input2>");
     219|         await Page.EvalOnSelectorAsync("textarea", "t => t.readOnly = true");
>>>  220|         var input1 = await Page.QuerySelectorAsync("#input1");
     221|         Assert.False(await input1.IsEditableAsync());
     222|         Assert.False(await Page.IsEditableAsync("#input1"));
     223|         var input2 = await Page.QuerySelectorAsync("#input2");
     224|         Assert.True(await input2.IsEditableAsync());
     225|         Assert.True(await Page.IsEditableAsync("#input2"));
```

**verdict:**

---

## 13. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleConvenienceTests.cs:223

**Message:** Brittle selector (id via QuerySelectorAsync).

```
     218|         await Page.SetContentAsync(@"<input id=input1 disabled><textarea></textarea><input id=input2>");
     219|         await Page.EvalOnSelectorAsync("textarea", "t => t.readOnly = true");
     220|         var input1 = await Page.QuerySelectorAsync("#input1");
     221|         Assert.False(await input1.IsEditableAsync());
     222|         Assert.False(await Page.IsEditableAsync("#input1"));
>>>  223|         var input2 = await Page.QuerySelectorAsync("#input2");
     224|         Assert.True(await input2.IsEditableAsync());
     225|         Assert.True(await Page.IsEditableAsync("#input2"));
     226|         var textarea = await Page.QuerySelectorAsync("textarea");
     227|         Assert.False(await textarea.IsEditableAsync());
     228|         Assert.False(await Page.IsEditableAsync("textarea"));
```

**verdict:**

---

## 14. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleEvalOnSelectorTests.cs:43

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      38|     [PlaywrightTest("elementhandle-eval-on-selector.spec.ts", "should retrieve content from subtree for all")]
      39|     public async Task ShouldRetrieveContentFromSubtreeForAll()
      40|     {
      41|         string htmlContent = "<div class=\"a\">not-a-child-div</div><div id=\"myId\"><div class=\"a\">a1-child-div</div><div class=\"a\">a2-child-div</div></div>";
      42|         await Page.SetContentAsync(htmlContent);
>>>   43|         var elementHandle = await Page.QuerySelectorAsync("#myId");
      44|         string[] content = await elementHandle.EvalOnSelectorAllAsync<string[]>(".a", "nodes => nodes.map(n => n.innerText)");
      45|         Assert.AreEqual(new[] { "a1-child-div", "a2-child-div" }, content);
      46|     }
      47|
      48|     [PlaywrightTest("elementhandle-eval-on-selector.spec.ts", "should not throw in case of missing selector for all")]
```

**verdict:**

---

## 15. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleEvalOnSelectorTests.cs:53

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      48|     [PlaywrightTest("elementhandle-eval-on-selector.spec.ts", "should not throw in case of missing selector for all")]
      49|     public async Task ShouldNotThrowInCaseOfMissingSelectorForAll()
      50|     {
      51|         string htmlContent = "<div class=\"a\">not-a-child-div</div><div id=\"myId\"></div>";
      52|         await Page.SetContentAsync(htmlContent);
>>>   53|         var elementHandle = await Page.QuerySelectorAsync("#myId");
      54|         int nodesLength = await elementHandle.EvalOnSelectorAllAsync<int>(".a", "nodes => nodes.length");
      55|         Assert.AreEqual(0, nodesLength);
      56|     }
      57|
      58|     [PlaywrightTest("elementhandle-eval-on-selector.spec.ts", "should work")]
```

**verdict:**

---

## 16. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleEvalOnSelectorTests.cs:72

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      67|     [PlaywrightTest("elementhandle-eval-on-selector.spec.ts", "should retrieve content from subtree")]
      68|     public async Task ShouldRetrieveContentFromSubtree()
      69|     {
      70|         string htmlContent = "<div class=\"a\">not-a-child-div</div><div id=\"myId\"><div class=\"a\">a-child-div</div></div>";
      71|         await Page.SetContentAsync(htmlContent);
>>>   72|         var elementHandle = await Page.QuerySelectorAsync("#myId");
      73|         string content = await elementHandle.EvalOnSelectorAsync<string>(".a", "node => node.innerText");
      74|         Assert.AreEqual("a-child-div", content);
      75|     }
      76|
      77|     [PlaywrightTest("elementhandle-eval-on-selector.spec.ts", "should throw in case of missing selector")]
```

**verdict:**

---

## 17. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleEvalOnSelectorTests.cs:82

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      77|     [PlaywrightTest("elementhandle-eval-on-selector.spec.ts", "should throw in case of missing selector")]
      78|     public async Task ShouldThrowInCaseOfMissingSelector()
      79|     {
      80|         string htmlContent = "<div class=\"a\">not-a-child-div</div><div id=\"myId\"></div>";
      81|         await Page.SetContentAsync(htmlContent);
>>>   82|         var elementHandle = await Page.QuerySelectorAsync("#myId");
      83|         var exception = await PlaywrightAssert.ThrowsAsync<PlaywrightException>(() => elementHandle.EvalOnSelectorAsync(".a", "node => node.innerText"));
      84|         StringAssert.Contains("Failed to find element matching selector \".a\"", exception.Message);
      85|     }
      86| }
      87|
```

**verdict:**

---

## 18. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleMiscTests.cs:33

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      28| {
      29|     [PlaywrightTest("elementhandle-misc.spec.ts", "should hover")]
      30|     public async Task ShouldHover()
      31|     {
      32|         await Page.GotoAsync(Server.Prefix + "/input/scrollable.html");
>>>   33|         var button = await Page.QuerySelectorAsync("#button-6");
      34|         await button.HoverAsync();
      35|         Assert.AreEqual("button-6", await Page.EvaluateAsync<string>("() => document.querySelector('button:hover').id"));
      36|     }
      37|
      38|     [PlaywrightTest("elementhandle-misc.spec.ts", "should hover when Node is removed")]
```

**verdict:**

---

## 19. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleMiscTests.cs:43

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      38|     [PlaywrightTest("elementhandle-misc.spec.ts", "should hover when Node is removed")]
      39|     public async Task ShouldHoverWhenNodeIsRemoved()
      40|     {
      41|         await Page.GotoAsync(Server.Prefix + "/input/scrollable.html");
      42|         await Page.EvaluateAsync("() => delete window['Node']");
>>>   43|         var button = await Page.QuerySelectorAsync("#button-6");
      44|         await button.HoverAsync();
      45|         Assert.AreEqual("button-6", await Page.EvaluateAsync<string>("() => document.querySelector('button:hover').id"));
      46|     }
      47|
      48|     [PlaywrightTest("elementhandle-misc.spec.ts", "should fill input")]
```

**verdict:**

---

## 20. microsoft-playwright-dotnet — src/Playwright.Tests/ElementHandleScrollIntoViewTests.cs:35

**Message:** Brittle selector (id via QuerySelectorAsync).

```
      30|     public async Task ShouldWork()
      31|     {
      32|         await Page.GotoAsync(Server.Prefix + "/offscreenbuttons.html");
      33|         for (int i = 0; i < 11; ++i)
      34|         {
>>>   35|             var button = await Page.QuerySelectorAsync("#btn" + i);
      36|             double before = await button.EvaluateAsync<double>(@"button => {
      37|                     return button.getBoundingClientRect().right - window.innerWidth;
      38|                 }");
      39|             Assert.AreEqual(10 * i, before);
      40|             await button.ScrollIntoViewIfNeededAsync();
```

**verdict:**

---
