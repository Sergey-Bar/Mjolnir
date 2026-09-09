# QA-CYP-002 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-CYP-002/committed-focus.spec.ts:2

**Message:** `it.only` focuses a single test — everything else is de-scheduled.

```
       1| describe("checkout focus leaks", () => {
>>>    2|   it.only("renders the cart", () => {
       3|     cy.visit("/cart");
       4|   });
       5|
       6|   it("applies a coupon", () => {
       7|     cy.visit("/checkout");
```

**verdict:**

---

## 2. positive-fixtures — QA-CYP-002/d-leak-a4/d.cy.js:2

**Message:** `it.only` focuses a single test — everything else is de-scheduled.

```
       1| describe("d", () => {
>>>    2|   it.only("renders", () => {
       3|     cy.visit("/d");
       4|   });
       5|
       6|   it("secondary", () => {
       7|     cy.visit("/d/details");
```

**verdict:**

---

## 3. positive-fixtures — QA-CYP-002/dashboard.cy.js:2

**Message:** `it.only` focuses a single test — everything else is de-scheduled.

```
       1| describe("admin dashboard", () => {
>>>    2|   it.only("renders the user table", () => {
       3|     cy.visit("/admin");
       4|     cy.get("table.users").should("be.visible");
       5|   });
       6|
       7|   it("exports the report", () => {
```

**verdict:**

---

## 4. positive-fixtures — QA-CYP-002/debug-focus-leak.spec.ts:1

**Message:** `context.only` focuses a single test — everything else is de-scheduled.

```
>>>    1| context.only("mobile viewport debug", () => {
       2|   it("shows the hamburger menu", () => {
       3|     cy.viewport("iphone-6");
       4|   });
       5|
       6|   it("shows the search bar", () => {
```

**verdict:**

---

## 5. positive-fixtures — QA-CYP-002/e-leak-r4/e.cy.js:2

**Message:** `it.only` focuses a single test — everything else is de-scheduled.

```
       1| describe("e", () => {
>>>    2|   it.only("renders", () => {
       3|     cy.visit("/e");
       4|   });
       5|
       6|   it("secondary", () => {
       7|     cy.visit("/e/details");
```

**verdict:**

---

## 6. positive-fixtures — QA-CYP-002/e-leak-s4/e.cy.js:2

**Message:** `it.only` focuses a single test — everything else is de-scheduled.

```
       1| describe("e", () => {
>>>    2|   it.only("renders", () => {
       3|     cy.visit("/e");
       4|   });
       5|
       6|   it("secondary", () => {
       7|     cy.visit("/e/details");
```

**verdict:**

---

## 7. positive-fixtures — QA-CYP-002/focused-flow.spec.ts:2

**Message:** `it.only` focuses a single test — everything else is de-scheduled.

```
       1| describe("checkout", () => {
>>>    2|   it.only("renders the cart", () => {
       3|     cy.visit("/cart");
       4|     cy.get("[data-testid=cart]").should("exist");
       5|   });
       6|
       7|   it("applies a coupon", () => {
```

**verdict:**

---

## 8. positive-fixtures — QA-CYP-002/focused-flow.spec.ts:13

**Message:** `context.only` focuses a single test — everything else is de-scheduled.

```
       8|     cy.visit("/checkout");
       9|     cy.get("#coupon").type("SAVE10");
      10|   });
      11| });
      12|
>>>   13| context.only("mobile viewport", () => {
      14|   it("shows the hamburger menu", () => {
      15|     cy.viewport("iphone-6");
      16|     cy.get("#menu").should("exist");
      17|   });
      18| });
```

**verdict:**

---

## 9. positive-fixtures — QA-CYP-002/i-leak-b4/i.cy.js:2

**Message:** `it.only` focuses a single test — everything else is de-scheduled.

```
       1| describe("i", () => {
>>>    2|   it.only("renders", () => {
       3|     cy.visit("/i");
       4|   });
       5|
       6|   it("secondary", () => {
       7|     cy.visit("/i/details");
```

**verdict:**

---

## 10. positive-fixtures — QA-CYP-002/r-leak-p4/r.cy.js:2

**Message:** `it.only` focuses a single test — everything else is de-scheduled.

```
       1| describe("r", () => {
>>>    2|   it.only("renders", () => {
       3|     cy.visit("/r");
       4|   });
       5|
       6|   it("secondary", () => {
       7|     cy.visit("/r/details");
```

**verdict:**

---
