/**
 * Shared Azure DevOps "is this step a verification gate?" helpers for the
 * QA-CI rules (product-gap master plan P3b). Mirrors the GitHub-side
 * contract of verification-gate.ts: the SAME VERIFICATION_GATE_RE
 * allowlist decides gate-ness, applied to the Azure command surfaces —
 * the step's inline script text (script/bash/pwsh/powershell) plus the
 * string values of its task `inputs:` (Npm@1's `command: test`,
 * CmdLine@2's `script:`, PowerShell@2's `type: inlineScript`…).
 */

import type {
  AzureJob,
  AzurePipelineDoc,
  AzureStep,
} from "../../discovery/azure-pipeline-parser.js";
import { VERIFICATION_GATE_RE } from "./verification-gate.js";
// Bug-audit 3.10: one shared O(log n) lineAt instead of a private
// O(n) lineOf copy per rule file (positions.ts keeps a memoized
// newline-index + binary search).
import { lineAt } from "../shared/positions.js";

/** Discriminator: the Azure parser is the only one emitting `platform`. */
export function isAzurePipelineDoc(ast: unknown): ast is AzurePipelineDoc {
  return (
    typeof ast === "object" &&
    ast !== null &&
    (ast as { platform?: unknown }).platform === "azure-pipelines"
  );
}

/** Command-bearing text of one step: inline script + string task inputs. */
export function azureStepGateText(step: AzureStep): string {
  const parts: string[] = [];
  if (step.script) parts.push(step.script);
  if (step.inputs) {
    for (const v of Object.values(step.inputs)) {
      if (typeof v === "string") parts.push(v);
    }
  }
  return parts.join("\n");
}

/**
 * Gate-ness is a CONTENT decision only — the step's inline script text,
 * its task-input strings, and task-shaped commands. Deliberately NOT a
 * decision about enablement (`enabled: false` is QA-CI-013's never-runs
 * finding, and a content gate under a disable switch must stay visible
 * there), and not about conditions (QA-CI-008/013 own those).
 */
export function stepIsVerificationGate(step: AzureStep): boolean {
  if (azureTaskCommandIsGate(step)) return true;
  return VERIFICATION_GATE_RE.test(azureStepGateText(step));
}

/**
 * Task-shaped gate commands the text regex alone cannot see: `Npm@1` with
 * `inputs.command: test` (or `custom` + a customCommand that matches the
 * gate vocabulary). The task id narrows the surface, so the bare command
 * word is precise here — the same trust contract as the GitHub uses-arm.
 */
function azureTaskCommandIsGate(step: AzureStep): boolean {
  if (!step.task) return false;
  const isNpm = /^Npm@\d+/i.test(step.task);
  if (!isNpm) return false;
  const command =
    typeof step.inputs?.["command"] === "string"
      ? step.inputs["command"].trim().toLowerCase()
      : "";
  if (command === "test" || command === "t") return true;
  if (command === "custom") {
    const custom =
      typeof step.inputs?.["customCommand"] === "string"
        ? step.inputs["customCommand"]
        : "";
    return VERIFICATION_GATE_RE.test(custom);
  }
  return false;
}

/** True when the job runs at least one verification gate step. */
export function jobRunsVerificationGate(job: AzureJob): boolean {
  return (job.steps ?? []).some(stepIsVerificationGate);
}

/**
 * Line of the raw `continueOnError` / `condition` / `retryCountOnTaskFailure`
 * key belonging to THIS step. The parsed YAML carries no source positions,
 * so anchor on the step's own command text (or task ref) and take the next
 * case-insensitive key occurrence at or after it — Azure keys may carry any
 * casing, so the raw scan is case-insensitive. Falls back to the anchor's
 * own line (an approximate line on a reported finding beats a dropped
 * finding — the S5 ruling the GitHub-side locator implements).
 */
export function locateAzureStepKey(
  text: string,
  step: AzureStep,
  keyName: string,
): number {
  const anchor =
    step.script?.split("\n").find((l) => l.trim().length > 0) ??
    step.task ??
    step.name ??
    "";
  const anchorAt = anchor ? text.indexOf(anchor.trim()) : -1;
  // eslint-disable-next-line security/detect-non-literal-regexp -- keyName is a compile-time literal passed by the rules ("condition"/"continueOnError"/"retryCountOnTaskFailure"), never scan input
  const keyRe = new RegExp(`${keyName}\\s*:`, "gi");
  if (anchorAt !== -1) {
    keyRe.lastIndex = anchorAt;
    const m = keyRe.exec(text);
    if (m) return lineAt(text, m.index);
    return lineAt(text, anchorAt);
  }
  // No anchor: the key anywhere in the file is the honest floor.
  const m = keyRe.exec(text);
  if (m) return lineAt(text, m.index);
  return 1;
}

/** Line of a job-level key: anchored at the job's own kind key or name. */
export function locateAzureJobKey(
  text: string,
  job: AzureJob,
  keyName: string,
): number {
  const anchor = job.name ?? "";
  const anchorAt = anchor ? text.indexOf(anchor.trim()) : -1;
  // eslint-disable-next-line security/detect-non-literal-regexp -- keyName is a compile-time literal passed by the rules ("condition"/"continueOnError"), never scan input
  const keyRe = new RegExp(`${keyName}\\s*:`, "gi");
  if (anchorAt !== -1) {
    keyRe.lastIndex = anchorAt;
    const m = keyRe.exec(text);
    if (m) return lineAt(text, m.index);
    return lineAt(text, anchorAt);
  }
  const m = keyRe.exec(text);
  if (m) return lineAt(text, m.index);
  return 1;
}
