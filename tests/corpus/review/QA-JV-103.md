# QA-JV-103 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBeforeunload.java:26

**Message:** Test `shouldBeAbleToNavigateAwayFromPageWithBeforeunload` contains no assertions.

```
      21| import org.junit.jupiter.api.Test;
      22|
      23| @FixtureTest
      24| @UsePlaywright(TestOptionsFactories.BasicOptionsFactory.class)
      25| public class TestBeforeunload {
>>>   26|   @Test
      27|   void shouldBeAbleToNavigateAwayFromPageWithBeforeunload(Page page, Server server) {
      28|     page.navigate(server.PREFIX + "/beforeunload.html");
      29|     // We have to interact with a page so that "beforeunload" handlers
      30|     // fire.
      31|     page.click("body");
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextBasic.java:105

**Message:** Test `shouldPropagateDefaultViewportToThePage` contains no assertions.

```
     100|     context2.close();
     101|
     102|     assertEquals(0, browser.contexts().size());
     103|   }
     104|
>>>  105|   @Test
     106|   void shouldPropagateDefaultViewportToThePage(Browser browser) {
     107|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setViewportSize(456, 789));
     108|     Page page = context.newPage();
     109|     verifyViewport(page, 456, 789);
     110|     context.close();
```

**verdict:**

---

## 3. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextBasic.java:142

**Message:** Test `closeShouldWorkForEmptyContext` contains no assertions.

```
     137|       browser.newContext(new Browser.NewContextOptions().setIsMobile(true).setViewportSize(null));
     138|     });
     139|     assertTrue(e.getMessage().contains("\"isMobile\" option is not supported with null \"viewport\""));
     140|   }
     141|
>>>  142|   @Test
     143|   void closeShouldWorkForEmptyContext(Browser browser) {
     144|     BrowserContext context = browser.newContext();
     145|     context.close();
     146|   }
     147|
```

**verdict:**

---

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextBasic.java:157

**Message:** Test `closeShouldBeCallableTwice` contains no assertions.

```
     152|       context.waitForPage(() -> context.close());
     153|     });
     154|     assertTrue(e.getMessage().contains("Target page, context or browser has been closed"), e.getMessage());
     155|   }
     156|
>>>  157|   @Test
     158|   void closeShouldBeCallableTwice(Browser browser) {
     159|     BrowserContext context = browser.newContext();
     160|     context.close();
     161|     context.close();
     162|     context.close();
```

**verdict:**

---

## 5. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextBasic.java:234

**Message:** Test `shouldBeAbleToNavigateAfterDisablingJavascript` contains no assertions.

```
     229|       assertEquals("forbidden", page.evaluate("something"));
     230|       context.close();
     231|     }
     232|   }
     233|
>>>  234|   @Test
     235|   void shouldBeAbleToNavigateAfterDisablingJavascript(Browser browser, Server server) {
     236|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setJavaScriptEnabled(false));
     237|     Page page = context.newPage();
     238|     page.navigate(server.EMPTY_PAGE);
     239|     context.close();
```

**verdict:**

---

## 6. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextCDPSession.java:117

**Message:** Test `shouldNotBreakPageClose` contains no assertions.

```
     112|       page.context().newCDPSession(page.frames().get(1));
     113|     });
     114|     assertTrue(exception.getMessage().contains("This frame does not have a separate CDP session, it is a part of the parent frame's session"));
     115|   }
     116|
>>>  117|   @Test
     118|   void shouldNotBreakPageClose() {
     119|     BrowserContext context = browser.newContext();
     120|     Page page = context.newPage();
     121|     CDPSession session = page.context().newCDPSession(page);
     122|     session.detach();
```

**verdict:**

---

## 7. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextFetch.java:730

**Message:** Test `shouldNotThrowWhenDataPassedForUnsupportedRequest` contains no assertions.

```
     725|     assertEquals(asList("unknown"), req.get().headers.get("content-type"));
     726|     String body = new String(req.get().postBody);
     727|     assertEquals(new Gson().toJson(data), body);
     728|   }
     729|
>>>  730|   @Test
     731|   void shouldNotThrowWhenDataPassedForUnsupportedRequest() {
     732|     context.request().fetch(server.EMPTY_PAGE, RequestOptions.create()
     733|       .setMethod("GET").setData("bar"));
     734|   }
     735|
