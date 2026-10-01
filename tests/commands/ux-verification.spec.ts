/**
 * Comprehensive UX verification for all new features.
 */

import { describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runPolicyCommand } from "../../src/commands/policy.js";
import { runAnalyzeCommand } from "../../src/commands/analyze.js";
import { EXIT_CLEAN, EXIT_USAGE, EXIT_INTERNAL } from "../../src/exit-codes.js";

const out = vi.fn();
const err = vi.fn();

let counter = 0;

function makeTempDir(): string {
  counter++;
  const dir = join(tmpdir(), `mjolnir-verify-${counter}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "test-results"), { recursive: true });
  return dir;
}

describe("POLICY (TL-2)", () => {
  it("init creates valid policy file", async () => {
    const dir = makeTempDir();
    const code = await runPolicyCommand(["init", dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    expect(existsSync(join(dir, "mjolnir.policy.json"))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
  it("validate accepts valid policy", async () => {
    const dir = makeTempDir();
    writeFileSync(
      join(dir, "mjolnir.policy.json"),
      JSON.stringify({
        version: 1,
        name: "test",
        gates: {
          requiredRules: [],
          forbiddenSeverities: {},
          maxFindings: null,
          minScore: null,
        },
      }),
    );
    const code = await runPolicyCommand(
      ["validate", join(dir, "mjolnir.policy.json")],
      { out, err },
    );
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("rejects invalid JSON policy", async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "bad.json"), "not-json");
    const code = await runPolicyCommand(["validate", join(dir, "bad.json")], {
      out,
      err,
    });
    expect(code).toBe(EXIT_INTERNAL);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("ANALYZE --cross-file (SDET-7)", () => {
  it("analyzes target directory", () => {
    const dir = makeTempDir();
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "a.ts"), "import { x } from 'lib';\n");
    const code = runAnalyzeCommand([dir, "--cross-file"], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("works without --cross-file", () => {
    const dir = makeTempDir();
    const code = runAnalyzeCommand([dir], { out, err });
    expect(code).toBe(EXIT_CLEAN);
    rmSync(dir, { recursive: true, force: true });
  });
  it("exits usage for non-existent target", () => {
    const code = runAnalyzeCommand(["/nonexistent"], { out, err });
    expect(code).toBe(EXIT_USAGE);
  });
});

describe("EDGE CASES", () => {
  it("analyze handles non-existent dir", () => {
    const code = runAnalyzeCommand(["/nonexistent"], { out, err });
    expect(code).toBe(EXIT_USAGE);
  });
});
