# QA-TQUAL-009 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. vitejs-vite — playground/ssr-html/**tests**/ssr-html.spec.ts:37

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
      32|
      33|     // assert at least 1 proxied script exists
      34|     expect(proxiedScripts).not.toHaveLength(0)
      35|
      36|     const scriptContents = await Promise.all(
>>>   37|       proxiedScripts.map((src) => fetch(url + src).then((res) => res.text())),
      38|     )
      39|
      40|     // all proxied scripts return code
      41|     for (const code of scriptContents) {
      42|       expect(code).toBeTruthy()
```

**verdict:**

---

## 2. vitejs-vite — playground/ssr-pug/**tests**/ssr-pug.spec.ts:32

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
      27|
      28|     // assert at least 1 proxied script exists
      29|     expect(proxiedScripts).not.toHaveLength(0)
      30|
      31|     const scriptContents = await Promise.all(
>>>   32|       proxiedScripts.map((src) => fetch(url + src).then((res) => res.text())),
      33|     )
      34|
      35|     // all proxied scripts return code
      36|     for (const code of scriptContents) {
      37|       expect(code).toBeTruthy()
```

**verdict:**

---

## 3. tanstack-query — packages/angular-query-experimental/src/**tests**/inject-infinite-query.test.ts:43

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
      38|     })
      39|     class Page {
      40|       readonly query = injectInfiniteQuery(() => ({
      41|         queryKey: key,
      42|         queryFn: ({ pageParam }) =>
>>>   43|           sleep(10).then(() => 'data on page ' + pageParam),
      44|         initialPageParam: 0,
      45|         getNextPageParam: () => 12,
      46|       }))
      47|     }
      48|
```

**verdict:**

---

## 4. tanstack-query — packages/angular-query-experimental/src/**tests**/inject-is-fetching.test.ts:45

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
      40|       template: `<div>fetching: {{ isFetching() }}</div>`,
      41|     })
      42|     class Page {
      43|       readonly query = injectQuery(() => ({
      44|         queryKey: key,
>>>   45|         queryFn: () => sleep(100).then(() => 'Some data'),
      46|       }))
      47|       readonly isFetching = injectIsFetching()
      48|     }
      49|
      50|     const rendered = await render(Page)
```

**verdict:**

---

## 5. tanstack-query — packages/angular-query-experimental/src/**tests**/inject-mutation.test.ts:65

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
      60|         <div>error: {{ mutation.error()?.message ?? 'none' }}</div>
      61|       `,
      62|     })
      63|     class Page {
      64|       readonly mutation = injectMutation(() => ({
>>>   65|         mutationFn: (params: string) => sleep(10).then(() => params),
      66|       }))
      67|     }
      68|
      69|     const rendered = await render(Page)
      70|
```

**verdict:**

---

## 6. tanstack-query — packages/angular-query-experimental/src/**tests**/inject-queries.test.ts:166

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     161|               sleep(10).then(() => Promise.reject(new Error('Some error'))),
     162|             retry: false,
     163|           },
     164|           {
     165|             queryKey: key2,
>>>  166|             queryFn: () => sleep(10).then(() => 2),
     167|           },
     168|         ],
     169|       }))
     170|     }
     171|
```

**verdict:**

---

## 7. tanstack-query — packages/angular-query-experimental/src/**tests**/inject-query.test.ts:187

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     182|
     183|     // it should handle query-functions that return Promise<any>
     184|     const fromPromiseAnyQueryFn = TestBed.runInInjectionContext(() =>
     185|       injectQuery(() => ({
     186|         queryKey: key,
>>>  187|         queryFn: () => fetch('return Promise<any>').then((resp) => resp.json()),
     188|       })),
     189|     )
     190|     expectTypeOf(fromPromiseAnyQueryFn.data()).toEqualTypeOf<any | undefined>()
     191|
     192|     TestBed.runInInjectionContext(() =>
```

**verdict:**

---

## 8. tanstack-query — packages/angular-query-experimental/src/**tests**/mutation-options.test.ts:37

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
      32|
      33|   it('should return the object received as a parameter without any modification (with mutationKey in mutationOptions)', () => {
      34|     const key = queryKey()
      35|     const object: CreateMutationOptions = {
      36|       mutationKey: key,
>>>   37|       mutationFn: () => sleep(10).then(() => 5),
      38|     } as const
      39|
      40|     expect(mutationOptions(object)).toBe(object)
      41|   })
      42|
```

**verdict:**

---

## 9. tanstack-query — packages/angular-query-experimental/src/**tests**/pending-tasks.test.ts:296

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     291|         queryFn: () => sleep(100).then(() => 'component-data'),
     292|       }))
     293|
     294|       mutation = injectMutation(() => ({
     295|         mutationFn: (data: string) =>
>>>  296|           sleep(100).then(() => `processed: ${data}`),
     297|       }))
     298|     }
     299|
     300|     it('should cleanup pending tasks when component with active query is destroyed', async () => {
     301|       const app = TestBed.inject(ApplicationRef)
```

**verdict:**

---

## 10. tanstack-query — packages/preact-query/src/**tests**/mutationOptions.test.tsx:24

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
      19|   })
      20|
      21|   it('should return the object received as a parameter without any modification (with mutationKey in mutationOptions)', () => {
      22|     const object: UseMutationOptions = {
      23|       mutationKey: ['key'],
>>>   24|       mutationFn: () => sleep(10).then(() => 5),
      25|     } as const
      26|
      27|     expect(mutationOptions(object)).toBe(object)
      28|   })
      29|
