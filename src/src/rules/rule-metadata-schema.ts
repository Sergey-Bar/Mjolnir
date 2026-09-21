/**
 * Rule Metadata Validation (ENGINE-008).
 *
 * Derives a machine-verifiable contract from each QADoctorRule's metadata
 * and validates the whole registry against it. The contract captures the
 * trust-relevant fields the doctor/registry-ratchet already check
 * informally, formalized so tests and doctor checks share one schema.
 */

import type { QADoctorRule } from "./rule.js";
import type { EvidenceLevel, RuleCategory, Severity } from "../types.js";
import { RULE_CATEGORIES, SEVERITY_ORDER, QA_IMPACT_LABELS } from "../types.js";

/**
 * The validated metadata contract for a rule. Every field is derived
 * from the rule's own declarations — the contract is the rule's
 * metadata as the rest of the pipeline sees it.
 */
export interface RuleMetadataContract {
  id: string;
  family: string;
  category: RuleCategory;
  frameworks: string[];
  trustFailureDetected: boolean;
  falseGreenScenario: boolean;
  detectionStrategy: string;
  evidenceLevel: EvidenceLevel;
  severity: Severity;
  fpRisks: "low" | "medium" | "high";
  measuredFpRate?: number;
  measuredFpN?: number;
  dependencies: string[];
  knownLimitations: string[];
  autofixPolicy: "safe" | "unsafe" | "unknown";
  detectorRevision: number;
  remediationGuidance?: string;
}

const VALID_SEVERITIES: readonly string[] = SEVERITY_ORDER;
const VALID_CATEGORIES: readonly string[] = RULE_CATEGORIES;
const VALID_QA_IMPACTS: readonly string[] = Object.keys(QA_IMPACT_LABELS);

const VALID_FP_RISKS = new Set(["low", "medium", "high"]);
const VALID_DETECTION_STRATEGIES = new Set([
  "LEXICAL",
  "AST",
  "SEMANTIC",
  "QA_MODEL",
  "FRAMEWORK",
  "RUNTIME",
]);

/**
 * Derive a RuleMetadataContract from a QADoctorRule. Pure mapping —
 * no validation, no throws. Fields the rule doesn't declare get
 * honest defaults.
 */
export function deriveContractFields(rule: QADoctorRule): RuleMetadataContract {
  const parts = rule.id.split("-");
  const family = parts.length >= 2 ? (parts[1] ?? "") : "";
  return {
    id: rule.id,
    family,
    category: rule.category,
    frameworks: [...(rule.frameworks ?? [])],
    trustFailureDetected: rule.falsePositiveRisk === "high",
    falseGreenScenario: rule.qaImpact === "FALSE-GREEN",
    detectionStrategy: rule.detectionStrategy ?? "LEXICAL",
    evidenceLevel:
      rule.evidenceLevel ??
      (rule.findingType === "observation"
        ? "E0"
        : rule.findingType === "heuristic-risk"
          ? "E1"
          : rule.confidence === "low"
            ? "E1"
            : "E2"),
    severity: rule.severity,
    fpRisks: rule.falsePositiveRisk ?? "medium",
    dependencies: [...(rule.overlapWith ?? [])],
    knownLimitations: [],
    autofixPolicy:
      rule.autofix === true
        ? "safe"
        : rule.autofix === false
          ? "unsafe"
          : "unknown",
    detectorRevision: rule.detectorRevision ?? 1,
  };
}

export interface ValidationViolation {
  ruleId: string;
  field: string;
  message: string;
}

/**
 * Validate a single rule's metadata against the contract expectations.
 * Returns an array of violations (empty = valid).
 */
export function validateRuleMetadata(
  rule: QADoctorRule,
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const add = (field: string, message: string) =>
    violations.push({ ruleId: rule.id, field, message });

  if (!rule.id || !/^QA-[A-Z]+-\d{3}$/.test(rule.id)) {
    add("id", `malformed rule ID: "${rule.id}"`);
  }

  if (!VALID_CATEGORIES.includes(rule.category)) {
    add("category", `unknown category "${rule.category}"`);
  }

  if (!VALID_SEVERITIES.includes(rule.severity)) {
    add("severity", `invalid severity "${rule.severity}"`);
  }

  if (!VALID_QA_IMPACTS.includes(rule.qaImpact)) {
    add("qaImpact", `invalid qaImpact "${rule.qaImpact}"`);
  }

  if (!VALID_FP_RISKS.has(rule.falsePositiveRisk ?? "")) {
    add("falsePositiveRisk", `missing or invalid falsePositiveRisk`);
  }

  if (
    rule.detectionStrategy &&
    !VALID_DETECTION_STRATEGIES.has(rule.detectionStrategy)
  ) {
    add(
      "detectionStrategy",
      `invalid detectionStrategy "${rule.detectionStrategy}"`,
    );
  }

  if (!rule.title || rule.title.length < 4) {
    add("title", "title is empty or too short");
  }

  if (rule.detectorRevision !== undefined && rule.detectorRevision < 1) {
    add(
      "detectorRevision",
      `detectorRevision must be ≥ 1, got ${rule.detectorRevision}`,
    );
  }

  if (rule.detectionStrategy === "LEXICAL" && !rule.strategyJustification) {
    add(
      "strategyJustification",
      "LEXICAL rule missing depth-adjudication record",
    );
  }

  return violations;
}

/**
 * Validate all rules in the registry. Returns all violations across
 * all rules (empty array = the registry is valid).
 */
export function validateAllRulesMetadata(
  rules: readonly QADoctorRule[],
): ValidationViolation[] {
  const all: ValidationViolation[] = [];
  for (const rule of rules) {
    all.push(...validateRuleMetadata(rule));
  }
  return all;
}
