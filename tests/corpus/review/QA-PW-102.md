# QA-PW-102 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. vitejs-vite — playground/assets/**tests**/assets.spec.ts:640

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     635|     ? /\/foo\/bar\/assets\/img-[-\w]{8}\.png/
     636|     : '/foo/bar/import-meta-url/img.png'
     637|
     638|   expect(await page.textContent('.import-meta-url')).toMatch(imgMatch)
     639|   if (isServe) {
>>>  640|     const loadPromise = page.waitForEvent('load')
     641|     const newContent = readFile('import-meta-url/img-update.png', null)
     642|     let oldContent: Buffer
     643|     editFile('import-meta-url/img.png', null, (_oldContent) => {
     644|       oldContent = _oldContent
     645|       return newContent
```

**verdict:**

---

## 2. vitejs-vite — playground/assets/**tests**/assets.spec.ts:652

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     647|     await loadPromise // expect reload
     648|     await expect
     649|       .poll(() => page.textContent('.import-meta-url'))
     650|       .toMatch(imgMatch)
     651|
>>>  652|     const loadPromise2 = page.waitForEvent('load')
     653|     editFile('import-meta-url/img.png', null, (_) => oldContent)
     654|     await loadPromise2 // expect reload
     655|     await expect
     656|       .poll(() => page.textContent('.import-meta-url'))
     657|       .toMatch(imgMatch)
```

**verdict:**

---

## 3. vitejs-vite — playground/assets/**tests**/assets.spec.ts:829

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     824|
     825| if (!isBuild) {
     826|   // bundled dev: editing a CSS file imported by an inline <style> @import does not apply (no reload/update) (vitejs/vite#23028)
     827|   test.skipIf(isBundledDev)('@import in html style tag hmr', async () => {
     828|     await expect.poll(() => getColor('.import-css')).toBe('rgb(0, 136, 255)')
>>>  829|     const loadPromise = page.waitForEvent('load')
     830|     editFile('./css/import.css', (code) => code.replace('#0088ff', '#00ff88 '))
     831|     await loadPromise
     832|     await expect.poll(() => getColor('.import-css')).toBe('rgb(0, 255, 136)')
     833|   })
     834| }
```

**verdict:**

---

## 4. vitejs-vite — playground/css/postcss-caching/css.spec.ts:47

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
      42|     // wait for hmr connection because: if server stops before connection, auto reload does not happen
      43|     await hmrConnectionPromise
      44|     await blueApp.close()
      45|     blueApp = null
      46|
>>>   47|     const loadPromise = page.waitForEvent('load') // wait for server restart auto reload
      48|     greenApp = await startServer(greenAppDir)
      49|     await loadPromise
      50|
      51|     const greenA = await page.$('.postcss-a')
      52|     expect(await getColor(greenA)).toBe('black')
```

**verdict:**

---

## 5. vitejs-vite — playground/hmr-full-bundle-mode/**tests**/hmr-full-bundle-mode.spec.ts:25

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
      20|     await expect.poll(() => page.textContent('.hmr')).toBe('hello')
      21|   })
      22| } else {
      23|   // INITIAL -> BUNDLING -> BUNDLED
      24|   test('show bundling in progress', async () => {
>>>   25|     const reloadPromise = page.waitForEvent('load')
      26|     await expect
      27|       .poll(() => page.textContent('body'))
      28|       .toContain('Bundling in progress')
      29|     await reloadPromise // page shown after reload
      30|     await expect.poll(() => page.textContent('h1')).toBe('HMR Full Bundle Mode')
```

**verdict:**

---

## 6. vitejs-vite — playground/hmr-root/**tests**/hmr-root.spec.ts:8

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
       3| import { editFile, isServe, page } from '~utils'
       4|
       5| test.runIf(isServe)('should watch files outside root', async () => {
       6|   expect(await page.textContent('#foo')).toBe('foo')
       7|   editFile('foo.js', (code) => code.replace("'foo'", "'foobar'"))
>>>    8|   await page.waitForEvent('load')
       9|   await expect.poll(() => page.textContent('#foo')).toBe('foobar')
      10| })
      11|
```

**verdict:**

---

## 7. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:326

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     321|     },
     322|   )
     323|
     324|   test('invalidate on root triggers page reload', async () => {
     325|     editFile('invalidation/root.js', (code) => code.replace('Init', 'Updated'))
>>>  326|     await page.waitForEvent('load')
     327|     await expect
     328|       .poll(() => page.textContent('.invalidation-root'))
     329|       .toMatch('Updated')
     330|   })
     331|
```

**verdict:**

---

## 8. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:366

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     361|     await expect.poll(() => el.textContent()).toMatch('child')
     362|     editFile(
     363|       'invalidation-circular-deps/circular-invalidate/child.js',
     364|       (code) => code.replace('child', 'child updated'),
     365|     )
>>>  366|     await page.waitForEvent('load')
     367|     await expect
     368|       .poll(() => page.textContent('.invalidation-circular-deps'))
     369|       .toMatch('child updated')
     370|   })
     371|
```

**verdict:**

---

## 9. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:413

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     408|     const el = page.locator('#app')
     409|     await expect.poll(() => el.textContent()).toBe('title')
     410|     editFile('unicode-path/中文-にほんご-한글-🌕🌖🌗/index.html', (code) =>
     411|       code.replace('title', 'title2'),
     412|     )
>>>  413|     await page.waitForEvent('load')
     414|     await expect.poll(() => el.textContent()).toBe('title2')
     415|   })
     416|
     417|   // bundled dev: css is a bundle asset, so an edit does not swap the
     418|   // stylesheet link in place and the query params are lost
