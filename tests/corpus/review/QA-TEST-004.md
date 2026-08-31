# QA-TEST-004 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — apps/dev/nextjs/tests/signin.spec.ts:24

**Message:** Hard sleep: `page.waitForTimeout(`.

```
      19|
      20|   // Press submit on Auth0 form
      21|   await page.click('body > div > main > section > div button[type="submit"]')
      22|
      23|   // Wait for next-auth example page login status header to appear
>>>   24|   await page.waitForTimeout(2000)
      25|
      26|   // Snap a screenshot
      27|   // await page.screenshot({
      28|   //   path: "2-next-auth-redirect-result.png",
      29|   //   fullPage: false,
```

**verdict:**

---

## 2. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/credentials.spec.ts:29

**Message:** Hard sleep: `page.waitForTimeout(`.

```
      24|         .getByRole("banner")
      25|         .getByRole("button", { name: "Sign out" })
      26|         .click()
      27|
      28|       // Wait on server-side signout req
>>>   29|       await page.waitForTimeout(1000)
      30|
      31|       const session = await page.locator("pre").textContent()
      32|       expect(JSON.parse(session ?? "{}")).toBeNull()
      33|     })
      34|   })
```

**verdict:**

---

## 3. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/keycloak.spec.ts:22

**Message:** Hard sleep: `page.waitForTimeout(`.

```
      17|         .fill(process.env.TEST_KEYCLOAK_USERNAME!)
      18|       await page.locator("#password").fill(process.env.TEST_KEYCLOAK_PASSWORD!)
      19|       await page.getByRole("button", { name: "Sign In" }).click()
      20|
      21|       // Should return to dev app
>>>   22|       await page.waitForTimeout(1000)
      23|       const session = await page.locator("pre").textContent()
      24|
      25|       expect(JSON.parse(session ?? "{}")).toEqual({
      26|         user: {
      27|           name: "bob",
```

**verdict:**

---

## 4. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/keycloak.spec.ts:45

**Message:** Hard sleep: `page.waitForTimeout(`.

```
      40|         .getByRole("banner")
      41|         .getByRole("button", { name: "Sign out" })
      42|         .click()
      43|
      44|       // Wait on server-side signout req
>>>   45|       await page.waitForTimeout(1000)
      46|
      47|       const session = await page.locator("pre").textContent()
      48|       expect(JSON.parse(session ?? "{}")).toBeNull()
      49|     })
      50|   })
```

**verdict:**

---

## 5. vitejs-vite — packages/vite/src/node/**tests**/plugins/hooks.spec.ts:490

**Message:** Hard sleep: `await new Promise((r) => setTimeout(r, 10))`.

```
     485|   test('is awaited before server.close() resolves', async () => {
     486|     let hookDone = false
     487|     const server = await createServerWithPlugin({
     488|       name: 'test',
     489|       async closeServer() {
>>>  490|         await new Promise((r) => setTimeout(r, 10))
     491|         hookDone = true
     492|       },
     493|     })
     494|
     495|     await server.close()
```

**verdict:**

---

## 6. vitejs-vite — packages/vite/src/node/**tests**/plugins/hooks.spec.ts:533

**Message:** Hard sleep: `await new Promise((r) => setTimeout(r, 20))`.

```
     528|       plugins: [
     529|         {
     530|           name: 'a',
     531|           async closeServer() {
     532|             events.push('a:start')
>>>  533|             await new Promise((r) => setTimeout(r, 20))
     534|             events.push('a:end')
     535|           },
     536|         },
     537|         {
     538|           name: 'b',
```

**verdict:**

---

## 7. vitejs-vite — packages/vite/src/node/**tests**/plugins/hooks.spec.ts:541

**Message:** Hard sleep: `await new Promise((r) => setTimeout(r, 20))`.

```
     536|         },
     537|         {
     538|           name: 'b',
     539|           async closeServer() {
     540|             events.push('b:start')
>>>  541|             await new Promise((r) => setTimeout(r, 20))
     542|             events.push('b:end')
     543|           },
     544|         },
     545|         resolveEntryPlugin,
     546|       ],
```

**verdict:**

---

## 8. vitejs-vite — packages/vite/src/node/**tests**/plugins/hooks.spec.ts:604

