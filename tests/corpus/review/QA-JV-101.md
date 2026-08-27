# QA-JV-101 — Sample Findings for Classification

Total sampled: 8 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextFetch.java:167

**Message:** Disabled test detected: `@Disabled`.

```
     162|     });
     163|     assertTrue(e.getMessage().contains("404 Not Found"), e.getMessage());
     164|   }
     165|
     166|   @Test
>>>  167|   @Disabled("Error: socket hang up")
     168|   void getShouldSupportIgnoreHTTPSErrorsOption() {
     169|     APIResponse response = context.request().get(httpsServer.EMPTY_PAGE, RequestOptions.create().setIgnoreHTTPSErrors(true));
     170|     assertEquals(200, response.status());
     171|   }
     172|
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextFetch.java:230

**Message:** Disabled test detected: `@Disabled`.

```
     225|     page.navigate(server.EMPTY_PAGE);
     226|     assertEquals(asList("foo=bar", "session=value"), page.evaluate("() => document.cookie.split(';').map(s => s.trim()).sort()"));
     227|   }
     228|
     229|   @Test
>>>  230|   @Disabled("Default Java's HTTP server throws on 'CONNECT non-existent.com:80 HTTP/1.1' because path is null.")
     231|   void shouldWorkWithContextLevelProxy() throws ExecutionException, InterruptedException {
     232|     server.setRoute("/target.html", exchange -> {
     233|       exchange.getResponseHeaders().add("Content-Type", "text/plain; charset=utf-8");
     234|       exchange.sendResponseHeaders(200, 0);
     235|       try (OutputStreamWriter writer = new OutputStreamWriter(exchange.getResponseBody())) {
```

**verdict:**

---

## 3. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextRoute.java:177

**Message:** Disabled test detected: `@Disabled`.

```
     172|     RuntimeException e = assertThrows(RuntimeException.class, () -> page.navigate(server.EMPTY_PAGE));
     173|     assertTrue(e.getMessage().contains("My Exception"), e.getMessage());
     174|   }
     175|
     176|   @Test
>>>  177|   @Disabled("Conflicts with https://github.com/microsoft/playwright-java/pull/680")
     178|   void shouldNotSwallowExceptionsInFulfill() throws ExecutionException, InterruptedException {
     179|     APIRequestContext request = playwright.request().newContext();
     180|     APIResponse response = request.get(server.EMPTY_PAGE);
     181|     response.dispose();
     182|     page.route("**/*", route -> {
```

**verdict:**

---

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextRoute.java:191

**Message:** Disabled test detected: `@Disabled`.

```
     186|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.navigate(server.EMPTY_PAGE));
     187|     assertTrue(e.getMessage().contains("Fetch response has been disposed"), e.getMessage());
     188|   }
     189|
     190|   @Test
>>>  191|   @Disabled("Conflicts with https://github.com/microsoft/playwright-java/pull/680")
     192|   void shouldNotSwallowExceptionsInResume() throws ExecutionException, InterruptedException {
     193|     page.route("**/*", route -> {
     194|       route.resume(new Route.ResumeOptions().setUrl("file:///tmp"));
     195|     });
     196|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.navigate(server.EMPTY_PAGE));
```

**verdict:**

---

## 5. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestGlobalFetch.java:240

**Message:** Disabled test detected: `@Disabled`.

```
     235|
     236|   void shouldPassProxyCredentials() {
     237|   }
     238|
     239|   @Test
>>>  240|   @Disabled("Error: socket hang up")
     241|   void shouldSupportGlobalIgnoreHTTPSErrorsOption() {
     242|     APIRequestContext request = playwright.request().newContext(new APIRequest.NewContextOptions().setIgnoreHTTPSErrors(true));
     243|     APIResponse response = request.get(httpsServer.EMPTY_PAGE);
     244|     assertEquals(200, response.status());
     245|   }
```

**verdict:**

---

## 6. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestGlobalFetch.java:248

**Message:** Disabled test detected: `@Disabled`.

```
     243|     APIResponse response = request.get(httpsServer.EMPTY_PAGE);
     244|     assertEquals(200, response.status());
     245|   }
     246|
     247|   @Test
>>>  248|   @Disabled("Error: socket hang up")
     249|   void shouldPropagateIgnoreHTTPSErrorsOnRedirects() {
     250|     httpsServer.setRedirect("/redir", "/empty.html");
     251|     APIRequestContext request = playwright.request().newContext();
     252|     APIResponse response = request.get(httpsServer.PREFIX + "/redir", RequestOptions.create().setIgnoreHTTPSErrors(true));
     253|     assertEquals(200, response.status());
```

**verdict:**

---

## 7. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorHighlight.java:28

**Message:** Disabled test detected: `@Disabled`.

```
      23|
      24| import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
      25| import static org.junit.jupiter.api.Assertions.assertEquals;
      26|
      27| public class TestLocatorHighlight extends TestBase {
>>>   28|   @Disabled("Requires isUnderTest to be true https://github.com/microsoft/playwright/pull/12420")
      29|   @Test
      30|   void shouldHighlightLocator() {
      31|     page.setContent("<input type='text' />");
      32|     page.locator("input").highlight();
      33|     assertThat(page.locator("x-pw-tooltip")).hasText("input");
```

**verdict:**

---

## 8. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestRequestContinue.java:77

**Message:** Disabled test detected: `@Disabled`.

```
      72|     assertEquals(123, page.evaluate("window['globalVar']"));
      73|     assertEquals("GET", serverRequest.get().method);
      74|   }
      75|
      76|   @Test
>>>   77|   @Disabled("resume() method is now asynchronous")
      78|   void shouldNotAllowChangingProtocolWhenOverridingUrl() {
      79|     page.route("**/*", route -> {
      80|       PlaywrightException e = assertThrows(PlaywrightException.class, () -> {
      81|         route.resume(new Route.ResumeOptions().setUrl("file:///tmp/foo"));
      82|       });
```

**verdict:**

---
