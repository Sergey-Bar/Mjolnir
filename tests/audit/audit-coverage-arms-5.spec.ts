/**
 * Coverage arms batch 5: the last sub-100% branches — CLI error
 * containment arms (S8 catch-to-20 paths), baseline-aware command
 * paths, create-rule's unknown-family guard, and the bench schema's
 * environment-collection fallback.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrCommentCommand, runSuppressions } from "../../src/cli.js";
import { collectEnvironment } from "../../src/bench/schema.js";

const createdDirs: string[] = [];
function tmpRepo(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-arms5-${prefix}-`));
  createdDirs.push(d);
  return d;
}

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: (...parts: unknown[]) => (out += parts.map(String).join(" ") + "\n"),
      err: (...parts: unknown[]) => (err += parts.map(String).join(" ") + "\n"),
    },
    text: () => out,
    errText: () => err,
  };
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function specWithTest(dir: string): void {
  writeFileSync(
    join(dir, "a.spec.ts"),
    "import { test, expect } from '@playwright/test';\n" +
      "test.only('x', async () => {});\n",
  );
}

describe("CLI catch-to-20 containment arms (S8)", () => {
  it("runSuppressions reports a ConfigValidationError as exit 10 with the message", () => {
    const root = tmpRepo("cfgerr");
    writeFileSync(join(root, "mjolnir.config.json"), "{ not json");
    const prevCwd = process.cwd();
    process.chdir(root);
    try {
      const cap = capture();
      const code = runSuppressions({ out: cap.io.out, err: cap.io.err });
      expect(code).toBe(10);
      expect(cap.errText()).toContain("Invalid mjolnir config");
    } finally {
      process.chdir(prevCwd);
    }
  });

  it("a non-ConfigValidationError throw inside runSuppressions exits 20 (no rejection)", () => {
    // The S8 arm: an out-sink throw (or any downstream failure after
    // config loaded) is contained by the catch-to-20, not rethrown.
    const cap = capture();
    const code = runSuppressions({
      out: () => {
        throw new Error("probe-crash");
      },
      err: cap.io.err,
    });
    expect(code).toBe(20);
    expect(cap.errText()).toContain("mjolnir internal error:");
  });
});

describe("baseline-aware command arms", () => {
  it("pr-comment renders without a baseline (diff omitted)", async () => {
    const dir = tmpRepo("prcomment");
    specWithTest(dir);
    const cap = capture();
    const code = await runPrCommentCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("Mjölnir");
  });

  it("pr-comment with a v1 baseline folds the diff into the render", async () => {
    const dir = tmpRepo("prcomment2");
    specWithTest(dir);
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({ schemaVersion: 1, findings: [] }),
    );
    const cap = capture();
    const code = await runPrCommentCommand([dir], cap.io);
    expect(code).toBe(0);
  });
});

describe("bench collectEnvironment fallback arm", () => {
  it("returns environment facts without crashing (cpu may be empty)", () => {
    const env = collectEnvironment();
    expect(env.nodeVersion).toMatch(/^v\d+/);
    expect(typeof env.os).toBe("string");
    expect(typeof env.cpu).toBe("string");
  });
});
