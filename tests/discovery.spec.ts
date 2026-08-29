import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectFrameworks } from "../src/discovery/frameworks.js";
import {
  discoverWorkspace,
  findProjectRoot,
} from "../src/discovery/workspace.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-ws-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function pkg(obj: unknown): void {
  writeFileSync(join(dir, "package.json"), JSON.stringify(obj));
}

describe("findProjectRoot", () => {
  it("returns null when no package.json exists up the tree", () => {
    // tmpdir itself has no package.json; walk up from a fresh temp dir.
    expect(findProjectRoot(dir)).toBeNull();
  });

  it("finds package.json in the start dir", () => {
    pkg({ name: "x" });
    expect(findProjectRoot(dir)).toBe(dir);
  });

  it("walks upward to find a parent package.json", () => {
    pkg({ name: "parent" });
    const nested = join(dir, "a", "b");
    mkdirSync(nested, { recursive: true });
    expect(findProjectRoot(nested)).toBe(dir);
  });
});

describe("discoverWorkspace", () => {
  it("returns null when no root found", () => {
    expect(discoverWorkspace(dir)).toBeNull();
  });

  it("parses name and defaults to basename", () => {
    pkg({ name: "my-repo" });
    expect(discoverWorkspace(dir)?.name).toBe("my-repo");
    writeFileSync(join(dir, "package.json"), "{ invalid json");
    expect(discoverWorkspace(dir)?.name).not.toBe("");
  });

  it("falls back to directory basename when name missing", () => {
    pkg({});
    expect(discoverWorkspace(dir)?.name).toContain("-");
  });

  it("extracts array workspaces globs", () => {
    pkg({ workspaces: ["packages/*", 42] });
    expect(discoverWorkspace(dir)?.workspaceGlobs).toEqual(["packages/*"]);
  });

  it("extracts object-form workspaces packages", () => {
    pkg({ workspaces: { packages: ["apps/*"] } });
    expect(discoverWorkspace(dir)?.workspaceGlobs).toEqual(["apps/*"]);
  });

  it("handles non-array packages gracefully", () => {
    pkg({ workspaces: { packages: "nope" } });
    expect(discoverWorkspace(dir)?.workspaceGlobs).toEqual([]);
  });
});

describe("detectFrameworks", () => {
  function ws(pkgObj: Record<string, unknown> = {}) {
    return (
      discoverWorkspace(dir) ?? {
        root: dir,
        name: "t",
        packageJson: pkgObj,
        workspaceGlobs: [],
      }
    );
  }

  it("reports unknown when nothing detectable", () => {
    pkg({});
    expect(detectFrameworks(ws())).toEqual({ frameworks: [], unknown: true });
  });

  it("detects vitest by config file", () => {
    pkg({});
    writeFileSync(join(dir, "vitest.config.ts"), "");
    expect(detectFrameworks(ws()).frameworks).toEqual(["vitest"]);
  });

  it("detects jest via config json", () => {
    pkg({});
    writeFileSync(join(dir, "jest.config.json"), "{}");
    expect(detectFrameworks(ws()).frameworks).toEqual(["jest"]);
  });

  it("detects jest via package.json key", () => {
    pkg({ jest: { testEnvironment: "node" } });
    expect(detectFrameworks(ws()).frameworks).toEqual(["jest"]);
  });

  it("detects playwright via config", () => {
    pkg({});
    writeFileSync(join(dir, "playwright.config.js"), "");
    expect(detectFrameworks(ws()).frameworks).toEqual(["playwright"]);
  });

  it("adds playwright from deps even without config", () => {
    pkg({ devDependencies: { "@playwright/test": "^1.0.0" } });
    expect(detectFrameworks(ws()).frameworks).toEqual(["playwright"]);
  });

  it("falls back to vitest dep alone", () => {
    pkg({ devDependencies: { vitest: "^2.0.0" } });
    expect(detectFrameworks(ws())).toEqual({
      frameworks: ["vitest"],
      unknown: false,
    });
  });

  it("falls back to jest dep alone", () => {
    pkg({ dependencies: { jest: "^29.0.0" } });
    expect(detectFrameworks(ws())).toEqual({
      frameworks: ["jest"],
      unknown: false,
    });
  });

  it("sorts multiple frameworks deterministically", () => {
    pkg({});
    writeFileSync(join(dir, "playwright.config.ts"), "");
    writeFileSync(join(dir, "vitest.config.mts"), "");
    expect(detectFrameworks(ws()).frameworks).toEqual(["vitest", "playwright"]);
  });
});
