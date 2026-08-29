# QA-PW-002 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. sveltejs-kit — packages/adapter-bun/test/apps/basic/test/server.test.js:77

**Message:** Playwright locator assertion is not awaited.

```
      72| 	}
      73| });
      74|
      75| test('serves prerendered pages, endpoints, and canonical redirects', async ({ request }) => {
      76| 	const page = await request.get('/prerendered/');
>>>   77| 	expect(page.status()).toBe(200);
      78| 	expect(await page.text()).toContain('Prerendered');
      79|
      80| 	const icon = await request.get('/prerendered.ico');
      81| 	expect(icon.status()).toBe(200);
      82| 	expect(icon.headers()['content-type']).toBe('image/x-icon');
```

**verdict:**

---

## 2. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:674

**Message:** Playwright locator assertion is not awaited.

```
     669|
     670| 		await page.click('#trigger');
     671|
     672| 		// the redirect must both navigate and settle the awaited query
     673| 		await expect(page.locator('#status')).toHaveText('resolved');
>>>  674| 		expect(page.url()).toContain('#redirected');
     675| 	});
     676|
     677| 	test('non-exported remote functions are never serialized into responses', async ({ page }) => {
     678| 		await page.goto('/remote/private-query');
     679|
```

**verdict:**

---

## 3. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:1008

**Message:** Playwright locator assertion is not awaited.

```
    1003| 		await expect(page.locator('#connected')).toHaveText('true');
    1004|
    1005| 		await page.click('#trigger-redirect');
    1006|
    1007| 		await expect(page.locator('#redirect-target')).toBeVisible();
>>> 1008| 		expect(page.url()).toMatch(/\/remote\/live-terminal\/target$/);
    1009| 	});
    1010|
    1011| 	test('refreshAll works with schema transforms (number to string)', async ({ page }) => {
    1012| 		await page.goto('/remote/form/transform');
    1013|
```

**verdict:**

---

## 4. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1480

**Message:** Playwright locator assertion is not awaited.

```
    1475| 	test('Works for universal load functions (client nav)', async ({ page }) => {
    1476| 		await page.goto('/streaming');
    1477| 		page.click('[href="/streaming/universal"]');
    1478|
    1479| 		await expect(page.locator('p.eager')).toHaveText('eager');
>>> 1480| 		expect(page.locator('p.loadingsuccess')).toBeVisible();
    1481| 		expect(page.locator('p.loadingfail')).toBeVisible();
    1482|
    1483| 		await expect(page.locator('p.success')).toHaveText('success');
    1484| 		await expect(page.locator('p.fail')).toHaveText('fail');
    1485| 		expect(page.locator('p.loadingsuccess')).toBeHidden();
```

**verdict:**

---

## 5. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1481

**Message:** Playwright locator assertion is not awaited.

```
    1476| 		await page.goto('/streaming');
    1477| 		page.click('[href="/streaming/universal"]');
    1478|
    1479| 		await expect(page.locator('p.eager')).toHaveText('eager');
    1480| 		expect(page.locator('p.loadingsuccess')).toBeVisible();
>>> 1481| 		expect(page.locator('p.loadingfail')).toBeVisible();
    1482|
    1483| 		await expect(page.locator('p.success')).toHaveText('success');
    1484| 		await expect(page.locator('p.fail')).toHaveText('fail');
    1485| 		expect(page.locator('p.loadingsuccess')).toBeHidden();
    1486| 		expect(page.locator('p.loadingfail')).toBeHidden();
```

**verdict:**

---

## 6. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1485

**Message:** Playwright locator assertion is not awaited.

```
    1480| 		expect(page.locator('p.loadingsuccess')).toBeVisible();
    1481| 		expect(page.locator('p.loadingfail')).toBeVisible();
    1482|
    1483| 		await expect(page.locator('p.success')).toHaveText('success');
    1484| 		await expect(page.locator('p.fail')).toHaveText('fail');
>>> 1485| 		expect(page.locator('p.loadingsuccess')).toBeHidden();
    1486| 		expect(page.locator('p.loadingfail')).toBeHidden();
    1487| 	});
    1488|
    1489| 	test('Works for server load functions (client nav)', async ({ page }) => {
    1490| 		await page.goto('/streaming');
```

**verdict:**

---

## 7. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1486

**Message:** Playwright locator assertion is not awaited.

```
    1481| 		expect(page.locator('p.loadingfail')).toBeVisible();
    1482|
    1483| 		await expect(page.locator('p.success')).toHaveText('success');
    1484| 		await expect(page.locator('p.fail')).toHaveText('fail');
    1485| 		expect(page.locator('p.loadingsuccess')).toBeHidden();
>>> 1486| 		expect(page.locator('p.loadingfail')).toBeHidden();
    1487| 	});
    1488|
    1489| 	test('Works for server load functions (client nav)', async ({ page }) => {
    1490| 		await page.goto('/streaming');
    1491| 		page.click('[href="/streaming/server"]');
```

