# QA-CS-103 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — src/Playwright.Tests/ConventionTests.cs:12

**Message:** Test `EnsurePublicMethodsAreNotInlined` contains no assertions.

```
       7| public class ConventionTests
       8| {
       9|     // To ensure that public method are not inlined by the new tiered PGO JIT mode,
      10|     // we need to mark them with [MethodImpl(MethodImplOptions.NoInlining)]
      11|     // See https://github.com/microsoft/playwright-dotnet/issues/2617
>>>   12|     [Test]
      13|     public void EnsurePublicMethodsAreNotInlined()
      14|     {
      15|         var assembly = typeof(Playwright).Assembly;
      16|
      17|         var types = assembly.GetTypes()
```

**verdict:**

---

## 2. microsoft-playwright-dotnet — src/Playwright.Tests/PauseTests.cs:29

**Message:** Test `ShouldNotFail` contains no assertions.

```
      24|
      25| namespace Microsoft.Playwright.Tests;
      26|
      27| public class PauseTests : PageTestEx
      28| {
>>>   29|     [Test]
      30|     public async Task ShouldNotFail()
      31|     {
      32|         await Page.GotoAsync(Server.EmptyPage);
      33|         await Page.PauseAsync();
      34|     }
```

**verdict:**

---
