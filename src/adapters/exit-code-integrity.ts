/**
 * Exit-Code Integrity Analysis (CI-009).
 *
 * Detects patterns in CI workflow configurations that suppress
 * or mask exit codes, allowing real failures to appear as green
 * pipeline results.
 */

export interface ExitCodeViolation {
  type:
    "or-true" | "stderr-suppression" | "continue-on-error" | "allow-failure";
  description: string;
  script: string;
  fix: string;
}

interface WorkflowJobStep {
  run?: string;
  "continue-on-error"?: boolean | string;
  [key: string]: unknown;
}

interface WorkflowJob {
  steps?: WorkflowJobStep[];
  "continue-on-error"?: boolean | string;
  allow_failure?: boolean;
  script?: string[];
  [key: string]: unknown;
}

interface WorkflowConfig {
  jobs?: Record<string, WorkflowJob>;
  [key: string]: unknown;
}

const OR_TRUE_PATTERN = /\|\|\s*(?:true|:)\s*$/;
const STDERR_SUPPRESS_PATTERN = /2>\/dev\/null/;
const EXIT_ZERO_PATTERN = /(?:^|\s)exit\s+0(?:\s|$)/;

function analyzeScriptLine(line: string, jobName: string): ExitCodeViolation[] {
  const violations: ExitCodeViolation[] = [];
  const trimmed = line.trim();

  if (OR_TRUE_PATTERN.test(trimmed)) {
    violations.push({
      type: "or-true",
      description:
        `Job "${jobName}" uses "|| true" to suppress exit codes, ` +
        `allowing failures to pass silently.`,
      script: trimmed,
      fix: 'Remove "|| true" and handle errors explicitly.',
    });
  }

  if (STDERR_SUPPRESS_PATTERN.test(trimmed)) {
    violations.push({
      type: "stderr-suppression",
      description:
        `Job "${jobName}" suppresses stderr (2>/dev/null), which ` +
        `may hide error messages from failing commands.`,
      script: trimmed,
      fix: 'Remove "2>/dev/null" or redirect to a log file instead.',
    });
  }

  if (EXIT_ZERO_PATTERN.test(trimmed) && !trimmed.startsWith("#")) {
    violations.push({
      type: "or-true",
      description:
        `Job "${jobName}" forces exit code 0, overriding the ` +
        `natural exit code of the preceding command.`,
      script: trimmed,
      fix: "Remove the explicit exit 0 and let the command's exit code propagate.",
    });
  }

  return violations;
}

export function detectExitCodeViolations(
  workflowConfig: unknown,
): ExitCodeViolation[] {
  const violations: ExitCodeViolation[] = [];
  if (typeof workflowConfig !== "object" || workflowConfig === null) {
    return violations;
  }
  const config = workflowConfig as WorkflowConfig;
  if (!config.jobs) return violations;

  for (const [jobName, job] of Object.entries(config.jobs)) {
    if (
      job["continue-on-error"] === true ||
      (typeof job["continue-on-error"] === "string" &&
        job["continue-on-error"].includes("true"))
    ) {
      violations.push({
        type: "continue-on-error",
        description:
          `Job "${jobName}" has continue-on-error enabled, which ` +
          `prevents the job from failing the pipeline.`,
        script: "(job-level continue-on-error)",
        fix: 'Remove "continue-on-error: true" from the job definition.',
      });
    }

    if (job.allow_failure === true) {
      violations.push({
        type: "allow-failure",
        description:
          `Job "${jobName}" uses allow_failure (GitLab CI), which ` +
          `prevents the job from failing the pipeline.`,
        script: "(job-level allow_failure)",
        fix: 'Remove "allow_failure: true" from the job definition.',
      });
    }

    if (job.steps) {
      for (const step of job.steps) {
        if (step["continue-on-error"] === true) {
          violations.push({
            type: "continue-on-error",
            description: `A step in job "${jobName}" has continue-on-error enabled.`,
            script: step.run ?? "(step-level continue-on-error)",
            fix: 'Remove "continue-on-error: true" from the step definition.',
          });
        }

        if (step.run) {
          const lines = step.run.split("\n");
          for (const line of lines) {
            violations.push(...analyzeScriptLine(line, jobName));
          }
        }
      }
    }

    if (job.script && Array.isArray(job.script)) {
      for (const line of job.script) {
        violations.push(...analyzeScriptLine(line, jobName));
      }
    }
  }

  return violations;
}
