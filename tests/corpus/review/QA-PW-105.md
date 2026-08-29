# QA-PW-105 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. vitejs-vite — playground/alias/**tests**/alias.spec.ts:34

**Message:** `expect.poll` without an explicit `timeout`.

```
      29|
      30| test('css via link', async () => {
      31|   expect(await getColor('body')).toBe('grey')
      32|   if (isBuild) return
      33|   editFile('dir/test.css', (code) => code.replace('grey', 'red'))
>>>   34|   await expect.poll(() => getColor('body')).toBe('red')
      35| })
      36|
      37| test('optimized dep', async () => {
      38|   expect(await page.textContent('.optimized')).toMatch(
      39|     '[success] alias optimized',
```

**verdict:**

---

## 2. vitejs-vite — playground/assets/**tests**/assets.spec.ts:370

**Message:** `expect.poll` without an explicit `timeout`.

```
     365|
     366|     if (isServe) {
     367|       editFile('nested/fragment-bg-hmr.svg', (code) =>
     368|         code.replace('fill="blue"', 'fill="red"'),
     369|       )
>>>  370|       await expect.poll(() => getBg('.css-url-svg')).toMatch('red')
     371|     }
     372|   })
     373|
     374|   test('image-set() with svg', async () => {
     375|     expect(await getBg('.css-image-set-svg')).toMatch(/data:image\/svg\+xml,.+/)
```

**verdict:**

---

## 3. vitejs-vite — playground/assets/**tests**/assets.spec.ts:393

**Message:** `expect.poll` without an explicit `timeout`.

```
     388|
     389|     if (isServe) {
     390|       editFile('nested/fragment-bg-hmr2.svg', (code) =>
     391|         code.replace('fill="blue"', 'fill="red"'),
     392|       )
>>>  393|       await expect.poll(() => getBg('.css-url-svg')).toMatch('red')
     394|     }
     395|   })
     396|
     397|   test.runIf(isServe)('non inlined url() HMR', async () => {
     398|     const bg = await getBg('.css-url-non-inline-hmr')
```

**verdict:**

---

## 4. vitejs-vite — playground/assets/**tests**/assets.spec.ts:402

**Message:** `expect.poll` without an explicit `timeout`.

```
     397|   test.runIf(isServe)('non inlined url() HMR', async () => {
     398|     const bg = await getBg('.css-url-non-inline-hmr')
     399|     editFile('nested/donuts-large.svg', (code) =>
     400|       code.replace('fill="blue"', 'fill="red"'),
     401|     )
>>>  402|     await expect.poll(() => getBg('.css-url-non-inline-hmr')).not.toBe(bg)
     403|   })
     404| })
     405|
     406| describe('image', () => {
     407|   test('src', async () => {
```

**verdict:**

---

## 5. vitejs-vite — playground/assets/**tests**/assets.spec.ts:534

**Message:** `expect.poll` without an explicit `timeout`.

```
     529|
     530|   if (isBuild) return
     531|   editFile('nested/partial.html', (code) =>
     532|     code.replace('<div>partial</div>', '<div>partial updated</div>'),
     533|   )
>>>  534|   await expect
     535|     .poll(() => page.textContent('.raw-html'))
     536|     .toBe('<div>partial updated</div>\n')
     537|
     538|   // bundled dev logs `playground-temp/assets/nested/...` where dev logs the URL
     539|   // path `/nested/...`. This is a gap on the vite side, not in rolldown
```

**verdict:**

---

## 6. vitejs-vite — playground/assets/**tests**/assets.spec.ts:648

**Message:** `expect.poll` without an explicit `timeout`.

```
     643|     editFile('import-meta-url/img.png', null, (_oldContent) => {
     644|       oldContent = _oldContent
     645|       return newContent
     646|     })
     647|     await loadPromise // expect reload
>>>  648|     await expect
     649|       .poll(() => page.textContent('.import-meta-url'))
     650|       .toMatch(imgMatch)
     651|
     652|     const loadPromise2 = page.waitForEvent('load')
     653|     editFile('import-meta-url/img.png', null, (_) => oldContent)
```

**verdict:**

---

## 7. vitejs-vite — playground/assets/**tests**/assets.spec.ts:655

**Message:** `expect.poll` without an explicit `timeout`.

