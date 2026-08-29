# QA-TEST-002 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/keycloak.spec.ts:35

**Message:** Skipped test without justification: `test.skip(`.

```
      30|       })
      31|     })
      32|
      33|     await test.step("should logout", async () => {
      34|       // TODO: Enable the test
>>>   35|       test.skip(
      36|         true,
      37|         "The session isn't cleared after signout, until the next page load"
      38|       )
      39|       await page
      40|         .getByRole("banner")
```

**verdict:**

---

## 2. vitejs-vite — packages/vite/src/node/ssr/**tests**/ssrLoadModule.spec.ts:188

**Message:** Skipped test without justification: `test.skip(`.

```
     183| })
     184|
     185| // skip for now as rolldown returns different error message from esbuild
     186| // related: https://github.com/oxc-project/oxc/issues/7261
     187| // (rolldown does not set the properties passed from Oxc)
>>>  188| test.skip('parse error', async () => {
     189|   const server = await createDevServer()
     190|
     191|   function stripRoot(s?: string) {
     192|     return (s || '').replace(server.config.root, '<root>')
     193|   }
```

**verdict:**

---

## 3. vitejs-vite — playground/css-codesplit-cjs/**tests**/css-codesplit-cjs.spec.ts:4

**Message:** Skipped test without justification: `test.skip(`.

```
       1| import { describe, expect, test } from 'vitest'
       2| import { findAssetFile, getColor, isBuild, readManifest } from '~utils'
       3|
>>>    4| test.skip('should load both stylesheets', async () => {
       5|   expect(await getColor('h1')).toBe('red')
       6|   expect(await getColor('h2')).toBe('blue')
       7| })
       8|
       9| describe.runIf(isBuild).skip('build', () => {
```

**verdict:**

---

## 4. vitejs-vite — playground/hmr-full-bundle-mode/**tests**/hmr-full-bundle-mode.spec.ts:459

**Message:** Skipped test without justification: `test.skip(`.

```
     454|     )
     455|     expect(response.status()).toBe(500)
     456|   })
     457|
     458|   // Blocked by https://github.com/rolldown/rolldown/issues/10340
>>>  459|   test.skip('chained invalidate in an import cycle settles', async () => {
     460|     const original = readFile('cycle-a.js')
     461|     onTestFinished(async () => {
     462|       addFile('cycle-a.js', original)
     463|       await page.reload()
     464|       await expect.poll(() => page.textContent('.cycle')).toBe('cycle')
```

**verdict:**

---

## 5. vitejs-vite — playground/ssr-deps/**tests**/ssr-deps.spec.ts:134

**Message:** Skipped test without justification: `test.skip(`.

```
     129| describe.runIf(isServe)('hmr', () => {
     130|   // TODO: the server file is not imported on the client at all
     131|   // so it's not present in the client moduleGraph anymore
     132|   // we need to decide if we want to support a usecase when ssr change
     133|   // affects the client in any way
>>>  134|   test.skip('handle isomorphic module updates', async () => {
     135|     await page.goto(url)
     136|
     137|     expect(await page.textContent('.isomorphic-module-server')).toMatch(
     138|       '[server]',
     139|     )
```

**verdict:**

---

## 6. vitejs-vite — playground/worker/**tests**/relative-base/worker-relative-base.spec.ts:30

**Message:** Skipped test without justification: `test.skip(`.

```
      25| test('TS output', async () => {
      26|   await expect.poll(() => page.textContent('.pong-ts-output')).toMatch('pong')
      27| })
      28|
      29| // TODO: inline worker should inline assets
>>>   30| test.skip('inlined', async () => {
      31|   await expect.poll(() => page.textContent('.pong-inline')).toMatch('pong')
      32| })
      33|
      34| test('shared worker', async () => {
      35|   await expect.poll(() => page.textContent('.tick-count')).toMatch('pong')
```

**verdict:**

---

## 7. sveltejs-kit — packages/kit/src/runtime/server/page/csp.spec.js:46

**Message:** Skipped test without justification: `test.skip(`.

```
      41| 			"default-src 'self'; style-src-attr 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; report-uri /; style-src 'self' 'unsafe-inline'"
      42| 		);
      43| 	});
      44|
      45| 	// TODO: re-enable when we support strict-dynamic in dev again
>>>   46| 	test.skip('removes strict-dynamic', () => {
      47| 		['default-src', 'script-src'].forEach((name) => {
      48| 			const csp = new Csp(
      49| 				{
      50| 					mode: 'hash',
      51| 					directives: {
```