```

**verdict:**

---

## 8. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextLocale.java:114

**Message:** Test `shouldWorkForMultiplePagesSharingSameProcess` contains no assertions.

```
     109|     Object result = popup.evaluate("window.initialNavigatorLanguage");
     110|     assertEquals("fr-FR", result);
     111|     context.close();
     112|   }
     113|
>>>  114|   @Test
     115|   void shouldWorkForMultiplePagesSharingSameProcess() {
     116|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setLocale("ru-RU"));
     117|     Page page = context.newPage();
     118|     page.navigate(server.EMPTY_PAGE);
     119|     Page popup = page.waitForPopup(() -> page.evaluate(
```

**verdict:**

---

## 9. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextProxy.java:191

**Message:** Test `doesLaunchWithoutAPort` contains no assertions.

```
     186|
     187|   void shouldUseSocksProxyInSecondPage() {
     188|     // TODO: implement socks server
     189|   }
     190|
>>>  191|   @Test
     192|   void doesLaunchWithoutAPort() {
     193|     BrowserContext context = browser.newContext(new Browser.NewContextOptions().setProxy(
     194|       new Proxy("http://localhost")));
     195|     context.close();
     196|   }
```

**verdict:**

---

## 10. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextViewport.java:28

**Message:** Test `shouldGetTheProperDefaultViewPortSize` contains no assertions.

```
      23| import static com.microsoft.playwright.Utils.verifyViewport;
      24| import static org.junit.jupiter.api.Assertions.*;
      25|
      26| public class TestBrowserContextViewport extends TestBase {
      27|
>>>   28|   @Test
      29|   void shouldGetTheProperDefaultViewPortSize() {
      30|     verifyViewport(page, 1280, 720);
      31|   }
      32|
      33|   @Test
```

**verdict:**

---

## 11. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextViewport.java:33

**Message:** Test `shouldSetTheProperViewportSize` contains no assertions.

```
      28|   @Test
      29|   void shouldGetTheProperDefaultViewPortSize() {
      30|     verifyViewport(page, 1280, 720);
      31|   }
      32|
>>>   33|   @Test
      34|   void shouldSetTheProperViewportSize() {
      35|     verifyViewport(page, 1280, 720);
      36|     page.setViewportSize(123, 456);
      37|     verifyViewport(page,123, 456);
      38|   }
```

**verdict:**

---

## 12. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestClick.java:236

**Message:** Test `shouldNotHangWithTouchEnabledViewports` contains no assertions.

```
     231|       page.evaluate("() => window['result'].events"));
     232|     page.click("label[for='agree']");
     233|     assertFalse((Boolean) page.evaluate("() => window['result'].check"));
     234|   }
     235|
>>>  236|   @Test
     237|   void shouldNotHangWithTouchEnabledViewports() {
     238|     // @see https://github.com/GoogleChrome/puppeteer/issues/161
     239|     BrowserContext context = browser.newContext(new Browser.NewContextOptions()
     240|       .setViewportSize(375, 667)
     241|       .setHasTouch(true));
```

**verdict:**

---

## 13. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestClick.java:300

**Message:** Test `shouldClickLinksWhichCauseNavigation` contains no assertions.

```
     295|     page.navigate(server.PREFIX + "/input/scrollable.html");
     296|     page.click("#button-8", new Page.ClickOptions().setButton(RIGHT));
     297|     assertEquals("context menu", page.evaluate("() => document.querySelector('#button-8').textContent"));
     298|   }
     299|
>>>  300|   @Test
     301|   void shouldClickLinksWhichCauseNavigation() {
     302|     // @see https://github.com/GoogleChrome/puppeteer/issues/206
     303|     page.setContent("<a href=" + server.EMPTY_PAGE + ">empty.html</a>");
     304|     // This should not hang.
     305|     page.click("a");
```

**verdict:**

---

## 14. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestDefaultBrowserContext2.java:195

**Message:** Test `shouldWorkWithIgnoreDefaultArgs` contains no assertions.

```
     190|       browserType.launchPersistentContext(userDataDir, options);
     191|     });
     192|     assertTrue(e.getMessage().contains("can not specify page"));
     193|   }
     194|
