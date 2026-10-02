# QA-PW-117 — Sample Findings for Classification

Total sampled: 11 (max 35 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. keycloak-keycloak — js/apps/admin-ui/test/clients/details.spec.ts:20

**Message:** `test.describe.serial` without a justification comment.

```
      15|   toggleLogoutConfirmation,
      16|   setResourceUrl,
      17|   assertResourceUrl,
      18| } from "./details.ts";
      19|
>>>   20| test.describe.serial("Clients details test", () => {
      21|   const realmName = `clients-details-realm-${uuid()}`;
      22|   const clientId = `client-details-${uuid()}`;
      23|
      24|   test.beforeAll(async () => {
      25|     await adminClient.createRealm(realmName);
```

**verdict:**

---

## 2. keycloak-keycloak — js/apps/admin-ui/test/clients/saml.spec.ts:87

**Message:** `test.describe.serial` without a justification comment.

```
      82|       "Client could not be updated: invalid_inputTerms of service URL is not a valid URL",
      83|     );
      84|   });
      85| });
      86|
>>>   87| test.describe.serial("Clients SAML tests", () => {
      88|   let clientId: string | undefined;
      89|
      90|   const getClientId = () => {
      91|     if (!clientId) {
      92|       throw new Error("SAML client for test was not initialized");
```

**verdict:**

---

## 3. keycloak-keycloak — js/apps/admin-ui/test/clients/scope.spec.ts:52

**Message:** `test.describe.serial` without a justification comment.

```
      47|     "gui.order": string;
      48|     "consent.screen.text": string;
      49|   };
      50| };
      51|
>>>   52| test.describe.serial("Client details - Client scopes subtab", () => {
      53|   const clientId = "client-scopes-subtab-test";
      54|   const clientScopeName = "client-scope-test";
      55|   const clientScopeNameDefaultType = "client-scope-test-default-type";
      56|   const clientScopeNameOptionalType = "client-scope-test-optional-type";
      57|   const msgScopeMappingRemoved = "Scope mapping successfully removed";
```

**verdict:**

---

## 4. keycloak-keycloak — js/apps/admin-ui/test/clients/scope.spec.ts:202

**Message:** `test.describe.serial` without a justification comment.

```
     197|     await assertRowExists(page, itemName1, false);
     198|     await assertRowExists(page, itemName2, false);
     199|   });
     200| });
     201|
>>>  202| test.describe.serial("Client scopes evaluate subtab", () => {
     203|   const clientName = "testClient";
     204|   const userName = "admin-a";
     205|   const secondUserName = "admin-b";
     206|   const searchUserName = "picker-target";
     207|   const realmName = `clients-realm-${uuid()}`;
```

**verdict:**

---

## 5. keycloak-keycloak — js/apps/admin-ui/test/clients/ssf-receiver.spec.ts:14

**Message:** `test.describe.serial` without a justification comment.

```
       9| // configuration form (Save / Revert). The integration server is always
      10| // started with the `ssf` feature (see
      11| // js/apps/keycloak-server/scripts/start-server.js, #49977), so these tests
      12| // assert the SSF tab renders and fail loudly if it is absent, rather than
      13| // skipping.
>>>   14| test.describe.serial("Client SSF receiver", () => {
      15|   const realmName = `ssf-receiver-realm-${uuid()}`;
      16|   const clientId = `ssf-receiver-client-${uuid()}`;
      17|   const audience = "https://receiver.example.com/ssf";
      18|
      19|   // TextControl derives its data-testid from the form field name, which is the
```

**verdict:**

---

## 6. keycloak-keycloak — js/apps/admin-ui/test/clients/ssf-stream.spec.ts:13

**Message:** `test.describe.serial` without a justification comment.

```
       8| // Exercises the admin-console "Create stream" flow on a client's SSF Stream
       9| // sub-tab. The integration server is always started with the `ssf` feature
      10| // (see js/apps/keycloak-server/scripts/start-server.js, #49977), so these
      11| // tests assert the SSF tab renders and fail loudly if it is absent, rather
      12| // than skipping.
>>>   13| test.describe.serial("Client SSF stream creation", () => {
      14|   const realmName = `ssf-stream-realm-${uuid()}`;
      15|   const clientId = `ssf-stream-client-${uuid()}`;
      16|   const pushEndpoint = "https://receiver.example.com/ssf/push";
      17|
      18|   let clientUuid: string;
```

**verdict:**

---

## 7. keycloak-keycloak — js/apps/admin-ui/test/clients/ssf-subjects.spec.ts:15

**Message:** `test.describe.serial` without a justification comment.

```
      10| // POST /admin/realms/{realm}/ssf/clients/{clientId}/subjects/{action}.
      11| // The integration server is always started with the `ssf` feature (see
      12| // js/apps/keycloak-server/scripts/start-server.js, #49977), so these tests
      13| // assert the SSF tab renders and fail loudly if it is absent, rather than
      14| // skipping.
>>>   15| test.describe.serial("Client SSF subjects", () => {
      16|   const realmName = `ssf-subjects-realm-${uuid()}`;
      17|   const clientId = `ssf-subjects-client-${uuid()}`;
      18|   const userEmail = "ssf-subject@example.com";
      19|
      20|   let clientUuid: string;
```

**verdict:**

---

## 8. keycloak-keycloak — js/apps/admin-ui/test/clients/ssf.spec.ts:18

**Message:** `test.describe.serial` without a justification comment.

```
      13| //
      14| // The integration server is always started with the `ssf` feature in the
      15| // `--features` list of js/apps/keycloak-server/scripts/start-server.js
      16| // (#49977), so these tests assume it is enabled and assert the SSF tab
      17| // renders — a missing tab is a real failure, not an expected skip.
>>>   18| test.describe.serial("Client SSF tab", () => {
      19|   const realmName = `ssf-realm-${uuid()}`;
      20|   const ssfClientId = `ssf-client-${uuid()}`;
      21|   const plainClientId = `plain-client-${uuid()}`;
      22|
      23|   // Internal (UUID) ids, needed to build the deep-link client routes.
```

**verdict:**

---

## 9. keycloak-keycloak — js/apps/admin-ui/test/events/list.spec.ts:24

**Message:** `test.describe.serial` without a justification comment.

```
      19|   fillAdminEventsSearchPanel,
      20|   goToAdminEventsTab,
      21|   goToEventsConfig,
      22| } from "./list.ts";
      23|
>>>   24| test.describe.serial("Events tests", () => {
      25|   const tableName = "Events";
      26|   const realmName = `events-realm-${uuid()}`;
      27|
      28|   const eventsTestUser = {
      29|     eventsTestUserId: "",
```

**verdict:**

---

## 10. keycloak-keycloak — js/apps/admin-ui/test/events/list.spec.ts:57

**Message:** `test.describe.serial` without a justification comment.

```
      52|     );
      53|   });
      54|
      55|   test.afterAll(() => adminClient.deleteRealm(realmName));
      56|
>>>   57|   test.describe.serial("User events list empty", () => {
      58|     test.beforeEach(async ({ page }) => {
      59|       await login(page);
      60|       await goToRealm(page, realmName);
      61|       await goToEvents(page);
      62|     });
```

**verdict:**

---

## 11. keycloak-keycloak — js/apps/admin-ui/test/events/list.spec.ts:71

**Message:** `test.describe.serial` without a justification comment.

```
      66|       await goToEvents(page);
      67|       await assertEmptyTable(page);
      68|     });
      69|   });
      70|
>>>   71|   test.describe.serial("User events with events", () => {
      72|     let page: Page;
      73|     test.beforeAll(async ({ browser }) => {
      74|       page = await browser.newPage();
      75|       await login(page);
      76|       await goToRealm(page, realmName);
```

**verdict:**

---
