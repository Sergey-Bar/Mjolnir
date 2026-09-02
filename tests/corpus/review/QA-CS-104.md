# QA-CS-104 — Sample Findings for Classification

Total sampled: 3 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-CS-104/BrowserHolderTests.cs:5

**Message:** `static IPage` — browser state shared across tests.

```
       1| using Microsoft.Playwright;
       2|
       3| public class BrowserHolderTests
       4| {
>>>    5|     private static IPage Page;
       6|     public static IBrowser Browser;
       7|     internal static IBrowserContext Context;
       8|     protected static IPlaywright Playwright;
       9|     private static IPage PageTwo;
      10|
```

**verdict:**

---

## 2. positive-fixtures — QA-CS-104/BrowserHolderTests.cs:9

**Message:** `static IPage` — browser state shared across tests.

```
       4| {
       5|     private static IPage Page;
       6|     public static IBrowser Browser;
       7|     internal static IBrowserContext Context;
       8|     protected static IPlaywright Playwright;
>>>    9|     private static IPage PageTwo;
      10|
      11|     public void Open()
      12|     {
      13|         Page.GotoAsync("https://example.com");
      14|     }
```

**verdict:**

---

## 3. positive-fixtures — QA-CS-104/SharedContextTests.cs:6

**Message:** `static IPage` — browser state shared across tests.

```
       1| using Microsoft.Playwright;
       2|
       3| public class SharedContextTests
       4| {
       5|     private static IBrowserContext ctx;
>>>    6|     static IPage currentPage;
       7|
       8|     public void Navigate()
       9|     {
      10|         currentPage.GotoAsync("https://example.com");
      11|     }
```

**verdict:**

---
