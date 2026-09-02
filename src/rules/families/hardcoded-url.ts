/**
 * Hardcoded-URL family (Phase 6 — Tempering Plan).
 * Detects absolute URLs in navigation/request calls across languages.
 *
 * Bug Map M-06 narrowing decision: NO pattern narrowing. The measured
 * FPs are HAR-replay targets (`no.playwright`), proxy targets
 * (`non-existent.com`), and real deployed-app URLs — none are
 * fake-TLD/`example.com` shapes, so a `.test`/`example.com` lookahead
 * would fix zero measured FPs and encode an unproven claim in
 * must-not-fire fixtures.
 *
 * Phase 2 quarantine-cluster triage: the JV/CS variants (QA-JV-108,
 * QA-CS-108) are RETIRED (docs/RULE-LIFECYCLE.md) — measured 100% FP
 * (n=20 each, docs/FP-AUDIT.md), zero TPs, FP causes scattered across
 * HAR replay, route mocks, and proxy-failure tests with no mechanically
 * discriminable shape. They downgrade to info/falsePositiveRisk high;
 * code + fixtures stay, the frozen IDs are never reused. The Python
 * variant (QA-PY-108) is unmeasured (n=4) and keeps the family's
 * warning severity until it gets its own triage evidence.
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
  detectionStrategy: "LEXICAL",
  introduced: "0.4.0",
  useCodeText: false,
  variants: [
    {
      id: "QA-JV-108",
      appliesTo: "java",
      ext: ".java",
      languages: ["java"],
      frameworks: ["junit", "testng"],
      tier: "quarantine",
      // RETIRED (docs/RULE-LIFECYCLE.md — Phase 2 quarantine-cluster
      // triage): measured 100% FP (n=20) with zero TPs; see the header.
      severity: "info",
      falsePositiveRisk: "high",
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
      tier: "quarantine",
      // RETIRED (docs/RULE-LIFECYCLE.md — Phase 2 quarantine-cluster
      // triage): measured 100% FP (n=20) with zero TPs; see the header.
      severity: "info",
      falsePositiveRisk: "high",
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
      // Bug Map M-06: measured 100% FP (n=20, docs/FP-AUDIT.md) yet the
      // missing tier defaulted it to core — it shipped in the default
      // report while every finding was a false positive (a live
      // north-star violation doctor could not see: it only counts
      // UNMEASURED core rules).
      tier: "quarantine",
      patterns: [
        /(?:goto|request\.get|request\.post)\s*\(\s*["']https?:\/\/(?!localhost|127\.0\.0\.1)[^"']+["']/g,
      ],
      message: "Hardcoded URL: `$0`.",
      fix: "Use `--base-url` / `base_url` fixture, or `os.environ[...]`.",
    },
  ],
});
