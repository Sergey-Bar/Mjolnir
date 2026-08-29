# QA-PW-114 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. vitejs-vite — playground/assets/**tests**/assets.spec.ts:99

**Message:** `page.$(` returns a stale-prone element handle.

```
      94|   })
      95| })
      96|
      97| describe('injected scripts', () => {
      98|   test('@vite/client', async () => {
>>>   99|     const hasClient = await page.$(
     100|       'script[type="module"][src="/foo/bar/@vite/client"]',
     101|     )
     102|     if (isBundled) {
     103|       expect(hasClient).toBeFalsy()
     104|     } else {
```

**verdict:**

---

## 2. vitejs-vite — playground/assets/**tests**/assets.spec.ts:110

**Message:** `page.$(` returns a stale-prone element handle.

```
     105|       expect(hasClient).toBeTruthy()
     106|     }
     107|   })
     108|
     109|   test('html-proxy', async () => {
>>>  110|     const hasHtmlProxy = await page.$(
     111|       'script[type="module"][src^="/foo/bar/index.html?html-proxy"]',
     112|     )
     113|     if (isBundled) {
     114|       expect(hasHtmlProxy).toBeFalsy()
     115|     } else {
```

**verdict:**

---

## 3. vitejs-vite — playground/assets/**tests**/assets.spec.ts:318

**Message:** `page.$(` returns a stale-prone element handle.

```
     313|     expect(await getBg('.css-url-base64-inline')).toMatch(match)
     314|     expect(await getBg('.css-url-quotes-base64-inline')).toMatch(match)
     315|   })
     316|
     317|   test('no base64 inline for icon and manifest links', async () => {
>>>  318|     const iconEl = await page.$(`link.ico`)
     319|     const href = await iconEl.getAttribute('href')
     320|     expect(href).toMatch(
     321|       isBundled ? /\/foo\/bar\/assets\/favicon-[-\w]{8}\.ico/ : 'favicon.ico',
     322|     )
     323|
```

**verdict:**

---

## 4. vitejs-vite — playground/assets/**tests**/assets.spec.ts:324

**Message:** `page.$(` returns a stale-prone element handle.

```
     319|     const href = await iconEl.getAttribute('href')
     320|     expect(href).toMatch(
     321|       isBundled ? /\/foo\/bar\/assets\/favicon-[-\w]{8}\.ico/ : 'favicon.ico',
     322|     )
     323|
>>>  324|     const manifestEl = await page.$(`link[rel="manifest"]`)
     325|     const manifestHref = await manifestEl.getAttribute('href')
     326|     expect(manifestHref).toMatch(
     327|       isBundled
     328|         ? /\/foo\/bar\/assets\/manifest-[-\w]{8}\.json/
     329|         : 'manifest.json',
```

**verdict:**

---

## 5. vitejs-vite — playground/assets/**tests**/assets.spec.ts:408

**Message:** `page.$(` returns a stale-prone element handle.

```
     403|   })
     404| })
     405|
     406| describe('image', () => {
     407|   test('src', async () => {
>>>  408|     const img = await page.$('.img-src')
     409|     const src = await img.getAttribute('src')
     410|     expect(src).toMatch(
     411|       isBundled
     412|         ? /\/foo\/bar\/assets\/html-only-asset-[-\w]{8}\.jpg/
     413|         : /\/foo\/bar\/nested\/html-only-asset.jpg/,
```

**verdict:**

---

## 6. vitejs-vite — playground/assets/**tests**/assets.spec.ts:418

**Message:** `page.$(` returns a stale-prone element handle.

```
     413|         : /\/foo\/bar\/nested\/html-only-asset.jpg/,
     414|     )
     415|   })
     416|
     417|   test('src inline', async () => {
>>>  418|     const img = await page.$('.img-src-inline')
     419|     const src = await img.getAttribute('src')
     420|     expect(src).toMatch(
     421|       isBundled
     422|         ? /^data:image\/svg\+xml,%3csvg/
     423|         : /\/foo\/bar\/nested\/inlined.svg/,
```

**verdict:**

---

## 7. vitejs-vite — playground/assets/**tests**/assets.spec.ts:428

**Message:** `page.$(` returns a stale-prone element handle.

```
     423|         : /\/foo\/bar\/nested\/inlined.svg/,
     424|     )
     425|   })
     426|
     427|   test('srcset', async () => {
>>>  428|     const img = await page.$('.img-src-set')
     429|     const srcset = await img.getAttribute('srcset')
     430|     srcset.split(', ').forEach((s) => {
     431|       expect(s).toMatch(
     432|         isBundled
     433|           ? /\/foo\/bar\/assets\/asset-[-\w]{8}\.png \dx/
```

