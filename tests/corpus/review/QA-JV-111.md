# QA-JV-111 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextRoute.java:64

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      59|   void shouldUnroute() {
      60|     BrowserContext context = browser.newContext();
      61|     Page page = context.newPage();
      62|
      63|     List<Integer> intercepted = new ArrayList<>();
>>>   64|     context.route("**/*", route -> {
      65|       intercepted.add(1);
      66|       route.fallback();
      67|     });
      68|     context.route("**/empty.html", route -> {
      69|       intercepted.add(2);
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextRoute.java:182

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
     177|   @Disabled("Conflicts with https://github.com/microsoft/playwright-java/pull/680")
     178|   void shouldNotSwallowExceptionsInFulfill() throws ExecutionException, InterruptedException {
     179|     APIRequestContext request = playwright.request().newContext();
     180|     APIResponse response = request.get(server.EMPTY_PAGE);
     181|     response.dispose();
>>>  182|     page.route("**/*", route -> {
     183|       // Fulfilling with dsiposed response will lead to a server-side exception.
     184|       route.fulfill(new Route.FulfillOptions().setResponse(response));
     185|     });
     186|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.navigate(server.EMPTY_PAGE));
     187|     assertTrue(e.getMessage().contains("Fetch response has been disposed"), e.getMessage());
```

**verdict:**

---

## 3. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextRoute.java:193

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
     188|   }
     189|
     190|   @Test
     191|   @Disabled("Conflicts with https://github.com/microsoft/playwright-java/pull/680")
     192|   void shouldNotSwallowExceptionsInResume() throws ExecutionException, InterruptedException {
>>>  193|     page.route("**/*", route -> {
     194|       route.resume(new Route.ResumeOptions().setUrl("file:///tmp"));
     195|     });
     196|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.navigate(server.EMPTY_PAGE));
     197|     assertTrue(e.getMessage().contains("New URL must have same protocol as overridden URL"), e.getMessage());
     198|   }
```

**verdict:**

---

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextStorageState.java:40

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      35|
      36| public class TestBrowserContextStorageState extends TestBase {
      37|
      38|   @Test
      39|   void shouldCaptureLocalStorage() {
>>>   40|     page.route("**/*", route -> {
      41|       route.fulfill(new Route.FulfillOptions().setBody("<html></html>"));
      42|     });
      43|     page.navigate("https://www.example.com");
      44|     page.evaluate("localStorage['name1'] = 'value1';");
      45|     page.navigate("https://www.domain.com");
```

**verdict:**

---

## 5. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextStorageState.java:80

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      75|       "    }\n" +
      76|       "  ]\n" +
      77|       "}";
      78|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setStorageState(storageState));
      79|     Page page = context.newPage();
>>>   80|     page.route("**/*", route -> {
      81|       route.fulfill(new Route.FulfillOptions().setBody("<html></html>"));
      82|     });
      83|     page.navigate("https://www.example.com");
      84|     Object localStorage = page.evaluate("window.localStorage");
      85|     assertEquals(mapOf("name1", "value1"), localStorage);
```

**verdict:**

---

## 6. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextStorageState.java:92

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      87|   }
      88|
      89|   @Test
      90|   void shouldRoundTripThroughTheFile(@TempDir Path tempDir) throws IOException {
      91|     Page page1 = context.newPage();
>>>   92|     page1.route("**/*", route -> {
      93|       route.fulfill(new Route.FulfillOptions().setBody("<html></html>"));
      94|     });
      95|     page1.navigate("https://www.example.com");
      96|     page1.evaluate("() => {\n" +
      97|       "  localStorage['name1'] = 'value1';\n" +
```

**verdict:**

---

## 7. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextStorageState.java:145

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
     140|     try (InputStreamReader reader = new InputStreamReader(new FileInputStream(path.toFile()), StandardCharsets.UTF_8)) {
     141|       assertEquals(expected, new Gson().fromJson(reader, JsonObject.class));
     142|     }
     143|     BrowserContext context2 = browser.newContext(new Browser.NewContextOptions().setStorageStatePath(path));
     144|     Page page2 = context2.newPage();
>>>  145|     page2.route("**/*", route -> {
     146|       route.fulfill(new Route.FulfillOptions().setBody("<html></html>"));
     147|     });
     148|     page2.navigate("https://www.example.com");
     149|     Object localStorage = page2.evaluate("window.localStorage");
     150|     assertEquals(mapOf("name1", "value1"), localStorage);
```

**verdict:**

---

## 8. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserTypeConnect.java:462

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
     457|     assertEquals(new String(thisFile, UTF_8), new String(sources.values().iterator().next(), UTF_8));
     458|   }
     459|
     460|   @Test
     461|   void shouldFulfillWithGlobalFetchResult() {
>>>  462|     page.route("**/*", route -> {
     463|       APIRequestContext request = playwright.request().newContext();
     464|       APIResponse response = request.get(server.PREFIX + "/simple.json");
     465|       route.fulfill(new Route.FulfillOptions().setResponse(response));
     466|     });
     467|     Response response = page.navigate(server.EMPTY_PAGE);
```

**verdict:**

---

## 9. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestNetworkRequest.java:77

**Message:** `page.route("**")` — blanket interception of all requests.

```
      72|   }
      73|
      74|   @Test
      75|   void shouldWorkAllHeadersInsideRoute() {
      76|     List<Request> requests = new ArrayList<>();
>>>   77|     page.route("**", route -> {
      78|       assertTrue(route.request().allHeaders().get("accept").length() > 5);
      79|       requests.add(route.request());
      80|       route.resume();
      81|     });
      82|     page.navigate(server.PREFIX + "/empty.html");
```

**verdict:**

---

## 10. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestNetworkRequest.java:91

**Message:** `page.route("**")` — blanket interception of all requests.

```
      86|   // https://github.com/microsoft/playwright/issues/3993
      87|   @Test
      88|   void shouldNotWorkForARedirectAndInterception() {
      89|     server.setRedirect("/foo.html", "/empty.html");
      90|     List<Request> requests = new ArrayList<>();
>>>   91|     page.route("**", route -> {
      92|       requests.add(route.request());
      93|       route.resume();
      94|     });
      95|     page.navigate(server.PREFIX + "/foo.html");
      96|
```

**verdict:**

---

## 11. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageInterception.java:34

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      29|
      30| public class  TestPageInterception extends TestBase {
      31|   @Test
      32|   void shouldWorkWithNavigationSmoke() {
      33|     HashMap<String, Request> requests = new HashMap<>();
>>>   34|     page.route("**/*", route -> {
      35|       String[] parts = route.request().url().split("/");
      36|       requests.put(parts[parts.length - 1], route.request());
      37|       route.resume();
      38|     });
      39|     server.setRedirect("/rrredirect", "/frames/one-frame.html");
```

**verdict:**

---

## 12. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageInterception.java:83

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      78|     }
      79|   }
      80|
      81|   @Test
      82|   void shouldFulfillInterceptedResponseUsingAlias() {
>>>   83|     page.route("**/*", route -> {
      84|       APIResponse response = route.fetch();
      85|       route.fulfill(new Route.FulfillOptions().setResponse(response));
      86|     });
      87|     Response response = page.navigate(server.PREFIX + "/empty.html");
      88|     assertEquals(200, response.status());
```

**verdict:**

---

## 13. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageInterception.java:99

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      94|     server.setRoute("/slow", exchange -> {
      95|       exchange.getResponseHeaders().set("Content-type", "text/plain");
      96|       exchange.sendResponseHeaders(200, 4096);
      97|     });
      98|
>>>   99|     page.route("**/*", route -> {
     100|       PlaywrightException error = assertThrows(PlaywrightException.class,
     101|         () -> route.fetch(new Route.FetchOptions().setTimeout(1000)));
     102|       assertTrue(error.getMessage().contains("Timeout 1000ms exceeded"), error.getMessage());
     103|     });
     104|     PlaywrightException error = assertThrows(PlaywrightException.class,
```

**verdict:**

---

## 14. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageInterception.java:134

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
     129|   }
     130|
     131|   @Test
     132|   void shouldNotFollowRedirectsWhenMaxRedirectsIsSetTo0InRouteFetch() {
     133|     server.setRedirect("/foo", "/empty.html");
>>>  134|     page.route("**/*", route -> {
     135|       APIResponse response = route.fetch(new Route.FetchOptions().setMaxRedirects(0));
     136|       assertEquals("/empty.html", response.headers().get("location"));
     137|       assertEquals(302, response.status());
     138|       route.fulfill(new Route.FulfillOptions().setBody("hello"));
     139|     });
```

**verdict:**

---

## 15. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageNetworkResponse.java:77

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      72|   }
      73|
      74|   @Test
      75|   void shouldReturnNullExistingResponseBeforeResponseReceived() {
      76|     Request[] capturedRequest = {null};
>>>   77|     page.route("**/*", route -> {
      78|       capturedRequest[0] = route.request();
      79|       assertNull(capturedRequest[0].existingResponse());
      80|       route.resume();
      81|     });
      82|     page.navigate(server.EMPTY_PAGE);
```

**verdict:**

---

## 16. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageRequestContinue.java:73

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      68|   }
      69|
      70|   @Test
      71|   void shouldNotThrowWhenContinuingAfterPageIsClosed() {
      72|     boolean[] done = {false};
>>>   73|     page.route("**/*", route -> {
      74|       page.close();
      75|       route.resume();
      76|       done[0] = true;
      77|     });
      78|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.navigate(server.EMPTY_PAGE));
```

**verdict:**

---

## 17. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageRequestContinue.java:120

**Message:** `page.route("**")` — blanket interception of all requests.

```
     115|       exchange.getResponseBody().close();
     116|     });
     117|     page.navigate(server.PREFIX + "/set-cookie");
     118|     assertEquals("foo=bar", page.evaluate("() => document.cookie"));
     119|
>>>  120|     page.route("**", route -> {
     121|       Map<String, String> headers = new HashMap<>(route.request().allHeaders());
     122|       headers.put("cookie", "override");
     123|       headers.put("custom", "value");
     124|       route.resume(new Route.ResumeOptions().setHeaders(headers));
     125|     });
```

**verdict:**

---

## 18. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageRequestFallback.java:36

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
      31| import static org.junit.jupiter.api.Assertions.*;
      32|
      33| public class TestPageRequestFallback extends TestBase {
      34|   @Test
      35|   void shouldWork() {
>>>   36|     page.route("**/*", route -> route.fallback());
      37|     page.navigate(server.EMPTY_PAGE);
      38|   }
      39|
      40|   @Test
      41|   void shouldFallBack() {
```

**verdict:**

---

## 19. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageRequestFallback.java:152

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
     147|     page.route("**/sleep.zzz", route -> {
     148|       values.add(route.request().headers().get("foo"));
     149|       values.add(route.request().headerValue("FOO"));
     150|       route.resume();
     151|     });
>>>  152|     page.route("**/*", route -> {
     153|       Map<String, String> headers = route.request().headers();
     154|       headers.put("FOO", "bar");
     155|       route.fallback(new Route.FallbackOptions().setHeaders(headers));
     156|     });
     157|     page.navigate(server.EMPTY_PAGE);
```

**verdict:**

---

## 20. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageRequestFallback.java:209

**Message:** `page.route("**/*")` — blanket interception of all requests.

```
     204|   @Test
     205|   void shouldAmendMethod() throws ExecutionException, InterruptedException {
     206|     Future<Server.Request> sRequest = server.futureRequest("/sleep.zzz");
     207|     page.navigate(server.EMPTY_PAGE);
     208|     String[] method = {null};
>>>  209|     page.route("**/*", route -> {
     210|       method[0] = route.request().method();
     211|       route.resume();
     212|     });
     213|     page.route("**/*", route -> route.fallback(new Route.FallbackOptions().setMethod("POST")));
     214|     Request request = page.waitForRequest("**/sleep.zzz", () -> page.evaluate("() => fetch('/sleep.zzz')"));
```

**verdict:**

---