>>>  195|   @Test
     196|   void shouldWorkWithIgnoreDefaultArgs() {
     197|     // Ignore arguments by name.
     198|     BrowserType.LaunchOptions options = new BrowserType.LaunchOptions().setIgnoreDefaultArgs(asList("foo"));
     199|     Browser browser = browserType.launch(options);
     200|     Page page = browser.newPage();
```

**verdict:**

---

## 15. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleWaitForElementState.java:33

**Message:** Test `shouldWaitForVisible` contains no assertions.

```
      28|     for (int i = 0; i < 5; i++) {
      29|       page.evaluate("() => new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f)))");
      30|     }
      31|   }
      32|
>>>   33|   @Test
      34|   void shouldWaitForVisible() {
      35|     page.setContent("<div style='display:none'>content</div>");
      36|     ElementHandle div = page.querySelector("div");
      37|     giveItAChanceToResolve(page);
      38|     div.evaluate("div => div.style.display = 'block'");
```

**verdict:**

---

## 16. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleWaitForElementState.java:42

**Message:** Test `shouldWaitForAlreadyVisible` contains no assertions.

```
      37|     giveItAChanceToResolve(page);
      38|     div.evaluate("div => div.style.display = 'block'");
      39|     div.waitForElementState(VISIBLE);
      40|   }
      41|
>>>   42|   @Test
      43|   void shouldWaitForAlreadyVisible() {
      44|     page.setContent("<div>content</div>");
      45|     ElementHandle div = page.querySelector("div");
      46|     div.waitForElementState(VISIBLE);
      47|   }
```

**verdict:**

---

## 17. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleWaitForElementState.java:68

**Message:** Test `shouldWaitForHidden` contains no assertions.

```
      63|     div.evaluate("div => div.remove()");
      64|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> div.waitForElementState(VISIBLE));
      65|     assertTrue(e.getMessage().contains("Element is not attached to the DOM"));
      66|   }
      67|
>>>   68|   @Test
      69|   void shouldWaitForHidden() {
      70|     page.setContent("<div>content</div>");
      71|     ElementHandle div = page.querySelector("div");
      72|     giveItAChanceToResolve(page);
      73|     div.evaluate("div => div.style.display = 'none'");
```

**verdict:**

---

## 18. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleWaitForElementState.java:77

**Message:** Test `shouldWaitForAlreadyHidden` contains no assertions.

```
      72|     giveItAChanceToResolve(page);
      73|     div.evaluate("div => div.style.display = 'none'");
      74|     div.waitForElementState(HIDDEN);
      75|   }
      76|
>>>   77|   @Test
      78|   void shouldWaitForAlreadyHidden() {
      79|     page.setContent("<div></div>");
      80|     ElementHandle div = page.querySelector("div");
      81|     div.waitForElementState(HIDDEN);
      82|   }
```

**verdict:**

---

## 19. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleWaitForElementState.java:84

**Message:** Test `shouldWaitForHiddenWhenDetached` contains no assertions.

```
      79|     page.setContent("<div></div>");
      80|     ElementHandle div = page.querySelector("div");
      81|     div.waitForElementState(HIDDEN);
      82|   }
      83|
>>>   84|   @Test
      85|   void shouldWaitForHiddenWhenDetached() {
      86|     page.setContent("<div>content</div>");
      87|     ElementHandle div = page.querySelector("div");
      88|     giveItAChanceToResolve(page);
      89|     div.evaluate("div => div.remove()");
```

**verdict:**

---

## 20. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleWaitForElementState.java:93

**Message:** Test `shouldWaitForEnabledButton` contains no assertions.

```
      88|     giveItAChanceToResolve(page);
      89|     div.evaluate("div => div.remove()");
      90|     div.waitForElementState(HIDDEN);
      91|   }
      92|
>>>   93|   @Test
      94|   void shouldWaitForEnabledButton() {
      95|     page.setContent("<button disabled><span>Target</span></button>");
      96|     ElementHandle span = page.querySelector("text=Target");
      97|     giveItAChanceToResolve(page);
      98|     span.evaluate("span => span.parentElement.disabled = false");
```

**verdict:**

---
