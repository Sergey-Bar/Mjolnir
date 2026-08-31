# QA-PW-107 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

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

## 10. grafana-grafana — e2e-playwright/dashboards-suite/dashboard-browse.spec.ts:77

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
      72|         .click();
      73|       // await page.getByTestId(selectors.pages.BrowseDashboards.NewFolderForm.form).getByRole('button', { name: 'Create' }).click({ force: true });
      74|
      75|       // Verify success alert and close it
      76|       const alert = page.getByTestId(selectors.components.Alert.alertV2('success'));
>>>   77|       await expect(alert).toBeVisible();
      78|       await alert.getByLabel('Close alert').click();
      79|       await expect(page.getByRole('heading', { name: 'My new folder' })).toBeVisible();
      80|
      81|       // Delete the folder and expect to go back to the root
      82|       await page.getByRole('button', { name: 'Folder actions' }).click();
```

**verdict:**

---

## 11. grafana-grafana — e2e-playwright/dashboards-suite/dashboard-export-image.spec.ts:45

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
      40|       // Verify we're on the export image view
      41|       await expect(page).toHaveURL(/.*shareView=image/);
      42|
      43|       // Verify the "renderer not available" alert is displayed
      44|       const rendererAlert = page.getByRole('status');
>>>   45|       await expect(rendererAlert).toBeVisible();
      46|       await expect(rendererAlert).toContainText(/Image renderer plugin not installed/i);
      47|       await expect(rendererAlert).toContainText(
      48|         /To render an image, you must install the Grafana image renderer plugin/i
      49|       );
      50|
```

**verdict:**

---

## 12. grafana-grafana — e2e-playwright/dashboards-suite/dashboard-restore-permissions.spec.ts:134

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     129|         });
     130|
     131|         await restoreFromRecentlyDeleted(page, selectors, dashName);
     132|
     133|         const errorToast = page.getByTestId(selectors.components.Alert.alertV2('error'));
>>>  134|         await expect(errorToast).toBeVisible();
     135|         await expect(errorToast).toContainText(
     136|           "You don't have permission to add dashboards to the selected folder. Choose a folder where you have edit permissions, or ask an administrator to restore the dashboards."
     137|         );
     138|       });
     139|
```

**verdict:**

---

## 13. grafana-grafana — e2e-playwright/dashboards-suite/dashboard-restore-permissions.spec.ts:165

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     160|         });
     161|
     162|         await restoreFromRecentlyDeleted(page, selectors, dashName);
     163|
     164|         const errorToast = page.getByTestId(selectors.components.Alert.alertV2('error'));
>>>  165|         await expect(errorToast).toBeVisible();
     166|         await expect(errorToast).toContainText(
     167|           "The dashboards could no longer be found or you don't have permission to restore them. Ask an administrator to restore them."
     168|         );
     169|       });
     170|     });
```

**verdict:**

---

## 14. grafana-grafana — e2e-playwright/dashboards-suite/dashboard-restore-v1.spec.ts:265

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     260|         await dashB1Row.getByRole('checkbox').click({ force: true });
     261|
     262|         // Delete all selected
     263|         await page.getByRole('button', { name: 'Delete' }).click();
     264|         // Wait for the delete modal to finish loading folder contents.
>>>  265|         await expect(page.getByRole('alert', { name: /contains resources that will be deleted/i })).toBeVisible();
     266|         await page.getByPlaceholder('Type "Delete" to confirm').fill('Delete');
     267|         await page.getByTestId(selectors.pages.ConfirmModal.delete).click();
     268|
     269|         // Verify success (may get multiple alerts for folder + dashboard deletion)
     270|         await expect(page.getByTestId(selectors.components.Alert.alertV2('success')).first()).toBeVisible();
```

**verdict:**

---

## 15. grafana-grafana — e2e-playwright/dashboards-suite/dashboard-restore-v2.spec.ts:151

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     146|       await expect(folderRow).toBeVisible();
     147|       await folderRow.getByRole('checkbox').click({ force: true });
     148|
     149|       await page.getByRole('button', { name: 'Delete' }).click();
     150|       // Wait for the delete modal to finish loading folder contents.
>>>  151|       await expect(page.getByRole('alert', { name: /contains resources that will be deleted/i })).toBeVisible();
     152|       await page.getByPlaceholder('Type "Delete" to confirm').fill('Delete');
     153|       await page.getByTestId(selectors.pages.ConfirmModal.delete).click();
     154|
     155|       await expect(page.getByTestId(selectors.components.Alert.alertV2('success')).first()).toBeVisible();
     156|
```