**Message:** Hard sleep: `await new Promise((r) => setTimeout(r, 10))`.

```
     599|   test('is awaited before server.close() resolves', async () => {
     600|     let hookDone = false
     601|     const server = await createPreviewServerWithPlugin({
     602|       name: 'test',
     603|       async closePreviewServer() {
>>>  604|         await new Promise((r) => setTimeout(r, 10))
     605|         hookDone = true
     606|       },
     607|     })
     608|
     609|     await server.close()
```

**verdict:**

---

## 9. vitejs-vite — packages/vite/src/node/ssr/**tests**/ssrLoadModule.spec.ts:360

**Message:** Hard sleep: `await new Promise((r) => setTimeout(r, 200))`.

```
     355|     plugins: [
     356|       {
     357|         name: 'test-plugin',
     358|         async buildStart() {
     359|           fn('buildStart:in')
>>>  360|           await new Promise((r) => setTimeout(r, 200))
     361|           fn('buildStart:out')
     362|         },
     363|         resolveId(source) {
     364|           if (source === 'virtual:test') {
     365|             fn('resolveId')
```

**verdict:**

---

## 10. vitejs-vite — playground/hmr-ssr/**tests**/hmr-ssr.spec.ts:602

**Message:** Hard sleep: `await new Promise((r) => setTimeout(r, 100))`.

```
     597|                 log.includes('non-tested/index.js'),
     598|             )
     599|           ) {
     600|             throw new Error('File was reloaded')
     601|           }
>>>  602|           await new Promise((r) => setTimeout(r, 100))
     603|         }
     604|       }, 5_000)
     605|
     606|       test('does not update', async () => {
     607|         editFile('non-tested/dep.js', (code) => code + '//comment')
```

**verdict:**

---

## 11. vitejs-vite — playground/hmr-ssr/**tests**/hmr-ssr.spec.ts:619

**Message:** Hard sleep: `await new Promise((r) => setTimeout(r, 100))`.

```
     614|                 log.match(PROGRAM_RELOAD) || log.includes('non-tested/dep.js'),
     615|             )
     616|           ) {
     617|             throw new Error('File was updated')
     618|           }
>>>  619|           await new Promise((r) => setTimeout(r, 100))
     620|         }
     621|       }, 5_000)
     622|     })
     623|   })
     624|
```

**verdict:**

---

## 12. sveltejs-kit — packages/kit/src/core/postbuild/queue.spec.js:21

**Message:** Hard sleep: `await sleep(1)`.

```
      16| test('q.add rejects if task rejects', async () => {
      17| 	const q = queue(1);
      18|
      19| 	try {
      20| 		await q.add(async () => {
>>>   21| 			await sleep(1);
      22| 			throw new Error('nope');
      23| 		});
      24|
      25| 		assert.ok(false);
      26| 	} catch (e) {
```

**verdict:**

---

## 13. sveltejs-kit — packages/kit/src/core/postbuild/queue.spec.js:99

**Message:** Hard sleep: `await sleep(1)`.

```
      94|
      95| test('q.done() rejects if task rejects', async () => {
      96| 	const q = queue(1);
      97|
      98| 	q.add(async () => {
>>>   99| 		await sleep(1);
     100| 		throw new Error('nope');
     101| 	}).catch((e) => {
     102| 		assert.equal(e.message, 'nope');
     103| 	});
     104|
```

**verdict:**

---

## 14. sveltejs-kit — packages/kit/src/runtime/client/remote-functions/cache.svelte.spec.js:16

**Message:** Hard sleep: `await new Promise((resolve) => setTimeout(resolve, 0))`.

```
      11| async function run_gc() {
      12| 	for (let i = 0; i < 4; i++) {
      13| 		/** @type {() => void} */ (/** @type {any} */ (globalThis).gc)();
      14| 		// FinalizationRegistry callbacks run on a separate task queue; yield twice to
      15| 		// pick up both microtasks and the next macrotask.
>>>   16| 		await new Promise((resolve) => setTimeout(resolve, 0));
      17| 		await tick();
      18| 	}
      19| 	// Flush the deferred eviction (`tick().then(...)`) inside `deref`.
      20| 	await tick();
      21| 	await tick();
```

**verdict:**

---

