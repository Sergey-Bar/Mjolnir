/**
 * Phase 5 Tier 1 addition: scan determinism across repeated runs of the
 * built binary — byte-identical normalized JSON (extends the in-process
 * output-determinism.spec.ts to the actual dist/cli.mjs child).
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..");
const DIST = join(ROOT, "dist", "cli.mjs");

function normalize(json: string): string {
  const r = JSON.parse(json) as Record<string, unknown>;
  const status = r.analysisStatus as Record<string, unknown> | undefined;
  if (status) delete status.durationMs;
  return JSON.stringify(r);
}

function scanDemo(): { stdout: string; status: number } {
  if (!existsSync(DIST)) {
    execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
  }
  try {
    const stdout = execFileSync(
      "node",
      [DIST, join(ROOT, "examples", "demo-repo"), "--json"],
      { encoding: "utf8", env: { ...process.env, MJOLNIR_ASCII: "1" } },
    );
    return { stdout, status: 0 };
  } catch (err) {
    const e = err as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? "", status: e.status ?? 1 };
  }
}

describe("determinism of the built binary (Phase 2 #7)", () => {
  it(
    "two scans of the demo repo produce byte-identical normalized JSON",
    { timeout: 60_000 },
    () => {
      const a = scanDemo();
      const b = scanDemo();
      expect(a.status).toBe(1);
      expect(b.status).toBe(1);
      expect(normalize(a.stdout)).toBe(normalize(b.stdout));
    },
  );

  it(
    "three consecutive runs match the first run's signature",
    { timeout: 90_000 },
    () => {
      const first = normalize(scanDemo().stdout);
      for (let i = 0; i < 2; i++) {
        expect(normalize(scanDemo().stdout)).toBe(first);
      }
    },
  );
});
