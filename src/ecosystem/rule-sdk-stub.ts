/**
 * Rule SDK Stub (ECO-001).
 *
 * CONDITIONAL GATE: This feature is gated on community adoption.
 * It ships when ≥3 distinct contributors submit working plugin PRs
 * using the internal rule API. Until then, this is a placeholder
 * documenting the planned interface.
 *
 * The Rule SDK will provide a stable public API for third-party rule
 * authors, including:
 * - Rule registration and lifecycle hooks
 * - Typed scan context access
 * - Finding emission helpers
 * - Rule metadata declaration (category, severity, confidence)
 */

export interface RuleSDKGateStatus {
  readonly featureId: "ECO-001";
  readonly gate: "community-adoption";
  readonly threshold: 3;
  readonly description: string;
  readonly currentContributors: number;
  readonly met: boolean;
}

export const RULE_SDK_GATE: RuleSDKGateStatus = {
  featureId: "ECO-001",
  gate: "community-adoption",
  threshold: 3,
  description:
    "Gated on ≥3 distinct contributors submitting working plugin PRs using the internal rule API.",
  currentContributors: 0,
  met: false,
};

export interface RuleSDKStub {
  /** Register a custom rule. */
  registerRule(rule: RuleDefinition): void;
}

export interface RuleDefinition {
  id: string;
  title: string;
  category: string;
  severity: "error" | "warning" | "info";
  run: (context: RuleContext) => RuleFinding[];
}

export interface RuleContext {
  fileText: string;
  filePath: string;
  codeText?: string;
}

export interface RuleFinding {
  ruleId: string;
  message: string;
  line: number;
  column: number;
}