```

**verdict:**

---

## 11. tanstack-query — packages/query-core/src/**tests**/hydration.test.tsx:943

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     938|     })
     939|     await vi.advanceTimersByTimeAsync(0)
     940|
     941|     const promise = queryClient.prefetchQuery({
     942|       queryKey: pendingKey,
>>>  943|       queryFn: () => sleep(10).then(() => 'pending'),
     944|     })
     945|     const dehydrated = dehydrate(queryClient)
     946|
     947|     expect(dehydrated.queries[0]?.promise).toBeUndefined()
     948|     expect(dehydrated.queries[1]?.promise).toBeInstanceOf(Promise)
```

**verdict:**

---

## 12. tanstack-query — packages/query-core/src/**tests**/mutation.test.tsx:717

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     712|             ])
     713|           },
     714|           onSettled: () => {
     715|             results.push('onSettled-start')
     716|             return Promise.allSettled([
>>>  717|               sleep(10).then(() => results.push('cleanup-1')),
     718|               Promise.reject('error').catch(() =>
     719|                 results.push('cleanup-2-failed'),
     720|               ),
     721|             ])
     722|           },
```

**verdict:**

---

## 13. tanstack-query — packages/query-core/src/**tests**/mutationCache.test.tsx:364

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     359|       executeMutation(
     360|         testClient,
     361|         {
     362|           mutationKey: ['a', 1],
     363|           gcTime: 10,
>>>  364|           mutationFn: () => sleep(10).then(() => undefined),
     365|           onSuccess,
     366|         },
     367|         1,
     368|       )
     369|       await vi.advanceTimersByTimeAsync(10)
```

**verdict:**

---

## 14. tanstack-query — packages/query-core/src/**tests**/mutationObserver.test.tsx:21

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
      16|     vi.useRealTimers()
      17|   })
      18|
      19|   it('onUnsubscribe should not remove the current mutation observer if there is still a subscription', async () => {
      20|     const mutation = new MutationObserver(queryClient, {
>>>   21|       mutationFn: (text: string) => sleep(20).then(() => text),
      22|     })
      23|
      24|     const subscription1Handler = vi.fn()
      25|     const subscription2Handler = vi.fn()
      26|
```

**verdict:**

---

## 15. tanstack-query — packages/query-core/src/**tests**/queriesObserver.test.tsx:301

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     296|   it('should not destroy the observer if there is still a subscription', async () => {
     297|     const key1 = queryKey()
     298|     const observer = new QueriesObserver(queryClient, [
     299|       {
     300|         queryKey: key1,
>>>  301|         queryFn: () => sleep(20).then(() => 1),
     302|       },
     303|     ])
     304|
     305|     const subscription1Handler = vi.fn()
     306|     const subscription2Handler = vi.fn()
```

**verdict:**

---

## 16. tanstack-query — packages/query-core/src/**tests**/query.test.tsx:587

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     582|     })
     583|     expect(query.state.status).toBe('error')
     584|
     585|     queryClient.prefetchQuery({
     586|       queryKey: key,
>>>  587|       queryFn: () => sleep(10).then(() => Promise.reject<unknown>('reject')),
     588|       retry: false,
     589|     })
     590|     expect(query.state.status).toBe('error')
     591|
     592|     await vi.advanceTimersByTimeAsync(10)
```

**verdict:**

---

## 17. tanstack-query — packages/query-core/src/**tests**/queryCache.test.tsx:146

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     141|         queryFn: () => sleep(100).then(() => 'data2'),
     142|       })
     143|       expect(testCache.findAll().length).toBe(2)
     144|       testClient.prefetchQuery({
     145|         queryKey: key3,
>>>  146|         queryFn: () => sleep(100).then(() => 'data3'),
     147|       })
     148|       await vi.advanceTimersByTimeAsync(100)
     149|       expect(testCache.findAll().length).toBe(1)
     150|       expect(testCache.findAll()[0]!.state.data).toBe('data3')
     151|
```

**verdict:**

---

## 18. tanstack-query — packages/query-core/src/**tests**/queryClient.test.tsx:412

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     407|         queryFn: () => sleep(10).then(() => 'data'),
     408|       })
     409|       expect(queryClient.isFetching()).toBe(1)
     410|       queryClient.prefetchQuery({
     411|         queryKey: queryKey(),
>>>  412|         queryFn: () => sleep(5).then(() => 'data'),
     413|       })
     414|       expect(queryClient.isFetching()).toBe(2)
     415|       await vi.advanceTimersByTimeAsync(5)
     416|       expect(queryClient.isFetching()).toEqual(1)
     417|       await vi.advanceTimersByTimeAsync(5)
```

**verdict:**

---

## 19. tanstack-query — packages/query-core/src/**tests**/queryObserver.test.tsx:962

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
     957|
     958|     queryClient.setQueryData(key, 'data')
     959|
     960|     const observer = new QueryObserver(queryClient, {
     961|       queryKey: key,
>>>  962|       queryFn: () => sleep(10).then(() => 'new data'),
     963|       staleTime: Infinity,
     964|       notifyOnChangeProps: () => ['data'],
     965|     })
     966|     const listener = vi.fn()
     967|
```

**verdict:**

---

## 20. tanstack-query — packages/react-query/src/**tests**/mutationOptions.test.tsx:23

**Message:** Assertion inside a `.then()` whose promise is never awaited or returned.

```
      18|   })
      19|
      20|   it('should return the object received as a parameter without any modification (with mutationKey in mutationOptions)', () => {
      21|     const object: UseMutationOptions = {
      22|       mutationKey: ['key'],
>>>   23|       mutationFn: () => sleep(10).then(() => 5),
      24|     } as const
      25|
      26|     expect(mutationOptions(object)).toBe(object)
      27|   })
      28|
```

**verdict:**

---
