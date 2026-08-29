# QA-TQUAL-001 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — packages/next-auth/test/actions.test.ts:77

**Message:** All assertions in this test verify mock calls only.

```
      72|     process.env.AUTH_URL = ""
      73|     nextAuth = null
      74|     vi.resetAllMocks()
      75|   })
      76|   describe("with Nodemailer provider", () => {
>>>   77|     it("redirects to /verify-request", async () => {
      78|       await nextAuth?.signIn("nodemailer", options)
      79|       expect(mockRedirect).toHaveBeenCalledWith(
      80|         "http://localhost/api/auth/verify-request?provider=nodemailer&type=email"
      81|       )
      82|     })
```

**verdict:**

---

## 2. vitejs-vite — packages/vite/src/node/**tests**/build.spec.ts:415

**Message:** All assertions in this test verify mock calls only.

```
     410|     const resolvedOutputs = resolveBuildOutputs(outputs, false, logger)
     411|
     412|     expect(resolvedOutputs).toEqual(outputs)
     413|   })
     414|
>>>  415|   test('logs a warning when outputs is an array and formats are specified', () => {
     416|     const logger = createLogger()
     417|     const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
     418|     const libOptions: LibraryOptions = {
     419|       ...baseLibOptions,
     420|       formats: ['iife'],
```

**verdict:**

---

## 3. vitejs-vite — packages/vite/src/shared/**tests**/forwardConsole.spec.ts:93

**Message:** All assertions in this test verify mock calls only.

```
      88|       send,
      89|       invoke: () => Promise.resolve({ result: undefined } as any),
      90|     }
      91|   }
      92|
>>>   93|   test('ignore SendBeforeConnectError from transport.send', async () => {
      94|     const transport = createMockTransport(() =>
      95|       Promise.reject(new SendBeforeConnectError('not connected yet')),
      96|     )
      97|     const console = createMockConsole()
      98|
```

**verdict:**

---

## 4. vitejs-vite — packages/vite/src/shared/**tests**/forwardConsole.spec.ts:115

**Message:** All assertions in this test verify mock calls only.

```
     110|     await setTimeout(50)
     111|
     112|     expect(console.error).not.toHaveBeenCalled()
     113|   })
     114|
>>>  115|   test('log errors from transport.send', async () => {
     116|     const transport = createMockTransport(() =>
     117|       Promise.reject(new Error('other error')),
     118|     )
     119|     const console = createMockConsole()
     120|
```

**verdict:**

---

## 5. sveltejs-kit — packages/adapter-bun/test/adapter.spec.ts:406

**Message:** All assertions in this test verify mock calls only.

```
     401| 		expect(source).toContain(
     402| 			'...client_asset("app.js", undefined, {"hash":"abc","mtime":0,"br":true,"gz":true})'
     403| 		);
     404| 	});
     405|
>>>  406| 	test('warns when precompress is combined with compile', async () => {
     407| 		const builder = create_builder();
     408|
     409| 		await adapter({ precompress: true, buildOptions: { compile: true } }).adapt(builder);
     410|
     411| 		expect(builder.log.warn).toHaveBeenCalledWith(
```

**verdict:**

---

## 6. sveltejs-kit — packages/adapter-bun/test/adapter.spec.ts:417

**Message:** All assertions in this test verify mock calls only.

```
     412| 			expect.stringContaining('precompress is ignored')
     413| 		);
     414| 		expect(builder.compress).not.toHaveBeenCalled();
     415| 	});
     416|
>>>  417| 	test('does not compress by default', async () => {
     418| 		const builder = create_builder({ client_files: ['app.js'] });
     419|
     420| 		await adapter().adapt(builder);
     421|
     422| 		expect(builder.compress).not.toHaveBeenCalled();
```

**verdict:**

---

## 7. sveltejs-kit — packages/adapter-bun/test/start.spec.ts:19

**Message:** All assertions in this test verify mock calls only.

```
      14|
      15| afterAll(() => {
      16| 	mock.module('node:process', () => ({ default: real_process }));
      17| });
      18|
>>>   19| test('starts Bun with production defaults and generated request routes', async () => {
      20| 	const loaded = await load_start();
      21|
      22| 	expect(loaded.serve).toHaveBeenCalledWith(
      23| 		expect.objectContaining({
      24| 			development: false,
```

**verdict:**

---

## 8. sveltejs-kit — packages/adapter-bun/test/start.spec.ts:34

