/**
 * Coverage arms batch 5: the last sub-100% branches — CLI error
 * containment arms (S8 catch-to-20 paths), baseline-aware command
 * paths, create-rule's unknown-family guard, and the bench schema's
 * environment-collection fallback.
 */

import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  runBaselineCommand,
  runDiffCommand,
  runPrCommentCommand,
  runSuppressions,
} from "../../src/cli.js";
import { createRuleScaffold } from "../../src/commands/create-rule.js";
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

describe("create-rule unknown-family guard", () => {
  it("a structurally-valid but unregistered family ID is rejected", () => {
    // QA-ZZ-001 passes the CLI's loose /^QA-[A-Z]+-\d{3}$/ gate but has
    // no registered family — parseId's `!family` null-guard fires.
    const result = createRuleScaffold(
      { id: "QA-ZZ-001", title: "t" },
      tmpRepo("fam"),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Invalid rule ID");
  });
});

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
  it("baseline diff with a schemaVersion-2 baseline degrades to no-baseline", async () => {
    const dir = tmpRepo("v2baseline");
    specWithTest(dir);
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({ schemaVersion: 2, findings: [] }),
    );
    const cap = capture();
    const code = await runDiffCommand([dir], cap.io);
    // Exit 2 = partial/unusable-diff verdict: the v2 baseline degraded
    // to "no baseline", and a diff without a comparison point must not
    // report a clean bill (the honest-degrade contract, not a crash).
    expect(code).toBe(2);
    expect(cap.text() + cap.errText()).toContain("no baseline");
  });

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

describe("currentCommit degrade arm (S1 lineage)", () => {
  it("a baseline save outside a git repo still completes (commit degrades)", async () => {
    const dir = tmpRepo("nogit");
    specWithTest(dir);
    const cap = capture();
    const code = await runBaselineCommand([dir], cap.io);
    expect(code).toBe(0);
    // The saved file records commit "unknown" — git was unavailable.
    const saved = JSON.parse(
      readFileSync(join(dir, ".mjolnir", "baseline.json"), "utf8"),
    ) as { commit?: string };
    expect(saved.commit).toBe("unknown");
  });
});

describe("bench collectEnvironment fallback arm", () => {
  it("returns environment facts without crashing (cpu may be empty)", () => {
    const env = collectEnvironment();
    expect(env.nodeVersion).toMatch(/^v\d+/);
    expect(typeof env.os).toBe("string");
    expect(typeof env.cpu).toBe("string");
  });

  it("read-only target: baseline save reports failure honestly, not silently", async () => {
    if (process.platform === "win32") return; // POSIX-only arm; skip here
    const dir = tmpRepo("ro-save");
    specWithTest(dir);
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    chmodSync(join(dir, ".mjolnir"), 0o555);
    const cap = capture();
    const code = await runBaselineCommand([dir], cap.io);
    chmodSync(join(dir, ".mjolnir"), 0o755);
    expect(code).toBe(1);
    expect(cap.errText() + cap.text()).toContain("FAILED");
  });
});
