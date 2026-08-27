# QA-JV-108 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:51

**Message:** Hardcoded URL: `.navigate("http://no.playwright/"`.

```
      46|   @Test
      47|   void shouldContextRouteFromHARMatchingTheMethodAndFollowingRedirects() {
      48|     Path path = Paths.get("src/test/resources/har-fulfill.har");
      49|     context.routeFromHAR(path);
      50|     Page page = context.newPage();
>>>   51|     page.navigate("http://no.playwright/");
      52|     // HAR contains a redirect for the script that should be followed automatically.
      53|     assertEquals("foo", page.evaluate("window.value"));
      54|     // HAR contains a POST for the css file that should not be used.
      55|     assertThat(page.locator("body")).hasCSS("background-color", "rgb(255, 0, 0)");
      56|   }
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:63

**Message:** Hardcoded URL: `.navigate("http://no.playwright/"`.

```
      58|   @Test
      59|   void shouldPageRouteFromHARMatchingTheMethodAndFollowingRedirects() {
      60|     Path path = Paths.get("src/test/resources/har-fulfill.har");
      61|     Page page = context.newPage();
      62|     page.routeFromHAR(path);
>>>   63|     page.navigate("http://no.playwright/");
      64|     // HAR contains a redirect for the script that should be followed automatically.
      65|     assertEquals("foo", page.evaluate("window.value"));
      66|     // HAR contains a POST for the css file that should not be used.
      67|     assertThat(page.locator("body")).hasCSS("background-color", "rgb(255, 0, 0)");
      68|   }
```

**verdict:**

---

## 3. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:111

**Message:** Hardcoded URL: `.navigate("http://no.playwright/"`.

```
     106|       route.fulfill(new Route.FulfillOptions()
     107|         .setStatus(200)
     108|         .setContentType("text/html")
     109|         .setBody("<script src='./script.js'></script><div>hello</div>"));
     110|     });
>>>  111|     page.navigate("http://no.playwright/");
     112|     // HAR contains a redirect for the script that should be followed automatically.
     113|     assertEquals("foo", page.evaluate("window.value"));
     114|     assertThat(page.locator("body")).hasCSS("background-color", "rgba(0, 0, 0, 0)");
     115|   }
     116|
```

**verdict:**

---

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:129

**Message:** Hardcoded URL: `.navigate("http://no.playwright/"`.

```
     124|       route.fulfill(new Route.FulfillOptions()
     125|         .setStatus(200)
     126|         .setContentType("text/html")
     127|         .setBody("<script src='./script.js'></script><div>hello</div>"));
     128|     });
>>>  129|     page.navigate("http://no.playwright/");
     130|     // HAR contains a redirect for the script that should be followed automatically.
     131|     assertEquals("foo", page.evaluate("window.value"));
     132|     assertThat(page.locator("body")).hasCSS("background-color", "rgba(0, 0, 0, 0)");
     133|   }
     134|
```

**verdict:**

---

## 5. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:147

**Message:** Hardcoded URL: `.navigate("http://no.playwright/"`.

```
     142|       route.fulfill(new Route.FulfillOptions()
     143|         .setStatus(200)
     144|         .setContentType("text/html")
     145|         .setBody("<script src='./script.js'></script><div>hello</div>"));
     146|     });
>>>  147|     page.navigate("http://no.playwright/");
     148|     // HAR contains a redirect for the script that should be followed automatically.
     149|     assertEquals("foo", page.evaluate("window.value"));
     150|     assertThat(page.locator("body")).hasCSS("background-color", "rgba(0, 0, 0, 0)");
     151|   }
     152|
