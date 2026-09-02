# QA-PW-004 — Sample Findings for Classification

Total sampled: 16 (max 20 per rule)

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

## 7. hashicorp-vault — ui/e2e/tests/superuser/access/entities.spec.ts:45

**Message:** Brittle multi-class CSS selector: `locator('div:nth-child(2) > .column.is-flex-center')`.

```
      40|     await page.getByRole('button', { name: 'Create' }).click();
      41|   });
      42|
      43|   await test.step('should display entity detail page', async () => {
      44|     await expect(page.getByRole('heading', { name: 'entity-' })).toContainText('entity-1');
>>>   45|     await page.locator('div:nth-child(2) > .column.is-flex-center').click();
      46|     await expect(page.getByText('Name entity-')).toBeVisible();
      47|   });
      48|
      49|   await test.step('should display correct entity information on each tab', async () => {
      50|     // Aliases tab
```

**verdict:**

---

## 8. hashicorp-vault — ui/e2e/tests/superuser/access/groups.spec.ts:45

**Message:** Brittle multi-class CSS selector: `locator('div:nth-child(2) > .column.is-flex-center')`.

```
      40|     await page.getByRole('button', { name: 'Create' }).click();
      41|   });
      42|
      43|   await test.step('should display group detail page', async () => {
      44|     await expect(page.getByRole('heading', { name: 'group-' })).toContainText('group-1');
>>>   45|     await page.locator('div:nth-child(2) > .column.is-flex-center').click();
      46|     await expect(page.getByText('Name group-')).toBeVisible();
      47|   });
      48|
      49|   await test.step('should display correct group information on each tab', async () => {
      50|     // Policies tab
```

**verdict:**

---

## 9. positive-fixtures — QA-PW-004/structural-chains.spec.ts:5

**Message:** Brittle multi-class CSS selector: `locator("div:nth-child(3) > .user-card.profile-link")`.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("renders user cards", async ({ page }) => {
       4|   await page.goto("/users");
>>>    5|   await page.locator("div:nth-child(3) > .user-card.profile-link").click();
       6|   await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
       7| });
       8|
       9| test("opens settings tab", async ({ page }) => {
      10|   await page.goto("/settings");
```

**verdict:**

---

## 10. positive-fixtures — QA-PW-004/structural-chains.spec.ts:11

**Message:** Brittle multi-class CSS selector: `locator("div > .tab-panel > .tab.active")`.

```
       6|   await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
       7| });
       8|
       9| test("opens settings tab", async ({ page }) => {
      10|   await page.goto("/settings");
>>>   11|   await page.locator("div > .tab-panel > .tab.active").click();
      12| });
      13|
      14| test("selects nested option", async ({ page }) => {
      15|   await page.locator("ul.menu > li:nth-child(2) > ul > li:nth-child(3) > a").click();
      16|   await expect(page.getByText("Option selected")).toBeVisible();
```

**verdict:**

---

## 11. positive-fixtures — QA-PW-004/structural-chains.spec.ts:11

**Message:** Brittle deep structural CSS selector: `locator("div > .tab-panel > .tab.active")`.

```
       6|   await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
       7| });
       8|
       9| test("opens settings tab", async ({ page }) => {
      10|   await page.goto("/settings");
>>>   11|   await page.locator("div > .tab-panel > .tab.active").click();
      12| });
      13|
      14| test("selects nested option", async ({ page }) => {
      15|   await page.locator("ul.menu > li:nth-child(2) > ul > li:nth-child(3) > a").click();
      16|   await expect(page.getByText("Option selected")).toBeVisible();
```

**verdict:**

---

## 12. positive-fixtures — QA-PW-004/structural-chains.spec.ts:15

**Message:** Brittle deep structural CSS selector: `locator("ul.menu > li:nth-child(2) > ul > li:nth-child(3) > `.

```
      10|   await page.goto("/settings");
      11|   await page.locator("div > .tab-panel > .tab.active").click();
      12| });
      13|
      14| test("selects nested option", async ({ page }) => {
>>>   15|   await page.locator("ul.menu > li:nth-child(2) > ul > li:nth-child(3) > a").click();
      16|   await expect(page.getByText("Option selected")).toBeVisible();
      17| });
      18|
      19| test("clicks styled row", async ({ page }) => {
      20|   await page.locator("tr:nth-child(4) > td:nth-child(2) > .row-highlight.link").click();
```

**verdict:**

---

## 13. positive-fixtures — QA-PW-004/structural-chains.spec.ts:20

**Message:** Brittle multi-class CSS selector: `locator("tr:nth-child(4) > td:nth-child(2) > .row-highlight.`.

```
      15|   await page.locator("ul.menu > li:nth-child(2) > ul > li:nth-child(3) > a").click();
      16|   await expect(page.getByText("Option selected")).toBeVisible();
      17| });
      18|
      19| test("clicks styled row", async ({ page }) => {
>>>   20|   await page.locator("tr:nth-child(4) > td:nth-child(2) > .row-highlight.link").click();
      21| });
      22|
      23| test("styled button chain", async ({ page }) => {
      24|   await page.locator("form > fieldset > div.options > label.active > input").check();
      25| });
```

**verdict:**

---

## 14. positive-fixtures — QA-PW-004/structural-chains.spec.ts:20

**Message:** Brittle deep structural CSS selector: `locator("tr:nth-child(4) > td:nth-child(2) > .row-highlight.`.

```
      15|   await page.locator("ul.menu > li:nth-child(2) > ul > li:nth-child(3) > a").click();
      16|   await expect(page.getByText("Option selected")).toBeVisible();
      17| });
      18|
      19| test("clicks styled row", async ({ page }) => {
>>>   20|   await page.locator("tr:nth-child(4) > td:nth-child(2) > .row-highlight.link").click();
      21| });
      22|
      23| test("styled button chain", async ({ page }) => {
      24|   await page.locator("form > fieldset > div.options > label.active > input").check();
      25| });
```

**verdict:**

---

## 15. positive-fixtures — QA-PW-004/structural-chains.spec.ts:24

**Message:** Brittle deep structural CSS selector: `locator("form > fieldset > div.options > label.active > inpu`.

```
      19| test("clicks styled row", async ({ page }) => {
      20|   await page.locator("tr:nth-child(4) > td:nth-child(2) > .row-highlight.link").click();
      21| });
      22|
      23| test("styled button chain", async ({ page }) => {
>>>   24|   await page.locator("form > fieldset > div.options > label.active > input").check();
      25| });
      26|
      27| test("deep table drill", async ({ page }) => {
      28|   await page.locator("table > tbody > tr:nth-child(2) > td:nth-child(3) > a.details").click();
      29| });
```

**verdict:**

---

## 16. positive-fixtures — QA-PW-004/structural-chains.spec.ts:28

**Message:** Brittle deep structural CSS selector: `locator("table > tbody > tr:nth-child(2) > td:nth-child(3) >`.

```
      23| test("styled button chain", async ({ page }) => {
      24|   await page.locator("form > fieldset > div.options > label.active > input").check();
      25| });
      26|
      27| test("deep table drill", async ({ page }) => {
>>>   28|   await page.locator("table > tbody > tr:nth-child(2) > td:nth-child(3) > a.details").click();
      29| });
```

**verdict:**

---
