/**
 * Shared example-fixture selection for `mjolnir explain` (explain.ts)
 * and the generated rule docs (rule-docs.ts) — one chooser so both
 * surfaces always show the same example for the same rule. Extracted
 * after the same bug-audit L9 fix had to be applied to both verbatim
 * copies: duplicated fixture selection drifts, and a drift means
 * `mjolnir explain <ID>` contradicts docs/rules/<ID>.md.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * First (byte-stable) fixture file in a must-fire / must-not-fire
 * directory, or null when the directory is absent or empty.
 */
export function firstFixtureFile(dir: string): string | null {
  if (!existsSync(dir)) return null;
  // Bug-audit L9: raw readdirSync order is machine-dependent — sorting
  // keeps the chosen example (and generated docs) byte-stable.
  const entries = readdirSync(dir)
    .filter((f) => !f.startsWith("."))
    .sort();
  return entries.length > 0 ? join(dir, entries[0] as string) : null;
}
