# QA-CS-102 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextFetchTests.cs:608

**Message:** `Task.Delay(` used to wait for state.

```
     603|     [PlaywrightTest("browsercontext-fetch.spec.ts", "should support timeout option")]
     604|     public async Task ShouldSupportTimeoutOption()
     605|     {
     606|         Server.SetRoute("/slow", async ctx =>
     607|         {
>>>  608|             await Task.Delay(5000);
     609|         });
     610|         var exception = await PlaywrightAssert.ThrowsAsync<TimeoutException>(() => Context.APIRequest.GetAsync(Server.Prefix + "/slow", new() { Timeout = 1000 }));
     611|         StringAssert.Contains("Timeout 1000ms exceeded", exception.Message);
     612|     }
     613|
```

**verdict:**

---

## 2. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:528

**Message:** `Task.Delay(` used to wait for state.

```
     523|         var context2 = await Browser.NewContextAsync();
     524|         await context2.RouteFromHARAsync(harPath);
     525|         var page2 = await context2.NewPageAsync();
     526|         await page2.GotoAsync(Server.EmptyPage);
     527|         evalTask = page2.EvaluateAsync<string>("(url) => fetch(url).catch(e => 'cancelled')", Server.Prefix + "/x");
>>>  528|         var result = await Task.WhenAny(evalTask, Task.Delay(1000).ContinueWith(_ => "timeout"));
     529|         Assert.AreEqual(result.Result, "timeout");
     530|         await context2.CloseAsync();
     531|         await PlaywrightAssert.ThrowsAsync<PlaywrightException>(() => evalTask);
     532|     }
     533| }
```

**verdict:**

---

## 3. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextRouteTests.cs:213

**Message:** `Task.Delay(` used to wait for state.

```
     208|         foreach (int pageNr in Enumerable.Range(0, 10))
     209|             await (await context.NewPageAsync())
     210|                 .GotoAsync(Server.EmptyPage);
     211|
     212|         // let the test run for 5 second
>>>  213|         await Task.Delay(5000);
     214|
     215|         // unobserved task exceptions are automatically collected by the PlaywrightTest attribute
     216|     }
     217|
     218|     [PlaywrightTest("browsercontext-route.spec.ts", "should support the times parameter with route matching")]
```

**verdict:**

---

## 4. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextRouteTests.cs:243

**Message:** `Task.Delay(` used to wait for state.

```
     238|     {
     239|         await using var context = await Browser.NewContextAsync();
     240|         var page = await context.NewPageAsync();
     241|         await context.RouteAsync("**/empty.html", async (route) =>
     242|         {
>>>  243|             await Task.Delay(100);
     244|             await route.FulfillAsync(new() { Body = "<html>intercepted</html>", ContentType = "text/html" });
     245|         }, new() { Times = 1 });
     246|
     247|         await page.GotoAsync(Server.EmptyPage);
     248|         await Expect(page.Locator("body")).ToHaveTextAsync("intercepted");
```

**verdict:**

---

## 5. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserTypeConnectTests.cs:308

**Message:** `Task.Delay(` used to wait for state.

```
     303|             RecordVideoSize = new() { Height = 320, Width = 240 }
     304|         });
     305|
     306|         var page = await context.NewPageAsync();
     307|         await page.EvaluateAsync("() => document.body.style.backgroundColor = 'red'");
>>>  308|         await Task.Delay(1000);
     309|         await context.CloseAsync();
     310|
     311|         var videoSavePath = tempDirectory.Path + "my-video.webm";
     312|         await page.Video.SaveAsAsync(videoSavePath);
     313|         Assert.That(videoSavePath, Does.Exist);
```

**verdict:**

---

## 6. microsoft-playwright-dotnet — src/Playwright.Tests/DownloadTests.cs:53

**Message:** `Task.Delay(` used to wait for state.

```
      48|         {
      49|             context.Response.Headers["Content-Type"] = "application/octet-stream";
      50|             context.Response.Headers["Content-Disposition"] = "attachment;";
      51|             // Chromium requires a large enough payload to trigger the download event soon enough
      52|             await context.Response.WriteAsync("a".PadLeft(4096, 'a'));
>>>   53|             await Task.Delay(3000);
      54|             await context.Response.WriteAsync("foo hello world");
      55|         });
      56|
      57|         Server.SetRoute("/downloadLarge", context =>
      58|         {
```

**verdict:**

---

## 7. microsoft-playwright-dotnet — src/Playwright.Tests/FrameGoToTests.cs:48

**Message:** `Task.Delay(` used to wait for state.

```
      43|
      44|     [PlaywrightTest("frame-goto.spec.ts", "should reject when frame detaches")]
      45|     public async Task ShouldRejectWhenFrameDetaches()
      46|     {
      47|         await Page.GotoAsync(Server.Prefix + "/frames/one-frame.html");
>>>   48|         Server.SetRoute("/one-style.css", _ => Task.Delay(-1));
      49|         var navigationTask = Page.FirstChildFrame().GotoAsync(Server.Prefix + "/one-style.html");
      50|         await Server.WaitForRequest("/one-style.css");
      51|         await Page.EvalOnSelectorAsync("iframe", "frame => frame.remove()");
      52|         var exception = await PlaywrightAssert.ThrowsAsync<PlaywrightException>(() => navigationTask);
      53|         if (BrowserName == "chromium")
```

