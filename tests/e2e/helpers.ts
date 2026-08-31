/**
 * E2E shared helpers: build dist/cli.mjs once, spawn it as a real child
 * process with UTF-8 decoding and pinned ascii output.
 *
 * DIST RACE: parallel workers + package-smoke's clean-rebuild mean dist/
 * can vanish mid-suite (tsdown cleans outDir). All dist consumers go
 * through runCli/ensureDist, which wait for the file to reappear and
 * retry module-not-found failures with backoff.
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export const REPO_ROOT = resolve(import.meta.dirname, "..", "..");
export const DIST = join(REPO_ROOT, "dist", "cli.mjs");

let built = false;

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Wait out any in-flight rebuild, rebuilding ourselves as last resort. */
export function ensureDist(): void {
  if (built && existsSync(DIST)) return;
  const deadline = Date.now() + 120_000;
  while (!existsSync(DIST) && Date.now() < deadline) {
    sleep(200);
  }
  if (!existsSync(DIST)) {
    execSync("npm run build", { cwd: REPO_ROOT, stdio: "pipe" });
  }
  built = true;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  status: number;
}

/** Spawn the built binary. Findings exits are catchable, not throws. */
export function runCli(args: string[], cwd?: string): CliResult {
  ensureDist();
  let last: CliResult | undefined;
  // Up to 3 attempts: a concurrent tsdown clean can make a spawn fail
  // with "Cannot find module" mid-suite.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const stdout = execFileSync("node", [DIST, ...args], {
        cwd,
        encoding: "utf8",
        env: { ...process.env, MJOLNIR_ASCII: "1" },
      });
      return { stdout, stderr: "", status: 0 };
    } catch (err) {
      const e = err as {
        stdout?: string;
        stderr?: string;
        status?: number;
        message?: string;
      };
      last = {
        stdout: e.stdout ?? "",
        stderr: e.stderr ?? "",
        status: e.status ?? 1,
      };
      const moduleMissing = (e.stderr ?? "").includes("Cannot find module");
      if (moduleMissing && attempt < 3) {
        ensureDist();
        sleep(400 * attempt);
        continue;
      }
      return last;
    }
  }
  return last as CliResult;
}

export function git(cwd: string, args: string[]): void {
  execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" });
}
