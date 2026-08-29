# QA-PW-112 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestLocatorFrame.java:252

**Message:** test id `buttonId` violates kebab-case convention.

```
     247|   void getByCoverage() {
     248|     routeIframe(page);
     249|     page.navigate(server.EMPTY_PAGE);
     250|     Locator button1 = page.frameLocator("iframe").getByRole(AriaRole.BUTTON);
     251|     Locator button2 = page.frameLocator("iframe").getByText("Hello");
>>>  252|     Locator button3 = page.frameLocator("iframe").getByTestId("buttonId");
     253|     assertThat(button1).hasText("Hello iframe");
     254|     assertThat(button2).hasText("Hello iframe");
     255|     assertThat(button3).hasText("Hello iframe");
     256|     Locator input1 = page.frameLocator("iframe").getByLabel("Name");
     257|     assertThat(input1).hasValue("");
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:40

**Message:** test id `Hello` violates kebab-case convention.

```
      35|     playwright.selectors().setTestIdAttribute("data-testid");
      36|   }
      37|   @Test
      38|   void getByTestIdShouldWork() {
      39|     page.setContent("<div><div data-testid='Hello'>Hello world</div></div>");
>>>   40|     assertThat(page.getByTestId("Hello")).hasText("Hello world");
      41|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
      42|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
      43|   }
      44|
      45|   @Test
```

**verdict:**

---

## 3. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:41

**Message:** test id `Hello` violates kebab-case convention.

```
      36|   }
      37|   @Test
      38|   void getByTestIdShouldWork() {
      39|     page.setContent("<div><div data-testid='Hello'>Hello world</div></div>");
      40|     assertThat(page.getByTestId("Hello")).hasText("Hello world");
>>>   41|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
      42|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
      43|   }
      44|
      45|   @Test
      46|   void getByTestIdWithCustomTestIdShouldWork() {
```

**verdict:**

---

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:42

**Message:** test id `Hello` violates kebab-case convention.

```
      37|   @Test
      38|   void getByTestIdShouldWork() {
      39|     page.setContent("<div><div data-testid='Hello'>Hello world</div></div>");
      40|     assertThat(page.getByTestId("Hello")).hasText("Hello world");
      41|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
>>>   42|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
      43|   }
      44|
      45|   @Test
      46|   void getByTestIdWithCustomTestIdShouldWork() {
      47|     page.setContent("<div><div data-my-custom-testid='Hello'>Hello world</div></div>");
```

**verdict:**

---

## 5. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:49

**Message:** test id `Hello` violates kebab-case convention.

```
      44|
      45|   @Test
      46|   void getByTestIdWithCustomTestIdShouldWork() {
      47|     page.setContent("<div><div data-my-custom-testid='Hello'>Hello world</div></div>");
      48|     playwright.selectors().setTestIdAttribute("data-my-custom-testid");
>>>   49|     assertThat(page.getByTestId("Hello")).hasText("Hello world");
      50|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
      51|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
      52|   }
      53|
      54|   @Test
```

**verdict:**

---

## 6. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:50

**Message:** test id `Hello` violates kebab-case convention.

```
      45|   @Test
      46|   void getByTestIdWithCustomTestIdShouldWork() {
      47|     page.setContent("<div><div data-my-custom-testid='Hello'>Hello world</div></div>");
      48|     playwright.selectors().setTestIdAttribute("data-my-custom-testid");
      49|     assertThat(page.getByTestId("Hello")).hasText("Hello world");
>>>   50|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
      51|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
      52|   }
      53|
      54|   @Test
      55|   void getByTestIdWithCommaSeparatedTestIdAttributesShouldMatchAny() {
```

**verdict:**

---

## 7. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:51

**Message:** test id `Hello` violates kebab-case convention.

```
      46|   void getByTestIdWithCustomTestIdShouldWork() {
      47|     page.setContent("<div><div data-my-custom-testid='Hello'>Hello world</div></div>");
      48|     playwright.selectors().setTestIdAttribute("data-my-custom-testid");
      49|     assertThat(page.getByTestId("Hello")).hasText("Hello world");
      50|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
>>>   51|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
      52|   }
      53|
      54|   @Test
      55|   void getByTestIdWithCommaSeparatedTestIdAttributesShouldMatchAny() {
      56|     page.setContent("<section>\n" +
```

**verdict:**

---

## 8. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:62

**Message:** test id `Hello` violates kebab-case convention.

```
      57|       "  <div data-pw='Hello'>first</div>\n" +
      58|       "  <div data-ti='Hello'>second</div>\n" +
      59|       "  <div data-testid='Hello'>third</div>\n" +
      60|       "</section>");
      61|     playwright.selectors().setTestIdAttribute("data-pw,data-ti");
>>>   62|     assertThat(page.getByTestId("Hello")).hasCount(2);
      63|     assertThat(page.getByTestId("Hello")).hasText(new String[]{"first", "second"});
      64|     assertThat(page.mainFrame().getByTestId("Hello")).hasCount(2);
      65|     assertThat(page.locator("section").getByTestId("Hello")).hasCount(2);
      66|   }
      67|
```

**verdict:**

---

## 9. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:63

**Message:** test id `Hello` violates kebab-case convention.

```
      58|       "  <div data-ti='Hello'>second</div>\n" +
      59|       "  <div data-testid='Hello'>third</div>\n" +
      60|       "</section>");
      61|     playwright.selectors().setTestIdAttribute("data-pw,data-ti");
      62|     assertThat(page.getByTestId("Hello")).hasCount(2);
>>>   63|     assertThat(page.getByTestId("Hello")).hasText(new String[]{"first", "second"});
      64|     assertThat(page.mainFrame().getByTestId("Hello")).hasCount(2);
      65|     assertThat(page.locator("section").getByTestId("Hello")).hasCount(2);
      66|   }
      67|
      68|   @Test
```

**verdict:**

---

## 10. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:64

**Message:** test id `Hello` violates kebab-case convention.

```
      59|       "  <div data-testid='Hello'>third</div>\n" +
      60|       "</section>");
      61|     playwright.selectors().setTestIdAttribute("data-pw,data-ti");
      62|     assertThat(page.getByTestId("Hello")).hasCount(2);
      63|     assertThat(page.getByTestId("Hello")).hasText(new String[]{"first", "second"});
