# QA-JV-109 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-JV-109/RetrySuiteTest.java:7

**Message:** TestNG `retryAnalyzer = com.example.FlakeRetry` automatically re-runs a failing test.

```
       2| import org.junit.jupiter.api.extension.ExtendWith;
       3| import org.junitpioneer.jupiter.RetryingTest;
       4|
       5| public class RetrySuiteTest {
       6|
>>>    7|     @Test(retryAnalyzer = com.example.FlakeRetry.class)
       8|     public void submitsOrder() {
       9|     }
      10|
      11|     @Test(retryAnalyzer = com.example.RetryPolicy.class)
      12|     public void chargesCard() {
```

**verdict:**

---

## 2. positive-fixtures — QA-JV-109/RetrySuiteTest.java:11

**Message:** TestNG `retryAnalyzer = com.example.RetryPolicy` automatically re-runs a failing test.

```
       6|
       7|     @Test(retryAnalyzer = com.example.FlakeRetry.class)
       8|     public void submitsOrder() {
       9|     }
      10|
>>>   11|     @Test(retryAnalyzer = com.example.RetryPolicy.class)
      12|     public void chargesCard() {
      13|     }
      14|
      15|     @RetryingTest(3)
      16|     public void syncsInventory() {
```

**verdict:**

---

## 3. positive-fixtures — QA-JV-109/RetrySuiteTest.java:15

**Message:** JUnit rerun-extension convention (`@RetryingTest(`) automatically re-runs a failing test.

```
      10|
      11|     @Test(retryAnalyzer = com.example.RetryPolicy.class)
      12|     public void chargesCard() {
      13|     }
      14|
>>>   15|     @RetryingTest(3)
      16|     public void syncsInventory() {
      17|     }
      18|
      19|     @RetryingTest(5)
      20|     public void refreshesCache() {
```

**verdict:**

---

## 4. positive-fixtures — QA-JV-109/RetrySuiteTest.java:19

**Message:** JUnit rerun-extension convention (`@RetryingTest(`) automatically re-runs a failing test.

```
      14|
      15|     @RetryingTest(3)
      16|     public void syncsInventory() {
      17|     }
      18|
>>>   19|     @RetryingTest(5)
      20|     public void refreshesCache() {
      21|     }
      22|
      23|     @ExtendWith(RetryOnFailureExtension.class)
      24|     public void retriesFlows() {
```

**verdict:**

---

## 5. positive-fixtures — QA-JV-109/RetrySuiteTest.java:23

**Message:** JUnit rerun-extension convention (`@ExtendWith(RetryOnFailureExtension.class)`) automatically re-runs a failing test.

```
      18|
      19|     @RetryingTest(5)
      20|     public void refreshesCache() {
      21|     }
      22|
>>>   23|     @ExtendWith(RetryOnFailureExtension.class)
      24|     public void retriesFlows() {
      25|     }
      26|
      27|     @ExtendWith(com.example.RetryExtension.class)
      28|     public void moreRetries() {
```

**verdict:**

---

## 6. positive-fixtures — QA-JV-109/RetrySuiteTest.java:27

**Message:** JUnit rerun-extension convention (`@ExtendWith(com.example.RetryExtension.class)`) automatically re-runs a failing test.

```
      22|
      23|     @ExtendWith(RetryOnFailureExtension.class)
      24|     public void retriesFlows() {
      25|     }
      26|
>>>   27|     @ExtendWith(com.example.RetryExtension.class)
      28|     public void moreRetries() {
      29|     }
      30| }
      31|
      32|     @Test(retryAnalyzer = com.example.AnotherRetry.class)
```

**verdict:**

---

## 7. positive-fixtures — QA-JV-109/RetrySuiteTest.java:32

**Message:** TestNG `retryAnalyzer = com.example.AnotherRetry` automatically re-runs a failing test.

```
      27|     @ExtendWith(com.example.RetryExtension.class)
      28|     public void moreRetries() {
      29|     }
      30| }
      31|
>>>   32|     @Test(retryAnalyzer = com.example.AnotherRetry.class)
      33|     public void refreshesCache() {
      34|     }
      35|
      36|     @RetryingTest(4)
      37|     public void syncsReplicas() {
```

**verdict:**

---

## 8. positive-fixtures — QA-JV-109/RetrySuiteTest.java:36

**Message:** JUnit rerun-extension convention (`@RetryingTest(`) automatically re-runs a failing test.

```
      31|
      32|     @Test(retryAnalyzer = com.example.AnotherRetry.class)
      33|     public void refreshesCache() {
      34|     }
      35|
>>>   36|     @RetryingTest(4)
      37|     public void syncsReplicas() {
      38|     }
      39|
      40|     @ExtendWith(com.example.RetryOnFlake.class)
      41|     public void retriesBackgroundJobs() {
```

**verdict:**

---

## 9. positive-fixtures — QA-JV-109/RetrySuiteTest.java:40

**Message:** JUnit rerun-extension convention (`@ExtendWith(com.example.RetryOnFlake.class)`) automatically re-runs a failing test.

```
      35|
      36|     @RetryingTest(4)
      37|     public void syncsReplicas() {
      38|     }
      39|
>>>   40|     @ExtendWith(com.example.RetryOnFlake.class)
      41|     public void retriesBackgroundJobs() {
      42|     }
      43|
      44|     @RetryingTest(2)
      45|     public void retriesReplication() {
```

**verdict:**

---

## 10. positive-fixtures — QA-JV-109/RetrySuiteTest.java:44

**Message:** JUnit rerun-extension convention (`@RetryingTest(`) automatically re-runs a failing test.

```
      39|
      40|     @ExtendWith(com.example.RetryOnFlake.class)
      41|     public void retriesBackgroundJobs() {
      42|     }
      43|
>>>   44|     @RetryingTest(2)
      45|     public void retriesReplication() {
      46|     }
      47| }
      48|
```

**verdict:**

---
