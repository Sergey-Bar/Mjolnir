# QA-TQUAL-011 — Sample Findings for Classification

Total sampled: 6 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. sveltejs-kit — packages/kit/test/apps/async/test/server.test.js:49

**Message:** Commented-out test detected.

```
      44| 		// check that we didn't accidentally delete the code we're treeshaking
      45| 		expect(maps).toContain('++invocations');
      46| 		expect(maps).toContain("() => 'hello'");
      47| 	});
      48|
>>>   49| 	test("doesn't duplicate remote modules in the generated manifest", () => {
      50| 		test.skip(!!process.env.DEV, 'only applicable after build');
      51| 		const code = fs.readFileSync(
      52| 			path.join(root, '.svelte-kit', 'output', 'server', 'manifest.js'),
      53| 			'utf8'
      54| 		);
```

**verdict:**

---

## 2. sveltejs-kit — packages/kit/test/apps/async/test/server.test.js:50

**Message:** Commented-out test detected.

```
      45| 		expect(maps).toContain('++invocations');
      46| 		expect(maps).toContain("() => 'hello'");
      47| 	});
      48|
      49| 	test("doesn't duplicate remote modules in the generated manifest", () => {
>>>   50| 		test.skip(!!process.env.DEV, 'only applicable after build');
      51| 		const code = fs.readFileSync(
      52| 			path.join(root, '.svelte-kit', 'output', 'server', 'manifest.js'),
      53| 			'utf8'
      54| 		);
      55| 		const hashes = [
```

**verdict:**

---

## 3. sveltejs-kit — packages/kit/test/apps/async/test/server.test.js:63

**Message:** Commented-out test detected.

```
      58|
      59| 		expect(hashes.length).toBeGreaterThan(0);
      60| 		expect(new Set(hashes).size).toBe(hashes.length);
      61| 	});
      62|
>>>   63| 	test("form doesn't refresh queries when not a remote request", async ({ page }) => {
      64| 		await page.goto(`/remote/form/noop-refresh-non-enhanced/${Date.now()}${Math.random()}`);
      65|
      66| 		const count = page.locator('#count');
      67| 		await expect(count).toHaveText('Count: 0');
      68|
```

**verdict:**

---

## 4. sveltejs-kit — packages/kit/test/apps/async/test/server.test.js:75

**Message:** Commented-out test detected.

```
      70|
      71| 		// Should not have refreshed
      72| 		await expect(count).toHaveText('Count: 0');
      73| 	});
      74|
>>>   75| 	test(".as('hidden', value) is correctly received on the server", async ({ page }) => {
      76| 		await page.goto('/remote/form/as-value');
      77|
      78| 		const form1 = page.locator('form').nth(0);
      79| 		await form1.locator('button').click();
      80|
```

**verdict:**

---

## 5. playwright-community-eslint-plugin-playwright — src/rules/no-duplicate-slow.test.ts:157

**Message:** Commented-out test detected.

```
     152|       test('should do something', async ({ page }) => {
     153|         test.slow();
     154|         await doSomething();
     155|       });
     156|     `,
>>>  157|     // test.slow() in different tests is valid
     158|     dedent`
     159|       test('test one', async ({ page }) => {
     160|         test.slow();
     161|         await doSomething();
     162|       });
```

**verdict:**

---

## 6. playwright-community-eslint-plugin-playwright — src/rules/no-duplicate-slow.test.ts:225

**Message:** Commented-out test detected.

```
     220|           custom.slow();
     221|           await doSomething();
     222|         });
     223|       `,
     224|     },
>>>  225|     // test.slow() in sibling describes is valid (separate scopes)
     226|     dedent`
     227|       test.describe('suite 1', () => {
     228|         test.slow();
     229|         test('foo', async () => {});
     230|       });
```

**verdict:**

---
