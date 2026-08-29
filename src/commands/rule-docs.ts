/**
 * Rule documentation generator — Sprint 7 Task 27
 * (Master-Stabilization-Plan.md).
 *
 * Generates one page per registered rule from `RuleMeta` plus its ACTUAL
 * fixtures (must-fire AND must-not-fire) and, when available, real
 * corpus-measured occurrence counts from Task 10's FP-audit baselines.
 * Every claim on a generated page traces to executable code or a
 * committed data file — never hand-written prose that can silently
 * drift from what the rule actually does. Pure functions only; the
 * disk-writing entrypoint lives in scripts/generate-rule-docs.ts.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { RULES } from "../rules/index.js";
import type { QADoctorRule } from "../rules/rule.js";
import { deriveEvidenceLevel, QA_IMPACT_LABELS } from "../types.js";
import type { Finding } from "../types.js";
import { parseWorkflow } from "../discovery/workflow-parser.js";
import { computeCodeText } from "../engine/code-text.js";
import { getAntiPatternContent } from "./anti-pattern-catalog.js";

export interface RuleDocExample {
  finding?: Omit<Finding, "ruleId" | "category">;
  fixturePath?: string;
}

export interface RuleDocData {
  rule: QADoctorRule;
  mustFire: RuleDocExample;
  mustNotFire: { fixturePath?: string; fired: boolean };
  /** Real corpus occurrence counts by repo name, when a baseline exists. */
  corpusOccurrences: Record<string, number>;
}

function firstFixtureFile(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir).filter((f) => !f.startsWith("."));
  return entries.length > 0 ? join(dir, entries[0] as string) : null;
}

/** Mirrors explainRule's ast/path normalization exactly — see explain.ts. */
function runRuleAgainstFixture(
  rule: QADoctorRule,
  fixturePath: string,
): Array<Omit<Finding, "ruleId" | "category">> | null {
  let text: string;
  try {
    text = readFileSync(fixturePath, "utf8");
  } catch {
    return null;
  }
  const normalizedPath = fixturePath.replaceAll("\\", "/");
  let ast: unknown;
  if (rule.appliesTo === "ci-workflows") {
    try {
      ast = parseWorkflow(text);
    } catch {
      return null;
    }
  }
  try {
    // codeText must be supplied here for the same reason the fixture, mutation
    // and golden harnesses supply it: rules that use it as a mask oracle
    // (QA-PW-004, QA-ENV-001) abstain without it and report their pre-fix
    // behavior, which would make a passing fixture look like a firewall
    // violation on this page only.
    const parsed = { path: normalizedPath, text, ast };
    const codeText = computeCodeText(parsed, languageOf(normalizedPath));
    return rule.run({ ...parsed, codeText });
  } catch {
    return null;
  }
}

/** Fixture language from its extension, for codeText masking. */
function languageOf(path: string): "typescript" | "python" | "java" | "csharp" {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".cs")) return "csharp";
  return "typescript";
}

export interface CorpusBaseline {
  name: string;
  countsByRule: Record<string, number>;
}

/**
 * Collects everything a doc page needs for one rule. Degrades honestly
 * per field (missing fixture → undefined, not a fabricated example) —
 * mirrors explainRule's degradation contract exactly.
 */
export function collectRuleDocData(
  rule: QADoctorRule,
  fixturesRoot: string,
  corpusBaselines: readonly CorpusBaseline[] = [],
): RuleDocData {
  const mustFirePath = firstFixtureFile(
    join(fixturesRoot, rule.id, "must-fire"),
  );
  let mustFire: RuleDocExample = {};
  if (mustFirePath) {
    const findings = runRuleAgainstFixture(rule, mustFirePath);
    const example = findings?.[0];
    mustFire = example
      ? { finding: example, fixturePath: mustFirePath }
      : { fixturePath: mustFirePath };
  }

  const mustNotFirePath = firstFixtureFile(
    join(fixturesRoot, rule.id, "must-not-fire"),
  );
  let mustNotFire: { fixturePath?: string; fired: boolean } = { fired: false };
  if (mustNotFirePath) {
    const findings = runRuleAgainstFixture(rule, mustNotFirePath);
    mustNotFire = {
      fixturePath: mustNotFirePath,
      fired: (findings?.length ?? 0) > 0,
    };
  }

  const corpusOccurrences: Record<string, number> = {};
  for (const b of corpusBaselines) {
    const count = b.countsByRule[rule.id];
    if (count !== undefined) corpusOccurrences[b.name] = count;
  }

  return { rule, mustFire, mustNotFire, corpusOccurrences };
}

