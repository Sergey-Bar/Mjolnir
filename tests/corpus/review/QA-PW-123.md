# QA-PW-123 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — apps/dev/nextjs/tests/signin.spec.ts:5

**Message:** Hardcoded URL: `goto("https://next-auth-example.vercel.app"`.

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

**Message:** Hardcoded URL: `goto(
    "https://next-auth-example.vercel.app/api/auth/ses`.

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

## 3. puppeteer-puppeteer — test/src/console.test.ts:232

**Message:** Hardcoded URL: `goto(`http://domain1.test:${server.PORT}/empty.html``.

```
     227|     expect(handle.disposed).toBe(true);
     228|   });
     229|   it('should trigger correct Log', async () => {
     230|     const {page, server, isChrome} = await getTestState();
     231|
>>>  232|     await page.goto(`http://domain1.test:${server.PORT}/empty.html`);
     233|     const [message] = await Promise.all([
     234|       waitEvent(page, 'console'),
     235|       page.evaluate(async url => {
     236|         return await fetch(url).catch(() => {});
     237|       }, `http://domain2.test:${server.PORT}/empty.html`),
```

**verdict:**

---

## 4. puppeteer-puppeteer — test/src/oopif.test.ts:280

**Message:** Hardcoded URL: `goto(`http://domain1.test:${server.PORT}/main-frame.html``.

```
     275|     expect(page.frames()).toHaveLength(2);
     276|   });
     277|
     278|   it('should wait for inner OOPIFs', async () => {
     279|     const {server, page} = state;
>>>  280|     await page.goto(`http://domain1.test:${server.PORT}/main-frame.html`);
     281|     const frame2 = await page.waitForFrame(frame => {
     282|       return frame.url().endsWith('inner-frame2.html');
     283|     });
     284|     expect(await iframes(page)).toHaveLength(2);
     285|     expect(page.frames()).toHaveLength(3);
```

**verdict:**

---
