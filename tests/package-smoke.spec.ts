/**
 * Package publish integrity smoke test (Test Hardening Plan, P0 #2).
 *
 * Every other test in this suite runs against source via tsx/vitest — none
 * of them exercise the actual thing a stranger receives when they run
 * `npx qa-doctor@latest`: the built `dist/` output, packed exactly as npm
 * would pack it, executed as a real child process with no source tree or
 * test harness underneath it. Bugs in `files`, `bin`, or the built
 * entry-point's own self-invocation guard are invisible to unit tests and
 * fatal to a first-run user — this is the one test class that catches them.
 */

import { execFileSync, execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");

let workDir: string;
let pkgDir: string;
let pkgJson: {
  bin: Record<string, string | undefined>;
  dependencies?: Record<string, string>;
  files?: string[];
};
let binPath: string;

beforeAll(() => {
  // Build fresh — a stale dist/ from a previous run would hide exactly the
  // class of bug this test exists to catch.
  execSync("npm run build", { cwd: ROOT, stdio: "pipe" });

  workDir = mkdtempSync(join(tmpdir(), "qa-doctor-pack-"));

  const packOut = execSync(`npm pack --pack-destination "${workDir}" --json`, {
    cwd: ROOT,
  }).toString();
  const packResult = (JSON.parse(packOut) as Array<{ filename: string }>)[0];
  if (!packResult) throw new Error("npm pack produced no output entry");
  const { filename } = packResult;

  // `tar` ships on every CI runner (Linux, macOS, Windows 10+) — avoids
  // pulling in an npm-package unzip dependency just for this test.
  // Run tar with cwd=workDir and a RELATIVE archive name: GNU tar needs
  // --force-local for absolute "C:\..." paths, but Windows' bundled bsdtar
  // doesn't support that flag at all. A relative path sidesteps both.
  execFileSync("tar", ["-xzf", filename, "-C", "."], { cwd: workDir });
  pkgDir = join(workDir, "package");

  pkgJson = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  const binEntry = pkgJson.bin.mjolnir;
  if (!binEntry) throw new Error("package.json has no mjolnir bin entry");
  binPath = join(pkgDir, binEntry);

  // Give the packed CLI its runtime dependencies without a network install
  // (a real `npm install qa-doctor` would fetch these from `dependencies`).
  // We COPY rather than symlink: symlink behavior differs across platforms
  // and CI filesystems (junctions are Windows-only; macOS temp dirs may
  // reject dir symlinks), and a silently-broken link makes the CLI crash
  // with empty stdout — exactly the failure this test exists to catch.
  // Transitive deps are resolved recursively from the ROOT node_modules
  // (npm hoists them flat): ts-morph needs @ts-morph/*, which needs
  // minimatch, etc. A real install would do this; we replicate it.
  mkdirSync(join(pkgDir, "node_modules"), { recursive: true });
  const copied = new Set<string>();
  const copyDep = (dep: string): void => {
    if (copied.has(dep)) return;
    copied.add(dep);
    const src = join(ROOT, "node_modules", dep);
    const dest = join(pkgDir, "node_modules", dep);
    if (!existsSync(src)) return;
    cpSync(src, dest, { recursive: true, dereference: true });
    let deps: Record<string, unknown>;
    try {
      const pkg = JSON.parse(
        readFileSync(join(src, "package.json"), "utf8"),
      ) as { dependencies?: Record<string, unknown> };
      deps = pkg.dependencies ?? {};
    } catch {
      return;
    }
    for (const sub of Object.keys(deps)) copyDep(sub);
  };
  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    copyDep(dep);
  }
}, 60_000);

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("published tarball contents", () => {
  it("packs every path declared in package.json's files list", () => {
    for (const declared of pkgJson.files as string[]) {
      const packedPath = join(pkgDir, declared);
      expect(
        existsSync(packedPath),
        `package.json "files" declares "${declared}" but it was not packed ` +
          `into the tarball — either the file is missing from the repo, or ` +
          `.npmignore/files config is excluding it silently.`,
      ).toBe(true);
    }
  });

  it("the declared bin entry exists in the tarball", () => {
    expect(
      existsSync(binPath),
      `package.json "bin" points to "${pkgJson.bin["qa-doctor"]}", which ` +
        `is not present in the packed tarball.`,
    ).toBe(true);
  });

  it("includes CHANGELOG.md (Sprint 0 Task 2)", () => {
    expect(
      existsSync(join(pkgDir, "CHANGELOG.md")),
      "CHANGELOG.md must ship in the published tarball so upgraders can " +
        "see what changed between versions — it was previously " +
        "git-ignored and would have been silently absent.",
    ).toBe(true);
  });

  it("excludes dev artifacts not declared in 'files' (Sprint 1 Task 8)", () => {
    // Checked against a fresh `npm pack --dry-run` listing rather than
    // the shared pkgDir fixture above: that fixture's beforeAll copies
    // node_modules into pkgDir *after* extraction (to run the CLI
    // without a network install), which would make a node_modules
    // check here a false positive unrelated to what npm actually packs.
    const dryRunOut = execSync("npm pack --dry-run --json", {
      cwd: ROOT,
    }).toString();
    const [dryRunResult] = JSON.parse(dryRunOut) as Array<{
      files: Array<{ path: string }>;
    }>;
    const packedPaths = (dryRunResult?.files ?? []).map((f) => f.path);

    const forbiddenPrefixes = [
      "scratch/",
      "coverage/",
      "node_modules/",
      "tests/",
      ".git/",
      "docs/",
      ".planning/",
    ];
    for (const prefix of forbiddenPrefixes) {
      const leaked = packedPaths.filter((p) => p.startsWith(prefix));
      expect(
        leaked,
        `published tarball would contain path(s) under "${prefix}", ` +
          `which is not in package.json's "files" whitelist — dev/debug ` +
          `artifacts must not ship to every install: ${leaked.join(", ")}`,
      ).toEqual([]);
    }
  });
});

