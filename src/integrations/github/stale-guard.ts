/**
 * Stale Result & Concurrency Guard (PRUX-011).
 *
 * Detects stale artifacts that were produced for a different head
 * commit than the current one. Publishing stale results would
 * mislead reviewers.
 *
 * TI-020 enforcement: artifacts MUST carry the head SHA they
 * were produced for; the guard checks this before publishing.
 */

export const STALE_GUARD_RESULT = ["fresh", "stale", "mismatched"] as const;
export type StaleGuardResult = (typeof STALE_GUARD_RESULT)[number];

export interface ArtifactWithSha {
  headSha: string;
  producedAt: string;
  scanId?: string;
}

export interface StaleGuardCheck {
  result: StaleGuardResult;
  artifactSha: string;
  currentSha: string;
  ageMs?: number;
}

export function isStaleArtifact(
  artifact: ArtifactWithSha,
  currentHeadSha: string,
  now?: number,
): StaleGuardCheck {
  const artifactSha = artifact.headSha.toLowerCase().trim();
  const currentSha = currentHeadSha.toLowerCase().trim();

  if (artifactSha === currentSha) {
    return {
      result: "fresh",
      artifactSha,
      currentSha,
    };
  }

  const artifactTime = Date.parse(artifact.producedAt);
  const currentTime = now ?? Date.now();
  const ageMs = Number.isNaN(artifactTime)
    ? undefined
    : currentTime - artifactTime;

  if (
    artifactSha.startsWith(currentSha) ||
    currentSha.startsWith(artifactSha)
  ) {
    const check: StaleGuardCheck = {
      result: "stale",
      artifactSha,
      currentSha,
    };
    if (ageMs !== undefined) check.ageMs = ageMs;
    return check;
  }

  const check: StaleGuardCheck = {
    result: "mismatched",
    artifactSha,
    currentSha,
  };
  if (ageMs !== undefined) check.ageMs = ageMs;
  return check;
}
