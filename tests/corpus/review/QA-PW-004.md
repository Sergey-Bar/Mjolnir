# QA-PW-004 — Sample Findings for Classification

Total sampled: 6 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. vitejs-vite — playground/backend-integration/**tests**/backend-integration.spec.ts:29

**Message:** Brittle multi-class CSS selector: `locator('.asset-reference.outside-root .asset-preview')`.

```
      24| describe('asset imports from js', () => {
      25|   test('file outside root', async () => {
      26|     // assert valid image src https://github.com/microsoft/playwright/issues/6046#issuecomment-1799585719
      27|     await vi.waitUntil(() =>
      28|       page
>>>   29|         .locator('.asset-reference.outside-root .asset-preview')
      30|         .evaluate((el: HTMLImageElement) => el.naturalWidth > 0),
      31|     )
      32|
      33|     const text = await page.textContent(
      34|       '.asset-reference.outside-root .asset-url',
```

**verdict:**

---

## 2. grafana-grafana — e2e-playwright/various-suite/prometheus-config.spec.ts:30

**Message:** Brittle multi-class CSS selector: `locator(`#${selectors.components.DataSource.Prometheus.confi`.

```
      25|         selectors.components.DataSource.Prometheus.configPage.connectionSettings
      26|       );
      27|       await expect(connectionSettings).toBeVisible();
      28|
      29|       // managed alerts
>>>   30|       const manageAlerts = page.locator(`#${selectors.components.DataSource.Prometheus.configPage.manageAlerts}`);
      31|       await expect(manageAlerts).toBeVisible();
      32|
      33|       // scrape interval
      34|       const scrapeInterval = configPage.getByGrafanaSelector(
      35|         selectors.components.DataSource.Prometheus.configPage.scrapeInterval
```

**verdict:**

---

## 3. grafana-grafana — e2e-playwright/various-suite/prometheus-config.spec.ts:52

**Message:** Brittle multi-class CSS selector: `locator(
        `#${selectors.components.DataSource.Prometh`.

```
      47|         selectors.components.DataSource.Prometheus.configPage.defaultEditor
      48|       );
      49|       await expect(defaultEditor).toBeVisible();
      50|
      51|       // disable metric lookup
>>>   52|       const disableMetricLookup = page.locator(
      53|         `#${selectors.components.DataSource.Prometheus.configPage.disableMetricLookup}`
      54|       );
      55|       await expect(disableMetricLookup).toBeVisible();
      56|
      57|       // prometheus type
```

**verdict:**

---

## 4. grafana-grafana — e2e-playwright/various-suite/prometheus-config.spec.ts:70

**Message:** Brittle multi-class CSS selector: `locator(
        `#${selectors.components.DataSource.Prometh`.

```
      65|         selectors.components.DataSource.Prometheus.configPage.cacheLevel
      66|       );
      67|       await expect(cacheLevel).toBeVisible();
      68|
      69|       // incremental querying
>>>   70|       const incrementalQuerying = page.locator(
      71|         `#${selectors.components.DataSource.Prometheus.configPage.incrementalQuerying}`
      72|       );
      73|       await expect(incrementalQuerying).toBeVisible();
      74|
      75|       // disable recording rules
```

**verdict:**

---

## 5. grafana-grafana — e2e-playwright/various-suite/prometheus-config.spec.ts:76

**Message:** Brittle multi-class CSS selector: `locator(
        `#${selectors.components.DataSource.Prometh`.

```
      71|         `#${selectors.components.DataSource.Prometheus.configPage.incrementalQuerying}`
      72|       );
      73|       await expect(incrementalQuerying).toBeVisible();
      74|
      75|       // disable recording rules
>>>   76|       const disableRecordingRules = page.locator(
      77|         `#${selectors.components.DataSource.Prometheus.configPage.disableRecordingRules}`
      78|       );
      79|       await expect(disableRecordingRules).toBeVisible();
      80|
      81|       // custom query parameters
```

**verdict:**

---

## 6. grafana-grafana — e2e-playwright/various-suite/prometheus-config.spec.ts:199

**Message:** Brittle multi-class CSS selector: `locator(
        `#${selectors.components.DataSource.Prometh`.

```
     194|         type: 'prometheus',
     195|         name: DATASOURCE_NAME,
     196|       });
     197|
     198|       // Check the incremental querying checkbox
>>>  199|       const incrementalQuerying = page.locator(
     200|         `#${selectors.components.DataSource.Prometheus.configPage.incrementalQuerying}`
     201|       );
     202|       await expect(incrementalQuerying).toBeVisible();
     203|       await incrementalQuerying.check({ force: true });
     204|
```

**verdict:**

---
