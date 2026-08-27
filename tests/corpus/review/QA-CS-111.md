# QA-CS-111 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextRouteTests.cs:71

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
      66|         await using var context = await Browser.NewContextAsync();
      67|         var page = await context.NewPageAsync();
      68|         var intercepted = new List<int>();
      69|
      70|
>>>   71|         await context.RouteAsync("**/*", route =>
      72|         {
      73|             intercepted.Add(1);
      74|             route.ContinueAsync();
      75|         });
      76|
```

**verdict:**

---

## 2. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextRouteTests.cs:407

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     402|         void handler(IRoute route)
     403|         {
     404|             intercepted.Add("first");
     405|             route.ContinueAsync();
     406|         }
>>>  407|         await context.RouteAsync("**/*", handler, new() { Times = 1 });
     408|         await context.RouteAsync("**/*", async (route) =>
     409|         {
     410|             intercepted.Add("second");
     411|             await context.UnrouteAsync("**/*", handler);
     412|             await route.FallbackAsync();
```

**verdict:**

---

## 3. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextRouteTests.cs:408

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     403|         {
     404|             intercepted.Add("first");
     405|             route.ContinueAsync();
     406|         }
     407|         await context.RouteAsync("**/*", handler, new() { Times = 1 });
>>>  408|         await context.RouteAsync("**/*", async (route) =>
     409|         {
     410|             intercepted.Add("second");
     411|             await context.UnrouteAsync("**/*", handler);
     412|             await route.FallbackAsync();
     413|         });
```

**verdict:**

---

## 4. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:33

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
      28| {
      29|     [PlaywrightTest("browsercontext-storage-state.spec.ts", "should capture local storage")]
      30|     public async Task ShouldCaptureLocalStorage()
      31|     {
      32|         var page1 = await Context.NewPageAsync();
>>>   33|         await page1.RouteAsync("**/*", (route) =>
      34|         {
      35|             route.FulfillAsync(new() { Body = "<html></html>" });
      36|         });
      37|
      38|         await page1.GotoAsync("https://www.example.com");
```

**verdict:**

---

## 5. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:64

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
      59|         var context = await Browser.NewContextAsync(new()
      60|         {
      61|             StorageState = "{\"cookies\":[],\"origins\":[{\"origin\":\"https://www.example.com\",\"localStorage\":[{\"name\":\"name1\",\"value\":\"value1\"}]}]}",
      62|         });
      63|         var page = await context.NewPageAsync();
>>>   64|         await page.RouteAsync("**/*", (route) =>
      65|         {
      66|             route.FulfillAsync(new() { Body = "<html></html>" });
      67|         });
      68|         await page.GotoAsync("https://www.example.com");
      69|         var localStorage = await page.EvaluateAsync<string[]>("Object.keys(window.localStorage)");
```

**verdict:**

---

## 6. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:79

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
      74|
      75|     [PlaywrightTest("browsercontext-storage-state.spec.ts", "should round-trip through the file")]
      76|     public async Task ShouldRoundTripThroughTheFile()
      77|     {
      78|         var page1 = await Context.NewPageAsync();
>>>   79|         await page1.RouteAsync("**/*", (route) =>
      80|         {
      81|             route.FulfillAsync(new() { Body = "<html></html>" });
      82|         });
      83|
      84|         await page1.GotoAsync("https://www.example.com");
```

**verdict:**

---

## 7. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:113

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     108|         string storage = await Context.StorageStateAsync(new() { IndexedDB = true, Path = path });
     109|         Assert.AreEqual(storage, File.ReadAllText(path));
     110|
     111|         await using var context = await Browser.NewContextAsync(new() { StorageStatePath = path });
     112|         var page2 = await context.NewPageAsync();
>>>  113|         await page2.RouteAsync("**/*", (route) =>
     114|         {
     115|             route.FulfillAsync(new() { Body = "<html></html>" });
     116|         });
     117|
     118|         await page2.GotoAsync("https://www.example.com");
