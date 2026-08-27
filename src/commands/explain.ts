/**
 * `qa-doctor explain <RULE-ID>` — implements Plan.md Sprint 1.3
 * (Master-Stabilization-Plan Sprint 5, Task 19).
 *
 * For any registered rule, renders what is wrong, why it matters, the
 * evidence level and confidence behind the verdict, the prescription,
 * and how to verify the fix. This is a presentation layer only — no new
 * detection logic. Every field it prints already exists on RuleMeta or
 * comes from actually running the rule against its own committed
 * must-fire fixture, so the example shown is real detector output, not
 * hand-written prose that can drift from what the rule actually does.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getRule, RULES } from "../rules/index.js";
import type { QADoctorRule } from "../rules/rule.js";
import { deriveEvidenceLevel, QA_IMPACT_LABELS } from "../types.js";
import type { Finding } from "../types.js";
import { parseWorkflow } from "../discovery/workflow-parser.js";
import { computeCodeText } from "../engine/code-text.js";

export interface ExplainResult {
  ok: boolean;
  error?: string;
  rule?: QADoctorRule;
  /** A real finding produced by running the rule against its own
   * committed must-fire fixture — not hand-written, so it can't drift
   * from actual behavior. Absent only if the fixture is missing or
   * produces no findings (a fixture-firewall violation the doctor
   * command already catches separately). */
  exampleFinding?: Omit<Finding, "ruleId" | "category">;
  exampleFixturePath?: string;
}

function firstFixtureFile(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir).filter((f) => !f.startsWith("."));
  return entries.length > 0 ? join(dir, entries[0] as string) : null;
}

/**
 * Runs the rule against its own must-fire fixture to get one real,
 * concrete example finding. `fixturesRoot` defaults to this repo's own
 * `tests/fixtures` — explain only has real examples to show when run
 * from (or pointed at) a qa-doctor checkout; degrades honestly
 * (exampleFinding left undefined) otherwise, same as `doctor`.
 */
export function explainRule(
  ruleId: string,
  fixturesRoot: string,
): ExplainResult {
  const rule = getRule(ruleId);
  if (!rule) {
    return {
      ok: false,
      error: `Unknown rule ID "${ruleId}". Run \`mjolnir rules\` for the full catalog.`,
    };
  }

  const fixturePath = firstFixtureFile(join(fixturesRoot, ruleId, "must-fire"));
  if (!fixturePath) {
    return { ok: true, rule };
  }

  let text: string;
  try {
    text = readFileSync(fixturePath, "utf8");
  } catch {
    return { ok: true, rule };
  }

  // Rules always receive repo-relative, forward-slash-normalized paths
  // from the real engine (src/rules/rule.ts's SourceFileContext doc
  // comment) — several filename-gated rules (e.g. QA-PW-121 matching
  // "playwright.config.ts") rely on that and would otherwise never
  // fire when given a raw OS path with backslashes on Windows.
  const normalizedPath = fixturePath.replaceAll("\\", "/");

  // CI-workflow rules read a parsed YAML AST from ctx.ast, exactly as
  // githubActionsAdapter.runRules provides it (never raw ctx.text) —
  // without this, every QA-CI-* rule silently no-ops on its own fixture.
  let ast: unknown;
  if (rule.appliesTo === "ci-workflows") {
    try {
      ast = parseWorkflow(text);
    } catch {
      return { ok: true, rule };
    }
  }

  let findings: Array<Omit<Finding, "ruleId" | "category">>;
  try {
    // Supply codeText for parity with the scan pipeline — rules that use it
    // as a mask oracle abstain without it (see rule-docs.ts).
    const parsed = { path: normalizedPath, text, ast };
    const codeText = computeCodeText(
      parsed,
      normalizedPath.endsWith(".py")
        ? "python"
        : normalizedPath.endsWith(".java")
          ? "java"
          : normalizedPath.endsWith(".cs")
            ? "csharp"
            : "typescript",
    );
    findings = rule.run({ ...parsed, codeText });
  } catch {
    return { ok: true, rule };
  }

  const example = findings[0];
  if (!example) return { ok: true, rule };

  return {
    ok: true,
    rule,
    exampleFinding: example,
    exampleFixturePath: fixturePath,
  };
}

export function renderExplain(result: ExplainResult): string {
  if (!result.ok || !result.rule) {
    return `explain failed: ${result.error ?? "unknown error"}`;
  }
  const r = result.rule;
  const evidenceLevel =
    r.evidenceLevel ?? deriveEvidenceLevel(r.findingType, r.confidence);
  const lines: string[] = [];

  lines.push(`▚▞ ${r.id} — ${r.title}`);
  lines.push("");
  lines.push(`Severity:    ${r.severity}`);
  lines.push(`Confidence:  ${r.confidence}`);
  lines.push(`Evidence:    ${evidenceLevel}`);
  lines.push(`QA impact:   ${QA_IMPACT_LABELS[r.qaImpact]} (${r.qaImpact})`);
  if (r.falsePositiveRisk) {
    lines.push(`FP risk:     ${r.falsePositiveRisk}`);
  }
  if (r.languages?.length) {
    lines.push(`Languages:   ${r.languages.join(", ")}`);
  }
  if (r.frameworks?.length) {
    lines.push(`Frameworks:  ${r.frameworks.join(", ")}`);
  }
  lines.push("");

  if (result.exampleFinding) {
    const f = result.exampleFinding;
    lines.push("WHAT WAS FOUND (real detector output, not a mockup)");
    lines.push(`  ${f.message}`);
    lines.push("");
    lines.push("WHY IT MATTERS");
    lines.push(`  ${f.why}`);
    lines.push("");
    lines.push("HOW TO FIX");
    lines.push(`  ${f.fix}`);
    lines.push("");
    lines.push(
      `Example from this rule's own must-fire fixture: ${result.exampleFixturePath ?? "(unknown path)"}`,
    );
  } else {
    lines.push(
      "No example available — run this command from a mjolnir checkout " +
        "(or pass --fixtures-root) so the fixture that proves this rule " +
        "works can be shown as a real example.",
    );
  }
  lines.push("");
  lines.push("HOW TO VERIFY THE FIX");
  lines.push(
    "  Re-run `mjolnir` on the changed file(s) — this finding should " +
      "no longer appear. `mjolnir --scope changed` scopes the check " +
      "to just what you touched.",
  );
  lines.push("");
  lines.push(`Docs: qa-doctor rules --md   (full catalog, this rule included)`);
  return lines.join("\n");
}

/** Every registered rule ID, for `--list` and error suggestions. */
export function allRuleIds(): string[] {
  return RULES.map((r) => r.id);
}
