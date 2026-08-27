#!/usr/bin/env node
/**
 * Generates two documents:
 *
 * 1. `docs/COUNT-LOCK.md` — per-rule finding counts from baseline JSONs
 *    (the regression guard, formerly called "FP-AUDIT.md")
 *
 * 2. `docs/FP-AUDIT.md` — measured false-positive rates from
 *    human-classified verdicts in tests/corpus/verdicts/*.jsonl
 *    (Phase 3 — Tempering Plan)
 *
 * Usage: node scripts/generate-fp-audit-table.mjs
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const BASELINE_DIR = join(ROOT, "tests", "corpus", "baseline");
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");
const COUNT_LOCK_PATH = join(ROOT, "docs", "COUNT-LOCK.md");
const FP_AUDIT_PATH = join(ROOT, "docs", "FP-AUDIT.md");

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

// ─── Count-Lock (regression guard) ──────────────────────────────────

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
    "# Corpus Count Lock (Regression Guard)",
    "",
    "**Generated from `tests/corpus/baseline/*.json` — do not edit by hand.**",
    `Regenerate with \`node scripts/generate-fp-audit-table.mjs\` after a reviewed`,
    "`npm run corpus:regression:update` run.",
    "",
    "This is a **count lock**, not a false-positive audit. It records how many",
    "times each rule fires on real-world repos and fails CI if that number",
    "increases. Classification of findings as TP/FP lives in `docs/FP-AUDIT.md`.",
    "",
    "Reproduce:",
    "",
    "```bash",
    "npm run corpus:regression",
    "```",
    "",
    "This clones the real repos below over the network, runs the same",
    "`runScan` the CLI uses, and fails if any rule fires *more* on real",
    "code than the committed baseline recorded (a false-positive",
    "regression signal).",
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

// ─── FP Audit (measured rates from verdicts) ─────────────────────────

/**
 * Rule IDs declared across the registry, read from source.
 *
 * This is an .mjs script and the registry is TypeScript, so the IDs are
 * extracted textually rather than imported — the same join-by-name approach
 * CORPUS_NOTES uses, and asserted by tests/fp-audit-table.spec.ts.
 *
 * The count matters: coverage must be reported against the whole rule base,
 * not against the rules that happen to have verdicts.
 */
function registryRuleIds() {
  const ids = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".ts")) {
        const src = readFileSync(full, "utf8");
        for (const m of src.matchAll(
          /\bid:\s*"(QA-(?:TEST|TQUAL|PW|CI|PY|ENV|JV|CS)-\d{3})"/g,
        )) {
          ids.add(m[1]);
        }
      }
    }
  };
  try {
    walk(join(ROOT, "src", "rules"));
  } catch {
    /* registry unreadable — coverage denominator falls back to unknown */
  }
  return [...ids].sort();
}

function loadVerdicts() {
  if (!existsSync(VERDICTS_DIR)) return [];
  const files = readdirSync(VERDICTS_DIR).filter((f) => f.endsWith(".jsonl"));
  const all = [];
  for (const f of files) {
    const lines = readFileSync(join(VERDICTS_DIR, f), "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.verdict) all.push(entry);
      } catch {
        // skip malformed lines
      }
    }
  }
  return all;
}

