# QA-JV-104 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/junit/TestFixtures.java:28

**Message:** Static `  private static Playwright` — browser state shared across tests.

```
      23|
      24| import static org.junit.jupiter.api.Assertions.*;
      25|
      26| @UsePlaywright
      27| public class TestFixtures {
>>>   28|   private static Playwright playwrightFromBeforeAll;
      29|   private static Browser browserFromBeforeAll;
      30|   private BrowserContext browserContextFromBeforeEach;
      31|   private Page pageFromBeforeEach;
      32|   private static APIRequestContext apiRequestContextFromBeforeAll;
      33|   private APIRequestContext apiRequestContextFromBeforeEach;
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/junit/TestFixtures.java:29

**Message:** Static `  private static Browser` — browser state shared across tests.

```
      24| import static org.junit.jupiter.api.Assertions.*;
      25|
      26| @UsePlaywright
      27| public class TestFixtures {
      28|   private static Playwright playwrightFromBeforeAll;
>>>   29|   private static Browser browserFromBeforeAll;
      30|   private BrowserContext browserContextFromBeforeEach;
      31|   private Page pageFromBeforeEach;
      32|   private static APIRequestContext apiRequestContextFromBeforeAll;
      33|   private APIRequestContext apiRequestContextFromBeforeEach;
      34|
```

**verdict:**

---
