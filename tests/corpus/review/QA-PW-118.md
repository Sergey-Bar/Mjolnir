# QA-PW-118 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. sveltejs-kit — packages/kit/test/apps/async/test/client.test.js:17

**Message:** `waitForLoadState('networkidle')` used.

```
      12| 		test.skip(!process.env.DEV, 'remote functions are only analysed in dev mode');
      13| 		await page.goto('/remote/dev');
      14| 		await page.locator('a[href="/remote/dev/preload"]').hover();
      15| 		await Promise.all([
      16| 			page.waitForTimeout(100), // wait for preloading to start
>>>   17| 			page.waitForLoadState('networkidle') // wait for preloading to finish
      18| 		]);
      19| 		await clicknav('a[href="/remote/dev/preload"]', { waitForURL: '/remote/dev/preload' });
      20| 		await expect(page.locator('p')).toHaveText('foobar');
      21| 		await page.getByRole('button', { name: 'Refresh' }).click();
      22| 		await expect(page.locator('p')).toHaveText('foobaz');
```

**verdict:**

---

## 2. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:951

**Message:** `waitForLoadState('networkidle')` used.

```
     946| 		page.locator('#viewport').scrollIntoViewIfNeeded();
     947| 		await page.locator('#viewport').hover();
     948| 		await page.locator('#viewport').dispatchEvent('touchstart');
     949| 		await Promise.all([
     950| 			page.waitForTimeout(100), // wait for preloading to start
>>>  951| 			page.waitForLoadState('networkidle') // wait for preloading to finish
     952| 		]);
     953| 		expect(responses.length).toEqual(1);
     954|
     955| 		// hover
     956| 		responses.length = 0;
```

**verdict:**

---

## 3. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:961

**Message:** `waitForLoadState('networkidle')` used.

```
     956| 		responses.length = 0;
     957| 		await page.locator('#hover').hover();
     958| 		await page.locator('#hover').dispatchEvent('touchstart');
     959| 		await Promise.all([
     960| 			page.waitForTimeout(100), // wait for preloading to start
>>>  961| 			page.waitForLoadState('networkidle') // wait for preloading to finish
     962| 		]);
     963| 		expect(responses.length).toEqual(1);
     964|
     965| 		// tap
     966| 		responses.length = 0;
```

**verdict:**

---

## 4. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:971

**Message:** `waitForLoadState('networkidle')` used.

```
     966| 		responses.length = 0;
     967| 		await page.locator('#tap').hover();
     968| 		await page.locator('#tap').dispatchEvent('touchstart');
     969| 		await Promise.all([
     970| 			page.waitForTimeout(100), // wait for preloading to start
>>>  971| 			page.waitForLoadState('networkidle') // wait for preloading to finish
     972| 		]);
     973| 		expect(responses.length).toEqual(1);
     974| 	});
     975|
     976| 	test('data-sveltekit-preload-data', async ({ page }) => {
```

**verdict:**

---

## 5. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1004

**Message:** `waitForLoadState('networkidle')` used.

```
     999| 		await page.goto('/data-sveltekit/preload-data');
    1000| 		await page.locator('#one').hover();
    1001| 		await page.locator('#one').dispatchEvent('touchstart');
    1002| 		await Promise.all([
    1003| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1004| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1005| 		]);
    1006| 		expect(requests.length).toBe(2);
    1007|
    1008| 		requests.length = 0;
    1009| 		// park the mouse so the previous phase's cursor position can't trigger a preload after hydration
```

**verdict:**

---

## 6. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1016

**Message:** `waitForLoadState('networkidle')` used.

```
    1011| 		await page.goto('/data-sveltekit/preload-data');
    1012| 		await page.locator('#two').hover();
    1013| 		await page.locator('#two').dispatchEvent('touchstart');
    1014| 		await Promise.all([
    1015| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1016| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1017| 		]);
    1018| 		expect(requests.length).toBe(2);
    1019|
    1020| 		requests.length = 0;
    1021| 		await page.mouse.move(0, 0);
```

**verdict:**

---

## 7. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1027

**Message:** `waitForLoadState('networkidle')` used.

