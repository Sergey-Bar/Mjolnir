/**
 * `npm run generate-rule-docs` — writes docs/rules/<RULE-ID>.md for every
 * registered rule plus docs/rules/README.md as an index (Sprint 7
 * Task 27, Master-Stabilization-Plan.md).
 *
 * Pure rendering logic lives in src/commands/rule-docs.ts and is unit
 * tested there (tests/rules/docs-generator.spec.ts); this file is the disk-writing
 * entrypoint only.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prettify } from "./lib/prettify.js";
import { isMainModule } from "./lib/is-main-module.js";

import { RULES } from "../src/rules/index.js";
import {
  generateAllRuleDocs,
  renderRuleDocsIndexMd,
  type CorpusBaseline,
} from "../src/commands/rule-docs.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const FIXTURES_ROOT = join(ROOT, "tests", "fixtures");
const BASELINE_DIR = join(ROOT, "tests", "corpus", "baseline");
const OUT_DIR = join(ROOT, "docs", "rules");

function loadCorpusBaselines(): CorpusBaseline[] {
  if (!existsSync(BASELINE_DIR)) return [];
  return readdirSync(BASELINE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const name = f.replace(/\.json$/, "");
      const parsed = JSON.parse(
        readFileSync(join(BASELINE_DIR, f), "utf8"),
      ) as {
        countsByRule: Record<string, number>;
      };
      return { name, countsByRule: parsed.countsByRule };
    });
}

/**
 * Format one output file in place — shared helper (scripts/lib/prettify.ts),
 * Prettier Node API (Bug Map M-07): no try/catch, a formatting failure
 * propagates and the process exits non-zero.
 */
async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const baselines = loadCorpusBaselines();
  const pages = generateAllRuleDocs(FIXTURES_ROOT, baselines, RULES);

  for (const [ruleId, md] of pages) {
    writeFileSync(join(OUT_DIR, `${ruleId}.md`), md + "\n");
  }
  writeFileSync(
    join(OUT_DIR, "README.md"),
    renderRuleDocsIndexMd(RULES) + "\n",
  );

  // This generator writes and does NOT prune, and that is deliberate.
  //
  // A page for a retired rule is the record of what the tool used to claim.
  // Twenty-two of them are committed against 79 live rules, and
  // `tests/contract/rule-docs-set.spec.ts` enforces exactly that set: live
  // rules plus `RETIRED_RULE_IDS`, and nothing else. A page outside both is
  // the real orphan — one that no retirement ever recorded — and that spec is
  // where it is caught.
  //
  // A prune was added here and removed. It deleted all 22 retired pages on its
  // first run, which is the strongest possible demonstration that "the
  // generator cannot remove its own output" is a reason to add a
  // `docs:regen` check and not a reason to add a delete. The history of a
  // tool's claims is not its generator's to garbage-collect.
  for (const [ruleId] of pages) {
    await prettify(join(OUT_DIR, `${ruleId}.md`));
  }
  await prettify(join(OUT_DIR, "README.md"));

  console.log(`Wrote ${pages.size} rule page(s) + index to ${OUT_DIR}`);
}

// Write path runs only when this module IS the process entry point (the
// npm script). Spec imports stay pure — importing this module must never
// rewrite the generated docs as a side effect. Top-level await: a
// rejection fails the npm script with a non-zero exit instead of
// silently succeeding (FW-BUG-06, matches generate-capability-matrix.ts).
if (isMainModule(import.meta.url)) {
  await main();
}
