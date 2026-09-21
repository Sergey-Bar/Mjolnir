/**
 * Side-by-side pair view builder (§19 review aid — NOT a classifier).
 *
 * For cross-language rule families (same anti-pattern, different
 * language adapters), emits one Markdown file per family placing the
 * sampled findings of each language adapter side by side, so the human
 * classifier keeps verdicts consistent across language families
 * (owner requirement, 2026-09-08). Output is a REVIEW AID: it decides
 * nothing — every verdict is still made per finding in the per-rule
 * sheets / verdict rows by a human.
 *
 * Usage:
 *   npx tsx scripts/corpus-pairs.ts --family 106 --rules QA-JV-106,QA-CS-106,QA-PY-104
 *
 * Output: tests/corpus/review-pairs/PAIR-<family>.md
 * (outside tests/corpus/review/ — the sampler owns that dir's lifecycle).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = join(dirname(fileURLToPath(import.meta.url)));
const ROOT = join(HERE, "..");
const REVIEW_DIR = join(ROOT, "tests", "corpus", "review");
const OUT_DIR = join(ROOT, "tests", "corpus", "review-pairs");

const familyIdx = process.argv.indexOf("--family");
const family = familyIdx !== -1 ? (process.argv[familyIdx + 1] ?? "") : "";
const rulesIdx = process.argv.indexOf("--rules");
const rules =
  rulesIdx !== -1
    ? (process.argv[rulesIdx + 1] ?? "")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
    : [];

if (!family || rules.length < 2) {
  console.error(
    "usage: tsx scripts/corpus-pairs.ts --family <NNN> --rules QA-A-NNN,QA-B-NNN[,…]",
  );
  process.exit(10);
}

interface Block {
  repo: string;
  file: string;
  line: number;
  message: string;
  context: string[];
  verdict: string;
}

function loadSheet(ruleId: string): Block[] {
  const path = join(REVIEW_DIR, `${ruleId}.md`);
  if (!existsSync(path)) return [];
  const sheet = readFileSync(path, "utf8");
  return sheet
    .split(/\n(?=## \d+\. )/)
    .slice(1)
    .map((b) => {
      // Header: "## N. <repo> — <file>:<line>"
      const hdr = b.match(/^## \d+\. (.+)$/m)?.[1] ?? "";
      const m2 = hdr.match(/^(.+?) — (.+?):(\d+)$/);
      const ctx = b.match(/```\n([\s\S]*?)\n```/)?.[1]?.split("\n") ?? [];
      // The verdict line in the sheet is bare ("**verdict:**" then blank
      // line) for pending findings — classify-by-editing the sheet row.
      const verdictM = b.match(/\*\*verdict:\*\*\s*(.*)/);
      const verdictRaw = verdictM?.[1]?.trim() ?? "";
      const verdict =
        verdictRaw === "" || /^-+$/.test(verdictRaw)
          ? "(unclassified)"
          : verdictRaw;
      return {
        repo: m2?.[1] ?? "?",
        file: m2?.[2] ?? "?",
        line: Number(m2?.[3] ?? 0),
        message: b.match(/\*\*Message:\*\* (.+)/)?.[1] ?? "?",
        context: ctx,
        verdict,
      };
    });
}

const lines: string[] = [
  `# PAIR-${family} — cross-language side-by-side review aid`,
  "",
  `> Review aid only — decides nothing. Classify each finding in its own`,
  `> rule sheet / verdict row; use this view to keep verdicts CONSISTENT`,
  `> across the language family (same pattern ⇒ same verdict class in`,
  `> every language, unless the language genuinely changes the case).`,
  "",
  `Rules in this family: ${rules.join(", ")}`,
  "",
];

let anyData = false;
for (const ruleId of rules) {
  const blocks = loadSheet(ruleId);
  lines.push(`## ${ruleId} — ${blocks.length} sampled finding(s)`);
  lines.push("");
  if (blocks.length === 0) {
    lines.push(`_(no review sheet yet — debt, see top-up status)_`);
    lines.push("");
    continue;
  }
  anyData = true;
  for (const b of blocks) {
    lines.push(`### ${b.repo} — ${b.file}:${b.line}`);
    lines.push("");
    lines.push(`**Message:** ${b.message}`);
    lines.push("");
    lines.push("```");
    lines.push(...b.context);
    lines.push("```");
    lines.push("");
    lines.push(`**verdict:** ${b.verdict}`);
    lines.push("");
  }
}

if (!anyData) {
  console.error(
    `no sheets exist for any of: ${rules.join(", ")} — run the top-up first`,
  );
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, `PAIR-${family}.md`);
writeFileSync(out, lines.join("\n") + "\n");
console.log(`Wrote ${out}`);
