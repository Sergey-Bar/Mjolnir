/**
 * Copies the committed forensics samples into the theme's generated/
 * build output, so `ForensicsSample.vue` can import them the same way
 * `TerminalReport.vue` imports report.json — from inside the site root,
 * with no outside-the-root file serving in dev.
 *
 * The chain of truth for these samples is:
 *   real fixture (examples/demo-repo) ->
 *   `npm run docs:forensics-samples` ->
 *   assets/readme/{forensics,selector-health}-sample.txt (committed, and
 *   locked against drift by tests/forensics-sample-reproducibility.spec.ts)
 *   -> this copy -> site/.vitepress/theme/generated/.
 *
 * Invoked by the site's "gen" hook (see site/package.json). No parsing:
 * the bytes are the bytes, so the page cannot "prettify" the tool's own
 * output into something it never printed.
 */

import { copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..");
const ASSETS = join(SITE, "..", "assets", "readme");
const OUT_DIR = join(SITE, ".vitepress", "theme", "generated");

const SAMPLES = ["forensics-sample.txt", "selector-health-sample.txt"];

for (const name of SAMPLES) {
  const src = join(ASSETS, name);
  if (!existsSync(src)) {
    throw new Error(
      `missing ${name} — run \`npm run docs:forensics-samples\` at the repo root`,
    );
  }
  copyFileSync(src, join(OUT_DIR, name));
}

console.log(`[gen-samples] copied ${SAMPLES.join(", ")} -> theme/generated/`);
