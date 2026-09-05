/**
 * `mjolnir explain <RULE-ID>` — implements Plan.md Sprint 1.3
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

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { getRule, RULES } from "../rules/index.js";
import type { QADoctorRule } from "../rules/rule.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { effectiveTier, isProvisional } from "../rules/measurement.js";
import { wrapText } from "../reporter/theme.js";
import { deriveEvidenceLevel, QA_IMPACT_LABELS } from "../types.js";
import type { Finding } from "../types.js";
import { parseWorkflow } from "../discovery/workflow-parser.js";
import { computeCodeText } from "../engine/code-text.js";
import { firstFixtureFile } from "./fixture-example.js";

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
  /**
   * `exampleFixturePath` relative to the fixtures root it was found under.
   *
   * The absolute path is ~117 columns of someone else's checkout, and
   * relativising it against `process.cwd()` at render time made the
   * output depend on where the process was started — the same transcript
   * printed differently from the repo root and from a test runner, which
   * broke both determinism and the README sample that quotes it.
   */
  exampleFixtureRelPath?: string;
}

/**
 * Runs the rule against its own must-fire fixture to get one real,
 * concrete example finding. `fixturesRoot` defaults to this repo's own
 * `tests/fixtures` — explain only has real examples to show when run
 * from (or pointed at) a Mjolnir checkout; degrades honestly
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
    // Normalize CRLF so `mjolnir explain` output matches the committed
    // docs/rules page regardless of the checkout's line-ending config.
    text = readFileSync(fixturePath, "utf8").replace(/\r\n/g, "\n");
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
    exampleFixtureRelPath: relative(fixturesRoot, fixturePath),
  };
}

/**
 * Default column budget when no width is supplied.
 *
 * `explain`'s prose used to be pushed as unbroken strings — the
 * "HOW TO VERIFY THE FIX" paragraph alone is 150 columns — so every
 * explanation overflowed a default terminal. Renderers here take a width
 * rather than reading process.stdout, so output stays a pure function of
 * its arguments (same rule the reporter's palette follows).
 */
const DEFAULT_EXPLAIN_WIDTH = 80;

export function renderExplain(
  result: ExplainResult,
  width: number = DEFAULT_EXPLAIN_WIDTH,
): string {
  if (!result.ok || !result.rule) {
    return `explain failed: ${result.error ?? "unknown error"}`;
  }
  const r = result.rule;
  const evidenceLevel =
    r.evidenceLevel ?? deriveEvidenceLevel(r.findingType, r.confidence);
  const lines: string[] = [];
  /** Pushes prose indented two columns, wrapped to the budget. */
  const pushBody = (text: string): void => {
    for (const seg of wrapText(text, Math.max(20, width - 2))) {
      lines.push(`  ${seg}`);
    }
  };

  lines.push(`▚▞ ${r.id} — ${r.title}`);
  lines.push("");
  lines.push(`Severity:    ${r.severity}`);
  lines.push(`Confidence:  ${r.confidence}`);
  lines.push(
    `Tier:        ${effectiveTier(r)}${isProvisional(r) ? " (PROVISIONAL)" : ""}`,
  );
  lines.push(`Evidence:    ${evidenceLevel}`);
  lines.push(`QA impact:   ${QA_IMPACT_LABELS[r.qaImpact]} (${r.qaImpact})`);
  const measured = MEASURED_FP[r.id];
  lines.push(
    measured
      ? `Measured FP: ${Math.round(measured.fpRate * 100)}% (${measured.n} hand-classified corpus verdicts)`
      : `Measured FP: not yet measured — this rule ships on assumption (see docs/FP-AUDIT.md)`,
  );
  if (r.falsePositiveRisk) {
    lines.push(`FP risk:     ${r.falsePositiveRisk} (author estimate)`);
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
    pushBody(f.message);
    lines.push("");
    lines.push("WHY IT MATTERS");
    pushBody(f.why);
    lines.push("");
    lines.push("HOW TO FIX");
    pushBody(f.fix);
    lines.push("");
    pushBody(
      `Example from this rule's own must-fire fixture: ${
        result.exampleFixtureRelPath ??
        result.exampleFixturePath ??
        "(unknown path)"
      }`,
    );
  } else {
    for (const seg of wrapText(
      "No example available — run this command from a mjolnir checkout " +
        "(or pass --fixtures-root) so the fixture that proves this rule " +
        "works can be shown as a real example.",
      width,
    )) {
      lines.push(seg);
    }
  }
  lines.push("");
  lines.push("HOW TO VERIFY THE FIX");
  pushBody(
    "Re-run `mjolnir` on the changed file(s) — this finding should " +
      "no longer appear. `mjolnir --scope changed` scopes the check " +
      "to just what you touched.",
  );
  lines.push("");
  lines.push(`Docs: mjolnir rules --md   (full catalog, this rule included)`);
  return lines.join("\n");
}

/** Every registered rule ID, for `--list` and error suggestions. */
export function allRuleIds(): string[] {
  return RULES.map((r) => r.id);
}
