# PAIR-107 — cross-language side-by-side review aid

> Review aid only — decides nothing. Classify each finding in its own
> rule sheet / verdict row; use this view to keep verdicts CONSISTENT
> across the language family (same pattern ⇒ same verdict class in
> every language, unless the language genuinely changes the case).

Rules in this family: QA-JV-107, QA-CS-107, QA-PY-107

## QA-JV-107 — 4 sampled finding(s)

### positive-fixtures — QA-JV-107/FeedTests.java:10

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
       5| public class FeedTests {
       6|
       7|     @Test
       8|     public void loadsFeed(Page page) {
       9|         page.navigate("https://example.com/feed");
>>>   10|         page.waitForLoadState(LoadState.NETWORKIDLE);
      11|     }
      12|
      13|     @Test
      14|     public void loadsTimeline(Page page) {
      15|         page.waitForLoadState(LoadState.NETWORKIDLE);
```

**verdict:** (unclassified)

### positive-fixtures — QA-JV-107/FeedTests.java:15

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      10|         page.waitForLoadState(LoadState.NETWORKIDLE);
      11|     }
      12|
      13|     @Test
      14|     public void loadsTimeline(Page page) {
>>>   15|         page.waitForLoadState(LoadState.NETWORKIDLE);
      16|     }
      17|
      18|     @Test
      19|     public void loadsInbox(Page page) {
      20|         page.waitForLoadState(LoadState.NETWORKIDLE);
```

**verdict:** (unclassified)

### positive-fixtures — QA-JV-107/FeedTests.java:20

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      15|         page.waitForLoadState(LoadState.NETWORKIDLE);
      16|     }
      17|
      18|     @Test
      19|     public void loadsInbox(Page page) {
>>>   20|         page.waitForLoadState(LoadState.NETWORKIDLE);
      21|     }
      22|
      23|     @Test
      24|     public void loadsArchive(Page page) {
      25|         page.waitForLoadState(LoadState.NETWORKIDLE);
```

**verdict:** (unclassified)

### positive-fixtures — QA-JV-107/FeedTests.java:25

**Message:** `waitForLoadState(LoadState.NETWORKIDLE)` used.

```
      20|         page.waitForLoadState(LoadState.NETWORKIDLE);
      21|     }
      22|
      23|     @Test
      24|     public void loadsArchive(Page page) {
>>>   25|         page.waitForLoadState(LoadState.NETWORKIDLE);
      26|     }
      27| }
      28|
```

**verdict:** (unclassified)

## QA-CS-107 — 5 sampled finding(s)

### microsoft-playwright-dotnet — src/Playwright.Tests/PageNetworkIdleTests.cs:133

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

**verdict:** (unclassified)

### positive-fixtures — QA-CS-107/FeedTests.cs:11

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

**verdict:** (unclassified)

### positive-fixtures — QA-CS-107/FeedTests.cs:17

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

**verdict:** (unclassified)

### positive-fixtures — QA-CS-107/FeedTests.cs:23

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

**verdict:** (unclassified)

### positive-fixtures — QA-CS-107/FeedTests.cs:29

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

**verdict:** (unclassified)

## QA-PY-107 — 3 sampled finding(s)

### positive-fixtures — QA-PY-107/test_networkidle.py:6

**Message:** `wait_for_load_state('networkidle')` used.

```
       1| from playwright.sync_api import Page
       2|
       3|
       4| def test_network_idle(page: Page):
       5|     page.goto("/feed")
>>>    6|     page.wait_for_load_state("networkidle")
       7|
       8|
       9| def test_infinite_scroll(page: Page):
      10|     page.goto("/timeline")
      11|     page.wait_for_load_state("networkidle")
```

**verdict:** (unclassified)

### positive-fixtures — QA-PY-107/test_networkidle.py:11

**Message:** `wait_for_load_state('networkidle')` used.

```
       6|     page.wait_for_load_state("networkidle")
       7|
       8|
       9| def test_infinite_scroll(page: Page):
      10|     page.goto("/timeline")
>>>   11|     page.wait_for_load_state("networkidle")
      12|
      13|
      14| def test_live_updates(page: Page):
      15|     page.goto("/live")
      16|     page.wait_for_load_state("networkidle")
```

**verdict:** (unclassified)

### positive-fixtures — QA-PY-107/test_networkidle.py:16

**Message:** `wait_for_load_state('networkidle')` used.

```
      11|     page.wait_for_load_state("networkidle")
      12|
      13|
      14| def test_live_updates(page: Page):
      15|     page.goto("/live")
>>>   16|     page.wait_for_load_state("networkidle")
      17|
```

**verdict:** (unclassified)