```

**verdict:**

---

## 6. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:158

**Message:** Hardcoded URL: `.navigate("http://no.playwright/"`.

```
     153|   @Test
     154|   void shouldSupportRegexFilter() {
     155|     Path path = Paths.get("src/test/resources/har-fulfill.har");
     156|     context.routeFromHAR(path, new BrowserContext.RouteFromHAROptions().setUrl(Pattern.compile(".*(\\.js|.*\\.css|no.playwright\\/)$")));
     157|     Page page = context.newPage();
>>>  158|     page.navigate("http://no.playwright/");
     159|     assertEquals("foo", page.evaluate("window.value"));
     160|     assertThat(page.locator("body")).hasCSS("background-color", "rgb(255, 0, 0)");
     161|   }
     162|
     163|   @Test
```

**verdict:**

---

## 7. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:168

**Message:** Hardcoded URL: `.navigate("http://no.playwright/"`.

```
     163|   @Test
     164|   void newPageShouldFulfillFromHarMatchingTheMethodAndFollowingRedirects() {
     165|     Path path = Paths.get("src/test/resources/har-fulfill.har");
     166|     Page page = browser.newPage();
     167|     page.routeFromHAR(path);
>>>  168|     page.navigate("http://no.playwright/");
     169|     // HAR contains a redirect for the script that should be followed automatically.
     170|     assertEquals("foo", page.evaluate("window.value"));
     171|     // HAR contains a POST for the css file that should not be used.
     172|     assertThat(page.locator("body")).hasCSS("background-color", "rgb(255, 0, 0)");
     173|     page.close();
```

**verdict:**

---

## 8. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:182

**Message:** Hardcoded URL: `.navigate("https://theverge.com/"`.

```
     177|   void shouldChangeDocumentURLAfterRedirectedNavigation() {
     178|     Path path = Paths.get("src/test/resources/har-redirect.har");
     179|     context.routeFromHAR(path);
     180|     Page page = context.newPage();
     181|     Response response = page.waitForNavigation(() -> {
>>>  182|       page.navigate("https://theverge.com/");
     183|       page.waitForURL("https://www.theverge.com/");
     184|     });
     185|     assertThat(page).hasURL("https://www.theverge.com/");
     186|     assertEquals("https://www.theverge.com/", response.request().url());
     187|     assertEquals("https://www.theverge.com/", page.evaluate("location.href"));
```

**verdict:**

---

## 9. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:208

**Message:** Hardcoded URL: `.navigate("https://theverge.com/"`.

```
     203|   @Test
     204|   void shouldGoBackToRedirectedNavigation() {
     205|     Path path = Paths.get("src/test/resources/har-redirect.har");
     206|     context.routeFromHAR(path, new BrowserContext.RouteFromHAROptions().setUrl(Pattern.compile(".*theverge.*")));
     207|     Page page = context.newPage();
>>>  208|     page.navigate("https://theverge.com/");
     209|     page.navigate(server.EMPTY_PAGE);
     210|     assertThat(page).hasURL(server.EMPTY_PAGE);
     211|     Response response = page.goBack();
     212|     assertThat(page).hasURL("https://www.theverge.com/");
     213|     assertEquals("https://www.theverge.com/", response.request().url());
```

**verdict:**

---

## 10. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:225

**Message:** Hardcoded URL: `.navigate("https://theverge.com/"`.

```
     220|     Path path = Paths.get("src/test/resources/har-redirect.har");
     221|     context.routeFromHAR(path, new BrowserContext.RouteFromHAROptions().setUrl(Pattern.compile(".*theverge.*")));
     222|     Page page = context.newPage();
     223|     page.navigate(server.EMPTY_PAGE);
     224|     assertThat(page).hasURL(server.EMPTY_PAGE);
>>>  225|     page.navigate("https://theverge.com/");
     226|     assertThat(page).hasURL("https://www.theverge.com/");
     227|     page.goBack();
     228|     assertThat(page).hasURL(server.EMPTY_PAGE);
     229|     Response response = page.goForward();
     230|     assertThat(page).hasURL("https://www.theverge.com/");
```

**verdict:**

---

## 11. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:240

**Message:** Hardcoded URL: `.navigate("https://theverge.com/"`.

```
     235|   @Test
     236|   void shouldReloadRedirectedNavigation() {
     237|     Path path = Paths.get("src/test/resources/har-redirect.har");
     238|     context.routeFromHAR(path, new BrowserContext.RouteFromHAROptions().setUrl(Pattern.compile(".*theverge.*")));
     239|     Page page = context.newPage();
>>>  240|     page.navigate("https://theverge.com/");
     241|     assertThat(page).hasURL("https://www.theverge.com/");
     242|     Response response = page.reload();
     243|     assertThat(page).hasURL("https://www.theverge.com/");
     244|     assertEquals("https://www.theverge.com/", response.request().url());
     245|     assertEquals("https://www.theverge.com/", page.evaluate("() => location.href"));
```

**verdict:**

---

## 12. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:253

**Message:** Hardcoded URL: `.navigate("http://no.playwright/"`.

```
     248|   @Test
     249|   void shouldFulfillFromHarWithContentInAFile() {
     250|     Path path = Paths.get("src/test/resources/har-sha1.har");
     251|     context.routeFromHAR(path);
     252|     Page page = context.newPage();
>>>  253|     page.navigate("http://no.playwright/");
     254|     assertEquals("<html><head></head><body>Hello, world</body></html>", page.content());
     255|   }
     256|
     257|   @Test
     258|   void shouldRoundTripHarZip(@TempDir Path tmpDir) {
```

**verdict:**

---

## 13. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextProxy.java:46

**Message:** Hardcoded URL: `.navigate("http://non-existent.com/target.html"`.

```
      41|         writer.write("<html><title>Served by the proxy</title></html>");
      42|       }
      43|     });
      44|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setProxy("localhost:" + server.PORT));
      45|     Page page = context.newPage();
>>>   46|     page.navigate("http://non-existent.com/target.html");
      47|     assertEquals("Served by the proxy", page.title());
      48|     context.close();
      49|   }
      50|
      51|   @Test
```

**verdict:**

---

## 14. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextProxy.java:62

**Message:** Hardcoded URL: `.navigate("http://non-existent.com/target.html"`.

```
      57|       }
      58|     });
      59|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setProxy(
      60|       new Proxy("localhost:" + server.PORT)));
      61|     Page page = context.newPage();
>>>   62|     page.navigate("http://non-existent.com/target.html");
      63|     page.navigate("http://non-existent-2.com/target.html");
      64|     assertEquals("Served by the proxy", page.title());
      65|     context.close();
      66|   }
      67|
```

**verdict:**

---

## 15. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextProxy.java:63

**Message:** Hardcoded URL: `.navigate("http://non-existent-2.com/target.html"`.

```
      58|     });
      59|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setProxy(
      60|       new Proxy("localhost:" + server.PORT)));
      61|     Page page = context.newPage();
      62|     page.navigate("http://non-existent.com/target.html");
>>>   63|     page.navigate("http://non-existent-2.com/target.html");
      64|     assertEquals("Served by the proxy", page.title());
      65|     context.close();
      66|   }
      67|
      68|   @Test
```

**verdict:**

---

## 16. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextProxy.java:80

**Message:** Hardcoded URL: `.navigate("http://non-existent.com/target.html"`.

```
      75|     });
      76|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setProxy(
      77|       new Proxy("localhost:" + server.PORT)));
      78|
      79|     Page page = context.newPage();
