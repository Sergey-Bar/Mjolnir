/**
 * Vitest global teardown — guarantees dist/cli.mjs exists at the end so
 * a later `npm test` run never races a missing build.
 */
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";

export default function teardown(): void {
  const root = resolve(import.meta.dirname, "..", "..");
  if (!existsSync(join(root, "dist", "cli.mjs"))) {
    execSync("npm run build", { cwd: root, stdio: "pipe" });
  }
}
