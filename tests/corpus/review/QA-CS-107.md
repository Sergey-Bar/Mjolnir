# QA-CS-107 — Sample Findings for Classification

Total sampled: 5 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.Tests/PageNetworkIdleTests.cs:133

**Message:** `WaitForLoadStateAsync(LoadState.NetworkIdle)` used.

```
     128|             var popupTask = Page.WaitForPopupAsync();
     129|             await Task.WhenAll(
     130|                 Page.WaitForPopupAsync(),
     131|                 Page.ClickAsync("#box" + i));
     132|
>>>  133|             await popupTask.Result.WaitForLoadStateAsync(LoadState.NetworkIdle);
     134|         }
     135|     }
     136|
     137|     private async Task NetworkIdleTestAsync(IFrame frame, Func<Task> action = default, bool isSetContent = false)
     138|     {
```

**verdict:**

---

## 2. positive-fixtures — QA-CS-107/FeedTests.cs:11

**Message:** `WaitForLoadStateAsync(LoadState.NetworkIdle)` used.

```
       6| {
       7|     [TestMethod]
       8|     public async Task LoadsFeed()
       9|     {
      10|         await Page.GotoAsync("https://example.com/feed");
>>>   11|         await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
      12|     }
      13|
      14|     [TestMethod]
      15|     public async Task LoadsTimeline()
      16|     {
```

**verdict:**

---

## 3. positive-fixtures — QA-CS-107/FeedTests.cs:17

**Message:** `WaitForLoadStateAsync(LoadState.NetworkIdle)` used.

```
      12|     }
      13|
      14|     [TestMethod]
      15|     public async Task LoadsTimeline()
      16|     {
>>>   17|         await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
      18|     }
      19|
      20|     [TestMethod]
      21|     public async Task LoadsInbox()
      22|     {
```

**verdict:**

---

## 4. positive-fixtures — QA-CS-107/FeedTests.cs:23

**Message:** `WaitForLoadStateAsync(LoadState.NetworkIdle)` used.

```
      18|     }
      19|
      20|     [TestMethod]
      21|     public async Task LoadsInbox()
      22|     {
>>>   23|         await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
      24|     }
      25|
      26|     [TestMethod]
      27|     public async Task LoadsArchive()
      28|     {
```

**verdict:**

---

## 5. positive-fixtures — QA-CS-107/FeedTests.cs:29

**Message:** `WaitForLoadStateAsync(LoadState.NetworkIdle)` used.

```
      24|     }
      25|
      26|     [TestMethod]
      27|     public async Task LoadsArchive()
      28|     {
>>>   29|         await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
      30|     }
      31| }
      32|
```

**verdict:**

---
