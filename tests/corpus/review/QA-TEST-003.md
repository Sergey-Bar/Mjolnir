# QA-TEST-003 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — packages/frameworks-express/test/http-api-adapters/request.test.ts:38

**Message:** Test contains no assertions.

```
      33|   beforeEach(() => {
      34|     app = express()
      35|     client = supertest(app)
      36|   })
      37|
>>>   38|   it("adapts request headers", async () => {
      39|     let expectations: Function = () => {}
      40|
      41|     app.use(express.json())
      42|
      43|     app.post("/", async (req, res) => {
```

**verdict:**

---

## 2. nextauthjs-next-auth — packages/frameworks-express/test/http-api-adapters/request.test.ts:61

**Message:** Test contains no assertions.

```
      56|       .set("Accept", "application/json")
      57|
      58|     await expectations()
      59|   })
      60|
>>>   61|   it("adapts request with json encoded body", async () => {
      62|     let expectations: Function = () => {}
      63|
      64|     app.use(express.json())
      65|
      66|     app.post("/", async (req, res) => {
```

**verdict:**

---

## 3. nextauthjs-next-auth — packages/frameworks-express/test/http-api-adapters/request.test.ts:85

**Message:** Test contains no assertions.

```
      80|     await client.post("/").set("Content-Type", "application/json").send(data)
      81|
      82|     await expectations()
      83|   })
      84|
>>>   85|   it("adapts request with url-encoded body", async () => {
      86|     let expectations: Function = () => {}
      87|
      88|     app.use(express.urlencoded())
      89|
      90|     app.post("/", async (req, res) => {
```

**verdict:**

---

## 4. vitejs-vite — packages/vite/src/node/**tests**/plugins/terser.spec.ts:41

**Message:** Test contains no assertions.

```
      36|       ],
      37|     })) as RollupOutput
      38|     return result.output[0].code
      39|   }
      40|
>>>   41|   test('basic', async () => {
      42|     await run({})
      43|   })
      44|
      45|   test('nth', async () => {
      46|     const resultCode = await run({
```

**verdict:**

---

## 5. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:375

**Message:** Test contains no assertions.

```
     370|       }
     371|       throw e
     372|     }
     373|   }
     374|
>>>  375|   test('start with number', () => {
     376|     expectSnapshot(generateCodeFrame(source, -1))
     377|     expectSnapshot(generateCodeFrame(source, 0))
     378|     expectSnapshot(generateCodeFrame(source, 1))
     379|     expectSnapshot(generateCodeFrame(source, 24))
     380|   })
```

**verdict:**

---

## 6. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:382

**Message:** Test contains no assertions.

```
     377|     expectSnapshot(generateCodeFrame(source, 0))
     378|     expectSnapshot(generateCodeFrame(source, 1))
     379|     expectSnapshot(generateCodeFrame(source, 24))
     380|   })
     381|
>>>  382|   test('start with position', () => {
     383|     expectSnapshot(generateCodeFrame(source, { line: 1, column: 0 }))
     384|     expectSnapshot(generateCodeFrame(source, { line: 1, column: 1 }))
     385|     expectSnapshot(generateCodeFrame(source, { line: 2, column: 0 }))
     386|   })
     387|
```

**verdict:**

---

## 7. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:388

**Message:** Test contains no assertions.

```
     383|     expectSnapshot(generateCodeFrame(source, { line: 1, column: 0 }))
     384|     expectSnapshot(generateCodeFrame(source, { line: 1, column: 1 }))
     385|     expectSnapshot(generateCodeFrame(source, { line: 2, column: 0 }))
     386|   })
     387|
>>>  388|   test('works with CRLF', () => {
     389|     expectSnapshot(generateCodeFrame(sourceCrLf, { line: 2, column: 0 }))
     390|   })
     391|
     392|   test('end', () => {
     393|     expectSnapshot(generateCodeFrame(source, 0, 0))
```

**verdict:**

---

## 8. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:392

**Message:** Test contains no assertions.

```
     387|
     388|   test('works with CRLF', () => {
     389|     expectSnapshot(generateCodeFrame(sourceCrLf, { line: 2, column: 0 }))
     390|   })
     391|
>>>  392|   test('end', () => {
     393|     expectSnapshot(generateCodeFrame(source, 0, 0))
     394|     expectSnapshot(generateCodeFrame(source, 0, 23))
     395|     expectSnapshot(generateCodeFrame(source, 0, 29))
     396|     expectSnapshot(generateCodeFrame(source, 0, source.length))
     397|     expectSnapshot(generateCodeFrame(source, 0, source.length + 1))
```

**verdict:**

---

## 9. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:401

**Message:** Test contains no assertions.

```
     396|     expectSnapshot(generateCodeFrame(source, 0, source.length))
     397|     expectSnapshot(generateCodeFrame(source, 0, source.length + 1))
     398|     expectSnapshot(generateCodeFrame(source, 0, source.length + 100))
     399|   })
     400|
>>>  401|   test('range', () => {
     402|     expectSnapshot(generateCodeFrame(longSource, { line: 3, column: 0 }))
     403|     expectSnapshot(
     404|       generateCodeFrame(
     405|         longSource,
     406|         { line: 3, column: 0 },
```

**verdict:**

---

## 10. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:412

**Message:** Test contains no assertions.

```
     407|         { line: 4, column: 0 },
     408|       ),
     409|     )
     410|   })
     411|
>>>  412|   test('invalid start > end', () => {
     413|     expectSnapshot(generateCodeFrame(source, 2, 0))
     414|   })
     415|
     416|   test('supports more than 1000 lines', () => {
     417|     expectSnapshot(generateCodeFrame(veryLongSource, { line: 1200, column: 0 }))
```

