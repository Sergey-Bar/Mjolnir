# QA-CS-108 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:39

**Message:** Hardcoded URL: `.GotoAsync("http://no.playwright/"`.

```
      34|     public async Task ShouldContextRouteFromHarMatchingTheMethodAndFollowingRedirects()
      35|     {
      36|         var path = TestUtils.GetAsset("har-fulfill.har");
      37|         await Context.RouteFromHARAsync(path);
      38|         var page = await Context.NewPageAsync();
>>>   39|         await page.GotoAsync("http://no.playwright/");
      40|         // HAR contains a redirect for the script that should be followed automatically.
      41|         Assert.AreEqual(await page.EvaluateAsync<string>("window.value"), "foo");
      42|         // HAR contains a POST for the css file that should not be used.
      43|         await Expect(page.Locator("body")).ToHaveCSSAsync("background-color", "rgb(255, 0, 0)");
      44|     }
```

**verdict:**

---

## 2. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:52

**Message:** Hardcoded URL: `.GotoAsync("http://no.playwright/"`.

```
      47|     public async Task ShouldPageRouteFromHarMatchingTheMethodAndFollowingRedirects()
      48|     {
      49|         var path = TestUtils.GetAsset("har-fulfill.har");
      50|         var page = await Context.NewPageAsync();
      51|         await page.RouteFromHARAsync(path);
>>>   52|         await page.GotoAsync("http://no.playwright/");
      53|         // HAR contains a redirect for the script that should be followed automatically.
      54|         Assert.AreEqual(await page.EvaluateAsync<string>("window.value"), "foo");
      55|         // HAR contains a POST for the css file that should not be used.
      56|         await Expect(page.Locator("body")).ToHaveCSSAsync("background-color", "rgb(255, 0, 0)");
      57|     }
```

**verdict:**

---

## 3. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:113

**Message:** Hardcoded URL: `.GotoAsync("http://no.playwright/"`.

```
     108|                 ContentType = "text/html",
     109|                 Body = "<script src=\"./script.js\"></script><div>hello</div>"
     110|             });
     111|         });
     112|
>>>  113|         await page.GotoAsync("http://no.playwright/");
     114|         // HAR contains a redirect for the script that should be followed automatically.
     115|         Assert.AreEqual(await page.EvaluateAsync<string>("window.value"), "foo");
     116|         await Expect(page.Locator("body")).ToHaveCSSAsync("background-color", "rgba(0, 0, 0, 0)");
     117|     }
     118|
```

**verdict:**

---

## 4. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:137

**Message:** Hardcoded URL: `.GotoAsync("http://no.playwright/"`.

```
     132|                 ContentType = "text/html",
     133|                 Body = "<script src=\"./script.js\"></script><div>hello</div>"
     134|             });
     135|         });
     136|
>>>  137|         await page.GotoAsync("http://no.playwright/");
     138|         // HAR contains a redirect for the script that should be followed automatically.
     139|         Assert.AreEqual(await page.EvaluateAsync<string>("window.value"), "foo");
     140|         await Expect(page.Locator("body")).ToHaveCSSAsync("background-color", "rgba(0, 0, 0, 0)");
     141|     }
     142|
```

**verdict:**

---

## 5. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:161

**Message:** Hardcoded URL: `.GotoAsync("http://no.playwright/"`.

```
     156|                 ContentType = "text/html",
     157|                 Body = "<script src=\"./script.js\"></script><div>hello</div>"
     158|             });
     159|         });
     160|
>>>  161|         await page.GotoAsync("http://no.playwright/");
     162|         // HAR contains a redirect for the script that should be followed automatically.
     163|         Assert.AreEqual(await page.EvaluateAsync<string>("window.value"), "foo");
     164|         await Expect(page.Locator("body")).ToHaveCSSAsync("background-color", "rgba(0, 0, 0, 0)");
     165|     }
     166|
```

**verdict:**

---

## 6. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:174

