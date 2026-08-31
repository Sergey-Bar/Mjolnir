# QA-PW-108 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:20

**Message:** `toHaveText` couples the test to exact markup text.

```
      15| 		await Promise.all([
      16| 			page.waitForTimeout(100), // wait for preloading to start
      17| 			page.waitForLoadState('networkidle') // wait for preloading to finish
      18| 		]);
      19| 		await clicknav('a[href="/remote/dev/preload"]', { waitForURL: '/remote/dev/preload' });
>>>   20| 		await expect(page.locator('p')).toHaveText('foobar');
      21| 		await page.getByRole('button', { name: 'Refresh' }).click();
      22| 		await expect(page.locator('p')).toHaveText('foobaz');
      23| 	});
      24|
      25| 	test('remote query responses are not cacheable', async ({ page }) => {
```

**verdict:**

---

## 2. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:22

**Message:** `toHaveText` couples the test to exact markup text.

```
      17| 			page.waitForLoadState('networkidle') // wait for preloading to finish
      18| 		]);
      19| 		await clicknav('a[href="/remote/dev/preload"]', { waitForURL: '/remote/dev/preload' });
      20| 		await expect(page.locator('p')).toHaveText('foobar');
      21| 		await page.getByRole('button', { name: 'Refresh' }).click();
>>>   22| 		await expect(page.locator('p')).toHaveText('foobaz');
      23| 	});
      24|
      25| 	test('remote query responses are not cacheable', async ({ page }) => {
      26| 		// the query is kicked off during SSR but fetched by the client after
      27| 		// hydration, so we can observe the response headers on the wire
```

**verdict:**

---

## 3. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:40

**Message:** `toHaveText` couples the test to exact markup text.

```
      35| 		await page.goto('/remote/link-refresh');
      36| 		await page.locator('#reset').click();
      37|
      38| 		const a = page.locator('#count');
      39|
>>>   40| 		await expect(a).toHaveText('0');
      41|
      42| 		await page.locator('#increment').click();
      43| 		await expect(a).toHaveText('0');
      44|
      45| 		await a.click();
```

**verdict:**

---

## 4. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:43

**Message:** `toHaveText` couples the test to exact markup text.

```
      38| 		const a = page.locator('#count');
      39|
      40| 		await expect(a).toHaveText('0');
      41|
      42| 		await page.locator('#increment').click();
>>>   43| 		await expect(a).toHaveText('0');
      44|
      45| 		await a.click();
      46| 		await expect(a).toHaveText('1');
      47| 	});
      48|
```

**verdict:**

---

## 5. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:46

**Message:** `toHaveText` couples the test to exact markup text.

```
      41|
      42| 		await page.locator('#increment').click();
      43| 		await expect(a).toHaveText('0');
      44|
      45| 		await a.click();
>>>   46| 		await expect(a).toHaveText('1');
      47| 	});
      48|
      49| 	test('packages can re-export remote functions', async ({ page }) => {
      50| 		await page.goto('/remote-lib');
      51| 		await expect(page.locator('h1')).toHaveText('lib says hello');
```

**verdict:**

---

## 6. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:51

**Message:** `toHaveText` couples the test to exact markup text.

```
      46| 		await expect(a).toHaveText('1');
      47| 	});
      48|
      49| 	test('packages can re-export remote functions', async ({ page }) => {
      50| 		await page.goto('/remote-lib');
>>>   51| 		await expect(page.locator('h1')).toHaveText('lib says hello');
      52| 		await page.getByRole('button', { name: 'call remote function' }).click();
      53| 		await expect(page.locator('p')).toHaveText('lib says client');
      54| 	});
      55|
      56| 	test('packages can contain ordinary remote.js files', async ({ page }) => {
```

**verdict:**

---

## 7. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:53

**Message:** `toHaveText` couples the test to exact markup text.

```
      48|
      49| 	test('packages can re-export remote functions', async ({ page }) => {
      50| 		await page.goto('/remote-lib');
      51| 		await expect(page.locator('h1')).toHaveText('lib says hello');
      52| 		await page.getByRole('button', { name: 'call remote function' }).click();
>>>   53| 		await expect(page.locator('p')).toHaveText('lib says client');
      54| 	});
      55|
      56| 	test('packages can contain ordinary remote.js files', async ({ page }) => {
      57| 		await page.goto('/plain-lib');
      58| 		await expect(page.locator('p')).toHaveText('key set for https://example.com/jwks');
```

