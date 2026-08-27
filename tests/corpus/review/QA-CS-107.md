# QA-CS-107 — Sample Findings for Classification

Total sampled: 1 (max 20 per rule)

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
