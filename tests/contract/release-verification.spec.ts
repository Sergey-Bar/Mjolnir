/**
 * MR-7A (master plan 1789041108156 §18): the release-verification
 * machinery is implemented — asserted here against release.yml itself,
 * the same pattern as the ci-self-scan workflow contract.
 *
 * The machinery has two lifecycle states: MR-7A = the checks EXIST
 * (this file); MR-7B = the checks are RUN against the published
 * artifact (the release workflow does this on every publish — the
 * v1.0.8 chain exercised them for real).
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..");
const release = readFileSync(
  join(ROOT, ".github", "workflows", "release.yml"),
  "utf8",
);

describe("release.yml implements the release-verification machinery (MR-7A)", () => {
  it("runs the release-trust verdict gate and keeps its output", () => {
    expect(release).toContain("Release-trust gate (verdict must PASS)");
    expect(release).toContain(
      "release-trust --json > release-assets/release-trust.json",
    );
    expect(release).toContain(
      "release-trust | tee release-assets/release-trust.txt",
    );
  });

  it("audits the packed tarball before any registry write (SC-6)", () => {
    const packIdx = release.indexOf("Pack distribution tarball");
    const auditIdx = release.indexOf("Pack-audit the exact tarball (SC-6)");
    const registryIdx = release.indexOf(
      "Check whether this version is already on npm",
    );
    expect(packIdx).toBeGreaterThan(-1);
    expect(auditIdx).toBeGreaterThan(packIdx);
    expect(registryIdx).toBeGreaterThan(auditIdx);
  });

  it("verifies the published artifact is live before declaring the release", () => {
    expect(release).toContain("Verify the published version is live on npm");
    // The bounded-retry refusal — the SC-9B line that fails the release
    // when npm does not serve the version under `latest`.
    expect(release).toContain("not resolvable on the registry under dist-tag");
  });

  it("gates a fresh install of the packed tarball (pack → install → run bin)", () => {
    expect(release).toContain("Fresh-install gate");
  });

  it("creates the GitHub Release only after the chain is verified, with the verdict block in the body", () => {
    const verifyIdx = release.indexOf(
      "Verify the published version is live on npm",
    );
    const bodyIdx = release.indexOf(
      "Build the release body with the verdict block",
    );
    const ghReleaseIdx = release.indexOf(
      "Create GitHub Release with generated notes",
    );
    expect(verifyIdx).toBeGreaterThan(-1);
    expect(bodyIdx).toBeGreaterThan(verifyIdx);
    expect(ghReleaseIdx).toBeGreaterThan(bodyIdx);
    // Publication honesty (Constitution §6): the verdict block is
    // appended to the body; a missing proof renders UNPROVEN, never
    // omitted.
    expect(release).toContain("cat release-assets/release-trust.txt");
  });
});
