/**
 * QA-CS-103 — Test method without assertions.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * Phase 3 L2 migration (Verification Trust Evolution Plan §13.1–§13.3):
 * test-method boundaries come from the tree-sitter parse
 * (`csharpTestMethods` — `method_declaration` nodes carrying a
 * `[Test]`/`[Fact]`/`[TestMethod]` attribute; the exact-name set
 * excludes [TestInitialize]/[TestCleanup] by construction, the
 * attribute-boundary defect the rev-1 regex had to patch by hand).
 * The assertion oracle is structural where measurement proved value:
 * 1. Shouldly chains count as assertions — `.ShouldBe(...)`,
 *    `.ShouldNotBe(...)`, `.ShouldBeOfType<T>(...)`: the rev-1 oracle
 *    (`Assert.\w+`, `Expect(`, `.Should(`, `Verify`) missed the whole
 *    Shouldly extension-method family, which was 17 of the 19 measured
 *    rev-1 FPs (spectre.console).
 * 2. Receiver-oracle for `Assert.x(...)` instead of member-name only —
 *    `Assert.That`, `Assert.ThrowsException`, `Assert.AreEqual` all
 *    verify through the Assert receiver regardless of member.
 * Regex fallback: mandatory (§13.2) — keeps the rev-1 oracle exactly,
 * used when no AST is available (fixture harness, grammar failure).
 *
 * Evidence: rev-1 measured 95% FP (n=20, playwright-dotnet +
 * spectre-console); the Shouldly class alone was 17 FPs. Rev-2
 * re-measurement is the EVIDENCE-BACKED proof (plan §06/§07):
 * detectorRevision bumped, delta re-measured, verdicts reconciled.
 *
 * Known L2 boundary (documented, honest): an assertion executed via a
 * helper method, LINQ-side collection check, or framework callback the
 * oracle does not model still fires (rev-1 FP row ConventionTests.cs:12).
 * Deep-diffing those requires symbol semantics Mjölnir deliberately does
 * not promise for C# (plan §13.4).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import {
  getTreeSitterTree,
  csharpTestMethods,
  nodeLineCol,
  invocationsWithin,
  callName,
  receiverText,
  type TsNode,
} from "../../engine/jv-cs-ast.js";
import type { SourceFileContext } from "../rule.js";
import { lineAt, colAt } from "../shared/positions.js";

const WHY =
  "Without an assertion the test can only fail by throwing — it cannot detect behavioral regressions.";
const FIX = "Add an assertion on the expected outcome, or remove the test.";

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

/**
 * True when a `throw new …Exception` object-creation whose type name
 * mentions "Assert" sits inside the test body — a conditional
 * `throw new AssertionException(...)` verifies its condition by failing
 * the test (the same throwing-is-verification principle as the waits;
 * rev-2 delta row ConventionTests.cs:12). The type-name match is L2
 * lexical, no resolution.
 */
function throwsAssertionException(node: TsNode): boolean {
  let current: TsNode | null = node.parent;
  while (current) {
    if (current.type === "method_declaration") return false;
    if (current.type === "throw_statement") {
      const expr = current.namedChildren.find(
        (c) => c?.type === "object_creation_expression",
      );
      const typeName = expr?.childForFieldName("type")?.text ?? "";
      if (/assert/i.test(typeName) && /exception/i.test(typeName)) return true;
    }
    current = current.parent;
  }
  return false;
}

/** Helper/verification idiom: verify/check/assert-prefixed names. */
import { isHelperIdiom } from "../../engine/jv-cs-ast.js";

