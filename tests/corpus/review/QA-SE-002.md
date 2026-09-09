# QA-SE-002 — Sample Findings for Classification

Total sampled: 9 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-SE-001/sleep-e-cs-l5/EPageTests.cs:10

**Message:** Hard sleep before an element lookup (sleep at line 10) — the explicit-wait substitute (QA-SE-002).

```
       5| {
       6|     [Test]
       7|     public void Opens()
       8|     {
       9|         Driver.Navigate().GoToUrl("https://example.test/e");
>>>   10|         System.Threading.Thread.Sleep(3500);
      11|         Driver.FindElement(By.Id("grid"));
      12|     }
      13| }
      14|
```

**verdict:**

---

## 2. positive-fixtures — QA-SE-001/sleep-e-cs-v5/EPageTests.cs:10

**Message:** Hard sleep before an element lookup (sleep at line 10) — the explicit-wait substitute (QA-SE-002).

```
       5| {
       6|     [Test]
       7|     public void Opens()
       8|     {
       9|         Driver.Navigate().GoToUrl("https://example.test/e");
>>>   10|         System.Threading.Thread.Sleep(3500);
      11|         Driver.FindElement(By.Id("grid"));
      12|     }
      13| }
      14|
```

**verdict:**

---

## 3. positive-fixtures — QA-SE-001/sleep-escalations-cs-8/EscalationsPageTests.cs:10

**Message:** Hard sleep before an element lookup (sleep at line 10) — the explicit-wait substitute (QA-SE-002).

```
       5| {
       6|     [Test]
       7|     public void Opens()
       8|     {
       9|         Driver.Navigate().GoToUrl("https://example.test/escalations");
>>>   10|         System.Threading.Thread.Sleep(2800);
      11|         Driver.FindElement(By.Id("queue"));
      12|     }
      13| }
      14|
```

**verdict:**

---

## 4. positive-fixtures — QA-SE-001/sleep-h-cs-s2/HTests.cs:10

**Message:** Hard sleep before an element lookup (sleep at line 10) — the explicit-wait substitute (QA-SE-002).

```
       5| {
       6|     [Test]
       7|     public void Opens()
       8|     {
       9|         Driver.Navigate().GoToUrl("https://example.test/h");
>>>   10|         System.Threading.Thread.Sleep(2500);
      11|         var row = Driver.FindElement(By.Id("first-row"));
      12|         Assert.That(row.Displayed, Is.True);
      13|     }
      14| }
      15|
```

**verdict:**

---

## 5. positive-fixtures — QA-SE-001/sleep-i-cs-t5/IPageTests.cs:10

**Message:** Hard sleep before an element lookup (sleep at line 10) — the explicit-wait substitute (QA-SE-002).

```
       5| {
       6|     [Test]
       7|     public void Opens()
       8|     {
       9|         Driver.Navigate().GoToUrl("https://example.test/i");
>>>   10|         System.Threading.Thread.Sleep(3500);
      11|         Driver.FindElement(By.Id("grid"));
      12|     }
      13| }
      14|
```

**verdict:**

---

## 6. positive-fixtures — QA-SE-001/sleep-n-cs-i2/NTests.cs:10

**Message:** Hard sleep before an element lookup (sleep at line 10) — the explicit-wait substitute (QA-SE-002).

```
       5| {
       6|     [Test]
       7|     public void Opens()
       8|     {
       9|         Driver.Navigate().GoToUrl("https://example.test/n");
>>>   10|         System.Threading.Thread.Sleep(2500);
      11|         var row = Driver.FindElement(By.Id("first-row"));
      12|         Assert.That(row.Displayed, Is.True);
      13|     }
      14| }
      15|
```

**verdict:**

---

## 7. positive-fixtures — QA-SE-001/sleep-u-cs-c2/UTests.cs:10

**Message:** Hard sleep before an element lookup (sleep at line 10) — the explicit-wait substitute (QA-SE-002).

```
       5| {
       6|     [Test]
       7|     public void Opens()
       8|     {
       9|         Driver.Navigate().GoToUrl("https://example.test/u");
>>>   10|         System.Threading.Thread.Sleep(2500);
      11|         var row = Driver.FindElement(By.Id("first-row"));
      12|         Assert.That(row.Displayed, Is.True);
      13|     }
      14| }
      15|
```

**verdict:**

---

## 8. positive-fixtures — QA-SE-002/InventoryTest.cs:10

**Message:** Hard sleep before an element lookup (sleep at line 10) — the explicit-wait substitute (QA-SE-002).

```
       5| class InventoryTest
       6| {
       7|     public void LoadInventory(IWebDriver driver)
       8|     {
       9|         driver.Navigate().GoToUrl("https://app.example.com/inventory");
>>>   10|         Thread.Sleep(3000);
      11|         driver.FindElement(By.Id("inventory-table"));
      12|     }
      13| }
      14|
```

**verdict:**

---

## 9. positive-fixtures — QA-SE-002/LoginFlowsTests.cs:17

**Message:** Hard sleep before an element lookup (sleep at line 17) — the explicit-wait substitute (QA-SE-002).

```
      12|         driver.Navigate().GoToUrl("https://app.example.com/login");
      13|         driver.FindElement(By.Id("user")).SendKeys("admin");
      14|         driver.FindElement(By.Id("pass")).SendKeys("secret");
      15|         driver.FindElement(By.Id("submit")).Click();
      16|         // Fixed pause before reading the dashboard header.
>>>   17|         System.Threading.Thread.Sleep(3000);
      18|         var header = driver.FindElement(By.Id("dashboard-header"));
      19|         Assert.That(header.Text, Is.EqualTo("Welcome"));
      20|     }
      21| }
      22|
```

**verdict:**

---
