# QA-PW-145 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — apps/dev/nextjs/tests/signin.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { test, expect } from "@playwright/test"
       2|
       3| test("Sign in with Auth0", async ({ page }) => {
       4|   // Go to NextAuth example app
       5|   await page.goto("https://next-auth-example.vercel.app")
       6|
```

**verdict:**

---

## 2. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/credentials.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { test, expect } from "@playwright/test"
       2|
       3| test.describe("Credentials Provider", () => {
       4|   test("Signin / Signout", async ({ page }) => {
       5|     await test.step("should login", async () => {
       6|       await page.goto("http://localhost:3000/auth/signin")
```

**verdict:**

---

## 3. nextauthjs-next-auth — packages/next-auth/test/e2e/tests/providers/keycloak.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { test, expect } from "@playwright/test"
       2|
       3| test.describe("KeyCloak Provider", () => {
       4|   test("Signin / Signout", async ({ page }) => {
       5|     if (
       6|       !process.env.TEST_KEYCLOAK_USERNAME ||
```

**verdict:**

---

## 4. vitejs-vite — playground/cli-module/**tests**/cli-module.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { expect, test } from 'vitest'
       2| import { page } from '~utils'
       3| import { port } from './serve'
       4|
       5| test('cli should work in "type":"module" package', async () => {
       6|   // this test uses a custom serve implementation, so regular helpers for browserLogs and goto don't work
```

**verdict:**

---

## 5. vitejs-vite — playground/cli/**tests**/cli.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { expect, test } from 'vitest'
       2| import { editFile, isServe, page } from '~utils'
       3| import { port, streams } from './serve'
       4|
       5| test('cli should work', async () => {
       6|   // this test uses a custom serve implementation, so regular helpers for browserLogs and goto don't work
```

**verdict:**

---

## 6. vitejs-vite — playground/client-reload/**tests**/client-reload.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import path from 'node:path'
       2| import { type ServerOptions, type ViteDevServer, createServer } from 'vite'
       3| import { afterEach, describe, expect, test } from 'vitest'
       4| import { hmrPorts, isServe, page, ports } from '~utils'
       5|
       6| let server: ViteDevServer
```

**verdict:**

---

## 7. vitejs-vite — playground/css-codesplit/**tests**/css-codesplit.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { describe, expect, test } from 'vitest'
       2| import {
       3|   findAssetFile,
       4|   getColor,
       5|   isBuild,
       6|   listAssets,
```

**verdict:**

---

## 8. vitejs-vite — playground/css-dynamic-import/**tests**/css-dynamic-import.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import type { InlineConfig } from 'vite'
       2| import { build, createServer, preview } from 'vite'
       3| import { expect, test } from 'vitest'
       4| import { getColor, isBuild, isServe, page, ports, rootDir } from '~utils'
       5|
       6| const baseOptions = [
```

**verdict:**

---

## 9. vitejs-vite — playground/css-lightningcss-proxy/**tests**/css-lightningcss-proxy.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { describe, expect, test } from 'vitest'
       2| import { getColor, isServe, page } from '~utils'
       3| import { port } from './serve'
       4|
       5| const url = `http://localhost:${port}`
       6|
```

**verdict:**

---

## 10. vitejs-vite — playground/css/**tests**/css.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { expect, test } from 'vitest'
       2| import { getBg, isBundled, page, viteTestUrl } from '~utils'
       3| import './tests'
       4|
       5| // not included in tests.ts because the lightningcss variant does not use
       6| // the postcss pipeline
```

**verdict:**

---

## 11. vitejs-vite — playground/css/**tests**/postcss-plugins-different-dir/css-postcss-plugins-different-dir.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import path from 'node:path'
       2| import { createServer } from 'vite'
       3| import { expect, test } from 'vitest'
       4| import { getBgColor, getColor, isServe, page, ports } from '~utils'
       5|
       6| // Regression test for https://github.com/vitejs/vite/issues/4000
```

**verdict:**

---

## 12. vitejs-vite — playground/css/postcss-caching/css.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import path from 'node:path'
       2| import { createServer } from 'vite'
       3| import { expect, test } from 'vitest'
       4| import { getColor, isServe, page, ports } from '~utils'
       5|
       6| test.runIf(isServe)('postcss config', async () => {
```

**verdict:**

---

## 13. vitejs-vite — playground/dynamic-import/**tests**/dynamic-import.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { expect, test } from 'vitest'
       2| import {
       3|   browserLogs,
       4|   findAssetFile,
       5|   getColor,
       6|   isBuild,
```

**verdict:**

---

## 14. vitejs-vite — playground/forward-console/**test**/forward-console.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { stripVTControlCharacters } from 'node:util'
       2| import { expect, test } from 'vitest'
       3| import { isServe, page, serverLogs } from '~utils'
       4|
       5| function normalizeLogs(logs: string[]) {
       6|   return (
```

**verdict:**

---

## 15. vitejs-vite — playground/hmr-full-bundle-mode/**tests**/hmr-full-bundle-mode.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { setTimeout } from 'node:timers/promises'
       2| import type { Response } from 'playwright-chromium'
       3| import { expect, test, onTestFinished } from 'vitest'
       4| import {
       5|   addFile,
       6|   browserLogs,
```

**verdict:**

---

## 16. vitejs-vite — playground/hmr/**tests**/hmr.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { stripVTControlCharacters } from 'node:util'
       2| import type { Page } from 'playwright-chromium'
       3| import { beforeAll, describe, expect, it, test } from 'vitest'
       4| import {
       5|   addFile,
       6|   browser,
```

**verdict:**

---

## 17. vitejs-vite — playground/html/**tests**/html.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { beforeAll, describe, expect, test } from 'vitest'
       2| import {
       3|   browserLogs,
       4|   editFile,
       5|   getColor,
       6|   isBuild,
```

**verdict:**

---

## 18. vitejs-vite — playground/legacy/**tests**/client-and-ssr/legacy-client-legacy-ssr-sequential-builds.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { describe, expect, test } from 'vitest'
       2| import { isBuild, page } from '~utils'
       3| import { port } from './serve'
       4|
       5| const url = `http://localhost:${port}`
       6|
```

**verdict:**

---

## 19. vitejs-vite — playground/legacy/**tests**/legacy.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { describe, expect, test } from 'vitest'
       2| import {
       3|   findAssetFile,
       4|   getColor,
       5|   isBuild,
       6|   isBundled,
```

**verdict:**

---

## 20. vitejs-vite — playground/legacy/**tests**/modern-target/legacy-modern-target.spec.ts:1

**Message:** UI-interacting spec file contains no accessibility assertions.

```
>>>    1| import { describe, expect, test } from 'vitest'
       2| import { findAssetFile, isBuild, page, viteTestUrl } from '~utils'
       3|
       4| test('should load and execute the JS file', async () => {
       5|   await page.goto(viteTestUrl + '/modern-target.html')
       6|   await expect.poll(() => page.textContent('#app')).toMatch('at: 3')
```

**verdict:**

---
