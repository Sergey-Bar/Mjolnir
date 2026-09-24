import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const release = readFileSync(
  join(root, ".github", "workflows", "release.yml"),
  "utf8",
);

describe("release candidate verification machinery", () => {
  it("runs the release-trust verdict gate and retains both artifacts", () => {
    expect(release).toContain("Release-trust gate (verdict must PASS)");
    expect(release).toContain(
      "node dist/cli.mjs release-trust --json > release-assets/release-trust.json",
    );
    expect(release).toContain(
      "node dist/cli.mjs release-trust > release-assets/release-trust.txt",
    );
  });

  it("packs once, audits, and fresh-installs before registry access", () => {
    const pack = release.indexOf("npm pack --ignore-scripts");
    const audit = release.indexOf("node scripts/pack-audit.mjs");
    const install = release.indexOf("npm install --prefix");
    const registry = release.indexOf("npm view");
    expect(pack).toBeGreaterThanOrEqual(0);
    expect(audit).toBeGreaterThan(pack);
    expect(install).toBeGreaterThan(audit);
    expect(registry).toBeGreaterThan(install);
    expect(release).toContain("Pack, audit, and fresh-install gate");
  });

  it("uses a bounded registry visibility check", () => {
    expect(release).toContain("Verify the published version is live on npm");
    expect(release).toContain("for attempt in {1..12}");
    expect(release).toContain("sleep 5");
    expect(release).toContain("did not become visible on npm");
  });

  it("creates the GitHub Release only after npm verification", () => {
    const verify = release.indexOf(
      "Verify the published version is live on npm",
    );
    const releaseJob = release.indexOf("  github-release:");
    const releaseCreate = release.indexOf("gh release create");
    expect(verify).toBeGreaterThan(0);
    expect(releaseJob).toBeGreaterThan(verify);
    expect(releaseCreate).toBeGreaterThan(releaseJob);
  });

  it("includes the release-trust verdict in the GitHub Release body", () => {
    const body = release.indexOf("## Release verification");
    const artifact = release.indexOf("cat release-assets/release-trust.json");
    const create = release.indexOf("gh release create");
    expect(body).toBeGreaterThan(0);
    expect(artifact).toBeGreaterThan(body);
    expect(create).toBeGreaterThan(artifact);
    expect(release).toContain("--notes-file release-notes.md");
  });
});
