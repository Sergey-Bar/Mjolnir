# QA-PW-101 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextAddCookies.java:349

**Message:** `waitForTimeout()` hard sleep.

```
     344|       "  iframe.onload = fulfill;\n" +
     345|       "  iframe.src = src;\n" +
     346|       "  return promise;\n" +
     347|       "}", server.CROSS_PROCESS_PREFIX + "/grid.html");
     348|     page.frames().get(1).evaluate("document.cookie = 'username=John Doe'");
>>>  349|     page.waitForTimeout(2000);
     350|     boolean allowsThirdParty = isFirefox();
     351|     List<Cookie> cookies = context.cookies(server.CROSS_PROCESS_PREFIX + "/grid.html");
     352|     if (allowsThirdParty) {
     353|       assertJsonEquals("[{\n" +
     354|         "  'domain': '127.0.0.1',\n" +
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:501

**Message:** `waitForTimeout()` hard sleep.

```
     496|       Page page2 = context2.newPage();
     497|       page2.navigate(server.EMPTY_PAGE);
     498|       page2.evaluate("url => {\n" +
     499|         "  fetch(url).catch(e => 'cancelled').then(r => { window.result = r; })\n" +
     500|         "}", server.PREFIX + "/x");
>>>  501|       page2.waitForTimeout(1000);
     502|       assertNull(page.evaluate("window.result"));
     503|     }
     504|   }
     505|
     506|   private void setJsonRoute(String path, String json) {
```

**verdict:**

---

## 3. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextRoute.java:160

**Message:** `waitForTimeout()` hard sleep.

```
     155|       "              body: 'original',\n" +
     156|       "            });\n" +
     157|       "        })()\n" +
     158|       "      </script>");
     159|     while (!routeHandled[0]) {
>>>  160|       page.waitForTimeout(100);
     161|     }
     162|     byte[] body = req.get().postBody;
     163|     assertEquals(0, body.length);
     164|   }
     165|
```

**verdict:**

---

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextRoute.java:291

**Message:** `waitForTimeout()` hard sleep.

```
     286|   @Test
     287|   void shouldFallBackAsync() {
     288|     List<Integer> intercepted = new ArrayList<>();
     289|     context.route("**/empty.html", route -> {
     290|       intercepted.add(1);
>>>  291|       page.waitForTimeout(50);
     292|       route.fallback();
     293|     });
     294|     context.route("**/empty.html", route -> {
     295|       intercepted.add(2);
     296|       page.waitForTimeout(100);
```

**verdict:**

---

## 5. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextRoute.java:296

**Message:** `waitForTimeout()` hard sleep.

```
     291|       page.waitForTimeout(50);
     292|       route.fallback();
     293|     });
     294|     context.route("**/empty.html", route -> {
     295|       intercepted.add(2);
>>>  296|       page.waitForTimeout(100);
     297|       route.fallback();
     298|     });
     299|     context.route("**/empty.html", route -> {
     300|       intercepted.add(3);
     301|       page.waitForTimeout(150);
```

**verdict:**

---

## 6. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextRoute.java:301

**Message:** `waitForTimeout()` hard sleep.

```
     296|       page.waitForTimeout(100);
     297|       route.fallback();
     298|     });
     299|     context.route("**/empty.html", route -> {
     300|       intercepted.add(3);
>>>  301|       page.waitForTimeout(150);
     302|       route.fallback();
     303|     });
     304|     page.navigate(server.EMPTY_PAGE);
     305|     assertEquals(asList(3, 2, 1), intercepted);
     306|   }
```

**verdict:**

---

## 7. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserTypeConnect.java:235

**Message:** `waitForTimeout()` hard sleep.

```
     230|     boolean[] disconnected = {false};
     231|     remote.onDisconnected(b -> disconnected[0] = true);
     232|     server.kill();
     233|     while (!disconnected[0]) {
     234|       try {
>>>  235|         page.waitForTimeout(10);
     236|       } catch (PlaywrightException e) {
     237|       }
     238|     }
     239|     assertFalse(remote.isConnected());
     240|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.evaluate("1 + 1"));