```

**verdict:**

---

## 10. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:463

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     458|     await expect.poll(() => btn.textContent()).toBe('Counter 0')
     459|     await btn.click()
     460|     await expect.poll(() => btn.textContent()).toBe('Counter 1')
     461|
     462|     // Modifying `index.ts` triggers a page reload, as expected
>>>  463|     const indexTsLoadPromise = page.waitForEvent('load')
     464|     editFile('counter/index.ts', (code) => code + '\n')
     465|     await indexTsLoadPromise
     466|     await expect.poll(() => btn.textContent()).toBe('Counter 0')
     467|
     468|     await btn.click()
```

**verdict:**

---

## 11. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:477

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     472|     // `dep.ts` defines `import.module.hot.accept` and has not been loaded.
     473|     // Therefore, modifying it has no effect (doesn't trigger a page reload).
     474|     // (Note that, a dynamic import that is never loaded and that does not
     475|     // define `accept.module.hot.accept` may wrongfully trigger a full page
     476|     // reload, see discussion at #7561.)
>>>  477|     const depTsLoadPromise = page.waitForEvent('load', { timeout: 1000 })
     478|     editFile('counter/dep.ts', (code) => code + ' ')
     479|     await expect(depTsLoadPromise).rejects.toThrow(
     480|       /page\.waitForEvent: Timeout \d+ms exceeded while waiting for event "load"/,
     481|     )
     482|
```

**verdict:**

---

## 12. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:645

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     640|
     641|       it('does not accept itself anymore after acceptedExports change', async () => {
     642|         await untilBrowserLogAfter(
     643|           async () => {
     644|             editFile(file, (code) => code.replace(/(\b[A-Z])2/g, '$13') + '\n')
>>>  645|             await page.waitForEvent('load')
     646|           },
     647|           [CONNECTED, />>>>>>/],
     648|           (logs) => {
     649|             expect(logs).toContain(`<<<<<< A3 B3 D3 ; ${dep}`)
     650|             expect(logs).toContain('>>>>>> A3 D3')
```

**verdict:**

---

## 13. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:688

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     683|           async () => {
     684|             editFile(
     685|               depFile,
     686|               (code) => code.replace('dep0', (dep = 'dep1')) + '\n',
     687|             )
>>>  688|             await page.waitForEvent('load')
     689|           },
     690|           [CONNECTED, />>>>>>/],
     691|           (logs) => {
     692|             expect(logs).toContain(`<<< named: ${a} ; ${dep}`)
     693|           },
