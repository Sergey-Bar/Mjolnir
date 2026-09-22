/**
 * Entry-point guard for generator scripts (shared helper).
 *
 * Two generator scripts (`generate-capability-matrix.ts`,
 * `generate-fp-audit-table.ts`) historically executed their write path
 * at module scope. That made every `import` of the module — including
 * the drift-lock specs under vitest — REGENERATE the artifacts as a
 * side effect of running tests, occasionally leaving unformatted bytes
 * on disk mid-session (observed twice: the Phase 0.5 session and the
 * Phase 1 tier codemod). Guarding the write path on "is this module the
 * process entry point" means only the npm scripts (`tsx scripts/….ts`)
 * write; spec imports are pure.
 *
 * Same discipline as src/cli.ts's isEntryPoint: realpathSync on both
 * sides makes the comparison symlink-agnostic (macOS /var/folders),
 * falling back to a literal URL comparison if realpath throws. Extracted
 * here rather than imported from cli.ts so the generator scripts stay
 * independent of the CLI bundle.
 */
import { realpathSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

export function isMainModule(importMetaUrl: string): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(argv1);
  } catch {
    return importMetaUrl === pathToFileURL(argv1).href;
  }
}