**Message:** All assertions in this test verify mock calls only.

```
      29| 		})
      30| 	);
      31| 	expect(loaded.log).toHaveBeenCalledWith('Listening on http://localhost:3000/');
      32| });
      33|
>>>   34| test('environment variables override TCP server defaults', async () => {
      35| 	const loaded = await load_start({
      36| 		serverOptions: {
      37| 			hostname: 'default-host',
      38| 			port: 3000,
      39| 			reusePort: false,
```

**verdict:**

---

## 9. sveltejs-kit — packages/adapter-bun/test/start.spec.ts:90

**Message:** All assertions in this test verify mock calls only.

```
      85| 	expect(options).not.toHaveProperty('reusePort');
      86| 	expect(options).not.toHaveProperty('ipv6Only');
      87| 	expect(loaded.log).toHaveBeenCalledWith('Listening on /tmp/application.sock');
      88| });
      89|
>>>   90| test('removes a stale socket file before listening', async () => {
      91| 	spyOn(fs, 'statSync').mockReturnValue({ size: 0 } as ReturnType<typeof fs.statSync>);
      92| 	const rm = spyOn(fs, 'rmSync').mockImplementation(() => {});
      93|
      94| 	await load_start({ env: { SOCKET_PATH: '/tmp/application.sock' } });
      95|
```

**verdict:**

---

## 10. sveltejs-kit — packages/adapter-bun/test/start.spec.ts:167

**Message:** All assertions in this test verify mock calls only.

```
     162| 	} finally {
     163| 		jest.useRealTimers();
     164| 	}
     165| });
     166|
>>>  167| test('a second shutdown signal forces the process to exit', async () => {
     168| 	let finish_stop: (() => void) | undefined;
     169| 	const loaded = await load_start({
     170| 		stop: () => new Promise<void>((resolve) => (finish_stop = resolve))
     171| 	});
     172|
```

**verdict:**

---

## 11. sveltejs-kit — packages/kit/src/core/sync/utils.spec.js:23

**Message:** All assertions in this test verify mock calls only.

```
      18| 	afterAll(() => {
      19| 		console_warn_spy.mockReset();
      20| 		cwd_spy.mockReset();
      21| 	});
      22|
>>>   23| 	test('does not warn if the misspelled file does not exist', () => {
      24| 		check_spelling('src/hooks.server', path.resolve('src/+hooks.server'), 'Unexpected + prefix');
      25|
      26| 		expect(console_warn_spy).not.toHaveBeenCalled();
      27| 	});
      28|
```

**verdict:**

---

## 12. sveltejs-kit — packages/kit/src/exports/node/index.spec.js:210

**Message:** All assertions in this test verify mock calls only.

```
     205| 	setResponse(create_response(incoming), new Response(null, { status: 200 }));
     206|
     207| 	await expect_request_drained(req);
     208| });
     209|
>>>  210| test('does not remove unrelated data listeners when draining', async () => {
     211| 	const req = new PassThrough();
     212| 	const unrelated = vi.fn();
     213| 	req.on('data', unrelated);
     214|
     215| 	const { incoming } = setup_post_request({ 'content-length': '10' }, req);
```

**verdict:**

---

## 13. sveltejs-kit — packages/kit/src/runtime/client/remote-functions/shared.transport.spec.js:103

**Message:** All assertions in this test verify mock calls only.

```
      98|
      99| 		// Should resolve without throwing.
     100| 		await expect(remote_request('/x')).resolves.toBeDefined();
     101| 	});
     102|
>>>  103| 	test('fails requested updates missing from the response', async () => {
     104| 		const fail = vi.fn();
     105| 		query_map.set('hash/query', /** @type {any} */ (new Map([['[-1]', { resource: { fail } }]])));
     106| 		vi.stubGlobal('fetch', () =>
     107| 			mock_response({
     108| 				json: () => Promise.resolve({ type: 'result', data: devalue.stringify({}) })
```

**verdict:**

---

## 14. sveltejs-kit — packages/kit/src/runtime/client/remote-functions/shared.transport.spec.js:125

**Message:** All assertions in this test verify mock calls only.

```
     120| 				})
     121| 			})
     122| 		);
     123| 	});
     124|
>>>  125| 	test('does not fail missing updates before the caller commits reconciliation', async () => {
     126| 		const fail = vi.fn();
     127| 		query_map.set('hash/query', /** @type {any} */ (new Map([['[-1]', { resource: { fail } }]])));
     128| 		vi.stubGlobal('fetch', () =>
     129| 			mock_response({
     130| 				json: () =>
```

