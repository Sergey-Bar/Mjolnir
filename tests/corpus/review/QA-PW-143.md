# QA-PW-143 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-mcp — playwright.config.ts:1

**Message:** playwright.config captures neither screenshots nor video on failure.

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

## 2. microsoft-playwright-dotnet — src/Playwright.TestingHarnessTest/playwright.config.ts:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| import type { PlaywrightTestConfig } from '@playwright/test';
       2|
       3| const config: PlaywrightTestConfig = {
       4|   testDir: './tests',
       5|   timeout: 2 * 60 * 1_000,
       6|   workers: 1,
```

**verdict:**

---

## 3. nextauthjs-next-auth — packages/frameworks-sveltekit/playwright.config.ts:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| import type { PlaywrightTestConfig } from "@playwright/test"
       2|
       3| const config: PlaywrightTestConfig = {
       4|   webServer: {
       5|     command: "npm run build && npm run preview",
       6|     port: 4173,
```

**verdict:**

---

## 4. nextauthjs-next-auth — packages/next-auth/playwright.config.ts:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| // import { join } from "node:path"
       2| import { defineConfig, devices } from "@playwright/test"
       3| // import * as dotenv from "dotenv"
       4|
       5| // Use process.env.PORT by default and fallback to port 3000
       6| const PORT = process.env.PORT || 3000
```

**verdict:**

---

## 5. sveltejs-kit — packages/adapter-cloudflare/test/apps/workers/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 6. sveltejs-kit — packages/adapter-netlify/test/apps/basic/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 7. sveltejs-kit — packages/adapter-netlify/test/apps/edge/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 8. sveltejs-kit — packages/adapter-netlify/test/apps/instrumentation/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 9. sveltejs-kit — packages/adapter-netlify/test/apps/split/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 10. sveltejs-kit — packages/adapter-node/test/apps/basic/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 11. sveltejs-kit — packages/adapter-static/test/apps/prerendered/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 12. sveltejs-kit — packages/adapter-static/test/apps/spa/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 13. sveltejs-kit — packages/adapter-vercel/test/apps/basic/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 14. sveltejs-kit — packages/adapter-vercel/test/apps/split/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 15. sveltejs-kit — packages/enhanced-img/test/apps/basics/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 16. sveltejs-kit — packages/kit/test/apps/async/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| import process from 'node:process';
       2| import { config, port } from '../../utils.js';
       3| import { defineConfig } from '@playwright/test';
       4|
       5| export default defineConfig({
       6| 	...config,
```

**verdict:**

---

## 17. sveltejs-kit — packages/kit/test/apps/basics/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| import process from 'node:process';
       2| import { config, port } from '../../utils.js';
       3| import { defineConfig } from '@playwright/test';
       4|
       5| export default defineConfig({
       6| 	...config,
```

**verdict:**

---

## 18. sveltejs-kit — packages/kit/test/apps/dev-only/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 19. sveltejs-kit — packages/kit/test/apps/embed/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---

## 20. sveltejs-kit — packages/kit/test/apps/hash-based-routing/playwright.config.js:1

**Message:** playwright.config captures neither screenshots nor video on failure.

```
>>>    1| export { config as default } from '../../utils.js';
       2|
```

**verdict:**

---