**Message:** Hardcoded URL: `.GotoAsync("http://no.playwright/"`.

```
     169|     {
     170|         var path = TestUtils.GetAsset("har-fulfill.har");
     171|
     172|         await Context.RouteFromHARAsync(path, new() { UrlRegex = new Regex(@".*(\.js|.*\.css|no.playwright\/)$") });
     173|         var page = await Context.NewPageAsync();
>>>  174|         await page.GotoAsync("http://no.playwright/");
     175|         Assert.AreEqual(await page.EvaluateAsync<string>("window.value"), "foo");
     176|         await Expect(page.Locator("body")).ToHaveCSSAsync("background-color", "rgb(255, 0, 0)");
     177|     }
     178|
     179|     [PlaywrightTest("browsercontext-har.spec.ts", "newPage should fulfill from har, matching the method and following redirects")]
```

**verdict:**

---

## 7. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:185

**Message:** Hardcoded URL: `.GotoAsync("http://no.playwright/"`.

```
     180|     public async Task NewPageShouldFulfillFromHarMatchingTheMethodAndFollowingRedirects()
     181|     {
     182|         var path = TestUtils.GetAsset("har-fulfill.har");
     183|         var page = await Browser.NewPageAsync();
     184|         await page.RouteFromHARAsync(path);
>>>  185|         await page.GotoAsync("http://no.playwright/");
     186|         // HAR contains a redirect for the script that should be followed automatically.
     187|         Assert.AreEqual(await page.EvaluateAsync<string>("window.value"), "foo");
     188|         // HAR contains a POST for the css file that should not be used.
     189|         await Expect(page.Locator("body")).ToHaveCSSAsync("background-color", "rgb(255, 0, 0)");
     190|         await page.CloseAsync();
```

**verdict:**

---

## 8. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:202

**Message:** Hardcoded URL: `.GotoAsync("https://www.theverge.com/"`.

```
     197|         await Context.RouteFromHARAsync(path);
     198|         var page = await Context.NewPageAsync();
     199|         var waitForUrl = page.WaitForURLAsync("https://www.theverge.com/");
     200|         var (response, _) = await TaskUtils.WhenAll(
     201|             page.WaitForNavigationAsync(),
>>>  202|             page.GotoAsync("https://www.theverge.com/"));
     203|         await waitForUrl;
     204|         await Expect(page).ToHaveURLAsync("https://www.theverge.com/");
     205|         Assert.AreEqual(response.Request.Url, "https://www.theverge.com/");
     206|         Assert.AreEqual(await page.EvaluateAsync<string>("location.href"), "https://www.theverge.com/");
     207|     }
```

**verdict:**

---

## 9. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:231

**Message:** Hardcoded URL: `.GotoAsync("https://www.theverge.com/"`.

```
     226|     public async Task ShouldGoBackToRedirectedNavigation()
     227|     {
     228|         var path = TestUtils.GetAsset("har-redirect.har");
     229|         await Context.RouteFromHARAsync(path, new() { UrlRegex = new Regex(".*theverge.*") });
     230|         var page = await Context.NewPageAsync();
>>>  231|         await page.GotoAsync("https://www.theverge.com/");
     232|         await page.GotoAsync(Server.EmptyPage);
     233|         await Expect(page).ToHaveURLAsync(Server.EmptyPage);
     234|         var response = await page.GoBackAsync();
     235|         await Expect(page).ToHaveURLAsync("https://www.theverge.com/");
     236|         Assert.AreEqual(response.Request.Url, "https://www.theverge.com/");
```

**verdict:**

---

## 10. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:250

**Message:** Hardcoded URL: `.GotoAsync("https://www.theverge.com/"`.

