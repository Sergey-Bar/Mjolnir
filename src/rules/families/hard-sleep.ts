/**
 * Hard-sleep family (Phase 6 — Tempering Plan).
 * Java: Thread.sleep(), C#: Thread.Sleep() / Task.Delay()
 *
 * QA-CS-102 Phase 3 L2 migration (Verification Trust Evolution Plan
 * §13.1–§13.3): tree-sitter invocation scoping excludes the measured
 * structural FP classes from the rev-1 corpus (playwright-dotnet,
 * 65% FP at n=20) plus the rev-2 delta re-measurement:
 * 1. Route/intercept delegates — a delay inside the lambda passed to
 *    `*.RouteAsync`/`Route`/`RouteFromHARAsync`/`SetRoute` simulates the
 *    SERVER side of the interaction, it is not the test waiting on state
 *    (10 of the 13 rev-1 FPs; SetRoute added from the delta).
 * 2. Exposed-function delegates — `ExposeFunctionAsync`/`ExposeBinding*`
 *    bodies ARE the function under test (PageExposeFunctionTests FP).
 * 3. Deliberate infinite/negative blocks — `Task.Delay(-1)`,
 *    `Task.Delay(int.MaxValue)`, `Timeout.Infinite*` model a hung
 *    server, never a state wait (5 FPs).
 * 4. Timeout races — `Task.Delay(n)` as the `Task.WhenAny` co-racer is
 *    a deadline, not a sleep (BrowserContextHarTests FP).
 * 5. Runner-API payload fixtures — `RunAndWaitFor{Request,
 *    RequestFinished,Response}Async(() => Task.Delay(100).ContinueWith(
 *    throw))`: the delay constructs the payload the API under test
 *    awaits (delta FP rows), not the test sleeping beside it.
 *    RunAndWaitForNavigationAsync delegates are deliberately NOT
 *    excluded (their delay is the test's own action — TP).
 * Known honest trade-off (documented): one rev-1 TP row
 * (BrowserContextRouteTests:243 — a sub-second artificial-timing delay
 * inside a route delegate) is no longer flagged under class 1; the
 * structural boundary cannot read that intent. Recorded in the verdict
 * reconciliation. Test-body shapes that remain flagged (Screencast
 * capture-window sleeps, UnrouteBehavior timing assertions,
 * PageWaitForNavigation artificial delays) are TP at rev 2.
 * Java (QA-JV-102) stays LEXICAL rev 1 — no migration for symmetry
 * (plan §12.4); the corpus shows Thread.sleep FPs are helper-body
 * shapes a structural oracle does not yet address with evidence.
 */

import { definePatternFamily } from "../shared/family.js";
import type { SourceFileContext } from "../rule.js";
import type { Finding } from "../../types.js";
import {
  getTreeSitterTree,
  invocationsWithin,
  callName,
  receiverText,
  nodeLineCol,
  firstAncestorCallNamed,
  type TsNode,
} from "../../engine/jv-cs-ast.js";

/** APIs whose delegate arguments simulate the environment, not the test. */
export const ENVIRONMENT_DELEGATE_APIS = new Set([
  "Route",
  "RouteAsync",
  "RouteFromHAR",
  "RouteFromHARAsync",
  "ExposeFunction",
  "ExposeFunctionAsync",
  "ExposeBinding",
  "ExposeBindingAsync",
  "OnMessage", // WebSocket/page message handlers: server-side shape
  // Test-server route registration (playwright-dotnet's Server.SetRoute):
  // the delegate IS the simulated server endpoint — same evidenced class
  // as RouteAsync (5 rev-1 FP rows across 4 test files).
  "SetRoute",
  "SetRouteHandler",
  // Runner-API payload fixtures (delta class 5, exactly the evidenced
  // three): `RunAndWaitFor{Request,RequestFinished,Response}Async(
  // () => Task.Delay(100).ContinueWith(throw))` — the delay constructs
  // the payload the API under test awaits, it is not the test sleeping.
  // RunAndWaitForNavigationAsync is NOT a member: its delegate is the
  // test's own action flow, where a delay is a flagged hard sleep
  // (PageWaitForNavigationTests TP rows).
  "RunAndWaitForRequestAsync",
  "RunAndWaitForRequestFinishedAsync",
  "RunAndWaitForResponseAsync",
]);