>>>   80|     page.navigate("http://non-existent.com/target.html");
      81|     assertEquals("Served by the proxy", page.title());
      82|
      83|     Page page2 = context.newPage();
      84|     page2.navigate("http://non-existent.com/target.html");
      85|     assertEquals("Served by the proxy", page2.title());
```

**verdict:**

---

## 17. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextProxy.java:84

**Message:** Hardcoded URL: `.navigate("http://non-existent.com/target.html"`.

```
      79|     Page page = context.newPage();
      80|     page.navigate("http://non-existent.com/target.html");
      81|     assertEquals("Served by the proxy", page.title());
      82|
      83|     Page page2 = context.newPage();
>>>   84|     page2.navigate("http://non-existent.com/target.html");
      85|     assertEquals("Served by the proxy", page2.title());
      86|
      87|     context.close();
      88|   }
      89|
```

**verdict:**

---

## 18. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextProxy.java:102

**Message:** Hardcoded URL: `.navigate("http://non-existent.com/target.html"`.

```
      97|     });
      98|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setProxy(
      99|       new Proxy("127.0.0.1:" + server.PORT)));
     100|
     101|     Page page = context.newPage();
>>>  102|     page.navigate("http://non-existent.com/target.html");
     103|     assertEquals("Served by the proxy", page.title());
     104|     context.close();
     105|   }
     106|
     107|   @Test
```

**verdict:**

---

## 19. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextProxy.java:127

**Message:** Hardcoded URL: `.navigate("http://non-existent.com/target.html"`.

```
     122|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setProxy(
     123|       new Proxy("localhost:" + server.PORT)
     124|       .setUsername("user")
     125|       .setPassword("secret")));
     126|     Page page = context.newPage();
>>>  127|     page.navigate("http://non-existent.com/target.html");
     128|     assertEquals("Basic " + Base64.getEncoder().encodeToString("user:secret".getBytes()), page.title());
     129|     context.close();
     130|   }
     131|
     132|   static boolean isChromiumHeaded() {
```

**verdict:**

---

## 20. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextProxy.java:155

**Message:** Hardcoded URL: `.navigate("http://0.non.existent.domain.for.the.test/target.`.

```
     150|       // @see https://gist.github.com/CollinChaffin/24f6c9652efb3d6d5ef2f5502720ef00
     151|       .setBypass("1.non.existent.domain.for.the.test, 2.non.existent.domain.for.the.test, .another.test")));
     152|
     153|     {
     154|       Page page = context.newPage();
>>>  155|       page.navigate("http://0.non.existent.domain.for.the.test/target.html");
     156|       assertEquals("Served by the proxy", page.title());
     157|       page.close();
     158|     }
     159|     {
     160|       Page page = context.newPage();
```

**verdict:**

---
