# QA-PW-005 — Sample Findings for Classification

Total sampled: 17 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1741

**Message:** Branching logic inside page.evaluate().

```
    1736| 		if (process.env.DEV) return;
    1737|
    1738| 		await page.goto('/');
    1739|
    1740| 		expect(
>>> 1741| 			await page.evaluate(() => {
    1742| 				/** @type {HTMLLinkElement[]} */
    1743| 				const links = Array.from(document.head.querySelectorAll('link[rel=stylesheet]'));
    1744|
    1745| 				for (let i = 0; i < links.length;) {
    1746| 					const link = links.shift();
```

**verdict:**

---

## 2. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:2652

**Message:** Branching logic inside page.evaluate().

```
    2647| test.describe('INP', () => {
    2648| 	test('does not block next paint', async ({ page }) => {
    2649| 		// Thanks to https://publishing-project.rivendellweb.net/measuring-performance-tasks-with-playwright/#interaction-to-next-paint-inp
    2650| 		/** @param {string} selector */
    2651| 		async function measureInteractionToPaint(selector) {
>>> 2652| 			return page.evaluate(async (selector) => {
    2653| 				return new Promise((resolve) => {
    2654| 					const startTime = performance.now();
    2655| 					const element = document.querySelector(selector);
    2656| 					if (element instanceof HTMLAnchorElement) {
    2657| 						element.click();
```

**verdict:**

---

## 3. sveltejs-kit — packages/kit/test/apps/basics/test/cross-platform/client.test.js:72

**Message:** Branching logic inside page.evaluate().

```
      67|
      68| 	test('reset selection', async ({ page, clicknav }) => {
      69| 		await page.goto('/selection/a');
      70|
      71| 		expect(
>>>   72| 			await page.evaluate(() => {
      73| 				const range = document.createRange();
      74| 				range.selectNodeContents(document.body);
      75| 				const selection = getSelection();
      76| 				if (selection) {
      77| 					selection.removeAllRanges();
```

**verdict:**

---

## 4. sveltejs-kit — packages/kit/test/apps/basics/test/cross-platform/client.test.js:91

**Message:** Branching logic inside page.evaluate().

```
      86|
      87| 		// the selection is reset in a `setTimeout` that runs after navigation completes,
      88| 		// so we poll until the ranges have been cleared rather than checking immediately
      89| 		await expect
      90| 			.poll(() =>
>>>   91| 				page.evaluate(() => {
      92| 					const selection = getSelection();
      93| 					if (selection) {
      94| 						return selection.rangeCount;
      95| 					}
      96| 					return -1;
```

**verdict:**

---

## 5. withastro-astro — packages/astro/e2e/prefetch.test.ts:358

**Message:** Branching logic inside page.evaluate().

```
     353| test.describe('Prefetch (default), Experimental ({ clientPrerender: true })', () => {
     354| 	/**
     355| 	 * @returns the number of script[type=speculationrules] that have the url
     356| 	 */
     357| 	async function scriptIsInHead(page: Page, url: string) {
>>>  358| 		return await page.evaluate((testUrl) => {
     359| 			const scripts = document.head.querySelectorAll('script[type="speculationrules"]');
     360| 			let count = 0;
     361| 			for (const script of scripts) {
     362| 				const speculationRules: { prerender: { urls: string[] }[] } = JSON.parse(
     363| 					script.textContent!,
```

**verdict:**

---

## 6. withastro-astro — packages/astro/e2e/view-transitions.test.ts:49

**Message:** Branching logic inside page.evaluate().

```
      44| 		window.dispatchEvent(new Event('scroll'));
      45| 	});
      46| }
      47|
      48| function collectPreloads(page: Page) {
>>>   49| 	return page.evaluate(() => {
      50| 		window.preloads = [];
      51| 		const observer = new MutationObserver((mutations) => {
      52| 			mutations.forEach((mutation) =>
      53| 				mutation.addedNodes.forEach((node) => {
      54| 					const link = node as HTMLLinkElement;
```

**verdict:**

---

## 7. withastro-astro — packages/astro/e2e/view-transitions.test.ts:735

**Message:** Branching logic inside page.evaluate().

```
     730| 		await page.goto(astro.resolveUrl('/island-svelte-one'));
     731|
     732| 		const cssStyle = page.locator('style[data-vite-dev-id*="client-router-hmr.css"]');
     733| 		await expect(cssStyle).toHaveCount(1);
     734| 		await cssStyle.evaluate((element) => (element.dataset.hmrStyle = 'css'));
>>>  735| 		await page.evaluate(() => {
     736| 			document.addEventListener(
     737| 				'astro:before-swap',
     738| 				(event) => {
     739| 					const incomingStyle = event.newDocument.querySelector<HTMLStyleElement>(
     740| 						'style[data-vite-dev-id*="client-router-hmr.css"]',
```

**verdict:**

---

## 8. puppeteer-puppeteer — test/src/autofill.test.ts:28

**Message:** Branching logic inside page.evaluate().

