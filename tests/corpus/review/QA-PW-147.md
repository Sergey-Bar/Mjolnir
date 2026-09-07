# QA-PW-147 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. playwright-community-eslint-plugin-playwright — src/rules/consistent-spacing-between-blocks.test.ts:202

**Message:** Codegen default test title (test("test",) — an unreviewed recording artifact.

```
     197|       `,
     198|     },
     199|     {
     200|       code: dedent`
     201|         test("first", () => {});test("second", () => {});
>>>  202|         test.describe("suite", () => {});test("test", () => {});
     203|       `,
     204|       errors: [
     205|         { line: 1, messageId: 'missingWhitespace' },
     206|         { line: 2, messageId: 'missingWhitespace' },
     207|         { line: 2, messageId: 'missingWhitespace' },
```

**verdict:**

---

## 2. playwright-community-eslint-plugin-playwright — src/rules/consistent-spacing-between-blocks.test.ts:216

**Message:** Codegen default test title (test("test",) — an unreviewed recording artifact.

```
     211|
     212|         test("second", () => {});
     213|
     214|         test.describe("suite", () => {});
     215|
>>>  216|         test("test", () => {});
     217|       `,
     218|     },
     219|   ],
     220|   valid: [
     221|     {
```

**verdict:**

---

## 3. playwright-community-eslint-plugin-playwright — src/rules/max-expects.test.ts:209

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     204|         },
     205|       ],
     206|     },
     207|     {
     208|       code: dedent`
>>>  209|         test('test', () => {
     210|           expect.soft(1).toBe(1)
     211|           expect.soft(2).toBe(2)
     212|           expect.soft(3).toBe(3)
     213|           expect.soft(4).toBe(4)
     214|           expect.soft(5).toBe(5)
```

**verdict:**

---

## 4. playwright-community-eslint-plugin-playwright — src/rules/missing-playwright-await.test.ts:166

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     161|       output: test('await expect[`poll`](() => foo)[`toBeTruthy`]()'),
     162|     },
     163|     // expect.configure
     164|     {
     165|       code: dedent`
>>>  166|         test('test', async () => {
     167|           const softExpect = expect.configure({ soft: true })
     168|           softExpect(foo).toBeChecked()
     169|         })
     170|      `,
     171|       errors: [
```

**verdict:**

---

## 5. playwright-community-eslint-plugin-playwright — src/rules/missing-playwright-await.test.ts:181

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     176|           line: 3,
     177|           messageId: 'missingAwait',
     178|         },
     179|       ],
     180|       output: dedent`
>>>  181|         test('test', async () => {
     182|           const softExpect = expect.configure({ soft: true })
     183|           await softExpect(foo).toBeChecked()
     184|         })
     185|      `,
     186|     },
```

**verdict:**

---

## 6. playwright-community-eslint-plugin-playwright — src/rules/missing-playwright-await.test.ts:270

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     265|       `,
     266|     },
     267|     {
     268|       code: dedent`
     269|         import { expect as assuming } from '@playwright/test';
>>>  270|         test('test', async () => { assuming(page).toBeChecked() })
     271|       `,
     272|       errors: [
     273|         {
     274|           column: 28,
     275|           endColumn: 36,
```

**verdict:**

---

## 7. playwright-community-eslint-plugin-playwright — src/rules/missing-playwright-await.test.ts:283

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     278|           messageId: 'missingAwait',
     279|         },
     280|       ],
     281|       output: dedent`
     282|         import { expect as assuming } from '@playwright/test';
>>>  283|         test('test', async () => { await assuming(page).toBeChecked() })
     284|       `,
     285|     },
     286|
     287|     // waitFor methods
     288|     {
```

**verdict:**

---

## 8. playwright-community-eslint-plugin-playwright — src/rules/missing-playwright-await.test.ts:936

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     931|       `,
     932|     },
     933|     {
     934|       code: dedent`
     935|         import { expect as assuming } from '@playwright/test';
>>>  936|         test('test', async () => { await assuming(page).toBeChecked() })
     937|       `,
     938|     },
     939|     // Regression: variable passed to getByText (should not crash or false positive)
     940|     {
     941|       code: dedent(
```

**verdict:**

---

## 9. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:177

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     172|       `,
     173|       errors: [{ column: 5, endColumn: 6, endLine: 7, line: 3, messageId }],
     174|     },
     175|     {
     176|       code: dedent`
>>>  177|         test('test', async ({ page }) => {
     178|           await test.step('step', async () => {
     179|             if (true) {}
     180|           });
     181|         });
     182|       `,
```

**verdict:**

---

## 10. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:187

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     182|       `,
     183|       errors: [{ column: 5, endColumn: 17, endLine: 3, line: 3, messageId }],
     184|     },
     185|     {
     186|       code: dedent`
>>>  187|         test('test', async ({ page }) => {
     188|           await test.step.skip('step', async () => {
     189|             if (true) {}
     190|           });
     191|         });
     192|       `,
```

**verdict:**

---

## 11. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:315

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     310|       test.skip(
     311|         ({ baseURL }) => (baseURL || "").includes("localhost"),
     312|         "message",
     313|       )
     314|     })`,
>>>  315|     `test('test', async ({ page }) => {
     316|       await test.step('step', async () => {
     317|         await page.waitForRequest(request => request.url() === 'foo' && request.method() === 'GET')
     318|       });
     319|     })`,
     320|     // Global aliases
```

**verdict:**

---

## 12. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:346

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     341|     // Issue 363: conditionals in test metadata should not trigger the rule
     342|     `test('My Test', { tag: productType === 'XYZ' ? '@regression' : '@smoke' }, () => {
     343|       expect(1).toBe(1);
     344|     })`,
     345|     // Nullish coalescing operator should be allowed
>>>  346|     `test('test', async ({ page }) => {
     347|       const button = page.locator('button');
     348|       const {x = 0, y = 0, width = 0, height = 0} = (await button.boundingBox()) ?? {};
     349|     })`,
     350|     `test('test', async ({ page }) => {
     351|       const value = someFunction() ?? defaultValue;
```

**verdict:**

---

## 13. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:350

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     345|     // Nullish coalescing operator should be allowed
     346|     `test('test', async ({ page }) => {
     347|       const button = page.locator('button');
     348|       const {x = 0, y = 0, width = 0, height = 0} = (await button.boundingBox()) ?? {};
     349|     })`,
>>>  350|     `test('test', async ({ page }) => {
     351|       const value = someFunction() ?? defaultValue;
     352|     })`,
     353|     // Logical OR should be allowed
     354|     `test('test', async ({ page }) => {
     355|       const button = page.locator('button');
```

**verdict:**

---

## 14. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:354

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     349|     })`,
     350|     `test('test', async ({ page }) => {
     351|       const value = someFunction() ?? defaultValue;
     352|     })`,
     353|     // Logical OR should be allowed
>>>  354|     `test('test', async ({ page }) => {
     355|       const button = page.locator('button');
     356|       const {x = 0, y = 0, width = 0, height = 0} = (await button.boundingBox()) || {};
     357|     })`,
     358|     `test('test', async ({ page }) => {
     359|       const value = someFunction() || {};
```

**verdict:**

---

## 15. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:358

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     353|     // Logical OR should be allowed
     354|     `test('test', async ({ page }) => {
     355|       const button = page.locator('button');
     356|       const {x = 0, y = 0, width = 0, height = 0} = (await button.boundingBox()) || {};
     357|     })`,
>>>  358|     `test('test', async ({ page }) => {
     359|       const value = someFunction() || {};
     360|     })`,
     361|     `test('test', async ({ page }) => {
     362|       const value = someFunction() || { default: true };
     363|     })`,
```

**verdict:**

---

## 16. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:361

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     356|       const {x = 0, y = 0, width = 0, height = 0} = (await button.boundingBox()) || {};
     357|     })`,
     358|     `test('test', async ({ page }) => {
     359|       const value = someFunction() || {};
     360|     })`,
>>>  361|     `test('test', async ({ page }) => {
     362|       const value = someFunction() || { default: true };
     363|     })`,
     364|     // Nullish coalescing assignment should be allowed
     365|     `test('test', async ({ page }) => {
     366|       let value;
```

**verdict:**

---

## 17. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:365

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     360|     })`,
     361|     `test('test', async ({ page }) => {
     362|       const value = someFunction() || { default: true };
     363|     })`,
     364|     // Nullish coalescing assignment should be allowed
>>>  365|     `test('test', async ({ page }) => {
     366|       let value;
     367|       value ??= defaultValue;
     368|     })`,
     369|     `test('test', async ({ page }) => {
     370|       const obj = {};
```

**verdict:**

---

## 18. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:369

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     364|     // Nullish coalescing assignment should be allowed
     365|     `test('test', async ({ page }) => {
     366|       let value;
     367|       value ??= defaultValue;
     368|     })`,
>>>  369|     `test('test', async ({ page }) => {
     370|       const obj = {};
     371|       obj.prop ??= 'default';
     372|     })`,
     373|     // Logical OR assignment should be allowed
     374|     `test('test', async ({ page }) => {
```

**verdict:**

---

## 19. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:374

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     369|     `test('test', async ({ page }) => {
     370|       const obj = {};
     371|       obj.prop ??= 'default';
     372|     })`,
     373|     // Logical OR assignment should be allowed
>>>  374|     `test('test', async ({ page }) => {
     375|       let value;
     376|       value ||= defaultValue;
     377|     })`,
     378|     `test('test', async ({ page }) => {
     379|       const obj = {};
```

**verdict:**

---

## 20. playwright-community-eslint-plugin-playwright — src/rules/no-conditional-in-test.test.ts:378

**Message:** Codegen default test title (test('test',) — an unreviewed recording artifact.

```
     373|     // Logical OR assignment should be allowed
     374|     `test('test', async ({ page }) => {
     375|       let value;
     376|       value ||= defaultValue;
     377|     })`,
>>>  378|     `test('test', async ({ page }) => {
     379|       const obj = {};
     380|       obj.prop ||= 'default';
     381|     })`,
     382|   ],
     383| })
```

**verdict:**

---
