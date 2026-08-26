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
import { execSync } from "node:child_process";

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

function main(): void {
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

  try {
    execSync(`npx prettier --write "${OUT_DIR}"`, {
      cwd: ROOT,
      stdio: "ignore",
    });
  } catch {
    console.warn("prettier formatting skipped (npx prettier unavailable)");
  }

  console.log(`Wrote ${pages.size} rule page(s) + index to ${OUT_DIR}`);
}

main();
