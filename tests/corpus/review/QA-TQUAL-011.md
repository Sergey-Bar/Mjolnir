# QA-TQUAL-011 — Sample Findings for Classification

Total sampled: 6 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. playwright-community-eslint-plugin-playwright — src/rules/no-duplicate-slow.test.ts:157

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

## 2. playwright-community-eslint-plugin-playwright — src/rules/no-duplicate-slow.test.ts:225

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

## 3. grafana-grafana — packages/grafana-ui/src/components/uPlot/utils.test.ts:503

**Message:** Commented-out test detected.

```
     498|     });
     499|   });
     500|
     501|   // @TODO: this test dependended on `preparePlotFrame` in the graveyard. should that method in
     502|   // public/app/core/components/GraphNG/utils.ts be moved to this package?
>>>  503|   // it('accumulates stacks only at indices where stacking group has at least 1 value', () => {
     504|   // extracted data from plot in panel-graph/graph-ng-stacking2.json
     505|   // const frameData = [
     506|   //   [[1639976945832], [1000]],
     507|   //   [
     508|   //     [1639803285888, 1639976945832, 1640150605776, 1641192565440],
```

**verdict:**

---

## 4. grafana-grafana — public/app/core/services/echo/backends/grafana-javascript-agent/GrafanaJavascriptAgentBackend.test.ts:197

**Message:** Commented-out test detected.

```
     192|     expect(initializeFaroMock.mock.calls[0][0].beforeSend).toBeDefined();
     193|   });
     194|
     195|   //@FIXME - make integration test work
     196|
>>>  197|   // it('integration test with EchoSrv and  GrafanaJavascriptAgent', async () => {
     198|   //     // sets up the whole thing between window.onerror and backend endpoint call, checks that error is reported
     199|   //     // use actual GrafanaJavascriptAgent & mock window.fetch
     200|
     201|   //     // arrange
     202|   //     const originalModule = jest.requireActual('@grafana/faro-web-sdk');
```

**verdict:**

---

## 5. calcom-cal — packages/features/webhooks/lib/WebhookService.test.ts:68

**Message:** Commented-out test detected.

```
      63|     expect(service).toBeInstanceOf(WebhookService);
      64|     expect(await service.getWebhooks()).toEqual(mockWebhooks);
      65|     expect(getWebhooks).toHaveBeenCalledWith(mockOptions);
      66|   });
      67|
>>>   68|   // it("should send payload to all webhooks", async () => {
      69|   //   const mockWebhooks = [
      70|   //     {
      71|   //       id: "webhookId",
      72|   //       subscriberUrl: "url",
      73|   //       secret: "secret",
```

**verdict:**

---

## 6. calcom-cal — packages/features/webhooks/lib/WebhookService.test.ts:115

**Message:** Commented-out test detected.

```
     110|   //       payload
     111|   //     );
     112|   //   });
     113|   // });
     114|   //
>>>  115|   // it("should log error when sending payload fails", async () => {
     116|   //   const mockWebhooks = [
     117|   //     {
     118|   //       id: "webhookId",
     119|   //       subscriberUrl: "url",
     120|   //       secret: "secret",
```

**verdict:**

---
