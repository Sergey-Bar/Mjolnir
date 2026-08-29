# QA-TEST-010 — Sample Findings for Classification

Total sampled: 6 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. withastro-astro — packages/astro/test/units/routing/routing-app.test.ts:213

**Message:** Test has an empty body — it can never fail.

```
     208| 		assert.equal(res.status, 404);
     209| 		const $ = cheerio.load(await res.text());
     210| 		assert.equal($('h1').text(), 'Custom 404');
     211| 	});
     212|
>>>  213| 	it('does not loop when 404 page returns null-body 404 Response', async () => {
     214| 		// Case 2: 404.astro returns new Response(null, { status: 404 })
     215| 		// PagesHandler stamps REROUTE_DIRECTIVE_HEADER = 'no' on /404 routes
     216| 		const custom404NullBody = createComponent(() => {
     217| 			return new Response(null, { status: 404 });
     218| 		});
```

**verdict:**

---

## 2. withastro-astro — packages/astro/test/units/routing/routing-app.test.ts:255

**Message:** Test has an empty body — it can never fail.

```
     250|
     251| 		const res404 = await app.render(new Request('http://example.com/nonexistent'));
     252| 		assert.equal(res404.status, 404);
     253| 	});
     254|
>>>  255| 	it('does not loop when middleware returns null-body 404 for non-root paths', async () => {
     256| 		// Case 4: Middleware returns new Response(null, { status: 404 }) for non-/ paths
     257| 		const middleware404Null = async (ctx: APIContext, next: MiddlewareNext) => {
     258| 			if (ctx.url.pathname !== '/') {
     259| 				return new Response(null, { status: 404 });
     260| 			}
```

**verdict:**

---

## 3. withastro-astro — packages/integrations/node/test/static-headers.test.ts:51

**Message:** Test has an empty body — it can never fail.

```
      46| 			csp.value.includes('script-src'),
      47| 			'must contain the script-src directive because of the server island',
      48| 		);
      49| 	});
      50|
>>>   51| 	it('CSP headers are added to the request', async () => {});
      52| });
      53|
      54| describe('Static headers', () => {
      55| 	let fixture: Fixture;
      56| 	let server: AdapterServer;
```

**verdict:**

---

## 4. tanstack-query — packages/query-devtools/src/**tests**/utils.test.ts:184

**Message:** Test has an empty body — it can never fail.

```
     179|         expect(updateNestedDataByPath(null, ['x'], 'new')).toBe(null)
     180|       })
     181|     })
     182|
     183|     describe('nested data', () => {
>>>  184|       it('should update data correctly', () => {
     185|         /* eslint-disable cspell/spellchecker */
     186|         const oldData = new Map([
     187|           [
     188|             'pumpkin-pie',
     189|             {
```

**verdict:**

---

## 5. tanstack-query — packages/query-devtools/src/**tests**/utils.test.ts:575

**Message:** Test has an empty body — it can never fail.

```
     570|         expect(deleteNestedDataByPath(null, ['x'])).toBe(null)
     571|       })
     572|     })
     573|
     574|     describe('nested data', () => {
>>>  575|       it('should delete nested items correctly', () => {
     576|         /* eslint-disable cspell/spellchecker */
     577|         const oldData = new Map([
     578|           [
     579|             'pumpkin-pie',
     580|             {
```

**verdict:**

---

## 6. playwright-community-eslint-plugin-playwright — src/rules/valid-title.test.ts:1151

**Message:** Test has an empty body — it can never fail.

```
    1146|       `,
    1147|     },
    1148|     {
    1149|       code: dedent`
    1150|         test.describe('foo', () => {
>>> 1151|           test(' bar', () => {})
    1152|         })
    1153|       `,
    1154|       errors: [{ column: 8, line: 2, messageId: 'accidentalSpace' }],
    1155|       output: dedent`
    1156|         test.describe('foo', () => {
```

**verdict:**

---