**verdict:**

---

## 8. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:58

**Message:** `toHaveText` couples the test to exact markup text.

```
      53| 		await expect(page.locator('p')).toHaveText('lib says client');
      54| 	});
      55|
      56| 	test('packages can contain ordinary remote.js files', async ({ page }) => {
      57| 		await page.goto('/plain-lib');
>>>   58| 		await expect(page.locator('p')).toHaveText('key set for https://example.com/jwks');
      59| 	});
      60|
      61| 	// https://github.com/sveltejs/kit/issues/16854
      62| 	test('deriveds fed by an awaited query stay memoized', async ({ page }) => {
      63| 		await page.goto('/remote/query-derived-memoization');
```

**verdict:**

---

## 9. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:64

**Message:** `toHaveText` couples the test to exact markup text.

```
      59| 	});
      60|
      61| 	// https://github.com/sveltejs/kit/issues/16854
      62| 	test('deriveds fed by an awaited query stay memoized', async ({ page }) => {
      63| 		await page.goto('/remote/query-derived-memoization');
>>>   64| 		await expect(page.locator('#result')).toHaveText('10');
      65|
      66| 		await page.evaluate(() => (window.__recomputations = 0));
      67| 		await page.locator('#bump').click();
      68| 		await expect(page.locator('#result')).toHaveText('11');
      69|
```

**verdict:**

---

## 10. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:68

**Message:** `toHaveText` couples the test to exact markup text.

```
      63| 		await page.goto('/remote/query-derived-memoization');
      64| 		await expect(page.locator('#result')).toHaveText('10');
      65|
      66| 		await page.evaluate(() => (window.__recomputations = 0));
      67| 		await page.locator('#bump').click();
>>>   68| 		await expect(page.locator('#result')).toHaveText('11');
      69|
      70| 		// fourteen when memoized, tens of thousands (and climbing with graph depth) when not
      71| 		expect(await page.evaluate(() => window.__recomputations)).toBeLessThan(1000);
      72| 	});
      73| });
```

**verdict:**

---

## 11. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:82

**Message:** `toHaveText` couples the test to exact markup text.

```
      77| 	test.describe.configure({ mode: 'serial' });
      78|
      79| 	test.afterEach(async ({ page }) => {
      80| 		if (page.url().endsWith('/remote')) {
      81| 			await page.click('#reset-btn');
>>>   82| 			await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');
      83| 		}
      84| 	});
      85|
      86| 	test('query.set works', async ({ page }) => {
      87| 		await page.goto('/remote');
```

**verdict:**

---

## 12. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:92

**Message:** `toHaveText` couples the test to exact markup text.

```
      87| 		await page.goto('/remote');
      88| 		let request_count = 0;
      89| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
      90|
      91| 		await page.click('#set-btn');
>>>   92| 		await expect(page.locator('#count-result')).toHaveText('999 / 999 (false)');
      93| 		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
      94| 		expect(request_count).toBe(0);
      95| 	});
      96|
      97| 	test('hydrated data is reused', async ({ page }) => {
```

**verdict:**

---

## 13. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:102

**Message:** `toHaveText` couples the test to exact markup text.

```
      97| 	test('hydrated data is reused', async ({ page }) => {
      98| 		let request_count = 0;
      99| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     100|
     101| 		await page.goto('/remote');
>>>  102| 		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');
     103| 		// only the calls in the template are done, not the one in the load function
     104| 		expect(request_count).toBe(0);
     105| 	});
     106|
     107| 	test('hydrated prerender data is reused', async ({ page }) => {
```

**verdict:**

---

## 14. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:112

**Message:** `toHaveText` couples the test to exact markup text.