>>>   64|     assertThat(page.mainFrame().getByTestId("Hello")).hasCount(2);
      65|     assertThat(page.locator("section").getByTestId("Hello")).hasCount(2);
      66|   }
      67|
      68|   @Test
      69|   void shouldUseDataTestidInStrictErrors() {
```

**verdict:**

---

## 11. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:65

**Message:** test id `Hello` violates kebab-case convention.

```
      60|       "</section>");
      61|     playwright.selectors().setTestIdAttribute("data-pw,data-ti");
      62|     assertThat(page.getByTestId("Hello")).hasCount(2);
      63|     assertThat(page.getByTestId("Hello")).hasText(new String[]{"first", "second"});
      64|     assertThat(page.mainFrame().getByTestId("Hello")).hasCount(2);
>>>   65|     assertThat(page.locator("section").getByTestId("Hello")).hasCount(2);
      66|   }
      67|
      68|   @Test
      69|   void shouldUseDataTestidInStrictErrors() {
      70|     playwright.selectors().setTestIdAttribute("data-custom-id");
```

**verdict:**

---

## 12. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:104

**Message:** test id `Hello` violates kebab-case convention.

```
      99|
     100|   @Test
     101|   void getByTestIdShouldWorkForRegex() {
     102|     page.setContent("<div><div data-testid='Hello'>Hello world</div></div>");
     103|     assertThat(page.getByTestId(Pattern.compile("He[l]*o"))).hasText("Hello world");
>>>  104|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
     105|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
     106|   }
     107|
     108|   @Test
     109|   void getByTextShouldWork() {
```

**verdict:**

---

## 13. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestSelectorsGetBy.java:105

**Message:** test id `Hello` violates kebab-case convention.

```
     100|   @Test
     101|   void getByTestIdShouldWorkForRegex() {
     102|     page.setContent("<div><div data-testid='Hello'>Hello world</div></div>");
     103|     assertThat(page.getByTestId(Pattern.compile("He[l]*o"))).hasText("Hello world");
     104|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
>>>  105|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
     106|   }
     107|
     108|   @Test
     109|   void getByTextShouldWork() {
     110|     page.setContent("<div>yo</div><div>ya</div><div>\nye  </div>");
```

**verdict:**

---

## 14. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/junit/TestFixtureOptions.java:57

**Message:** test id `Hello` violates kebab-case convention.

```
      52|   }
      53|
      54|   @Test
      55|   void testCustomTestId(Page page) {
      56|     page.setContent("<div><div data-my-custom-testid='Hello'>Hello world</div></div>");
>>>   57|     assertThat(page.getByTestId("Hello")).hasText("Hello world");
      58|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
      59|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
      60|   }
      61| }
      62|
```

**verdict:**

---

## 15. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/junit/TestFixtureOptions.java:58

**Message:** test id `Hello` violates kebab-case convention.

```
      53|
      54|   @Test
      55|   void testCustomTestId(Page page) {
      56|     page.setContent("<div><div data-my-custom-testid='Hello'>Hello world</div></div>");
      57|     assertThat(page.getByTestId("Hello")).hasText("Hello world");
>>>   58|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
      59|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
      60|   }
      61| }
      62|
```

**verdict:**

---

## 16. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/junit/TestFixtureOptions.java:59

**Message:** test id `Hello` violates kebab-case convention.

```
      54|   @Test
      55|   void testCustomTestId(Page page) {
      56|     page.setContent("<div><div data-my-custom-testid='Hello'>Hello world</div></div>");
      57|     assertThat(page.getByTestId("Hello")).hasText("Hello world");
      58|     assertThat(page.mainFrame().getByTestId("Hello")).hasText("Hello world");
>>>   59|     assertThat(page.locator("div").getByTestId("Hello")).hasText("Hello world");
      60|   }
      61| }
      62|
```

**verdict:**

---

## 17. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1184

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1179|
    1180|     await vi.advanceTimersByTimeAsync(0)
    1181|
    1182|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1183|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1184|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1185|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1186|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1187|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1188|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1189|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 18. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1185

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1180|     await vi.advanceTimersByTimeAsync(0)
    1181|
    1182|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1183|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1184|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1185|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1186|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1187|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1188|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1189|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1190|
```

**verdict:**

---

## 19. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1195

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1190|
    1191|     await vi.advanceTimersByTimeAsync(11)
    1192|
    1193|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1194|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1195|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1196|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1197|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1198|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1199|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1200|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 20. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1196

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1191|     await vi.advanceTimersByTimeAsync(11)
    1192|
    1193|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1194|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1195|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1196|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1197|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1198|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1199|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1200|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1201|   })
```

**verdict:**

---
