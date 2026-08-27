# QA-CS-101 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextBasicTests.cs:304

**Message:** Skipped test detected: `[Skip]`.

```
     299|         var response = await page.GotoAsync(Server.EmptyPage);
     300|         Assert.AreEqual((int)HttpStatusCode.OK, response.Status);
     301|     }
     302|
     303|     [PlaywrightTest("browsercontext-basic.spec.ts", "should emulate navigator.onLine")]
>>>  304|     [Skip(SkipAttribute.Targets.Firefox)]
     305|     public async Task ShouldEmulateNavigatorOnLine()
     306|     {
     307|         await using var context = await Browser.NewContextAsync();
     308|         var page = await context.NewPageAsync();
     309|         Assert.True(await page.EvaluateAsync<bool>("() => window.navigator.onLine"));
```

**verdict:**

---

## 2. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextCookiesTests.cs:91

**Message:** Skipped test detected: `[Skip]`.

```
      86|         Assert.That(cookies, Has.Count.EqualTo(1));
      87|         Assert.IsTrue(cookies.ElementAt(0).HttpOnly);
      88|     }
      89|
      90|     [PlaywrightTest("browsercontext-cookies.spec.ts", @"should properly report ""Strict"" sameSite cookie")]
>>>   91|     [Skip(SkipAttribute.Targets.Webkit | SkipAttribute.Targets.Windows)]
      92|     public async Task ShouldProperlyReportStrictSameSiteCookie()
      93|     {
      94|         Server.SetRoute("/empty.html", context =>
      95|         {
      96|             context.Response.Headers["Set-Cookie"] = "name=value;SameSite=Strict";
```

**verdict:**

---

## 3. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextCookiesTests.cs:106

**Message:** Skipped test detected: `[Skip]`.

```
     101|         Assert.That(cookies, Has.Count.EqualTo(1));
     102|         Assert.AreEqual(SameSiteAttribute.Strict, cookies.ElementAt(0).SameSite);
     103|     }
     104|
     105|     [PlaywrightTest("browsercontext-cookies.spec.ts", @"should properly report ""Lax"" sameSite cookie")]
>>>  106|     [Skip(SkipAttribute.Targets.Webkit | SkipAttribute.Targets.Windows)]
     107|     public async Task ShouldProperlyReportLaxSameSiteCookie()
     108|     {
     109|         Server.SetRoute("/empty.html", context =>
     110|         {
     111|             context.Response.Headers["Set-Cookie"] = "name=value;SameSite=Lax";
```

**verdict:**

---

## 4. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextDeviceTests.cs:30

**Message:** Skipped test detected: `[Skip]`.

```
      25| namespace Microsoft.Playwright.Tests;
      26|
      27| public class BrowserContextDeviceTests : BrowserTestEx
      28| {
      29|     [PlaywrightTest("browsercontext-device.spec.ts", "should work")]
>>>   30|     [Skip(SkipAttribute.Targets.Firefox)]
      31|     public async Task ShouldWork()
      32|     {
      33|         await using var context = await Browser.NewContextAsync(Playwright.Devices["iPhone 6"]);
      34|         var page = await context.NewPageAsync();
      35|
```

**verdict:**

---

## 5. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextDeviceTests.cs:42

**Message:** Skipped test detected: `[Skip]`.

```
      37|         Assert.AreEqual(375, await page.EvaluateAsync<int>("window.innerWidth"));
      38|         StringAssert.Contains("iPhone", await page.EvaluateAsync<string>("navigator.userAgent"));
      39|     }
      40|
      41|     [PlaywrightTest("browsercontext-device.spec.ts", "should support clicking")]
>>>   42|     [Skip(SkipAttribute.Targets.Firefox)]
      43|     public async Task ShouldSupportClicking()
      44|     {
      45|         await using var context = await Browser.NewContextAsync(Playwright.Devices["iPhone 6"]);
      46|         var page = await context.NewPageAsync();
      47|
```

**verdict:**

---

## 6. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextDeviceTests.cs:56

**Message:** Skipped test detected: `[Skip]`.

```
      51|         await button.ClickAsync();
      52|         Assert.AreEqual("Clicked", await page.EvaluateAsync<string>("() => result"));
      53|     }
      54|
      55|     [PlaywrightTest("browsercontext-device.spec.ts", "should scroll to click")]
>>>   56|     [Skip(SkipAttribute.Targets.Firefox)]
      57|     public async Task ShouldScrollToClick()
      58|     {
      59|         await using var context = await Browser.NewContextAsync(new()
      60|         {
      61|             ViewportSize = new()
```

**verdict:**

---

## 7. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextEventsTests.cs:58

**Message:** Skipped test detected: `[Skip]`.

```
      53|         Assert.AreEqual("hello", message.Text);
      54|         Assert.AreEqual(popup, message.Page);
      55|     }
      56|
      57|     [PlaywrightTest("browsercontext-events.spec.ts", "console event should work in popup 2")]
>>>   58|     [Skip(SkipAttribute.Targets.Firefox)] // console message from javascript: url is not reported at all
      59|     public async Task ConsoleEventShouldWorkInPopup2()
      60|     {
      61|         var (message, popup, _) = await TaskUtils.WhenAll(
      62|             Page.Context.WaitForConsoleMessageAsync(new() { Predicate = msg => msg.Type == "log" }),
      63|             Page.Context.WaitForPageAsync(),
```

