/**
 * Vitest global setup — guarantees dist/cli.mjs exists AND is fresh
 * before any E2E journey or spawned-binary test runs. Parallel vitest
 * workers would otherwise race: each worker building (tsdown cleans
 * outDir) makes dist vanish mid-run for the others. This runs ONCE, in
 * a dedicated process, before any worker.
 *
 * Freshness law (bug-hunt R10+1): an EXISTS-ONLY check shipped a stale
 * bundle silently — dist predated the MCP tool additions, so the
 * spawned stdio binary answered "unknown tool: triage" while the whole
 * suite stayed green. The build now reruns whenever any src/**.ts is
 * newer than the bundle (same class as the generated-docs drift gate).
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";

function newestMtimeUnder(dir: string): number {
  let newest = 0;
  const walk = (d: string): void => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules") continue;
        walk(full);
      } else if (e.isFile() && e.name.endsWith(".ts")) {
        const m = statSync(full).mtimeMs;
        if (m > newest) newest = m;
      }
    }
  };
  walk(dir);
  return newest;
}

export default function setup(): void {
  const root = resolve(import.meta.dirname, "..", "..");
  const dist = join(root, "dist", "cli.mjs");
  if (
    !existsSync(dist) ||
    newestMtimeUnder(join(root, "src")) > statSync(dist).mtimeMs
  ) {
    execSync("npm run build", { cwd: root, stdio: "pipe" });
  }
}
