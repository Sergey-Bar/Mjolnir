import { describe, expect, it } from "vitest";

import {
  isStaleArtifact,
  type ArtifactWithSha,
} from "../../../src/integrations/github/stale-guard.js";

function artifact(overrides: Partial<ArtifactWithSha> = {}): ArtifactWithSha {
  return {
    headSha: "abc1234567890",
    producedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("isStaleArtifact", () => {
  it("returns fresh when SHAs match exactly", () => {
    const result = isStaleArtifact(artifact({ headSha: "abc123" }), "abc123");
    expect(result.result).toBe("fresh");
  });

  it("returns fresh with case-insensitive match", () => {
    const result = isStaleArtifact(artifact({ headSha: "ABC123" }), "abc123");
    expect(result.result).toBe("fresh");
  });

  it("returns fresh ignoring whitespace", () => {
    const result = isStaleArtifact(artifact({ headSha: " abc123 " }), "abc123");
    expect(result.result).toBe("fresh");
  });

  it("returns mismatched for completely different SHAs", () => {
    const result = isStaleArtifact(artifact({ headSha: "abc123" }), "def456");
    expect(result.result).toBe("mismatched");
  });

  it("returns stale for prefix match (short sha)", () => {
    const result = isStaleArtifact(
      artifact({ headSha: "abc1234" }),
      "abc1234567890",
    );
    expect(result.result).toBe("stale");
  });

  it("returns stale for reverse prefix match", () => {
    const result = isStaleArtifact(
      artifact({ headSha: "abc1234567890" }),
      "abc1234",
    );
    expect(result.result).toBe("stale");
  });

  it("includes ageMs when timestamps are valid", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const result = isStaleArtifact(
      artifact({ headSha: "abc123", producedAt: past }),
      "def456",
    );
    expect(result.ageMs).toBeGreaterThanOrEqual(59_000);
  });

  it("handles invalid timestamps gracefully", () => {
    const result = isStaleArtifact(
      artifact({ headSha: "abc123", producedAt: "invalid" }),
      "def456",
    );
    expect(result.result).toBe("mismatched");
    expect(result.ageMs).toBeUndefined();
  });

  it("TI-020: artifact must carry headSha", () => {
    const result = isStaleArtifact(artifact({ headSha: "aaa" }), "bbb");
    expect(result.artifactSha).toBe("aaa");
    expect(result.currentSha).toBe("bbb");
  });
});