**verdict:**

---

## 8. vitejs-vite — playground/assets/**tests**/assets.spec.ts:440

**Message:** `page.$(` returns a stale-prone element handle.

```
     435|       )
     436|     })
     437|   })
     438|
     439|   test('srcset (public)', async () => {
>>>  440|     const img = await page.$('.img-src-set-public')
     441|     const srcset = await img.getAttribute('srcset')
     442|     srcset.split(', ').forEach((s) => {
     443|       expect(s).toMatch(/\/foo\/bar\/icon\.png \dx/)
     444|     })
     445|   })
```

**verdict:**

---

## 9. vitejs-vite — playground/assets/**tests**/assets.spec.ts:448

**Message:** `page.$(` returns a stale-prone element handle.

```
     443|       expect(s).toMatch(/\/foo\/bar\/icon\.png \dx/)
     444|     })
     445|   })
     446|
     447|   test('srcset (mixed)', async () => {
>>>  448|     const img = await page.$('.img-src-set-mixed')
     449|     const srcset = await img.getAttribute('srcset')
     450|     const srcs = srcset.split(', ')
     451|     expect(srcs[1]).toMatch(
     452|       isBundled
     453|         ? /\/foo\/bar\/assets\/asset-[-\w]{8}\.png \dx/
```

**verdict:**

---

## 10. vitejs-vite — playground/assets/**tests**/assets.spec.ts:461

**Message:** `page.$(` returns a stale-prone element handle.

```
     456|   })
     457| })
     458|
     459| describe('meta', () => {
     460|   test('og image', async () => {
>>>  461|     const meta = await page.$('.meta-og-image')
     462|     const content = await meta.getAttribute('content')
     463|     expect(content).toMatch(
     464|       isBundled
     465|         ? /\/foo\/bar\/assets\/asset-\w{8}\.png/
     466|         : /\/foo\/bar\/nested\/asset.png/,
```

**verdict:**

---

## 11. vitejs-vite — playground/assets/**tests**/assets.spec.ts:475

**Message:** `page.$(` returns a stale-prone element handle.

```
     470|
     471| describe('svg fragments', () => {
     472|   // 404 is checked already, so here we just ensure the urls end with #fragment
     473|   // bundled dev drops the #fragment postfix from hashed asset URLs (vitejs/vite#23028)
     474|   test.skipIf(isBundledDev)('img url', async () => {
>>>  475|     const img = await page.$('.svg-frag-img')
     476|     expect(await img.getAttribute('src')).toMatch(/svg#icon-clock-view$/)
     477|   })
     478|
     479|   // bundled dev: #fragment dropped (see 'img url')
     480|   test.skipIf(isBundledDev)('via css url()', async () => {
```

**verdict:**

---

## 12. vitejs-vite — playground/assets/**tests**/assets.spec.ts:485

**Message:** `page.$(` returns a stale-prone element handle.

```
     480|   test.skipIf(isBundledDev)('via css url()', async () => {
     481|     expect(await getBg('.icon')).toMatch(/svg#icon-clock-view"\)$/)
     482|   })
     483|
     484|   test('from js import', async () => {
>>>  485|     const img = await page.$('.svg-frag-import')
     486|     expect(await img.getAttribute('src')).toMatch(
     487|       // Assert trimmed (data URI starts with < and ends with >)
     488|       /^data:image\/svg\+xml,%3c.*%3e#icon-heart-view$/,
     489|     )
     490|   })
```

**verdict:**

---

## 13. vitejs-vite — playground/assets/**tests**/assets.spec.ts:628

**Message:** `page.$(` returns a stale-prone element handle.

```
     623|   })
     624| })
     625|
     626| describe.runIf(isBuild)('encodeURI', () => {
     627|   test('img src with encodeURI', async () => {
>>>  628|     const img = await page.$('.encodeURI')
     629|     expect(await img.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
     630|   })
     631| })
     632|
     633| test('new URL(..., import.meta.url)', async () => {
```

**verdict:**

---

## 14. vitejs-vite — playground/assets/**tests**/assets.spec.ts:672

**Message:** `page.$(` returns a stale-prone element handle.

```
     667|     iconMatch,
     668|   )
     669| })
     670|
     671| test('new URL("data:...", import.meta.url)', async () => {
>>>  672|   const img = await page.$('.import-meta-url-data-uri-img')
     673|   expect(await img.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
     674|   expect(await page.textContent('.import-meta-url-data-uri')).toMatch(
     675|     /^data:image\/png;base64,/,
     676|   )
     677| })
```