export function renderRuleDocMd(data: RuleDocData): string {
  const { rule: r } = data;
  const evidenceLevel =
    r.evidenceLevel ?? deriveEvidenceLevel(r.findingType, r.confidence);
  const lines: string[] = [];

  lines.push(`# ${r.id} — ${r.title}`);
  lines.push("");
  lines.push(
    "_Generated from the live rule registry and this rule's own committed " +
      "fixtures by `mjolnir`'s doc generator — do not edit by hand. " +
      "Regenerate with `npm run docs:rules`._",
  );
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|---|---|");
  lines.push(`| Severity | ${r.severity} |`);
  lines.push(`| Confidence | ${r.confidence} |`);
  lines.push(`| Tier | ${r.tier ?? "core"} |`);
  lines.push(`| Evidence level | ${evidenceLevel} |`);
  lines.push(`| QA impact | ${QA_IMPACT_LABELS[r.qaImpact]} (${r.qaImpact}) |`);
  lines.push(
    `| False-positive risk | ${r.falsePositiveRisk ?? "not declared"} |`,
  );
  lines.push(`| Autofix available | ${r.autofix ? "yes" : "no"} |`);
  if (r.languages?.length)
    lines.push(`| Languages | ${r.languages.join(", ")} |`);
  if (r.frameworks?.length)
    lines.push(`| Frameworks | ${r.frameworks.join(", ")} |`);
  if (r.detectionStrategy)
    lines.push(`| Detection strategy | ${r.detectionStrategy} |`);
  if (r.introduced) lines.push(`| Introduced in | v${r.introduced} |`);
  lines.push("");

  lines.push("## Why this fails in production");
  lines.push("");
  const richContent = getAntiPatternContent(r.id);
  if (richContent) {
    lines.push(richContent);
  } else if (data.mustFire.finding) {
    lines.push(data.mustFire.finding.why);
  } else {
    lines.push(
      "_No example available — this rule's must-fire fixture is missing " +
        "or produced no findings (a fixture-firewall violation `mjolnir " +
        "doctor` would also catch)._",
    );
  }
  lines.push("");

  lines.push("## What gets flagged (real detector output)");
  lines.push("");
  if (data.mustFire.finding) {
    lines.push("```");
    lines.push(data.mustFire.finding.message);
    lines.push("```");
    lines.push("");
    lines.push(
      `Example from this rule's own must-fire fixture: \`${relOrAbs(data.mustFire.fixturePath)}\``,
    );
  } else {
    lines.push("_Not available._");
  }
  lines.push("");

  lines.push("## The fix");
  lines.push("");
  lines.push(data.mustFire.finding?.fix ?? "_Not available._");
  lines.push("");

  lines.push("## Confirmed NOT to fire on the corresponding clean pattern");
  lines.push("");
  if (data.mustNotFire.fixturePath) {
    lines.push(
      data.mustNotFire.fired
        ? `⚠️ This rule's must-not-fire fixture (\`${relOrAbs(data.mustNotFire.fixturePath)}\`) ` +
            "currently DOES fire — that is a real fixture-firewall violation, " +
            "not a doc bug. Run `mjolnir doctor` for the full self-audit."
        : `Verified against \`${relOrAbs(data.mustNotFire.fixturePath)}\` — a legitimate, ` +
            "similar-looking pattern this rule correctly leaves alone.",
    );
  } else {
    lines.push("_No must-not-fire fixture on disk for this generation run._");
  }
  lines.push("");

  lines.push("## Corpus-measured false-positive risk");
  lines.push("");
  const occurrences = Object.entries(data.corpusOccurrences);
  if (occurrences.length === 0) {
    lines.push(
      "UNKNOWN — this rule has not (yet) fired in any of the real OSS " +
        "repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). " +
        'That is not the same as "never fires incorrectly" — it just means ' +
        "no occurrence, correct or not, has been observed there yet.",
    );
  } else {
    lines.push(
      "Real occurrence counts from `npm run corpus:regression` against " +
        "actively-maintained OSS repos — reproduce yourself, don't just " +
        "trust this table (see `docs/FP-AUDIT.md`):",
    );
    lines.push("");
    lines.push("| Repo | Occurrences |");
    lines.push("|---|---|");
    for (const [repo, count] of occurrences.sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      lines.push(`| ${repo} | ${count} |`);
    }
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(
    `Full catalog: \`mjolnir rules --md\` · Live explanation: \`mjolnir explain ${r.id}\``,
  );
  return lines.join("\n");
}

function relOrAbs(path: string | undefined): string {
  if (!path) return "(unknown path)";
  const idx = path.replaceAll("\\", "/").indexOf("tests/fixtures/");
  return idx === -1
    ? path.replaceAll("\\", "/")
    : path.slice(idx).replaceAll("\\", "/");
}

export function generateAllRuleDocs(
  fixturesRoot: string,
  corpusBaselines: readonly CorpusBaseline[] = [],
  rules: readonly QADoctorRule[] = RULES,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const rule of rules) {
    const data = collectRuleDocData(rule, fixturesRoot, corpusBaselines);
    out.set(rule.id, renderRuleDocMd(data));
  }
  return out;
}

export function renderRuleDocsIndexMd(
  rules: readonly QADoctorRule[] = RULES,
): string {
  const lines: string[] = [
    "# Mjölnir — Rule Reference",
    "",
    "_Generated from the live rule registry — do not edit by hand. " +
      "Regenerate with `npm run docs:rules`._",
    "",
    "One page per rule, each showing a real detected example, the fix, " +
      "confirmation of what it correctly leaves alone, and (when measured) " +
      "real corpus occurrence counts.",
    "",
    "| ID | Title | Severity |",
    "|---|---|---|",
  ];
  const sorted = [...rules].sort((a, b) => a.id.localeCompare(b.id));
  for (const r of sorted) {
    lines.push(
      `| [${r.id}](./${r.id}.md) | ${escapeMdCell(r.title)} | ${r.severity} |`,
    );
  }
  return lines.join("\n");
}

/** Escapes characters that would break a Markdown table cell. */
function escapeMdCell(text: string): string {
  return text.replaceAll("|", "\\|");
}
