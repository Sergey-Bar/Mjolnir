# QA-ENV-001 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.TestingHarnessTest/tests/mstest.spec.ts:561

**Message:** Environment coupling (fixed port): `127.0.0.1:1234`.

```
     556|       'ExampleTests.cs': ExampleTestWithConnectOptions,
     557|     }, 'dotnet test');
     558|     expect(result.passed).toBe(0);
     559|     expect(result.failed).toBe(1);
     560|     expect(result.total).toBe(1);
>>>  561|     expect(result.rawStdout).toContain('connect ECONNREFUSED 127.0.0.1:1234')
     562|   });
     563|
     564|   test('should pass when the server is reachable', async ({ runTest, launchServer }) => {
     565|     await launchServer({ port: 1234 });
     566|     const result = await runTest({
```

**verdict:**

---

## 2. microsoft-playwright-dotnet — src/Playwright.TestingHarnessTest/tests/mstest.v4.spec.ts:561

**Message:** Environment coupling (fixed port): `127.0.0.1:1234`.

```
     556|       'ExampleTests.cs': ExampleTestWithConnectOptions,
     557|     }, 'dotnet test');
     558|     expect(result.passed).toBe(0);
     559|     expect(result.failed).toBe(1);
     560|     expect(result.total).toBe(1);
>>>  561|     expect(result.rawStdout).toContain('connect ECONNREFUSED 127.0.0.1:1234')
     562|   });
     563|
     564|   test('should pass when the server is reachable', async ({ runTest, launchServer }) => {
     565|     await launchServer({ port: 1234 });
     566|     const result = await runTest({
```

**verdict:**

---

## 3. microsoft-playwright-dotnet — src/Playwright.TestingHarnessTest/tests/nunit.spec.ts:557

**Message:** Environment coupling (fixed port): `127.0.0.1:1234`.

```
     552|       'ExampleTests.cs': ExampleTestWithConnectOptions,
     553|     }, 'dotnet test');
     554|     expect(result.passed).toBe(0);
     555|     expect(result.failed).toBe(1);
     556|     expect(result.total).toBe(1);
>>>  557|     expect(result.rawStdout).toContain('connect ECONNREFUSED 127.0.0.1:1234')
     558|   });
     559|
     560|   test('should pass when the server is reachable', async ({ runTest, launchServer }) => {
     561|     await launchServer({ port: 1234 });
     562|     const result = await runTest({
```

**verdict:**

---

## 4. microsoft-playwright-dotnet — src/Playwright.TestingHarnessTest/tests/xunit.spec.ts:603

**Message:** Environment coupling (fixed port): `127.0.0.1:1234`.

```
     598|       'ExampleTests.cs': ExampleTestWithConnectOptions,
     599|     }, 'dotnet test');
     600|     expect(result.passed).toBe(0);
     601|     expect(result.failed).toBe(1);
     602|     expect(result.total).toBe(1);
>>>  603|     expect(result.rawStdout).toContain('connect ECONNREFUSED 127.0.0.1:1234')
     604|   });
     605|
     606|   test('should pass when the server is reachable', async ({ runTest, launchServer }) => {
     607|     await launchServer({ port: 1234 });
     608|     const result = await runTest({
```

**verdict:**

---

## 5. microsoft-playwright-dotnet — src/Playwright.TestingHarnessTest/tests/xunit.v3.spec.ts:597

**Message:** Environment coupling (fixed port): `127.0.0.1:1234`.

```
     592|       'ExampleTests.cs': ExampleTestWithConnectOptions,
     593|     }, 'dotnet test');
     594|     expect(result.passed).toBe(0);
     595|     expect(result.failed).toBe(1);
     596|     expect(result.total).toBe(1);
>>>  597|     expect(result.rawStdout).toContain('connect ECONNREFUSED 127.0.0.1:1234')
     598|   });
     599|
     600|   test('should pass when the server is reachable', async ({ runTest, launchServer }) => {
     601|     await launchServer({ port: 1234 });
     602|     const result = await runTest({
```

**verdict:**

---

## 6. nextauthjs-next-auth — packages/adapter-azure-tables/test/index.test.ts:14

**Message:** Environment coupling (fixed port): `127.0.0.1:10002`.

```
       9|
      10| const testAccount = {
      11|   // default constants used by a dev instance of azurite
      12|   name: "devstoreaccount1",
      13|   key: "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
>>>   14|   tableEndpoint: "http://127.0.0.1:10002/devstoreaccount1",
      15| }
      16|
      17| const authTableName = "authTest"
      18|
      19| const credential = new AzureNamedKeyCredential(
```