**verdict:**

---

## 16. grafana-grafana — e2e-playwright/panels-suite/annotations-clustering.spec.ts:219

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     214|       });
     215|
     216|       const clusteringDisabled = dashboardPage.getByGrafanaSelector(
     217|         selectors.components.Panels.Panel.title('Alert annos clustering')
     218|       );
>>>  219|       await expect(clusteringDisabled, `Alert annos clustering should be visible`).toBeVisible();
     220|       const markersLocator = clusteringDisabled.getByTestId(selectors.pages.Dashboard.Annotations.marker);
     221|       await expect(markersLocator).toHaveCount(1);
     222|       await markersLocator.click();
     223|       const tooltip = dashboardPage.getByGrafanaSelector(selectors.pages.Dashboard.Annotations.clusterTooltip);
     224|       await expect(tooltip).toBeVisible();
```

**verdict:**

---

## 17. grafana-grafana — e2e-playwright/panels-suite/annotations-clustering.spec.ts:224

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     219|       await expect(clusteringDisabled, `Alert annos clustering should be visible`).toBeVisible();
     220|       const markersLocator = clusteringDisabled.getByTestId(selectors.pages.Dashboard.Annotations.marker);
     221|       await expect(markersLocator).toHaveCount(1);
     222|       await markersLocator.click();
     223|       const tooltip = dashboardPage.getByGrafanaSelector(selectors.pages.Dashboard.Annotations.clusterTooltip);
>>>  224|       await expect(tooltip).toBeVisible();
     225|
     226|       // cluster header
     227|       await expect(
     228|         tooltip.getByText(/2025-10-02 \d\d:08:15 - 2025-10-02 \d\d:35:40/),
     229|         'cluster header time range is visible'
```

**verdict:**

---

## 18. grafana-grafana — e2e-playwright/panels-suite/annotations-clustering.spec.ts:227

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     222|       await markersLocator.click();
     223|       const tooltip = dashboardPage.getByGrafanaSelector(selectors.pages.Dashboard.Annotations.clusterTooltip);
     224|       await expect(tooltip).toBeVisible();
     225|
     226|       // cluster header
>>>  227|       await expect(
     228|         tooltip.getByText(/2025-10-02 \d\d:08:15 - 2025-10-02 \d\d:35:40/),
     229|         'cluster header time range is visible'
     230|       ).toBeVisible();
     231|       await expect(tooltip.getByText('11 annotations'), 'cluster header annotation count is visible').toBeVisible();
     232|       // alert specific text
```

**verdict:**

---

## 19. grafana-grafana — e2e-playwright/panels-suite/annotations-clustering.spec.ts:231

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     226|       // cluster header
     227|       await expect(
     228|         tooltip.getByText(/2025-10-02 \d\d:08:15 - 2025-10-02 \d\d:35:40/),
     229|         'cluster header time range is visible'
     230|       ).toBeVisible();
>>>  231|       await expect(tooltip.getByText('11 annotations'), 'cluster header annotation count is visible').toBeVisible();
     232|       // alert specific text
     233|       await expect(tooltip.getByText(/ALERTING2025-10-02 \d\d:08:15/), 'custom alert text is visible').toBeVisible();
     234|       await expect(
     235|         tooltip.getByRole('link', { name: 'loki-prod-020-writes-error' }),
     236|         'html link is rendered'
```

**verdict:**

---

## 20. grafana-grafana — e2e-playwright/panels-suite/annotations-clustering.spec.ts:233

**Message:** `toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.

```
     228|         tooltip.getByText(/2025-10-02 \d\d:08:15 - 2025-10-02 \d\d:35:40/),
     229|         'cluster header time range is visible'
     230|       ).toBeVisible();
     231|       await expect(tooltip.getByText('11 annotations'), 'cluster header annotation count is visible').toBeVisible();
     232|       // alert specific text
>>>  233|       await expect(tooltip.getByText(/ALERTING2025-10-02 \d\d:08:15/), 'custom alert text is visible').toBeVisible();
     234|       await expect(
     235|         tooltip.getByRole('link', { name: 'loki-prod-020-writes-error' }),
     236|         'html link is rendered'
     237|       ).toBeVisible();
     238|       // tags
```

**verdict:**

---
