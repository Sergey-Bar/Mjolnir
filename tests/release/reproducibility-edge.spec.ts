import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkReproducibility } from "../../src/release/reproducibility.js";

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-repro-"));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(root, name), content, "utf8");
  }
  return root;
}

describe("reproducibility analysis edge cases", () => {
  it("reports nondeterministic scripts and dependency ranges", () => {
    const root = project({
      "package.json": JSON.stringify({
        scripts: { build: "date && random" },
        dependencies: { a: "latest", b: "~>1.0.0" },
      }),
      "package-lock.json": "{}",
    });
    try {
      const result = checkReproducibility(root);
      expect(result.deterministic).toBe(false);
      expect(result.issues.map((issue) => issue.category)).toEqual(
        expect.arrayContaining([
          "timestamp-or-random",
          "unpinned-dependency",
          "loose-version-range",
        ]),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports source maps and unordered build file lists", () => {
    const root = project({
      "package.json": JSON.stringify({ scripts: {}, dependencies: {} }),
      "tsconfig.json": JSON.stringify({ compilerOptions: { sourceMap: true } }),
      "tsdown.config.ts": "glob('src/**/*')",
      "package-lock.json": "{}",
    });
    try {
      const result = checkReproducibility(root);
      expect(result.issues.map((issue) => issue.category)).toEqual(
        expect.arrayContaining(["sourcemap", "unordered-file-list"]),
      );
      expect(result.recommendations).toContain(
        "Sort file lists after glob/readdir operations",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a missing lockfile and tolerates unreadable configs", () => {
    const root = project({ "package.json": "{ broken" });
    try {
      const result = checkReproducibility(root);
      expect(
        result.issues.some((issue) => issue.category === "missing-lockfile"),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
