# QA-JV-106 — Sample Findings for Classification

Total sampled: 8 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-JV-106/OrderHistoryXpathTest.java:10

**Message:** Brittle selector (xpath= selector).

```
       5| public class OrderHistoryXpathTest {
       6|
       7|     @Test
       8|     void xpathFindsOrderRow() {
       9|         page.setContent("<table><tr class='order'><td>1</td></tr></table>");
>>>   10|         Integer rows = (Integer) page.locator("xpath=//table//tr[contains(@class, 'order')]").count();
      11|         assertEquals(1, rows);
      12|     }
      13|
      14|     @Test
      15|     void xpathFindsNestedBadge() {
```

**verdict:**

---

## 2. positive-fixtures — QA-JV-106/OrderHistoryXpathTest.java:17

**Message:** Brittle selector (xpath= selector).

```
      12|     }
      13|
      14|     @Test
      15|     void xpathFindsNestedBadge() {
      16|         page.setContent("<div class='order'><span class='badge'>NEW</span></div>");
>>>   17|         String badge = page.locator("xpath=//div[@class='order']/span[@class='badge']").textContent();
      18|         assertEquals("NEW", badge);
      19|     }
      20|
      21|     @Test
      22|     void xpathHandlesAncestorAxis() {
```

**verdict:**

---

## 3. positive-fixtures — QA-JV-106/OrderHistoryXpathTest.java:24

**Message:** Brittle selector (xpath= selector).

```
      19|     }
      20|
      21|     @Test
      22|     void xpathHandlesAncestorAxis() {
      23|         page.setContent("<ul><li class='item'><span>go</span></li></ul>");
>>>   24|         Object li = page.locator("xpath=//span[text()='go']/ancestor::li").evaluate("e => e.className");
      25|         assertEquals("item", li);
      26|     }
      27|
      28|     @Test
      29|     void xpathHandlesPositionalPredicate() {
```

**verdict:**

---

## 4. positive-fixtures — QA-JV-106/OrderHistoryXpathTest.java:31

**Message:** Brittle selector (xpath= selector).

```
      26|     }
      27|
      28|     @Test
      29|     void xpathHandlesPositionalPredicate() {
      30|         page.setContent("<div><p>one</p><p>two</p></div>");
>>>   31|         String second = page.locator("xpath=//div/p[position()=2]").textContent();
      32|         assertEquals("two", second);
      33|     }
      34| }
      35|
```

**verdict:**

---

## 5. positive-fixtures — QA-JV-106/SelectorPortabilityTest.java:13

**Message:** Brittle selector (xpath= selector).

```
       8| class SelectorPortabilityTest {
       9|
      10|     @Test
      11|     void xpathFindsNestedWidget() {
      12|         page.setContent("<div class='panel'><span class='widget'>A</span></div>");
>>>   13|         Object first = page.locator("xpath=//span[contains(@class, 'widget')]").evaluate("e => e.textContent");
      14|         assertEquals("A", first);
      15|     }
      16|
      17|     @Test
      18|     void xpathHandlesDeepChains() {
```

**verdict:**

---

## 6. positive-fixtures — QA-JV-106/SelectorPortabilityTest.java:20

**Message:** Brittle selector (xpath= selector).

```
      15|     }
      16|
      17|     @Test
      18|     void xpathHandlesDeepChains() {
      19|         page.setContent("<main><section><div class='row'><button>Go</button></div></section></main>");
>>>   20|         Integer count = (Integer) page.locator("xpath=//main//section//div[@class='row']/button").count();
      21|         assertEquals(1, count);
      22|     }
      23| }
      24|
```

**verdict:**

---

## 7. positive-fixtures — QA-JV-106/SelectorTest.java:7

**Message:** Brittle selector (xpath= selector).

```
       2|
       3| class SelectorTest {
       4|
       5|     @Test
       6|     void shouldSubmitForm() {
>>>    7|         page.locator("xpath=//button[@type='submit']").click();
       8|         page.locator("//div/section/form").click();
       9|     }
      10| }
      11|
```

**verdict:**

---

## 8. positive-fixtures — QA-JV-106/SelectorTest.java:8

**Message:** Brittle selector (absolute XPath).

```
       3| class SelectorTest {
       4|
       5|     @Test
       6|     void shouldSubmitForm() {
       7|         page.locator("xpath=//button[@type='submit']").click();
>>>    8|         page.locator("//div/section/form").click();
       9|     }
      10| }
      11|
```

**verdict:**

---
