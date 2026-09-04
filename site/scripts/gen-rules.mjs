/**
 * Generates the site's rule catalog from `docs/rules/*.md`.
 *
 * The chain of truth is: rule registry -> `mjolnir rules` doc generator ->
 * `docs/rules/` (committed) -> this script -> `site/rules/` (build output,
 * gitignored). Nothing here is hand-maintained, so the catalog cannot
 * drift from the registry the way a copied table would.
 *
 * Because `docs/rules/*.md` is written for people reading the repo, this
 * script also rewrites it for a public site: it drops the "do not edit"
 * generator preamble, turns repo-relative path mentions into GitHub or
 * on-site links, and appends a short provenance note.
 *
 * Invoked automatically by the site's own "prebuild" / "predev" hooks
 * (see site/package.json) - it is not a repo-root script. Its parsing is
 * covered by scripts/gen-rules.test.mjs.
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
const BLOB = "https://github.com/Sergey-Bar/Mjolnir/blob/main/";

/** Rows in the per-rule metadata table we surface in the catalog index. */
export const FIELDS = {
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

/** Family prefix -> human label, for grouping in the index. */
export const FAMILIES = {
  CI: "CI integrity",
  TEST: "Test hygiene",
  TQUAL: "Test quality",
  PW: "Playwright",
  PY: "Python / pytest",
  JV: "Java / JUnit · TestNG",
  CS: "C# / .NET",
  ENV: "Environment",
  CYP: "Cypress",
  SE: "Selenium (cross-language)",
  WDIO: "WebdriverIO",
  PPTR: "Puppeteer",
  APM: "Appium",
};

/**
 * Pull the rule title and metadata table out of one `docs/rules/*.md`.
 * Exported for the test.
 */
export function parseRule(id, md) {
  const titleMatch = md.match(/^#\s+\S+\s+—\s+(.+?)\s*$/m);

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
    title: titleMatch ? titleMatch[1].trim() : null,
    family,
    familyLabel: FAMILIES[family] ?? family,
    severity: meta.severity ?? "info",
    tier: meta.tier ?? "extended",
    measured: !!meta.measuredFp && !/not yet measured/i.test(meta.measuredFp),
    ...meta,
  };
}

/**
 * Rewrite one rule doc's Markdown for the site. Exported for the test.
 */
export function siteBody(id, md) {
  let out = md;

  // 1. Drop the generator preamble - it is a note to repo readers.
  out = out.replace(/^_Generated from the live rule registry.*_\n\n?/m, "");

  // 2. Drop the CLI-only footer ("Full catalog: `mjolnir rules --md` ...").
  out = out.replace(/\n+---\n+Full catalog:.*$/s, "\n");

  // 3. Cross-doc links.
  out = out
    .replace(/\]\(\.\/(QA-[A-Z]+-\d+)\.md\)/g, "](/rules/$1)")
    .replace(/\]\(\.\.\/FP-AUDIT\.md\)/g, "](/reference/fp-audit)")
    .replace(/\]\(\.\.\/SCORING\.md\)/g, "](/guide/scoring)")
    .replace(/\]\(\.\.\/RULE-LIFECYCLE\.md\)/g, "](/reference/rule-lifecycle)");

  // 4. `(see `docs/FP-AUDIT.md`)` -> a real link.
  out = out.replace(
    /\(see `docs\/FP-AUDIT\.md`\)/g,
    "(see [the false-positive audit](/reference/fp-audit))",
  );

  // 5. Bare `tests/fixtures/…` and other repo paths in inline code -> GitHub.
  out = out.replace(
    /`(tests\/[^`\s]+|docs\/[A-Za-z0-9/_-]+\.md|src\/[A-Za-z0-9/_.-]+\.ts)`/g,
    (_m, p) => `[\`${p}\`](${BLOB}${p})`,
  );

  // 6. Back-link under the H1, plus a one-line provenance note so the page
  //    does not read as hand-maintained.
  out = out.replace(
    /^(# .*)$/m,
    (h) =>
      `${h}\n\n[← Back to the rule catalog](/rules/)\n\n` +
      `> Generated from the rule registry. Get the same detail from the ` +
      `CLI with \`mjolnir explain ${id}\`.\n`,
  );

  return out;
}

function main() {
  if (!existsSync(SRC)) {
    console.error(
      `[gen-rules] missing ${SRC} — run \`mjolnir\`'s doc generator`,
    );
    process.exit(1);
  }

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const files = readdirSync(SRC)
    .filter((f) => /^QA-[A-Z]+-\d+\.md$/.test(f))
    .sort();

  const rules = [];
  const untitled = [];

  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    const md = readFileSync(join(SRC, file), "utf8");
    const rule = parseRule(id, md);
    if (rule.title === null) untitled.push(id);
    rule.title ??= id;
    rules.push(rule);

    const frontmatter = [
      "---",
      `title: ${id}`,
      // Nothing here is hand-editable and 91 prev/next links would make a
      // useless chain.
      "editLink: false",
      "lastUpdated: false",
      "prev: false",
      "next: false",
      "---",
      "",
    ].join("\n");

    writeFileSync(
      join(OUT, file),
      `${frontmatter}\n${siteBody(id, md)}`,
      "utf8",
    );
  }

  // Fail loudly if the upstream doc format drifts: a title-less rule means
  // the `# QA-XXX — Title` H1 shape changed and every page lost its name.
  if (untitled.length > 3) {
    console.error(
      `[gen-rules] ${untitled.length} rule docs have no parseable title ` +
        `(${untitled.slice(0, 5).join(", ")}…). The docs/rules H1 format ` +
        `probably changed — update parseRule().`,
    );
    process.exit(1);
  }

  writeFileSync(
    join(OUT, "rules.data.json"),
    JSON.stringify(rules, null, 2),
    "utf8",
  );

  writeFileSync(join(OUT, "index.md"), indexPage(), "utf8");

  const measured = rules.filter((r) => r.measured).length;
  console.log(
    `[gen-rules] ${rules.length} rules (${measured} with a measured FP rate)` +
      (untitled.length ? `, ${untitled.length} untitled` : ""),
  );
}

function indexPage() {
  return `---
title: Rule catalog
description: Every Mjölnir rule — severity, tier, measured false-positive rate, and the languages it runs on.
aside: false
outline: false
editLink: false
lastUpdated: false
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
`;
}

// Only run when executed directly, not when imported by the test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
