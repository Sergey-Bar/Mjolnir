# QA-PW-117 — Sample Findings for Classification

Total sampled: 1 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. sveltejs-kit — packages/kit/test/apps/basics/test/cross-platform/client.test.js:751

**Message:** `test.describe.serial` without a justification comment.

```
     746| 		expect(await get_computed_style('p', 'color')).toBe('rgb(0, 0, 255)');
     747| 		expect(requests.length).toBe(1);
     748| 	});
     749| });
     750|
>>>  751| test.describe.serial('Errors', () => {
     752| 	test('client-side load errors', async ({ page }) => {
     753| 		await page.goto('/errors/load-client');
     754|
     755| 		expect(await page.textContent('footer')).toBe('Custom layout');
     756| 		expect(await page.textContent('#message')).toBe(
```

**verdict:**

---
