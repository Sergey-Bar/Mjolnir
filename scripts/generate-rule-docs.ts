/**
 * `npm run docs:rules` — writes docs/rules/<RULE-ID>.md for every
 * registered rule plus docs/rules/README.md as an index (Sprint 7
 * Task 27, Master-Stabilization-Plan.md).
 *
 * Pure rendering logic lives in src/commands/rule-docs.ts and is unit
 * tested there (tests/rule-docs.spec.ts); this file is the disk-writing
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

  for (const [ruleId] of pages) {
    await prettify(join(OUT_DIR, `${ruleId}.md`));
  }
  await prettify(join(OUT_DIR, "README.md"));

  console.log(`Wrote ${pages.size} rule page(s) + index to ${OUT_DIR}`);
}

main();