**verdict:**

---

## 15. vitejs-vite — playground/assets/**tests**/encoded-base/assets-encoded-base.spec.ts:157

**Message:** `page.$(` returns a stale-prone element handle.

```
     152|   })
     153| })
     154|
     155| describe('image', () => {
     156|   test('srcset', async () => {
>>>  157|     const img = await page.$('.img-src-set')
     158|     const srcset = await img.getAttribute('srcset')
     159|     srcset.split(', ').forEach((s) => {
     160|       expect(s).toMatch(
     161|         isBuild
     162|           ? /\/foo%20bar\/other-assets\/asset-[-\w]{8}\.png \dx/
```

**verdict:**

---

## 16. vitejs-vite — playground/assets/**tests**/encoded-base/assets-encoded-base.spec.ts:175

**Message:** `page.$(` returns a stale-prone element handle.

```
     170|
     171| describe('svg fragments', () => {
     172|   // 404 is checked already, so here we just ensure the urls end with #fragment
     173|   // bundled dev drops the #fragment postfix from hashed asset URLs (vitejs/vite#23028)
     174|   test.skipIf(isBundledDev)('img url', async () => {
>>>  175|     const img = await page.$('.svg-frag-img')
     176|     expect(await img.getAttribute('src')).toMatch(/svg#icon-clock-view$/)
     177|   })
     178|
     179|   // bundled dev: #fragment dropped (see 'img url')
     180|   test.skipIf(isBundledDev)('via css url()', async () => {
```

**verdict:**

---

## 17. vitejs-vite — playground/assets/**tests**/encoded-base/assets-encoded-base.spec.ts:185

**Message:** `page.$(` returns a stale-prone element handle.

```
     180|   test.skipIf(isBundledDev)('via css url()', async () => {
     181|     expect(await getBg('.icon')).toMatch(/svg#icon-clock-view"\)$/)
     182|   })
     183|
     184|   test('from js import', async () => {
>>>  185|     const img = await page.$('.svg-frag-import')
     186|     expect(await img.getAttribute('src')).toMatch(/svg#icon-heart-view$/)
     187|   })
     188| })
     189|
     190| test('?raw import', async () => {
```

**verdict:**

---

## 18. vitejs-vite — playground/assets/**tests**/relative-base/assets-relative-base.spec.ts:170

**Message:** `page.$(` returns a stale-prone element handle.

```
     165|   })
     166| })
     167|
     168| describe('image', () => {
     169|   test('srcset', async () => {
>>>  170|     const img = await page.$('.img-src-set')
     171|     const srcset = await img.getAttribute('srcset')
     172|     srcset.split(', ').forEach((s) => {
     173|       expect(s).toMatch(
     174|         isBuild
     175|           ? /other-assets\/asset-[-\w]{8}\.png \dx/
```

**verdict:**

---

## 19. vitejs-vite — playground/assets/**tests**/relative-base/assets-relative-base.spec.ts:188

**Message:** `page.$(` returns a stale-prone element handle.

```
     183|
     184| describe('svg fragments', () => {
     185|   // 404 is checked already, so here we just ensure the urls end with #fragment
     186|   // bundled dev drops the #fragment postfix from hashed asset URLs (vitejs/vite#23028)
     187|   test.skipIf(isBundledDev)('img url', async () => {
>>>  188|     const img = await page.$('.svg-frag-img')
     189|     expect(await img.getAttribute('src')).toMatch(/svg#icon-clock-view$/)
     190|   })
     191|
     192|   // bundled dev: #fragment dropped (see 'img url')
     193|   test.skipIf(isBundledDev)('via css url()', async () => {
```

**verdict:**

---

## 20. vitejs-vite — playground/assets/**tests**/relative-base/assets-relative-base.spec.ts:198

**Message:** `page.$(` returns a stale-prone element handle.

```
     193|   test.skipIf(isBundledDev)('via css url()', async () => {
     194|     expect(await getBg('.icon')).toMatch(/svg#icon-clock-view"\)$/)
     195|   })
     196|
     197|   test('from js import', async () => {
>>>  198|     const img = await page.$('.svg-frag-import')
     199|     expect(await img.getAttribute('src')).toMatch(/svg#icon-heart-view$/)
     200|   })
     201| })
     202|
     203| test('?raw import', async () => {
```

**verdict:**

---
