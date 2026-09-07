# QA-ENV-001 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:78

**Message:** Environment coupling (OS path): `'C:\\foo'`.

```
      73|   })
      74|
      75|   test('should work with absolute paths', () => {
      76|     expect(bareImportRE.test('/foo')).toBe(false)
      77|     expect(bareImportRE.test('C:/foo')).toBe(false)
>>>   78|     expect(bareImportRE.test('C:\\foo')).toBe(false)
      79|   })
      80|   test('should work with relative path', () => {
      81|     expect(bareImportRE.test('./foo')).toBe(false)
      82|     expect(bareImportRE.test('.\\foo')).toBe(false)
      83|   })
```

**verdict:**

---

## 2. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:117

**Message:** Environment coupling (OS path): `'C:\\User\\Vite\\Project'`.

```
     112|
     113| describe('injectQuery', () => {
     114|   if (isWindows) {
     115|     // this test will work incorrectly on unix systems
     116|     test('normalize windows path', () => {
>>>  117|       expect(injectQuery('C:\\User\\Vite\\Project', 'direct')).toEqual(
     118|         'C:/User/Vite/Project?direct',
     119|       )
     120|     })
     121|
     122|     test('absolute file path', () => {
```

**verdict:**

---

## 3. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:123

**Message:** Environment coupling (OS path): `'C:\\test-file.vue'`.

```
     118|         'C:/User/Vite/Project?direct',
     119|       )
     120|     })
     121|
     122|     test('absolute file path', () => {
>>>  123|       expect(injectQuery('C:\\test-file.vue', 'direct')).toEqual(
     124|         'C:/test-file.vue?direct',
     125|       )
     126|     })
     127|
     128|     test('absolute file path with parameters', () => {
```

**verdict:**

---

## 4. vitejs-vite — packages/vite/src/node/**tests**/utils.spec.ts:130

**Message:** Environment coupling (OS path): `'C:\\test-file.vue?vue&type=template&lang.js'`.

```
     125|       )
     126|     })
     127|
     128|     test('absolute file path with parameters', () => {
     129|       expect(
>>>  130|         injectQuery('C:\\test-file.vue?vue&type=template&lang.js', 'direct'),
     131|       ).toEqual('C:/test-file.vue?direct&vue&type=template&lang.js')
     132|     })
     133|   }
     134|
     135|   test('relative path', () => {
```

**verdict:**

---

## 5. vitejs-vite — packages/vite/src/node/server/**tests**/sourcemap.spec.ts:44

**Message:** Environment coupling (OS path): `'D:\\project\\node_modules\\foo\\dist\\bar.js'`.

```
      39|       input: '/project/node_modules/foo/node_modules/bar/index.js',
      40|       expected: '/project/node_modules/foo/node_modules/bar',
      41|     },
      42|     {
      43|       name: 'Windows-style path',
>>>   44|       input: 'D:\\project\\node_modules\\foo\\dist\\bar.js',
      45|       expected: 'D:/project/node_modules/foo',
      46|       skip: !isWindows,
      47|     },
      48|     {
      49|       name: 'Windows-style path with scoped package',
```

**verdict:**

---

## 6. vitejs-vite — packages/vite/src/node/server/**tests**/sourcemap.spec.ts:50

**Message:** Environment coupling (OS path): `'D:\\project\\node_modules\\@scope\\pkg\\index.js'`.

```
      45|       expected: 'D:/project/node_modules/foo',
      46|       skip: !isWindows,
      47|     },
      48|     {
      49|       name: 'Windows-style path with scoped package',
>>>   50|       input: 'D:\\project\\node_modules\\@scope\\pkg\\index.js',
      51|       expected: 'D:/project/node_modules/@scope/pkg',
      52|       skip: !isWindows,
      53|     },
      54|     {
      55|       name: 'package name without subdirectory',
```

**verdict:**

---

## 7. sveltejs-kit — packages/adapter-bun/test/start.spec.ts:78

**Message:** Environment coupling (OS path): `'/tmp/application.sock'`.

```
      73| 			hostname: 'default-host',
      74| 			port: 3000,
      75| 			reusePort: true,
      76| 			ipv6Only: true
      77| 		},
>>>   78| 		env: { SOCKET_PATH: '/tmp/application.sock' }
      79| 	});
      80|
      81| 	const options = loaded.serve.mock.calls[0][0];
      82| 	expect(options.unix).toBe('/tmp/application.sock');
      83| 	expect(options).not.toHaveProperty('hostname');
```

**verdict:**

---

## 8. sveltejs-kit — packages/adapter-bun/test/start.spec.ts:82

**Message:** Environment coupling (OS path): `'/tmp/application.sock'`.

