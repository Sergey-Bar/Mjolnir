import { describe, expect, it } from "vitest";
import { checkReproducibility } from "../../src/release/reproducibility.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("reproducibility (SUPPLY-004)", () => {
  function createProject(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "repro-test-"));
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(dir, name), content);
    }
    return dir;
  }

  describe("checkReproducibility", () => {
    it("reports deterministic for clean project", () => {
      const root = createProject({
        "package.json": JSON.stringify({
          name: "clean",
          version: "1.0.0",
          dependencies: { lodash: "4.17.21" },
        }),
        "package-lock.json": "{}",
      });
      const report = checkReproducibility(root);
      expect(report.deterministic).toBe(true);
      expect(report.buildCommand).toBe("npm run build");
    });

    it("detects missing lockfile", () => {
      const root = createProject({
        "package.json": JSON.stringify({
          name: "no-lock",
          version: "1.0.0",
          dependencies: {},
        }),
      });
      const report = checkReproducibility(root);
      expect(report.deterministic).toBe(false);
      expect(
        report.issues.some(
          (i) => i.category === "missing-lockfile" && i.severity === "error",
        ),
      ).toBe(true);
      expect(report.recommendations.some((r) => r.includes("lockfile"))).toBe(
        true,
      );
    });

    it("detects unpinned dependencies", () => {
      const root = createProject({
        "package.json": JSON.stringify({
          name: "unpinned",
          version: "1.0.0",
          dependencies: { foo: "*", bar: "latest" },
        }),
        "package-lock.json": "{}",
      });
      const report = checkReproducibility(root);
      expect(
        report.issues.some(
          (i) => i.category === "unpinned-dependency" && i.severity === "error",
        ),
      ).toBe(true);
    });

    it("detects timestamps in build scripts", () => {
      const root = createProject({
        "package.json": JSON.stringify({
          name: "ts-build",
          version: "1.0.0",
          scripts: { build: "echo $(date) > build.txt" },
        }),
        "package-lock.json": "{}",
      });
      const report = checkReproducibility(root);
      expect(
        report.issues.some((i) => i.category === "timestamp-or-random"),
      ).toBe(true);
    });

    it("detects loose version ranges", () => {
      const root = createProject({
        "package.json": JSON.stringify({
          name: "loose",
          version: "1.0.0",
          dependencies: { foo: ">=1.0.0" },
        }),
        "package-lock.json": "{}",
      });
      const report = checkReproducibility(root);
      expect(
        report.issues.some((i) => i.category === "loose-version-range"),
      ).toBe(true);
    });

    it("handles missing package.json", () => {
      const root = mkdtempSync(join(tmpdir(), "no-pkg-"));
      const report = checkReproducibility(root);
      expect(report.deterministic).toBe(false);
      expect(report.issues.some((i) => i.category === "missing-lockfile")).toBe(
        true,
      );
    });

    it("includes recommendations for detected issues", () => {
      const root = createProject({
        "package.json": JSON.stringify({
          name: "rec-test",
          version: "1.0.0",
          dependencies: { foo: "*" },
          scripts: { build: "echo $RANDOM" },
        }),
      });
      const report = checkReproducibility(root);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it("accepts yarn.lock as valid lockfile", () => {
      const root = createProject({
        "package.json": JSON.stringify({
          name: "yarn-proj",
          version: "1.0.0",
          dependencies: { lodash: "4.17.21" },
        }),
        "yarn.lock": "",
      });
      const report = checkReproducibility(root);
      expect(report.issues.some((i) => i.category === "missing-lockfile")).toBe(
        false,
      );
    });

    it("accepts pnpm-lock.yaml as valid lockfile", () => {
      const root = createProject({
        "package.json": JSON.stringify({
          name: "pnpm-proj",
          version: "1.0.0",
          dependencies: {},
        }),
        "pnpm-lock.yaml": "",
      });
      const report = checkReproducibility(root);
      expect(report.issues.some((i) => i.category === "missing-lockfile")).toBe(
        false,
      );
    });
  });
});
