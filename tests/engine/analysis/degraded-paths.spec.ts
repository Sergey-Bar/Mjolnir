/** Degraded-path coverage: explain crash, impact I/O failure, ts-ast crash. */

const osState = vi.hoisted(() => ({ breakTmp: false }));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    tmpdir: () =>
      osState.breakTmp
        ? join(actual.tmpdir(), "mjolnir-missing-root")
        : actual.tmpdir(),
  };
});
import { rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("ts-morph", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ts-morph")>();
  return {
    ...actual,
    Project: class {
      getSourceFile(): undefined {
        return undefined;
      }
      createSourceFile(): object {
        // A parsed-looking file whose descendant walk explodes —
        // getCodeOnlyText must degrade to the raw text.
        return {
          getFilePath: () => "a.spec.ts",
          getDescendantsOfKind: () => {
            throw new Error("ts-morph exploded (simulated)");
          },
        };
      }
    },
  };
});

vi.mock("../../../src/engine/ts-ast.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../src/engine/ts-ast.js")>();
  return {
    ...actual,
    commentAndStringRanges: vi.fn(() => {
      throw new Error("comment scan exploded (simulated)");
    }),
  };
});

import { getCodeOnlyText } from "../../../src/engine/ts-ast.js";

describe("ts-ast crash degradation", () => {
  it("returns the raw text when the AST pass throws", () => {
    const text = "const s = 'kept raw';";
    expect(getCodeOnlyText({ path: "a.spec.ts", text })).toBe(text);
  });
});

const cleanupDirs: string[] = [];
process.on("exit", () => {
  for (const d of cleanupDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
});