```

**verdict:**

---

## 8. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserTypeConnect.java:256

**Message:** `waitForTimeout()` hard sleep.

```
     251|     boolean[] disconnected = {false};
     252|     browser.onDisconnected(browser1 -> disconnected[0] = true);
     253|     server.kill();
     254|     while (!disconnected[0]) {
     255|       try {
>>>  256|         page.waitForTimeout(10);
     257|       } catch (PlaywrightException e) {
     258|       }
     259|     }
     260|     assertFalse(browser.isConnected());
     261|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.waitForNavigation(() -> {}));
```

**verdict:**

---

## 9. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserTypeConnect.java:296

**Message:** `waitForTimeout()` hard sleep.

```
     291|     context.onClose(c -> events.add("context"));
     292|     server.kill();
     293|
     294|     while (!events.contains("context")) {
     295|       try {
>>>  296|         page.waitForTimeout(10);
     297|       } catch (PlaywrightException e) {
     298|       }
     299|     }
     300|     assertEquals(Arrays.asList("page", "context"), events);
     301|   }
```

**verdict:**

---

## 10. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserTypeConnect.java:353

**Message:** `waitForTimeout()` hard sleep.

```
     348|     Page page = browser.newPage();
     349|
     350|     remoteServer.kill();
     351|     while (browser.isConnected()) {
     352|       try {
>>>  353|         page.waitForTimeout(10);
     354|       } catch (PlaywrightException e) {
     355|       }
     356|     }
     357|     browser.close();
     358|   }
```

**verdict:**

---

## 11. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserTypeConnect.java:367

**Message:** `waitForTimeout()` hard sleep.

```
     362|     Path videosPath = tempDir.resolve("videosPath");
     363|     BrowserContext context = browser.newContext(new Browser.NewContextOptions()
     364|       .setRecordVideoDir(videosPath).setRecordVideoSize(320,  240));
     365|     Page page = context.newPage();
     366|     page.evaluate("() => document.body.style.backgroundColor = 'red'");
>>>  367|     page.waitForTimeout(1000);
     368|     context.close();
     369|     Path savedAsPath = tempDir.resolve("my-video.webm");
     370|     page.video().saveAs(savedAsPath);
     371|     assertTrue(Files.exists(savedAsPath));
     372|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.video().path());
```

**verdict:**

---

## 12. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestDialog.java:109

**Message:** `waitForTimeout()` hard sleep.

```
     104|     page.evaluate("() => {\n" +
     105|       "    setTimeout(() => alert('hello'), 0);\n" +
     106|       "}");
     107|     Instant start = Instant.now();
     108|     while (!didShowDialog[0]) {
>>>  109|       page.waitForTimeout(100);
     110|       assertTrue(Duration.between(start, Instant.now()).getSeconds() < 30, "Timed out");
     111|     }
     112|     context.close();
     113|   }
     114| }
```

**verdict:**

---

## 13. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestDownload.java:291

**Message:** `waitForTimeout()` hard sleep.

```
     286|     Download[] download = {null};
     287|     page.onDownload(d -> download[0] = d);
     288|     page.click("a");
     289|     Instant start = Instant.now();
     290|     while (download[0] == null) {
>>>  291|       page.waitForTimeout(100);
     292|       assertTrue(Duration.between(start, Instant.now()).getSeconds() < 30, "Timed out");
     293|     }
     294|     Path path = download[0].path();
     295|     assertTrue(Files.exists(path));
     296|     byte[] bytes = readAllBytes(path);
```

**verdict:**

---

## 14. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestDownload.java:311

**Message:** `waitForTimeout()` hard sleep.

```
     306|     page.onDownload(d -> download[0] = d);
     307|     page.navigate(server.PREFIX + "/download-blob.html");
     308|     page.click("a");
     309|     Instant start = Instant.now();
     310|     while (download[0] == null) {
>>>  311|       page.waitForTimeout(100);
     312|       assertTrue(Duration.between(start, Instant.now()).getSeconds() < 1, "Timed out");
     313|     }
     314|     Path path = download[0].path();
     315|     assertTrue(Files.exists(path));
     316|     byte[] bytes = readAllBytes(path);
