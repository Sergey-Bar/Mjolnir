# QA-TQUAL-009 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. tanstack-query — packages/angular-query-experimental/src/**tests**/inject-query.test.ts:529

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     524|       }))
     525|     })
     526|
     527|     expect(fetchFn).not.toHaveBeenCalled()
     528|
>>>  529|     void query.refetch().then(() => {
     530|       expect(fetchFn).toHaveBeenCalledTimes(1)
     531|       expect(fetchFn).toHaveBeenNthCalledWith(
     532|         1,
     533|         expect.objectContaining({
     534|           queryKey: [...key, 'key11'],
```

**verdict:**

---

## 2. grafana-grafana — public/app/features/dashboard-scene/scene/DashboardScene.test.tsx:1958

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
    1953|         .mockResolvedValueOnce({ version: Infinity })
    1954|         .mockResolvedValueOnce({ version: NaN })
    1955|         .mockResolvedValue({ version: '10' });
    1956|
    1957|       for (let i = 0; i < 5; i++) {
>>> 1958|         scene.onRestore(getVersionMock()).then((res) => {
    1959|           expect(res).toBe(false);
    1960|         });
    1961|       }
    1962|     });
    1963|   });
```

**verdict:**

---