```
      77| 		},
      78| 		env: { SOCKET_PATH: '/tmp/application.sock' }
      79| 	});
      80|
      81| 	const options = loaded.serve.mock.calls[0][0];
>>>   82| 	expect(options.unix).toBe('/tmp/application.sock');
      83| 	expect(options).not.toHaveProperty('hostname');
      84| 	expect(options).not.toHaveProperty('port');
      85| 	expect(options).not.toHaveProperty('reusePort');
      86| 	expect(options).not.toHaveProperty('ipv6Only');
      87| 	expect(loaded.log).toHaveBeenCalledWith('Listening on /tmp/application.sock');
```

**verdict:**

---

## 9. sveltejs-kit — packages/adapter-bun/test/start.spec.ts:94

**Message:** Environment coupling (OS path): `'/tmp/application.sock'`.

```
      89|
      90| test('removes a stale socket file before listening', async () => {
      91| 	spyOn(fs, 'statSync').mockReturnValue({ size: 0 } as ReturnType<typeof fs.statSync>);
      92| 	const rm = spyOn(fs, 'rmSync').mockImplementation(() => {});
      93|
>>>   94| 	await load_start({ env: { SOCKET_PATH: '/tmp/application.sock' } });
      95|
      96| 	expect(rm).toHaveBeenCalledWith('/tmp/application.sock');
      97| });
      98|
      99| test.each([
```

**verdict:**

---

## 10. sveltejs-kit — packages/adapter-bun/test/start.spec.ts:96

**Message:** Environment coupling (OS path): `'/tmp/application.sock'`.

```
      91| 	spyOn(fs, 'statSync').mockReturnValue({ size: 0 } as ReturnType<typeof fs.statSync>);
      92| 	const rm = spyOn(fs, 'rmSync').mockImplementation(() => {});
      93|
      94| 	await load_start({ env: { SOCKET_PATH: '/tmp/application.sock' } });
      95|
>>>   96| 	expect(rm).toHaveBeenCalledWith('/tmp/application.sock');
      97| });
      98|
      99| test.each([
     100| 	[{ CONNECTION_IDLE_TIMEOUT: '256' }, 'between 0 and 255'],
     101| 	[{ BODY_SIZE_LIMIT: '1.1' }, 'whole bytes'],
```

**verdict:**

---

## 11. sveltejs-kit — packages/adapter-node/src/utils.spec.ts:46

**Message:** Environment coupling (OS path): `'/tmp/sveltekit.sock'`.

```
      41| 			'http://localhost:3000'
      42| 		);
      43| 	});
      44|
      45| 	test('returns the socket path unchanged', () => {
>>>   46| 		expect(format_listening_address('/tmp/sveltekit.sock', '0.0.0.0', '3000', null)).toBe(
      47| 			'/tmp/sveltekit.sock'
      48| 		);
      49| 	});
      50| });
      51|
```

**verdict:**

---

## 12. sveltejs-kit — packages/adapter-node/src/utils.spec.ts:47

**Message:** Environment coupling (OS path): `'/tmp/sveltekit.sock'`.

```
      42| 		);
      43| 	});
      44|
      45| 	test('returns the socket path unchanged', () => {
      46| 		expect(format_listening_address('/tmp/sveltekit.sock', '0.0.0.0', '3000', null)).toBe(
>>>   47| 			'/tmp/sveltekit.sock'
      48| 		);
      49| 	});
      50| });
      51|
```

**verdict:**

---

## 13. sveltejs-kit — packages/kit/src/core/sync/write_tsconfig/validate.spec.js:55

**Message:** Environment coupling (OS path): `'C:\\project\\src\\service-worker'`.

```
      50|
      51| 	test('detects windows-style exclusions', () => {
      52| 		const warnings = validate_exclusions(
      53| 			[],
      54| 			'C:/project',
>>>   55| 			['C:\\project\\src\\service-worker'],
      56| 			['C:/project/src/service-worker/index.ts']
      57| 		);
      58| 		assert.deepEqual(warnings, ['"src/service-worker" should be added to the "exclude" array']);
      59| 	});
      60| });
```

**verdict:**

---

## 14. sveltejs-kit — packages/kit/src/exports/vite/utils.spec.js:100

**Message:** Environment coupling (OS path): `'C:\\app\\src\\remote.js'`.

```
      95| 	}
      96|
      97| 	try {
      98| 		expect(is_remote_module(path.join(temp, 'src', 'remote.js'))).toBe(true);
      99| 		expect(is_remote_module(path.join(temp, 'src', 'remotely.js'))).toBe(false);
>>>  100| 		expect(is_remote_module('C:\\app\\src\\remote.js')).toBe(true);
     101|
     102| 		const plain = path.join(temp, 'node_modules', 'plain');
     103| 		write_package_json(plain, {
     104| 			dependencies: {
     105| 				'@sveltejs/kit': '*'
```

