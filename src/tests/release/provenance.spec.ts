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
    it("handles corrupt provenance.json gracefully", () => {
      const pkgDir = createTempPkg("corrupt-prov", "1.0.0");
      const npmDir = join(pkgDir, ".npm");
      mkdirSync(npmDir, { recursive: true });
      writeFileSync(join(npmDir, "provenance.json"), "NOT JSON");
      const info = verifyProvenance(pkgDir);
      expect(info.attestations).toHaveLength(0);
    });

    it("handles corrupt package-lock.json gracefully", () => {
      const pkgDir = createTempPkg("lock-corrupt", "1.0.0");
      const lockDir = join(pkgDir, "..", "..");
      writeFileSync(join(lockDir, ".package-lock.json"), "NOT JSON");
      const info = verifyProvenance(pkgDir);
      expect(info.signatures).toHaveLength(0);
    });

    it("returns attestations with no predicateType as skipped", () => {
      const pkgDir = createTempPkg("no-pred", "1.0.0");
      const npmDir = join(pkgDir, ".npm");
      mkdirSync(npmDir, { recursive: true });
      writeFileSync(
        join(npmDir, "provenance.json"),
        JSON.stringify({ someOtherField: "value" }),
      );
      const info = verifyProvenance(pkgDir);
      expect(info.attestations).toHaveLength(0);
    });

    it("reads signatures from .package-lock.json", () => {
      const pkgDir = createTempPkg("sig-pkg", "1.0.0");
      const lockDir = join(pkgDir, "..", "..");
      writeFileSync(
        join(lockDir, ".package-lock.json"),
        JSON.stringify({
          packages: {
            "node_modules/sig-pkg": {
              signatures: [{ keyid: "key-1", sig: "abc123" }],
              resolved: "https://registry.npmjs.org/sig-pkg",
            },
          },
        }),
      );
      const info = verifyProvenance(pkgDir);
      expect(info.signatures).toHaveLength(1);
      expect(info.signatures[0]?.keyid).toBe("key-1");
      expect(info.registry).toBe("registry.npmjs.org");
    });

    it("reads provenance.json with optional fields undefined", () => {
      const pkgDir = createTempPkg("opt-fields", "1.0.0");
      const npmDir = join(pkgDir, ".npm");
      mkdirSync(npmDir, { recursive: true });
      writeFileSync(
        join(npmDir, "provenance.json"),
        JSON.stringify({ predicateType: "test-type" }),
      );
      const info = verifyProvenance(pkgDir);
      expect(info.attestations).toHaveLength(1);
      expect(info.attestations[0]?.predicateBuilderId).toBeUndefined();
      expect(info.attestations[0]?.sigstore).toBe(false);
    });

    it("returns empty registry for invalid URL in resolved field", () => {
      const pkgDir = createTempPkg("bad-url", "1.0.0");
      const lockDir = join(pkgDir, "..", "..");
      writeFileSync(
        join(lockDir, ".package-lock.json"),
        JSON.stringify({
          packages: {
            "node_modules/bad-url": {
              resolved: "not a url",
            },
          },
        }),
      );
      const info = verifyProvenance(pkgDir);
      expect(info.registry).toBe("");
    });

    it("handles missing packages key in lock file", () => {
      const pkgDir = createTempPkg("no-pkgs", "1.0.0");
      const lockDir = join(pkgDir, "..", "..");
      writeFileSync(
        join(lockDir, ".package-lock.json"),
        JSON.stringify({ lockfileVersion: 3 }),
      );
      const info = verifyProvenance(pkgDir);
      expect(info.signatures).toHaveLength(0);
    });

    it("handles package.json with corrupt JSON", () => {
      const dir = mkdtempSync(join(tmpdir(), "prov-corrupt-pkg-"));
      const pkgDir = join(dir, "node_modules", "bad-pkg");
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(join(pkgDir, "package.json"), "NOT JSON");
      const info = verifyProvenance(pkgDir);
      expect(info.packageName).toBe("");
      expect(info.version).toBe("");
    });

    it("handles package.json with missing name and version", () => {
      const dir = mkdtempSync(join(tmpdir(), "prov-noname-"));
      const pkgDir = join(dir, "node_modules", "noname");
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        join(pkgDir, "package.json"),
        JSON.stringify({ description: "no name" }),
      );
      const info = verifyProvenance(pkgDir);
      expect(info.packageName).toBe("");
      expect(info.version).toBe("");
    });

    it("handles missing package-lock.json gracefully", () => {
      const pkgDir = createTempPkg("no-lock", "1.0.0");
      const info = verifyProvenance(pkgDir);
      expect(info.signatures).toHaveLength(0);
      expect(info.registry).toBe("");
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

    it("returns false when no provenance file exists", () => {
      const dir = mkdtempSync(join(tmpdir(), "prov-nofile-"));
      expect(hasProvenance(dir)).toBe(false);
    });

    it("returns true when package has signatures but no attestations", () => {
      const pkgDir = createTempPkg("sig-only", "1.0.0");
      const lockDir = join(pkgDir, "..", "..");
      writeFileSync(
        join(lockDir, ".package-lock.json"),
        JSON.stringify({
          packages: {
            "node_modules/sig-only": {
              signatures: [{ keyid: "key-1", sig: "abc" }],
            },
          },
        }),
      );
      expect(hasProvenance(pkgDir)).toBe(true);
    });
  });
});
