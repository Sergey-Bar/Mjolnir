# QA-JV-101 — Sample Findings for Classification

Total sampled: 12 (max 35 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. keycloak-keycloak — core/src/test/java/org/keycloak/jose/JWETest.java:74

**Message:** Disabled test detected: `@Ignore (TestNG/JUnit4)`.

```
      69|
      70|         testDirectEncryptAndDecrypt(aesKey, hmacKey, JWEConstants.A128CBC_HS256, PAYLOAD, true);
      71|     }
      72|
      73|     // Works just on OpenJDK 8. Other JDKs (IBM, Oracle) have restrictions on maximum key size of AES to be 128
>>>   74|     @Ignore
      75|     @Test
      76|     public void testDirect_Aes256CbcHmacSha512() throws Exception {
      77|         final SecretKey aesKey = new SecretKeySpec(AES_256_KEY, "AES");
      78|         final SecretKey hmacKey = new SecretKeySpec(HMAC_SHA512_KEY, "HMACSHA2");
      79|
```

**verdict:**

---

## 2. keycloak-keycloak — core/src/test/java/org/keycloak/jose/JWETest.java:114

**Message:** Disabled test detected: `@Ignore (TestNG/JUnit4)`.

```
     109|
     110|         Assert.assertEquals(payload, decodedContent);
     111|     }
     112|
     113|
>>>  114|     @Ignore
     115|     @Test
     116|     public void testPerfDirect() throws Exception {
     117|         int iterations = 50000;
     118|
     119|         long start = System.currentTimeMillis();
```

**verdict:**

---

## 3. keycloak-keycloak — core/src/test/java/org/keycloak/jose/JWETest.java:203

**Message:** Disabled test detected: `@Ignore (TestNG/JUnit4)`.

```
     198|         Assert.assertEquals(PAYLOAD, decodedContent);
     199|     }
     200|
     201|
     202|     // Works just on OpenJDK 8. Other JDKs (IBM, Oracle) have restrictions on maximum key size of AES to be 128
>>>  203|     @Ignore
     204|     @Test
     205|     public void externalJweAes256CbcHmacSha512Test() throws JWEException {
     206|         String externalJwe = "eyJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiYWxnIjoiZGlyIn0..xUPndQ5U69CYaWMKr4nyeg.AzSzba6OdNsvTIoNpub8d2TmYnkY7W8Sd-1S33DjJwJsSaNcfvfXBq5bqXAGVAnLHrLZJKWoEYsmOrYHz3Nao-kpLtUpc4XZI8yiYUqkHTjmxZnfD02R6hz31a5KBCnDTtUEv23VSxm8yUyQKoUTpVHbJ3b2VQvycg2XFUXPsA6oaSSEpz-uwe1Vmun2hUBB.Qal4rMYn1RrXQ9AQ9ONUjUXvlS2ow8np-T8QWMBR0ns";
     207|         System.out.println("External encoded content length: " + externalJwe.length());
     208|
```

**verdict:**

---

## 4. keycloak-keycloak — model/infinispan/src/test/java/org/keycloak/jgroups/protocol/JdbcPing2Test.java:75

**Message:** Disabled test detected: `@Ignore (TestNG/JUnit4)`.

```
      70|     /**
      71|      * 100 iterations would run approx 8 minutes and should complete successfully,
      72|      * with an average of 3.3 seconds in converging.
      73|      */
      74|     @Test
>>>   75|     @Ignore
      76|     public void testConcurrentStartupMultipleTimes() throws Exception {
      77|         int count = 100;
      78|         long sum = 0;
      79|         for (int j = 0; j < 100; j++) {
      80|             sum += runSingleTest();
```

**verdict:**

---

## 5. keycloak-keycloak — model/infinispan/src/test/java/org/keycloak/models/sessions/infinispan/initializer/ConcurrencyVersioningTest.java:49

**Message:** Disabled test detected: `@Ignore (TestNG/JUnit4)`.

```
      44|  * Unit tests to make sure our model caching concurrency model will work.
      45|  *
      46|  * @author <a href="mailto:bill@burkecentral.com">Bill Burke</a>
      47|  * @version $Revision: 1 $
      48|  */
>>>   49| @Ignore
      50| public class ConcurrencyVersioningTest {
      51|
      52|     public static abstract class AbstractThread implements Runnable {
      53|         EmbeddedCacheManager cacheManager;
      54|         boolean success;
```

**verdict:**

---

## 6. keycloak-keycloak — quarkus/runtime/src/test/java/org/keycloak/quarkus/runtime/cli/PicocliTest.java:580

**Message:** Disabled test detected: `@Ignore (TestNG/JUnit4)`.

```
     575|         NonRunningPicocli nonRunningPicocli = pseudoLaunch("export", "--db=dev-file", "--file=file");
     576|         assertEquals(CommandLine.ExitCode.OK, nonRunningPicocli.exitCode);
     577|         assertFalse(nonRunningPicocli.reaug);
     578|     }
     579|
>>>  580|     @Ignore("Not valid until db is required for production")
     581|     @Test
     582|     public void testDBRequiredAutoBuild() {
     583|         build("build", "--db=dev-file");
     584|
     585|         NonRunningPicocli nonRunningPicocli = pseudoLaunch("export", "--file=file");
```

**verdict:**

---

## 7. keycloak-keycloak — rest/admin-v2/tests/src/test/java/org/keycloak/tests/admin/client/v2/ClientApiV2Test.java:1028

**Message:** Disabled test detected: `@Disabled`.

```
    1023|         rep.setRedirectUris(Set.of("javascript:alert(1)"));
    1024|         assertClientCreationFailsWithError(rep, "{\"error\":\"Provided data is invalid\",\"violations\":[\"redirectUris: Redirect URI must be an absolute URI (include scheme like https://) when Root URL is not set\"]}");
    1025|     }
    1026|
    1027|     @Test
>>> 1028|     @Disabled("Root URL fragment validation not yet implemented in V2 API")
    1029|     public void createClientWithInvalidRootUrl() throws Exception {
    1030|         OIDCClientRepresentation rep = new OIDCClientRepresentation();
    1031|         rep.setEnabled(true);
    1032|         rep.setClientId("client-invalid-root-url");
    1033|         rep.setAppUrl("http://localhost:3000#fragment");
```

**verdict:**

---

## 8. keycloak-keycloak — rest/admin-v2/tests/src/test/java/org/keycloak/tests/admin/client/v2/ClientApiV2Test.java:1056

**Message:** Disabled test detected: `@Disabled`.

```
    1051|         rep.setRedirectUris(Set.of("javascript:alert(1)"));
    1052|         assertClientCreationFailsWithError(rep, "{\"error\":\"Provided data is invalid\",\"violations\":[\"redirectUris: Redirect URI must be an absolute URI (include scheme like https://) when Root URL is not set\"]}");
    1053|     }
    1054|
    1055|     @Test
>>> 1056|     @Disabled("Root URL fragment validation not yet implemented in V2 API")
    1057|     public void createSamlClientWithInvalidRootUrl() throws Exception {
    1058|         SAMLClientRepresentation rep = new SAMLClientRepresentation();
    1059|         rep.setEnabled(true);
    1060|         rep.setClientId("saml-client-invalid-root-url");
    1061|         rep.setAppUrl("http://localhost:3000#fragment");
```

**verdict:**

---

## 9. keycloak-keycloak — rest/admin-v2/tests/src/test/java/org/keycloak/tests/admin/client/v2/ClientApiV2Test.java:1084

**Message:** Disabled test detected: `@Disabled`.

```
    1079|         rep.setRedirectUris(Set.of("javascript:alert(1)"));
    1080|         assertClientCreationFailsWithError(rep, "{\"error\":\"Provided data is invalid\",\"violations\":[\"redirectUris: Redirect URI must be an absolute URI (include scheme like https://) when Root URL is not set\"]}");
    1081|     }
    1082|
    1083|     @Test
>>> 1084|     @Disabled("Root URL fragment validation not yet implemented in V2 API")
    1085|     public void updateClientWithInvalidRootUrl() throws Exception {
    1086|         OIDCClientRepresentation rep = new OIDCClientRepresentation();
    1087|         rep.setEnabled(true);
    1088|         rep.setClientId("client-update-invalid-root-url");
    1089|         rep.setAppUrl("http://localhost:3000#fragment");
```

**verdict:**

---

## 10. keycloak-keycloak — rest/admin-v2/tests/src/test/java/org/keycloak/tests/admin/client/v2/ClientApiV2Test.java:1112

**Message:** Disabled test detected: `@Disabled`.

```
    1107|         rep.setRedirectUris(Set.of("javascript:alert(1)"));
    1108|         assertClientCreationFailsWithError(rep, "{\"error\":\"Provided data is invalid\",\"violations\":[\"redirectUris: Redirect URI must be an absolute URI (include scheme like https://) when Root URL is not set\"]}");
    1109|     }
    1110|
    1111|     @Test
>>> 1112|     @Disabled("Root URL fragment validation not yet implemented in V2 API")
    1113|     public void updateSamlClientWithInvalidRootUrl() throws Exception {
    1114|         SAMLClientRepresentation rep = new SAMLClientRepresentation();
    1115|         rep.setEnabled(true);
    1116|         rep.setClientId("saml-client-update-invalid-root-url");
    1117|         rep.setAppUrl("http://localhost:3000#fragment");
```

**verdict:**

---

## 11. keycloak-keycloak — rest/admin-v2/tests/src/test/java/org/keycloak/tests/admin/client/v2/ClientQueryTest.java:176

**Message:** Disabled test detected: `@Disabled`.

```
     171|      *
     172|      * logical needed behavior (could be expressed as in or exists): from client where exists (from roles where ...) and exists (from roles where ...)
     173|      *
     174|      * Or if implemented via a join: from client join roles on (...) where roles.name IN ("admin", "user") - but this gets complicated with grouping / NOT
     175|      */
>>>  176|     @Disabled
     177|     @Test
     178|     public void filterByRolesWithAnd() throws IOException {
     179|         var clients = queryClients("roles eq \"admin\" and roles eq \"user\"");
     180|         assertThat(clients.size(), is(1));
     181|         assertThat(clients.get(0).getClientId(), is("query-test-oidc"));
```

**verdict:**

---

## 12. keycloak-keycloak — rest/admin-v2/tests/src/test/java/org/keycloak/tests/admin/client/v2/ClientQueryTest.java:345

**Message:** Disabled test detected: `@Disabled`.

```
     340|      * It may be possible to support searchability - but it is not trivial
     341|      *
     342|      * The JPA logic will need to look across the predicate, not just the column and value separately
     343|      * and the attribute and value separately and fully rewrite based upon the projection.
     344|      */
>>>  345|     @Disabled
     346|     @Test
     347|     public void filterByLoginFlows() throws IOException {
     348|         var clients = queryClients("loginFlows eq \"STANDARD\"");
     349|         assertThat(clients, not(empty()));
     350|         assertTrue(clients.stream().allMatch(c ->
```

**verdict:**

---
