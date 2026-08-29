# QA-PW-123 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

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