**verdict:**

---

## 7. nextauthjs-next-auth — packages/adapter-dgraph/test/index.test.ts:11

**Message:** Environment coupling (fixed port): `localhost:8080`.

```
       6| import path from "path"
       7|
       8| import type { DgraphClientParams } from "../src"
       9|
      10| const params: DgraphClientParams = {
>>>   11|   endpoint: "http://localhost:8080/graphql",
      12|   authToken: "test",
      13|   jwtAlgorithm: "RS256",
      14|   jwtSecret: fs.readFileSync(path.join(process.cwd(), "/test/private.key"), {
      15|     encoding: "utf8",
      16|   }),
```

**verdict:**

---

## 8. nextauthjs-next-auth — packages/adapter-dynamodb/test/index.test.ts:7

**Message:** Environment coupling (fixed port): `127.0.0.1:8000`.

```
       2| import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb"
       3| import { DynamoDBAdapter, format } from "../src"
       4| import { runBasicTests } from "utils/adapter"
       5|
       6| const config = {
>>>    7|   endpoint: "http://127.0.0.1:8000",
       8|   region: "eu-central-1",
       9|   tls: false,
      10|   credentials: {
      11|     accessKeyId: "foo",
      12|     secretAccessKey: "bar",
```

**verdict:**

---

## 9. nextauthjs-next-auth — packages/adapter-fauna/test/index.test.ts:14

**Message:** Environment coupling (fixed port): `localhost:8443`.

```
       9|   FaunaVerificationToken,
      10| } from "../src"
      11|
      12| const client = new Client({
      13|   secret: "secret",
>>>   14|   endpoint: new URL("http://localhost:8443"),
      15| })
      16|
      17| runBasicTests({
      18|   adapter: FaunaAdapter(client),
      19|   db: {
```

**verdict:**

---

## 10. nextauthjs-next-auth — packages/adapter-hasura/test/index.test.ts:18

**Message:** Environment coupling (fixed port): `localhost:8080`.

```
      13|   VerificationTokenFragmentDoc,
      14| } from "../src/lib/generated/graphql"
      15| import { client as hasuraClient } from "../src/lib/client"
      16|
      17| const client = hasuraClient({
>>>   18|   endpoint: "http://localhost:8080/v1/graphql",
      19|   adminSecret: "myadminsecretkey",
      20| })
      21|
      22| runBasicTests({
      23|   adapter: HasuraAdapter({
```

**verdict:**

---

## 11. nextauthjs-next-auth — packages/adapter-hasura/test/index.test.ts:25

**Message:** Environment coupling (fixed port): `localhost:8080`.

```
      20| })
      21|
      22| runBasicTests({
      23|   adapter: HasuraAdapter({
      24|     adminSecret: "myadminsecretkey",
>>>   25|     endpoint: "http://localhost:8080/v1/graphql",
      26|   }),
      27|   db: {
      28|     async connect() {
      29|       await client.run(DeleteAllDocument)
      30|     },
```

**verdict:**

---

## 12. nextauthjs-next-auth — packages/adapter-mongodb/test/custom.test.ts:5

**Message:** Environment coupling (fixed port): `localhost:27017`.

