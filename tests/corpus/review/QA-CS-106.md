# QA-CS-106 — Sample Findings for Classification

Total sampled: 8 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-CS-106/InventoryTests.cs:11

**Message:** Brittle selector (xpath= selector).

```
       6| {
       7|     [Test]
       8|     public async Task ShouldRenderInventory(Page page)
       9|     {
      10|         await page.GotoAsync("https://app.example.com/inventory");
>>>   11|         var row = page.Locator("xpath=//table[@id='inventory']/tr[3]");
      12|         await Expect(row).ToBeVisibleAsync();
      13|     }
      14|
      15|     [Test]
      16|     public async Task ShouldRenderNestedPanel(Page page)
```

**verdict:**

---

## 2. positive-fixtures — QA-CS-106/InventoryTests.cs:19

**Message:** Brittle selector (absolute XPath).

```
      14|
      15|     [Test]
      16|     public async Task ShouldRenderNestedPanel(Page page)
      17|     {
      18|         await page.GotoAsync("https://app.example.com/admin");
>>>   19|         var panel = page.Locator("//html/body/div[2]/div/section");
      20|         await Expect(panel).ToBeVisibleAsync();
      21|     }
      22|
      23|     [Test]
      24|     public async Task ShouldRenderPrices(Page page)
```

**verdict:**

---

## 3. positive-fixtures — QA-CS-106/InventoryTests.cs:27

**Message:** Brittle selector (nth-child CSS chain).

```
      22|
      23|     [Test]
      24|     public async Task ShouldRenderPrices(Page page)
      25|     {
      26|         await page.GotoAsync("https://app.example.com/prices");
>>>   27|         var child = page.Locator("div:nth-child(4) > span.price");
      28|         Assert.That(child.CountAsync().Result, Is.GreaterThan(0));
      29|     }
      30| }
      31|
```

**verdict:**

---

## 4. positive-fixtures — QA-CS-106/OrderHistoryXpathTests.cs:10

**Message:** Brittle selector (xpath= selector).

```
       5| {
       6|     [Test]
       7|     public async Task XpathFindsOrderRow()
       8|     {
       9|         await Page.SetContentAsync("<table><tr class='order'><td>1</td></tr></table>");
>>>   10|         var rows = await Page.Locator("xpath=//table//tr[contains(@class, 'order')]").CountAsync();
      11|         Assert.That(rows, Is.EqualTo(1));
      12|     }
      13|
      14|     [Test]
      15|     public async Task XpathFindsNestedBadge()
```

**verdict:**

---

## 5. positive-fixtures — QA-CS-106/OrderHistoryXpathTests.cs:18

**Message:** Brittle selector (xpath= selector).

```
      13|
      14|     [Test]
      15|     public async Task XpathFindsNestedBadge()
      16|     {
      17|         await Page.SetContentAsync("<div class='order'><span class='badge'>NEW</span></div>");
>>>   18|         var badge = await Page.Locator("xpath=//div[@class='order']/span[@class='badge']").TextContentAsync();
      19|         Assert.That(badge, Is.EqualTo("NEW"));
      20|     }
      21|
      22|     [Test]
      23|     public async Task XpathHandlesAncestorAxis()
```

**verdict:**

---

## 6. positive-fixtures — QA-CS-106/OrderHistoryXpathTests.cs:26

**Message:** Brittle selector (xpath= selector).

```
      21|
      22|     [Test]
      23|     public async Task XpathHandlesAncestorAxis()
      24|     {
      25|         await Page.SetContentAsync("<ul><li class='item'><span>go</span></li></ul>");
>>>   26|         var li = await Page.Locator("xpath=//span[text()='go']/ancestor::li").EvaluateAsync("e => e.className");
      27|         Assert.That(li, Is.EqualTo("item"));
      28|     }
      29| }
      30|
```

**verdict:**

---

## 7. positive-fixtures — QA-CS-106/SelectorPortabilityTests.cs:12

**Message:** Brittle selector (xpath= selector).

```
       7| {
       8|     [Test]
       9|     public async Task XpathFindsNestedWidget()
      10|     {
      11|         await Page.SetContentAsync("<div class='panel'><span class='widget'>A</span></div>");
>>>   12|         var first = await Page.Locator("xpath=//span[contains(@class, 'widget')]").TextContentAsync();
      13|         Assert.That(first, Is.EqualTo("A"));
      14|     }
      15|
      16|     [Test]
      17|     public async Task XpathHandlesDeepChains()
```

**verdict:**

---

## 8. positive-fixtures — QA-CS-106/SelectorPortabilityTests.cs:20

**Message:** Brittle selector (xpath= selector).

```
      15|
      16|     [Test]
      17|     public async Task XpathHandlesDeepChains()
      18|     {
      19|         await Page.SetContentAsync("<main><section><div class='row'><button>Go</button></div></section></main>");
>>>   20|         var count = await Page.Locator("xpath=//main//section//div[@class='row']/button").CountAsync();
      21|         Assert.That(count, Is.EqualTo(1));
      22|     }
      23| }
      24|
```

**verdict:**

---
