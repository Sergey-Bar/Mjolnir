# QA-JV-107 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-JV-107/FeedTests.java:10

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

**verdict:**

---

## 2. positive-fixtures — QA-JV-107/FeedTests.java:15

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

**verdict:**

---

## 3. positive-fixtures — QA-JV-107/FeedTests.java:20

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

**verdict:**

---

## 4. positive-fixtures — QA-JV-107/FeedTests.java:25

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

**verdict:**

---
