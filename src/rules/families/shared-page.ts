/**
 * Shared-page family (Phase 6 — Tempering Plan).
 * Detects static/module-level Page/Browser instances shared across tests.
 */

import { definePatternFamily } from "../shared/family.js";

export const sharedPageFamily = definePatternFamily({
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  category: "QA-PW",
  title: "Browser state shared across tests",
  why: "A shared Page/Browser leaks cookies, localStorage, and navigation state between tests — failures become order-dependent and impossible to reproduce in isolation.",
  falsePositiveRisk: "medium",
  detectionStrategy: "LEXICAL",
  introduced: "0.4.0",
  useCodeText: true,
  variants: [
    {
      id: "QA-JV-104",
      appliesTo: "java",
      ext: ".java",
      languages: ["java"],
      frameworks: ["junit", "testng"],
      tier: "extended",
      patterns: [
        /^\s*(?:(?:private|public|protected)\s*)?static\s+(?:final\s+)?(?:Page|Browser|BrowserContext|Playwright)\b/gm,
      ],
      message: "Static `$0` — browser state shared across tests.",
      fix: "Create the Page per test (@BeforeEach) or use Playwright's JUnit extension `@InjectPage`.",
    },
    {
      id: "QA-CS-104",
      appliesTo: "csharp",
      ext: ".cs",
      languages: ["csharp"],
      frameworks: ["nunit", "xunit", "mstest", "playwright"],
      tier: "extended",
      patterns: [
        /^\s*(?:(?:public|private|protected|internal)\s*)?static\s+(?:readonly\s+)?IPage\b/gm,
      ],
      message: "`static IPage` — browser state shared across tests.",
      fix: "Create the page per test in setup, or use Playwright.NET's per-test fixtures.",
    },
    {
      id: "QA-PY-106",
      appliesTo: "python",
      ext: ".py",
      languages: ["python"],
      frameworks: ["pytest"],
      patterns: [/^(?:page|context|browser_context|browser)\s*=\s*(?!None)/gm],
      message: "Module-level `$0` — browser state shared across tests.",
      fix: "Take the injected `page` fixture parameter in each test instead of creating module-level state.",
    },
  ],
});