```
     650|       .toMatch(imgMatch)
     651|
     652|     const loadPromise2 = page.waitForEvent('load')
     653|     editFile('import-meta-url/img.png', null, (_) => oldContent)
     654|     await loadPromise2 // expect reload
>>>  655|     await expect
     656|       .poll(() => page.textContent('.import-meta-url'))
     657|       .toMatch(imgMatch)
     658|   }
     659| })
     660|
```

**verdict:**

---

## 8. vitejs-vite — playground/assets/**tests**/assets.spec.ts:783

**Message:** `expect.poll` without an explicit `timeout`.

```
     778|     expect(cssFile).not.toBe('')
     779|     expect(cssFile).not.toMatch(/undefined/)
     780|   })
     781|
     782|   test('old file is removed when the content changes', async () => {
>>>  783|     await expect.poll(() => page.textContent('.update-content')).toBe('hello')
     784|
     785|     const oldMainJsFiles = listAssets('foo').filter((f) =>
     786|       /index-[-\w]+\.js$/.test(f),
     787|     )
     788|     expect(oldMainJsFiles.length).toBe(1)
```

**verdict:**

---

## 9. vitejs-vite — playground/assets/**tests**/assets.spec.ts:794

**Message:** `expect.poll` without an explicit `timeout`.

```
     789|     const oldMainJsFile = oldMainJsFiles[0]
     790|
     791|     editFile('asset/update.js', (code) => code.replace('hello', 'world2'))
     792|     await notifyRebuildComplete(watcher)
     793|     await page.reload()
>>>  794|     await expect.poll(() => page.textContent('.update-content')).toBe('world2')
     795|
     796|     const newMainJsFiles = listAssets('foo').filter((f) =>
     797|       /index-[-\w]+\.js$/.test(f),
     798|     )
     799|     expect(newMainJsFiles).not.toContain(oldMainJsFile)
```

**verdict:**

---

## 10. vitejs-vite — playground/assets/**tests**/assets.spec.ts:828

**Message:** `expect.poll` without an explicit `timeout`.

```
     823| })
     824|
     825| if (!isBuild) {
     826|   // bundled dev: editing a CSS file imported by an inline <style> @import does not apply (no reload/update) (vitejs/vite#23028)
     827|   test.skipIf(isBundledDev)('@import in html style tag hmr', async () => {
>>>  828|     await expect.poll(() => getColor('.import-css')).toBe('rgb(0, 136, 255)')
     829|     const loadPromise = page.waitForEvent('load')
     830|     editFile('./css/import.css', (code) => code.replace('#0088ff', '#00ff88 '))
     831|     await loadPromise
     832|     await expect.poll(() => getColor('.import-css')).toBe('rgb(0, 255, 136)')
     833|   })
```

**verdict:**

---

## 11. vitejs-vite — playground/assets/**tests**/assets.spec.ts:832

**Message:** `expect.poll` without an explicit `timeout`.

```
     827|   test.skipIf(isBundledDev)('@import in html style tag hmr', async () => {
     828|     await expect.poll(() => getColor('.import-css')).toBe('rgb(0, 136, 255)')
     829|     const loadPromise = page.waitForEvent('load')
     830|     editFile('./css/import.css', (code) => code.replace('#0088ff', '#00ff88 '))
     831|     await loadPromise
>>>  832|     await expect.poll(() => getColor('.import-css')).toBe('rgb(0, 255, 136)')
     833|   })
     834| }
     835|
     836| test('html import word boundary', async () => {
     837|   expect(await page.textContent('.obj-import-express')).toMatch(
```

**verdict:**

---

## 12. vitejs-vite — playground/backend-integration/**tests**/backend-integration.spec.ts:113

**Message:** `expect.poll` without an explicit `timeout`.

```
     108|       expect(error.name).not.toBe('ReferenceError')
     109|     })
     110|   })
     111|
     112|   test('preserve the base in CSS HMR', async () => {
>>>  113|     await expect.poll(() => getColor('body')).toBe('black') // sanity check
     114|     editFile('frontend/entrypoints/global.css', (code) =>
     115|       code.replace('black', 'red'),
     116|     )
     117|     await expect.poll(() => getColor('body')).toBe('red') // successful HMR
     118|
```

**verdict:**

---

## 13. vitejs-vite — playground/backend-integration/**tests**/backend-integration.spec.ts:117

**Message:** `expect.poll` without an explicit `timeout`.

