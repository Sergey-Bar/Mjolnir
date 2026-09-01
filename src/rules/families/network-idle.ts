/**
 * Network-idle family (Phase 6 — Tempering Plan).
 * All three language variants of waitForLoadState(networkidle).
 */

import { definePatternFamily } from "../shared/family.js";

export const networkIdleFamily = definePatternFamily({
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  category: "QA-PW",
  title: "waitForLoadState(networkidle) used",
  why: "Analytics, websockets, and polling make network idle never fire or fire randomly — a documented source of Playwright flakes.",
  falsePositiveRisk: "low",
  detectionStrategy: "regex pattern",
  introduced: "0.4.0",
  useCodeText: false,
  variants: [
    {
      id: "QA-JV-107",
      appliesTo: "java",
      ext: ".java",
      languages: ["java"],
      frameworks: ["junit", "testng"],
      tier: "extended",
      patterns: [/\.waitForLoadState\s*\(\s*LoadState\.NETWORKIDLE\s*\)/g],
      message: "`waitForLoadState(LoadState.NETWORKIDLE)` used.",
      fix: 'Wait for a specific response: `page.waitForResponse(url -> url.contains("/api/"))`, or a locator condition.',
    },
    {
      id: "QA-CS-107",
      appliesTo: "csharp",
      ext: ".cs",
      languages: ["csharp"],
      frameworks: ["nunit", "xunit", "mstest", "playwright"],
      tier: "extended",
      patterns: [/\.WaitForLoadStateAsync\s*\(\s*LoadState\.NetworkIdle\s*\)/g],
      message: "`WaitForLoadStateAsync(LoadState.NetworkIdle)` used.",
      fix: "Wait for a specific response: `await page.WaitForResponseAsync(...)`, or a locator condition.",
    },
    {
      id: "QA-PY-107",
      appliesTo: "python",
      ext: ".py",
      languages: ["python"],
      frameworks: ["pytest"],
      patterns: [/wait_for_load_state\s*\(\s*["']networkidle["']\s*\)/g],
      message: "`wait_for_load_state('networkidle')` used.",
      fix: "Wait for a specific response: `with page.expect_response(...)`, or `expect(locator).to_be_visible()`.",
    },
  ],
});
