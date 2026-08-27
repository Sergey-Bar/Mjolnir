# QA-CS-105 — Sample Findings for Classification

Total sampled: 16 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.Tests/Assertions/LocatorAssertionsTests.cs:215

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     210|     {
     211|         await Page.SetContentAsync("<div></div>");
     212|         var locator = Page.FrameLocator("iframe").Locator("input");
     213|         bool done = false;
     214|         var promise = Expect(locator).ToBeAttachedAsync().ContinueWith(_ => done = true);
>>>  215|         await Page.WaitForTimeoutAsync(1000);
     216|         Assert.False(done);
     217|         await Page.SetContentAsync("<iframe srcdoc=\"<input>\"></iframe>");
     218|         await promise;
     219|         Assert.True(done);
     220|     }
```

**verdict:**

---

## 2. microsoft-playwright-dotnet — src/Playwright.Tests/Assertions/LocatorAssertionsTests.cs:228

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     223|     public async Task ToBeAttachedOverNavigation()
     224|     {
     225|         await Page.GotoAsync(Server.EmptyPage);
     226|         bool done = false;
     227|         var promise = Expect(Page.Locator("input")).ToBeAttachedAsync().ContinueWith(_ => done = true);
>>>  228|         await Page.WaitForTimeoutAsync(1000);
     229|         Assert.False(done);
     230|         await Page.GotoAsync(Server.Prefix + "/input/checkbox.html");
     231|         await promise;
     232|         Assert.True(done);
     233|     }
```

**verdict:**

---

## 3. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextAddCookiesTests.cs:507

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     502|                   iframe.src = src;
     503|                   return promise;
     504|                 }", Server.CrossProcessPrefix + "/grid.html");
     505|
     506|         await Page.FirstChildFrame().EvaluateAsync<string>("document.cookie = 'username=John Doe'");
>>>  507|         await Page.WaitForTimeoutAsync(2000);
     508|         bool allowsThirdParty = TestConstants.IsFirefox;
     509|         var cookies = await Context.CookiesAsync(new[] { Server.CrossProcessPrefix + "/grid.html" });
     510|
     511|         if (allowsThirdParty)
     512|         {
```

**verdict:**

---

## 4. microsoft-playwright-dotnet — src/Playwright.Tests/DefaultBrowserContext1Tests.cs:140

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     135|                   iframe.src = src;
     136|                   return promise;
     137|                 }", Server.CrossProcessPrefix + "/grid.html");
     138|
     139|         await page.FirstChildFrame().EvaluateAsync<string>("document.cookie = 'username=John Doe'");
>>>  140|         await page.WaitForTimeoutAsync(2000);
     141|         bool allowsThirdParty = TestConstants.IsFirefox;
     142|         var cookies = await context.CookiesAsync(new[] { Server.CrossProcessPrefix + "/grid.html" });
     143|
     144|         if (allowsThirdParty)
     145|         {
```

**verdict:**

---

## 5. microsoft-playwright-dotnet — src/Playwright.Tests/HeadfulTests.cs:133

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     128|         string documentCookie = await page.Frames.ElementAt(1).EvaluateAsync<string>(@"() => {
     129|                 document.cookie = 'username=John Doe';
     130|                 return document.cookie;
     131|             }");
     132|
>>>  133|         await page.WaitForTimeoutAsync(2000);
     134|         bool allowsThirdParty = TestConstants.IsFirefox;
     135|         Assert.AreEqual(allowsThirdParty ? "username=John Doe" : string.Empty, documentCookie);
     136|         var cookies = await page.Context.CookiesAsync(new[] { Server.CrossProcessPrefix + "/grid.html" });
     137|
     138|         if (allowsThirdParty)
```

**verdict:**

---

## 6. microsoft-playwright-dotnet — src/Playwright.Tests/PageClockTests.cs:343

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     338|                 context.Response.Headers["Content-Type"] = "text/html";
     339|                 return context.Response.WriteAsync("<script>window.time = Date.now();</script>");
     340|             });
     341|             await Page.GotoAsync(Server.EmptyPage);
     342|             // Wait for 2 seconds in real life to check that it is past in popup.
>>>  343|             await Page.WaitForTimeoutAsync(2000);
     344|             var popupTask = Page.WaitForPopupAsync();
     345|             await Page.EvaluateAsync("url => window.open(url)", Server.Prefix + "/popup.html");
     346|             var popup = await popupTask;
     347|             var popupTime = await popup.EvaluateAsync<long>("window.time");
     348|             Assert.GreaterOrEqual(popupTime, 2000);
```

**verdict:**

---

## 7. microsoft-playwright-dotnet — src/Playwright.Tests/PageClockTests.cs:363

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     358|             });
     359|             await Page.Clock.InstallAsync(new() { TimeDate = DateTimeOffset.FromUnixTimeMilliseconds(0).UtcDateTime });
     360|             await Page.Clock.PauseAtAsync(DateTimeOffset.FromUnixTimeMilliseconds(1000).UtcDateTime);
     361|             await Page.GotoAsync(Server.EmptyPage);
     362|             // Wait for 2 seconds in real life to check that it is past in popup.
