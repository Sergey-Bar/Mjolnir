/**
 * v6 shared type contracts.
 *
 * These types are the *schema* half of the v6 records; the gates in
 * `scripts/v6/` are the enforcement half. Kept in one file so a
 * capability, a census entry, a human record and a gap all speak about
 * ownership, evidence and maturity with the same words — a second set of
 * near-synonymous field names is the drift class ADR 0007 exists to
 * prevent.
 *
 * Every field here is machine-checkable. A field that exists only in
 * prose belongs in `docs/`, not in this file.
 */

import type { Maturity } from "./maturity.js";

/**
 * A named human owner. `UNOWNED` placeholders are rejected by the
 * validators: an unowned record cannot be a release blocker with an
 * owner, so permitting the placeholder is permitting a silent gap.
 */
export type Owner = string;

export const UNOWNED_PLACEHOLDERS: readonly string[] = [
  "unassigned",
  "unowned",
  "tbd",
  "unknown",
  "none",
  "n/a",
];

export function isNamedOwner(value: unknown): value is Owner {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    !UNOWNED_PLACEHOLDERS.includes(value.trim().toLowerCase())
  );
}

// ─── Evidence ────────────────────────────────────────────────────────

/**
 * Evidence classes. `E-HUMAN` is a **peer** of the machine classes, not
 * a subtype and not a downgrade (ADR 0009 / Law 7).
 */
export const EVIDENCE_CLASSES = [
  "E-MACHINE",
  "E-RUNTIME",
  "E-CORPUS",
  "E-ARTIFACT",
  "E-CONFIG",
  "E-HUMAN",
  "E-REMOTE",
] as const;

export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

/**
 * The maturity ceiling of human evidence (ADR 0009 invariant 3). Human
 * evidence may take a *human-observed* axis to `M3` and never to `M4`
 * (which needs a classified machine corpus) nor `M5` (which needs field
 * evidence). This is a function of the class, not a per-record decision,
 * so it cannot be forgotten at a call site.
 */
export const HUMAN_EVIDENCE_MATURITY_CEILING: Maturity = "M3_FIXTURE_VERIFIED";

/** Whether the class is the human class. */
export function isHumanEvidence(value: unknown): value is "E-HUMAN" {
  return value === "E-HUMAN";
}

export type EvidenceState =
  | "FRESH"
  | "STALE"
  | "FOREIGN"
  | "NOT_RUN"
  | "PARTIAL"
  | "CONTRADICTORY"
  | "INVALID"
  | "UNKNOWN";

/**
 * Freshness binding. Human records obey exactly this contract — the
 * reason a sign-off cannot outlive its commit (ADR 0009).
 */
export interface FreshnessBinding {
  repo: string;
  commitSha: string | null;
  branch: string | null;
  configHash: string | null;
  toolVersion: string;
  ruleVersion: string | null;
  parserVersion: string | null;
  frameworkVersion: string | null;
  runtime: string | null;
  /** ISO-8601. */
  timestamp: string;
  dependencyGraphHash: string | null;
  fileHashes: readonly string[];
}

// ─── nextLevelGap ────────────────────────────────────────────────────

/**
 * The machine-readable gap every capability below M5 must expose
 * (ADR 0001). It is the reason a capability can ship honestly: "not yet
 * proven, and here is exactly what would prove it, who owns it, and what
 * re-opens the question".
 */
export interface NextLevelGap {
  target: Maturity;
  missing: readonly string[];
  owner: Owner;
  revisitTrigger: string;
}

// ─── Proof ───────────────────────────────────────────────────────────

/**
 * Proof status. Mirrors `docs/claim-registry.json`'s existing
 * `proof.status` enum rather than inventing a parallel one (ADR 0007).
 * `REMOTE_PROVEN` is the only status that can reach `M5`.
 */
export const PROOF_STATUSES = [
  "BLOCKED",
  "LOCAL_PROVEN",
  "REMOTE_PROVEN",
] as const;
export type ProofStatus = (typeof PROOF_STATUSES)[number];

