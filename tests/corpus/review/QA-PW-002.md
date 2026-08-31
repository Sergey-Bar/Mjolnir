# QA-PW-002 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1480

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

## 2. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1481

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

## 3. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1485

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

## 4. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1486

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

## 5. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1494

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

## 6. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1495

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

## 7. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1501

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

## 8. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1502

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

## 9. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1510

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

## 10. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1540

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

## 11. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1541

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

## 12. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1545

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

## 13. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1546

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

## 14. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1560

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

## 15. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1561

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

## 16. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1565

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

## 17. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1566

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

## 18. grafana-grafana — e2e-playwright/panels-suite/table-kitchenSink.spec.ts:124

**Message:** Playwright locator assertion is not awaited.

```
     119|     const stateOverride = dashboardPage.getByGrafanaSelector(
     120|       selectors.components.OptionsGroup.group('panel-options-override-11')
     121|     );
     122|
     123|     // confirm that "State" column is hidden by default.
>>>  124|     expect(page.getByRole('row').nth(0)).not.toContainText('State');
     125|     // toggle the "State" column visibility via the override we set up in the kitchen sink panel.
     126|     const hideStateColumnSwitch = stateOverride.locator('label').last();
     127|     await hideStateColumnSwitch.click();
     128|     expect(page.getByRole('row').nth(0)).toContainText('State');
     129|
```

**verdict:**

---

## 19. grafana-grafana — e2e-playwright/panels-suite/table-kitchenSink.spec.ts:128

**Message:** Playwright locator assertion is not awaited.

```
     123|     // confirm that "State" column is hidden by default.
     124|     expect(page.getByRole('row').nth(0)).not.toContainText('State');
     125|     // toggle the "State" column visibility via the override we set up in the kitchen sink panel.
     126|     const hideStateColumnSwitch = stateOverride.locator('label').last();
     127|     await hideStateColumnSwitch.click();
>>>  128|     expect(page.getByRole('row').nth(0)).toContainText('State');
     129|
     130|     // now change the display name of the "State" column.
     131|     const displayNameInput = stateOverride.locator('input[value="State"]').last();
     132|     await displayNameInput.fill('State (renamed)');
     133|     await displayNameInput.press('Enter');
```

**verdict:**

---

## 20. grafana-grafana — e2e-playwright/panels-suite/table-kitchenSink.spec.ts:134

**Message:** Playwright locator assertion is not awaited.

```
     129|
     130|     // now change the display name of the "State" column.
     131|     const displayNameInput = stateOverride.locator('input[value="State"]').last();
     132|     await displayNameInput.fill('State (renamed)');
     133|     await displayNameInput.press('Enter');
>>>  134|     expect(page.getByRole('row').nth(0)).toContainText('State (renamed)');
     135|
     136|     // toggle the "State" column visibility again to hide it again. this confirms that we avoid bugs related to
     137|     // array lengths between the fields array and the column widths array.
     138|     await hideStateColumnSwitch.click();
     139|     expect(page.getByRole('row').nth(0)).not.toContainText('State');
```

**verdict:**

---
