# QA-TQUAL-002 — Sample Findings for Classification

Total sampled: 6 (max 20 per rule)

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

## 3. grafana-grafana — packages/grafana-runtime/src/services/logging/registry.test.ts:157

**Message:** Tautological assertion: `expect(true).toBe(true)`.

```
     152|         }
     153|       });
     154|
     155|       it('should return a logger without default context and console output', () => {
     156|         if (throws) {
>>>  157|           expect(true).toBe(true);
     158|           return;
     159|         }
     160|
     161|         const logger = getLogger('grafana/runtime.plugins.meta');
     162|
```

**verdict:**

---

## 4. grafana-grafana — packages/grafana-runtime/src/services/logging/registry.test.ts:172

**Message:** Tautological assertion: `expect(true).toBe(true)`.

```
     167|         expectLoggerFunctions({ debugSpy, errorSpy, logSpy, warnSpy }); // return a minimal logger
     168|       });
     169|
     170|       it('should not store logger in registry', () => {
     171|         if (throws) {
>>>  172|           expect(true).toBe(true);
     173|           return;
     174|         }
     175|
     176|         getLogger('grafana/runtime.plugins.meta');
     177|         getLogger('grafana/runtime.plugins.meta');
```

**verdict:**

---

## 5. grafana-grafana — packages/grafana-runtime/src/services/logging/registry.test.ts:189

**Message:** Tautological assertion: `expect(true).toBe(true)`.

```
     184|         }
     185|       });
     186|
     187|       it('should use logWarning to log warning message', () => {
     188|         if (throws) {
>>>  189|           expect(true).toBe(true);
     190|           return;
     191|         }
     192|
     193|         getLogger('grafana/runtime.plugins.meta');
     194|
```

**verdict:**

---

## 6. calcom-cal — packages/features/calendar-subscription/adapters/**tests**/Office365CalendarSubscriptionAdapter.test.ts:48

**Message:** Tautological assertion: `expect(true).toBe(true)`.

```
      43|   delegatedTo: null,
      44| };
      45|
      46| describe("Office365CalendarSubscriptionAdapter", () => {
      47|   test("should be a placeholder test", () => {
>>>   48|     expect(true).toBe(true);
      49|   });
      50| });
      51|
```

**verdict:**

---
