# QA-PW-119 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — packages/adapter-d1/test/index.test.ts:20

**Message:** `db` is module-level mutable state assigned in a test.

```
      15| import { D1Database, D1DatabaseAPI } from "@miniflare/d1"
      16| import { runBasicTests } from "utils/adapter"
      17| import Database from "better-sqlite3"
      18|
      19| const sqliteDB = new Database(":memory:")
>>>   20| let db = new D1Database(new D1DatabaseAPI(sqliteDB as any))
      21| let adapter = D1Adapter(db)
      22|
      23| beforeAll(async () => await up(db))
      24| runBasicTests({
      25|   adapter,
```

**verdict:**

---

## 2. nextauthjs-next-auth — packages/adapter-mikro-orm/test/entities.test.ts:89

**Message:** `_init` is module-level mutable state assigned in a test.

```
      84| }
      85|
      86| async function getORM() {
      87|   if (_init) return _init
      88|
>>>   89|   _init = await MikroORM.init(config)
      90|   return _init
      91| }
      92|
      93| runBasicTests({
      94|   adapter: MikroOrmAdapter(config, { entities: { User } }),
```

**verdict:**

---

## 3. nextauthjs-next-auth — packages/adapter-mongodb/test/serverless.test.ts:13

**Message:** `mongoClientCount` is module-level mutable state assigned in a test.

```
       8|
       9| const onClose = vi.fn(async (client: MongoClient) => {
      10|   await client.close()
      11| })
      12|
>>>   13| let mongoClientCount = 0
      14|
      15| runBasicTests({
      16|   adapter: MongoDBAdapter(
      17|     async () => {
      18|       const client = await new MongoClient(
```

**verdict:**

---

## 4. nextauthjs-next-auth — packages/adapter-pouchdb/test/index.test.ts:25

**Message:** `pouchdbIsDestroyed` is module-level mutable state assigned in a test.

```
      20| // pouchdb setup
      21| PouchDB.plugin(memoryAdapter).plugin(find)
      22| let pouchdb: PouchDB.Database
      23| let pouchdbIsDestroyed: boolean = false
      24| PouchDB.on("created", function () {
>>>   25|   pouchdbIsDestroyed = false
      26| })
      27| PouchDB.on("destroyed", function () {
      28|   pouchdbIsDestroyed = true
      29| })
      30| const disconnect = async () => {
```

**verdict:**

---

## 5. nextauthjs-next-auth — packages/next-auth/test/actions.test.ts:7

**Message:** `mockedHeaders` is module-level mutable state assigned in a test.

```
       2| import NextAuth, { NextAuthConfig } from "../src"
       3| // TODO: Move the MemoryAdapter to utils package
       4| import { MemoryAdapter } from "../../core/test/memory-adapter"
       5| import Nodemailer from "@auth/core/providers/nodemailer"
       6|
>>>    7| let mockedHeaders = vi.hoisted(() => {
       8|   return new globalThis.Headers()
       9| })
      10|
      11| const mockRedirect = vi.hoisted(() => vi.fn())
      12|
```

**verdict:**

---

## 6. nextauthjs-next-auth — packages/next-auth/test/middleware-fail-closed.test.ts:19

**Message:** `mockedHeaders` is module-level mutable state assigned in a test.

```
      14|       clientSecret: "client-secret",
      15|     },
      16|   ],
      17| }
      18|
>>>   19| let mockedHeaders = vi.hoisted(() => new globalThis.Headers())
      20|
      21| vi.mock("next/headers", async (importOriginal) => {
      22|   const originalModule = await importOriginal<typeof import("next/headers")>()
      23|   return {
      24|     ...originalModule,
```

**verdict:**

---

## 7. vitejs-vite — playground/client-reload/**tests**/client-reload.spec.ts:14

**Message:** `server` is module-level mutable state assigned in a test.

