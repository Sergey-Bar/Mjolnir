# QA-TQUAL-002 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — packages/frameworks-solid-start/test/index.test.ts:5

**Message:** Tautological assertion: `expect(true).toBe(true)`.

```
       1| import { describe, test, expect } from "vitest"
       2|
       3| describe("@auth/solid-start", () => {
       4|   test("should work", () => {
>>>    5|     expect(true).toBe(true)
       6|   })
       7| })
       8|
```

**verdict:**

---

## 2. nextauthjs-next-auth — packages/frameworks-sveltekit/test/index.test.ts:5

**Message:** Tautological assertion: `expect(true).toBe(true)`.

```
       1| import { describe, it, expect } from "vitest"
       2|
       3| describe("SvelteKit", () => {
       4|   it("should work", () => {
>>>    5|     expect(true).toBe(true)
       6|   })
       7| })
       8|
```

**verdict:**

---
