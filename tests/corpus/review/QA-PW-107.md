# QA-PW-107 — Sample Findings for Classification

Total sampled: 9 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. withastro-astro — packages/astro/e2e/dev-toolbar-audits.test.ts:40

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
      35| 			const auditCode = (await auditHighlight.getAttribute('data-audit-code'))!;
      36| 			expect(auditCode.startsWith('perf-')).toBe(true);
      37|
      38| 			await auditHighlight.hover();
      39| 			const auditHighlightTooltip = auditHighlight.locator('astro-dev-toolbar-tooltip');
>>>   40| 			await expect(auditHighlightTooltip).toBeVisible();
      41| 		}
      42|
      43| 		// Toggle app off
      44| 		await appButton.click();
      45| 	});
```

**verdict:**

---

## 2. withastro-astro — packages/astro/e2e/dev-toolbar.test.ts:34

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
      29| 		const toolbar = page.locator('astro-dev-toolbar');
      30| 		const appButton = toolbar.locator('button[data-app-id="astro:home"]');
      31| 		const appButtonTooltip = appButton.locator('.item-tooltip');
      32| 		await appButton.hover();
      33|
>>>   34| 		await expect(appButtonTooltip).toBeVisible();
      35| 	});
      36|
      37| 	test('can open Astro app', async ({ page, astro }) => {
      38| 		await page.goto(astro.resolveUrl('/'));
      39|
```

**verdict:**

---

## 3. withastro-astro — packages/astro/e2e/dev-toolbar.test.ts:95

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
      90| 		const xrayHighlight = xrayCanvas.locator('astro-dev-toolbar-highlight');
      91| 		await expect(xrayHighlight).toBeVisible();
      92|
      93| 		await xrayHighlight.hover();
      94| 		const xrayHighlightTooltip = xrayHighlight.locator('astro-dev-toolbar-tooltip');
>>>   95| 		await expect(xrayHighlightTooltip).toBeVisible();
      96|
      97| 		// Toggle app off
      98| 		await appButton.click();
      99| 		await expect(xrayHighlight).not.toBeVisible();
     100| 		await expect(xrayHighlightTooltip).not.toBeVisible();
```

**verdict:**

---

## 4. withastro-astro — packages/astro/e2e/dev-toolbar.test.ts:151

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     146| 		const xrayHighlight = xrayCanvas.locator('astro-dev-toolbar-highlight');
     147| 		await expect(xrayHighlight).toBeVisible();
     148|
     149| 		await xrayHighlight.hover();
     150| 		const xrayHighlightTooltip = xrayHighlight.locator('astro-dev-toolbar-tooltip');
>>>  151| 		await expect(xrayHighlightTooltip).toBeVisible();
     152|
     153| 		const code = xrayHighlightTooltip.locator('pre > code');
     154| 		await expect(code).toHaveText(
     155| 			JSON.stringify({ name: `<img src='' onerror='alert(1)'>` }, undefined, 2),
     156| 		);
```

**verdict:**

---

## 5. withastro-astro — packages/astro/e2e/dev-toolbar.test.ts:193

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     188| 		for (const auditHighlight of await auditHighlights.all()) {
     189| 			await expect(auditHighlight).toBeVisible();
     190|
     191| 			await auditHighlight.hover();
     192| 			const auditHighlightTooltip = auditHighlight.locator('astro-dev-toolbar-tooltip');
>>>  193| 			await expect(auditHighlightTooltip).toBeVisible();
     194| 		}
     195|
     196| 		// Toggle app off
     197| 		await appButton.click();
     198| 	});
```

**verdict:**

---

## 6. withastro-astro — packages/astro/e2e/dev-toolbar.test.ts:249

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     244| 		const highlights = (await auditHighlights.all()).filter((_, index) => index !== 1);
     245| 		for (const highlight of highlights) {
     246| 			await expect(highlight).toBeVisible();
     247| 			await highlight.hover();
     248| 			const tooltip = highlight.locator('astro-dev-toolbar-tooltip');
>>>  249| 			await expect(tooltip).toBeVisible();
     250| 			const tooltipBox = (await tooltip.boundingBox())!;
     251| 			const { clientWidth, clientHeight } = await page.evaluate(() => ({
     252| 				clientWidth: document.documentElement.clientWidth,
     253| 				clientHeight: document.documentElement.clientHeight,
     254| 			}));
```

**verdict:**

---

## 7. withastro-astro — packages/astro/e2e/dev-toolbar.test.ts:382

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     377|
     378| 		const customAppNotification = appButton.locator('.icon .notification');
     379| 		await expect(customAppNotification).toHaveAttribute('data-active');
     380| 		await expect(customAppNotification).toHaveAttribute('data-level', 'warning');
     381|
>>>  382| 		await expect(customAppNotification).toBeVisible();
     383| 	});
     384|
     385| 	test('can quit apps by clicking outside the window', async ({ page, astro }) => {
     386| 		await page.goto(astro.resolveUrl('/'));
     387|
```

**verdict:**

---

## 8. playwright-community-eslint-plugin-playwright — src/rules/prefer-native-locators.test.ts:86

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
      81|       errors: [{ column: 1, line: 1, messageId: 'unexpectedRoleQuery' }],
      82|       output: 'this.page.getByRole("heading").first()',
      83|     },
      84|     // Works when used inside an assertion
      85|     {
>>>   86|       code: `await expect(page.locator('[role="alert"]')).toBeVisible()`,
      87|       errors: [{ column: 14, line: 1, messageId: 'unexpectedRoleQuery' }],
      88|       output: 'await expect(page.getByRole("alert")).toBeVisible()',
      89|     },
      90|     {
      91|       code: `await expect(page.locator('[data-testid="top"]')).toContainText(firstRule)`,
```

**verdict:**

---

## 9. playwright-community-eslint-plugin-playwright — src/rules/prefer-native-locators.test.ts:88

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
      83|     },
      84|     // Works when used inside an assertion
      85|     {
      86|       code: `await expect(page.locator('[role="alert"]')).toBeVisible()`,
      87|       errors: [{ column: 14, line: 1, messageId: 'unexpectedRoleQuery' }],
>>>   88|       output: 'await expect(page.getByRole("alert")).toBeVisible()',
      89|     },
      90|     {
      91|       code: `await expect(page.locator('[data-testid="top"]')).toContainText(firstRule)`,
      92|       errors: [{ column: 14, line: 1, messageId: 'unexpectedTestIdQuery' }],
      93|       output: 'await expect(page.getByTestId("top")).toContainText(firstRule)',
```

**verdict:**

---
