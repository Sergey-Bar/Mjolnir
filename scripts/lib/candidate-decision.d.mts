export type CandidateStage = "engineering" | "release";
export type CandidateDetermination = "READY" | "BLOCKED" | "INCONCLUSIVE";

export interface CandidateDecision {
  stage: CandidateStage;
  status: "READY" | "BLOCKED";
  determination: CandidateDetermination;
  state: string | null;
  candidateSha: string | null;
  engineeringCertificationState: unknown;
  releaseAuthorizationState: unknown;
  contradictions: string[];
  engineeringBlockers: string[];
  releaseBlockers: string[];
  unmet: string[];
  blockers: string[];
}

export const CANDIDATE_STATES: string[];
export const STAGES: string[];
export function manifestContradictions(manifest: unknown): string[];
export function engineeringBlockers(manifest: unknown): string[];
export function releaseBlockers(manifest: unknown): string[];
export function evaluateCandidateDecision(
  manifest: unknown,
  stage?: CandidateStage,
): CandidateDecision;
export function decideForRoot(
  root: string,
  stage?: CandidateStage,
): CandidateDecision;
