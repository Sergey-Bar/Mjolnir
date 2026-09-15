/**
 * Runtime-Static Correlation (CI-002).
 *
 * Bridges the gap between static scan findings and runtime test
 * execution evidence. When a static finding points at a test that
 * was also executed in a CI run, the correlation module determines
 * match quality and derives a runtime corroboration level.
 *
 * TI-016 enforcement: trust level MUST be derived from the
 * combination of static evidence + runtime corroboration — never
 * from runtime alone.
 */

import type { Finding, TrustLevel } from "../types.js";
import type { TestVerdict } from "../forensics/types.js";

export const IDENTITY_MATCH_QUALITY = [
  "EXACT",
  "STRONG",
  "APPROXIMATE",
  "AMBIGUOUS",
] as const;
export type IdentityMatchQuality = (typeof IDENTITY_MATCH_QUALITY)[number];

export const RUNTIME_CORROBORATION_LEVEL = [
  "NONE",
  "SUPPORTING",
  "CONFIRMED",
] as const;
export type RuntimeCorroborationLevel =
  (typeof RUNTIME_CORROBORATION_LEVEL)[number];

export interface TestIdentity {
  framework: string;
  file: string;
  suiteHierarchy: string[];
  testName: string;
  parameterIdentity?: string;
  sourceRange: {
    startLine: number;
    endLine?: number;
  };
}

export interface TestIdentityMatch {
  quality: IdentityMatchQuality;
  staticIdentity: TestIdentity;
  runtimeRecord: TestVerdict;
  corroborationLevel: RuntimeCorroborationLevel;
}

export function buildTestIdentity(
  finding: Pick<Finding, "file" | "line" | "ruleId" | "message">,
  runtimeRecord: TestVerdict,
): TestIdentity {
  const suiteHierarchy = runtimeRecord.title
    .split(" > ")
    .slice(0, -1)
    .map((s) => s.trim());

  return {
    framework: "unknown",
    file: finding.file,
    suiteHierarchy,
    testName: runtimeRecord.title.split(" > ").pop()?.trim() ?? "",
    sourceRange: {
      startLine: finding.line,
      ...(runtimeRecord.line !== undefined
        ? { endLine: runtimeRecord.line }
        : {}),
    },
  };
}

export function matchQuality(
  staticIdentity: TestIdentity,
  runtimeRecord: TestVerdict,
): IdentityMatchQuality {
  if (staticIdentity.file !== runtimeRecord.file) return "AMBIGUOUS";

  const staticName = staticIdentity.testName.toLowerCase().trim();
  const runtimeName = runtimeRecord.title.toLowerCase().trim();

  if (staticName === runtimeName) return "EXACT";

  const runtimeShort = runtimeRecord.title.split(" > ").pop()?.trim() ?? "";
  if (staticName === runtimeShort.toLowerCase()) return "STRONG";

  if (
    staticIdentity.sourceRange.endLine !== undefined &&
    runtimeRecord.line !== undefined
  ) {
    const diff = Math.abs(
      staticIdentity.sourceRange.endLine - runtimeRecord.line,
    );
    if (diff <= 5) return "STRONG";
    if (diff <= 20) return "APPROXIMATE";
  }

  return "AMBIGUOUS";
}

export function deriveCorroborationLevel(
  quality: IdentityMatchQuality,
  runtimeRecord: TestVerdict,
): RuntimeCorroborationLevel {
  if (quality === "AMBIGUOUS") return "NONE";

  if (runtimeRecord.skipped) return "NONE";

  if (quality === "EXACT") {
    return runtimeRecord.everFailed || runtimeRecord.passedOnRetry
      ? "CONFIRMED"
      : "SUPPORTING";
  }

  if (quality === "STRONG") {
    return runtimeRecord.everFailed || runtimeRecord.passedOnRetry
      ? "SUPPORTING"
      : "SUPPORTING";
  }

  return "SUPPORTING";
}

/**
 * Trust-level mapping per §18.4 table.
 * TI-016 enforcement: trust level is derived from static evidence
 * combined with runtime corroboration — never from runtime alone.
 */
export function mapTrustLevel(
  staticEvidenceLevel: "E0" | "E1" | "E2",
  corroborationLevel: RuntimeCorroborationLevel,
): TrustLevel {
  if (corroborationLevel === "NONE") {
    if (staticEvidenceLevel === "E0") return "L0";
    if (staticEvidenceLevel === "E1") return "L1";
    return "L2";
  }

  if (corroborationLevel === "SUPPORTING") {
    if (staticEvidenceLevel === "E0") return "L3";
    if (staticEvidenceLevel === "E1") return "L3";
    return "L4";
  }

  // CONFIRMED
  if (staticEvidenceLevel === "E0") return "L4";
  return "L5";
}

export function correlateTest(
  finding: Pick<Finding, "file" | "line" | "ruleId" | "message">,
  runtimeRecord: TestVerdict,
): TestIdentityMatch {
  const staticIdentity = buildTestIdentity(finding, runtimeRecord);
  const quality = matchQuality(staticIdentity, runtimeRecord);
  const corroborationLevel = deriveCorroborationLevel(quality, runtimeRecord);

  return {
    quality,
    staticIdentity,
    runtimeRecord,
    corroborationLevel,
  };
}