**verdict:**

---

## 15. sveltejs-kit — packages/kit/src/runtime/client/remote-functions/shared.transport.spec.js:143

**Message:** All assertions in this test verify mock calls only.

```
     138| 		await remote_request('/x', undefined, new Set(['hash/query/[-1]']));
     139|
     140| 		expect(fail).not.toHaveBeenCalled();
     141| 	});
     142|
>>>  143| 	test('does not fail requested updates returned in the response', async () => {
     144| 		const resource = { fail: vi.fn(), set: vi.fn() };
     145| 		query_map.set('hash/query', /** @type {any} */ (new Map([['[-1]', { resource }]])));
     146| 		vi.stubGlobal('fetch', () =>
     147| 			mock_response({
     148| 				json: () =>
```

**verdict:**

---

## 16. sveltejs-kit — packages/kit/src/runtime/client/remote-functions/shared.transport.spec.js:164

**Message:** All assertions in this test verify mock calls only.

```
     159|
     160| 		expect(resource.set).toHaveBeenCalledWith(42);
     161| 		expect(resource.fail).not.toHaveBeenCalled();
     162| 	});
     163|
>>>  164| 	test('does not fail explicitly ignored requested updates', async () => {
     165| 		const fail = vi.fn();
     166| 		query_map.set('hash/query', /** @type {any} */ (new Map([['[-1]', { resource: { fail } }]])));
     167| 		vi.stubGlobal('fetch', () =>
     168| 			mock_response({
     169| 				json: () =>
```

**verdict:**

---

## 17. sveltejs-kit — packages/kit/src/runtime/server/validate-headers.spec.js:12

**Message:** All assertions in this test verify mock calls only.

```
       7| 	beforeEach(() => {
       8| 		vi.resetAllMocks();
       9| 	});
      10|
      11| 	describe('cache-control header', () => {
>>>   12| 		test('accepts valid directives', () => {
      13| 			validateHeaders({ 'cache-control': 'public, max-age=3600' });
      14| 			expect(console_warn_spy).not.toHaveBeenCalled();
      15| 		});
      16|
      17| 		test('rejects invalid directives', () => {
```

**verdict:**

---

## 18. sveltejs-kit — packages/kit/src/runtime/server/validate-headers.spec.js:17

**Message:** All assertions in this test verify mock calls only.

```
      12| 		test('accepts valid directives', () => {
      13| 			validateHeaders({ 'cache-control': 'public, max-age=3600' });
      14| 			expect(console_warn_spy).not.toHaveBeenCalled();
      15| 		});
      16|
>>>   17| 		test('rejects invalid directives', () => {
      18| 			validateHeaders({ 'cache-control': 'public, maxage=3600' });
      19| 			expect(console_warn_spy).toHaveBeenCalledWith(
      20| 				expect.stringContaining('Invalid cache-control directive "maxage"')
      21| 			);
      22| 		});
```

**verdict:**

---

## 19. sveltejs-kit — packages/kit/src/runtime/server/validate-headers.spec.js:24

**Message:** All assertions in this test verify mock calls only.

```
      19| 			expect(console_warn_spy).toHaveBeenCalledWith(
      20| 				expect.stringContaining('Invalid cache-control directive "maxage"')
      21| 			);
      22| 		});
      23|
>>>   24| 		test('rejects empty directives', () => {
      25| 			validateHeaders({ 'cache-control': 'public,, max-age=3600' });
      26| 			expect(console_warn_spy).toHaveBeenCalledWith(
      27| 				expect.stringContaining('`cache-control` header contains empty directives')
      28| 			);
      29|
```

**verdict:**

---

## 20. sveltejs-kit — packages/kit/src/runtime/server/validate-headers.spec.js:36

**Message:** All assertions in this test verify mock calls only.

```
      31| 			expect(console_warn_spy).toHaveBeenCalledWith(
      32| 				expect.stringContaining('`cache-control` header contains empty directives')
      33| 			);
      34| 		});
      35|
>>>   36| 		test('accepts multiple cache-control values', () => {
      37| 			validateHeaders({ 'cache-control': 'max-age=3600, s-maxage=7200' });
      38| 			expect(console_warn_spy).not.toHaveBeenCalled();
      39| 		});
      40| 	});
      41|
```

**verdict:**

---
