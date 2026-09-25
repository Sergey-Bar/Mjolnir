import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(
    import.meta.dirname,
    "..",
    "..",
    ".github",
    "workflows",
    "release-smoke.yml",
  ),
  "utf8",
);

describe("release smoke workflow", () => {
  it("installs an exact published version instead of the checkout tarball", () => {
    expect(source).toContain("REGISTRY_INSTALL_VERSION");
    expect(source).toContain("inputs.version");
    expect(source).not.toContain("REGISTRY_INSTALL_TARBALL");
  });

  it("keeps the three supported operating systems", () => {
    expect(source).toContain("ubuntu-latest");
    expect(source).toContain("windows-latest");
    expect(source).toContain("macos-latest");
  });
});