```
     245|         var path = TestUtils.GetAsset("har-redirect.har");
     246|         await Context.RouteFromHARAsync(path, new() { UrlRegex = new Regex(".*theverge.*") });
     247|         var page = await Context.NewPageAsync();
     248|         await page.GotoAsync(Server.EmptyPage);
     249|         await Expect(page).ToHaveURLAsync(Server.EmptyPage);
>>>  250|         await page.GotoAsync("https://www.theverge.com/");
     251|         await Expect(page).ToHaveURLAsync("https://www.theverge.com/");
     252|         await page.GoBackAsync();
     253|         await Expect(page).ToHaveURLAsync(Server.EmptyPage);
     254|         var response = await page.GoForwardAsync();
     255|         await Expect(page).ToHaveURLAsync("https://www.theverge.com/");
```

**verdict:**

---

## 11. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:266

**Message:** Hardcoded URL: `.GotoAsync("https://www.theverge.com/"`.

```
     261|     public async Task ShouldReloadRedirectedNavigation()
     262|     {
     263|         var path = TestUtils.GetAsset("har-redirect.har");
     264|         await Context.RouteFromHARAsync(path, new() { UrlRegex = new Regex(".*theverge.*") });
     265|         var page = await Context.NewPageAsync();
>>>  266|         await page.GotoAsync("https://www.theverge.com/");
     267|         await Expect(page).ToHaveURLAsync("https://www.theverge.com/");
     268|         var response = await page.ReloadAsync();
     269|         await Expect(page).ToHaveURLAsync("https://www.theverge.com/");
     270|         Assert.AreEqual(response.Request.Url, "https://www.theverge.com/");
     271|         Assert.AreEqual(await page.EvaluateAsync<string>("location.href"), "https://www.theverge.com/");
```

**verdict:**

---

## 12. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextHarTests.cs:280

**Message:** Hardcoded URL: `.GotoAsync("http://no.playwright/"`.

```
     275|     public async Task ShouldFulfillFromHarWithContentInAFile()
     276|     {
     277|         var path = TestUtils.GetAsset("har-sha1.har");
     278|         await Context.RouteFromHARAsync(path);
     279|         var page = await Context.NewPageAsync();
>>>  280|         await page.GotoAsync("http://no.playwright/");
     281|         Assert.AreEqual(await page.ContentAsync(), "<html><head></head><body>Hello, world</body></html>");
     282|     }
     283|
     284|     [PlaywrightTest("browsercontext-har.spec.ts", "should round-trip har.zip")]
     285|     public async Task ShouldRoundTripHarZip()
```

**verdict:**

---

## 13. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:38

**Message:** Hardcoded URL: `.GotoAsync("https://www.example.com"`.

```
      33|         await page1.RouteAsync("**/*", (route) =>
      34|         {
      35|             route.FulfillAsync(new() { Body = "<html></html>" });
      36|         });
      37|
>>>   38|         await page1.GotoAsync("https://www.example.com");
      39|         await page1.EvaluateAsync(@"() =>
      40|             {
      41|                 localStorage['name1'] = 'value1';
      42|             }");
      43|         await page1.GotoAsync("https://www.domain.com");
```

**verdict:**

---

## 14. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:43

**Message:** Hardcoded URL: `.GotoAsync("https://www.domain.com"`.

```
      38|         await page1.GotoAsync("https://www.example.com");
      39|         await page1.EvaluateAsync(@"() =>
      40|             {
      41|                 localStorage['name1'] = 'value1';
      42|             }");
>>>   43|         await page1.GotoAsync("https://www.domain.com");
      44|         await page1.EvaluateAsync(@"() =>
      45|             {
      46|                 localStorage['name2'] = 'value2';
      47|             }");
      48|
```

**verdict:**

---

## 15. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:68

**Message:** Hardcoded URL: `.GotoAsync("https://www.example.com"`.

```
      63|         var page = await context.NewPageAsync();
      64|         await page.RouteAsync("**/*", (route) =>
      65|         {
      66|             route.FulfillAsync(new() { Body = "<html></html>" });
      67|         });
>>>   68|         await page.GotoAsync("https://www.example.com");
      69|         var localStorage = await page.EvaluateAsync<string[]>("Object.keys(window.localStorage)");
      70|         Assert.AreEqual(localStorage, new string[] { "name1" });
      71|         var name1Value = await page.EvaluateAsync<string>("window.localStorage.getItem('name1')");
      72|         Assert.AreEqual(name1Value, "value1");
      73|     }
```

