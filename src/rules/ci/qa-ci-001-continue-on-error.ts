/**
 * QA-CI-001 — `continue-on-error: true` masks a failing job.
 * Severity: error · Confidence: high · deterministic-defect
 * THE flagship finding: this job can fail every day and CI stays green.
 */

import { defineRule } from "../rule.js";

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

/**
 * Commands that constitute a VERIFICATION GATE. `continue-on-error` on one of
 * these is the false-green this rule exists to catch: the gate can fail and
 * the workflow still reports success.
 *
 * The inverse — reporting and artifact steps (upload-artifact, badge
 * generation, PR comments, advisory diffs) — legitimately use
 * continue-on-error: their failure loses information, it does not hide a
 * failed check. Flagging those was a false positive found by self-scan.
 *
 * This is an allowlist on purpose. A missed detection is a quiet gap; a false
 * positive on the flagship rule is a credibility loss on the one claim the
 * product is built to make.
 */
const VERIFICATION_RE = new RegExp(
  [
    // ── Test runners ────────────────────────────────────────────────
    String.raw`\b(?:npm|yarn|pnpm|bun)\s+(?:run\s+)?(?:test|t)\b`,
    String.raw`\bnpx\s+(?:vitest|jest|mocha|ava|playwright\s+test)\b`,
    String.raw`\b(?:vitest|jest|mocha|ava|tap)\b`,
    String.raw`\bplaywright\s+test\b`,
    String.raw`\b(?:pytest|tox|nox)\b`,
    String.raw`\bpython\s+-m\s+(?:pytest|unittest)\b`,
    String.raw`\bmvn\b[^\n]*\b(?:test|verify)\b`,
    String.raw`\b(?:\./)?gradlew?\b[^\n]*\btest\b`,
    String.raw`\bdotnet\s+test\b`,
    String.raw`\bgo\s+test\b`,
    String.raw`\bcargo\s+test\b`,
    String.raw`\b(?:rspec|phpunit)\b`,
    String.raw`\brake\s+test\b`,
    // ── Other gates whose failure must not be hidden ────────────────
    String.raw`\b(?:npm|yarn|pnpm)\s+audit\b`,
    String.raw`\b(?:npm|yarn|pnpm)\s+run\s+(?:lint|typecheck|build)\b`,
    String.raw`\b(?:eslint|prettier\s+--check|tsc\b[^\n]*--noEmit)\b`,
    String.raw`\b(?:ruff|flake8|mypy|black\s+--check)\b`,
  ].join("|"),
);

function stepIsVerificationGate(step: StepNode): boolean {
  if (step.run && VERIFICATION_RE.test(step.run)) return true;
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
  detectionStrategy: "parsed YAML + test-command gate",
  introduced: "0.1.0",

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
 */
function locateStepContinueOnError(text: string, step: StepNode): number {
  const anchor = step.name ?? step.uses ?? step.run?.split("\n")[0];
  let searchFrom = 0;
  if (anchor) {
    const at = text.indexOf(anchor.trim());
    if (at !== -1) {
      // `continue-on-error` may sit either just before or just after the
      // anchor key within the same step block; search backwards a little.
      const blockStart = text.lastIndexOf("\n- ", at);
      searchFrom = blockStart === -1 ? Math.max(0, at - 200) : blockStart;
    }
  }
  const re = /continue-on-error:\s*true/g;
  re.lastIndex = searchFrom;
  const m = re.exec(text);
  if (!m) return findLine(text, /continue-on-error:/m);
  return lineOf(text, m.index);
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