>>>  363|             await Page.WaitForTimeoutAsync(2000);
     364|             var popupTask = Page.WaitForPopupAsync();
     365|             await Page.EvaluateAsync("url => window.open(url)", Server.Prefix + "/popup.html");
     366|             var popup = await popupTask;
     367|             var popupTime = await popup.EvaluateAsync<long>("window.time");
     368|             Assert.AreEqual(1000, popupTime);
```

**verdict:**

---

## 8. microsoft-playwright-dotnet — src/Playwright.Tests/PageClockTests.cs:420

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     415|         [PlaywrightTest("page-clock.spec.ts", "should progress time")]
     416|         public async Task ShouldProgressTime()
     417|         {
     418|             await Page.Clock.InstallAsync(new() { TimeDate = DateTimeOffset.FromUnixTimeMilliseconds(0).UtcDateTime });
     419|             await Page.GotoAsync("data:text/html,");
>>>  420|             await Page.WaitForTimeoutAsync(1000);
     421|             var now = await Page.EvaluateAsync<long>("Date.now()");
     422|             Assert.GreaterOrEqual(now, 1000);
     423|             Assert.LessOrEqual(now, 2000);
     424|         }
     425|
```

**verdict:**

---

## 9. microsoft-playwright-dotnet — src/Playwright.Tests/PageClockTests.cs:465

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     460|         public async Task ShouldPause()
     461|         {
     462|             await Page.Clock.InstallAsync(new() { TimeDate = DateTimeOffset.FromUnixTimeMilliseconds(0).UtcDateTime });
     463|             await Page.GotoAsync("data:text/html,");
     464|             await Page.Clock.PauseAtAsync(DateTimeOffset.FromUnixTimeMilliseconds(1000).UtcDateTime);
>>>  465|             await Page.WaitForTimeoutAsync(1111);
     466|             var now = await Page.EvaluateAsync<long>("Date.now()");
     467|             Assert.GreaterOrEqual(now, 0);
     468|             Assert.LessOrEqual(now, 1000);
     469|         }
     470|
```

**verdict:**

---

## 10. microsoft-playwright-dotnet — src/Playwright.Tests/PageClockTests.cs:546

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     541|         public async Task ShouldHavePausedClockAfterInstall()
     542|         {
     543|             await Page.Clock.InstallAsync();
     544|             await Page.GotoAsync("data:text/html,");
     545|             var currentTime = await Page.EvaluateAsync<long>("Date.now()");
>>>  546|             await Page.WaitForTimeoutAsync(100);
     547|             var newTime = await Page.EvaluateAsync<long>("Date.now()");
     548|         }
     549|     }
     550| }
     551|
```

**verdict:**

---

