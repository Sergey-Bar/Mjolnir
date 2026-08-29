# QA-PW-103 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-mcp — tests/click.spec.ts:35

**Message:** `goto('${server.PREFIX}')` without an explicit timeout.

```
      30|
      31|   expect(await client.callTool({
      32|     name: 'browser_navigate',
      33|     arguments: { url: server.PREFIX },
      34|   })).toHaveResponse({
>>>   35|     code: `await page.goto('${server.PREFIX}');`,
      36|     snapshot: expect.stringContaining(`- button \"Submit\" [ref=e2]`),
      37|   });
      38|
      39|   expect(await client.callTool({
      40|     name: 'browser_click',
```

**verdict:**

---

## 2. microsoft-playwright-mcp — tests/core.spec.ts:24

**Message:** `goto('${server.HELLO_WORLD}')` without an explicit timeout.

```
      19| test('browser_navigate', async ({ client, server }) => {
      20|   expect(await client.callTool({
      21|     name: 'browser_navigate',
      22|     arguments: { url: server.HELLO_WORLD },
      23|   })).toHaveResponse({
>>>   24|     code: `await page.goto('${server.HELLO_WORLD}');`,
      25|     snapshot: expect.stringContaining(`generic [active] [ref=e1]: Hello, world!`),
      26|   });
      27| });
      28|
```

**verdict:**

---

## 3. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextBaseUrl.java:82

**Message:** `waitForURL("/kek/index.html")` without an explicit timeout.

```
      77|
      78|   @Test
      79|   void shouldBeAbleToMatchAURLRelativeToItsGivenURLWithUrlMatcher(Browser browser, Server server) {
      80|     try (Page page = browser.newPage(new Browser.NewPageOptions().setBaseURL(server.PREFIX + "/foobar/"))) {
      81|       page.navigate("/kek/index.html");
>>>   82|       page.waitForURL("/kek/index.html");
      83|       assertEquals(server.PREFIX + "/kek/index.html", page.url());
      84|
      85|       page.route("./kek/index.html", route -> route.fulfill(new Route.FulfillOptions().setBody("base-url-matched-route")));
      86|       Request[] request = {null};
      87|       Response response = page.waitForResponse("./kek/index.html", () -> {
```

**verdict:**

---

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextEvents.java:267

**Message:** `waitForSelector("iframe")` without an explicit timeout.

```
     262|       "  const iframe = document.createElement('iframe');\n" +
     263|       "  iframe.id = 'x';\n" +
     264|       "  iframe.src = 'about:blank';\n" +
     265|       "  document.body.appendChild(iframe);\n" +
     266|       "}");
>>>  267|     page.waitForSelector("iframe");
     268|     Frame[] detached = { null };
     269|     context.onFrameDetached(f -> detached[0] = f);
     270|     page.evaluate("() => document.getElementById('x').remove()");
     271|     waitForCondition(() -> detached[0] != null);
     272|     assertEquals(page.mainFrame(), detached[0].parentFrame());
```

**verdict:**

---

## 5. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextHar.java:183

**Message:** `waitForURL("https://www.theverge.com/")` without an explicit timeout.

```
     178|     Path path = Paths.get("src/test/resources/har-redirect.har");
     179|     context.routeFromHAR(path);
     180|     Page page = context.newPage();
     181|     Response response = page.waitForNavigation(() -> {
     182|       page.navigate("https://theverge.com/");
>>>  183|       page.waitForURL("https://www.theverge.com/");
     184|     });
     185|     assertThat(page).hasURL("https://www.theverge.com/");
     186|     assertEquals("https://www.theverge.com/", response.request().url());
     187|     assertEquals("https://www.theverge.com/", page.evaluate("location.href"));
     188|   }
```

**verdict:**

---

## 6. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageWaitForUrl.java:34

**Message:** `waitForURL("**/grid.html")` without an explicit timeout.

```
      29| public class TestPageWaitForUrl extends TestBase {
      30|   @Test
      31|   void shouldWork() {
      32|     page.navigate(server.EMPTY_PAGE);
      33|     page.evaluate("url => window.location.href = url", server.PREFIX + "/grid.html");
>>>   34|     page.waitForURL("**/grid.html");
      35|   }
      36|
      37|   @Test
      38|   void shouldRespectTimeout() {
      39|     page.navigate(server.EMPTY_PAGE);
```

**verdict:**

---

## 7. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageWaitForUrl.java:81

**Message:** `waitForURL("**/*#foobar")` without an explicit timeout.

```
      76|   @Test
      77|   void shouldWorkWithClickingOnAnchorLinks() {
      78|     page.navigate(server.EMPTY_PAGE);
      79|     page.setContent("<a href='#foobar'>foobar</a>");
      80|     page.click("a");
>>>   81|     page.waitForURL("**/*#foobar");
      82|   }
      83|
      84|   @Test
      85|   void shouldWorkWithHistoryPushState() {
      86|     page.navigate(server.EMPTY_PAGE);
```

**verdict:**

---

## 8. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageWaitForUrl.java:92

**Message:** `waitForURL("**/wow.html")` without an explicit timeout.

```
      87|     page.setContent("<a onclick='javascript:pushState()'>SPA</a>\n" +
      88|       "<script>\n" +
      89|       "  function pushState() { history.pushState({}, '', 'wow.html') }\n" +
      90|       "</script>");
      91|     page.click("a");
>>>   92|     page.waitForURL("**/wow.html");
      93|     assertEquals(server.PREFIX + "/wow.html", page.url());
      94|   }
      95|
      96|   @Test
      97|   void shouldWorkWithHistoryReplaceState() {
```

**verdict:**

---

## 9. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageWaitForUrl.java:104

**Message:** `waitForURL("**/replaced.html")` without an explicit timeout.

```
      99|     page.setContent(" <a onclick='javascript:replaceState()'>SPA</a>\n" +
     100|       "<script>\n" +
     101|       "  function replaceState() { history.replaceState({}, '', '/replaced.html') }\n" +
     102|       "</script>");
     103|     page.click("a");
>>>  104|     page.waitForURL("**/replaced.html");
     105|     assertEquals(server.PREFIX + "/replaced.html", page.url());
     106|   }
     107|
     108|   @Test
     109|   void shouldWorkWithDOMHistoryBackHistoryForward() {
```

**verdict:**

---

## 10. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageWaitForUrl.java:122

**Message:** `waitForURL("**/first.html")` without an explicit timeout.

```
     117|       "  history.pushState({}, '', '/second.html');\n" +
     118|       "</script>");
     119|     assertEquals(server.PREFIX + "/second.html", page.url());
     120|
     121|     page.click("a#back");
>>>  122|     page.waitForURL("**/first.html");
     123|     assertEquals(server.PREFIX + "/first.html", page.url());
     124|
     125|     page.click("a#forward");
     126|     page.waitForURL("**/second.html");
     127|     assertEquals(server.PREFIX + "/second.html", page.url());
```

**verdict:**

---

## 11. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageWaitForUrl.java:126

**Message:** `waitForURL("**/second.html")` without an explicit timeout.

```
     121|     page.click("a#back");
     122|     page.waitForURL("**/first.html");
     123|     assertEquals(server.PREFIX + "/first.html", page.url());
     124|
     125|     page.click("a#forward");
>>>  126|     page.waitForURL("**/second.html");
     127|     assertEquals(server.PREFIX + "/second.html", page.url());
     128|   }
     129|
     130|   @Test
     131|   void shouldWorkOnFrame() {
```

**verdict:**

---

## 12. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageWaitForUrl.java:135

**Message:** `waitForURL("**/grid.html")` without an explicit timeout.

```
     130|   @Test
     131|   void shouldWorkOnFrame() {
     132|     page.navigate(server.PREFIX + "/frames/one-frame.html");
     133|     Frame frame = page.frames().get(1);
     134|     frame.evaluate("url => window.location.href = url", server.PREFIX + "/grid.html");
>>>  135|     frame.waitForURL("**/grid.html");
     136|   }
     137| }
     138|
```

**verdict:**

---

## 13. nextauthjs-next-auth — apps/dev/nextjs/tests/signin.spec.ts:5

**Message:** `goto("https://next-auth-example.vercel.app")` without an explicit timeout.

```
       1| import { test, expect } from "@playwright/test"
       2|
       3| test("Sign in with Auth0", async ({ page }) => {
       4|   // Go to NextAuth example app
>>>    5|   await page.goto("https://next-auth-example.vercel.app")
       6|
       7|   // Click 'Sign In'
       8|   await page.click("#__next > header > div > p > a")
       9|
      10|   // Auth0 Login Provider
```

**verdict:**

---

## 14. nextauthjs-next-auth — apps/dev/nextjs/tests/signin.spec.ts:33

**Message:** `goto(
    "https://next-auth-example.vercel.app/ap` without an explicit timeout.

```
      28|   //   path: "2-next-auth-redirect-result.png",
      29|   //   fullPage: false,
      30|   // })
      31|
      32|   // Check session object after successful login
>>>   33|   const response = await page.goto(
      34|     "https://next-auth-example.vercel.app/api/auth/session"
      35|   )
      36|   const session = await response?.json()
      37|   expect(session?.user?.email).toBe(process.env.AUTH0_USERNAME)
      38|   // TODO: Check whole object with .toEqual()
```

**verdict:**

---

## 15. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/credentials.spec.ts:6

**Message:** `goto("http://localhost:3000/auth/signin")` without an explicit timeout.

```
       1| import { test, expect } from "@playwright/test"
       2|
       3| test.describe("Credentials Provider", () => {
       4|   test("Signin / Signout", async ({ page }) => {
       5|     await test.step("should login", async () => {
>>>    6|       await page.goto("http://localhost:3000/auth/signin")
       7|       await page.getByLabel("Password").fill("password")
       8|       await page
       9|         .getByRole("button", { name: "Sign in with Credentials" })
      10|         .click()
      11|       const session = await page.locator("pre").textContent()
```

**verdict:**

---

## 16. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/keycloak.spec.ts:12

**Message:** `goto("http://localhost:3000/auth/signin")` without an explicit timeout.

```
       7|       !process.env.TEST_KEYCLOAK_PASSWORD
       8|     )
       9|       throw new TypeError("Missing TEST_KEYCLOAK_{USERNAME,PASSWORD}")
      10|
      11|     await test.step("should login", async () => {
>>>   12|       await page.goto("http://localhost:3000/auth/signin")
      13|       await page.getByText("Keycloak").click()
      14|       // Keycloak-hosted login form
      15|       await page
      16|         .getByLabel("Username or email")
      17|         .fill(process.env.TEST_KEYCLOAK_USERNAME!)
```

**verdict:**

---

## 17. vitejs-vite — playground/cli-module/**tests**/cli-module.spec.ts:14

**Message:** `goto(`http://localhost:${port}/`)` without an explicit timeout.

```
       9|   const onConsole = (msg) => {
      10|     logs.push(msg.text())
      11|   }
      12|   try {
      13|     page.on('console', onConsole)
>>>   14|     await page.goto(`http://localhost:${port}/`)
      15|     expect(await page.textContent('.app')).toBe(
      16|       'vite cli in "type":"module" package works!',
      17|     )
      18|     expect(
      19|       logs.some((msg) =>
```

**verdict:**

---

## 18. vitejs-vite — playground/cli/**tests**/cli.spec.ts:14

**Message:** `goto(`http://localhost:${port}/`)` without an explicit timeout.

```
       9|   const onConsole = (msg) => {
      10|     logs.push(msg.text())
      11|   }
      12|   try {
      13|     page.on('console', onConsole)
>>>   14|     await page.goto(`http://localhost:${port}/`)
      15|
      16|     expect(await page.textContent('.app')).toBe('vite cli works!')
      17|     expect(logs.some((msg) => msg.match('vite cli works!'))).toBe(true)
      18|   } finally {
      19|     page.off('console', onConsole)
```

**verdict:**

---

## 19. vitejs-vite — playground/css-dynamic-import/**tests**/css-dynamic-import.spec.ts:42

**Message:** `goto('about:blank')` without an explicit timeout.

```
      37|
      38|   try {
      39|     await page.goto(server.resolvedUrls.local[0])
      40|     await fn()
      41|   } finally {
>>>   42|     await page.goto('about:blank') // move to a different page to avoid auto-refresh after server start
      43|     await server.close()
      44|   }
      45| }
      46|
      47| async function getLinks() {
```

**verdict:**

---

## 20. vitejs-vite — playground/css/**tests**/css.spec.ts:9

**Message:** `waitForSelector('.inject-url-once-exit')` without an explicit timeout.

```
       4|
       5| // not included in tests.ts because the lightningcss variant does not use
       6| // the postcss pipeline
       7| test('postcss plugin that injects url() at OnceExit', async () => {
       8|   await page.goto(viteTestUrl)
>>>    9|   const imported = await page.waitForSelector('.inject-url-once-exit')
      10|   // url should be rebased against the injected source file
      11|   expect(await getBg(imported)).toMatch(
      12|     isBundled ? /base64/ : '/injected-source/injected-bg.png',
      13|   )
      14| })
```

**verdict:**

---
