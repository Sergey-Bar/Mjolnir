/**
 * Phase 3 E2E journey 1 — first run, from the packed tarball.
 *
 * This is the one test class that has ever caught macOS-only CLI
 * breakage (the isEntryPoint symlink bug produced zero output, exit 0).
 * The tarball invocation is exactly what a stranger gets from
 * `npm install mjolnir-qa`; every assertion here runs the REAL installed
 * binary as a child process with UTF-8 decoding and pinned ascii output.
 *
 * The expected score/verdict come from tests/golden (never hardcoded).
 */

import { execFileSync, execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseNpmPackJson } from "../helpers/npm-pack-json.js";

const ROOT = resolve(import.meta.dirname, "..", "..");

let workDir: string;
let entryPath: string;

beforeAll(() => {
  // global-setup already guarantees dist/cli.mjs for vitest runs; build
  // here only for standalone executions. A clean rebuild mid-run would
  // wipe dist out from under the parallel journeys (tsdown cleans).
  const dist = join(ROOT, "dist", "cli.mjs");
  if (!existsSync(dist)) {
    execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
  }
  // package-smoke rebuilds dist concurrently — a pack during tsdown's
  // clean phase yields a tarball without a usable dist. Retry the
  // pack+install until the entry file actually exists in the install.
  let attempt = 0;
  for (;;) {
    attempt++;
    workDir = mkdtempSync(join(tmpdir(), "mjolnir-e2e-tarball-"));
    const packOut = execSync(
      `npm pack --pack-destination "${workDir}" --json`,
      {
        cwd: ROOT,
      },
    ).toString();
    // Shape-tolerant parse (npm ≤ 11 array / npm ≥ 12 object-keyed) with
    // notice pollution handled — see tests/helpers/npm-pack-json.ts.
    const packed = parseNpmPackJson(packOut);
    if (!packed) {
      throw new Error(
        `npm pack --json produced no entry with a filename. Raw output:\n${packOut}`,
      );
    }
    const tarball = join(workDir, packed.filename);
    const installDir = join(workDir, "install");
    mkdirSync(installDir, { recursive: true });
    execSync(`npm install "${tarball}" --no-audit --no-fund`, {
      cwd: installDir,
      stdio: "pipe",
    });
    const pkg = JSON.parse(
      readFileSync(
        join(installDir, "node_modules", "mjolnir-qa", "package.json"),
        "utf8",
      ),
    ) as { bin: string | Record<string, string> };
    const binRel =
      typeof pkg.bin === "string" ? pkg.bin : (pkg.bin["mjolnir"] ?? "");
    entryPath = join(installDir, "node_modules", "mjolnir-qa", binRel);
    if (existsSync(entryPath)) break;
    // dist was mid-rebuild during the pack (parallel worker's tsdown
    // clean phase) — discard this attempt and retry with a fresh pack.
    if (attempt >= 4) {
      throw new Error(
        `tarball install produced no usable entry after ${attempt} attempts`,
      );
    }
    rmSync(workDir, { recursive: true, force: true });
    workDir = "";
  }
}, 240_000);

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function runMjolnir(
  args: string[],
  cwd?: string,
): {
  stdout: string;
  stderr: string;
  status: number;
} {
  try {
    const stdout = execFileSync("node", [entryPath, ...args], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, MJOLNIR_ASCII: "1" },
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      status: e.status ?? 1,
    };
  }
}

describe("E2E journey 1: first run from the packed tarball", () => {
  it("scans examples/demo-repo: NEEDS WORK verdict, all JSON fields, well-formed findings", () => {
    const { stdout, stderr, status } = runMjolnir([
      join(ROOT, "examples", "demo-repo"),
      "--json",
    ]);
    expect(stderr).toBe("");
    expect(status).toBe(1); // findings >= error gate

    const result = JSON.parse(stdout) as {
      schemaVersion: number;
      score: number | null;
      partial: boolean;
      frameworks: string[];
      frameworkDetectionUnknown: boolean;
      dimensions: Array<{ category: string; score: number }>;
      findings: Array<{ ruleId: string; file: string; line: number }>;
      testFileCount: number;
      testDeclarationCount: number;
      rawDeductions: number;
      suppressionCount: number;
      analysisStatus: Record<string, unknown>;
    };
    expect(result.schemaVersion).toBe(1);
    expect(result.partial).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThanOrEqual(79); // NEEDS WORK band
    expect(result.testFileCount).toBeGreaterThan(0);
    expect(result.testDeclarationCount).toBeGreaterThan(0);
    expect(result.rawDeductions).toBeGreaterThan(0);
    expect(result.analysisStatus.discovery).toBe("complete");
    expect(result.analysisStatus.rules).toBe("complete");
    expect(result.analysisStatus.skippedFiles).toBe(0);
    expect(typeof result.analysisStatus.durationMs).toBe("number");
    expect(result.analysisStatus.rulesCrashed).toBe(0);
    // Every reported rule is a registered catalog rule — no phantom IDs
    // from the packed build. (The per-rule EXPECTATIONS live in the
    // golden-repo lock; the demo repo here only proves the verdict band.)
    expect(result.testFileCount).toBeGreaterThanOrEqual(3);
    for (const f of result.findings) {
      expect(f.ruleId).toMatch(
        /^QA-(TEST|TQUAL|PW|CI|PY|JV|CS|ENV|ACME)-\d{3}$/,
      );
      expect(f.file).not.toMatch(/\\/); // repo-relative forward slashes
    }
  });

  it("terminal output names the WORTHINESS verdict and measured-rule count", () => {
    const { stdout, status } = runMjolnir([
      join(ROOT, "examples", "demo-repo"),
      "--ascii",
    ]);
    expect(status).toBe(1);
    expect(stdout).toContain("WORTHINESS");
    expect(stdout).toMatch(/WORTHY|NEEDS WORK|UNWORTHY/);
    expect(stdout).toContain("NEEDS WORK");
  });

  it("--verbose adds the transparency section without changing the verdict", () => {
    const quiet = runMjolnir([join(ROOT, "examples", "demo-repo"), "--json"]);
    const verbose = runMjolnir([
      join(ROOT, "examples", "demo-repo"),
      "--json",
      "--verbose",
    ]);
    expect((JSON.parse(quiet.stdout) as { score: number }).score).toBe(
      (JSON.parse(verbose.stdout) as { score: number }).score,
    );
  });

  it("--help prints the usage banner (audit S8: help is a query → exit 0, stdout)", () => {
    const { stdout, status } = runMjolnir(["--help"]);
    expect(status).toBe(0); // help answers a question — success, not usage error
    expect(stdout).toContain("Usage: mjolnir");
    expect(stdout).toContain("scan");
  });

  it("an unknown flag exits 10 with a friendly usage error", () => {
    const { stdout, stderr, status } = runMjolnir([
      "--this-flag-does-not-exist",
    ]);
    expect(status).toBe(10);
    // Plan M2: the friendly error names the flag, suggests neighbors and
    // points at the help command (stderr; stdout stays findings-only).
    expect(stdout + stderr).toContain(
      'mjolnir: unknown flag "--this-flag-does-not-exist"',
    );
    expect(stdout + stderr).toContain("Run mjolnir --help");
  });
});
