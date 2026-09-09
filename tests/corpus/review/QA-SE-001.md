# QA-SE-001 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-SE-001/SearchFlowsTest.java:17

**Message:** Hard sleep before an element lookup (sleep at line 17) — the explicit-wait substitute (QA-SE-001).

```
      12|     void searchReturnsResults() throws InterruptedException {
      13|         driver.get("https://shop.example.com");
      14|         WebElement box = driver.findElement(By.id("search"));
      15|         box.sendKeys("keyboard");
      16|         // Fixed pause before reading the results grid.
>>>   17|         Thread.sleep(2000);
      18|         WebElement results = driver.findElement(By.id("results"));
      19|         org.junit.jupiter.api.Assertions.assertFalse(
      20|             results.findElements(By.className("item")).isEmpty());
      21|     }
      22| }
```

**verdict:**

---

## 2. positive-fixtures — QA-SE-001/sleep-e-java-l5/EPageTest.java:7

**Message:** Hard sleep before an element lookup (sleep at line 7) — the explicit-wait substitute (QA-SE-001).

```
       2| import org.openqa.selenium.WebDriver;
       3|
       4| public class EPageTest {
       5|     public void opens(WebDriver driver) {
       6|         driver.get("https://example.test/e");
>>>    7|         try { Thread.sleep(3500); } catch (InterruptedException ignored) {}
       8|         driver.findElement(By.id("grid"));
       9|     }
      10| }
      11|
```

**verdict:**

---

## 3. positive-fixtures — QA-SE-001/sleep-e-java-v5/EPageTest.java:7

**Message:** Hard sleep before an element lookup (sleep at line 7) — the explicit-wait substitute (QA-SE-001).

```
       2| import org.openqa.selenium.WebDriver;
       3|
       4| public class EPageTest {
       5|     public void opens(WebDriver driver) {
       6|         driver.get("https://example.test/e");
>>>    7|         try { Thread.sleep(3500); } catch (InterruptedException ignored) {}
       8|         driver.findElement(By.id("grid"));
       9|     }
      10| }
      11|
```

**verdict:**

---

## 4. positive-fixtures — QA-SE-001/sleep-escalations-java-10/EscalationsGridTest.java:7

**Message:** Hard sleep before an element lookup (sleep at line 7) — the explicit-wait substitute (QA-SE-001).

```
       2| import org.openqa.selenium.WebDriver;
       3|
       4| public class EscalationsGridTest {
       5|     public void opens(WebDriver driver) {
       6|         driver.get("https://example.test/escalations/grid");
>>>    7|         try { Thread.sleep(2700); } catch (InterruptedException ignored) {}
       8|         driver.findElement(By.id("grid"));
       9|     }
      10| }
      11|
```

**verdict:**

---

## 5. positive-fixtures — QA-SE-001/sleep-escalations-java-8/EscalationsPageTest.java:7

**Message:** Hard sleep before an element lookup (sleep at line 7) — the explicit-wait substitute (QA-SE-001).

```
       2| import org.openqa.selenium.WebDriver;
       3|
       4| public class EscalationsPageTest {
       5|     public void opens(WebDriver driver) {
       6|         driver.get("https://example.test/escalations");
>>>    7|         try { Thread.sleep(2800); } catch (InterruptedException ignored) {}
       8|         driver.findElement(By.id("queue"));
       9|     }
      10| }
      11|
```

**verdict:**

---

## 6. positive-fixtures — QA-SE-001/sleep-escalations-java-9/EscalationsQueueTest.java:7

**Message:** Hard sleep before an element lookup (sleep at line 7) — the explicit-wait substitute (QA-SE-001).

```
       2| import org.openqa.selenium.WebDriver;
       3|
       4| public class EscalationsQueueTest {
       5|     public void opens(WebDriver driver) {
       6|         driver.get("https://example.test/escalations/queue");
>>>    7|         try { Thread.sleep(2600); } catch (InterruptedException ignored) {}
       8|         driver.findElement(By.id("queue"));
       9|     }
      10| }
      11|
```

**verdict:**

---

## 7. positive-fixtures — QA-SE-001/sleep-h-java-s2/HTest.java:7

**Message:** Hard sleep before an element lookup (sleep at line 7) — the explicit-wait substitute (QA-SE-001).

```
       2| import org.openqa.selenium.WebDriver;
       3|
       4| public class HTest {
       5|     public void opens(WebDriver driver) {
       6|         driver.get("https://example.test/h");
>>>    7|         try { Thread.sleep(2500); } catch (InterruptedException ignored) {}
       8|         driver.findElement(By.id("first-row"));
       9|     }
      10| }
      11|
```

**verdict:**

---

## 8. positive-fixtures — QA-SE-001/sleep-i-java-t5/IPageTest.java:7

**Message:** Hard sleep before an element lookup (sleep at line 7) — the explicit-wait substitute (QA-SE-001).

```
       2| import org.openqa.selenium.WebDriver;
       3|
       4| public class IPageTest {
       5|     public void opens(WebDriver driver) {
       6|         driver.get("https://example.test/i");
>>>    7|         try { Thread.sleep(3500); } catch (InterruptedException ignored) {}
       8|         driver.findElement(By.id("grid"));
       9|     }
      10| }
      11|
```

**verdict:**

---

## 9. positive-fixtures — QA-SE-001/sleep-n-java-i2/NTest.java:7

**Message:** Hard sleep before an element lookup (sleep at line 7) — the explicit-wait substitute (QA-SE-001).

```
       2| import org.openqa.selenium.WebDriver;
       3|
       4| public class NTest {
       5|     public void opens(WebDriver driver) {
       6|         driver.get("https://example.test/n");
>>>    7|         try { Thread.sleep(2500); } catch (InterruptedException ignored) {}
       8|         driver.findElement(By.id("first-row"));
       9|     }
      10| }
      11|
```

**verdict:**

---

## 10. positive-fixtures — QA-SE-001/sleep-u-java-c2/UTest.java:7

**Message:** Hard sleep before an element lookup (sleep at line 7) — the explicit-wait substitute (QA-SE-001).

```
       2| import org.openqa.selenium.WebDriver;
       3|
       4| public class UTest {
       5|     public void opens(WebDriver driver) {
       6|         driver.get("https://example.test/u");
>>>    7|         try { Thread.sleep(2500); } catch (InterruptedException ignored) {}
       8|         driver.findElement(By.id("first-row"));
       9|     }
      10| }
      11|
```

**verdict:**

---
