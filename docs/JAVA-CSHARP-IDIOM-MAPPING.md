# Java / C# Playwright idiom mapping — Sprint 8 Task 31

**Master-Stabilization-Plan.md Sprint 8.** Documents exact Java and C#
syntax for every rule this sprint ports, before any detection code is
written, per the plan's own instruction. Every API name/signature below
was verified against the official Playwright API reference
([Java](https://playwright.dev/java/docs/api/class-page),
[.NET](https://playwright.dev/dotnet/docs/api/class-page)) during this
spike — not assumed from JS/Python familiarity. Two real, non-obvious
findings from that verification are called out explicitly below because
they would have produced silently-broken detection regexes if guessed.

## Findings from verification (read this before touching regexes)

1. **Java navigation is `page.navigate(url)`, not `page.goto(url)`.**
   Every other Playwright language binding (JS, Python, C#) uses
   `goto`/`GotoAsync`. Java is the one exception. A hardcoded-URL rule
   ported by pattern-matching JS/Python's `goto(` would silently never
   fire in Java.
2. **C# uses PascalCase `Async`-suffixed methods** (`GotoAsync`,
   `WaitForLoadStateAsync`, `ClickAsync`), consistent with .NET
   convention — this was already known/documented in this repo
   (`.NET Playwright is async-only`) but is restated here for
   completeness against the other two rows.

## Rule-by-rule mapping

| Concern                             | Python (reference, already shipped)                                                                                | Java (Task 32, QA-JV-106/107/108)                                                                                                                                                                                                                                                                             | C# (Task 33, QA-CS-105/106/107/108)                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brittle selectors                   | `locator('xpath=...')`, `locator('...nth-child...')`, `locator('/html/...')`, `query_selector('#...')` (QA-PY-104) | `locator("xpath=...")`, `locator("...:nth-child(...)...")` (Java CSS `:nth-child`, not JS-style `nth-child` without colon — Java/CSS both use the same CSS3 syntax `:nth-child()`), `locator("//html/...")` (Java allows a bare `//` XPath shorthand in addition to `xpath=` prefix), `querySelector("#...")` | `Locator("xpath=...")`, `Locator("...:nth-child(...)...")`, `Locator("//html/...")`, `QuerySelectorAsync("#...")`                                                   |
| networkidle wait                    | `wait_for_load_state("networkidle")` (QA-PY-107)                                                                   | `page.waitForLoadState(LoadState.NETWORKIDLE)` — **enum constant, not a string literal** (`LoadState.NETWORKIDLE`, imported from `com.microsoft.playwright.options.LoadState`); method is NOT Async-suffixed (sync-only in Java except explicit async wrappers, out of scope here)                            | `page.WaitForLoadStateAsync(LoadState.NetworkIdle)` — **enum constant** `LoadState.NetworkIdle` from `Microsoft.Playwright`, PascalCase                             |
| Hardcoded environment URL           | `goto("https://...")`, `request.get("https://...")` (QA-PY-108)                                                    | `page.navigate("https://...")` — **not `.goto(`** (see finding #1 above); also matches `Request` helper equivalents if present                                                                                                                                                                                | `page.GotoAsync("https://...")`, `Request.GetAsync("https://...")`                                                                                                  |
| Hard sleep (already shipped)        | `time.sleep(...)`, `page.wait_for_timeout(...)`                                                                    | `Thread.sleep(...)` (QA-JV-102, done)                                                                                                                                                                                                                                                                         | `Thread.Sleep(...)`, `Task.Delay(...)` (QA-CS-102, done)                                                                                                            |
| waitForTimeout (already shipped)    | `page.wait_for_timeout(...)` (QA-PY-103)                                                                           | `page.waitForTimeout(...)` (QA-JV-105, done)                                                                                                                                                                                                                                                                  | `page.WaitForTimeoutAsync(...)` (**Task 33 adds this to C#** — not yet shipped as of Sprint 7, per the plan's own text "the same three plus `WaitForTimeoutAsync`") |
| No assertions (already shipped)     | `assert`/`expect()` absence (QA-PY-105)                                                                            | `assertThat`/`assertEquals`/`fail`/`verify` absence (QA-JV-103, done)                                                                                                                                                                                                                                         | `Assert.*`/`.Should()`/`Verify` absence (QA-CS-103, done)                                                                                                           |
| Shared page/state (already shipped) | module-level mutable state (QA-PY-106)                                                                             | static field mutation across `@Test` methods (QA-JV-104, done)                                                                                                                                                                                                                                                | static field mutation across `[Test]`/`[Fact]` methods (QA-CS-104, done)                                                                                            |

## Retry/flake masking (Task 34) — per-framework, NOT one regex

The plan is explicit that JUnit, TestNG, NUnit, and xUnit each need
distinct detection because they have genuinely different retry
mechanisms — verified against each framework's own documentation
conventions:

| Framework   | Retry mechanism                                                                                                                                                                                                                                     | Detection surface                                                                                                                                                                                                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TestNG      | First-class `retryAnalyzer` attribute on `@Test` (`@Test(retryAnalyzer = MyRetry.class)`), or a suite-level `<listeners>` entry implementing `IRetryAnalyzer`                                                                                       | `@Test(...retryAnalyzer\s*=...)` in `.java` test files, or an `IRetryAnalyzer`-implementing class referenced from `testng.xml`                                                                                                                                                                                                |
| JUnit (4/5) | No first-class retry API — requires a rerun-extension convention: JUnit 5's `@ExtendWith(RetryExtension.class)` (from a third-party lib like `junit-pioneer`'s `@RetryingTest`), or a custom `TestWatcher`/`RepeatedTest` combined with rerun logic | `@RetryingTest`, `@ExtendWith(...Retry...)`, or a Maven/Gradle-configured `maven-surefire-plugin`'s `rerunFailingTestsCount` in the build file (not the Java source at all — a real, distinct detection surface)                                                                                                              |
| NUnit       | First-class `[Retry(n)]` attribute                                                                                                                                                                                                                  | `\[Retry\(\d+\)\]` directly on a `[Test]` method                                                                                                                                                                                                                                                                              |
| xUnit       | No first-class retry attribute — requires a third-party package (`Xunit.Extensions.Ordering`'s `Retry` or, more commonly, `Polly`-wrapped test bodies, or a custom `[Theory]`-based retry wrapper)                                                  | A `.csproj`/`.fsproj` `PackageReference` for a known xUnit-retry package, cross-referenced with usage of that package's attribute in test source — this is the one row where "flagging retry masking" honestly requires DECLARED intent (the package reference), because there is no universal first-class syntax to grep for |

**Implication for Task 34's honesty posture:** the xUnit and JUnit rows
cannot reach the same confidence/false-positive-risk rating as the
NUnit/TestNG rows, because there is no first-class language/framework
feature to anchor detection on — only third-party convention. Both
should ship with `falsePositiveRisk: "medium"` at best, and the rule
metadata should say so explicitly rather than implying parity with the
NUnit/TestNG detection strength.

## .NET Playwright is async-only — one rule has no C# equivalent

Confirmed directly against the official .NET API reference during this
spike: every Playwright .NET method is `Async`-suffixed
(`GotoAsync`, `ClickAsync`, `WaitForLoadStateAsync` — there is no
synchronous `Goto`/`Click` variant in the public API at all). The
sync/async-mix rule (QA-PY-101 in Python, where mixing `sync_playwright`
and `async_playwright` APIs in the same file is a real, detectable
defect) has **no C# equivalent** and must be dropped for C#, not
forced into an always-false or trivially-true rule. This matches the
constraint already stated in the plan's own text before this spike
began — restated here as verified, not assumed.

## Remaining layers (Task 35) — porting notes

- **Blanket route mocking** (`page.route("**/*", ...)` /
  `page.route(new Regex(...), ...)` intercepting everything rather than
  a scoped pattern) ports cleanly across all four languages per the
  plan's own text — Java: `page.route("**/*", handler)`; C#:
  `page.RouteAsync("**/*", handler)`. Same detection shape as the
  existing TS/Python rule, only the method-call syntax differs.
- **Failure-artifact config** (screenshot/trace/video capture absent
  from CI config) is build-file/config-file territory
  (`pom.xml`/`build.gradle`/`.csproj` + a Playwright config equivalent),
  not source-code regex territory — needs its own discovery path per
  language, not a port of the existing TS rule's regex.
- **Single-browser matrix** and **absence-based a11y coverage**
  (`falsePositiveRisk: "high"`, severity `info`, matching QA-PW-145's
  honesty treatment per the plan's own instruction) are both
  config/absence-detection concerns, same shape as their TS/Python
  counterparts — port the detection logic, keep the same conservative
  severity/evidence framing.

## Tree-sitter WASM AST (Task 36) — verified grammar availability

`tree-sitter-java.wasm` and `tree-sitter-c_sharp.wasm` are both already
present in `node_modules/tree-sitter-wasms/out/` (package version
`^0.1.13`, already a direct dependency) — confirmed by listing the
installed package's `out/` directory during this spike, not assumed
from the package name alone. Both grammars are available today with
zero new dependency additions; the remaining work for Task 36 is
purely the `ts-ast.ts`-mirroring parse-or-fallback implementation, not
sourcing the grammars themselves.
