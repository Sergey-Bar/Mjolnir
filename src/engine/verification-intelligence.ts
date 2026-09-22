/**
 * M4 — Verification Intelligence for CI Workflow Integrity.
 *
 * Provides functions to validate that CI workflows are properly
 * configured to run Mjölnir scans, enforce quality gates, and
 * maintain integrity across the verification chain.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  detectMassSuppression,
  type SuppressionEntry,
} from "./suppression-integrity.js";

export interface CIWorkflowCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

export interface CIWorkflowIntegrityReport {
  workflow: string;
  checks: CIWorkflowCheck[];
  passed: number;
  failed: number;
  warned: number;
  overallStatus: "healthy" | "degraded" | "broken";
}

const CI_WORKFLOW_FILES = [
  ".github/workflows/ci.yml",
  ".github/workflows/test.yml",
  ".github/workflows/qa.yml",
  ".gitlab-ci.yml",
  "Jenkinsfile",
] as const;

const REQUIRED_SCAN_COMMANDS = ["npx mjolnir scan", "mjolnir scan", "npm run scan"];

export function detectCIWorkflows(root: string = "."): string[] {
  const found: string[] = [];
  for (const wf of CI_WORKFLOW_FILES) {
    if (existsSync(join(root, wf))) {
      found.push(wf);
    }
  }
  return found;
}

export function checkWorkflowContainsScan(
  workflowPath: string,
  root: string = ".",
): CIWorkflowCheck {
  const fullPath = join(root, workflowPath);
  if (!existsSync(fullPath)) {
    return {
      name: workflowPath,
      status: "fail",
      detail: `CI workflow file not found: ${workflowPath}`,
    };
  }

  const content = readFileSync(fullPath, "utf8");
  const hasScanCommand = REQUIRED_SCAN_COMMANDS.some((cmd) =>
    content.includes(cmd),
  );
  const hasQualityGate =
    content.includes("fail") ||
    content.includes("error") ||
    content.includes("block") ||
    content.includes("gate");

  if (hasScanCommand && hasQualityGate) {
    return {
      name: workflowPath,
      status: "pass",
      detail: "CI workflow contains scan command and quality gate",
    };
  }
  if (hasScanCommand && !hasQualityGate) {
    return {
      name: workflowPath,
      status: "warn",
      detail: "CI workflow contains scan command but lacks explicit quality gate",
    };
  }
  return {
    name: workflowPath,
    status: "fail",
    detail: "CI workflow does not contain a Mjölnir scan command",
  };
}

export function checkSuppressionIntegrity(
  suppressions: SuppressionEntry[],
  totalFindings: number,
): CIWorkflowCheck {
  const massResult = detectMassSuppression(suppressions, totalFindings);

  if (massResult.isMassSuppression) {
    return {
      name: "suppression-integrity",
      status: "fail",
      detail: `Mass suppression detected: ${massResult.ratio.toFixed(2)} of findings suppressed`,
    };
  }

  return {
    name: "suppression-integrity",
    status: "pass",
    detail: `Suppression integrity check passed: ${suppressions.length} suppressions, ${totalFindings} findings`,
  };
}

export function computeVerificationIntelligence(
  root: string = ".",
  suppressions: SuppressionEntry[] = [],
  totalFindings: number = 0,
): CIWorkflowIntegrityReport {
  const workflows = detectCIWorkflows(root);
  const checks: CIWorkflowCheck[] = [];

  if (workflows.length === 0) {
    checks.push({
      name: "ci-workflow",
      status: "warn",
      detail: "No CI workflow files detected in repository",
    });
  } else {
    for (const wf of workflows) {
      checks.push(checkWorkflowContainsScan(wf, root));
    }
  }

  if (suppressions.length > 0) {
    checks.push(checkSuppressionIntegrity(suppressions, totalFindings));
  }

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;

  let overallStatus: CIWorkflowIntegrityReport["overallStatus"];
  if (failed > 0) {
    overallStatus = "broken";
  } else if (warned > 0) {
    overallStatus = "degraded";
  } else {
    overallStatus = "healthy";
  }

  return {
    workflow: workflows.length > 0 ? workflows.join(", ") : "none",
    checks,
    passed,
    failed,
    warned,
    overallStatus,
  };
}

export function renderCIIntegrityReport(report: CIWorkflowIntegrityReport): string {
  const lines: string[] = [];
  lines.push(`CI Workflow Integrity Report`);
  lines.push(`Workflow: ${report.workflow}`);
  lines.push(`Status: ${report.overallStatus.toUpperCase()}`);
  lines.push(`Passed: ${report.passed}, Failed: ${report.failed}, Warned: ${report.warned}`);
  lines.push("");

  for (const check of report.checks) {
    const icon = check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "⚠";
    lines.push(`${icon} ${check.name}: ${check.detail}`);
  }

  return lines.join("\n").trimEnd();
}
