# QA-JV-107 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-JV-107/DashboardNetworkIdleTest.java:12

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
       7| public class DashboardNetworkIdleTest {
       8|
       9|     @Test
      10|     void dashboardWaitsForNetworkIdle() {
      11|         page.navigate("/dashboard");
>>>   12|         page.waitForLoadState(LoadState.NETWORKIDLE);
      13|         assertTrue(page.locator(".widgets").isVisible());
      14|     }
      15|
      16|     @Test
      17|     void reportWaitsForNetworkIdle() {
```

**verdict:**

---

## 2. positive-fixtures — QA-JV-107/DashboardNetworkIdleTest.java:19

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      14|     }
      15|
      16|     @Test
      17|     void reportWaitsForNetworkIdle() {
      18|         page.navigate("/reports/weekly");
>>>   19|         page.waitForLoadState(LoadState.NETWORKIDLE);
      20|         assertEquals("weekly", page.locator("#range").textContent());
      21|     }
      22|
      23|     @Test
      24|     void exportsWaitsForNetworkIdle() {
```

**verdict:**

---

## 3. positive-fixtures — QA-JV-107/DashboardNetworkIdleTest.java:26

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      21|     }
      22|
      23|     @Test
      24|     void exportsWaitsForNetworkIdle() {
      25|         page.navigate("/exports");
>>>   26|         page.waitForLoadState(LoadState.NETWORKIDLE);
      27|         assertNotNull(page.locator(".export-list"));
      28|     }
      29| }
      30|
```

**verdict:**

---

## 4. positive-fixtures — QA-JV-107/FeedTests.java:10

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
       5| public class FeedTests {
       6|
       7|     @Test
       8|     public void loadsFeed(Page page) {
       9|         page.navigate("https://example.com/feed");
>>>   10|         page.waitForLoadState(LoadState.NETWORKIDLE);
      11|     }
      12|
      13|     @Test
      14|     public void loadsTimeline(Page page) {
      15|         page.waitForLoadState(LoadState.NETWORKIDLE);
```

**verdict:**

---

## 5. positive-fixtures — QA-JV-107/FeedTests.java:15

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      10|         page.waitForLoadState(LoadState.NETWORKIDLE);
      11|     }
      12|
      13|     @Test
      14|     public void loadsTimeline(Page page) {
>>>   15|         page.waitForLoadState(LoadState.NETWORKIDLE);
      16|     }
      17|
      18|     @Test
      19|     public void loadsInbox(Page page) {
      20|         page.waitForLoadState(LoadState.NETWORKIDLE);
```

**verdict:**

---

## 6. positive-fixtures — QA-JV-107/FeedTests.java:20

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      15|         page.waitForLoadState(LoadState.NETWORKIDLE);
      16|     }
      17|
      18|     @Test
      19|     public void loadsInbox(Page page) {
>>>   20|         page.waitForLoadState(LoadState.NETWORKIDLE);
      21|     }
      22|
      23|     @Test
      24|     public void loadsArchive(Page page) {
      25|         page.waitForLoadState(LoadState.NETWORKIDLE);
```

**verdict:**

---

## 7. positive-fixtures — QA-JV-107/FeedTests.java:25

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      20|         page.waitForLoadState(LoadState.NETWORKIDLE);
      21|     }
      22|
      23|     @Test
      24|     public void loadsArchive(Page page) {
>>>   25|         page.waitForLoadState(LoadState.NETWORKIDLE);
      26|     }
      27| }
      28|
```

**verdict:**

---

## 8. positive-fixtures — QA-JV-107/OrderFlowTest.java:12

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
       7| class OrderFlowTest {
       8|
       9|     @Test
      10|     void shouldLoadOrderHistory(Page page) {
      11|         page.navigate("https://app.example.com/orders");
>>>   12|         page.waitForLoadState(LoadState.NETWORKIDLE);
      13|         assertThat(page.locator("#order-list")).isVisible();
      14|     }
      15|
      16|     @Test
      17|     void shouldLoadCustomerProfile(Page page) {
```

**verdict:**

---

## 9. positive-fixtures — QA-JV-107/OrderFlowTest.java:19

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      14|     }
      15|
      16|     @Test
      17|     void shouldLoadCustomerProfile(Page page) {
      18|         page.navigate("https://app.example.com/profile");
>>>   19|         page.waitForLoadState(LoadState.NETWORKIDLE);
      20|         assertThat(page.locator("#profile-card")).isVisible();
      21|     }
      22|
      23|     @Test
      24|     void shouldLoadShippingAddresses(Page page) {
```

**verdict:**

---

## 10. positive-fixtures — QA-JV-107/OrderFlowTest.java:26

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      21|     }
      22|
      23|     @Test
      24|     void shouldLoadShippingAddresses(Page page) {
      25|         page.navigate("https://app.example.com/addresses");
>>>   26|         page.waitForLoadState(LoadState.NETWORKIDLE);
      27|         assertThat(page.locator(".address-row")).isVisible();
      28|     }
      29| }
      30|
```

**verdict:**

---
