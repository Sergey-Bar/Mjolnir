# QA-PW-115 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. withastro-astro — packages/astro/test/units/app/encoded-backslash-bypass.test.ts:32

**Message:** Module-level `const page` — browser state shared across tests.

```
      27|
      28| const publicRouteData = parseRoute('index.astro', routeOptions, {
      29| 	component: 'src/pages/index.astro',
      30| });
      31|
>>>   32| const page = createComponent((_result: any, _props: any, _slots: any) => {
      33| 	return render`<h1>Page</h1>`;
      34| });
      35|
      36| const pageModule = async () => ({
      37| 	page: async () => ({
```

**verdict:**

---

## 2. withastro-astro — packages/astro/test/units/app/malformed-uri.test.ts:28

**Message:** Module-level `const page` — browser state shared across tests.

```
      23|
      24| const indexRouteData = parseRoute('index.astro', routeOptions, {
      25| 	component: 'src/pages/index.astro',
      26| });
      27|
>>>   28| const page = createComponent((_result: any, _props: any, _slots: any) => {
      29| 	return render`<h1>Page</h1>`;
      30| });
      31|
      32| const pageModule = async () => ({
      33| 	page: async () => ({
```

**verdict:**

---

## 3. withastro-astro — packages/astro/test/units/hono/index.test.ts:10

**Message:** Module-level `const page` — browser state shared across tests.

```
       5| import { setAmbientManifest } from '../../../dist/core/manifest/ambient.js';
       6| import { astro, getFetchState } from '../../../dist/core/hono/index.js';
       7| import { createComponent, render } from '../../../dist/runtime/server/index.js';
       8| import { createPage, createTestApp } from '../mocks.ts';
       9|
>>>   10| const page = createComponent((result: any, props: any, slots: any) => {
      11| 	const Astro = result.createAstro(props, slots);
      12| 	return render`<h1>${Astro.locals.message ?? 'Hello from Hono'}</h1>`;
      13| });
      14|
      15| type HonoEnv = {
```

**verdict:**

---

## 4. grafana-grafana — packages/grafana-ui/src/components/DateTimePickers/TimeRangeContext.test.tsx:9

**Message:** Module-level `let context` — browser state shared across tests.

```
       4| import { makeTimeRange } from '@grafana/data';
       5|
       6| import { type TimeRangeContextHookValue, TimeRangeProvider, useTimeRangeContext } from './TimeRangeContext';
       7|
       8| // Should be fine to have this globally as single file should not be parallelized
>>>    9| let context: TimeRangeContextHookValue | undefined = undefined;
      10| function onContextChange(val?: TimeRangeContextHookValue) {
      11|   context = val;
      12| }
      13|
      14| describe('TimeRangeProvider', () => {
```

**verdict:**

---