/** Argument texts that are deliberate infinite blocks. */
const INFINITE_NAMED_RE =
  /^(?:int\.MaxValue|Timeout\.Infinite(?:TimeSpan)?|System\.Threading\.Timeout\.Infinite(?:TimeSpan)?)$/;

function isInfiniteDelayArgument(arg: string): boolean {
  // Negative literal or negated expression (`-1`, `-(x)`): the unary
  // minus cannot start a wait-for-state duration.
  if (arg.startsWith("-")) return true;
  if (arg.includes("int.MinValue")) return true; // incl. unchecked(...) form
  return INFINITE_NAMED_RE.test(arg);
}

const WHY =
  "Fixed sleeps are flaky under load and slow everywhere; Playwright locators auto-wait for actionability.";

function firstArgText(call: TsNode): string | undefined {
  const args = call.childForFieldName("arguments") ?? call.namedChildren.at(-1);
  return args?.namedChildren[0]?.text;
}

/** L2 path for QA-CS-102 (§13.2): undefined means "no AST — fallback". */
function cs102AstQuery(
  ctx: SourceFileContext,
): Omit<Finding, "ruleId" | "category">[] | undefined {
  const tree = getTreeSitterTree(ctx.ast);
  if (!tree) return undefined;
  const findings: Omit<Finding, "ruleId" | "category">[] = [];
  for (const call of invocationsWithin(tree.rootNode)) {
    const name = callName(call) ?? "";
    if (name !== "Sleep" && name !== "Delay") continue;
    const receiver = receiverText(call);
    // Thread.Sleep / Task.Delay only (receiver-qualified, either grammar).
    if (receiver !== "Thread" && receiver !== "Task") continue;
    // Class 3: deliberate infinite/negative blocks.
    if (isInfiniteDelayArgument(firstArgText(call) ?? "")) continue;
    // Classes 1+2: inside a delegate argument of an environment API.
    if (withinEnvironmentDelegate(call)) continue;
    // Class 4: Task.WhenAny timeout-race co-racer.
    if (firstAncestorCallNamed(call, "WhenAny")) continue;
    findings.push({
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FLAKY-RISK",
      file: ctx.path,
      ...nodeLineCol(ctx.text, call.startIndex),
      message: `\`${receiver}.${name}\` used to wait for state.`,
      why: WHY,
      fix: "Use `await Assertions.Expect(locator).ToBeVisibleAsync()` or locator.WaitForAsync().",
    } satisfies Omit<Finding, "ruleId" | "category">);
  }
  return findings;
}

function withinEnvironmentDelegate(call: TsNode): boolean {
  let current: TsNode | null = call.parent;
  while (current) {
    if (current.type === "method_declaration") return false;
    if (current.type === "invocation_expression") {
      const name = callName(current) ?? "";
      if (ENVIRONMENT_DELEGATE_APIS.has(name)) return true;
    }
    current = current.parent;
  }
  return false;
}

export const hardSleepFamily = definePatternFamily({
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  category: "QA-PW",
  title: "Hard sleep in test",
  why: WHY,
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
      // Promoted quarantine → core on the rev-2 delta re-measurement:
      // 65% FP (n=20) → 8.3% FP (n=24, dotnet slice + class-B/C corpora),
      // FP classes fixed at rev 2 (server delegates, infinite blocks,
      // WhenAny races, runner payload fixtures). Residues documented:
      // Task.Delay(1) yield + polling-cadence helper (2 rows).
      tier: "core",
      detectionStrategy: "AST",
      detectionNotes:
        "L2 tree-sitter invocation scoping (route/expose/server delegates, infinite blocks, WhenAny races, runner payload fixtures); regex fallback when no parse",
      detectorRevision: 2,
      astQuery: cs102AstQuery,
      patterns: [/\b(?:Thread\.Sleep|Task\.Delay)\s*\(/g],
      message: "`$0` used to wait for state.",
      fix: "Use `await Assertions.Expect(locator).ToBeVisibleAsync()` or locator.WaitForAsync().",
    },
  ],
});