**verdict:**

---

## 8. microsoft-playwright-dotnet — src/Playwright.Tests/FrameGoToTests.cs:67

**Message:** `Task.Delay(` used to wait for state.

```
      62|
      63|     [PlaywrightTest("frame-goto.spec.ts", "should continue after client redirect")]
      64|     [Skip(SkipAttribute.Targets.Firefox)]
      65|     public async Task ShouldContinueAfterClientRedirect()
      66|     {
>>>   67|         Server.SetRoute("/frames/script.js", _ => Task.Delay(10000));
      68|         string url = Server.Prefix + "/frames/child-redirect.html";
      69|         var exception = await PlaywrightAssert.ThrowsAsync<TimeoutException>(() => Page.GotoAsync(url, new() { WaitUntil = WaitUntilState.NetworkIdle, Timeout = 5000 }));
      70|
      71|         StringAssert.Contains("Timeout 5000ms", exception.Message);
      72|         StringAssert.Contains($"navigating to \"{url}\", waiting until \"networkidle\"", exception.Message);
```

**verdict:**

---

## 9. microsoft-playwright-dotnet — src/Playwright.Tests/GlobalFetchTests.cs:83

**Message:** `Task.Delay(` used to wait for state.

```
      78|
      79|     [PlaywrightTest("global-fetch.spec.ts", "should support global timeout option")]
      80|     public async Task ShouldSupportGlobalTimeoutOption()
      81|     {
      82|         var request = await Playwright.APIRequest.NewContextAsync(new() { Timeout = 100 });
>>>   83|         Server.SetRoute("/empty.html", async request => await Task.Delay(5_000));
      84|         var exception = Assert.ThrowsAsync<TimeoutException>(() => request.GetAsync(Server.EmptyPage));
      85|         StringAssert.Contains("Timeout 100ms exceeded", exception.Message);
      86|         await request.DisposeAsync();
      87|     }
      88|
```

**verdict:**

---

## 10. microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorFrameTests.cs:138

**Message:** `Task.Delay(` used to wait for state.

```
     133|     public async Task ShouldWaitForFrame2()
     134|     {
     135|         await RouteIFrame(Page);
     136|         async void myTask()
     137|         {
>>>  138|             await Task.Delay(300);
     139|             await Page.GotoAsync(Server.EmptyPage);
     140|         }
     141|         myTask();
     142|         await Page.FrameLocator("iframe").Locator("button").ClickAsync();
     143|     }
```

**verdict:**

---

## 11. microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorFrameTests.cs:152

**Message:** `Task.Delay(` used to wait for state.

```
     147|     {
     148|         await RouteIFrame(Page);
     149|         await Page.GotoAsync(Server.EmptyPage);
     150|         async void myTask()
     151|         {
>>>  152|             await Task.Delay(300);
     153|             await Page.EvalOnSelectorAsync("iframe", "e => e.remove()");
     154|         }
     155|         myTask();
     156|         await Expect(Page.FrameLocator("iframe").Locator("button")).ToBeHiddenAsync();
     157|     }
```

**verdict:**

---

## 12. microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorFrameTests.cs:198

**Message:** `Task.Delay(` used to wait for state.

```
     193|         await Page.GotoAsync(Server.EmptyPage);
     194|
     195|         // add blank iframe
     196|         async void myTask()
     197|         {
>>>  198|             await Task.Delay(500);
     199|             await Page.EvaluateAsync(@"() => {
     200|                     const iframe = document.createElement('iframe');
     201|                     document.body.appendChild(iframe);
     202|                 }");
     203|             // navigate iframe
```

**verdict:**

---

## 13. microsoft-playwright-dotnet — src/Playwright.Tests/Locator/LocatorFrameTests.cs:206

**Message:** `Task.Delay(` used to wait for state.

```
     201|                     document.body.appendChild(iframe);
     202|                 }");
     203|             // navigate iframe
     204|             async void myTask2()
     205|             {
>>>  206|                 await Task.Delay(500);
     207|                 await Page.EvaluateAsync(@"() => document.querySelector('iframe').src = 'iframe.html'");
     208|             }
     209|             myTask2();
     210|         }
     211|         myTask();
```

**verdict:**

---

## 14. microsoft-playwright-dotnet — src/Playwright.Tests/PageAddLocatorHandlerTests.cs:183

**Message:** `Task.Delay(` used to wait for state.

```
     178|         var called = 0;
     179|         await Page.AddLocatorHandlerAsync(Page.GetByText("This interstitial covers the button"), async () =>
     180|         {
     181|             ++called;
     182|             // Deliberately timeout.
>>>  183|             await Task.Delay(int.MaxValue);
     184|         });
     185|
     186|         await Page.Locator("#aside").HoverAsync();
     187|         await Page.EvaluateAsync(@"() =>
     188|         {
```

**verdict:**

---

