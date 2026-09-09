# QA-CS-104 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

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

## 3. positive-fixtures — QA-CS-104/CrossClassSharedContextTests.cs:8

**Message:** `static IPage` — browser state shared across tests.

```
       3|
       4| // Two test classes share ONE static browser/page pair — parallel test
       5| // classes race on the same page instance.
       6| public class SharedPlaywrightContext
       7| {
>>>    8|     public static readonly IPage Page = Playwright.CreateAsync().Result;
       9| }
      10|
      11| public class InventoryTests
      12| {
      13|     [Test]
```

**verdict:**

---

## 4. positive-fixtures — QA-CS-104/NotificationsSharedContextTests.cs:6

**Message:** `static IPage` — browser state shared across tests.

```
       1| using Microsoft.Playwright;
       2| using NUnit.Framework;
       3|
       4| public class NotificationsSharedContext
       5| {
>>>    6|     public static readonly IPage Page = Playwright.CreateAsync().Result;
       7| }
       8|
       9| public class NotificationsTests
      10| {
      11|     [Test]
```

**verdict:**

---

## 5. positive-fixtures — QA-CS-104/SharedContextTests.cs:6

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

## 6. positive-fixtures — QA-CS-104/SharedPageTest.cs:6

**Message:** `static IPage` — browser state shared across tests.

```
       1| using Microsoft.Playwright;
       2| using NUnit.Framework;
       3|
       4| public class SharedPageTest
       5| {
>>>    6|     private static readonly IPage Page = Playwright.CreateAsync().Result;
       7|
       8|     [Test]
       9|     public async Task ShouldRenderDashboard()
      10|     {
      11|         await Page.GotoAsync("https://app.example.com/dashboard");
```

**verdict:**

---

## 7. positive-fixtures — QA-CS-104/shared-page-e-M2/eTests.cs:6

**Message:** `static IPage` — browser state shared across tests.

```
       1| using Microsoft.Playwright;
       2| using NUnit.Framework;
       3|
       4| public class eSharedContext
       5| {
>>>    6|     public static readonly IPage Page = Playwright.CreateAsync().Result;
       7| }
       8|
       9| public class eTests
      10| {
      11|     [Test]
```

**verdict:**

---

## 8. positive-fixtures — QA-CS-104/shared-page-e-R2/eTests.cs:6

**Message:** `static IPage` — browser state shared across tests.

```
       1| using Microsoft.Playwright;
       2| using NUnit.Framework;
       3|
       4| public class eSharedContext
       5| {
>>>    6|     public static readonly IPage Page = Playwright.CreateAsync().Result;
       7| }
       8|
       9| public class eTests
      10| {
      11|     [Test]
```

**verdict:**

---

## 9. positive-fixtures — QA-CS-104/shared-page-e-S2/eTests.cs:6

**Message:** `static IPage` — browser state shared across tests.

```
       1| using Microsoft.Playwright;
       2| using NUnit.Framework;
       3|
       4| public class eSharedContext
       5| {
>>>    6|     public static readonly IPage Page = Playwright.CreateAsync().Result;
       7| }
       8|
       9| public class eTests
      10| {
      11|     [Test]
```

**verdict:**

---

## 10. positive-fixtures — QA-CS-104/shared-page-r-P2/rTests.cs:6

**Message:** `static IPage` — browser state shared across tests.

```
       1| using Microsoft.Playwright;
       2| using NUnit.Framework;
       3|
       4| public class rSharedContext
       5| {
>>>    6|     public static readonly IPage Page = Playwright.CreateAsync().Result;
       7| }
       8|
       9| public class rTests
      10| {
      11|     [Test]
```

**verdict:**

---