describe("published CLI as a real child process", () => {
  it("running the bin entry directly (as npx would) prints help text", () => {
    // --help is documented as a usage path (exit 10, same as any unknown
    // flag) — see printUsage()'s own "Exit codes" line — so this only
    // asserts real output, not a 0 exit.
    let out: string;
    try {
      out = execFileSync("node", [binPath, "--help"], {
        cwd: pkgDir,
        stdio: "pipe",
      }).toString();
    } catch (err) {
      const e = err as { stdout?: unknown; stderr?: unknown };
      // --help exits 10 by contract (usage path), so a throw here is
      // expected — what matters is that the CLI produced real output.
      // If it somehow produced nothing, surface stderr for diagnosis.
      out = String(e.stdout ?? "");
      if (out.length === 0) {
        throw new Error(
          `packed CLI produced no output: stderr=${String(e.stderr ?? "")}`,
          { cause: err },
        );
      }
    }
    expect(
      out.length,
      "the packed CLI produced no output at all when invoked as a binary " +
        "— this is what a first-time `npx mjolnir-qa@latest` user would see: " +
        "nothing.",
    ).toBeGreaterThan(0);
    expect(out).toContain("mjolnir");
    expect(out).toContain("Usage:");
  });

  it("scanning a real fixture repo produces the documented score banner", () => {
    const fixtureDir = mkdtempSync(join(tmpdir(), "qa-doctor-smoke-fixture-"));
    try {
      mkdirSync(join(fixtureDir, "e2e"), { recursive: true });
      execFileSync("node", [
        "-e",
        `require("fs").writeFileSync(${JSON.stringify(
          join(fixtureDir, "e2e", "checkout.spec.ts"),
        )}, "import { test, expect } from '@playwright/test';\\ntest('checkout', async ({ page }) => {\\n  await page.waitForTimeout(3000);\\n  expect(true).toBe(true);\\n});\\n")`,
      ]);

      // The fixture deliberately trips an error-level finding, so the CLI
      // exits 1 by contract (§ Exit codes) — that's success for this test,
      // not a crash, so the non-zero exit must not be treated as a throw.
      let result = "";
      try {
        result = execFileSync("node", [binPath, fixtureDir], {
          cwd: pkgDir,
        }).toString();
      } catch (err) {
        result = String((err as { stdout?: unknown }).stdout ?? "");
      }

      expect(result).toMatch(/WORTHINESS|score/);
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it("an unknown flag exits with the documented usage-error code (10)", () => {
    expect.assertions(1);
    try {
      execFileSync("node", [binPath, "--this-flag-does-not-exist"], {
        cwd: pkgDir,
      });
    } catch (err) {
      expect((err as { status: number }).status).toBe(10);
    }
  });
});