## 15. microsoft-playwright-dotnet — src/Playwright.Tests/PageAutoWaitingBasicTests.cs:148

**Message:** `Task.Delay(` used to wait for state.

```
     143|     }
     144|
     145|     [PlaywrightTest("page-autowaiting-basic.spec.ts", "should work with dblclick without noWaitAfter when navigation is stalled")]
     146|     public async Task ShouldWorkWithDblClickWithoutNoWaitAfterWhenNavigaionIsStalled()
     147|     {
>>>  148|         Server.SetRoute("/empty.html", _ => Task.Delay(10000));
     149|         await Page.SetContentAsync($"<a id=anchor href='{Server.EmptyPage}'>empty.html</a>");
     150|         await Page.ClickAsync("a");
     151|     }
     152|
     153|     [PlaywrightTest("page-autowaiting-basic.spec.ts", "should work with waitForLoadState(load)")]
```

**verdict:**

---

## 16. microsoft-playwright-dotnet — src/Playwright.Tests/PageEmulateMediaTests.cs:66

**Message:** `Task.Delay(` used to wait for state.

```
      61|         var navigated = Page.GotoAsync(Server.EmptyPage);
      62|
      63|         for (int i = 0; i < 9; i++)
      64|         {
      65|             await Page.EmulateMediaAsync(new() { ColorScheme = i % 2 == 0 ? ColorScheme.Dark : ColorScheme.Light });
>>>   66|             await Task.Delay(1);
      67|         }
      68|         await navigated;
      69|
      70|         Assert.True(await Page.EvaluateAsync<bool>("() => matchMedia('(prefers-color-scheme: dark)').matches"));
      71|     }
```

**verdict:**

---

## 17. microsoft-playwright-dotnet — src/Playwright.Tests/PageExposeFunctionTests.cs:219

**Message:** `Task.Delay(` used to wait for state.

```
     214|     }
     215|
     216|     [PlaywrightTest]
     217|     public async Task ShouldReturnNullForTaskDelay()
     218|     {
>>>  219|         await Page.ExposeFunctionAsync("compute", () => Task.Delay(100));
     220|         await Page.GotoAsync(Server.EmptyPage);
     221|         var result = await Page.EvaluateAsync(@"async function() {
     222|                 return await compute();
     223|             }");
     224|         Assert.IsNull(result);
```

**verdict:**

---

## 18. microsoft-playwright-dotnet — src/Playwright.Tests/PageGotoTests.cs:296

**Message:** `Task.Delay(` used to wait for state.

```
     291|     }
     292|
     293|     [PlaywrightTest("page-goto.spec.ts", "should fail when exceeding maximum navigation timeout")]
     294|     public async Task ShouldFailWhenExceedingMaximumNavigationTimeout()
     295|     {
>>>  296|         Server.SetRoute("/empty.html", _ => Task.Delay(-1));
     297|         var exception = await PlaywrightAssert.ThrowsAsync<TimeoutException>(()
     298|             => Page.GotoAsync(Server.EmptyPage, new() { Timeout = 1 }));
     299|         StringAssert.Contains("Timeout 1ms exceeded", exception.Message);
     300|         StringAssert.Contains(Server.EmptyPage, exception.Message);
     301|     }
```

**verdict:**

---

## 19. microsoft-playwright-dotnet — src/Playwright.Tests/PageGotoTests.cs:306

**Message:** `Task.Delay(` used to wait for state.

```
     301|     }
     302|
     303|     [PlaywrightTest("page-goto.spec.ts", "should fail when exceeding maximum navigation timeout")]
     304|     public async Task ShouldFailWhenExceedingDefaultMaximumNavigationTimeout()
     305|     {
>>>  306|         Server.SetRoute("/empty.html", _ => Task.Delay(-1));
     307|         Page.Context.SetDefaultNavigationTimeout(2);
     308|         Page.SetDefaultNavigationTimeout(1);
     309|         var exception = await PlaywrightAssert.ThrowsAsync<TimeoutException>(() => Page.GotoAsync(Server.EmptyPage));
     310|         StringAssert.Contains("Timeout 1ms exceeded", exception.Message);
     311|         StringAssert.Contains(Server.EmptyPage, exception.Message);
```

**verdict:**

---

## 20. microsoft-playwright-dotnet — src/Playwright.Tests/PageGotoTests.cs:317

**Message:** `Task.Delay(` used to wait for state.

```
     312|     }
     313|
     314|     [PlaywrightTest("page-goto.spec.ts", "should fail when exceeding browser context navigation timeout")]
     315|     public async Task ShouldFailWhenExceedingBrowserContextNavigationTimeout()
     316|     {
>>>  317|         Server.SetRoute("/empty.html", _ => Task.Delay(-1));
     318|         Page.Context.SetDefaultNavigationTimeout(2);
     319|         var exception = await PlaywrightAssert.ThrowsAsync<TimeoutException>(() => Page.GotoAsync(Server.EmptyPage));
     320|         StringAssert.Contains("Timeout 2ms exceeded", exception.Message);
     321|         StringAssert.Contains(Server.EmptyPage, exception.Message);
     322|     }
```

**verdict:**

---