```

**verdict:**

---

## 8. microsoft-playwright-dotnet — src/Playwright.Tests/BrowserContextStorageStateTests.cs:186

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     181|     [PlaywrightTest("browsercontext-storage-state.spec.ts", "should set local storage via setStorageState")]
     182|     public async Task ShouldSetLocalStorageViaSetStorageState()
     183|     {
     184|         await using var context = await Browser.NewContextAsync();
     185|         var page = await context.NewPageAsync();
>>>  186|         await page.RouteAsync("**/*", (route) =>
     187|         {
     188|             route.FulfillAsync(new() { Body = "<html></html>" });
     189|         });
     190|         await page.GotoAsync("https://www.example.com");
     191|         var localStorage = await page.EvaluateAsync<string>("window.localStorage.getItem('name1')");
```

**verdict:**

---

## 9. microsoft-playwright-dotnet — src/Playwright.Tests/InterceptionTests.cs:159

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     154|             IgnoreHTTPSErrors = true
     155|         });
     156|
     157|         var page = await context.NewPageAsync();
     158|
>>>  159|         await page.RouteAsync("**/*", (route) => route.ContinueAsync());
     160|         var response = await page.GotoAsync(HttpsServer.EmptyPage);
     161|         Assert.AreEqual((int)HttpStatusCode.OK, response.Status);
     162|         await context.CloseAsync();
     163|     }
     164|
```

**verdict:**

---

## 10. microsoft-playwright-dotnet — src/Playwright.Tests/InterceptionTests.cs:170

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     165|
     166|     [PlaywrightTest("interception.spec.ts", "should work with navigation")]
     167|     public async Task ShouldWorkWithNavigation()
     168|     {
     169|         var requests = new Dictionary<string, IRequest>();
>>>  170|         await Page.RouteAsync("**/*", (route) =>
     171|         {
     172|             requests.Add(route.Request.Url.Split('/').Last(), route.Request);
     173|             route.ContinueAsync();
     174|         });
     175|
```

**verdict:**

---