```
       9|   await server?.close()
      10| })
      11|
      12| async function testClientReload(serverOptions: ServerOptions) {
      13|   // start server
>>>   14|   server = await createServer({
      15|     root: path.resolve(import.meta.dirname, '..'),
      16|     logLevel: 'silent',
      17|     server: {
      18|       strictPort: true,
      19|       ...serverOptions,
```

**verdict:**

---

## 8. vitejs-vite — playground/hmr-ssr/**tests**/hmr-ssr.spec.ts:1157

**Message:** `server` is module-level mutable state assigned in a test.

```
    1152|
    1153|   const logger = new HMRMockLogger()
    1154|   // @ts-expect-error not typed for HMR
    1155|   globalThis.log = (...msg) => logger.log(...msg)
    1156|
>>> 1157|   server = await createServer({
    1158|     configFile: resolve(testDir, 'vite.config.ts'),
    1159|     root: testDir,
    1160|     customLogger: createInMemoryLogger(serverLogs),
    1161|     server: {
    1162|       middlewareMode: true,
```

**verdict:**

---

## 9. vitejs-vite — playground/hmr-ssr/**tests**/hmr-ssr.spec.ts:1196

**Message:** `runner` is module-level mutable state assigned in a test.

```
    1191|       bundledDev: isBundledDev,
    1192|     },
    1193|     ...serverOptions,
    1194|   })
    1195|
>>> 1196|   runner = (server.environments.ssr as RunnableDevEnvironment).runner
    1197|
    1198|   await waitForWatcher(server, waitForFile)
    1199|
    1200|   await runner.import(entrypoint)
    1201|
```

**verdict:**

---

## 10. sveltejs-kit — packages/adapter-bun/test/env.spec.ts:6

**Message:** `instance` is module-level mutable state assigned in a test.

```
       1| import process from 'node:process';
       2| import { afterEach, describe, expect, test } from 'bun:test';
       3| import { mock_manifest } from './mocks.js';
       4|
       5| const changed = new Set<string>();
>>>    6| let instance = 0;
       7|
       8| afterEach(() => {
       9| 	for (const name of changed) delete process.env[name];
      10| 	changed.clear();
      11| });
```

**verdict:**

---

## 11. sveltejs-kit — packages/adapter-bun/test/handler.spec.ts:6

**Message:** `instance` is module-level mutable state assigned in a test.

```
       1| import process from 'node:process';
       2| import { afterEach, expect, mock, spyOn, test } from 'bun:test';
       3| import { mock_manifest, mock_routes } from './mocks.js';
       4|
       5| const environment = new Set<string>();
>>>    6| let instance = 0;
       7|
       8| afterEach(() => {
       9| 	for (const name of environment) delete process.env[name];
      10| 	environment.clear();
      11| 	mock.restore();
```

**verdict:**

---

## 12. sveltejs-kit — packages/adapter-bun/test/routes.spec.ts:9

**Message:** `instance` is module-level mutable state assigned in a test.

```
       4| import { mock_manifest } from './mocks.js';
       5|
       6| const meta = { hash: 'abc', mtime: 0 };
       7| // the module resolves assets from its own directory, which is src/ under bun test
       8| const dir = path.dirname(fileURLToPath(new URL('../src/routes-util.js', import.meta.url)));
>>>    9| let instance = 0;
      10|
      11| afterEach(() => {
      12| 	mock.restore();
      13| });
      14|
```

**verdict:**

---

## 13. sveltejs-kit — packages/adapter-bun/test/start.spec.ts:8

**Message:** `instance` is module-level mutable state assigned in a test.

```
       3| import { afterAll, afterEach, expect, jest, mock, spyOn, test } from 'bun:test';
       4| import { mock_manifest, mock_routes } from './mocks.js';
       5|
       6| // the const captures the real module object before any test swaps the live binding
       7| const real_process = process;
>>>    8| let instance = 0;
       9|
      10| afterEach(() => {
      11| 	jest.useRealTimers();
      12| 	mock.restore();
      13| });
```