```
      23|           expiryYear: '2030',
      24|           cvc: '123',
      25|         },
      26|       });
      27|       expect(
>>>   28|         await page.evaluate(() => {
      29|           const result = [];
      30|           for (const el of document.querySelectorAll('input')) {
      31|             result.push(el.value);
      32|           }
      33|           return result.join(',');
```

**verdict:**

---

## 9. puppeteer-puppeteer — test/src/autofill.test.ts:53

**Message:** Branching logic inside page.evaluate().

```
      48|             {name: 'ADDRESS_HOME_ZIP', value: '12345'},
      49|           ],
      50|         },
      51|       });
      52|       expect(
>>>   53|         await page.evaluate(() => {
      54|           const result = [];
      55|           for (const el of document.querySelectorAll('input')) {
      56|             result.push(el.value);
      57|           }
      58|           return result.join(',');
```

**verdict:**

---

## 10. puppeteer-puppeteer — test/src/input.test.ts:78

**Message:** Branching logic inside page.evaluate().

```
      73|
      74|       const file = path.relative(process.cwd(), FILE_TO_UPLOAD);
      75|       await input.uploadFile(file);
      76|
      77|       expect(
>>>   78|         await input.evaluate(e => {
      79|           const file = e.files?.[0];
      80|           if (!file) {
      81|             throw new Error('No file found');
      82|           }
      83|
```

**verdict:**

---

## 11. puppeteer-puppeteer — test/src/keyboard.test.ts:428

**Message:** Branching logic inside page.evaluate().

```
     423|   it('should not type canceled events', async () => {
     424|     const {page, server} = await getTestState();
     425|
     426|     await page.goto(server.PREFIX + '/input/textarea.html');
     427|     await page.focus('textarea');
>>>  428|     await page.evaluate(() => {
     429|       window.addEventListener(
     430|         'keydown',
     431|         event => {
     432|           event.stopPropagation();
     433|           event.stopImmediatePropagation();
```

**verdict:**

---

## 12. puppeteer-puppeteer — test/src/locator.test.ts:695

**Message:** Branching logic inside page.evaluate().

```
     690|         ></div>`,
     691|       );
     692|
     693|       await page.locator('[role="switch"]').fill(true);
     694|       expect(
>>>  695|         await page.evaluate(() => {
     696|           // Verify the ARIA attribute was updated by the fill command
     697|           return (
     698|             document
     699|               .querySelector('[role="switch"]')
     700|               ?.getAttribute('aria-checked') === 'true'
```

**verdict:**

---

## 13. puppeteer-puppeteer — test/src/locator.test.ts:707

**Message:** Branching logic inside page.evaluate().

```
     702|         }),
     703|       ).toBe(true);
     704|
     705|       await page.locator('[role="switch"]').fill(false);
     706|       expect(
>>>  707|         await page.evaluate(() => {
     708|           return (
     709|             document
     710|               .querySelector('[role="switch"]')
     711|               ?.getAttribute('aria-checked') === 'false'
     712|           );
```

**verdict:**

---

## 14. puppeteer-puppeteer — test/src/mouse.test.ts:304

**Message:** Branching logic inside page.evaluate().

```
     299|
     300|   const addMouseDataListeners = (
     301|     page: Page,
     302|     options: AddMouseDataListenersOptions = {},
     303|   ) => {
>>>  304|     return page.evaluate(({includeMove}) => {
     305|       const clicks: ClickData[] = [];
     306|       const mouseEventListener = (event: MouseEvent) => {
     307|         clicks.push({
     308|           type: event.type,
     309|           detail: event.detail,
```

**verdict:**

---

## 15. puppeteer-puppeteer — test/src/oopif.test.ts:451

**Message:** Branching logic inside page.evaluate().

```
     446|       );
     447|     }
     448|     expect(page.frames()).toHaveLength(frameCount + 1);
     449|
     450|     // Start the teardown first so it lands while the per-frame calls run.
>>>  451|     const detached = page.evaluate(() => {
     452|       for (const frame of document.querySelectorAll('iframe')) {
     453|         frame.remove();
     454|       }
     455|     });
     456|     const exposed = page.exposeFunction('doubleIt', (value: number) => {
```

**verdict:**

---

## 16. puppeteer-puppeteer — test/src/waittask.test.ts:396

**Message:** Branching logic inside page.evaluate().

```
     391|     });
     392|
     393|     it('should work with removed MutationObserver', async () => {
     394|       const {page} = await getTestState();
     395|
>>>  396|       await page.evaluate(() => {
     397|         // @ts-expect-error We want to remove it for the test.
     398|         delete window.MutationObserver;
     399|       });
     400|       const [handle] = await Promise.all([
     401|         page.waitForSelector('.zombo'),
```

**verdict:**

---

## 17. puppeteer-puppeteer — test/src/webgl.test.ts:21

**Message:** Branching logic inside page.evaluate().

```
      16|     ],
      17|   });
      18|
      19|   describe('Create webgl context', function () {
      20|     it('should work', async () => {
>>>   21|       await state.page.evaluate(() => {
      22|         const canvas = document.createElement('canvas');
      23|         const gl = canvas.getContext('webgl');
      24|         if (!gl) {
      25|           throw new Error('WebGL context not created');
      26|         }
```

**verdict:**

---
