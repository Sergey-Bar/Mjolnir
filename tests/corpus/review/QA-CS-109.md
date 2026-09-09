# QA-CS-109 — Sample Findings for Classification

Total sampled: 7 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-CS-109/OrderTests.cs:5

**Message:** NUnit `[Retry(3)]` automatically re-runs a failing test.

```
       1| using NUnit.Framework;
       2|
       3| public class OrderTests
       4| {
>>>    5|     [Retry(3)]
       6|     [Test]
       7|     public void ShouldProcessPayment()
       8|     {
       9|         Assert.That(PaymentGateway.Charge(100), Is.True);
      10|     }
```

**verdict:**

---

## 2. positive-fixtures — QA-CS-109/OrderTests.cs:12

**Message:** NUnit `[Retry(5)]` automatically re-runs a failing test.

```
       7|     public void ShouldProcessPayment()
       8|     {
       9|         Assert.That(PaymentGateway.Charge(100), Is.True);
      10|     }
      11|
>>>   12|     [Retry(5)]
      13|     [Test]
      14|     public void ShouldSendConfirmationEmail()
      15|     {
      16|         Assert.That(Mailer.Send("user@example.com"), Is.True);
      17|     }
```

**verdict:**

---

## 3. positive-fixtures — QA-CS-109/RetryMaskedFailureTests.cs:5

**Message:** NUnit `[Retry(5)]` automatically re-runs a failing test.

```
       1| using NUnit.Framework;
       2|
       3| // The Retry attribute silently re-runs the flaky timing assertion —
       4| // the underlying race (no await on the polling task) is never fixed.
>>>    5| [Retry(5)]
       6| public class RetryMaskedFailureTests
       7| {
       8|     [Test]
       9|     public async Task PollingTaskEventuallySucceeds()
      10|     {
```

**verdict:**

---

## 4. positive-fixtures — QA-CS-109/RetrySuiteTests.cs:6

**Message:** NUnit `[Retry(3)]` automatically re-runs a failing test.

```
       1| using NUnit.Framework;
       2|
       3| public class RetrySuiteTests
       4| {
       5|     [Test]
>>>    6|     [Retry(3)]
       7|     public async Task SubmitsOrder()
       8|     {
       9|         await Page.ClickAsync("button#submit");
      10|         Assert.That(true, Is.True);
      11|     }
```

**verdict:**

---

## 5. positive-fixtures — QA-CS-109/RetrySuiteTests.cs:14

**Message:** NUnit `[Retry(5)]` automatically re-runs a failing test.

```
       9|         await Page.ClickAsync("button#submit");
      10|         Assert.That(true, Is.True);
      11|     }
      12|
      13|     [Test]
>>>   14|     [Retry(5)]
      15|     public async Task ChargesCard()
      16|     {
      17|         Assert.That(true, Is.True);
      18|     }
      19|
```

**verdict:**

---

## 6. positive-fixtures — QA-CS-109/RetrySuiteTests.cs:21

**Message:** NUnit `[Retry(2)]` automatically re-runs a failing test.

```
      16|     {
      17|         Assert.That(true, Is.True);
      18|     }
      19|
      20|     [Test]
>>>   21|     [Retry(2)]
      22|     public async Task RefreshesSession()
      23|     {
      24|         Assert.That(true, Is.True);
      25|     }
      26|
```

**verdict:**

---

## 7. positive-fixtures — QA-CS-109/RetrySuiteTests.cs:28

**Message:** NUnit `[Retry(4)]` automatically re-runs a failing test.

```
      23|     {
      24|         Assert.That(true, Is.True);
      25|     }
      26|
      27|     [Test]
>>>   28|     [Retry(4)]
      29|     public async Task SyncsData()
      30|     {
      31|         Assert.That(true, Is.True);
      32|     }
      33| }
```

**verdict:**

---