**verdict:**

---

## 8. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextEventsTests.cs:76

**Message:** Skipped test detected: `[Skip]`.

```
      71|         Assert.AreEqual("hello", message.Text);
      72|         Assert.AreEqual(popup, message.Page);
      73|     }
      74|
      75|     [PlaywrightTest("browsercontext-events.spec.ts", "console event should work in immediately closed popup")]
>>>   76|     [Skip(SkipAttribute.Targets.Firefox)] // console message is not reported at all
      77|     public async Task ConsoleEventShouldWorkInImmediatelyClosedPopup()
      78|     {
      79|         var (message, popup, _) = await TaskUtils.WhenAll(
      80|             Page.Context.WaitForConsoleMessageAsync(),
      81|             Page.WaitForPopupAsync(),
```

**verdict:**

---

## 9. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextEventsTests.cs:126

**Message:** Skipped test detected: `[Skip]`.

```
     121|         await dialog.AcceptAsync("hello");
     122|         Assert.AreEqual("hello", await task);
     123|     }
     124|
     125|     [PlaywrightTest("browsercontext-events.spec.ts", "dialog event should work in popup 2")]
>>>  126|     [Skip(SkipAttribute.Targets.Firefox)] // dialog from javascript: url is not reported at all
     127|     public async Task DialogEventShouldWorkInPopup2()
     128|     {
     129|         var task = Page.EvaluateAsync(@"() => {
     130|             window.open('javascript:prompt(""hey?"")');
     131|         }");
```

**verdict:**

---

## 10. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:242

**Message:** Skipped test detected: `[Skip]`.

```
     237|         Assert.AreEqual(await page.EvaluateAsync<string>("location.href"), "https://www.theverge.com/");
     238|     }
     239|
     240|     [PlaywrightTest("browsercontext-har.spec.ts", "should goForward to redirected navigation")]
     241|     // Flaky in firefox
>>>  242|     [Skip(SkipAttribute.Targets.Firefox)]
     243|     public async Task ShouldGoForwardToRedirectedNavigation()
     244|     {
     245|         var path = TestUtils.GetAsset("har-redirect.har");
     246|         await Context.RouteFromHARAsync(path, new() { UrlRegex = new Regex(".*theverge.*") });
     247|         var page = await Context.NewPageAsync();
```

**verdict:**

---

## 11. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextPageEventTests.cs:198

**Message:** Skipped test detected: `[Skip]`.

```
     193|             },
     194|             events);
     195|     }
     196|
     197|     [PlaywrightTest("browsercontext-page-event.spec.ts", "should work with Shift-clicking")]
>>>  198|     [Skip(SkipAttribute.Targets.Webkit)]
     199|     public async Task ShouldWorkWithShiftClicking()
     200|     {
     201|         // WebKit: Shift+Click does not open a new window.
     202|         await using var context = await Browser.NewContextAsync();
     203|         var page = await context.NewPageAsync();
```

**verdict:**

---

## 12. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextPageEventTests.cs:216

**Message:** Skipped test detected: `[Skip]`.

```
     211|
     212|         Assert.Null(await popupEventTask.Result.OpenerAsync());
     213|     }
     214|
     215|     [PlaywrightTest("browsercontext-page-event.spec.ts", "should report when a new page is created and closed")]
>>>  216|     [Skip(SkipAttribute.Targets.Webkit, SkipAttribute.Targets.Firefox)]
     217|     public async Task ShouldWorkWithCtrlClicking()
     218|     {
     219|         // Firefox: reports an opener in this case.
     220|         // WebKit: Ctrl+Click does not open a new tab.
     221|         await using var context = await Browser.NewContextAsync();
```

**verdict:**

---

## 13. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextViewportMobileTests.cs:30

**Message:** Skipped test detected: `[Skip]`.

```
      25| namespace Microsoft.Playwright.Tests;
      26|
      27| public class BrowserContextViewportMobileTests : BrowserTestEx
      28| {
      29|     [PlaywrightTest("browsercontext-viewport-mobile.spec.ts", "should support mobile emulation")]
>>>   30|     [Skip(SkipAttribute.Targets.Firefox)]
      31|     public async Task ShouldSupportMobileEmulation()
      32|     {
      33|         await using var context = await Browser.NewContextAsync(Playwright.Devices["iPhone 6"]);
      34|         var page = await context.NewPageAsync();
      35|
```

**verdict:**

---

## 14. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextViewportMobileTests.cs:43

**Message:** Skipped test detected: `[Skip]`.

