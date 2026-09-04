/**
 * QA-PW-102 — waitForEvent('load') / waitForLoadState('load') instead of
 * web-first assertions.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwWaitForLoadEvent = defineRule({
  id: "QA-PW-102",
  category: "QA-PW",
  title: "Load-event wait instead of web-first assertion",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",
  // Measured FP 100% (n=20, docs/FP-AUDIT.md 2026-08-31): real-world uses
  // pre-register the load promise around an edit as reload synchronization,
  // with assertions after. North-star law: >30% FP cannot ship by default.
  tier: "quarantine",
  // Phase 2 retune (EVIDENCE-BACKED, detectorRevision 2 — §07): every
  // measured FP shares ONE root cause — the wait is load synchronization
  // before real assertions, or the awaited promise is consumed by
  // expect(...).rejects (absence of reload IS the assertion). Fire only
  // when the load wait is the terminal wait in its test body (no
  // expect/assert/expect.poll after it) or is followed only by more
  // waits — the "instead of an assertion" premise, now actually checked.
  detectorRevision: 2,

  run(ctx) {
    // Raw text on purpose: the signal is the string argument `'load'`, which
    // `codeText` would blank to spaces. (Same reason the network-idle family
    // sets `useCodeText: false`.)
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const re =
      /waitForEvent\s*\(\s*['"]load['"]|waitForLoadState\s*\(\s*['"]load['"]/g;
    // Verification markers: any assertion-style consumption AFTER the wait
    // means the wait is synchronization, not a substitute for asserting.
    const verifyRe =
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
      /\b(?:await\s+)?expect\s*\(|\bassert\b|\bexpect\.poll\b|\btoHave[A-Z]|\btoBe[A-Z]/;
    // Promise-consumption marker: `expect(<wait chain>).rejects` — the
    // awaited wait's REJECTION is the assertion (no-reload check).
    const rejectsRe = /expect\s*\([^;{}]*\)\s*\.\s*rejects/;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const rest = text.slice(m.index + m[0].length);
      // Fire only when nothing verification-shaped follows the wait in the
      // rest of the file (i.e., the wait is the terminal wait). A wait
      // followed by assertions is reload synchronization — the dominant
      // measured-legitimate shape (20/20 FPs, docs/FP-AUDIT.md).
      if (verifyRe.test(rest)) continue;
      // `await expect(page.waitForLoadState('load')).rejects` asserts the
      // ABSENCE of a reload — the wait is the assertion itself.
      if (
        rejectsRe.test(
          text.slice(Math.max(0, m.index - 120), m.index + m[0].length + 200),
        )
      ) {
        continue;
      }
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `\`${m[0]}\` instead of a web-first assertion.`,
        why: "'load' fires when the page loads, not when YOUR element is ready — the test can still race the app and fail intermittently.",
        fix: "Assert on the element you actually care about: `await expect(page.getByRole('heading')).toBeVisible()`.",
      });
    }
    return findings;
  },
});