```

**verdict:**

---

## 15. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageBasic.java:83

**Message:** `waitForTimeout()` hard sleep.

```
      78|     newPage.close(new Page.CloseOptions().setRunBeforeUnload(true));
      79|     for (int i = 0; i < 300; i++) {
      80|       if (didShowDialog[0]) {
      81|         break;
      82|       }
>>>   83|       page.waitForTimeout(100);
      84|     }
      85|     assertTrue(didShowDialog[0]);
      86|   }
      87|
      88|   @Test
```

**verdict:**

---

## 16. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageClock.java:289

**Message:** `waitForTimeout()` hard sleep.

```
     284|       try (Writer writer = new OutputStreamWriter(exchange.getResponseBody())) {
     285|         writer.write("<script>window.time = Date.now()</script>");
     286|       }
     287|     });
     288|     page.navigate(server.EMPTY_PAGE);
>>>  289|     page.waitForTimeout(2000);
     290|     Page popup = page.waitForPopup(() -> {
     291|       page.evaluate("url => window.open(url)", server.PREFIX + "/popup.html");
     292|     });
     293|     popup.waitForURL(server.PREFIX + "/popup.html");
     294|     Double popupTime = (Double) popup.evaluate("time");
```

**verdict:**

---

## 17. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageClock.java:310

**Message:** `waitForTimeout()` hard sleep.

```
     305|       }
     306|     });
     307|     page.clock().install(new Clock.InstallOptions().setTime(0));
     308|     page.clock().pauseAt(1000);
     309|     page.navigate(server.EMPTY_PAGE);
>>>  310|     page.waitForTimeout(2000);
     311|     Page popup = page.waitForPopup(() -> {
     312|       page.evaluate("url => window.open(url)", server.PREFIX + "/popup.html");
     313|     });
     314|     popup.waitForURL(server.PREFIX + "/popup.html");
     315|     Object popupTime = popup.evaluate("time");
```

**verdict:**

---

## 18. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageClock.java:357

**Message:** `waitForTimeout()` hard sleep.

```
     352|
     353|   @Test
     354|   void whileRunningShouldProgressTime(Page page) {
     355|     page.clock().install(new Clock.InstallOptions().setTime(0));
     356|     page.navigate("data:text/html,");
>>>  357|     page.waitForTimeout(1000);
     358|     int now = (int) page.evaluate("() => Date.now()");
     359|     assertTrue(now >= 1000 && now <= 2000);
     360|   }
     361|
     362|   @Test
```

**verdict:**

---

## 19. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageClock.java:395

**Message:** `waitForTimeout()` hard sleep.

```
     390|   void whileRunningShouldPause(Page page) {
     391|     page.clock().install(new Clock.InstallOptions().setTime(0));
     392|     page.navigate("data:text/html,");
     393|     page.clock().pauseAt(1000);
     394|     // Internally wait to make sure the clock is paused and not running.
>>>  395|     page.waitForTimeout(1111);
     396|     int now = (int) page.evaluate("() => Date.now()");
     397|     assertTrue(now >= 0 && now <= 1000);
     398|   }
     399|
     400|   @Test
```

**verdict:**

---

## 20. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageDialog.java:82

**Message:** `waitForTimeout()` hard sleep.

```
      77|     Page page = context.newPage();
      78|     boolean[] didShowDialog = {false};
      79|     page.onDialog(dialog -> didShowDialog[0] = true);
      80|     page.evaluate("() => setTimeout(() => alert('hello'), 0)");
      81|     while (!didShowDialog[0]) {
>>>   82|       page.waitForTimeout(100);
      83|     }
      84|   }
      85|
      86|   @Test
      87|   void shouldHandleMultipleAlerts() {
```

**verdict:**

---