```

**verdict:**

---

## 14. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:702

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     697|       describe('does not stop the HMR bubble on change to self', () => {
     698|         it('with named exports', async () => {
     699|           await untilBrowserLogAfter(
     700|             async () => {
     701|               editFile(namedFile, (code) => code.replace(a, 'A1') + '\n')
>>>  702|               await page.waitForEvent('load')
     703|             },
     704|             [CONNECTED, />>>>>>/],
     705|             (logs) => {
     706|               expect(logs).toContain(`<<< named: A1 ; ${dep}`)
     707|             },
```

**verdict:**

---

## 15. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:718

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     713|             async () => {
     714|               editFile(
     715|                 defaultFile,
     716|                 (code) => code.replace('def0', 'def1') + '\n',
     717|               )
>>>  718|               await page.waitForEvent('load')
     719|             },
     720|             [CONNECTED, />>>>>>/],
     721|             (logs) => {
     722|               expect(logs).toContain(`<<< default: def1`)
     723|             },
```

**verdict:**

---

## 16. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:809

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     804|               (code) =>
     805|                 code
     806|                   .replace('foo0', 'foo1')
     807|                   .replace('-- used --', '-> used <-') + '\n',
     808|             )
>>>  809|             await page.waitForEvent('load')
     810|           },
     811|           [CONNECTED, /used:foo/],
     812|           (logs) => {
     813|             expect(logs).toContain('-> used <-')
     814|             expect(logs).toContain('used:foo1')
```

**verdict:**

---

## 17. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:880

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     875|             },
     876|           )
     877|
     878|           await untilBrowserLogAfter(
     879|             async () => {
>>>  880|               const loadPromise = page.waitForEvent('load')
     881|               editFile(file, (code) => code.replace(/([abc])0/g, '$11') + '\n')
     882|               await loadPromise
     883|             },
     884|             [CONNECTED, '>>> ready <<<'],
     885|             (logs) => {
```

**verdict:**

---

## 18. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:907

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     902|     await page.goto(viteTestUrl)
     903|     await expect.poll(() => getBg('.import-image')).toMatch('icon')
     904|     await page.goto(viteTestUrl + '/foo/', { waitUntil: 'load' })
     905|     await expect.poll(() => getBg('.import-image')).toMatch('icon')
     906|
>>>  907|     const loadPromise = page.waitForEvent('load')
     908|     editFile('index.html', (code) => code.replace("url('./icon.png')", ''))
     909|     await loadPromise
     910|     await expect.poll(() => getBg('.import-image')).toMatch('')
     911|   })
     912|
```

**verdict:**

---

## 19. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:919

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     914|   test.skipIf(isBundledDev)('HTML', async () => {
     915|     await page.goto(viteTestUrl + '/counter/index.html')
     916|     const btn = page.locator('button')
     917|     await expect.poll(() => btn.textContent()).toBe('Counter 0')
     918|
>>>  919|     const loadPromise = page.waitForEvent('load')
     920|     editFile('counter/index.html', (code) =>
     921|       code.replace('Counter', 'Compteur'),
     922|     )
     923|     await loadPromise
     924|     await expect.poll(() => btn.textContent()).toBe('Compteur 0')
```

**verdict:**

---

## 20. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:990

**Message:** `waitForEvent('load'` instead of a web-first assertion.

```
     985|           }),
     986|         /connected/, // wait for HMR connection
     987|       )
     988|
     989|       await untilBrowserLogAfter(async () => {
>>>  990|         const loadPromise = page.waitForEvent('load')
     991|         editFile(file, (code) => code.replace(importCode, unImportCode))
     992|         await loadPromise
     993|       }, ['missing test', /connected/])
     994|
     995|       await untilBrowserLogAfter(async () => {
```

**verdict:**

---
