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

## 2. nextauthjs-next-auth — packages/adapter-d1/test/index.test.ts:21

**Message:** `adapter` is module-level mutable state assigned in a test.

```
      16| import { runBasicTests } from "utils/adapter"
      17| import Database from "better-sqlite3"
      18|
      19| const sqliteDB = new Database(":memory:")
      20| let db = new D1Database(new D1DatabaseAPI(sqliteDB as any))
>>>   21| let adapter = D1Adapter(db)
      22|
      23| beforeAll(async () => await up(db))
      24| runBasicTests({
      25|   adapter,
      26|   db: {
```

**verdict:**

---

## 3. nextauthjs-next-auth — packages/adapter-mikro-orm/test/entities.test.ts:89

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

## 4. nextauthjs-next-auth — packages/adapter-mongodb/test/serverless.test.ts:13

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

## 5. nextauthjs-next-auth — packages/adapter-pouchdb/test/index.test.ts:25

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

## 6. nextauthjs-next-auth — packages/adapter-pouchdb/test/index.test.ts:32

**Message:** `pouchdb` is module-level mutable state assigned in a test.

```
      27| PouchDB.on("destroyed", function () {
      28|   pouchdbIsDestroyed = true
      29| })
      30| const disconnect = async () => {
      31|   if (!pouchdbIsDestroyed) await pouchdb.destroy()
>>>   32| }
      33| pouchdb = new PouchDB(crypto.randomUUID(), { adapter: "memory" })
      34|
      35| // Basic tests
      36| runBasicTests({
      37|   adapter: PouchDBAdapter({ pouchdb }),
```

**verdict:**

---

## 7. nextauthjs-next-auth — packages/next-auth/test/actions.test.ts:7

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

## 8. nextauthjs-next-auth — packages/next-auth/test/actions.test.ts:85

**Message:** `nextAuth` is module-level mutable state assigned in a test.

```
      80|         "http://localhost/api/auth/verify-request?provider=nodemailer&type=email"
      81|       )
      82|     })
      83|
      84|     it("redirects to /error page when sendVerificationRequest throws", async () => {
>>>   85|       nextAuth = NextAuth({
      86|         ...config,
      87|         providers: [
      88|           Nodemailer({
      89|             sendVerificationRequest() {
      90|               throw new Error()
```

**verdict:**

---

## 9. nextauthjs-next-auth — packages/next-auth/test/middleware-fail-closed.test.ts:19

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

## 10. vitejs-vite — packages/vite/src/node/**tests**/optimizer/customExtensionBundleClose.spec.ts:19

**Message:** `root` is module-level mutable state assigned in a test.

```
      14|   if (root) fs.rmSync(root, { recursive: true, force: true })
      15|   root = undefined
      16| })
      17|
      18| test('closes temporary Rolldown bundles used to analyze custom optimizeDeps extensions', async () => {
>>>   19|   root = fs.mkdtempSync(
      20|     path.join(fs.realpathSync(os.tmpdir()), 'vite-optimizer-extension-close-'),
      21|   )
      22|   const cacheDir = path.join(root, '.vite')
      23|   const depDir = path.join(root, 'node_modules', 'custom-extension-dep')
      24|   fs.mkdirSync(depDir, { recursive: true })
```

**verdict:**

---

## 11. vitejs-vite — packages/vite/src/node/**tests**/optimizer/discoverBeforeListen.spec.ts:31

**Message:** `server` is module-level mutable state assigned in a test.

```
      26|     errors.push(typeof msg === 'string' ? msg : String(msg))
      27|   }
      28|
      29|   const bundleStarted = promiseWithResolvers<void>()
      30|
>>>   31|   server = await createServer({
      32|     configFile: false,
      33|     customLogger: logger,
      34|     root: path.join(
      35|       import.meta.dirname,
      36|       '../fixtures/optimizer-discover-before-listen',
```

**verdict:**

---

## 12. vitejs-vite — playground/client-reload/**tests**/client-reload.spec.ts:14

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

