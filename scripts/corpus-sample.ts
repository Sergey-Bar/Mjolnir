/**
 * Corpus sample generator (Phase 3 — Tempering Plan).
 *
 * Draws up to 20 findings per rule from the corpus baselines, reads the
 * source context (5 lines around each finding), and emits:
 *
 * 1. tests/corpus/review/<RULE-ID>.md — human-readable review sheets
 *    with file, line, context, and an empty `verdict:` field.
 *
 * 2. tests/corpus/verdicts/<repo>.jsonl — machine-readable verdict
 *    storage (one JSON object per line) for hand-classified findings.
 *
 * Usage:
 *   npx tsx scripts/corpus-sample.ts           # generate review sheets
 *   npx tsx scripts/corpus-sample.ts --update  # re-scan and regenerate
 *
 * The review sheets are the INPUT to the manual classification process.
 * Once classified, verdicts go into the .jsonl files. The FP-rate
 * generator reads the verdicts, not the review sheets.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScan } from "../src/cli.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CACHE_DIR = join(ROOT, "tests", "corpus", ".cache");
const REVIEW_DIR = join(ROOT, "tests", "corpus", "review");
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");

const MAX_SAMPLES_PER_RULE = 20;
const CONTEXT_LINES = 5; // lines above and below the finding

interface CorpusRepo {
  name: string;
  url: string;
  note: string;
}

// Import the CORPUS list from the audit module
const CORPUS: CorpusRepo[] = [
  {
    name: "pallets-click",
    url: "https://github.com/pallets/click.git",
    note: "real pytest suite — Python adapter FP surface",
  },
  {
    name: "microsoft-playwright-mcp",
    url: "https://github.com/microsoft/playwright-mcp.git",
    note: "real Playwright + GitHub Actions — TS/PW/CI adapter FP surface",
  },
  {
    name: "pytest-dev-pytest",
    url: "https://github.com/pytest-dev/pytest.git",
    note: "large real pytest suite — Python adapter FP surface",
  },
  {
    name: "psf-requests",
    url: "https://github.com/psf/requests.git",
    note: "small real pytest suite — Python adapter FP surface",
  },
  {
    name: "microsoft-playwright-java",
    url: "https://github.com/microsoft/playwright-java.git",
    note: "real Playwright Java test suite — Java adapter FP surface",
  },
  {
    name: "microsoft-playwright-dotnet",
    url: "https://github.com/microsoft/playwright-dotnet.git",
    note: "real Playwright .NET test suite — C# adapter FP surface",
  },
];

interface SampledFinding {
  repo: string;
  ruleId: string;
  file: string;
  line: number;
  message: string;
  context: string[];
}

function cloneRepo(repo: CorpusRepo): string {
  const dest = join(CACHE_DIR, repo.name);
  if (existsSync(dest)) return dest; // reuse cached clone
  mkdirSync(CACHE_DIR, { recursive: true });
  execFileSync("git", ["clone", "--depth", "1", repo.url, dest], {
    stdio: "pipe",
  });
  rmSync(join(dest, ".git"), { recursive: true, force: true });
  return dest;
}

function getContext(filePath: string, line: number): string[] {
  try {
    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const start = Math.max(0, line - CONTEXT_LINES - 1);
    const end = Math.min(lines.length, line + CONTEXT_LINES);
    const result: string[] = [];
    for (let i = start; i < end; i++) {
      const marker = i === line - 1 ? ">>>" : "   ";
      result.push(`${marker} ${String(i + 1).padStart(4)}| ${lines[i]}`);
    }
    return result;
  } catch {
    return ["    (file not readable)"];
  }
}

function scanAndSample(): Map<string, SampledFinding[]> {
  const byRule = new Map<string, SampledFinding[]>();

  for (const repo of CORPUS) {
    console.log(`\n=== Scanning ${repo.name} ===`);
    let dir: string;
    try {
      dir = cloneRepo(repo);
    } catch (err) {
      console.error(
        `  SKIP: could not clone (${err instanceof Error ? err.message : String(err)})`,
      );
      continue;
    }

    const result = runScan({
      target: dir,
      json: true,
      verbose: true,
      maxDurationMs: 60_000,
      scopeChanged: false,
      format: "json",
    });

    for (const finding of result.findings) {
      const samples = byRule.get(finding.ruleId) ?? [];
      if (samples.length >= MAX_SAMPLES_PER_RULE) continue;

      const filePath = join(dir, finding.file);
      const context = getContext(filePath, finding.line);

      samples.push({
        repo: repo.name,
        ruleId: finding.ruleId,
        file: finding.file,
        line: finding.line,
        message: finding.message,
        context,
      });
      byRule.set(finding.ruleId, samples);
    }
  }

  return byRule;
}

function writeReviewSheets(byRule: Map<string, SampledFinding[]>): void {
  mkdirSync(REVIEW_DIR, { recursive: true });

  // Clear old review sheets
  for (const f of readdirSync(REVIEW_DIR)) {
    if (f.endsWith(".md")) rmSync(join(REVIEW_DIR, f));
  }

  for (const [ruleId, samples] of [...byRule.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const lines: string[] = [
      `# ${ruleId} — Sample Findings for Classification`,
      "",
      `Total sampled: ${samples.length} (max ${MAX_SAMPLES_PER_RULE} per rule)`,
      "",
      "Classify each finding as:",
      "- **TP** (True Positive) — the finding is correct, this IS the anti-pattern",
      "- **FP** (False Positive) — the finding is wrong, this is legitimate code",
      "- **UNSURE** — cannot determine without more context",
      "",
      "---",
      "",
    ];

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (!s) continue;
      lines.push(`## ${i + 1}. ${s.repo} — ${s.file}:${s.line}`);
      lines.push("");
      lines.push(`**Message:** ${s.message}`);
      lines.push("");
      lines.push("```");
      lines.push(...s.context);
      lines.push("```");
      lines.push("");
      lines.push("**verdict:** ");
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    writeFileSync(join(REVIEW_DIR, `${ruleId}.md`), lines.join("\n"));
    console.log(`  Wrote ${ruleId}.md (${samples.length} samples)`);
  }
}

function initVerdictFiles(byRule: Map<string, SampledFinding[]>): void {
  mkdirSync(VERDICTS_DIR, { recursive: true });

  // For each repo, create a .jsonl file with empty verdicts
  const byRepo = new Map<string, SampledFinding[]>();
  for (const samples of byRule.values()) {
    for (const s of samples) {
      const repoSamples = byRepo.get(s.repo) ?? [];
      repoSamples.push(s);
      byRepo.set(s.repo, repoSamples);
    }
  }

  for (const [repo, samples] of byRepo.entries()) {
    const verdictPath = join(VERDICTS_DIR, `${repo}.jsonl`);
    if (existsSync(verdictPath)) {
      console.log(`  ${repo}.jsonl already exists — not overwriting`);
      continue;
    }
    const lines = samples.map((s) =>
      JSON.stringify({
        ruleId: s.ruleId,
        file: s.file,
        line: s.line,
        verdict: "",
        note: "",
      }),
    );
    writeFileSync(verdictPath, lines.join("\n") + "\n");
    console.log(`  Wrote ${repo}.jsonl (${samples.length} entries)`);
  }
}

function main(): void {
  console.log("Corpus sample generator — Phase 3 (Tempering Plan)");
  console.log("Drawing up to 20 findings per rule from 6 corpus repos...\n");

  const byRule = scanAndSample();

  console.log(`\n=== Writing review sheets ===`);
  writeReviewSheets(byRule);

  console.log(`\n=== Initializing verdict files ===`);
  initVerdictFiles(byRule);

  // Cleanup cache
  rmSync(CACHE_DIR, { recursive: true, force: true });

  const totalRules = byRule.size;
  const totalSamples = [...byRule.values()].reduce(
    (sum, s) => sum + s.length,
    0,
  );
  console.log(`\nDone. ${totalSamples} samples across ${totalRules} rules.`);
  console.log("Next: classify verdicts in tests/corpus/verdicts/*.jsonl, then");
  console.log("run `npm run fp-audit:generate` to compute FP rates.");
}

main();