```
      38|         await page.SetViewportSizeAsync(400, 300);
      39|         Assert.AreEqual(400, await page.EvaluateAsync<int>("window.innerWidth"));
      40|     }
      41|
      42|     [PlaywrightTest("browsercontext-viewport-mobile.spec.ts", "should support touch emulation")]
>>>   43|     [Skip(SkipAttribute.Targets.Firefox)]
      44|     public async Task ShouldSupportTouchEmulation()
      45|     {
      46|         const string dispatchTouch = @"
      47|             function dispatchTouch() {
      48|               let fulfill;
```

**verdict:**

---

## 15. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextViewportMobileTests.cs:68

**Message:** Skipped test detected: `[Skip]`.

```
      63|         Assert.True(await page.EvaluateAsync<bool>("'ontouchstart' in window"));
      64|         Assert.AreEqual("Received touch", await page.EvaluateAsync<string>(dispatchTouch));
      65|     }
      66|
      67|     [PlaywrightTest("browsercontext-viewport-mobile.spec.ts", "should be detectable by Modernizr")]
>>>   68|     [Skip(SkipAttribute.Targets.Firefox)]
      69|     public async Task ShouldBeDetectableByModernizr()
      70|     {
      71|         await using var context = await Browser.NewContextAsync(Playwright.Devices["iPhone 6"]);
      72|         var page = await context.NewPageAsync();
      73|         Assert.AreEqual(true, await page.EvaluateAsync<bool>("'ontouchstart' in window || !!window.TouchEvent"));
```

**verdict:**

---

## 16. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextViewportMobileTests.cs:77

**Message:** Skipped test detected: `[Skip]`.

```
      72|         var page = await context.NewPageAsync();
      73|         Assert.AreEqual(true, await page.EvaluateAsync<bool>("'ontouchstart' in window || !!window.TouchEvent"));
      74|     }
      75|
      76|     [PlaywrightTest("browsercontext-viewport-mobile.spec.ts", "should detect touch when applying viewport with touches")]
>>>   77|     [Skip(SkipAttribute.Targets.Firefox)]
      78|     public async Task ShouldDetectTouchWhenApplyingViewportWithTouches()
      79|     {
      80|         await using var context = await Browser.NewContextAsync(new()
      81|         {
      82|             ViewportSize = new()
```

**verdict:**

---

## 17. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextViewportMobileTests.cs:96

**Message:** Skipped test detected: `[Skip]`.

```
      91|         await page.GotoAsync(Server.EmptyPage);
      92|         Assert.True(await page.EvaluateAsync<bool>("() => 'ontouchstart' in window || !!window.TouchEvent"));
      93|     }
      94|
      95|     [PlaywrightTest("browsercontext-viewport-mobile.spec.ts", "should support landscape emulation")]
>>>   96|     [Skip(SkipAttribute.Targets.Firefox)]
      97|     public async Task ShouldSupportLandscapeEmulation()
      98|     {
      99|         await using var context1 = await Browser.NewContextAsync(Playwright.Devices["iPhone 6"]);
     100|         var page1 = await context1.NewPageAsync();
     101|         await page1.GotoAsync(Server.Prefix + "/mobile.html");
```

**verdict:**

---

## 18. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextViewportMobileTests.cs:111

**Message:** Skipped test detected: `[Skip]`.

```
     106|         await page2.GotoAsync(Server.Prefix + "/mobile.html");
     107|         Assert.True(await page2.EvaluateAsync<bool>("() => matchMedia('(orientation: landscape)').matches"));
     108|     }
     109|
     110|     [PlaywrightTest("browsercontext-viewport-mobile.spec.ts", "should support window.orientation emulation")]
>>>  111|     [Skip(SkipAttribute.Targets.Firefox)]
     112|     public async Task ShouldSupportWindowOrientationEmulation()
     113|     {
     114|         await using var context = await Browser.NewContextAsync(new()
     115|         {
     116|             ViewportSize = new()
```

**verdict:**

---

## 19. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextViewportMobileTests.cs:132

**Message:** Skipped test detected: `[Skip]`.

```
     127|         await page.SetViewportSizeAsync(400, 300);
     128|         Assert.AreEqual(90, await page.EvaluateAsync<int?>("() => window.orientation"));
     129|     }
     130|
     131|     [PlaywrightTest("browsercontext-viewport-mobile.spec.ts", "should fire orientationchange event")]
>>>  132|     [Skip(SkipAttribute.Targets.Firefox)]
     133|     public async Task ShouldFireOrientationChangeEvent()
     134|     {
     135|         await using var context = await Browser.NewContextAsync(new()
     136|         {
     137|             ViewportSize = new()
```

**verdict:**

---

## 20. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextViewportMobileTests.cs:163

**Message:** Skipped test detected: `[Skip]`.

```
     158|         var event2 = await event2Task;
     159|         Assert.AreEqual("2", event2.Text);
     160|     }
     161|
     162|     [PlaywrightTest("browsercontext-viewport-mobile.spec.ts", "default mobile viewports to 980 width")]
>>>  163|     [Skip(SkipAttribute.Targets.Firefox)]
     164|     public async Task DefaultMobileViewportsTo980Width()
     165|     {
     166|         await using var context = await Browser.NewContextAsync(new()
     167|         {
     168|             ViewportSize = new()
```

**verdict:**

---
