# QA-CS-109 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-CS-109/RetrySuiteTests.cs:7

**Message:** NUnit `[Retry(3)]` automatically re-runs a failing test.

```
       2| using RetryPolicy;
       3|
       4| public class RetrySuiteTests
       5| {
       6|     [Test]
>>>    7|     [Retry(3)]
       8|     public async Task SubmitsOrder()
       9|     {
      10|         await Page.ClickAsync("button#submit");
      11|     }
      12|
```

**verdict:**

---

## 2. positive-fixtures — QA-CS-109/RetrySuiteTests.cs:14

**Message:** NUnit `[Retry(5)]` automatically re-runs a failing test.

```
       9|     {
      10|         await Page.ClickAsync("button#submit");
      11|     }
      12|
      13|     [Test]
>>>   14|     [Retry(5)]
      15|     public async Task ChargesCard()
      16|     {
      17|     }
      18|
      19|     [Test]
```

**verdict:**

---

## 3. positive-fixtures — QA-CS-109/RetrySuiteTests.cs:20

**Message:** NUnit `[Retry(2)]` automatically re-runs a failing test.

```
      15|     public async Task ChargesCard()
      16|     {
      17|     }
      18|
      19|     [Test]
>>>   20|     [Retry(2)]
      21|     public async Task RefreshesSession()
      22|     {
      23|     }
      24|
      25|     [Test]
```

**verdict:**

---

## 4. positive-fixtures — QA-CS-109/RetrySuiteTests.cs:26

**Message:** NUnit `[Retry(4)]` automatically re-runs a failing test.

```
      21|     public async Task RefreshesSession()
      22|     {
      23|     }
      24|
      25|     [Test]
>>>   26|     [Retry(4)]
      27|     public async Task SyncsData()
      28|     {
      29|     }
      30| }
      31|
```

**verdict:**

---
