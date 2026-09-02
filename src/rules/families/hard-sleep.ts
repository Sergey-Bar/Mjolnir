/**
 * Hard-sleep family (Phase 6 — Tempering Plan).
 * Java: Thread.sleep(), C#: Thread.Sleep() / Task.Delay()
 */

import { definePatternFamily } from "../shared/family.js";

export const hardSleepFamily = definePatternFamily({
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  category: "QA-PW",
  title: "Hard sleep in test",
  why: "Fixed sleeps are flaky under load and slow everywhere; Playwright locators auto-wait for actionability.",
  falsePositiveRisk: "low",
  detectionStrategy: "LEXICAL",
  introduced: "0.3.8",
  tier: "extended",
  useCodeText: true,
  variants: [
    {
      id: "QA-JV-102",
      appliesTo: "java",
      ext: ".java",
      languages: ["java"],
      frameworks: ["junit", "testng"],
      patterns: [/\bThread\.sleep\s*\(/g],
      message: "`Thread.sleep()` used to wait for state.",
      fix: "Wait on a condition: `page.locator(...).waitFor()`, `assertThat(locator).isVisible()`.",
    },
    {
      id: "QA-CS-102",
      appliesTo: "csharp",
      ext: ".cs",
      languages: ["csharp"],
      frameworks: ["nunit", "xunit", "mstest", "playwright"],
      tier: "quarantine",
      patterns: [/\b(?:Thread\.Sleep|Task\.Delay)\s*\(/g],
      message: "`$0` used to wait for state.",
      fix: "Use `await Assertions.Expect(locator).ToBeVisibleAsync()` or locator.WaitForAsync().",
    },
  ],
});