```
       1| import { runBasicTests } from "utils/adapter"
       2| import { defaultCollections, format, MongoDBAdapter, _id } from "../src"
       3| import { MongoClient } from "mongodb"
       4| const name = "custom-test"
>>>    5| const client = new MongoClient(`mongodb://localhost:27017/${name}`)
       6|
       7| const collections = { ...defaultCollections, Users: "some_userz" }
       8|
       9| runBasicTests({
      10|   adapter: MongoDBAdapter(client, {
```

**verdict:**

---

## 13. nextauthjs-next-auth — packages/adapter-mongodb/test/index.test.ts:6

**Message:** Environment coupling (fixed port): `localhost:27017`.

```
       1| import { runBasicTests } from "utils/adapter"
       2| import { defaultCollections, format, MongoDBAdapter, _id } from "../src"
       3| import { MongoClient } from "mongodb"
       4|
       5| const name = "test"
>>>    6| const client = new MongoClient(`mongodb://localhost:27017/${name}`)
       7|
       8| runBasicTests({
       9|   adapter: MongoDBAdapter(client),
      10|   db: {
      11|     async disconnect() {
```

**verdict:**

---

## 14. nextauthjs-next-auth — packages/adapter-mongodb/test/serverless.test.ts:7

**Message:** Environment coupling (fixed port): `localhost:27017`.

```
       2| import { defaultCollections, format, MongoDBAdapter, _id } from "../src"
       3| import { MongoClient } from "mongodb"
       4| import { expect, test, vi } from "vitest"
       5|
       6| const name = "serverless-test"
>>>    7| const client = new MongoClient(`mongodb://localhost:27017/${name}`)
       8|
       9| const onClose = vi.fn(async (client: MongoClient) => {
      10|   await client.close()
      11| })
      12|
```

**verdict:**

---

## 15. nextauthjs-next-auth — packages/adapter-mongodb/test/serverless.test.ts:19

**Message:** Environment coupling (fixed port): `localhost:27017`.

```
      14|
      15| runBasicTests({
      16|   adapter: MongoDBAdapter(
      17|     async () => {
      18|       const client = await new MongoClient(
>>>   19|         `mongodb://localhost:27017/${name}`
      20|       ).connect()
      21|       mongoClientCount++
      22|       return client
      23|     },
      24|     {
```

**verdict:**

---

## 16. nextauthjs-next-auth — packages/adapter-supabase/test/index.test.ts:11

**Message:** Environment coupling (fixed port): `127.0.0.1:54321`.

```
       6|   AdapterUser,
       7|   VerificationToken,
       8| } from "@auth/core/adapters"
       9| import type { Account } from "@auth/core/types"
      10|
>>>   11| const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321"
      12| const secret =
      13|   process.env.SUPABASE_SERVICE_ROLE_KEY ||
      14|   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9.vI9obAHOGyVVKa3pD--kJlyxp-Z2zV9UUMAhKpNLAcU"
      15|
      16| const supabase = createClient(url, secret, {
```

**verdict:**

---

## 17. nextauthjs-next-auth — packages/adapter-typeorm/test/index.test.ts:3

**Message:** Environment coupling (fixed port): `localhost:3306`.

```
       1| import { parseDataSourceConfig } from "../src/utils"
       2|
>>>    3| const connectionString = "mysql://root:password@localhost:3306/next-auth"
       4|
       5| test("could parse connection string", () => {
       6|   expect(parseDataSourceConfig(connectionString)).toEqual(
       7|     expect.objectContaining({
       8|       type: "mysql",
```

**verdict:**

---

## 18. nextauthjs-next-auth — packages/adapter-typeorm/test/postgresql/index.custom.test.ts:7

**Message:** Environment coupling (fixed port): `localhost:5432`.

```
       2| import { TypeORMAdapter } from "../../src"
       3| import * as entities from "../custom-entities"
       4| import { db } from "../helpers"
       5|
       6| const postgresConfig =
>>>    7|   "postgres://nextauth:password@localhost:5432/nextauth?synchronize=true"
       8|
       9| runBasicTests({
      10|   adapter: TypeORMAdapter(postgresConfig, {
      11|     entities,
      12|   }),
```

**verdict:**

---

## 19. nextauthjs-next-auth — packages/adapter-typeorm/test/postgresql/index.test.ts:6

**Message:** Environment coupling (fixed port): `localhost:5432`.

```
       1| import { runBasicTests } from "utils/adapter"
       2| import { TypeORMAdapter } from "../../src"
       3| import { db } from "../helpers"
       4|
       5| const postgresConfig =
>>>    6|   "postgres://nextauth:password@localhost:5432/nextauth?synchronize=true"
       7|
       8| runBasicTests({
       9|   adapter: TypeORMAdapter(postgresConfig),
      10|   db: db(postgresConfig),
      11| })
```

**verdict:**

---

## 20. nextauthjs-next-auth — packages/adapter-upstash-redis/test/index.test.ts:7

**Message:** Environment coupling (fixed port): `localhost:8079`.

```
       2| import { runBasicTests } from "utils/adapter"
       3| import { hydrateDates, UpstashRedisAdapter } from "../src"
       4| import "dotenv/config"
       5|
       6| const client = new Redis({
>>>    7|   url: "http://localhost:8079",
       8|   token: "uwndz1YIfm9k78mx+mjW8qe7CX33VxRYnscDpZVkt4Y=",
       9| })
      10|
      11| runBasicTests({
      12|   adapter: UpstashRedisAdapter(client, { baseKeyPrefix: "testApp:" }),
```

**verdict:**

---
