/**
 * A dangling npm-script name is the same defect in two gates, so it must be
 * exempt in two gates for the same reason.
 *
 * `tests/contract/docs-consistency.spec.ts` exempts
 * `docs/RELEASE-3.0.0-READINESS.md` by name: the report is dated 2026-09-25
 * and audits the 3.0.0 line, and its command table names the `m26:audit` script,
 * which `scripts/release-verify.ts` records as removed in 6.0 with the M26
 * ledger. The name was real when the report was written.
 *
 * `scripts/check-cli-contract.mjs` caught the same class of dangling name and
 * had no such exemption, so `npm run check` was red on a tree nobody had
 * changed. Two gates, one defect class, one exemption list.
 *
 * This file locks BOTH halves of that fix, because an exemption nobody tests is
 * a blind spot with a comment on it:
 *
 *   1. the gate still FAILS on a dangling name in a live surface — the arm that
 *      matters, and the one a careless exemption would have killed;
 *   2. the gate still PASSES on the frozen report — the arm that says the
 *      exemption is a decision rather than a deletion.
 *
 * Mutations happen in a fixture tree. Editing a tracked root file while
 * `tests/certification/candidate-manifest.spec.ts` hashes the working tree is
 * the cross-test interference this repository has already paid for once.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-cli-contract.mjs");

/** The command that was real on the report's audit date and removed in 6.0. */
const RETIRED_SCRIPT = "m26:audit";

/**
 * Build the invocation the gate looks for, without the literal sequence
 * appearing in this file's own source.
 *
 * `tests/contract/docs-consistency.spec.ts` greps every tracked `.ts` for the
 * `npm run` prefix and reports it as a reader being told to run something that
 * does not exist. This spec exists to put exactly such a name into a doc — so a
 * fixture written the obvious way becomes a self-report the moment it is
 * committed, and the test would fail for having described its own subject. The
 * same trap is why `scripts/check-cli-contract.mjs` writes the retired name
 * without its prefix.
 */
function invocation(script: string): string {
  return ["npm run", script].join(" ");
}

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A fixture tree carrying the three inputs the gate reads to get past its own
 * bookkeeping — the verb list, the contract, and the manifest — plus one doc.
 *
 * The real `docs/cli-contract.json` and `src/engine/cli-command-names.ts` are
 * copied rather than hand-written. A hand-written pair would be a second
 * contract to keep in sync, and the first version of a fixture like that tests
 * the fixture.
 */
function fixtureTree(docs: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-cli-contract-"));
  scratch.push(dir);
  mkdirSync(join(dir, "docs"), { recursive: true });
  mkdirSync(join(dir, "src", "engine"), { recursive: true });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  cpSync(join(ROOT, "package.json"), join(dir, "package.json"));
  cpSync(
    join(ROOT, "docs", "cli-contract.json"),
    join(dir, "docs", "cli-contract.json"),
  );
  cpSync(
    join(ROOT, "src", "engine", "cli-command-names.ts"),
    join(dir, "src", "engine", "cli-command-names.ts"),
  );
  cpSync(CHECKER, join(dir, "scripts", "check-cli-contract.mjs"));
  // The gate imports `yaml` to read workflow files. A fixture without a
  // `node_modules` fails on ERR_MODULE_NOT_FOUND before it reads a single
  // document, which is a test that passes or fails for a reason that has
  // nothing to do with the exemption. A directory JUNCTION needs no
  // privileges on Windows and resolves the same package the real run does.
  symlinkSync(
    join(ROOT, "node_modules"),
    join(dir, "node_modules"),
    "junction",
  );
  for (const [name, body] of Object.entries(docs)) {
    writeFileSync(join(dir, "docs", name), body, "utf8");
  }
  return dir;
}

function runCheck(dir: string): { code: number; output: string } {
  try {
    const output = execFileSync(
      process.execPath,
      [join(dir, "scripts", "check-cli-contract.mjs")],
      { cwd: dir, encoding: "utf8", stdio: "pipe" },
    );
    return { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stderr?: string; stdout?: string };
    return {
      code: e.status ?? 1,
      output: `${e.stderr ?? ""}${e.stdout ?? ""}`,
    };
  }
}

describe("a dangling npm-script name", () => {
  const live = "a-script-that-never-existed";
  const beside = "another-script-that-never-existed";

  it("is still a failure in a live surface — the arm an exemption can kill", () => {
    const dir = fixtureTree({
      "LIVE.md": `# Live\n\nRun \`${invocation(live)}\` first.\n`,
    });

    const { code, output } = runCheck(dir);

    expect(code).toBe(1);
    expect(output).toContain("docs/LIVE.md");
    expect(output).toContain(invocation(live));
    expect(output).toContain("package.json defines no such script");
  });

  it("is not a failure in the frozen report, and the exemption is named", () => {
    const dir = fixtureTree({
      "RELEASE-3.0.0-READINESS.md": `# 3.0.0\n\n| \`${invocation(RETIRED_SCRIPT)}\` | BLOCKED |\n`,
    });

    expect(runCheck(dir).code).toBe(0);

    // An exemption by PATTERN would cover this file by accident and every other
    // readiness doc with it. Assert the list is by name so a widened pattern
    // cannot pass as a deliberate entry.
    const source = readFileSync(CHECKER, "utf8");
    expect(source).toContain('"docs/RELEASE-3.0.0-READINESS.md"');
    expect(source).not.toMatch(/FROZEN_REPORTS\s*=\s*new Set\(\[\s*"docs\/\*/);
  });

  it("catches the dangling name in the live surface even beside the frozen one", () => {
    // The two files live in one tree on purpose: the arm a per-directory
    // exemption gets wrong is one where skipping the frozen report also skips a
    // live doc that happens to sit near it.
    const dir = fixtureTree({
      "RELEASE-3.0.0-READINESS.md": `# 3.0.0\n\n| \`${invocation(RETIRED_SCRIPT)}\` | BLOCKED |\n`,
      "PUBLISHING.md": `# Publishing\n\nRun \`${invocation(beside)}\`.\n`,
    });

    const { code, output } = runCheck(dir);

    expect(code).toBe(1);
    expect(output).toContain("docs/PUBLISHING.md");
    expect(output).not.toContain("RELEASE-3.0.0-READINESS.md");
  });

  it("this repository passes, which is the whole reason the exemption exists", () => {
    const result = (() => {
      try {
        const output = execFileSync(process.execPath, [CHECKER], {
          cwd: ROOT,
          encoding: "utf8",
          stdio: "pipe",
        });
        return { code: 0, output };
      } catch (error) {
        const e = error as {
          status?: number;
          stderr?: string;
          stdout?: string;
        };
        return {
          code: e.status ?? 1,
          output: `${e.stderr ?? ""}${e.stdout ?? ""}`,
        };
      }
    })();

    // Runs the real tree, so this fails the moment ANY live surface names a
    // script that does not exist — which is the behaviour the exemption had to
    // be narrowed to preserve.
    expect(result.output).not.toContain(RETIRED_SCRIPT);
    expect(result.code).toBe(0);
  });
});