/** L2 path (§13.2): undefined means "no AST — run the fallback". */
function cs103AstQuery(
  ctx: SourceFileContext,
): Omit<Finding, "ruleId" | "category">[] | undefined {
  const tree = getTreeSitterTree(ctx.ast);
  if (!tree) return undefined;
  const findings: Omit<Finding, "ruleId" | "category">[] = [];
  for (const test of csharpTestMethods(tree)) {
    // Grammar-error guard: tree-sitter is error-tolerant, but an ERROR
    // node inside the method body means the parse truncated — assertion
    // calls can sit beyond the broken region (real case: C# raw-string
    // literals in Humanizer's analyzer tests). A truncated body proves
    // nothing; flagging it would create false proof.
    if (test.body.hasError) continue;
    let hasCheck = false;
    for (const call of invocationsWithin(test.body ?? test.decl)) {
      const name = callName(call) ?? "";
      // Shouldly extension chains: .ShouldBe/.ShouldNotBe/.ShouldBeOfType/
      // .Should/.ShouldContain — the rev-1 `.Should(` regex's whole FP class.
      if (name === "Should" || /^Should[A-Z]/.test(name)) {
        hasCheck = true;
        break;
      }
      // MSTest/xUnit/NUnit Assert receiver: Assert.That / Assert.Throws...
      // (also matches the Shouldly static entry point: Should.NotThrow/.Throw).
      const recv = receiverText(call);
      if (recv !== undefined && /(?:^|\.)Assert(?:ionException)?$/.test(recv)) {
        hasCheck = true;
        break;
      }
      if (recv !== undefined && /(?:^|\.)Should$/.test(recv)) {
        hasCheck = true;
        break;
      }
      // Helper/verification idiom — case-aware so both the PascalCase
      // .NET world (Verify/VerifyAll/VerifyAnalyzerAsync/CheckState/
      // Assert.Throws) and camelCase helpers match, while English-word
      // false friends (checker, assertion, verified) do NOT: prefix +
      // uppercase boundary. Covers the Verify snapshot framework
      // (Verifier.Verify — found by the spectre-console delta) and the
      // Microsoft.CodeAnalysis testing verifier (found by Humanizer).
      if (isHelperIdiom(name)) {
        hasCheck = true;
        break;
      }
      // Playwright .NET Expect(...) — the verification entry point.
      if (name === "Expect") {
        hasCheck = true;
        break;
      }
      // Playwright .NET THROWING waits — they throw TimeoutException when
      // the condition is not met, so the wait IS the verification (the
      // PascalCase mirror of the Java oracle). Boundary: every
      // WaitFor*Async member except WaitForTimeoutAsync (never a
      // verification — QA-CS-105's own target). Evidence: rev-2 delta
      // rows on WaitForLoadStateAsync/WaitForResponseAsync-only tests.
      if (
        name.startsWith("WaitFor") &&
        name.endsWith("Async") &&
        name !== "WaitForTimeoutAsync"
      ) {
        hasCheck = true;
        break;
      }
      // Conditional assertion-exception throws — `if (bad) throw new
      // AssertionException(...)` verifies the condition by failing the
      // test (the same throwing-is-verification principle as the waits;
      // rev-2 delta row ConventionTests.cs:12). Type-name match is L2 —
      // no resolution needed.
      if (throwsAssertionException(call)) {
        hasCheck = true;
        break;
      }
    }
    if (!hasCheck) {
      findings.push(
        makeFinding(
          ctx.path,
          nodeLineCol(ctx.text, test.attribute.startIndex),
          test.name,
        ),
      );
    }
  }
  return findings;
}

export const csNoAssertions = defineRule({
  id: "QA-CS-103",
  category: "QA-PW",
  title: "Test without assertions",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "AST",
  detectionNotes:
    "L2 tree-sitter test-method scoping + structural assertion oracle (Shouldly/Verify/Assert receivers, throwing waits); regex fallback when no parse",
  introduced: "0.3.8",
  // Promoted quarantine → core on the rev-2 delta re-measurement:
  // 95% FP (n=20) → 0% FP (n=11 — the corpus surface collapsed from 310
  // spectre-console fires to 0; sample refilled from class-B/C corpora
  // per the fixture-corpus contract). FP classes fixed at rev 2:
  // Shouldly chains, Verify snapshot framework, Assert receivers,
  // PascalCase helper idiom, throwing waits, assertion-exception throws.
  // Remaining boundary: assertions behind arbitrarily-named helpers
  // (out of L2 scope per plan §13.4).
  tier: "core",
  detectorRevision: 2,

  astQuery: cs103AstQuery,

  run(ctx) {
    if (!ctx.path.endsWith(".cs")) return [];

    // §13.2: AST path decides when a tree exists; regex is the fallback.
    const astFindings = cs103AstQuery(ctx);
    if (astFindings !== undefined) return astFindings;

    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // [Test]/[Fact]/[TestMethod] methods without assertion calls.
    // Corpus-audit finding (Sprint 8 Task 37, against
    // microsoft/playwright-dotnet): the attribute regex requires the
    // attribute name to end exactly at `Test`/`Fact`/`TestMethod`
    // (only optional constructor arguments like
    // `[Test(Description = "...")]` may follow) — `[TestInitialize]`/
    // `[TestCleanup]` are NOT test methods.
    const attrRe =
      /\[(?:Test|Fact|TestMethod)(?:\([^)]*\))?\]\s*(?:public\s+)?(?:async\s+)?(?:Task|void)\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(text)) !== null) {
      const bodyStart = m.index + m[0].length;
      const bodyEnd = matchBrace(text, bodyStart - 1);
      if (bodyEnd === -1) continue;
      const body = text.slice(bodyStart, bodyEnd);

      const hasCheck =
        /Assert\.\w+\s*\(/.test(body) ||
        /Expect\(/.test(body) ||
        /\.Should\(/.test(body) ||
        /Verify(?:All)?\s*\(/.test(body);
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
