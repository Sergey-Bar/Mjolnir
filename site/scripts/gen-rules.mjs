/**
 * Generates the site's rule catalog from `docs/rules/*.md`.
 *
 * The chain of truth is: rule registry → `npm run docs:rules` →
 * `docs/rules/` (committed) → this script → `site/rules/` (build output,
 * gitignored). Nothing here is hand-maintained, so the catalog cannot
 * drift from the registry the way a copied table would.
 *
 * Invoked automatically by the site's own "prebuild" and "predev"
 * hooks (see site/package.json) — it is not a repo-root script.
 */

import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..");
const SRC = join(SITE, "..", "docs", "rules");
const OUT = join(SITE, "rules");

/** Rows in the per-rule metadata table we surface in the catalog index. */
const FIELDS = {
  Severity: "severity",
  Confidence: "confidence",
  Tier: "tier",
  "Measured FP rate": "measuredFp",
  "Evidence level": "evidence",
  "QA impact": "impact",
  "Autofix available": "autofix",
  Languages: "languages",
  Frameworks: "frameworks",
  "Introduced in": "since",
};

/** Family prefix → human label, for grouping in the index. */
const FAMILIES = {
  CI: "CI integrity",
  TEST: "Test hygiene",
  TQUAL: "Test quality",
  PW: "Playwright",
  PY: "Python / pytest",
  JV: "Java / JUnit · TestNG",
  CS: "C# / .NET",
  ENV: "Environment",
};

function parseRule(id, md) {
  const titleMatch = md.match(/^#\s+\S+\s+—\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : id;

  const meta = {};
  for (const line of md.split("\n")) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/);
    if (!m) continue;
    const key = FIELDS[m[1].trim()];
    if (key && meta[key] === undefined) meta[key] = m[2].trim();
  }

  const family = id.split("-")[1];
  return {
    id,
    title,
    family,
    familyLabel: FAMILIES[family] ?? family,
    severity: meta.severity ?? "info",
    tier: meta.tier ?? "extended",
    measured: !!meta.measuredFp && !/not yet measured/i.test(meta.measuredFp),
    ...meta,
  };
}

/** Point repo-relative links at the site (or GitHub) instead of 404ing. */
function rewriteLinks(md) {
  return md
    .replace(/\]\(\.\/(QA-[A-Z]+-\d+)\.md\)/g, "](/rules/$1)")
    .replace(/\]\(\.\.\/FP-AUDIT\.md\)/g, "](/reference/fp-audit)")
    .replace(/\]\(\.\.\/SCORING\.md\)/g, "](/guide/scoring)")
    .replace(/\]\(\.\.\/RULE-LIFECYCLE\.md\)/g, "](/reference/rule-lifecycle)");
}

function main() {
  if (!existsSync(SRC)) {
    console.error(`[gen-rules] missing ${SRC} — run \`npm run docs:rules\``);
    process.exit(1);
  }

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const files = readdirSync(SRC)
    .filter((f) => /^QA-[A-Z]+-\d+\.md$/.test(f))
    .sort();

  const rules = [];
  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    const md = readFileSync(join(SRC, file), "utf8");
    rules.push(parseRule(id, md));

    const body = rewriteLinks(md).replace(
      /^# .*$/m,
      (h) => `${h}\n\n[← Back to the rule catalog](/rules/)\n`,
    );

    // These pages are generated from docs/rules/ — there is nothing to
    // hand-edit, so suppress the "Edit this page" link and the prev/next
    // pager (91 rule pages would make a useless chain).
    const frontmatter = [
      "---",
      `title: ${id}`,
      "editLink: false",
      "prev: false",
      "next: false",
      "---",
      "",
    ].join("\n");

    writeFileSync(join(OUT, file), `${frontmatter}\n${body}`, "utf8");
  }

  writeFileSync(
    join(OUT, "rules.data.json"),
    JSON.stringify(rules, null, 2),
    "utf8",
  );

  writeFileSync(
    join(OUT, "index.md"),
    `---
title: Rule catalog
description: Every Mjölnir rule — severity, tier, measured false-positive rate, and the languages it runs on.
aside: false
outline: false
editLink: false
prev: false
next: false
---

# Rule catalog

Every rule in the registry. Each page shows why the pattern fails in
production, real detector output, the fix, and confirmation of the clean
pattern it correctly leaves alone.

<RuleCatalog />

::: tip Generated, not written
This catalog is generated from the live rule registry — it cannot drift.
Get the same data locally with \`mjolnir rules --md\`, or one rule at a
time with \`mjolnir explain <RULE-ID>\`.
:::
`,
    "utf8",
  );

  const measured = rules.filter((r) => r.measured).length;
  console.log(
    `[gen-rules] ${rules.length} rules (${measured} with a measured FP rate)`,
  );
}

main();
