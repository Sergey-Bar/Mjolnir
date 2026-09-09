# QA-PW-116 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PW-116/specref-a-v1/a.spec.ts:5

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| // This suite relies on the committed auth state; nothing in this file
       4| // or its config rotates it.
>>>    5| test.use({ storageState: ".auth/a.json" });
       6|
       7| test("a page renders authenticated", async ({ page }) => {
       8|   await page.goto("/a");
       9|   await expect(page.locator("main")).toBeVisible();
      10| });
```

**verdict:**

---

## 2. positive-fixtures — QA-PW-116/specref-d-a1/d.spec.ts:5

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| // This suite relies on the committed auth state; nothing in this file
       4| // or its config rotates it.
>>>    5| test.use({ storageState: ".auth/d.json" });
       6|
       7| test("d page renders authenticated", async ({ page }) => {
       8|   await page.goto("/d");
       9|   await expect(page.locator("main")).toBeVisible();
      10| });
```

**verdict:**

---

## 3. positive-fixtures — QA-PW-116/specref-e-r1/e.spec.ts:5

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| // This suite relies on the committed auth state; nothing in this file
       4| // or its config rotates it.
>>>    5| test.use({ storageState: ".auth/e.json" });
       6|
       7| test("e page renders authenticated", async ({ page }) => {
       8|   await page.goto("/e");
       9|   await expect(page.locator("main")).toBeVisible();
      10| });
```

**verdict:**

---

## 4. positive-fixtures — QA-PW-116/specref-e-s1/e.spec.ts:5

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| // This suite relies on the committed auth state; nothing in this file
       4| // or its config rotates it.
>>>    5| test.use({ storageState: ".auth/e.json" });
       6|
       7| test("e page renders authenticated", async ({ page }) => {
       8|   await page.goto("/e");
       9|   await expect(page.locator("main")).toBeVisible();
      10| });
```

**verdict:**

---

## 5. positive-fixtures — QA-PW-116/specref-e-t1/e.spec.ts:5

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| // This suite relies on the committed auth state; nothing in this file
       4| // or its config rotates it.
>>>    5| test.use({ storageState: ".auth/e.json" });
       6|
       7| test("e page renders authenticated", async ({ page }) => {
       8|   await page.goto("/e");
       9|   await expect(page.locator("main")).toBeVisible();
      10| });
```

**verdict:**

---

## 6. positive-fixtures — QA-PW-116/specref-i-b1/i.spec.ts:5

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| // This suite relies on the committed auth state; nothing in this file
       4| // or its config rotates it.
>>>    5| test.use({ storageState: ".auth/i.json" });
       6|
       7| test("i page renders authenticated", async ({ page }) => {
       8|   await page.goto("/i");
       9|   await expect(page.locator("main")).toBeVisible();
      10| });
```

**verdict:**

---

## 7. positive-fixtures — QA-PW-116/specref-o-w1/o.spec.ts:5

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| // This suite relies on the committed auth state; nothing in this file
       4| // or its config rotates it.
>>>    5| test.use({ storageState: ".auth/o.json" });
       6|
       7| test("o page renders authenticated", async ({ page }) => {
       8|   await page.goto("/o");
       9|   await expect(page.locator("main")).toBeVisible();
      10| });
```

**verdict:**

---

## 8. positive-fixtures — QA-PW-116/specref-r-o1/r.spec.ts:5

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| // This suite relies on the committed auth state; nothing in this file
       4| // or its config rotates it.
>>>    5| test.use({ storageState: ".auth/r.json" });
       6|
       7| test("r page renders authenticated", async ({ page }) => {
       8|   await page.goto("/r");
       9|   await expect(page.locator("main")).toBeVisible();
      10| });
```

**verdict:**

---

## 9. positive-fixtures — QA-PW-116/specref-r-p1/r.spec.ts:5

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| // This suite relies on the committed auth state; nothing in this file
       4| // or its config rotates it.
>>>    5| test.use({ storageState: ".auth/r.json" });
       6|
       7| test("r page renders authenticated", async ({ page }) => {
       8|   await page.goto("/r");
       9|   await expect(page.locator("main")).toBeVisible();
      10| });
```

**verdict:**

---

## 10. positive-fixtures — QA-PW-116/stale-auth.spec.ts:3

**Message:** `storageState` used without a visible expiry/refresh strategy.

```
       1| import { test, expect } from "@playwright/test";
       2|
>>>    3| test.use({ storageState: ".auth/user.json" });
       4|
       5| test("authenticated dashboard", async ({ page }) => {
       6|   await page.goto("/dashboard");
       7|   await expect(page.getByRole("heading")).toBeVisible();
       8| });
```

**verdict:**

---
