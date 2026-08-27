#!/usr/bin/env node
/**
 * Generates `docs/FP-AUDIT.md` from the committed FP-corpus baselines
 * (Master-Stabilization-Plan Sprint 2, Task 10).
 *
 * The page is entirely derived from `tests/corpus/baseline/*.json` and
 * the corpus repo list in `tests/corpus/audit.ts` — it cannot drift from
 * what `npm run corpus:audit` actually measured, because it is not
 * hand-written. Re-run this after any reviewed `--update` to the
 * baseline.
 *
 * Usage: node scripts/generate-fp-audit-table.mjs
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const BASELINE_DIR = join(ROOT, "tests", "corpus", "baseline");
const OUT_PATH = join(ROOT, "docs", "FP-AUDIT.md");

// Kept in sync by hand with tests/corpus/audit.ts's CORPUS list (that
// file can't be imported here without pulling in the whole audit
// runner as an .mjs-from-.ts boundary; the repo name is the join key
// and is asserted to exist by tests/fp-audit-table.spec.ts).
const CORPUS_NOTES = {
  "pallets-click": {
    url: "https://github.com/pallets/click.git",
    note: "real pytest suite — Python adapter FP surface",
  },
  "microsoft-playwright-mcp": {
    url: "https://github.com/microsoft/playwright-mcp.git",
    note: "real Playwright + GitHub Actions — TS/PW/CI adapter FP surface",
  },
  "pytest-dev-pytest": {
    url: "https://github.com/pytest-dev/pytest.git",
    note: "large real pytest suite — Python adapter FP surface (QA-PY-001..012)",
  },
  "psf-requests": {
    url: "https://github.com/psf/requests.git",
    note: "small real pytest suite — Python adapter FP surface",
  },
  "microsoft-playwright-java": {
    url: "https://github.com/microsoft/playwright-java.git",
    note: "real Playwright Java test suite — Java adapter FP surface (library-suite caveat: tests the bindings themselves, not a consumer app)",
  },
  "microsoft-playwright-dotnet": {
    url: "https://github.com/microsoft/playwright-dotnet.git",
    note: "real Playwright .NET test suite — C# adapter FP surface (same library-suite caveat)",
  },
};

function loadBaselines() {
  const files = readdirSync(BASELINE_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      const name = f.replace(/\.json$/, "");
      const entry = JSON.parse(readFileSync(join(BASELINE_DIR, f), "utf8"));
      return { name, ...entry };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function renderFpAuditMd(baselines, generatedAt = new Date()) {
  const lines = [
    "# False-Positive Corpus Audit",
    "",
    "**Generated from `tests/corpus/baseline/*.json` — do not edit by hand.**",
    `Regenerate with \`node scripts/generate-fp-audit-table.mjs\` after a reviewed`,
    "`npm run corpus:audit:update` run.",
    "",
    "Don't trust these numbers — reproduce them yourself:",
    "",
    "```bash",
    "npm run corpus:audit",
    "```",
    "",
    "This clones the real repos below over the network, runs the same",
    "`runScan` the CLI uses, and fails if any rule fires *more* on real",
    "code than the committed baseline recorded (a false-positive",
    "regression signal). Fixtures prove a rule fires on one hand-written",
    "example; this proves it behaves on code nobody wrote for Mjölnir.",
    "",
    `Last generated: ${generatedAt.toISOString().slice(0, 10)}.`,
    "",
  ];

  for (const b of baselines) {
    const meta = CORPUS_NOTES[b.name];
    lines.push(`## ${b.name}`);
    lines.push("");
    if (meta) {
      lines.push(`${meta.note}`);
      lines.push("");
      lines.push(
        `Source: [\`${meta.url.replace(/\.git$/, "")}\`](${meta.url.replace(/\.git$/, "")})`,
      );
      lines.push("");
    }
    lines.push(`Total findings: **${b.totalFindings}**`);
    lines.push("");
    const ruleIds = Object.keys(b.countsByRule).sort();
    if (ruleIds.length === 0) {
      lines.push("_No findings recorded for this repo._");
      lines.push("");
      continue;
    }
    lines.push("| Rule ID | Findings |");
    lines.push("|---|---|");
    for (const ruleId of ruleIds) {
      lines.push(`| ${ruleId} | ${b.countsByRule[ruleId]} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const baselines = loadBaselines();
  const md = renderFpAuditMd(baselines);
  writeFileSync(OUT_PATH, md);
  try {
    execSync(`npx prettier --write "${OUT_PATH}"`, {
      cwd: ROOT,
      stdio: "ignore",
    });
  } catch {
    // Prettier formatting is cosmetic — if it's unavailable for some
    // reason, the generated file is still valid, just unformatted.
    console.warn("prettier formatting skipped (npx prettier unavailable)");
  }
  console.log(`Wrote ${OUT_PATH} from ${baselines.length} baseline(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