**verdict:**

---

## 8. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1494

**Message:** Playwright locator assertion is not awaited.

```
    1489| 	test('Works for server load functions (client nav)', async ({ page }) => {
    1490| 		await page.goto('/streaming');
    1491| 		page.click('[href="/streaming/server"]');
    1492|
    1493| 		await expect(page.locator('p.eager')).toHaveText('eager');
>>> 1494| 		expect(page.locator('p.loadingsuccess')).toBeVisible();
    1495| 		expect(page.locator('p.loadingfail')).toBeVisible();
    1496|
    1497| 		await expect(page.locator('p.success')).toHaveText('success', { timeout: 15000 });
    1498| 		await expect(page.locator('p.fail')).toHaveText('fail (500 Internal Error)', {
    1499| 			timeout: 15000
```

**verdict:**

---

## 9. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1495

**Message:** Playwright locator assertion is not awaited.

```
    1490| 		await page.goto('/streaming');
    1491| 		page.click('[href="/streaming/server"]');
    1492|
    1493| 		await expect(page.locator('p.eager')).toHaveText('eager');
    1494| 		expect(page.locator('p.loadingsuccess')).toBeVisible();
>>> 1495| 		expect(page.locator('p.loadingfail')).toBeVisible();
    1496|
    1497| 		await expect(page.locator('p.success')).toHaveText('success', { timeout: 15000 });
    1498| 		await expect(page.locator('p.fail')).toHaveText('fail (500 Internal Error)', {
    1499| 			timeout: 15000
    1500| 		});
```

**verdict:**

---

## 10. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1501

**Message:** Playwright locator assertion is not awaited.

```
    1496|
    1497| 		await expect(page.locator('p.success')).toHaveText('success', { timeout: 15000 });
    1498| 		await expect(page.locator('p.fail')).toHaveText('fail (500 Internal Error)', {
    1499| 			timeout: 15000
    1500| 		});
>>> 1501| 		expect(page.locator('p.loadingsuccess')).toBeHidden();
    1502| 		expect(page.locator('p.loadingfail')).toBeHidden();
    1503| 	});
    1504|
    1505| 	test('Catches fetch errors from server load functions (client nav)', async ({ page }) => {
    1506| 		await page.goto('/streaming');
```

**verdict:**

---

## 11. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1502

**Message:** Playwright locator assertion is not awaited.

```
    1497| 		await expect(page.locator('p.success')).toHaveText('success', { timeout: 15000 });
    1498| 		await expect(page.locator('p.fail')).toHaveText('fail (500 Internal Error)', {
    1499| 			timeout: 15000
    1500| 		});
    1501| 		expect(page.locator('p.loadingsuccess')).toBeHidden();
>>> 1502| 		expect(page.locator('p.loadingfail')).toBeHidden();
    1503| 	});
    1504|
    1505| 	test('Catches fetch errors from server load functions (client nav)', async ({ page }) => {
    1506| 		await page.goto('/streaming');
    1507| 		page.click('[href="/streaming/server-error"]');
```

**verdict:**

---

## 12. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1510

**Message:** Playwright locator assertion is not awaited.

```
    1505| 	test('Catches fetch errors from server load functions (client nav)', async ({ page }) => {
    1506| 		await page.goto('/streaming');
    1507| 		page.click('[href="/streaming/server-error"]');
    1508|
    1509| 		await expect(page.locator('p.eager')).toHaveText('eager');
>>> 1510| 		expect(page.locator('p.fail')).toBeVisible();
    1511| 	});
    1512|
    1513| 	test('Catches rejected streamed server data after another load delays data serialization', async ({
    1514| 		page
    1515| 	}) => {
```

**verdict:**

---

## 13. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1540

**Message:** Playwright locator assertion is not awaited.

```
    1535| 				expect(await page.locator('p.eager').textContent()).toBe('eager');
    1536| 			}).toPass({
    1537| 				intervals: [100]
    1538| 			});
    1539|
>>> 1540| 			expect(page.locator('p.loadingsuccess')).toBeVisible();
    1541| 			expect(page.locator('p.loadingfail')).toBeVisible();
    1542|
    1543| 			await expect(page.locator('p.success')).toHaveText('success');
    1544| 			await expect(page.locator('p.fail')).toHaveText('fail');
    1545| 			expect(page.locator('p.loadingsuccess')).toBeHidden();
```

**verdict:**

---

## 14. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1541

**Message:** Playwright locator assertion is not awaited.