```
     112|   test('preserve the base in CSS HMR', async () => {
     113|     await expect.poll(() => getColor('body')).toBe('black') // sanity check
     114|     editFile('frontend/entrypoints/global.css', (code) =>
     115|       code.replace('black', 'red'),
     116|     )
>>>  117|     await expect.poll(() => getColor('body')).toBe('red') // successful HMR
     118|
     119|     // Verify that the base (/dev/) was added during the css-update
     120|     const link = await page.$('link[rel="stylesheet"]:last-of-type')
     121|     expect(await link.getAttribute('href')).toContain('/dev/global.css?t=')
     122|   })
```

**verdict:**

---

## 14. vitejs-vite — playground/backend-integration/**tests**/backend-integration.spec.ts:147

**Message:** `expect.poll` without an explicit `timeout`.

```
     142|         editFile('frontend/entrypoints/main.ts', (code) =>
     143|           code.replace('text-black', 'text-[rgb(204,0,0)]'),
     144|         ),
     145|       '[vite] css hot updated: /global.css',
     146|     )
>>>  147|     await expect.poll(() => getColor(el)).toBe('rgb(204, 0, 0)')
     148|   })
     149| })
     150|
```

**verdict:**

---

## 15. vitejs-vite — playground/base-conflict/**tests**/base-conflict.spec.ts:5

**Message:** `expect.poll` without an explicit `timeout`.

```
       1| import { expect, test } from 'vitest'
       2| import { page } from '~utils'
       3|
       4| test('absolute imports keep base prefix', async () => {
>>>    5|   await expect.poll(() => page.textContent('.message')).toBe('absolute import')
       6| })
       7|
```

**verdict:**

---

## 16. vitejs-vite — playground/build-old/**tests**/build-old.spec.ts:6

**Message:** `expect.poll` without an explicit `timeout`.

```
       1| import { describe, expect, test } from 'vitest'
       2| import { findAssetFile, isBuild, page } from '~utils'
       3|
       4| describe('syntax preserve', () => {
       5|   test('import.meta.url', async () => {
>>>    6|     await expect.poll(() => page.textContent('.import-meta-url')).toBe('string')
       7|   })
       8|   test('dynamic import', async () => {
       9|     await expect.poll(() => page.textContent('.dynamic-import')).toBe('success')
      10|   })
      11| })
```

**verdict:**

---

## 17. vitejs-vite — playground/build-old/**tests**/build-old.spec.ts:9

**Message:** `expect.poll` without an explicit `timeout`.

```
       4| describe('syntax preserve', () => {
       5|   test('import.meta.url', async () => {
       6|     await expect.poll(() => page.textContent('.import-meta-url')).toBe('string')
       7|   })
       8|   test('dynamic import', async () => {
>>>    9|     await expect.poll(() => page.textContent('.dynamic-import')).toBe('success')
      10|   })
      11| })
      12|
      13| describe('syntax is lowered', () => {
      14|   test('private field', async () => {
```

**verdict:**

---

## 18. vitejs-vite — playground/build-old/**tests**/build-old.spec.ts:15

**Message:** `expect.poll` without an explicit `timeout`.

```
      10|   })
      11| })
      12|
      13| describe('syntax is lowered', () => {
      14|   test('private field', async () => {
>>>   15|     await expect.poll(() => page.textContent('.private-field')).toBe('private')
      16|
      17|     if (isBuild) {
      18|       const content = findAssetFile(/index-[-\w]{8}\.js/)
      19|       expect(content).not.toMatch(/this\.#\w+/)
      20|     }
```

**verdict:**

---

## 19. vitejs-vite — playground/chunk-importmap/**tests**/chunk-importmap.spec.ts:13

**Message:** `expect.poll` without an explicit `timeout`.

```
       8|     expect(msg).not.toMatch('404')
       9|   })
      10| })
      11|
      12| test('index js', async () => {
>>>   13|   await expect.poll(() => page.textContent('.js')).toBe('js: ok')
      14| })
      15|
      16| test('importmap', async () => {
      17|   await expect
      18|     .poll(() => page.textContent('.importmap'))
```

**verdict:**

---

## 20. vitejs-vite — playground/chunk-importmap/**tests**/chunk-importmap.spec.ts:17

**Message:** `expect.poll` without an explicit `timeout`.

```
      12| test('index js', async () => {
      13|   await expect.poll(() => page.textContent('.js')).toBe('js: ok')
      14| })
      15|
      16| test('importmap', async () => {
>>>   17|   await expect
      18|     .poll(() => page.textContent('.importmap'))
      19|     .toContain('"/foo": "/bar"')
      20| })
      21|
      22| test('static js', async () => {
```

**verdict:**

---