## 13. vitejs-vite — playground/hmr-full-bundle-mode/**tests**/build-hooks.spec.ts:31

**Message:** `server` is module-level mutable state assigned in a test.

```
      26|       buildEnd() {
      27|         buildEndCount++
      28|       },
      29|     }
      30|
>>>   31|     server = await createServer({
      32|       root: path.resolve(import.meta.dirname, '..'),
      33|       configFile: false,
      34|       logLevel: 'silent',
      35|       experimental: { bundledDev: true },
      36|       plugins: [countPlugin],
```

**verdict:**

---

## 14. vitejs-vite — playground/hmr-ssr/**tests**/hmr-ssr.spec.ts:1157

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

## 15. vitejs-vite — playground/hmr-ssr/**tests**/hmr-ssr.spec.ts:1196

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

## 16. sveltejs-kit — packages/kit/test/types/actions.test.ts:13

**Message:** `form` is module-level mutable state assigned in a test.

```
       8| };
       9|
      10| let form: Kit.AwaitedActions<Actions> = null as any;
      11| form.message = '';
      12| form.success = true;
>>>   13| // @ts-expect-error - cannot both be present at the same time
      14| form = { message: '', success: true };
      15|
      16| // Test: Actions with different return types are transformed into a union that has all types accessible
      17| type Actions2 = {
      18| 	foo: () => Promise<{ message: string }>;
```

**verdict:**

---

## 17. sveltejs-kit — packages/kit/test/types/actions.test.ts:25

**Message:** `form2` is module-level mutable state assigned in a test.

```
      20| };
      21|
      22| let form2: Kit.AwaitedActions<Actions2> = null as any;
      23| form2.message = '';
      24| form2.success = true;
>>>   25| // @ts-expect-error - cannot both be present at the same time
      26| form2 = { message: '', success: true };
      27|
      28| // Test: ActionFailure is correctly infered to be different from the normal return type even if they have the same shape
      29| type Actions3 = {
      30| 	bar: () => Kit.ActionFailure<{ foo: string }> | { status: number; data: { bar: string } };
```

**verdict:**

---

## 18. sveltejs-kit — packages/kit/test/types/actions.test.ts:35

**Message:** `form3` is module-level mutable state assigned in a test.

```
      30| 	bar: () => Kit.ActionFailure<{ foo: string }> | { status: number; data: { bar: string } };
      31| };
      32| let form3: Kit.AwaitedActions<Actions3> = null as any;
      33| form3.foo = '';
      34| form3.status = 200;
>>>   35| // @ts-expect-error - cannot both be present at the same time
      36| form3 = { foo: '', status: 200 };
      37|
      38| const foo: any = null;
      39| // @ts-expect-error ActionFailure is not a class and so you can't do instanceof
      40| foo instanceof Kit.ActionFailure;
```

**verdict:**

---

## 19. sveltejs-kit — packages/kit/test/types/load.test.ts:11

**Message:** `result1` is module-level mutable state assigned in a test.

```
       6| 	| { success?: undefined; message: string };
       7|
       8| let result1: Kit.LoadProperties<LoadReturn1> = null as any;
       9| result1.message = '';
      10| result1.success = true;
>>>   11| // @ts-expect-error - cannot both be present at the same time
      12| result1 = { message: '', success: true };
      13|
```

**verdict:**

---

## 20. withastro-astro — packages/astro/test/0-css.test.ts:16

**Message:** `fixture` is module-level mutable state assigned in a test.

```
      11|
      12| let fixture: Fixture;
      13|
      14| describe('CSS', function () {
      15| 	before(async () => {
>>>   16| 		fixture = await loadFixture({ root: './fixtures/0-css/', outDir: './dist/0-css/' });
      17| 	});
      18|
      19| 	// test HTML and CSS contents for accuracy
      20| 	describe('build', () => {
      21| 		let $: cheerio.CheerioAPI;
```

**verdict:**

---
