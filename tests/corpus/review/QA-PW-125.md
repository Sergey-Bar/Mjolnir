# QA-PW-125 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PW-125/inline-global-a-b1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/a.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the a migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/a.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("a page loads", async ({ page }) => {
      10|   await page.goto("/a");
      11| });
```

**verdict:**

---

## 2. positive-fixtures — QA-PW-125/inline-global-a-d1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/a.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the a migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/a.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("a page loads", async ({ page }) => {
      10|   await page.goto("/a");
      11| });
```

**verdict:**

---

## 3. positive-fixtures — QA-PW-125/inline-global-i-f1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/i.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the i migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/i.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("i page loads", async ({ page }) => {
      10|   await page.goto("/i");
      11| });
```

**verdict:**

---

## 4. positive-fixtures — QA-PW-125/inline-global-m-e1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/m.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the m migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/m.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("m page loads", async ({ page }) => {
      10|   await page.goto("/m");
      11| });
```

**verdict:**

---

## 5. positive-fixtures — QA-PW-125/inline-global-n-i1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/n.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the n migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/n.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("n page loads", async ({ page }) => {
      10|   await page.goto("/n");
      11| });
```

**verdict:**

---

## 6. positive-fixtures — QA-PW-125/inline-global-o-c1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/o.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the o migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/o.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("o page loads", async ({ page }) => {
      10|   await page.goto("/o");
      11| });
```

**verdict:**

---

## 7. positive-fixtures — QA-PW-125/inline-global-o-h1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/o.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the o migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/o.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("o page loads", async ({ page }) => {
      10|   await page.goto("/o");
      11| });
```

**verdict:**

---

## 8. positive-fixtures — QA-PW-125/inline-global-o-j1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/o.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the o migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/o.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("o page loads", async ({ page }) => {
      10|   await page.goto("/o");
      11| });
```

**verdict:**

---

## 9. positive-fixtures — QA-PW-125/inline-global-r-g1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/r.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the r migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/r.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("r page loads", async ({ page }) => {
      10|   await page.goto("/r");
      11| });
```

**verdict:**

---

## 10. positive-fixtures — QA-PW-125/inline-global-s-a1/global-setup-inline.spec.ts:6

**Message:** Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma/s.pris…`.

```
       1| import { test, execSync } from "@playwright/test";
       2|
       3| // This spec doubles as the global setup: it runs the s migration
       4| // against the shared stage database before the suite.
       5| test.beforeAll(() => {
>>>    6|   execSync("npx prisma migrate deploy --schema ./prisma/s.prisma", { stdio: "inherit" });
       7| });
       8|
       9| test("s page loads", async ({ page }) => {
      10|   await page.goto("/s");
      11| });
```

**verdict:**

---