**verdict:**

---

## 11. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:416

**Message:** Test contains no assertions.

```
     411|
     412|   test('invalid start > end', () => {
     413|     expectSnapshot(generateCodeFrame(source, 2, 0))
     414|   })
     415|
>>>  416|   test('supports more than 1000 lines', () => {
     417|     expectSnapshot(generateCodeFrame(veryLongSource, { line: 1200, column: 0 }))
     418|   })
     419|
     420|   test('long line (start)', () => {
     421|     const longLine = 'a'.repeat(60) + 'b'.repeat(60) + 'c'.repeat(60)
```

**verdict:**

---

## 12. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:420

**Message:** Test contains no assertions.

```
     415|
     416|   test('supports more than 1000 lines', () => {
     417|     expectSnapshot(generateCodeFrame(veryLongSource, { line: 1200, column: 0 }))
     418|   })
     419|
>>>  420|   test('long line (start)', () => {
     421|     const longLine = 'a'.repeat(60) + 'b'.repeat(60) + 'c'.repeat(60)
     422|     const src = `${longLine}\nshort line\n${longLine}`
     423|     const frame = generateCodeFrame(
     424|       src,
     425|       { line: 1, column: 0 },
```

**verdict:**

---

## 13. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:431

**Message:** Test contains no assertions.

```
     426|       { line: 1, column: 30 },
     427|     )
     428|     expectSnapshot(frame)
     429|   })
     430|
>>>  431|   test('long line (center)', () => {
     432|     const longLine = 'a'.repeat(60) + 'b'.repeat(60) + 'c'.repeat(60)
     433|     const src = `${longLine}\nshort line\n${longLine}`
     434|     const frame = generateCodeFrame(
     435|       src,
     436|       { line: 1, column: 90 },
```

**verdict:**

---

## 14. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:442

**Message:** Test contains no assertions.

```
     437|       { line: 1, column: 120 },
     438|     )
     439|     expectSnapshot(frame)
     440|   })
     441|
>>>  442|   test('long line (end)', () => {
     443|     const longLine = 'a'.repeat(60) + 'b'.repeat(60) + 'c'.repeat(60)
     444|     const src = `${longLine}\nshort line\n${longLine}`
     445|     const frame = generateCodeFrame(
     446|       src,
     447|       { line: 1, column: 150 },
```

**verdict:**

---

## 15. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:453

**Message:** Test contains no assertions.

```
     448|       { line: 1, column: 180 },
     449|     )
     450|     expectSnapshot(frame)
     451|   })
     452|
>>>  453|   test('long line (whole)', () => {
     454|     const longLine = 'a'.repeat(60) + 'b'.repeat(60) + 'c'.repeat(60)
     455|     const src = `${longLine}\nshort line\n${longLine}`
     456|     const frame = generateCodeFrame(
     457|       src,
     458|       { line: 1, column: 0 },
```

**verdict:**

---

## 16. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:464

**Message:** Test contains no assertions.

```
     459|       { line: 1, column: 180 },
     460|     )
     461|     expectSnapshot(frame)
     462|   })
     463|
>>>  464|   test('long line (multiline 1)', () => {
     465|     const longLine = 'a'.repeat(60) + 'b'.repeat(60) + 'c'.repeat(60)
     466|     const src = `${longLine}\nshort line\n${longLine}`
     467|     const frame = generateCodeFrame(
     468|       src,
     469|       { line: 1, column: 170 },
```

**verdict:**

---

## 17. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:475

**Message:** Test contains no assertions.

```
     470|       { line: 2, column: 5 },
     471|     )
     472|     expectSnapshot(frame)
     473|   })
     474|
>>>  475|   test('long line (multiline 2)', () => {
     476|     const longLine = 'a'.repeat(60) + 'b'.repeat(60) + 'c'.repeat(60)
     477|     const src = `${longLine}\nshort line\n${longLine}`
     478|     const frame = generateCodeFrame(
     479|       src,
     480|       { line: 2, column: 5 },
```

**verdict:**

---

## 18. vitejs-vite — packages/vite/src/node/server/**tests**/hmr.spec.ts:42

**Message:** Test contains no assertions.

```
      37|       server,
      38|     ),
      39|   ).resolves.toBeUndefined()
      40| }
      41|
>>>   42| test('cancels HMR when the server restarts during a hot update', async () => {
      43|   await testRestartDuringHotUpdate()
      44| })
      45|
      46| test('does not schedule stale HMR with a custom environment handler', async () => {
      47|   let hotUpdateEnvironmentsCalls = 0
```

**verdict:**

---

## 19. vitejs-vite — packages/vite/src/node/server/**tests**/pluginContainer.spec.ts:149

**Message:** Test contains no assertions.

```
     144|       expect.assertions(2)
     145|     })
     146|   })
     147|
     148|   describe('options', () => {
>>>  149|     it('should not throw errors when this.debug is called', async () => {
     150|       const plugin: Plugin = {
     151|         name: 'p1',
     152|         options() {
     153|           this.debug('test')
     154|         },
```

**verdict:**

---

## 20. vitejs-vite — packages/vite/src/node/server/**tests**/pluginContainer.spec.ts:268

**Message:** Test contains no assertions.

```
     263|         entryUrl,
     264|       )
     265|       expect(result.code).equals('3')
     266|     })
     267|
>>>  268|     it('should not throw errors when this.debug is called', async () => {
     269|       const plugin: Plugin = {
     270|         name: 'p1',
     271|         load() {
     272|           this.debug({ message: 'test', pos: 12 })
     273|         },
```

**verdict:**

---
