# QA-PW-103 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — apps/dev/nextjs/tests/signin.spec.ts:5

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

## 2. nextauthjs-next-auth — apps/dev/nextjs/tests/signin.spec.ts:33

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

## 3. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/credentials.spec.ts:6

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

## 4. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/keycloak.spec.ts:12

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

## 5. vitejs-vite — playground/cli-module/**tests**/cli-module.spec.ts:14

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

## 6. vitejs-vite — playground/cli/**tests**/cli.spec.ts:14

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

## 7. vitejs-vite — playground/css-dynamic-import/**tests**/css-dynamic-import.spec.ts:42

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

## 8. vitejs-vite — playground/css/**tests**/css.spec.ts:9

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

## 9. vitejs-vite — playground/css/**tests**/postcss-plugins-different-dir/css-postcss-plugins-different-dir.spec.ts:23

**Message:** `goto(`http://localhost:${port}`)` without an explicit timeout.

```
      18|       target: 'esnext',
      19|     },
      20|   })
      21|   await server.listen()
      22|   try {
>>>   23|     await page.goto(`http://localhost:${port}`)
      24|     const tailwindStyle = page.locator('#tailwind-style')
      25|     expect(await getBgColor(tailwindStyle)).toBe('oklch(0.936 0.032 17.717)')
      26|     expect(await getColor(tailwindStyle)).toBe('rgb(136, 136, 136)')
      27|   } finally {
      28|     await server.close()
```

**verdict:**

---

## 10. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:535

**Message:** `goto(`${viteTestUrl}/${testDir}/`)` without an explicit timeout.

```
     530|
     531|       let dep = 'dep0'
     532|
     533|       beforeAll(async () => {
     534|         await untilBrowserLogAfter(
>>>  535|           () => page.goto(`${viteTestUrl}/${testDir}/`),
     536|           [CONNECTED, />>>>>>/],
     537|           (logs) => {
     538|             expect(logs).toContain(`<<<<<< A0 B0 D0 ; ${dep}`)
     539|             expect(logs).toContain('>>>>>> A0 D0')
     540|           },
```

**verdict:**

---

## 11. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:671

**Message:** `goto(`${viteTestUrl}/${testDir}/`)` without an explicit timeout.

```
     666|       const a = 'A0'
     667|       let dep = 'dep0'
     668|
     669|       beforeAll(async () => {
     670|         await untilBrowserLogAfter(
>>>  671|           () => page.goto(`${viteTestUrl}/${testDir}/`),
     672|           [CONNECTED, />>>>>>/],
     673|           (logs) => {
     674|             expect(logs).toContain(`<<< named: ${a} ; ${dep}`)
     675|             expect(logs).toContain(`<<< default: def0`)
     676|             expect(logs).toContain(`>>>>>> ${a} def0`)
```

**verdict:**

---

## 12. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:734

**Message:** `goto(`${viteTestUrl}/${testDir}/`)` without an explicit timeout.

```
     729|     test('accepts itself when imported for side effects only (no bindings imported)', async () => {
     730|       const testDir = baseDir + '/side-effects'
     731|       const file = 'side-effects.ts'
     732|
     733|       await untilBrowserLogAfter(
>>>  734|         () => page.goto(`${viteTestUrl}/${testDir}/`),
     735|         [CONNECTED, />>>/],
     736|         (logs) => {
     737|           expect(logs).toContain('>>> side FX')
     738|         },
     739|       )
```

**verdict:**

---

## 13. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:766

**Message:** `goto(`${viteTestUrl}/${testDir}/`)` without an explicit timeout.

```
     761|         const fileName = 'unused.ts'
     762|         const file = `${testDir}/${fileName}`
     763|         const url = '/' + file
     764|
     765|         await untilBrowserLogAfter(
>>>  766|           () => page.goto(`${viteTestUrl}/${testDir}/`),
     767|           [CONNECTED, '-- unused --'],
     768|           (logs) => {
     769|             expect(logs).toContain('-- unused --')
     770|           },
     771|         )
```

**verdict:**

---

## 14. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:792

**Message:** `goto(`${viteTestUrl}/${testDir}/`)` without an explicit timeout.

```
     787|       test("doesn't accept itself if any of its exports is imported", async () => {
     788|         const fileName = 'used.ts'
     789|         const file = `${testDir}/${fileName}`
     790|
     791|         await untilBrowserLogAfter(
>>>  792|           () => page.goto(`${viteTestUrl}/${testDir}/`),
     793|           [CONNECTED, '-- used --'],
     794|           (logs) => {
     795|             expect(logs).toContain('-- used --')
     796|             expect(logs).toContain('used:foo0')
     797|           },
```

**verdict:**

---

## 15. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:830

**Message:** `goto(`${viteTestUrl}/${testDir}/`)` without an explicit timeout.

```
     825|           const fileName = 'deps-all-accepted.ts'
     826|           const file = `${testDir}/${fileName}`
     827|           const url = '/' + file
     828|
     829|           await untilBrowserLogAfter(
>>>  830|             () => page.goto(`${viteTestUrl}/${testDir}/`),
     831|             [CONNECTED, '>>> ready <<<'],
     832|             (logs) => {
     833|               expect(logs).toContain('loaded:all:a0b0c0default0')
     834|               expect(logs).toContain('all >>>>>> a0, b0, c0')
     835|             },
```

**verdict:**

---

## 16. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:870

**Message:** `goto(`${viteTestUrl}/${testDir}/`)` without an explicit timeout.

```
     865|         it("doesn't accept itself if one export is not accepted", async () => {
     866|           const fileName = 'deps-some-accepted.ts'
     867|           const file = `${testDir}/${fileName}`
     868|
     869|           await untilBrowserLogAfter(
>>>  870|             () => page.goto(`${viteTestUrl}/${testDir}/`),
     871|             [CONNECTED, '>>> ready <<<'],
     872|             (logs) => {
     873|               expect(logs).toContain('loaded:some:a0b0c0default0')
     874|               expect(logs).toContain('some >>>>>> a0, b0, c0')
     875|             },
```

**verdict:**

---

## 17. vitejs-vite — playground/html/**tests**/html.spec.ts:292

**Message:** `waitForSelector('vite-error-overlay')` without an explicit timeout.

```
     287| describe.runIf(!isBundled)('invalid', () => {
     288|   test('should be 500 with overlay', async () => {
     289|     const response = await page.goto(viteTestUrl + '/invalid.html')
     290|     expect(response.status()).toBe(500)
     291|
>>>  292|     const errorOverlay = await page.waitForSelector('vite-error-overlay')
     293|     expect(errorOverlay).toBeTruthy()
     294|
     295|     const message = await errorOverlay.$$eval('.message-body', (m) => {
     296|       return m[0].innerHTML
     297|     })
```

**verdict:**

---

## 18. vitejs-vite — playground/html/**tests**/html.spec.ts:303

**Message:** `waitForSelector('vite-error-overlay')` without an explicit timeout.

```
     298|     expect(message).toContain('Unable to parse HTML')
     299|   })
     300|
     301|   test('should close overlay when clicked away', async () => {
     302|     await page.goto(viteTestUrl + '/invalidClick.html')
>>>  303|     const errorOverlay = await page.waitForSelector('vite-error-overlay')
     304|     expect(errorOverlay).toBeTruthy()
     305|
     306|     await page.click('html')
     307|     const isVisibleOverlay = await errorOverlay.isVisible()
     308|     expect(isVisibleOverlay).toBeFalsy()
```

**verdict:**

---

## 19. vitejs-vite — playground/html/**tests**/html.spec.ts:313

**Message:** `waitForSelector('vite-error-overlay')` without an explicit timeout.

```
     308|     expect(isVisibleOverlay).toBeFalsy()
     309|   })
     310|
     311|   test('should close overlay when escape key is pressed', async () => {
     312|     await page.goto(viteTestUrl + '/invalidEscape.html')
>>>  313|     const errorOverlay = await page.waitForSelector('vite-error-overlay')
     314|     expect(errorOverlay).toBeTruthy()
     315|
     316|     await page.keyboard.press('Escape')
     317|     const isVisibleOverlay = await errorOverlay.isVisible()
     318|     expect(isVisibleOverlay).toBeFalsy()
```

**verdict:**

---

## 20. vitejs-vite — playground/html/**tests**/html.spec.ts:324

**Message:** `waitForSelector('vite-error-overlay')` without an explicit timeout.

```
     319|   })
     320|
     321|   test('stack is updated', async () => {
     322|     await page.goto(viteTestUrl + '/invalid.html')
     323|
>>>  324|     const errorOverlay = await page.waitForSelector('vite-error-overlay')
     325|     const hiddenPromise = errorOverlay.waitForElementState('hidden')
     326|     await page.keyboard.press('Escape')
     327|     await hiddenPromise
     328|
     329|     viteServer.environments.client.hot.send({
```

**verdict:**

---
