# QA-TEST-010 — Sample Findings for Classification

Total sampled: 5 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. withastro-astro — packages/integrations/node/test/static-headers.test.ts:51

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

## 2. tanstack-query — packages/query-devtools/src/**tests**/utils.test.ts:184

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

## 3. tanstack-query — packages/query-devtools/src/**tests**/utils.test.ts:575

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

## 4. grafana-grafana — packages/grafana-data/src/themes/colorManipulator.test.ts:186

**Message:** Test has an empty body — it can never fail.

```
     181|
     182|     it('Can also take into account opacity for background', () => {
     183|       expect(getContrastRatio('#FFF', 'rgba(255,255,255,0.1)', '#000')).toEqual(17.5);
     184|     });
     185|
>>>  186|     it('returns a ratio for dark-grey : light-grey', () => {
     187|       //expect(getContrastRatio('#707070', '#E5E5E5'))to.be.approximately(3.93, 0.01);
     188|     });
     189|
     190|     it('returns a ratio for black : light-grey', () => {
     191|       //expect(getContrastRatio('#000', '#888')).to.be.approximately(5.92, 0.01);
```

**verdict:**

---

## 5. grafana-grafana — packages/grafana-data/src/themes/colorManipulator.test.ts:190

**Message:** Test has an empty body — it can never fail.

```
     185|
     186|     it('returns a ratio for dark-grey : light-grey', () => {
     187|       //expect(getContrastRatio('#707070', '#E5E5E5'))to.be.approximately(3.93, 0.01);
     188|     });
     189|
>>>  190|     it('returns a ratio for black : light-grey', () => {
     191|       //expect(getContrastRatio('#000', '#888')).to.be.approximately(5.92, 0.01);
     192|     });
     193|   });
     194|
     195|   describe('getLuminance', () => {
```

**verdict:**

---
