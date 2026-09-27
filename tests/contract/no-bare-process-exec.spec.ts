/**
 * No bare-name process execution anywhere in `src/` (audit S1).
 *
 * `execFileSync("git", …)` resolves through PATH — including the CWD on
 * Windows, where `CreateProcess` searches the current directory before PATH
 * for extension-less names. Scanning an UNTRUSTED repo therefore let a
 * checked-in `git.exe` / `git.bat` / `git.cmd` hijack Mjölnir's own git
 * invocations: the attacker controlled the diff output, the merge-base
 * decision, `--scope changed`'s "what is new" answer, and the `commit` /
 * `tree` that `bindRepository()` writes into `runIdentity` and the evidence
 * graph. The whole of `src/scope/git-resolve.ts` is the S1 fix; this spec is
 * what stops the class from coming back.
 *
 * The test that catches the actual regression is platform-independent, which
 * this one is: it is a source audit over `src/**`, so it fires on Linux and
 * in CI without a hostile `git.bat` to plant. It is deliberately the same
 * mechanism and the same granularity as
 * `tests/contract/privacy-network-isolation.spec.ts`, which greps `src/` for
 * every network-capable API because Node freezes the `http`/`https`
 * namespaces and a runtime intercept would be a fragile foundation for a
 * trust claim.
 *
 * The runtime proof that the hardening works — a planted `git.bat` inside a
 * scanned repo, on Windows only — is `tests/engine/candidate-binding-hijack.spec.ts`.
 * This spec is the half that runs everywhere.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(import.meta.dirname, "..", "..", "src");

/** The launch APIs, plus the strings whose bare form is the vulnerability. */
const SPAWN_APIS = [
  "execFileSync",
  "execSync",
  "spawnSync",
  "spawn",
  "execFile",
] as const;

/** Bare names a checked-in file could impersonate on Windows. */
const SENSITIVE_BINARIES = ["git", "node", "sh", "bash", "cmd", "powershell"];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".spec.ts")) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("S1 invariant: src/ never executes a bare binary name", () => {
  const files = listSourceFiles(SRC_ROOT);

  it("scanned a non-trivial number of source files (sanity check on the scan itself)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    const rel = file.slice(SRC_ROOT.length + 1).replaceAll("\\", "/");
    it(`src/${rel} launches no process by bare name`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const api of SPAWN_APIS) {
        for (const binary of SENSITIVE_BINARIES) {
          // A bare name is a string LITERAL in first argument position:
          // exec("git", …). A resolved absolute path is a variable
          // (exec(exe, …)) or an absolute literal that cannot be
          // planted relative to the scanned repo.
          const bare = new RegExp(
            `\\b${api}\\(\\s*["'\`]${binary}(?:\\.exe|\\.bat|\\.cmd|\\.sh)?["'\`]`,
          );
          expect(
            bare.test(code),
            `src/${rel} calls ${api}("${binary}", …) — a bare name. On ` +
              `Windows CreateProcess searches the current directory before ` +
              `PATH, so a ${binary}.exe/${binary}.bat checked into an ` +
              `untrusted repo hijacks the call. Resolve an ABSOLUTE path ` +
              `first (src/scope/git-resolve.ts) and pass that.`,
          ).toBe(false);
        }
      }
    });
  }

  it("the resolver every call site must use is the single definition site", () => {
    // One resolution, memoized, never consulting the CWD. If a second
    // implementation appears, the guarantee above is only as strong as the
    // weakest of the two.
    const resolver = readFileSync(
      join(SRC_ROOT, "scope", "git-resolve.ts"),
      "utf8",
    );
    const definitions = stripComments(resolver).match(
      /export function resolveGitPath\(/g,
    );
    expect(definitions).toHaveLength(1);
  });
});
