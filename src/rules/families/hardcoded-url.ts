/**
 * Hardcoded-URL family (Phase 6 — Tempering Plan).
 * Detects absolute URLs in navigation/request calls across languages.
 */

import { definePatternFamily } from "../shared/family.js";

export const hardcodedUrlFamily = definePatternFamily({
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  category: "QA-PW",
  title: "Hardcoded URL in test",
  why: "Absolute URLs break when environments change and can hit production by accident from a CI runner.",
  falsePositiveRisk: "low",
  detectionStrategy: "regex pattern",
  introduced: "0.4.0",
  useCodeText: false,
  variants: [
    {
      id: "QA-JV-108",
      appliesTo: "java",
      ext: ".java",
      languages: ["java"],
      frameworks: ["junit", "testng"],
      tier: "extended",
      patterns: [
        /\.navigate\s*\(\s*"https?:\/\/(?!localhost|127\.0\.0\.1)[^"]+"/g,
      ],
      message: "Hardcoded URL: `$0`.",
      fix: "Use a configured baseURL from the test runner, or an environment variable.",
    },
    {
      id: "QA-CS-108",
      appliesTo: "csharp",
      ext: ".cs",
      languages: ["csharp"],
      frameworks: ["nunit", "xunit", "mstest", "playwright"],
      tier: "extended",
      patterns: [
        /\.(?:GotoAsync|GetAsync|PostAsync)\s*\(\s*"https?:\/\/(?!localhost|127\.0\.0\.1)[^"]+"/g,
      ],
      message: "Hardcoded URL: `$0`.",
      fix: "Use a configured BaseURL from the test context, or an environment variable.",
    },
    {
      id: "QA-PY-108",
      appliesTo: "python",
      ext: ".py",
      languages: ["python"],
      frameworks: ["pytest"],
      patterns: [
        /(?:goto|request\.get|request\.post)\s*\(\s*["']https?:\/\/(?!localhost|127\.0\.0\.1)[^"']+["']/g,
      ],
      message: "Hardcoded URL: `$0`.",
      fix: "Use `--base-url` / `base_url` fixture, or `os.environ[...]`.",
    },
  ],
});