**verdict:**

---

## 8. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:5

**Message:** Skipped test without justification: `test.skip(`.

```
       1| import process from 'node:process';
       2| import { expect } from '@playwright/test';
       3| import { test } from '../../../utils.js';
       4|
>>>    5| test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);
       6|
       7| test.describe('remote functions', () => {
       8| 	test('preloading data works when the page component and server load both import a remote function', async ({
       9| 		page,
      10| 		clicknav
```

**verdict:**

---

## 9. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:12

**Message:** Skipped test without justification: `test.skip(`.

```
       7| test.describe('remote functions', () => {
       8| 	test('preloading data works when the page component and server load both import a remote function', async ({
       9| 		page,
      10| 		clicknav
      11| 	}) => {
>>>   12| 		test.skip(!process.env.DEV, 'remote functions are only analysed in dev mode');
      13| 		await page.goto('/remote/dev');
      14| 		await page.locator('a[href="/remote/dev/preload"]').hover();
      15| 		await Promise.all([
      16| 			page.waitForTimeout(100), // wait for preloading to start
      17| 			page.waitForLoadState('networkidle') // wait for preloading to finish
```

**verdict:**

---

## 10. sveltejs-kit — packages/kit/test/apps/async/test/server.test.js:8

**Message:** Skipped test without justification: `test.skip(`.

```
       3| import path from 'node:path';
       4| import { fileURLToPath } from 'node:url';
       5| import { expect } from '@playwright/test';
       6| import { test } from '../../../utils.js';
       7|
>>>    8| test.skip(({ javaScriptEnabled }) => javaScriptEnabled);
       9|
      10| const root = path.resolve(fileURLToPath(import.meta.url), '..', '..');
      11|
      12| test.describe('remote functions', () => {
      13| 	test("doesn't write bundle to disk when treeshaking prerendered remote functions", () => {
```

**verdict:**

---

## 11. sveltejs-kit — packages/kit/test/apps/async/test/server.test.js:14

**Message:** Skipped test without justification: `test.skip(`.

```
       9|
      10| const root = path.resolve(fileURLToPath(import.meta.url), '..', '..');
      11|
      12| test.describe('remote functions', () => {
      13| 	test("doesn't write bundle to disk when treeshaking prerendered remote functions", () => {
>>>   14| 		test.skip(!!process.env.DEV, 'only applicable after build');
      15| 		expect(fs.existsSync(path.join(root, 'dist'))).toBe(false);
      16| 	});
      17|
      18| 	test('non-dynamic prerendered remote functions are treeshaken', () => {
      19| 		test.skip(!!process.env.DEV, 'only applicable after build');
```

**verdict:**

---

## 12. sveltejs-kit — packages/kit/test/apps/async/test/server.test.js:19

**Message:** Skipped test without justification: `test.skip(`.

```
      14| 		test.skip(!!process.env.DEV, 'only applicable after build');
      15| 		expect(fs.existsSync(path.join(root, 'dist'))).toBe(false);
      16| 	});
      17|
      18| 	test('non-dynamic prerendered remote functions are treeshaken', () => {
>>>   19| 		test.skip(!!process.env.DEV, 'only applicable after build');
      20| 		const code = fs.readFileSync(
      21| 			path.join(root, '.svelte-kit', 'output', 'server', 'chunks', 'prerender.remote.js')
      22| 		);
      23| 		expect(code.includes('const with_read = prerender(')).toBe(false);
      24| 	});
```

**verdict:**

---

## 13. sveltejs-kit — packages/kit/test/apps/async/test/server.test.js:27

**Message:** Skipped test without justification: `test.skip(`.

