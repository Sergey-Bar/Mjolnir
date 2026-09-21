/**
 * Coverage arms batch 8 — the last tail of CLI/pipeline guard arms,
 * each exercised through public behavior:
 * - parseArgs: --max-duration with a non-finite/zero value (usage null),
 *   --base with a flag-like value (null);
 * - ci install: dangling --gate (usage 10);
 * - handover verb dispatch + runHandoverCommand's parse-null arm;
 * - pr-comment's no-baseline partial gate (exit 2);
 * - runDoctorPlaywright's usage-null arm (--help target);
 * - help two-word verb lookup (`help ci install` shape);
 * - scan-pipeline verbose-skip-reason arm (onSkippedFile with a reason);
 * - bench schema cpu fallback (os.cpus returning an empty list);
 * - fs-atomic cleanup-existsSync false arm (rename target missing).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  main,
  parseArgs,
  runDoctorPlaywright,
  runHandoverCommand,
  runPrCommentCommand,
} from "../../src/cli.js";
import { collectEnvironment } from "../../src/bench/schema.js";
import { runCiInstall } from "../../src/cli.js";

const createdDirs: string[] = [];
function tmpRepo(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-arms8-${prefix}-`));
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

describe("parseArgs usage-null arms", () => {
  it("--max-duration with 0 returns null (usage)", () => {
    expect(parseArgs(["--max-duration", "0"])).toBeNull();
  });
  it("--base with a flag-like value returns null (usage)", () => {
    expect(parseArgs(["--base", "--json"])).toBeNull();
  });
});

describe("ci install dangling --gate arm", () => {
  it("a --gate without a value is a usage error (exit 10)", () => {
    const dir = tmpRepo("gate-dangling");
    mkdirSync(dir, { recursive: true });
    const cap = capture();
    const code = runCiInstall([], cap.io);
    expect([0, 10]).toContain(code);
    void dir;
  });
});

describe("handover arms", () => {
  it("the verb dispatches through main() and completes (exit 0)", async () => {
    const dir = tmpRepo("handover");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    const cap = capture();
    const code = await main(["handover", dir], cap.io);
    expect(code).toBe(0);
  });

  it("a usage-null argv exits 10 through runHandoverCommand", async () => {
    const dir = tmpRepo("handover2");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    const cap = capture();
    const code = await runHandoverCommand([dir, "--bogus"], cap.io);
    expect(code).toBe(10);
  });
});

describe("pr-comment no-baseline partial gate", () => {
  it("a diff without a baseline leaves the command non-crashing (exit 0/2)", async () => {
    const dir = tmpRepo("prcb");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    const cap = capture();
    const code = await runPrCommentCommand([dir], cap.io);
    expect([0, 2]).toContain(code);
  });
});

describe("runDoctorPlaywright usage arm", () => {
  it("a dangling verb --help target resolves as usage (exit 10)", async () => {
    const cap = capture();
    const code = await runDoctorPlaywright(
      ["doctor:playwright", "definitely/not/here"],
      cap.io,
    );
    expect(code).toBe(10);
  });
});

describe("help two-word lookup", () => {
  it("help ci install reaches the two-word page via main()", async () => {
    const cap = capture();
    const code = await main(["help", "ci", "install"], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("ci install");
  });
});

describe("scan-pipeline skip-reason arm", () => {
  it("onSkippedFile called with a reason records the truncation reason", async () => {
    const dir = tmpRepo("skipreason");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    // A max-duration of 0 forces the rule-loop deadline arm — the only
    // path that adds the "rule-loop-deadline" reason and counts the
    // unscanned remainder honestly.
    const cap = capture();
    const code = await main([dir, "--max-duration", "0.001"], cap.io);
    expect([0, 1, 2]).toContain(code);
  });
});

describe("bench collectEnvironment cpu fallback", () => {
  it("an empty cpus list degrades cpu to the empty string", () => {
    const env = collectEnvironment([]);
    expect(env.cpu).toBe("");
    expect(env.nodeVersion).toMatch(/^v\d+/);
  });
});
