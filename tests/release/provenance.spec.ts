import { describe, expect, it } from "vitest";
import {
  verifyProvenance,
  hasProvenance,
} from "../../src/release/provenance.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("provenance (SUPPLY-001)", () => {
  function createTempPkg(
    name: string,
    version: string,
    extra?: Record<string, unknown>,
  ): string {
    const dir = mkdtempSync(join(tmpdir(), "provenance-test-"));
    const pkgDir = join(dir, "node_modules", name);
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({ name, version, ...extra }),
    );
    return pkgDir;
  }

  describe("verifyProvenance", () => {
    it("reads package name and version", () => {
      const pkgDir = createTempPkg("test-pkg", "1.2.3");
      const info = verifyProvenance(pkgDir);
      expect(info.packageName).toBe("test-pkg");
      expect(info.version).toBe("1.2.3");
    });

    it("returns empty attestations and signatures by default", () => {
      const pkgDir = createTempPkg("test-pkg", "1.0.0");
      const info = verifyProvenance(pkgDir);
      expect(info.attestations).toHaveLength(0);
      expect(info.signatures).toHaveLength(0);
    });

    it("handles missing package.json gracefully", () => {
      const dir = mkdtempSync(join(tmpdir(), "prov-missing-"));
      const info = verifyProvenance(dir);
      expect(info.packageName).toBe("");
      expect(info.version).toBe("");
    });

    it("reads provenance.json when present", () => {
      const pkgDir = createTempPkg("prov-pkg", "2.0.0");
      const npmDir = join(pkgDir, ".npm");
      mkdirSync(npmDir, { recursive: true });
      writeFileSync(
        join(npmDir, "provenance.json"),
        JSON.stringify({
          predicateType: "https://slsa.dev/provenance/v0.2",
          predicateBuilderId: "https://github.com/actions/runner",
          sigstore: true,
        }),
      );
      const info = verifyProvenance(pkgDir);
      expect(info.attestations).toHaveLength(1);
      expect(info.attestations[0]?.predicateType).toBe(
        "https://slsa.dev/provenance/v0.2",
      );
      expect(info.attestations[0]?.sigstore).toBe(true);
    });
  });

  describe("hasProvenance", () => {
    it("returns false for package without provenance", () => {
      const pkgDir = createTempPkg("no-prov", "1.0.0");
      expect(hasProvenance(pkgDir)).toBe(false);
    });

    it("returns true for package with provenance attestation", () => {
      const pkgDir = createTempPkg("with-prov", "1.0.0");
      const npmDir = join(pkgDir, ".npm");
      mkdirSync(npmDir, { recursive: true });
      writeFileSync(
        join(npmDir, "provenance.json"),
        JSON.stringify({
          predicateType: "https://slsa.dev/provenance/v0.2",
        }),
      );
      expect(hasProvenance(pkgDir)).toBe(true);
    });
  });
});