```
      22| 		);
      23| 		expect(code.includes('const with_read = prerender(')).toBe(false);
      24| 	});
      25|
      26| 	test('non-dynamic prerendered remote functions with colliding basenames are treeshaken', () => {
>>>   27| 		test.skip(!!process.env.DEV, 'only applicable after build');
      28|
      29| 		const chunks = path.join(root, '.svelte-kit', 'output', 'server', 'chunks');
      30|
      31| 		const code = fs
      32| 			.globSync(`${chunks}/*.js`)
```

**verdict:**

---

## 14. sveltejs-kit — packages/kit/test/apps/async/test/server.test.js:50

**Message:** Skipped test without justification: `test.skip(`.

```
      45| 		expect(maps).toContain('++invocations');
      46| 		expect(maps).toContain("() => 'hello'");
      47| 	});
      48|
      49| 	test("doesn't duplicate remote modules in the generated manifest", () => {
>>>   50| 		test.skip(!!process.env.DEV, 'only applicable after build');
      51| 		const code = fs.readFileSync(
      52| 			path.join(root, '.svelte-kit', 'output', 'server', 'manifest.js'),
      53| 			'utf8'
      54| 		);
      55| 		const hashes = [
```

**verdict:**

---

## 15. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:7

**Message:** Skipped test without justification: `test.skip(`.

```
       2| import { expect } from '@playwright/test';
       3| import { test } from '../../../utils.js';
       4|
       5| /** @typedef {import('@playwright/test').Response} Response */
       6|
>>>    7| test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);
       8|
       9| test.describe.configure({ mode: 'parallel' });
      10|
      11| test.describe('a11y', () => {
      12| 	test('applies autofocus after an enhanced form submit', async ({ page }) => {
```

**verdict:**

---

## 16. sveltejs-kit — packages/kit/test/apps/basics/test/cross-platform/client.test.js:7

**Message:** Skipped test without justification: `test.skip(`.

```
       2| import { expect } from '@playwright/test';
       3| import { test } from '../../../../utils.js';
       4|
       5| /** @typedef {{ fromScroll: { x: number, y: number }, toScroll: { x: number, y: number }, type: string }} ScrollState */
       6|
>>>    7| test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);
       8|
       9| test.describe.configure({ mode: 'parallel' });
      10|
      11| test.describe('a11y', () => {
      12| 	test('resets focus', async ({ page, clicknav, browserName }) => {
```

**verdict:**

---

## 17. sveltejs-kit — packages/kit/test/apps/basics/test/cross-platform/server.test.js:6

**Message:** Skipped test without justification: `test.skip(`.

```
       1| import { expect } from '@playwright/test';
       2| import { test } from '../../../../utils.js';
       3|
       4| /** @typedef {import('@playwright/test').Response} Response */
       5|
>>>    6| test.skip(({ javaScriptEnabled }) => javaScriptEnabled);
       7|
       8| test.describe.configure({ mode: 'parallel' });
       9|
      10| test.describe('Static files', () => {
      11| 	test('Filenames are case-sensitive', async ({ request }) => {
```

**verdict:**

---

## 18. sveltejs-kit — packages/kit/test/apps/basics/test/server.test.js:11

**Message:** Skipped test without justification: `test.skip(`.

```
       6| import { fileURLToPath } from 'node:url';
       7| import path from 'node:path';
       8|
       9| /** @typedef {import('@playwright/test').Response} Response */
      10|
>>>   11| test.skip(({ javaScriptEnabled }) => javaScriptEnabled);
      12|
      13| test.describe.configure({ mode: 'parallel' });
      14|
      15| test.describe('Caching', () => {
      16| 	test('caches pages', async ({ request }) => {
```

**verdict:**

---

## 19. sveltejs-kit — packages/kit/test/apps/basics/test/server.test.js:1156

**Message:** Skipped test without justification: `test.skip(`.

```
    1151|
    1152| const root = path.resolve(fileURLToPath(import.meta.url), '..', '..');
    1153|
    1154| test.describe('$app/env', () => {
    1155| 	test('treeshakes dev check', async () => {
>>> 1156| 		test.skip(!!process.env.DEV, 'skip when in dev mode');
    1157|
    1158| 		const code = fs.readFileSync(
    1159| 			path.join(root, '.svelte-kit/output/server/entries/pages/treeshaking/dev/_page.svelte.js'),
    1160| 			'utf-8'
    1161| 		);
```

**verdict:**

---

## 20. sveltejs-kit — packages/kit/test/apps/basics/test/server.test.js:1166

**Message:** Skipped test without justification: `test.skip(`.

```
    1161| 		);
    1162| 		expect(code).not.toContain('not prod');
    1163| 	});
    1164|
    1165| 	test('treeshakes browser check', async () => {
>>> 1166| 		test.skip(!!process.env.DEV, 'skip when in dev mode');
    1167|
    1168| 		const code = fs.readFileSync(
    1169| 			path.join(
    1170| 				root,
    1171| 				'.svelte-kit/output/server/entries/pages/treeshaking/browser/_page.svelte.js'
```

**verdict:**

---
