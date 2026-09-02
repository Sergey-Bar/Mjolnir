/**
 * QA-JV-103 — Test method without assertions.
 * Severity: error · Confidence: high · deterministic-defect
 * A JUnit/TestNG test that never asserts can only fail by throwing.
 *
 * Phase 3 L2 migration (Verification Trust Evolution Plan §13.1–§13.3):
 * test-method boundaries now come from the tree-sitter parse
 * (`javaTestMethods` — real `method_declaration` nodes whose
 * `modifiers` carry a `@Test` annotation), not a regex bracket-match.
 * The assertion oracle is structural where measurement proved value:
 * 1. Playwright's THROWING waits count as assertions — they throw on
 *    timeout, so the wait IS the verification. Boundary: every
 *    `waitFor*` member except `waitForTimeout` (which never verifies —
 *    it is QA-JV-105's own target). Evidence: the rev-1 corpus
 *    (waitForElementState, 6 FPs) and the rev-2 delta re-measurement
 *    (fresh FPs on locator.waitFor, page.waitForURL,
 *    locator.waitForFunction, page.waitForLoadState, waitForPopup,
 *    waitForClose — verification-only tests flagged assertion-less).
 * 2. Project assertion-helper calls (`verifyXxx`/`checkXxx`/
 *    `assertXxx` on any receiver) count as assertions — they encapsulate
 *    the assert; unresolved helpers are L2's honest boundary (4 of the
 *    10 rev-1 FPs; type/symbol resolution stays out of scope per §13.4).
 *    The dominant REMAINING consumer-code FP shape (keycloak delta
 *    sample: assertions behind arbitrarily-named helpers like
 *    `testValidationValid`) is the documented L3 boundary.
 * Regex fallback: mandatory (§13.2) — keeps the rev-1 oracle exactly,
 * used when no AST is available (fixture harness, grammar failure).
 *
 * Evidence: rev-1 measured 50% FP (n=20, playwright-java); the two FP
 * classes above account for all 10 FPs. Rev-2 re-measurement is the
 * EVIDENCE-BACKED proof (plan §06/§07): detectorRevision bumped, delta
 * re-measured, verdicts reconciled.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import {
  getTreeSitterTree,
  javaTestMethods,
  nodeLineCol,
  invocationsWithin,
  callName,
} from "../../engine/jv-cs-ast.js";
import type { SourceFileContext } from "../rule.js";
import { lineAt, colAt } from "../shared/positions.js";

/** Method names whose THROWN failure is the verification itself. */
function isThrowingWait(name: string): boolean {
  // A Playwright throwing wait IS the assertion: every waitFor* API
  // throws TimeoutException when its condition is not met. Evidence:
  // waitForElementState (rev-1 corpus, 6 FPs), waitFor / waitForURL /
  // waitForFunction (rev-2 delta), waitForLoadState / waitForPopup /
  // waitForClose (rev-2 delta, playwright-java slice). waitForTimeout
  // is the single deliberate exception — it never verifies anything
  // (it is QA-JV-105's own target).
  return name.startsWith("waitFor") && name !== "waitForTimeout";
}

/** Assertion-helper idiom: camelCase verify/check/assert-prefixed helpers. */
const HELPER_IDIOM_RE = /^(?:verify|check|assert)[A-Z]\w*$/;

/** Mockito's bare `verify(mock).x()` — matches the rev-1 `verify(` oracle. */
const BARE_CHECK_NAMES = new Set(["verify", "fail"]);

/** The rev-1 regex-oracle assertion vocabulary (fallback path). */
function fallbackHasCheck(body: string): boolean {
  return (
    /\bassert[A-Z]\w*\s*\(/.test(body) ||
    /\bfail\s*\(/.test(body) ||
    /\bverify\s*\(/.test(body)
  );
}

const WHY =
  "Without an assertion the test can only fail by crashing — it cannot detect behavioral regressions.";
const FIX =
  "Add an assertion on the expected outcome (`assertEquals`, `assertThat(locator).isVisible()`), or remove the test.";

function makeFinding(
  path: string,
  position: { line: number; column: number },
  name: string,
): Omit<Finding, "ruleId" | "category"> {
  return {
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file: path,
    line: position.line,
    column: position.column,
    message: `Test \`${name}\` contains no assertions.`,
    why: WHY,
    fix: FIX,
  };
}

/** L2 path (§13.2): undefined means "no AST — run the fallback". */
function jv103AstQuery(
  ctx: SourceFileContext,
): Omit<Finding, "ruleId" | "category">[] | undefined {
  const tree = getTreeSitterTree(ctx.ast);
  if (!tree) return undefined;
  const findings: Omit<Finding, "ruleId" | "category">[] = [];
  for (const test of javaTestMethods(tree)) {
    // Grammar-error guard: an ERROR node in the body means the parse
    // truncated — assertion calls can sit beyond the broken region.
    if (test.body.hasError) continue;
    let hasCheck = false;
    for (const call of invocationsWithin(test.body ?? test.decl)) {
      const name = callName(call) ?? "";
      if (
        /^assert[A-Z]/.test(name) || // JUnit/AssertJ/Hamcrest assert methods
        BARE_CHECK_NAMES.has(name) ||
        isThrowingWait(name) ||
        HELPER_IDIOM_RE.test(name)
      ) {
        hasCheck = true;
        break;
      }
    }
    if (!hasCheck) {
      findings.push(
        makeFinding(
          ctx.path,
          nodeLineCol(ctx.text, test.annotation.startIndex),
          test.name,
        ),
      );
    }
  }
  return findings;
}

export const jvNoAssertions = defineRule({
  id: "QA-JV-103",
  category: "QA-PW",
  title: "Test without assertions",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "AST",
  detectionNotes:
    "L2 tree-sitter test-method scoping + structural assertion oracle (throwing waits, helper idioms); regex fallback when no parse",
  introduced: "0.3.8",
  // Promoted quarantine → extended on the rev-2 delta re-measurement:
  // 50% FP (n=20) → 25.9% FP (n=58, same-slice + consumer corpora),
  // FP classes fixed at rev 2 (throwing waits, verify helpers). The
  // remaining FP class is helper-encapsulated assertions (keycloak
  // sample: testValidationValid/unsupportedEc) — statically undecidable
  // at L2, documented as the §13.4 boundary.
  tier: "extended",
  detectorRevision: 2,

  astQuery: jv103AstQuery,

  run(ctx) {
    if (!ctx.path.endsWith(".java")) return [];

    // §13.2: AST path decides when a tree exists; regex is the fallback.
    const astFindings = jv103AstQuery(ctx);
    if (astFindings !== undefined) return astFindings;

    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Find @Test methods and check their bodies for assertion calls.
    const annRe =
      /@Test\b[^{]*?\n\s*(?:public\s+|protected\s+)?void\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = annRe.exec(text)) !== null) {
      const bodyStart = m.index + m[0].length;
      const bodyEnd = matchBrace(text, bodyStart - 1);
      if (bodyEnd === -1) continue;
      const body = text.slice(bodyStart, bodyEnd);

      // Corpus-audit finding (Sprint 8 Task 37, against
      // microsoft/playwright-java): a generic `assert[A-Z]\w*\(` catches
      // any camelCase-suffixed assert method without hardcoding an
      // incomplete enumeration.
      const hasCheck = fallbackHasCheck(body);
      if (!hasCheck) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Test \`${m[1]}\` contains no assertions.`,
          why: WHY,
          fix: FIX,
        });
      }
    }
    return findings;
  },
});

function matchBrace(text: string, open: number): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"') inStr = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