## 11. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestContinueTests.cs:34

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
      29| public class PageRequestContinueTests : PageTestEx
      30| {
      31|     [PlaywrightTest("page-request-continue.spec.ts", "should work")]
      32|     public async Task ShouldWork()
      33|     {
>>>   34|         await Page.RouteAsync("**/*", (route) => route.ContinueAsync());
      35|         await Page.GotoAsync(Server.EmptyPage);
      36|     }
      37|
      38|     [PlaywrightTest("page-request-continue.spec.ts", "should amend HTTP headers")]
      39|     public async Task ShouldAmendHTTPHeaders()
```

**verdict:**

---

## 12. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestContinueTests.cs:41

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
      36|     }
      37|
      38|     [PlaywrightTest("page-request-continue.spec.ts", "should amend HTTP headers")]
      39|     public async Task ShouldAmendHTTPHeaders()
      40|     {
>>>   41|         await Page.RouteAsync("**/*", (route) =>
      42|         {
      43|             var headers = new Dictionary<string, string>(route.Request.Headers.ToDictionary(x => x.Key, x => x.Value)) { ["FOO"] = "bar" };
      44|             route.ContinueAsync(new() { Headers = headers });
      45|         });
      46|         await Page.GotoAsync(Server.EmptyPage);
```

**verdict:**

---

## 13. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestContinueTests.cs:59

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
      54|
      55|     [PlaywrightTest("page-request-continue.spec.ts", "should amend method on main request")]
      56|     public async Task ShouldAmendMethodOnMainRequest()
      57|     {
      58|         var methodTask = Server.WaitForRequest("/empty.html", r => r.Method);
>>>   59|         await Page.RouteAsync("**/*", (route) => route.ContinueAsync(new() { Method = HttpMethod.Post.Method }));
      60|         await Page.GotoAsync(Server.EmptyPage);
      61|         Assert.AreEqual("POST", await methodTask);
      62|     }
      63|
      64|     [PlaywrightTest("page-request-continue.spec.ts", "should amend post data")]
```

**verdict:**

---

## 14. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestContinueTests.cs:68

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
      63|
      64|     [PlaywrightTest("page-request-continue.spec.ts", "should amend post data")]
      65|     public async Task ShouldAmendPostData()
      66|     {
      67|         await Page.GotoAsync(Server.EmptyPage);
>>>   68|         await Page.RouteAsync("**/*", (route) =>
      69|         {
      70|             route.ContinueAsync(new() { PostData = Encoding.UTF8.GetBytes("doggo") });
      71|         });
      72|         var requestTask = Server.WaitForRequest("/sleep.zzz", request =>
      73|         {
```

**verdict:**

---

## 15. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestContinueTests.cs:89

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
      84|
      85|     [PlaywrightTest("page-request-continue.spec.ts", "should not throw when continuing while page is closing")]
      86|     public async Task ShouldNotThrowWhenContinuingWhilePageIsClosing()
      87|     {
      88|         Task done = null;
>>>   89|         await Page.RouteAsync("**/*", (route) =>
      90|         {
      91|             done = Task.WhenAll(
      92|                 route.ContinueAsync(),
      93|                 Page.CloseAsync()
      94|             );
```

**verdict:**

---

## 16. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestContinueTests.cs:108

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     103|     [PlaywrightTest("page-request-continue.spec.ts", "should not throw when continuing after page is closed")]
     104|     public async Task ShouldNotThrowWhenContinuingAfterPageIsClosed()
     105|     {
     106|         var tsc = new TaskCompletionSource<bool>();
     107|         Task done = null;
>>>  108|         await Page.RouteAsync("**/*", async (route) =>
     109|         {
     110|             await Page.CloseAsync();
     111|             done = route.ContinueAsync();
     112|             tsc.SetResult(true);
     113|         });
```

**verdict:**

---

## 17. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestContinueTests.cs:178

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     173|             Assert.AreEqual(200, status);
     174|             return await requestPostBody;
     175|         }
     176|
     177|         var reqBefore = await SendFormData();
>>>  178|         await Page.RouteAsync("**/*", async (route) =>
     179|         {
     180|             await route.ContinueAsync();
     181|         });
     182|         var reqAfter = await SendFormData();
     183|         var fileContent = string.Join("\r\n", new[]
```

**verdict:**

---

## 18. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestFallbackTests.cs:166

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     161|         {
     162|             values.Add(route.Request.Headers["foo"]);
     163|             values.Add(await route.Request.HeaderValueAsync("FOO"));
     164|             await route.ContinueAsync();
     165|         });
>>>  166|         await Page.RouteAsync("**/*", route =>
     167|         {
     168|             var headers = route.Request.Headers.ToDictionary(x => x.Key, x => x.Value);
     169|             headers["FOO"] = "bar";
     170|             route.FallbackAsync(new() { Headers = headers });
     171|         });
```

**verdict:**

---

## 19. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestFallbackTests.cs:192

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     187|             context.Response.Headers["Access-Control-Allow-Origin"] = "*";
     188|             await context.Response.Body.WriteAsync(System.Text.Encoding.UTF8.GetBytes("done"));
     189|             await context.Response.CompleteAsync();
     190|         });
     191|         IRequest interceptedRequest = null;
>>>  192|         await Page.RouteAsync("**/*", async (route) =>
     193|         {
     194|             interceptedRequest = route.Request;
     195|             await route.ContinueAsync();
     196|         });
     197|         await Page.RouteAsync(Server.Prefix + "/something", async route =>
```

**verdict:**

---

## 20. microsoft-playwright-dotnet — src/Playwright.Tests/PageRequestFallbackTests.cs:228

**Message:** `page.RouteAsync("**/*")` — blanket interception of all requests.

```
     223|     {
     224|         var sRequestMethod = Server.WaitForRequest("/sleep.zzz", request => request.Method);
     225|         await Page.GotoAsync(Server.EmptyPage);
     226|
     227|         string method = null;
>>>  228|         await Page.RouteAsync("**/*", async (route) =>
     229|         {
     230|             method = route.Request.Method;
     231|             await route.ContinueAsync();
     232|         });
     233|         await Page.RouteAsync("**/*", route => route.FallbackAsync(new() { Method = "POST" }));
```

**verdict:**

---
