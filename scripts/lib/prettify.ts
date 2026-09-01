/**
 * Shared Prettier format-in-place helper for the generator scripts
 * (Bug Map M-07): Prettier Node API, per output file. The old
 * `execSync npx prettier --write` + catch-warn pattern made formatting
 * OPTIONAL — an npx failure silently wrote unformatted bytes and the
 * generated-docs-drift gate caught it after the fact. No try/catch: a
 * formatting failure propagates and the process exits non-zero.
 *
 * One shared implementation — the three generators police their
 * artifacts with the same gates, so divergent formatting rules would
 * make generated outputs disagree (review: duplication track).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";

export async function prettify(filepath: string): Promise<void> {
  const config = await resolveConfig(filepath);
  const formatted = await format(readFileSync(filepath, "utf8"), {
    ...config,
    filepath,
  });
  writeFileSync(filepath, formatted);
}
