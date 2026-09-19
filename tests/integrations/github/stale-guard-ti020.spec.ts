/**
 * TI-020 — Stale scan artifacts cannot overwrite newer PR head.
 *
 * The stale guard detects when an artifact was produced for a
 * different head commit than the current one. Publishing stale
 * results would mislead reviewers.
 */

import { describe, expect, it } from "vitest";

import {
  isStaleArtifact,
  type ArtifactWithSha,
} from "../../../src/integrations/github/stale-guard.js";

describe("TI-020: stale scan guard", () => {
  const CURRENT_SHA = "abc123def456789012345678901234567890abcd";

  it("fresh artifact (same SHA) returns 'fresh'", () => {
    const artifact: ArtifactWithSha = {
      headSha: CURRENT_SHA,
      producedAt: "2026-09-16T00:00:00Z",
    };
    const result = isStaleArtifact(artifact, CURRENT_SHA);
    expect(result.result).toBe("fresh");
  });

  it("different SHA returns 'mismatched'", () => {
    const artifact: ArtifactWithSha = {
      headSha: "ffffffffffffffffffffffffffffffffffffffff",
      producedAt: "2026-09-16T00:00:00Z",
    };
    const result = isStaleArtifact(artifact, CURRENT_SHA);
    expect(result.result).toBe("mismatched");
  });

  it("SHA comparison is case-insensitive", () => {
    const artifact: ArtifactWithSha = {
      headSha: CURRENT_SHA.toUpperCase(),
      producedAt: "2026-09-16T00:00:00Z",
    };
    const result = isStaleArtifact(artifact, CURRENT_SHA.toLowerCase());
    expect(result.result).toBe("fresh");
  });

  it("SHA comparison trims whitespace", () => {
    const artifact: ArtifactWithSha = {
      headSha: `  ${CURRENT_SHA}  `,
      producedAt: "2026-09-16T00:00:00Z",
    };
    const result = isStaleArtifact(artifact, CURRENT_SHA);
    expect(result.result).toBe("fresh");
  });

  it("partial SHA prefix match returns 'stale'", () => {
    const shortSha = CURRENT_SHA.slice(0, 7);
    const artifact: ArtifactWithSha = {
      headSha: shortSha,
      producedAt: "2026-09-16T00:00:00Z",
    };
    const result = isStaleArtifact(artifact, CURRENT_SHA);
    expect(result.result).toBe("stale");
  });

  it("returns ageMs when timestamps are available", () => {
    const artifact: ArtifactWithSha = {
      headSha: "ffffffffffffffffffffffffffffffffffffffff",
      producedAt: "2026-09-16T00:00:00Z",
    };
    const now = Date.parse("2026-09-16T01:00:00Z");
    const result = isStaleArtifact(artifact, CURRENT_SHA, now);
    expect(result.ageMs).toBe(3600000);
  });

  it("does not overwrite for mismatched SHA", () => {
    const artifact: ArtifactWithSha = {
      headSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      producedAt: "2026-09-16T00:00:00Z",
    };
    const result = isStaleArtifact(artifact, CURRENT_SHA);
    expect(result.result).not.toBe("fresh");
    expect(result.artifactSha).not.toBe(result.currentSha);
  });

  it("same SHA on repeated checks is always fresh", () => {
    const artifact: ArtifactWithSha = {
      headSha: CURRENT_SHA,
      producedAt: "2026-09-16T00:00:00Z",
    };
    for (let i = 0; i < 10; i++) {
      expect(isStaleArtifact(artifact, CURRENT_SHA).result).toBe("fresh");
    }
  });

  it("scanId on artifact does not affect freshness check", () => {
    const a: ArtifactWithSha = {
      headSha: CURRENT_SHA,
      producedAt: "2026-09-16T00:00:00Z",
      scanId: "scan-1",
    };
    const b: ArtifactWithSha = {
      headSha: CURRENT_SHA,
      producedAt: "2026-09-16T00:00:00Z",
      scanId: "scan-2",
    };
    expect(isStaleArtifact(a, CURRENT_SHA).result).toBe("fresh");
    expect(isStaleArtifact(b, CURRENT_SHA).result).toBe("fresh");
  });
});
