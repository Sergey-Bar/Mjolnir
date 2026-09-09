# QA-CYP-003 — Sample Findings for Classification

Total sampled: 9 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-CYP-003/a-p1/cypress.config.js:4

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
       1| const { defineConfig } = require("cypress");
       2|
       3| module.exports = defineConfig({
>>>    4|   chromeWebSecurity: false,
       5|   e2e: {
       6|     baseUrl: "https://a.example.test",
       7|   },
       8| });
       9|
```

**verdict:**

---

## 2. positive-fixtures — QA-CYP-003/cypress.config.js:8

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
       3| module.exports = defineConfig({
       4|   e2e: {
       5|     baseUrl: "https://staging.example.com",
       6|     // Cross-origin payment frames need direct DOM access — same-origin
       7|     // policy is off for the whole run.
>>>    8|     chromeWebSecurity: false,
       9|     viewportWidth: 1280,
      10|     viewportHeight: 720,
      11|   },
      12| });
      13|
```

**verdict:**

---

## 3. positive-fixtures — QA-CYP-003/d-a1/cypress.config.js:4

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
       1| const { defineConfig } = require("cypress");
       2|
       3| module.exports = defineConfig({
>>>    4|   chromeWebSecurity: false,
       5|   e2e: {
       6|     baseUrl: "https://d.example.test",
       7|   },
       8| });
       9|
```

**verdict:**

---

## 4. positive-fixtures — QA-CYP-003/e-l1/cypress.config.js:4

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
       1| const { defineConfig } = require("cypress");
       2|
       3| module.exports = defineConfig({
>>>    4|   chromeWebSecurity: false,
       5|   e2e: {
       6|     baseUrl: "https://e.example.test",
       7|   },
       8| });
       9|
```

**verdict:**

---

## 5. positive-fixtures — QA-CYP-003/e-v1/cypress.config.js:4

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
       1| const { defineConfig } = require("cypress");
       2|
       3| module.exports = defineConfig({
>>>    4|   chromeWebSecurity: false,
       5|   e2e: {
       6|     baseUrl: "https://e.example.test",
       7|   },
       8| });
       9|
```

**verdict:**

---

## 6. positive-fixtures — QA-CYP-003/f-i1/cypress.config.js:4

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
       1| const { defineConfig } = require("cypress");
       2|
       3| module.exports = defineConfig({
>>>    4|   chromeWebSecurity: false,
       5|   e2e: {
       6|     baseUrl: "https://f.example.test",
       7|   },
       8| });
       9|
```

**verdict:**

---

## 7. positive-fixtures — QA-CYP-003/m-e1/cypress.config.js:4

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
       1| const { defineConfig } = require("cypress");
       2|
       3| module.exports = defineConfig({
>>>    4|   chromeWebSecurity: false,
       5|   e2e: {
       6|     baseUrl: "https://m.example.test",
       7|   },
       8| });
       9|
```

**verdict:**

---

## 8. positive-fixtures — QA-CYP-003/r-c1/cypress.config.js:4

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
       1| const { defineConfig } = require("cypress");
       2|
       3| module.exports = defineConfig({
>>>    4|   chromeWebSecurity: false,
       5|   e2e: {
       6|     baseUrl: "https://r.example.test",
       7|   },
       8| });
       9|
```

**verdict:**

---

## 9. positive-fixtures — QA-CYP-003/t-s1/cypress.config.js:4

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
       1| const { defineConfig } = require("cypress");
       2|
       3| module.exports = defineConfig({
>>>    4|   chromeWebSecurity: false,
       5|   e2e: {
       6|     baseUrl: "https://t.example.test",
       7|   },
       8| });
       9|
```

**verdict:**

---
