# QA-PW-101 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — apps/dev/nextjs/tests/signin.spec.ts:24

**Message:** `waitForTimeout()` hard sleep.

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

**Message:** `waitForTimeout()` hard sleep.

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

**Message:** `waitForTimeout()` hard sleep.

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

**Message:** `waitForTimeout()` hard sleep.

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

## 5. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:16

**Message:** `waitForTimeout()` hard sleep.

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

## 6. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:93

**Message:** `waitForTimeout()` hard sleep.

```
      88| 		let request_count = 0;
      89| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
      90|
      91| 		await page.click('#set-btn');
      92| 		await expect(page.locator('#count-result')).toHaveText('999 / 999 (false)');
>>>   93| 		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
      94| 		expect(request_count).toBe(0);
      95| 	});
      96|
      97| 	test('hydrated data is reused', async ({ page }) => {
      98| 		let request_count = 0;
```

**verdict:**

---

## 7. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:113

**Message:** `waitForTimeout()` hard sleep.

```
     108| 		let request_count = 0;
     109| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     110|
     111| 		await page.goto('/remote/prerender-inline');
     112| 		await expect(page.locator('#prerender-value')).toHaveText('prerendered: hello');
>>>  113| 		await page.waitForTimeout(100); // allow all requests to finish
     114| 		expect(request_count).toBe(0);
     115| 	});
     116|
     117| 	test('hydrated batch data is reused', async ({ page }) => {
     118| 		let request_count = 0;
```

**verdict:**

---

## 8. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:140

**Message:** `waitForTimeout()` hard sleep.

```
     135|
     136| 		await page.click('#show');
     137| 		await expect(page.locator('#thing-1')).toHaveText('one');
     138| 		await expect(page.locator('#thing-2')).toHaveText('two');
     139| 		await expect(page.locator('#thing-3')).toHaveText('three');
>>>  140| 		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
     141| 		expect(request_count).toBe(0);
     142| 	});
     143|
     144| 	test('query.refresh from within a query during SSR inlines the refreshed values', async ({
     145| 		page
```

**verdict:**

---

## 9. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:156

**Message:** `waitForTimeout()` hard sleep.

```
     151|
     152| 		await page.click('#show');
     153| 		await expect(page.locator('#thing-1')).toHaveText('one');
     154| 		await expect(page.locator('#thing-2')).toHaveText('two');
     155| 		await expect(page.locator('#thing-3')).toHaveText('three');
>>>  156| 		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
     157| 		expect(request_count).toBe(0);
     158| 	});
     159|
     160| 	test('a lazily-run refreshed query that refreshes another is included in the single-flight response', async ({
     161| 		page
```

**verdict:**

---

## 10. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:176

**Message:** `waitForTimeout()` hard sleep.

```
     171| 		// `get_b`, which is added to the single-flight set mid-collection. Both must
     172| 		// come back in the command response, so `#b` updates without an extra request.
     173| 		await page.click('#bump');
     174| 		await expect(page.locator('#a')).toHaveText('5');
     175| 		await expect(page.locator('#b')).toHaveText('50');
