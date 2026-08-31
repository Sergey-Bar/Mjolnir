/**
 * Vitest global setup — guarantees dist/cli.mjs exists before any E2E
 * journey spawns it. Parallel vitest workers would otherwise race: each
 * worker building (tsdown cleans outDir) makes dist vanish mid-run for
 * the others. This runs ONCE, in a dedicated process, before any worker.
 */

import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";

export default function setup(): void {
  const root = resolve(import.meta.dirname, "..", "..");
  const dist = join(root, "dist", "cli.mjs");
  if (!existsSync(dist)) {
    execSync("npm run build", { cwd: root, stdio: "pipe" });
  }
}