**verdict:**

---

## 16. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:84

**Message:** Hardcoded URL: `.GotoAsync("https://www.example.com"`.

```
      79|         await page1.RouteAsync("**/*", (route) =>
      80|         {
      81|             route.FulfillAsync(new() { Body = "<html></html>" });
      82|         });
      83|
>>>   84|         await page1.GotoAsync("https://www.example.com");
      85|         await page1.EvaluateAsync(@"async () =>
      86|             {
      87|                 localStorage['name1'] = 'value1';
      88|                 document.cookie = 'username=John Doe';
      89|
```

**verdict:**

---

## 17. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:118

**Message:** Hardcoded URL: `.GotoAsync("https://www.example.com"`.

```
     113|         await page2.RouteAsync("**/*", (route) =>
     114|         {
     115|             route.FulfillAsync(new() { Body = "<html></html>" });
     116|         });
     117|
>>>  118|         await page2.GotoAsync("https://www.example.com");
     119|         Assert.AreEqual("value1", await page2.EvaluateAsync<string>("localStorage['name1']"));
     120|         Assert.AreEqual("username=John Doe", await page2.EvaluateAsync<string>("document.cookie"));
     121|
     122|         var idbValue = await page2.EvaluateAsync<string>(@"
     123|             () => {
```

**verdict:**

---

## 18. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:190

**Message:** Hardcoded URL: `.GotoAsync("https://www.example.com"`.

```
     185|         var page = await context.NewPageAsync();
     186|         await page.RouteAsync("**/*", (route) =>
     187|         {
     188|             route.FulfillAsync(new() { Body = "<html></html>" });
     189|         });
>>>  190|         await page.GotoAsync("https://www.example.com");
     191|         var localStorage = await page.EvaluateAsync<string>("window.localStorage.getItem('name1')");
     192|         Assert.IsNull(localStorage);
     193|
     194|         using var tempDir = new TempDirectory();
     195|         string path = Path.Combine(tempDir.Path, "storage-state.json");
```

**verdict:**

---

## 19. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:199

**Message:** Hardcoded URL: `.GotoAsync("https://www.example.com"`.

```
     194|         using var tempDir = new TempDirectory();
     195|         string path = Path.Combine(tempDir.Path, "storage-state.json");
     196|         File.WriteAllText(path, @"{""cookies"":[],""origins"":[{""origin"":""https://www.example.com"",""localStorage"":[{""name"":""name1"",""value"":""value1""}]}]}");
     197|         await context.SetStorageStateAsync(path);
     198|
>>>  199|         await page.GotoAsync("https://www.example.com");
     200|         localStorage = await page.EvaluateAsync<string>("window.localStorage.getItem('name1')");
     201|         Assert.AreEqual("value1", localStorage);
     202|     }
     203| }
     204|
```

**verdict:**

---

## 20. microsoft-playwright-dotnet — src/Playwright.Tests/FirefoxLauncherTests.cs:44

**Message:** Hardcoded URL: `.GotoAsync("http://example.com"`.

```
      39|             ["network.proxy.http_port"] = 333,
      40|         };
      41|
      42|         await using var browser = await BrowserType.LaunchAsync(new() { FirefoxUserPrefs = firefoxUserPrefs });
      43|         var page = await browser.NewPageAsync();
>>>   44|         var exception = await PlaywrightAssert.ThrowsAsync<PlaywrightException>(() => page.GotoAsync("http://example.com"));
      45|
      46|         StringAssert.Contains("NS_ERROR_PROXY_CONNECTION_REFUSED", exception.Message);
      47|     }
      48| }
      49|
```

**verdict:**

---