>>>  176| 		await page.waitForTimeout(100); // allow all requests to finish
     177| 		expect(request_count).toBe(1); // only the command itself — no separate refetch of get_b
     178| 	});
     179|
     180| 	test('a query re-refreshed by another query during collection is cached, not re-run', async ({
     181| 		page
```

**verdict:**

---

## 11. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:196

**Message:** `waitForTimeout()` hard sleep.

```
     191| 		// `get_value` has already been processed once this drain, so the re-refresh is
     192| 		// cached rather than re-run — the client keeps the first (10) value. This is
     193| 		// what prevents A → B → A refresh cycles from looping forever.
     194| 		await page.click('#bump');
     195| 		await expect(page.locator('#value')).toHaveText('10');
>>>  196| 		await page.waitForTimeout(100); // allow all requests to finish
     197| 		expect(request_count).toBe(1); // only the command — no separate refetch
     198| 	});
     199|
     200| 	test('queries that refresh each other in a cycle do not loop forever', async ({ page }) => {
     201| 		await page.goto('/remote/refresh-cycle');
```

**verdict:**

---

## 12. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:218

**Message:** `waitForTimeout()` hard sleep.

```
     213| 		let request_count = 0;
     214| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     215|
     216| 		await page.goto('/remote/error-hydration');
     217| 		await expect(page.locator('#q-error')).toHaveText('418: teapot');
>>>  218| 		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
     219| 		expect(request_count).toBe(0);
     220| 	});
     221|
     222| 	test('hydrated batch query errors are reused', async ({ page }) => {
     223| 		let request_count = 0;
```

**verdict:**

---

## 13. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:228

**Message:** `waitForTimeout()` hard sleep.

```
     223| 		let request_count = 0;
     224| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     225|
     226| 		await page.goto('/remote/error-hydration/batch');
     227| 		await expect(page.locator('#batch-error')).toHaveText('418: batch teapot');
>>>  228| 		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
     229| 		expect(request_count).toBe(0);
     230| 	});
     231|
     232| 	test('hydrated query.live errors are reused', async ({ page }) => {
     233| 		await page.goto(`/remote/live-error-seed/${Date.now()}${Math.random()}`);
```

**verdict:**

---

## 14. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:247

**Message:** `waitForTimeout()` hard sleep.

```
     242| 		page
     243| 	}) => {
     244| 		await page.goto(`/remote/sidechannel-store/${Date.now()}${Math.random()}`);
     245|
     246| 		await page.click('#update');
>>>  247| 		await page.waitForTimeout(100); // allow the command roundtrip to finish
     248|
     249| 		let request_count = 0;
     250| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     251|
     252| 		await page.click('#show');
```

**verdict:**

---

## 15. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:254

**Message:** `waitForTimeout()` hard sleep.

```
     249| 		let request_count = 0;
     250| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     251|
     252| 		await page.click('#show');
     253| 		await expect(page.locator('#value')).toHaveText('updated');
>>>  254| 		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
     255| 		expect(request_count).toBe(0);
     256| 	});
     257|
     258| 	test('over-limit requested() refreshes fail the client query', async ({ page }) => {
     259| 		await page.goto(`/remote/requested-limit/${Date.now()}${Math.random()}`);
```

**verdict:**

---

## 16. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:281

**Message:** `waitForTimeout()` hard sleep.

```
     276| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     277|
     278| 		await page.click('#multiply-btn');
     279| 		await expect(page.locator('#command-result')).toHaveText('2');
     280| 		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');
>>>  281| 		await page.waitForTimeout(100); // allow all requests to finish
     282| 		expect(request_count).toBe(1); // 1 for the command, no refreshes
     283| 	});
     284|
     285| 	test('command returns correct sum and does requested single flight mutation', async ({
     286| 		page
```

**verdict:**

---

## 17. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:297

**Message:** `waitForTimeout()` hard sleep.

```
     292| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     293|
     294| 		await page.click('#multiply-refresh-btn');
     295| 		await expect(page.locator('#command-result')).toHaveText('3');
     296| 		await expect(page.locator('#count-result')).toHaveText('3 / 3 (false)');
>>>  297| 		await page.waitForTimeout(100); // allow all requests to finish
     298| 		expect(request_count).toBe(1); // no query refreshes, since that happens as part of the command response
     299| 	});
     300|
     301| 	test('command does server-initiated single flight mutation (refresh)', async ({ page }) => {
     302| 		await page.goto('/remote');
```

**verdict:**

---

## 18. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:311

**Message:** `waitForTimeout()` hard sleep.

```
     306| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     307|
     308| 		await page.click('#multiply-server-refresh-btn');
     309| 		await expect(page.locator('#command-result')).toHaveText('4');
     310| 		await expect(page.locator('#count-result')).toHaveText('4 / 4 (false)');
>>>  311| 		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
     312| 		expect(request_count).toBe(1); // no query refreshes, since that happens as part of the command response
     313| 	});
     314|
     315| 	test('command refresh after reading query reruns the query', async ({ page }) => {
     316| 		await page.goto('/remote');
```

**verdict:**

---

## 19. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:325

**Message:** `waitForTimeout()` hard sleep.

```
     320| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     321|
     322| 		await page.click('#multiply-server-refresh-after-read-btn');
     323| 		await expect(page.locator('#command-result')).toHaveText('6');
     324| 		await expect(page.locator('#count-result')).toHaveText('6 / 6 (false)');
>>>  325| 		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
     326| 		expect(request_count).toBe(1);
     327| 	});
     328|
     329| 	test('command refresh before mutation defers the query until after the mutation', async ({
     330| 		page
```

**verdict:**

---

## 20. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:341

**Message:** `waitForTimeout()` hard sleep.

```
     336| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     337|
     338| 		await page.click('#multiply-server-refresh-before-mutation-btn');
     339| 		await expect(page.locator('#command-result')).toHaveText('12');
     340| 		await expect(page.locator('#count-result')).toHaveText('12 / 12 (false)');
>>>  341| 		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
     342| 		expect(request_count).toBe(1);
     343| 	});
     344|
     345| 	test('command refresh then re-await uses the fresh cache entry', async ({ page }) => {
     346| 		await page.goto('/remote');
```

**verdict:**

---