export interface ProofRef {
  status: ProofStatus;
  /** Repo-relative path; required unless `status === "BLOCKED"`. */
  artifact: string | null;
  digest: string | null;
  /** ISO-8601; required unless `status === "BLOCKED"`. */
  observedAt: string | null;
  authority: Owner;
}

// ─── Measurement ─────────────────────────────────────────────────────

/**
 * A measured rate with its sample size and interval. U4 (§6.7): *no naked
 * numbers* — a rate without `n` and an interval is a claim, not a
 * measurement, so the interval is part of the type, not an optional
 * decoration.
 */
export interface MeasuredRate {
  rate: number;
  n: number;
  ciLow: number;
  ciHigh: number;
  /** Which statistic `rate` is: a rate and a proportion share a shape
   *  but not a meaning. */
  kind: "precision" | "recall" | "falsePositiveRate" | "falseNegativeRate";
}

// ─── Gaps ────────────────────────────────────────────────────────────

/**
 * A v6 known gap. Reuses the M26 ledger's `GAP-*` shape and id scheme
 * (`^GAP-[A-Z0-9][A-Z0-9._-]*$`) rather than a second gap namespace, and
 * adds the v6 fields: the wave that owns it and its maturity impact.
 */
export const GAP_ID_PATTERN = /^GAP-[A-Z0-9][A-Z0-9._-]*$/;

export const GAP_SEVERITIES = [
  "release-blocker",
  "high",
  "medium",
  "low",
  "debt",
] as const;
export type GapSeverity = (typeof GAP_SEVERITIES)[number];

export const GAP_STATUSES = [
  "open",
  "accepted",
  "fix-in-progress",
  "fixed",
  "regression",
  "deferred",
  "not-applicable",
] as const;
export type GapStatus = (typeof GAP_STATUSES)[number];

export const WAVE_IDS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
] as const;
export type WaveId = (typeof WAVE_IDS)[number];

export interface V6Gap {
  gap_id: string;
  severity: GapSeverity;
  status: GapStatus;
  category: string;
  summary: string;
  owner: Owner;
  targetWave: WaveId;
  /** What the engine cannot currently demonstrate because of this gap. */
  maturityImpact: readonly string[];
  /** The command that re-derives the evidence for this gap. */
  revalidationCommand: string | null;
  revisitTrigger: string;
  /** Present when `status` is closed. */
  closureEvidence: {
    candidate: string;
    observedAt: string;
    command: string;
    result: string;
    artifacts: readonly string[];
  } | null;
}

// ─── Requirement classification (§100) ───────────────────────────────

/**
 * §100's classification vocabulary. A requirement is exactly one of
 * these; the point of the enum is that `MISSING` and `PARTIALLY_COMPLETE`
 * are different words, and collapsing them is how a gap becomes an
 * over-claim.
 */
export const REQUIREMENT_STATES = [
  "ALREADY_COMPLETE",
  "PARTIALLY_COMPLETE",
  "MISSING",
  "INCORRECT",
  "DUPLICATED",
  "OBSOLETE",
  "BLOCKED",
] as const;
export type RequirementState = (typeof REQUIREMENT_STATES)[number];

export interface RequirementClassification {
  /** The spec section, e.g. "§21" or "§2.4.1". */
  specSection: string;
  area: string;
  state: RequirementState;
  /** Repo-relative paths that prove the classification. */
  evidence: readonly string[];
  wave: WaveId;
  note: string;
}

// ─── Deployment mode (ADR 0008) ──────────────────────────────────────

export const DEPLOYMENT_MODES = [
  "LOCAL_ONLY",
  "SELF_HOSTED",
  "CLOUD",
  "AIR_GAPPED",
] as const;
export type DeploymentMode = (typeof DEPLOYMENT_MODES)[number];

/** The safe default. An unset mode is `LOCAL_ONLY`, never permissive. */
export const DEFAULT_DEPLOYMENT_MODE: DeploymentMode = "LOCAL_ONLY";

/** Whether a deployment mode may reach hosted code paths at all. */
export function modeAllowsHosted(mode: DeploymentMode): boolean {
  return mode === "CLOUD" || mode === "SELF_HOSTED";
}
