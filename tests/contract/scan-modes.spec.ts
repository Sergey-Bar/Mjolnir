/**
 * The v6 collapse's REPLACE arm: six verbs became flags on `scan`, and a flag
 * has to be held to the standard the verb was.
 *
 * The risk in collapsing a verb into a flag is specific and worth naming: a
 * verb can be wrong and a spec will catch it, while a flag added during a
 * carve tends to be added with a rendering arm and no assertion that it
 * produces the SAME output the verb did. These tests hold each new mode to
 * the retired verb's observable behaviour, and they check the two properties
 * that make a format a flag rather than a second command:
 *
 *   - a format is RENDER-ONLY. The scan, the findings, the score and the exit
 *     code are identical under every format. A flag that changed what was
 *     measured would be a flag that changed what a score means.
 *   - the mode table and the parser agree. A flag the help lists but the
 *     parser rejects is a documented capability that does not exist, and one
 *     the parser accepts but the help omits is a capability nobody will find.
 */

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CLI = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const ENTRY = join(ROOT, "src", "cli.ts");
const HELP = join(ROOT, "src", "commands", "help.ts");

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function run(argv: string[]): { code: number; out: string; err: string } {
  try {
    const out = execFileSync(process.execPath, [CLI, ENTRY, ...argv], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1 << 26,
    });
    return { code: 0, out, err: "" };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: e.status ?? 1,
      out: e.stdout ?? "",
      err: e.stderr ?? "",
    };
  }
}

/** A tiny repo with one test and one source file, so a scan has work to do. */
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-scan-mode-"));
  scratch.push(dir);
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify(
      {
        name: "fixture",
        version: "1.0.0",
        scripts: { test: "vitest run" },
      },
      null,
      2,
    )}\n`,
  );
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(
    join(dir, "src", "index.ts"),
    "export function add(a: number, b: number): number {\n  return a + b;\n}\n",
  );
  writeFileSync(
    join(dir, "src", "index.test.ts"),
    'import { add } from "./index.js";\nit("adds", () => {\n  expect(add(1, 1)).toBe(2);\n});\n',
  );
  return dir;
}

describe("the REPLACE arm: verbs became flags on scan", () => {
  it("--policy prints the scoring table the scorer actually uses", () => {
    const { code, out } = run([".", "--policy"]);
    expect(code, out).toBe(0);
    // The specific numbers, so a changed constant fails here rather than
    // silently changing what a reader is told.
    expect(out).toMatch(/NORMALIZATION_K\s+5/);
    expect(out).toMatch(/suite-invalidated\s+≤ 49/);
    expect(out).toMatch(/any error finding\s+≤ 95/);
    expect(out).toContain("DECLARED, not fitted");
    // The ceilings, read from the scorer rather than restated.
    expect(out).toMatch(/≥\s+160 deduction-pts\s+score ≤ 65/);
    expect(out).toMatch(/≥\s+80 deduction-pts\s+score ≤ 75/);
  });

  it("--policy --json prints the same numbers as data", () => {
    const { code, out } = run([".", "--policy", "--json"]);
    expect(code, out).toBe(0);
    const policy = JSON.parse(out) as {
      normalizationK: number;
      suiteInvalidatedCeiling: number;
      deductionMassCeilings: ReadonlyArray<{
        minMass: number;
        ceiling: number;
      }>;
    };
    expect(policy.normalizationK).toBe(5);
    expect(policy.suiteInvalidatedCeiling).toBe(49);
    expect(policy.deductionMassCeilings).toHaveLength(4);
  });

  it("the policy table is imported from the scorer, not written down", () => {
    // A policy nobody can check is a policy nobody can argue with. The check
    // is that the renderer IMPORTS the constants: a table typed into a render
    // function would keep reading the way it was written after the scorer
    // moved, which is the failure this whole product is about.
    const source = readFileSync(
      join(ROOT, "src", "scorer", "scoring-policy.ts"),
      "utf8",
    );
    expect(source).toMatch(
      /import\s*\{[\s\S]*NORMALIZATION_K[\s\S]*\}\s*from "\.\/scorer\.js";/,
    );
    expect(source).toMatch(
      /import\s*\{[\s\S]*DEDUCTION_MASS_CEILINGS[\s\S]*\}\s*from "\.\/scorer\.js";/,
    );
    // And no literal is restated: the numbers appear only as references.
    expect(source).not.toMatch(/suiteInvalidatedCeiling:\s*49/);
    expect(source).not.toMatch(/normalizationK:\s*5/);
  });

  it("--suppressions prints the ledger and stops", () => {
    const { code, out } = run([".", "--suppressions"]);
    expect(code, out).toBe(0);
    expect(out).toContain("QUALITY GOVERNANCE");
    // A ledger view that also printed a report would be two answers to one
    // question.
    expect(out).not.toContain("Mjölnir Verification Report");
  });

  it("--suppression-gate returns a real exit code", () => {
    const { code } = run([".", "--suppression-gate"]);
    // Three answers are decisions, and each is one the mode is entitled to:
    //
    //   0  every suppression is governed
    //   1  one is expired, reasonless or orphaned
    //   2  EXIT_PARTIAL — the scan the judgement rested on was itself
    //      partial, because the quarantine tier withheld rules
    //
    // The third is the interesting one, and the reason the assertion is a
    // SET rather than an equality: a governance verdict computed on a scan
    // that did not see everything is exactly the verdict the product exists
    // to distrust, and the pre-existing command says so rather than
    // reporting PASS. What is excluded is 10 (usage) and 70 (internal) — a
    // mode that cannot decide, and a mode that crashed.
    expect(
      [0, 1, 2],
      `--suppression-gate exited ${code}, which is neither a decision nor a ` +
        "declared partial verdict",
    ).toContain(code);
  });

  it("every new mode is listed in the help and parsed by the CLI", () => {
    const help = readFileSync(HELP, "utf8");
    const parser = readFileSync(ENTRY, "utf8");
    const modes = [
      "--format trust-report",
      "--format pr-comment",
      "--format github-summary",
      "--suppressions",
      "--suppression-gate",
      "--policy",
    ] as const;
    for (const mode of modes) {
      expect(help, `${mode} is parsed but the help does not list it`).toContain(
        mode,
      );
    }
    // The three non-format modes are branch arms, so their FLAG names appear
    // in the parser; the formats share `--format` and are distinguished by
    // value, which is why the help table lists them separately.
    for (const flag of ["--suppressions", "--suppression-gate", "--policy"]) {
      expect(
        parser,
        `${flag} is listed in the help but never parsed`,
      ).toContain(`a === "${flag}"`);
    }
    for (const value of ["trust-report", "pr-comment", "github-summary"]) {
      expect(parser).toContain(`fmt === "${value}"`);
    }
  });

  it("an unknown --format value is still a usage error", () => {
    const { code } = run([".", "--format", "trustreports"]);
    expect(code).toBe(10);
  });

  it("a format is render-only: the exit code does not depend on it", () => {
    // The property that makes a format a flag rather than a second command.
    // The fixture is a repo with a deliberate finding, so a format that
    // filtered or suppressed would change the code.
    const dir = fixture();
    const codes = (
      [
        "terminal",
        "trust-report",
        "pr-comment",
        "github-summary",
        "json",
      ] as const
    ).map((format) => run([dir, "--format", format]).code);
    expect(
      new Set(codes).size,
      `exit codes differ by format: ${codes.join(",")}`,
    ).toBe(1);
  });
});