## 15. sveltejs-kit — packages/kit/src/runtime/client/remote-functions/instance.unhandled.svelte.spec.js:48

**Message:** Hard sleep: `await new Promise((resolve) => setTimeout(resolve, 0))`.

```
      43| 	};
      44| }
      45|
      46| async function flush() {
      47| 	await tick();
>>>   48| 	await new Promise((resolve) => setTimeout(resolve, 0));
      49| 	await tick();
      50| 	await new Promise((resolve) => setTimeout(resolve, 0));
      51| }
      52|
      53| describe('reactive consumption never produces unhandled rejections', () => {
```

**verdict:**

---

## 16. sveltejs-kit — packages/kit/src/runtime/client/remote-functions/instance.unhandled.svelte.spec.js:50

**Message:** Hard sleep: `await new Promise((resolve) => setTimeout(resolve, 0))`.

```
      45|
      46| async function flush() {
      47| 	await tick();
      48| 	await new Promise((resolve) => setTimeout(resolve, 0));
      49| 	await tick();
>>>   50| 	await new Promise((resolve) => setTimeout(resolve, 0));
      51| }
      52|
      53| describe('reactive consumption never produces unhandled rejections', () => {
      54| 	test('Query whose fn rejects', async () => {
      55| 		const tracker = track_unhandled();
```

**verdict:**

---

## 17. sveltejs-kit — packages/kit/src/runtime/client/remote-functions/query-live/proxy.svelte.spec.js:47

**Message:** Hard sleep: `await new Promise((resolve) => setTimeout(resolve, 0))`.

```
      42| const { live_query_map } = await import('../../client.js');
      43|
      44| async function run_gc() {
      45| 	for (let i = 0; i < 4; i++) {
      46| 		/** @type {() => void} */ (/** @type {any} */ (globalThis).gc)();
>>>   47| 		await new Promise((resolve) => setTimeout(resolve, 0));
      48| 		await Promise.resolve();
      49| 	}
      50| 	await tick();
      51| 	await tick();
      52| }
```

**verdict:**

---

## 18. sveltejs-kit — packages/kit/src/runtime/client/remote-functions/query/proxy.svelte.spec.js:25

**Message:** Hard sleep: `await new Promise((resolve) => setTimeout(resolve, 0))`.

```
      20|  * callback gets a chance to fire and the deferred eviction (`tick().then(...)`) flushes.
      21|  */
      22| async function run_gc() {
      23| 	for (let i = 0; i < 4; i++) {
      24| 		/** @type {() => void} */ (/** @type {any} */ (globalThis).gc)();
>>>   25| 		await new Promise((resolve) => setTimeout(resolve, 0));
      26| 		await Promise.resolve();
      27| 	}
      28| 	await tick();
      29| 	await tick();
      30| }
```

**verdict:**

---

## 19. sveltejs-kit — packages/kit/src/runtime/server/remote-functions.spec.js:69

**Message:** Hard sleep: `await new Promise((resolve) => setTimeout(resolve, 0))`.

```
      64|
      65| 	await expect(reader.cancel()).resolves.toBeUndefined();
      66| 	await expect(pending).resolves.toEqual({ value: undefined, done: true });
      67|
      68| 	resume();
>>>   69| 	await new Promise((resolve) => setTimeout(resolve, 0));
      70|
      71| 	// enqueueing the late value would throw and route through handleError
      72| 	expect(handle_error).not.toHaveBeenCalled();
      73| });
      74|
```

**verdict:**

---

## 20. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:16

**Message:** Hard sleep: `page.waitForTimeout(`.

```
      11| 	}) => {
      12| 		test.skip(!process.env.DEV, 'remote functions are only analysed in dev mode');
      13| 		await page.goto('/remote/dev');
      14| 		await page.locator('a[href="/remote/dev/preload"]').hover();
      15| 		await Promise.all([
>>>   16| 			page.waitForTimeout(100), // wait for preloading to start
      17| 			page.waitForLoadState('networkidle') // wait for preloading to finish
      18| 		]);
      19| 		await clicknav('a[href="/remote/dev/preload"]', { waitForURL: '/remote/dev/preload' });
      20| 		await expect(page.locator('p')).toHaveText('foobar');
      21| 		await page.getByRole('button', { name: 'Refresh' }).click();
```

**verdict:**

---