**verdict:**

---

## 15. withastro-astro — packages/astro/test/units/assets/emit-image-metadata.test.ts:34

**Message:** Environment coupling (OS path): `'/tmp/nonexistent-image-abc123.jpg'`.

```
      29| 		const result = await emitImageMetadata(undefined);
      30| 		assert.equal(result, undefined);
      31| 	});
      32|
      33| 	it('returns undefined when image file does not exist (ENOENT)', async () => {
>>>   34| 		const result = await emitImageMetadata('/tmp/nonexistent-image-abc123.jpg');
      35| 		assert.equal(result, undefined);
      36| 	});
      37|
      38| 	it('returns metadata for an existing image', async () => {
      39| 		const dir = join(tmpdir(), `astro-test-${Date.now()}`);
```

**verdict:**

---

## 16. withastro-astro — packages/astro/test/units/dev/lockfile.test.ts:204

**Message:** Environment coupling (OS path): `"C:\\Program Files\\nodejs\\node.exe"`.

```
     199| 	});
     200|
     201| 	it('recognizes Astro CLI commands on Windows', () => {
     202| 		assert.equal(
     203| 			isAstroCommand(
>>>  204| 				'"C:\\Program Files\\nodejs\\node.exe" "C:\\project\\node_modules\\astro\\bin\\astro.mjs" dev',
     205| 			),
     206| 			true,
     207| 		);
     208| 		assert.equal(
     209| 			isAstroCommand('cmd.exe /d /s /c "C:\\project\\node_modules\\.bin\\astro.cmd dev"'),
```

**verdict:**

---

## 17. withastro-astro — packages/astro/test/units/dev/lockfile.test.ts:204

**Message:** Environment coupling (OS path): `"C:\\project\\node_modules\\astro\\bin\\astro.mjs"`.

```
     199| 	});
     200|
     201| 	it('recognizes Astro CLI commands on Windows', () => {
     202| 		assert.equal(
     203| 			isAstroCommand(
>>>  204| 				'"C:\\Program Files\\nodejs\\node.exe" "C:\\project\\node_modules\\astro\\bin\\astro.mjs" dev',
     205| 			),
     206| 			true,
     207| 		);
     208| 		assert.equal(
     209| 			isAstroCommand('cmd.exe /d /s /c "C:\\project\\node_modules\\.bin\\astro.cmd dev"'),
```

**verdict:**

---

## 18. withastro-astro — packages/astro/test/units/dev/lockfile.test.ts:209

**Message:** Environment coupling (OS path): `"C:\\project\\node_modules\\.bin\\astro.cmd dev"`.

```
     204| 				'"C:\\Program Files\\nodejs\\node.exe" "C:\\project\\node_modules\\astro\\bin\\astro.mjs" dev',
     205| 			),
     206| 			true,
     207| 		);
     208| 		assert.equal(
>>>  209| 			isAstroCommand('cmd.exe /d /s /c "C:\\project\\node_modules\\.bin\\astro.cmd dev"'),
     210| 			true,
     211| 		);
     212| 	});
     213|
     214| 	it('does not mistake an unrelated command for Astro', () => {
```

**verdict:**

---

## 19. withastro-astro — packages/astro/test/units/vite-plugin-utils/normalize-filename.test.ts:9

**Message:** Environment coupling (OS path): `D:\\Users\\me\\project`.

```
       4| import { pathToFileURL } from 'node:url';
       5| import { normalizeFilename } from '../../../dist/vite-plugin-utils/index.js';
       6|
       7| // Build a fixture path that is absolute on both POSIX and Windows. On POSIX,
       8| // `path.resolve('/Users/me/project')` is `/Users/me/project`; on Windows it
>>>    9| // becomes something like `D:\\Users\\me\\project` (the CWD drive gets
      10| // prepended). Using this lets tests that pass the resolved path to Node's URL
      11| // machinery behave identically on both platforms.
      12| const projectRoot = path.resolve('/Users/me/project');
      13| const projectRootUrl = pathToFileURL(projectRoot + path.sep);
      14| // `normalizeFilename` returns paths with forward slashes (it runs the result
```

**verdict:**

---

## 20. withastro-astro — packages/internal-helpers/test/path.test.ts:395

**Message:** Environment coupling (OS path): `'/tmp/build-output.js'`.

```
     390| 		'/local/path/file.js',
     391| 		'/usr/local/bin/node',
     392| 		'/home/user/projects/app.js',
     393| 		'/var/www/html/index.html',
     394| 		'/opt/application/config.json',
>>>  395| 		'/tmp/build-output.js',
     396| 		'/dev/null',
     397| 		'/proc/self/exe',
     398| 		'/etc/hosts',
     399|
     400| 		// macOS specific paths
```

**verdict:**

---