```
    1022| 		await page.goto('/data-sveltekit/preload-data');
    1023| 		await page.locator('#three').hover();
    1024| 		await page.locator('#three').dispatchEvent('touchstart');
    1025| 		await Promise.all([
    1026| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1027| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1028| 		]);
    1029| 		expect(requests.length).toBe(0);
    1030|
    1031| 		requests.length = 0;
    1032| 		await page.mouse.move(0, 0);
```

**verdict:**

---

## 8. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1038

**Message:** `waitForLoadState('networkidle')` used.

```
    1033| 		await page.goto('/data-sveltekit/preload-data');
    1034| 		await page.locator('#tap').hover();
    1035| 		await page.locator('#tap').dispatchEvent('touchstart');
    1036| 		await Promise.all([
    1037| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1038| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1039| 		]);
    1040| 		expect(requests.length).toBe(2);
    1041|
    1042| 		requests.length = 0;
    1043| 		await page.mouse.move(0, 0);
```

**verdict:**

---

## 9. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1049

**Message:** `waitForLoadState('networkidle')` used.

```
    1044| 		await page.goto('/data-sveltekit/preload-data');
    1045| 		await page.locator('#dynamic').hover();
    1046| 		await page.locator('#dynamic').dispatchEvent('touchstart');
    1047| 		await Promise.all([
    1048| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1049| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1050| 		]);
    1051| 		expect(requests.length).toBe(2);
    1052| 		await page.waitForTimeout(100);
    1053| 		await page.locator('#dynamic').hover();
    1054| 		await page.locator('#dynamic').dispatchEvent('touchstart');
```

**verdict:**

---

## 10. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1057

**Message:** `waitForLoadState('networkidle')` used.

```
    1052| 		await page.waitForTimeout(100);
    1053| 		await page.locator('#dynamic').hover();
    1054| 		await page.locator('#dynamic').dispatchEvent('touchstart');
    1055| 		await Promise.all([
    1056| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1057| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1058| 		]);
    1059| 		expect(requests.length).toBe(2);
    1060| 		await page.locator('#change_dynamic').click();
    1061| 		await page.waitForTimeout(100);
    1062| 		await page.locator('#dynamic').hover();
```

**verdict:**

---

## 11. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1066

**Message:** `waitForLoadState('networkidle')` used.

```
    1061| 		await page.waitForTimeout(100);
    1062| 		await page.locator('#dynamic').hover();
    1063| 		await page.locator('#dynamic').dispatchEvent('touchstart');
    1064| 		await Promise.all([
    1065| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1066| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1067| 		]);
    1068| 		expect(requests.length).toBe(3);
    1069| 	});
    1070|
    1071| 	test('data-sveltekit-preload-data network failure does not trigger navigation', async ({
```

**verdict:**

---

## 12. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1083

**Message:** `waitForLoadState('networkidle')` used.

```
    1078| 		await context.setOffline(true);
    1079|
    1080| 		await page.locator('#one').dispatchEvent('mousemove');
    1081| 		await Promise.all([
    1082| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1083| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1084| 		]);
    1085|
    1086| 		let offline_url = /\/data-sveltekit\/preload-data\/offline/;
    1087| 		if (browserName === 'chromium') {
    1088| 			// it's chrome-error://chromewebdata/ on ubuntu but not on windows
```

**verdict:**

---

## 13. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1106

**Message:** `waitForLoadState('networkidle')` used.

```
    1101| 		await context.setOffline(true);
    1102|
    1103| 		await page.locator('#one').dispatchEvent('mousemove');
    1104| 		await Promise.all([
    1105| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1106| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1107| 		]);
    1108|
    1109| 		await expect(page).toHaveURL('/data-sveltekit/preload-data/offline');
    1110|
    1111| 		await page.locator('#one').dispatchEvent('click');
```

**verdict:**

---

## 14. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1113

**Message:** `waitForLoadState('networkidle')` used.

