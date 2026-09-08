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
import type { Finding, ScanResult } from "../types.js";
import { parseWorkflow } from "../discovery/workflow-parser.js";
import { computeCodeText } from "../engine/code-text.js";
import { firstFixtureFile } from "./fixture-example.js";
import { sectionHeader, plainContext } from "../reporter/ui.js";

const ui = plainContext();

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
    // Forward-slash-normalized, matching the convention every other
    // relative-path site in this codebase already follows (e.g. the
    // `normalizedPath` a few lines up, src/discovery/shared-walk.ts,
    // src/cli.ts). node:path's `relative()` returns OS-native
    // separators, so this printed `QA-CI-001\must-fire\masked.yml` on
    // Windows CI — different bytes than the committed README sample and
    // video script, both generated on Linux, and a real Windows-only CI
    // failure (readme-doctest.spec.ts, video-script.spec.ts).
    exampleFixtureRelPath: relative(fixturesRoot, fixturePath).replaceAll(
      "\\",
      "/",
    ),
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

  lines.push(sectionHeader(`${r.id} — ${r.title}`, ui));
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
  lines.push("WHAT WOULD CHANGE THE VERDICT");
  for (const c of whatWouldChangeTheVerdict(r)) {
    pushBody(`- ${c}`);
  }
  lines.push("");
  lines.push("NEXT ACTION");
  pushBody(
    "Fix the first occurrence, then re-run: `mjolnir --scope changed`. " +
      "Every occurrence of this rule is listed in the scan output.",
  );
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

/**
 * WHAT WOULD CHANGE THE VERDICT for a rule-level explanation (plan §26
 * WI-7, §8): the honest list of state changes that move this rule's
 * findings on the trust ladder or the census. Deterministic, derived
 * from the rule's own metadata — no invented promises.
 */
export function whatWouldChangeTheVerdict(r: QADoctorRule): string[] {
  const changes: string[] = [];
  changes.push(
    "a run report next to the scan target (mjolnir.report.json or test-results/) corroborating this file lifts its findings to L3–L5",
  );
  if (!MEASURED_FP[r.id]) {
    changes.push(
      "corpus measurement (n ≥ 10) would move this rule off PROVISIONAL and could change its tier",
    );
  }
  changes.push(
    "a documented suppression (mjolnir.config.json) lowers the finding count without claiming correctness",
  );
  if (effectiveTier(r) === "quarantine") {
    changes.push(
      "quarantine findings run only under --strict and are advisory (E0) — they can never gate CI",
    );
  }
  return changes;
}

// ---------------------------------------------------------------------------
// verdict mode (WI-7): explain a SAVED scan's overall verdict
// ---------------------------------------------------------------------------

export interface VerdictExplainResult {
  ok: boolean;
  error?: string;
  /** The parsed canonical scan result. */
  scan?: ScanResult;
}

/** Structural validation of the loaded JSON (hostile-input safe). */
function parseScanJson(raw: string): ScanResult | undefined {
  try {
    const j = JSON.parse(raw) as Partial<ScanResult>;
    if (j.schemaVersion !== 1 || !Array.isArray(j.findings)) return undefined;
    if (!j.analysisStatus || typeof j.partial !== "boolean") return undefined;
    return j as ScanResult;
  } catch {
    return undefined;
  }
}

export function explainVerdict(jsonPath: string): VerdictExplainResult {
  let raw: string;
  try {
    raw = readFileSync(jsonPath, "utf8");
  } catch {
    return { ok: false, error: `cannot read ${jsonPath}` };
  }
  const scan = parseScanJson(raw);
  if (!scan) {
    return {
      ok: false,
      error:
        "not a canonical mjolnir scan result (schemaVersion 1) — generate one with `mjolnir <target> --json`",
    };
  }
  return { ok: true, scan };
}

/**
 * EVIDENCE checklist for the verdict mode: every item is a fact from
 * the saved scan (✓ present / ⚠ absent) the user can independently
 * re-derive (plan §8).
 */
export function verdictEvidenceChecklist(scan: ScanResult): string[] {
  const items: string[] = [];
  items.push(
    scan.partial
      ? "⚠ scan was PARTIAL — some of the surface was never judged"
      : "✓ scan completed on the whole surface",
  );
  items.push(
    scan.frameworkDetectionUnknown
      ? "⚠ framework detection could not decide"
      : `✓ frameworks detected: ${scan.frameworks.join(", ") || "none"}`,
  );
  const corroborated = scan.findings.filter(
    (f) => f.runtimeCorroboration !== undefined,
  ).length;
  items.push(
    corroborated > 0
      ? `✓ runtime corroboration: ${corroborated} finding(s) matched a real run report`
      : "⚠ no runtime report — findings are static-only (trust caps at L2)",
  );
  const measuredFired = scan.findings.filter(
    (f) => MEASURED_FP[f.ruleId] !== undefined,
  ).length;
  items.push(
    `✓ measured rules: ${measuredFired} of ${scan.findings.length} finding(s) come from rules with a measured FP rate`,
  );
  return items;
}

