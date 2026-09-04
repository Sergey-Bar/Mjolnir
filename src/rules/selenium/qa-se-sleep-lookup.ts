/**
 * Selenium sleep-then-interact rules (Verification Trust Evolution Plan
 * §15.3 — "Selenium implicit-wait abuse / missing WebDriverWait",
 * cross-language via the JV/CS/Py adapters).
 *
 * The measured Selenium anti-pattern: a hard sleep (`Thread.sleep`/
 * `Thread.Sleep`/`Task.Delay`/`time.sleep`) immediately followed by an
 * element lookup — the sleep is standing in for an explicit wait
 * (`WebDriverWait` + `expected_conditions`). The lookup still races the
 * element's appearance; the sleep just shifts the race window. Fire on
 * the SLEEP call when a lookup/interaction call appears within the next
 * three lines — the sequence shape is deterministic.
 *
 * One shared sequence detector (`sleepBeforeLookup`) across the three
 * language variants: same vocabulary shape, per-language sleep and
 * lookup regexes cited below. Titles carry the language so the doctor's
 * duplicate-title check (same family) stays meaningful — the detection
 * regexes genuinely differ per binding.
 *
 * Trust Metadata: BORN QUARANTINE (plan §15.5) — provisional until the
 * first Selenium corpus measurement lands (§15 exit gate).
 *
 * Framework dimension (§15.1): every rule declares
 * `frameworks: ["selenium"]`; the adapters tag files from their own
 * import/using lines (org.openqa.selenium / Selenium.WebDriver /
 * import selenium → "selenium"), and untagged files stay analyzed
 * (open-when-unknown).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

const WHY =
  "The sleep is standing in for an explicit wait: the element lookup after it still races the app, so the test is both slow (always sleeps) and flaky (races when the app is slow to render).";
const FIX =
  "Replace the sleep with an explicit wait: Java `new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.visibilityOfElementLocated(...))`; C# `new WebDriverWait(driver, TimeSpan.FromSeconds(10)).Until(...)`; Python `WebDriverWait(driver, 10).until(EC.visibility_of_element_located(...))`.";

/** Look-ahead window in lines (sleep → lookup within 3 lines). */
const LOOKAHEAD_LINES = 3;

/**
 * Shared sequence detector: every sleep-call match whose following
 * LOOKAHEAD_LINES contain an element-lookup/interaction call fires at
 * the sleep's position. Runs on the code-only view (never on comments).
 */
function sleepBeforeLookup(
  ctx: { path: string; text: string; codeText?: string },
  sleepRe: RegExp,
  lookupRe: RegExp,
  id: string,
): Omit<Finding, "ruleId" | "category">[] {
  const text = ctx.codeText ?? ctx.text;
  const lines = text.split("\n");
  const findings: Omit<Finding, "ruleId" | "category">[] = [];
  const re = new RegExp(sleepRe.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const line = lineAt(text, m.index) - 1; // 0-based
    const window = lines.slice(line + 1, line + 1 + LOOKAHEAD_LINES).join("\n");
    if (!lookupRe.test(window)) continue;
    lookupRe.lastIndex = 0;
    findings.push({
      severity: "warning",
      confidence: "medium",
      findingType: "deterministic-defect",
      qaImpact: "FLAKY-RISK",
      file: ctx.path,
      line: line + 1,
      column: colAt(text, m.index),
      message: `Hard sleep before an element lookup (sleep at line ${line + 1}) — the explicit-wait substitute (${id}).`,
      why: WHY,
      fix: FIX,
    });
  }
  return findings;
}

// Java: Thread.sleep → findElement/findElements/click/sendKeys/clear.
const JAVA_SLEEP_RE = /\bThread\.sleep\s*\([^)]*\)/;
const JAVA_LOOKUP_RE =
  /\bdriver\.findElement|\.\s*sendKeys\s*\(|\.\s*click\s*\(|\.\s*clear\s*\(|findElement\s*\(/;

export const seJavaSleepLookup = defineRule({
  id: "QA-SE-001",
  category: "QA-PW",
  title: "Hard sleep before element lookup (Java, missing WebDriverWait)",
  severity: "warning",
  confidence: "medium",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["selenium"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes:
    "sequence shape: Thread.sleep followed by a findElement/interaction call within 3 lines (code-only view)",
  introduced: "0.6.0",
  tier: "quarantine",
  detectorRevision: 1,

  run(ctx) {
    if (!ctx.path.endsWith(".java")) return [];
    return sleepBeforeLookup(ctx, JAVA_SLEEP_RE, JAVA_LOOKUP_RE, "QA-SE-001");
  },
});

// C#: Thread.Sleep / Task.Delay → FindElement/FindElements/Click/SendKeys.
const CS_SLEEP_RE = /\b(?:Thread\.Sleep|Task\.Delay)\s*\([^)]*\)/;
const CS_LOOKUP_RE =
  /\bdriver\.FindElement|\.\s*SendKeys\s*\(|\.\s*Click\s*\(|\.\s*Clear\s*\(|FindElement\s*\(/;

export const seCSharpSleepLookup = defineRule({
  id: "QA-SE-002",
  category: "QA-PW",
  title: "Hard sleep before element lookup (C#, missing WebDriverWait)",
  severity: "warning",
  confidence: "medium",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["selenium"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes:
    "sequence shape: Thread.Sleep/Task.Delay followed by a FindElement/interaction call within 3 lines (code-only view)",
  introduced: "0.6.0",
  tier: "quarantine",
  detectorRevision: 1,

  run(ctx) {
    if (!ctx.path.endsWith(".cs")) return [];
    return sleepBeforeLookup(ctx, CS_SLEEP_RE, CS_LOOKUP_RE, "QA-SE-002");
  },
});

// Python: time.sleep → find_element/find_elements/send_keys/click.
const PY_SLEEP_RE = /\btime\.sleep\s*\([^)]*\)/;
const PY_LOOKUP_RE =
  /\bdriver\.find_element|\.find_element\s*\(|\.find_elements\s*\(|\.send_keys\s*\(|\.click\s*\(|\.clear\s*\(/;

export const sePythonSleepLookup = defineRule({
  id: "QA-SE-003",
  category: "QA-PW",
  title: "Hard sleep before element lookup (Python, missing WebDriverWait)",
  severity: "warning",
  confidence: "medium",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["selenium"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes:
    "sequence shape: time.sleep followed by a find_element/interaction call within 3 lines (code-only view)",
  introduced: "0.6.0",
  tier: "quarantine",
  detectorRevision: 1,

  run(ctx) {
    if (!ctx.path.endsWith(".py")) return [];
    return sleepBeforeLookup(ctx, PY_SLEEP_RE, PY_LOOKUP_RE, "QA-SE-003");
  },
});