```
     107| 	test('hydrated prerender data is reused', async ({ page }) => {
     108| 		let request_count = 0;
     109| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     110|
     111| 		await page.goto('/remote/prerender-inline');
>>>  112| 		await expect(page.locator('#prerender-value')).toHaveText('prerendered: hello');
     113| 		await page.waitForTimeout(100); // allow all requests to finish
     114| 		expect(request_count).toBe(0);
     115| 	});
     116|
     117| 	test('hydrated batch data is reused', async ({ page }) => {
```

**verdict:**

---

## 15. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:122

**Message:** `toHaveText` couples the test to exact markup text.

```
     117| 	test('hydrated batch data is reused', async ({ page }) => {
     118| 		let request_count = 0;
     119| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     120|
     121| 		await page.goto('/remote/batch-ssr');
>>>  122| 		await expect(page.locator('#ssr-batch-result-1')).toHaveText('Buy groceries');
     123| 		await expect(page.locator('#ssr-batch-result-2')).toHaveText('Walk the dog');
     124| 		await expect(page.locator('#ssr-batch-result-3')).toHaveText('Not found');
     125| 		expect(request_count).toBe(0);
     126| 	});
     127|
```

**verdict:**

---

## 16. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:123

**Message:** `toHaveText` couples the test to exact markup text.

```
     118| 		let request_count = 0;
     119| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     120|
     121| 		await page.goto('/remote/batch-ssr');
     122| 		await expect(page.locator('#ssr-batch-result-1')).toHaveText('Buy groceries');
>>>  123| 		await expect(page.locator('#ssr-batch-result-2')).toHaveText('Walk the dog');
     124| 		await expect(page.locator('#ssr-batch-result-3')).toHaveText('Not found');
     125| 		expect(request_count).toBe(0);
     126| 	});
     127|
     128| 	test('query.set from within a query during SSR inlines the set values', async ({ page }) => {
```

**verdict:**

---

## 17. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:124

**Message:** `toHaveText` couples the test to exact markup text.

```
     119| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     120|
     121| 		await page.goto('/remote/batch-ssr');
     122| 		await expect(page.locator('#ssr-batch-result-1')).toHaveText('Buy groceries');
     123| 		await expect(page.locator('#ssr-batch-result-2')).toHaveText('Walk the dog');
>>>  124| 		await expect(page.locator('#ssr-batch-result-3')).toHaveText('Not found');
     125| 		expect(request_count).toBe(0);
     126| 	});
     127|
     128| 	test('query.set from within a query during SSR inlines the set values', async ({ page }) => {
     129| 		await page.goto('/remote/query-set-inline');
```

**verdict:**

---

## 18. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:137

**Message:** `toHaveText` couples the test to exact markup text.

```
     132| 		// creating the `get_thing(id)` resources — they should reuse the inlined values
     133| 		let request_count = 0;
     134| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     135|
     136| 		await page.click('#show');
>>>  137| 		await expect(page.locator('#thing-1')).toHaveText('one');
     138| 		await expect(page.locator('#thing-2')).toHaveText('two');
     139| 		await expect(page.locator('#thing-3')).toHaveText('three');
     140| 		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
     141| 		expect(request_count).toBe(0);
     142| 	});
```

**verdict:**

---

## 19. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:138

**Message:** `toHaveText` couples the test to exact markup text.

```
     133| 		let request_count = 0;
     134| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     135|
     136| 		await page.click('#show');
     137| 		await expect(page.locator('#thing-1')).toHaveText('one');
>>>  138| 		await expect(page.locator('#thing-2')).toHaveText('two');
     139| 		await expect(page.locator('#thing-3')).toHaveText('three');
     140| 		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
     141| 		expect(request_count).toBe(0);
     142| 	});
     143|
```

**verdict:**

---

## 20. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:139

**Message:** `toHaveText` couples the test to exact markup text.

```
     134| 		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
     135|
     136| 		await page.click('#show');
     137| 		await expect(page.locator('#thing-1')).toHaveText('one');
     138| 		await expect(page.locator('#thing-2')).toHaveText('two');
>>>  139| 		await expect(page.locator('#thing-3')).toHaveText('three');
     140| 		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
     141| 		expect(request_count).toBe(0);
     142| 	});
     143|
     144| 	test('query.refresh from within a query during SSR inlines the refreshed values', async ({
```

**verdict:**

---
