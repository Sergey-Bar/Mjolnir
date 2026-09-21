import { describe, expect, it } from "vitest";
import {
  computeChangedFiles,
  isIncrementalSafe,
  computeContentHash,
} from "../../src/engine/incremental-analysis.js";

describe("incremental-analysis (ECO-004)", () => {
  describe("computeContentHash", () => {
    it("returns a 64-char hex string", () => {
      expect(computeContentHash("hello")).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic", () => {
      expect(computeContentHash("test")).toBe(computeContentHash("test"));
    });

    it("differs for different content", () => {
      expect(computeContentHash("a")).not.toBe(computeContentHash("b"));
    });
  });

  describe("computeChangedFiles", () => {
    it("detects added files", () => {
      const changes = computeChangedFiles(
        [{ path: "new.ts", content: "x" }],
        [],
      );
      expect(changes).toHaveLength(1);
      expect(changes[0]?.state).toBe("added");
      expect(changes[0]?.path).toBe("new.ts");
    });

    it("detects deleted files", () => {
      const changes = computeChangedFiles(
        [],
        [{ path: "old.ts", content: "x" }],
      );
      expect(changes).toHaveLength(1);
      expect(changes[0]?.state).toBe("deleted");
    });

    it("detects modified files", () => {
      const changes = computeChangedFiles(
        [{ path: "f.ts", content: "new" }],
        [{ path: "f.ts", content: "old" }],
      );
      expect(changes).toHaveLength(1);
      expect(changes[0]?.state).toBe("modified");
    });

    it("skips unchanged files", () => {
      const changes = computeChangedFiles(
        [{ path: "f.ts", content: "same" }],
        [{ path: "f.ts", content: "same" }],
      );
      expect(changes).toHaveLength(0);
    });

    it("handles mixed changes", () => {
      const current = [
        { path: "a.ts", content: "changed" },
        { path: "b.ts", content: "same" },
        { path: "c.ts", content: "new" },
      ];
      const previous = [
        { path: "a.ts", content: "original" },
        { path: "b.ts", content: "same" },
        { path: "d.ts", content: "deleted" },
      ];
      const changes = computeChangedFiles(current, previous);
      const byPath = new Map(changes.map((c) => [c.path, c.state]));
      expect(byPath.get("a.ts")).toBe("modified");
      expect(byPath.has("b.ts")).toBe(false);
      expect(byPath.get("c.ts")).toBe("added");
      expect(byPath.get("d.ts")).toBe("deleted");
    });

    it("returns empty for two empty snapshots", () => {
      expect(computeChangedFiles([], [])).toHaveLength(0);
    });

    it("sorts output by path", () => {
      const changes = computeChangedFiles(
        [
          { path: "z.ts", content: "a" },
          { path: "a.ts", content: "b" },
        ],
        [],
      );
      expect(changes[0]?.path).toBe("a.ts");
      expect(changes[1]?.path).toBe("z.ts");
    });
  });

  describe("isIncrementalSafe", () => {
    it("returns safe for regular file changes", () => {
      const result = isIncrementalSafe([
        {
          path: "src/foo.ts",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
        { path: "tests/bar.spec.ts", state: "added", currentHash: "c" },
      ]);
      expect(result.safe).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it("returns unsafe for config changes", () => {
      const result = isIncrementalSafe([
        {
          path: "mjolnir.config.json",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("returns unsafe for package.json changes", () => {
      const result = isIncrementalSafe([
        {
          path: "package.json",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(false);
    });

    it("returns unsafe for .mjolnirignore changes", () => {
      const result = isIncrementalSafe([
        {
          path: ".mjolnirignore",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(false);
    });

    it("returns safe when no files changed", () => {
      expect(isIncrementalSafe([]).safe).toBe(true);
    });

    it("handles Windows backslash paths", () => {
      const result = isIncrementalSafe([
        {
          path: "src\\mjolnir.config.ts",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(false);
    });
  });
});
