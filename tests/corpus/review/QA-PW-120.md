# QA-PW-120 — Sample Findings for Classification

Total sampled: 13 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-mcp — tests/click.spec.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| /**
       2|  * Copyright (c) Microsoft Corporation.
       3|  *
       4|  * Licensed under the Apache License, Version 2.0 (the "License");
       5|  * you may not use this file except in compliance with the License.
       6|  * You may obtain a copy of the License at
```

**verdict:**

---

## 2. vitejs-vite — packages/vite/src/node/**tests**/assetSource.spec.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import { type DefaultTreeAdapterMap, parseFragment } from 'parse5'
       2| import { describe, expect, test } from 'vitest'
       3| import { getNodeAssetAttributes } from '../assetSource'
       4|
       5| describe('getNodeAssetAttributes', () => {
       6|   const getNode = (html: string) => {
```

**verdict:**

---

## 3. vitejs-vite — packages/vite/src/node/**tests**/plugins/css.spec.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import path from 'node:path'
       2| import MagicString from 'magic-string'
       3| import type { InternalModuleFormat } from 'rolldown'
       4| import { describe, expect, test } from 'vitest'
       5| import { PartialEnvironment } from '../../baseEnvironment'
       6| import { resolveConfig } from '../../config'
```

**verdict:**

---

## 4. vitejs-vite — playground/worker/**tests**/es/worker-es.spec.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import fs from 'node:fs'
       2| import path from 'node:path'
       3| import { describe, expect, test } from 'vitest'
       4| import { isBuild, page, testDir } from '~utils'
       5|
       6| test('normal', async () => {
```

**verdict:**

---

## 5. vitejs-vite — playground/worker/**tests**/iife/worker-iife.spec.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import fs from 'node:fs'
       2| import path from 'node:path'
       3| import { describe, expect, test } from 'vitest'
       4| import {
       5|   extractSourcemap,
       6|   formatSourcemapForSnapshot,
```

**verdict:**

---

## 6. vitejs-vite — playground/worker/**tests**/sourcemap-hidden/worker-sourcemap-hidden.spec.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import fs from 'node:fs'
       2| import path from 'node:path'
       3| import { describe, expect, test } from 'vitest'
       4| import { isBuild, testDir } from '~utils'
       5|
       6| describe.runIf(isBuild)('build', () => {
```

**verdict:**

---

## 7. vitejs-vite — playground/worker/**tests**/sourcemap-inline/worker-sourcemap-inline.spec.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import fs from 'node:fs'
       2| import path from 'node:path'
       3| import { describe, expect, test } from 'vitest'
       4| import { isBuild, testDir } from '~utils'
       5|
       6| describe.runIf(isBuild)('build', () => {
```

**verdict:**

---

## 8. vitejs-vite — playground/worker/**tests**/sourcemap/worker-sourcemap.spec.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import fs from 'node:fs'
       2| import path from 'node:path'
       3| import { describe, expect, test } from 'vitest'
       4| import { isBuild, testDir } from '~utils'
       5|
       6| describe.runIf(isBuild)('build', () => {
```

**verdict:**

---

## 9. withastro-astro — packages/astro/e2e/tailwindcss.test.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import { expect } from '@playwright/test';
       2| import { type DevServer, testFactory } from './test-utils.ts';
       3|
       4| const test = testFactory(import.meta.url, { root: './fixtures/tailwindcss/' });
       5|
       6| let devServer: DevServer;
```

**verdict:**

---

## 10. withastro-astro — packages/astro/test/units/build/plugin-incremental.test.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import assert from 'node:assert/strict';
       2| import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
       3| import { tmpdir } from 'node:os';
       4| import { join } from 'node:path';
       5| import { after, describe, it } from 'node:test';
       6| import { pluginIncremental } from '../../../dist/core/build/plugins/plugin-incremental.js';
```

**verdict:**

---

## 11. withastro-astro — packages/integrations/markdoc/test/render-html.test.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import assert from 'node:assert/strict';
       2| import { before, describe, it } from 'node:test';
       3| import { parseHTML } from 'linkedom';
       4| import { loadFixture, type Fixture } from './test-utils.ts';
       5|
       6| async function getFixture(name: string) {
```

**verdict:**

---

## 12. withastro-astro — packages/integrations/sitemap/test/namespaces.test.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import assert from 'node:assert/strict';
       2| import { before, describe, it } from 'node:test';
       3| import { sitemap } from './fixtures/static/deps.mjs';
       4| import { type Fixture, loadFixture } from './test-utils.ts';
       5|
       6| describe('Namespaces Configuration', () => {
```

**verdict:**

---

## 13. playwright-community-eslint-plugin-playwright — src/rules/no-useless-await.test.ts:1

**Message:** Engine/platform-specific test with no test.skip / browser guard.

```
>>>    1| import { runRuleTester } from '../utils/rule-tester.js'
       2| import rule from './no-useless-await.js'
       3|
       4| const messageId = 'noUselessAwait'
       5|
       6| runRuleTester('no-useless-await', rule, {
```

**verdict:**

---
