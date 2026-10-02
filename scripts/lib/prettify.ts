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
 *
 * THE WRITE IS ATOMIC. The first version called `writeFileSync` directly,
 * while `src/lib/fs-atomic.ts` exists precisely because that pattern leaves a
 * TRUNCATED file at the real path when a write is interrupted, and because on
 * Windows a rename onto a file another process holds open fails with
 * EBUSY/EPERM. A generator is exactly the process that runs while a watcher,
 * an editor or a concurrent `docs:regen` holds the file, so the hazard is not
 * hypothetical here — it is the normal case. The helper is imported rather
 * than reimplemented so the Windows retry loop stays in one place.
 */
import { readFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";

import { writeFileAtomic } from "../../src/lib/fs-atomic.js";

export async function prettify(filepath: string): Promise<void> {
  const config = await resolveConfig(filepath);
  const formatted = await format(readFileSync(filepath, "utf8"), {
    ...config,
    filepath,
  });
  writeFileAtomic(filepath, formatted);
}

/**
 * The same formatting, applied to a string, writing nothing.
 *
 * Exists because a drift checker that compares a COMMITTED file against a
 * FRESH render has to compare like with like. The generators call
 * `prettify` after rendering, so the bytes on disk are the formatted ones and
 * a raw render will differ from them on every table — which is how the
 * rendered-`.md` comparison came to report permanent drift on a correctly
 * generated artifact. Formatting both sides in memory keeps the checker's
 * promise (never write to the tree it inspects) AND makes it compare the
 * thing it claims to.
 *
 * `filepath` is the path the text WOULD occupy, so `.prettierrc` overrides and
 * parser inference (markdown vs JSON) resolve the same way they did on write.
 */
export async function prettifyText(
  text: string,
  filepath: string,
): Promise<string> {
  const config = await resolveConfig(filepath);
  return format(text, { ...config, filepath });
}