**verdict:**

---

## 14. withastro-astro — packages/astro/e2e/actions-blog.test.ts:10

**Message:** `devServer` is module-level mutable state assigned in a test.

```
       5| const test = testFactory(import.meta.url, { root: './fixtures/actions-blog/' });
       6|
       7| let devServer: DevServer;
       8|
       9| test.beforeAll(async ({ astro }) => {
>>>   10| 	devServer = await astro.startDevServer();
      11| });
      12|
      13| test.afterAll(async () => {
      14| 	await devServer.stop();
      15| });
```

**verdict:**

---

## 15. withastro-astro — packages/astro/e2e/actions-react-19.test.ts:10

**Message:** `devServer` is module-level mutable state assigned in a test.

```
       5| const test = testFactory(import.meta.url, { root: './fixtures/actions-react-19/' });
       6|
       7| let devServer: DevServer;
       8|
       9| test.beforeAll(async ({ astro }) => {
>>>   10| 	devServer = await astro.startDevServer();
      11| });
      12|
      13| test.afterEach(({ astro }) => {
      14| 	// Reset the store between tests by deleting its data file
      15| 	rmSync(new URL('src/db/temp', astro.config.root), { recursive: true, force: true });
```

**verdict:**

---

## 16. withastro-astro — packages/astro/e2e/astro-component.test.ts:9

**Message:** `devServer` is module-level mutable state assigned in a test.

```
       4| const test = testFactory(import.meta.url, { root: './fixtures/astro-component/' });
       5|
       6| let devServer: DevServer;
       7|
       8| test.beforeAll(async ({ astro }) => {
>>>    9| 	devServer = await astro.startDevServer();
      10| });
      11|
      12| test.afterAll(async () => {
      13| 	await devServer.stop();
      14| });
```

**verdict:**

---

## 17. withastro-astro — packages/astro/e2e/astro-envs.test.ts:22

**Message:** `devServer` is module-level mutable state assigned in a test.

```
      17| });
      18|
      19| let devServer: DevServer;
      20|
      21| test.beforeAll(async ({ astro }) => {
>>>   22| 	devServer = await astro.startDevServer();
      23| });
      24|
      25| test.afterAll(async () => {
      26| 	await devServer.stop();
      27| });
```

**verdict:**

---

## 18. withastro-astro — packages/astro/e2e/client-idle-timeout.test.ts:9

**Message:** `devServer` is module-level mutable state assigned in a test.

```
       4| const test = testFactory(import.meta.url, { root: './fixtures/client-idle-timeout/' });
       5|
       6| let devServer: DevServer;
       7|
       8| test.beforeAll(async ({ astro }) => {
>>>    9| 	devServer = await astro.startDevServer();
      10| });
      11|
      12| test.afterAll(async () => {
      13| 	await devServer.stop();
      14| });
```

**verdict:**

---

## 19. withastro-astro — packages/astro/e2e/client-only.test.ts:9

**Message:** `devServer` is module-level mutable state assigned in a test.

```
       4| const test = testFactory(import.meta.url, { root: './fixtures/client-only/' });
       5|
       6| let devServer: DevServer;
       7|
       8| test.beforeAll(async ({ astro }) => {
>>>    9| 	devServer = await astro.startDevServer();
      10| });
      11|
      12| test.afterAll(async () => {
      13| 	await devServer.stop();
      14| });
```

**verdict:**

---

## 20. withastro-astro — packages/astro/e2e/cloudflare-node-prerender-hmr.test.ts:14

**Message:** `devServer` is module-level mutable state assigned in a test.

```
       9| });
      10|
      11| let devServer: DevServer;
      12|
      13| test.beforeAll(async ({ astro }) => {
>>>   14| 	devServer = await astro.startDevServer();
      15| });
      16|
      17| test.afterAll(async () => {
      18| 	await devServer.stop();
      19| });
```

**verdict:**

---