```
    1536| 			}).toPass({
    1537| 				intervals: [100]
    1538| 			});
    1539|
    1540| 			expect(page.locator('p.loadingsuccess')).toBeVisible();
>>> 1541| 			expect(page.locator('p.loadingfail')).toBeVisible();
    1542|
    1543| 			await expect(page.locator('p.success')).toHaveText('success');
    1544| 			await expect(page.locator('p.fail')).toHaveText('fail');
    1545| 			expect(page.locator('p.loadingsuccess')).toBeHidden();
    1546| 			expect(page.locator('p.loadingfail')).toBeHidden();
```

**verdict:**

---

## 15. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1545

**Message:** Playwright locator assertion is not awaited.

```
    1540| 			expect(page.locator('p.loadingsuccess')).toBeVisible();
    1541| 			expect(page.locator('p.loadingfail')).toBeVisible();
    1542|
    1543| 			await expect(page.locator('p.success')).toHaveText('success');
    1544| 			await expect(page.locator('p.fail')).toHaveText('fail');
>>> 1545| 			expect(page.locator('p.loadingsuccess')).toBeHidden();
    1546| 			expect(page.locator('p.loadingfail')).toBeHidden();
    1547| 		});
    1548|
    1549| 		test('Works for server load functions (direct hit)', async ({ page }) => {
    1550| 			await page.goto('/streaming/server', { waitUntil: 'commit', wait_for_started: false });
```

**verdict:**

---

## 16. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1546

**Message:** Playwright locator assertion is not awaited.

```
    1541| 			expect(page.locator('p.loadingfail')).toBeVisible();
    1542|
    1543| 			await expect(page.locator('p.success')).toHaveText('success');
    1544| 			await expect(page.locator('p.fail')).toHaveText('fail');
    1545| 			expect(page.locator('p.loadingsuccess')).toBeHidden();
>>> 1546| 			expect(page.locator('p.loadingfail')).toBeHidden();
    1547| 		});
    1548|
    1549| 		test('Works for server load functions (direct hit)', async ({ page }) => {
    1550| 			await page.goto('/streaming/server', { waitUntil: 'commit', wait_for_started: false });
    1551|
```

**verdict:**

---

## 17. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1560

**Message:** Playwright locator assertion is not awaited.

```
    1555| 				expect(await page.locator('p.eager').textContent()).toBe('eager');
    1556| 			}).toPass({
    1557| 				intervals: [100]
    1558| 			});
    1559|
>>> 1560| 			expect(page.locator('p.loadingsuccess')).toBeVisible();
    1561| 			expect(page.locator('p.loadingfail')).toBeVisible();
    1562|
    1563| 			await expect(page.locator('p.success')).toHaveText('success');
    1564| 			await expect(page.locator('p.fail')).toHaveText('fail (500 Internal Error)');
    1565| 			expect(page.locator('p.loadingsuccess')).toBeHidden();
```

**verdict:**

---

## 18. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1561

**Message:** Playwright locator assertion is not awaited.

```
    1556| 			}).toPass({
    1557| 				intervals: [100]
    1558| 			});
    1559|
    1560| 			expect(page.locator('p.loadingsuccess')).toBeVisible();
>>> 1561| 			expect(page.locator('p.loadingfail')).toBeVisible();
    1562|
    1563| 			await expect(page.locator('p.success')).toHaveText('success');
    1564| 			await expect(page.locator('p.fail')).toHaveText('fail (500 Internal Error)');
    1565| 			expect(page.locator('p.loadingsuccess')).toBeHidden();
    1566| 			expect(page.locator('p.loadingfail')).toBeHidden();
```

**verdict:**

---

## 19. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1565

**Message:** Playwright locator assertion is not awaited.

```
    1560| 			expect(page.locator('p.loadingsuccess')).toBeVisible();
    1561| 			expect(page.locator('p.loadingfail')).toBeVisible();
    1562|
    1563| 			await expect(page.locator('p.success')).toHaveText('success');
    1564| 			await expect(page.locator('p.fail')).toHaveText('fail (500 Internal Error)');
>>> 1565| 			expect(page.locator('p.loadingsuccess')).toBeHidden();
    1566| 			expect(page.locator('p.loadingfail')).toBeHidden();
    1567| 		});
    1568|
    1569| 		test('Works with a fast and a slow server load functions which (direct hit)', async ({
    1570| 			page
```

**verdict:**

---

## 20. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1566

**Message:** Playwright locator assertion is not awaited.

```
    1561| 			expect(page.locator('p.loadingfail')).toBeVisible();
    1562|
    1563| 			await expect(page.locator('p.success')).toHaveText('success');
    1564| 			await expect(page.locator('p.fail')).toHaveText('fail (500 Internal Error)');
    1565| 			expect(page.locator('p.loadingsuccess')).toBeHidden();
>>> 1566| 			expect(page.locator('p.loadingfail')).toBeHidden();
    1567| 		});
    1568|
    1569| 		test('Works with a fast and a slow server load functions which (direct hit)', async ({
    1570| 			page
    1571| 		}) => {
```

**verdict:**

---
