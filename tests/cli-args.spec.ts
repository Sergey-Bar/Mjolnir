/**
 * CLI surface arms not exercised elsewhere: every parseArgs flag branch,
 * sparse-argv robustness, isEntryPoint fallbacks, and the module
 * entry-point block (`process.exitCode = main()`) that only runs when
 * cli.ts itself is the process entry.
 */

import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLI_VERSION,
  fallbackWorkspace,
  isEntryPoint,
  parseArgs,
} from "../src/cli.js";

describe("fallbackWorkspace", () => {
  it("names the workspace after the target directory", () => {
    expect(fallbackWorkspace("/tmp/checkout").name).toBe("checkout");
    expect(fallbackWorkspace("C:\\repo\\app").name).toBe("app");
  });

  it("falls back to the generic name for a filesystem root", () => {
    // basename of a root path is "" — the generic name must take over.
    expect(fallbackWorkspace("C:\\").name).toBe("repo");
    expect(fallbackWorkspace("/").name).toBe("repo");
  });
});

describe("parseArgs flag matrix", () => {
  it("parses --width with a valid column count", () => {
    expect(parseArgs(["--width", "80"])?.width).toBe(80);
  });

  it("rejects --width that is not a finite positive number", () => {
    expect(parseArgs(["--width", "abc"])).toBeNull();
    expect(parseArgs(["--width", "0"])).toBeNull();
    expect(parseArgs(["--width", "-5"])).toBeNull();
    expect(parseArgs(["--width"])).toBeNull();
  });

  it("parses --ascii and --no-ascii overrides", () => {
    expect(parseArgs(["--ascii"])?.ascii).toBe(true);
    expect(parseArgs(["--no-ascii"])?.ascii).toBe(false);
  });

  it("rejects an unknown --tone value", () => {
    expect(parseArgs(["--tone", "loud"])).toBeNull();
    expect(parseArgs(["--tone", "blunt"])?.tone).toBe("blunt");
  });

  it("survives a hole in a sparse argv array without crashing", () => {
    // A hole (not a literal "undefined" element) is the strongest form of
    // the argv[i] ?? "" guard: length says 3, index 1 is absent.
    const sparse: string[] = new Array(3);
    sparse[0] = "--json";
    sparse[2] = "src";
    const args = parseArgs(sparse);
    expect(args).not.toBeNull();
    expect(args?.json).toBe(true);
    expect(args?.target).toBe("src");
  });
});

describe("isEntryPoint", () => {
  const origArgv1: string | undefined = process.argv[1];

  afterEach(() => {
    if (origArgv1 === undefined) {
      delete process.argv[1];
    } else {
      process.argv[1] = origArgv1;
    }
  });

  it("returns false when argv[1] is absent", () => {
    delete process.argv[1];
    expect(isEntryPoint()).toBe(false);
  });

  it("returns false via the realpath fallback for a nonexistent argv[1]", () => {
    // realpathSync throws on the missing path; the string-comparison
    // fallback must answer false, not crash.
    process.argv[1] = "Z:/definitely/not/here/cli.mjs";
    expect(isEntryPoint()).toBe(false);
  });

  it("returns true when argv[1] resolves to this module", () => {
    process.argv[1] = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    expect(isEntryPoint()).toBe(true);
  });
});

describe("module entry-point block", () => {
  it("runs main() and sets process.exitCode when cli.ts is the entry", async () => {
    const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    const origArgv = process.argv;
    const origExitCode = process.exitCode;
    try {
      // --version keeps main() a pure, side-effect-free one-liner.
      process.argv = [process.argv[0] ?? "node", cliPath, "--version"];
      vi.resetModules();
      const fresh = await import("../src/cli.js");
      expect(fresh.CLI_VERSION).toBe(CLI_VERSION);
      expect(process.exitCode).toBe(0);
    } finally {
      process.argv = origArgv;
      process.exitCode = origExitCode;
      vi.resetModules();
    }
  });
});
