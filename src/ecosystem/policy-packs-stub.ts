/**
 * Policy Packs Stub (ECO-006).
 *
 * CONDITIONAL GATE: This feature is gated on enterprise adoption.
 * It ships when ≥3 distinct organizations submit integration PRs
 * demonstrating policy-pack usage. Until then, this is a placeholder
 * documenting the planned interface.
 *
 * Policy Packs will provide curated rule bundles for specific
 * compliance frameworks (SOC2, HIPAA, PCI-DSS), including:
 * - Pack manifest with rule selections and overrides
 * - Severity overrides per policy
 * - Suppression policies (what may never be suppressed)
 * - Reporting format requirements
 */

export interface PolicyPackGateStatus {
  readonly featureId: "ECO-006";
  readonly gate: "enterprise-adoption";
  readonly threshold: 3;
  readonly description: string;
  readonly currentOrgs: number;
  readonly met: boolean;
}

export const POLICY_PACK_GATE: PolicyPackGateStatus = {
  featureId: "ECO-006",
  gate: "enterprise-adoption",
  threshold: 3,
  description:
    "Gated on ≥3 distinct organizations submitting integration PRs for policy packs.",
  currentOrgs: 0,
  met: false,
};

export interface PolicyPackStub {
  /** Load a policy pack by name. */
  loadPack(name: string): PolicyPackDefinition | undefined;
}

export interface PolicyPackDefinition {
  name: string;
  version: string;
  description: string;
  enabledRules: string[];
  severityOverrides: Record<string, "error" | "warning" | "info">;
  unsuppressableRules: string[];
}