## 11. microsoft-playwright-dotnet — src/Playwright.Tests/PageWaitForFunctionTests.cs:35

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
      30|     [PlaywrightTest("page-wait-for-function.spec.ts", "should timeout")]
      31|     public async Task ShouldTimeout()
      32|     {
      33|         var startTime = DateTime.Now;
      34|         int timeout = 42;
>>>   35|         await Page.WaitForTimeoutAsync(timeout);
      36|         Assert.True((DateTime.Now - startTime).TotalMilliseconds > timeout / 2);
      37|     }
      38|
      39|     [PlaywrightTest("page-wait-for-function.spec.ts", "should accept a string")]
      40|     [Ignore("We don't this test")]
```

**verdict:**

---

## 12. microsoft-playwright-dotnet — src/Playwright.Tests/PageWaitForFunctionTests.cs:87

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
      82|                   console.log(window.counter);
      83|                 }",
      84|             null, new() { PollingInterval = 1, Timeout = 1000 }));
      85|
      86|         int savedCounter = counter;
>>>   87|         await Page.WaitForTimeoutAsync(2000);
      88|
      89|         StringAssert.Contains("Timeout 1000ms exceeded", exception.Message);
      90|         Assert.AreEqual(savedCounter, counter);
      91|     }
      92|
```

**verdict:**

---

## 13. microsoft-playwright-dotnet — src/Playwright.Tests/PageWaitForNavigationTests.cs:209

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     204|
     205|         frame = await frameAttachedTaskSource.Task;
     206|
     207|         await frameNavigatedTaskSource.Task;
     208|         await frame.EvaluateAsync("() => window.stop()");
>>>  209|         await Page.WaitForTimeoutAsync(2000); // give it some time to erroneously resolve
     210|         // Chromium and Firefox issue load event in this case.
     211|         Assert.AreEqual(done, BrowserName != "webkit");
     212|     }
     213|
     214|     [PlaywrightTest("page-wait-for-navigation.spec.ts", "should work with url match")]
```

**verdict:**

---

## 14. microsoft-playwright-dotnet — src/Playwright.Tests/TracingTests.cs:52

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
      47|         await page.ClickAsync("\"Click\"");
      48|         await page.Mouse.MoveAsync(20, 20);
      49|         await page.Mouse.DblClickAsync(20, 30);
      50|         await page.APIRequest.GetAsync(Server.Prefix + "/empty.html");
      51|         await page.Keyboard.InsertTextAsync("abc");
>>>   52|         await page.WaitForTimeoutAsync(2000); // Give it some time to produce screenshots.
      53|         await page.CloseAsync();
      54|
      55|         using var tmp = new TempDirectory();
      56|         var tracePath = Path.Combine(tmp.Path, "trace.zip");
      57|         await Context.Tracing.StopAsync(new() { Path = tracePath });
```

**verdict:**

---

## 15. microsoft-playwright-dotnet — src/Playwright.Tests/UnrouteBehaviorTests.cs:393

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     388|
     389|         var routePromise = new TaskCompletionSource<IRoute>();
     390|         await Page.RouteAsync(new Regex(".*"), async (route) =>
     391|         {
     392|             routePromise.SetResult(route);
>>>  393|             await Page.WaitForTimeoutAsync(3000);
     394|             await route.FulfillAsync(new() { Status = (int)HttpStatusCode.OK });
     395|         });
     396|
     397|         Page.EvaluateAsync("() => fetch('/')").IgnoreException();
     398|         await routePromise.Task;
```

**verdict:**

---

## 16. microsoft-playwright-dotnet — src/Playwright.Tests/UnrouteBehaviorTests.cs:411

**Message:** `WaitForTimeoutAsync()` hard sleep.

```
     406|
     407|         var routePromise = new TaskCompletionSource<IRoute>();
     408|         await Context.RouteAsync(new Regex(".*"), async (route) =>
     409|         {
     410|             routePromise.SetResult(route);
>>>  411|             await Page.WaitForTimeoutAsync(3000);
     412|             await route.FulfillAsync(new() { Status = (int)HttpStatusCode.OK });
     413|         });
     414|
     415|         Page.EvaluateAsync("() => fetch('/')").IgnoreException();
     416|         await routePromise.Task;
```

**verdict:**

---