export function renderMeasuredFpAudit(
  verdicts,
  generatedAt = new Date(),
  registryRuleIds = [],
) {
  // Group by ruleId
  const byRule = new Map();
  for (const v of verdicts) {
    const arr = byRule.get(v.ruleId) ?? [];
    arr.push(v);
    byRule.set(v.ruleId, arr);
  }

  const stats = [];
  for (const [ruleId, entries] of [...byRule.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const tp = entries.filter((e) => e.verdict === "TP").length;
    const fp = entries.filter((e) => e.verdict === "FP").length;
    const unsure = entries.filter((e) => e.verdict === "UNSURE").length;
    const classified = tp + fp;
    const fpRate = classified > 0 ? fp / classified : null;
    stats.push({
      ruleId,
      tp,
      fp,
      unsure,
      classified,
      fpRate,
      total: entries.length,
    });
  }

  const lines = [
    "# False-Positive Audit — Measured Rates",
    "",
    "**Generated from `tests/corpus/verdicts/*.jsonl` — do not edit by hand.**",
    "",
    "Each finding below was hand-classified by reading its source context.",
    "The FP rate is `FP / (TP + FP)` — UNSURE verdicts are excluded from the",
    "denominator (they add sample size but not confidence in either direction).",
    "",
    "A rule with fewer than 10 classified verdicts is **unmeasured**. Coverage",
    "below is stated against the full rule registry, not against the rules that",
    "happen to have been sampled.",
    "",
    `Last generated: ${generatedAt.toISOString().slice(0, 10)}.`,
    "",
    "## Summary",
    "",
  ];

  if (stats.length > 0) {
    lines.push(
      "| Rule ID | FP Rate | Sample (n) | TP | FP | UNSURE | Status |",
      "|---|---|---|---|---|---|---|",
    );
  }

  for (const s of stats) {
    const rate = s.fpRate !== null ? `${(s.fpRate * 100).toFixed(0)}%` : "—";
    const status =
      s.classified >= 10
        ? s.fpRate <= 0.1
          ? "✅ core"
          : s.fpRate <= 0.3
            ? "⚠️ extended"
            : "🔴 quarantine"
        : "❓ unmeasured";
    lines.push(
      `| ${s.ruleId} | ${rate} | ${s.classified} | ${s.tp} | ${s.fp} | ${s.unsure} | ${status} |`,
    );
  }

  if (stats.length === 0) {
    lines.push(
      "_No verdicts recorded. Every rule in the registry is unmeasured._",
      "",
      "Run `npm run corpus:sample` to generate review sheets, classify them by",
      "reading the cited source, then record verdicts in",
      "`tests/corpus/verdicts/<repo>.jsonl`.",
    );
  }

  lines.push("");
  lines.push("## Tier Assignment Criteria");
  lines.push("");
  lines.push("| Tier | FP Rate | Meaning |");
  lines.push("|---|---|---|");
  lines.push("| ✅ core | ≤ 10% | Ships in the default report |");
  lines.push("| ⚠️ extended | ≤ 30% | Included by default, lower confidence |");
  lines.push("| 🔴 quarantine | > 30% | Opt-in only (`--strict`) |");
  lines.push("| ❓ unmeasured | n < 10 | Cannot ship in core until measured |");
  lines.push("");

  const measured = stats.filter((s) => s.classified >= 10).length;
  // The denominator is the REGISTRY, not the set of rules that happen to have
  // verdicts. Reporting "3/6 measured" when 6 was the sampled count while the
  // registry holds ~87 rules overstated coverage by more than an order of
  // magnitude — it made a 3-rule sample look like half the rule base.
  if (registryRuleIds.length > 0) {
    const total = registryRuleIds.length;
    const pct = ((measured / total) * 100).toFixed(0);
    lines.push(
      `## Coverage: ${measured}/${total} rules measured (${pct}%) at n ≥ 10`,
    );
    lines.push("");
    const unmeasured = total - measured;
    if (unmeasured > 0) {
      lines.push(
        `**${unmeasured} rules carry no measured FP rate.** Any of them in the`,
        "core tier is shipping on an unverified assumption.",
        "",
      );
    }
  } else {
    lines.push(
      `## Coverage: ${measured} rules measured at n ≥ 10 (registry size unknown)`,
    );
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  // Generate COUNT-LOCK.md (regression guard)
  const baselines = loadBaselines();
  const countLockMd = renderFpAuditMd(baselines);
  writeFileSync(COUNT_LOCK_PATH, countLockMd);
  console.log(`Wrote ${COUNT_LOCK_PATH} from ${baselines.length} baseline(s).`);

  // Generate FP-AUDIT.md (measured rates)
  const verdicts = loadVerdicts();
  const fpAuditMd = renderMeasuredFpAudit(
    verdicts,
    new Date(),
    registryRuleIds(),
  );
  writeFileSync(FP_AUDIT_PATH, fpAuditMd);
  console.log(
    `Wrote ${FP_AUDIT_PATH} from ${verdicts.length} classified verdict(s).`,
  );

  // Format both
  try {
    execSync(`npx prettier --write "${COUNT_LOCK_PATH}" "${FP_AUDIT_PATH}"`, {
      cwd: ROOT,
      stdio: "ignore",
    });
  } catch {
    console.warn("prettier formatting skipped");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
