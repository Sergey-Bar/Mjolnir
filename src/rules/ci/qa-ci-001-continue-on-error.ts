/**
 * QA-CI-001 — `continue-on-error: true` masks a failing job.
 * Severity: error · Confidence: high · deterministic-defect
 * THE flagship finding: this job can fail every day and CI stays green.
 */

import { defineRule } from "../rule.js";
import { VERIFICATION_GATE_RE } from "./verification-gate.js";

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}
interface JobNode {
  name?: string;
  "continue-on-error"?: boolean | string;
  steps?: StepNode[];
}
interface StepNode {
  name?: string;
  run?: string;
  uses?: string;
  "continue-on-error"?: boolean | string;
}

function stepIsVerificationGate(step: StepNode): boolean {
  if (step.run && VERIFICATION_GATE_RE.test(step.run)) return true;
  // Composite actions that run a suite themselves. Anything that uploads,
  // reports, or comments is excluded — those are outputs, not gates.
  if (step.uses) {
    if (
      /upload|download|comment|github-script|cache|notify|slack/i.test(
        step.uses,
      )
    )
      return false;
    return /playwright|cypress|codecov\/codecov-action/i.test(step.uses);
  }
  return false;
}

export const continueOnError = defineRule({
  id: "QA-CI-001",
  category: "QA-CI",
  title: "continue-on-error masks a failing verification gate",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "FRAMEWORK",
  detectionNotes: "parsed YAML + test-command gate",
  introduced: "0.1.0",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "quarantine",
  detectorRevision: 2,
  run(ctx) {
    const findings: Omit<
      import("../../types.js").Finding,
      "ruleId" | "category"
    >[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc || typeof doc !== "object") return findings;

    const jobs = doc.jobs ?? {};
    for (const [jobName, job] of Object.entries(jobs)) {
      const steps = job?.steps ?? [];

      // Job-level continue-on-error masks EVERY step in the job, so it only
      // constitutes a false-green if at least one of those steps is a gate.
      if (job && job["continue-on-error"] === true) {
        if (steps.some(stepIsVerificationGate)) {
          findings.push({
            severity: "error",
            confidence: "high",
            findingType: "deterministic-defect",
            qaImpact: "FALSE-GREEN",
            file: ctx.path,
            line: findLine(
              ctx.text,
              // eslint-disable-next-line security/detect-non-literal-regexp -- escapeRe-quoted workflow value — no regex metacharacters survive
              new RegExp(`^\\s{2,6}${escapeRe(jobName)}:`, "m"),
            ),
            column: 1,
            message: `Job \`${jobName}\` runs a verification gate under \`continue-on-error: true\`.`,
            why: "This job can fail every day and CI will still show green. The checkmark on this workflow cannot be trusted.",
            fix: "Remove continue-on-error, or scope it to individual non-blocking steps only.",
          });
        }
      }

      for (const [i, step] of steps.entries()) {
        if (!step || step["continue-on-error"] !== true) continue;
        // Reporting and artifact steps under continue-on-error are ordinary
        // best-effort engineering (artifact upload, badge generation,
        // advisory reports) — their failure loses information, it does not
        // hide a failed check.
        if (!stepIsVerificationGate(step)) continue;
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: locateStepContinueOnError(ctx.text, step),
          column: 1,
          message: `Verification step ${describeStep(step, i)} in \`${jobName}\` has \`continue-on-error: true\`.`,
          why: "A failing gate will not fail the job — the workflow reports green while the check it was supposed to enforce did not pass.",
          fix: "Remove continue-on-error from the gate. If the check is genuinely unreliable, quarantine it explicitly instead of hiding the exit code.",
        });
      }
    }
    return findings;
  },
});

/** Human-readable step identifier for the message. */
function describeStep(step: StepNode, index: number): string {
  if (step.name) return `\`${step.name}\``;
  if (step.run) return `\`${step.run.split("\n")[0]?.slice(0, 40)}\``;
  return `#${index + 1}`;
}

/**
 * Line of the `continue-on-error:` key belonging to THIS step.
 *
 * The parsed YAML carries no source positions, so anchor on the step's own
 * name/run/uses text and take the next `continue-on-error:` at or after it.
 * The previous implementation matched the first occurrence in the whole file,
 * which reported every step-level finding on the same line.
 *
 * Audit S5: the raw-literal match after the anchor is now null-checked —
 * a `continue-on-error: true` whose textual form was already consumed by
 * an EARLIER step's search window (or reformatted across lines) made
 * `re.exec()` return null and the non-null assertion threw a TypeError,
 * crashing the rule into crash-isolation: the finding was silently
 * DROPPED. The fix: widen the backward window to the enclosing list item
 * (the step block's `- ` marker), and when no raw literal follows the
 * anchor, fall back to the anchor's own line — an approximate line on a
 * reported finding beats a dropped finding.
 */
function locateStepContinueOnError(text: string, step: StepNode): number {
  // Called only for gate steps (run or uses — see stepIsVerificationGate),
  // so the anchor is always defined.
  const anchor = (step.name ?? step.uses ?? step.run?.split("\n")[0]) as string;
  const trimmed = anchor.trim();
  let anchorAt = -1;
  if (trimmed !== "") anchorAt = text.indexOf(trimmed);
  // Audit S5: the search window starts at THIS step's enclosing list
  // item — the LAST `- ` marker (any indentation) before the anchor —
  // so a preceding step's `continue-on-error:` can never be matched.
  // A step's key may also be listed BEFORE its run/uses line (mapping
  // keys are unordered in YAML), which the window now covers.
  let searchFrom = 0;
  if (anchorAt !== -1) {
    const windowStart = Math.max(0, anchorAt - 200);
    const itemRe = /\n[ \t]*- /g;
    const before = text.slice(0, anchorAt);
    let blockStart = -1;
    let mm: RegExpExecArray | null;
    while ((mm = itemRe.exec(before)) !== null) {
      blockStart = mm.index;
    }
    searchFrom = blockStart > windowStart ? blockStart : windowStart;
  }
  const re = /continue-on-error:\s*true/g;
  re.lastIndex = searchFrom;
  const m = re.exec(text);
  if (m) return lineOf(text, m.index);
  // Audit S5 fallback: no raw literal after the anchor — report on the
  // anchor's own line instead of crashing and dropping the finding.
  if (anchorAt !== -1) return lineOf(text, anchorAt);
  const jobLevel = /continue-on-error:\s*true/.exec(text);
  return jobLevel ? lineOf(text, jobLevel.index) : 1;
}

function findLine(text: string, re: RegExp): number {
  const m = re.exec(text);
  if (!m) return 1;
  return lineOf(text, m.index);
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