```
    1108|
    1109| 		await expect(page).toHaveURL('/data-sveltekit/preload-data/offline');
    1110|
    1111| 		await page.locator('#one').dispatchEvent('click');
    1112| 		await page.waitForTimeout(100); // wait for navigation to start
>>> 1113| 		await page.waitForLoadState('networkidle');
    1114|
    1115| 		let offline_url = /\/data-sveltekit\/preload-data\/offline/;
    1116| 		if (browserName === 'chromium') {
    1117| 			// it's chrome-error://chromewebdata/ on ubuntu but not on windows
    1118| 			offline_url = /chrome-error:\/\/chromewebdata\/|\/data-sveltekit\/preload-data\/offline/;
```

**verdict:**

---

## 15. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1131

**Message:** `waitForLoadState('networkidle')` used.

```
    1126| 		await page.locator('#slow-navigation').dispatchEvent('click');
    1127| 		await page.waitForTimeout(100); // wait for navigation to start
    1128| 		await page.locator('#slow-navigation').dispatchEvent('mousemove');
    1129| 		await Promise.all([
    1130| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1131| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1132| 		]);
    1133|
    1134| 		await expect(page).toHaveURL('/data-sveltekit/preload-data/offline/slow-navigation');
    1135| 	});
    1136|
```

**verdict:**

---

## 16. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1145

**Message:** `waitForLoadState('networkidle')` used.

```
    1140| 		await page.locator('#slow-navigation').dispatchEvent('click');
    1141| 		await page.waitForTimeout(100); // wait for navigation to start
    1142| 		await page.locator('#one').dispatchEvent('mousemove');
    1143| 		await Promise.all([
    1144| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1145| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1146| 		]);
    1147|
    1148| 		await expect(page).toHaveURL('/data-sveltekit/preload-data/offline/slow-navigation');
    1149| 		await expect(page.getByText('slow navigation', { exact: true })).toBeVisible();
    1150| 	});
```

**verdict:**

---

## 17. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1183

**Message:** `waitForLoadState('networkidle')` used.

```
    1178| 		await page.goto('/data-sveltekit/preload-data/repeat');
    1179| 		await page.locator('#target').hover();
    1180| 		await page.locator('#target').dispatchEvent('touchstart');
    1181| 		await Promise.all([
    1182| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1183| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1184| 		]);
    1185| 		expect(requests.length).toBe(2);
    1186|
    1187| 		requests.length = 0;
    1188| 		await clicknav('#target', { waitForURL: '/data-sveltekit/preload-data/repeat/target' });
```

**verdict:**

---

## 18. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1198

**Message:** `waitForLoadState('networkidle')` used.

```
    1193|
    1194| 		await page.locator('#target').hover();
    1195| 		await page.locator('#target').dispatchEvent('touchstart');
    1196| 		await Promise.all([
    1197| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1198| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1199| 		]);
    1200| 		expect(requests.length).toBe(1);
    1201|
    1202| 		requests.length = 0;
    1203| 		await clicknav('#target', { waitForURL: '/data-sveltekit/preload-data/repeat/target' });
```

**verdict:**

---

## 19. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1236

**Message:** `waitForLoadState('networkidle')` used.

```
    1231|
    1232| 		await page.goto('/data-sveltekit/preload-data');
    1233| 		await page.locator('#hover-then-tap').hover();
    1234| 		await Promise.all([
    1235| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1236| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1237| 		]);
    1238| 		expect(requests.length).toBe(1);
    1239|
    1240| 		await page.locator('#hover-then-tap').dispatchEvent('touchstart');
    1241| 		await Promise.all([
```

**verdict:**

---

## 20. sveltejs-kit — packages/kit/test/apps/basics/test/client.test.js:1243

**Message:** `waitForLoadState('networkidle')` used.

```
    1238| 		expect(requests.length).toBe(1);
    1239|
    1240| 		await page.locator('#hover-then-tap').dispatchEvent('touchstart');
    1241| 		await Promise.all([
    1242| 			page.waitForTimeout(100), // wait for preloading to start
>>> 1243| 			page.waitForLoadState('networkidle') // wait for preloading to finish
    1244| 		]);
    1245| 		expect(requests.length).toBe(2);
    1246| 	});
    1247|
    1248| 	test('data-sveltekit-reload', async ({ baseURL, page, clicknav }) => {
```

**verdict:**

---