/** CORRELATION summary for the verdict mode. */
export function verdictCorrelation(scan: ScanResult): string {
  const c = scan.findings.filter((f) => f.runtimeCorroboration !== undefined);
  const defect = c.filter((f) => f.runtimeCorroboration?.level === "defect");
  if (defect.length > 0) {
    return `${defect.length} finding(s) L5 — the run verdict corroborates the defect class.`;
  }
  if (c.length > 0) {
    return `${c.length} finding(s) corroborated at file/test level.`;
  }
  return "no runtime correlation — the ladder stays static (L0–L2).";
}

/** WHAT WOULD CHANGE THE VERDICT for a scan verdict. */
export function verdictWhatWouldChange(scan: ScanResult): string[] {
  const changes: string[] = [];
  if (scan.partial) {
    changes.push(
      "completing the scan (higher --max-duration, no skipped files) removes the confidence ceiling",
    );
  }
  changes.push(
    "running the tests and keeping the run report next to the scan target enables L3–L5 corroboration",
  );
  if (scan.frameworkDetectionUnknown) {
    changes.push(
      "committing a recognizable test-runner config unlocks framework-aware rules",
    );
  }
  changes.push(
    "fixing the top trust risks (mjolnir explain <RULE-ID>) moves the score and the verdict band",
  );
  return changes;
}

export function renderVerdictExplain(
  result: VerdictExplainResult,
  width: number = DEFAULT_EXPLAIN_WIDTH,
): string {
  if (!result.ok || !result.scan) {
    return `explain failed: ${result.error ?? "unknown error"}`;
  }
  const scan = result.scan;
  const s = scan.trustSummary;
  const lines: string[] = [];
  const pushBody = (text: string): void => {
    for (const seg of wrapText(text, Math.max(20, width - 2))) {
      lines.push(`  ${seg}`);
    }
  };

  lines.push(sectionHeader("SCAN VERDICT", ui));
  lines.push("");
  lines.push(
    `Score:       ${scan.score ?? "unknown"}${scan.reason === "no-tests-found" ? " (no tests found)" : ""}`,
  );
  lines.push(`Trust level: ${s?.level ?? "L0"}`);
  if (s) {
    lines.push(
      `Confidence:  ${pctOf(s.confidence)}${s.confidenceCeiling !== undefined ? ` (ceiling ${pctOf(s.confidenceCeiling)})` : ""}`,
    );
    lines.push(
      `Coverage:    ${pctOf(s.evidenceCoverage)} evidence-backed declarations`,
    );
    lines.push(`Inconclusive: ${pctOf(s.inconclusiveRate)}`);
  }
  lines.push("");
  lines.push("EVIDENCE");
  for (const item of verdictEvidenceChecklist(scan)) {
    pushBody(item);
  }
  lines.push("");
  lines.push("CORRELATION");
  pushBody(verdictCorrelation(scan));
  lines.push("");
  lines.push("WHY THIS VERDICT");
  if (s) {
    for (const r of s.ceilingReasons) {
      pushBody(`- confidence capped by: ${r}`);
    }
    if (s.provisionalRuleIds.length > 0) {
      pushBody(
        `- ${s.provisionalRuleIds.length} fired rule(s) are PROVISIONAL (unmeasured)`,
      );
    }
  }
  const errors = scan.findings.filter((f) => f.severity === "error").length;
  pushBody(
    errors > 0
      ? `${errors} error-severity finding(s) drive the exit code and the verdict band.`
      : "no error-severity findings — the gate stays green unless the scan was partial.",
  );
  lines.push("");
  lines.push("WHAT WOULD CHANGE THE VERDICT");
  for (const c of verdictWhatWouldChange(scan)) {
    pushBody(`- ${c}`);
  }
  lines.push("");
  lines.push("NEXT ACTION");
  pushBody(
    scan.partial
      ? "re-run with a higher --max-duration to close the truncated surface"
      : errors > 0
        ? "mjolnir triage <test-results-dir-or-report> — then fix the top trust risk"
        : "keep the gate green (mjolnir ci install)",
  );
  lines.push("");
  return lines.join("\n");
}

function pctOf(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** Every registered rule ID, for `--list` and error suggestions. */
export function allRuleIds(): string[] {
  return RULES.map((r) => r.id);
}
