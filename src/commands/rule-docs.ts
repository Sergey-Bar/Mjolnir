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

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { RULES } from "../rules/index.js";
import type { QADoctorRule } from "../rules/rule.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { effectiveTier, isProvisional } from "../rules/measurement.js";
import { deriveEvidenceLevel, QA_IMPACT_LABELS } from "../types.js";
import type { Finding } from "../types.js";
import { parseWorkflow } from "../discovery/workflow-parser.js";
import {
  isAzurePipelineFixture,
  parseAzurePipeline,
} from "../discovery/azure-pipeline-parser.js";
import { computeCodeText } from "../engine/code-text.js";
import { getAntiPatternContent } from "./anti-pattern-catalog.js";
import { firstFixtureFile } from "./fixture-example.js";
import {
  compareCodePoints,
  compareLocalized,
  DISPLAY_LOCALE,
} from "../lib/compare.js";
import { recordDegradation } from "../engine/degradation-ledger.js";

export interface RuleDocExample {
  finding?: Omit<Finding, "ruleId" | "category">;
  fixturePath?: string;
}

/**
 * The outcome of running a rule against a fixture.
 *
 * `FIRED` and `DID_NOT_FIRE` are the two the fixture firewall is about, and
 * the difference between them is the whole point of a must-not-fire fixture.
 * `INCONCLUSIVE` is the third the doctor model already defines
 * (`docs/CERTIFICATION-POLICY.md`): the rule DID NOT RUN. A boolean cannot
 * express it, and collapsing it into `false` is what turned a rule that threw
 * on its own fixture into a doc page reading "Verified against ... — a
 * legitimate, similar-looking pattern this rule correctly leaves alone."
 *
 * That sentence is a certification claim. The evidence for it is that the
 * rule produced no findings, and "produced no findings because it crashed"
 * is not evidence of anything except a broken detector.
 */
export type FixtureOutcome = "FIRED" | "DID_NOT_FIRE" | "INCONCLUSIVE";

export interface RuleDocData {
  rule: QADoctorRule;
  mustFire: RuleDocExample;
  mustNotFire: { fixturePath?: string; outcome: FixtureOutcome };
  /** Real corpus occurrence counts by repo name, when a baseline exists. */
  corpusOccurrences: Record<string, number>;
}

/**
 * Mirrors explainRule's ast/path normalization exactly — see explain.ts.
 *
 * `null` means the rule did not run, and the two reasons are kept apart
 * because they are not the same failure: an unreadable FIXTURE is a
 * generation-run problem with the repo, while a rule that THREW is a broken
 * detector. Both are counted through the same degradation sink, and both are
 * INCONCLUSIVE at the call site — neither may be rendered as a pass.
 */
function runRuleAgainstFixture(
  rule: QADoctorRule,
  fixturePath: string,
): Array<Omit<Finding, "ruleId" | "category">> | null {
  let text: string;
  try {
    // Normalize line endings: a CRLF checkout (git core.autocrlf on
    // Windows) would otherwise render an extra blank line into the
    // committed docs/rules/*.md snippet and drift from a clean CI regen.
    text = readFileSync(fixturePath, "utf8").replace(/\r\n/g, "\n");
  } catch {
    recordDegradation("rule-doc-fixture-unreadable");
    return null;
  }
  const normalizedPath = fixturePath.replaceAll("\\", "/");
  let ast: unknown;
  if (rule.appliesTo === "ci-workflows") {
    // P3b/P3c: parse with the machinery matching the fixture's platform
    // so the rule sees the context its scan path would hand it; the
    // Jenkinsfile is a text-target kind and stays un-parsed.
    const base = normalizedPath.split("/").pop() ?? "";
    if (base === "Jenkinsfile") {
      ast = undefined;
    } else {
      try {
        ast = isAzurePipelineFixture(normalizedPath)
          ? parseAzurePipeline(text)
          : parseWorkflow(text);
      } catch {
        recordDegradation("rule-doc-workflow-parse-failed");
        return null;
      }
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
    // A rule that THREW is not a rule that stayed silent. This is the defect
    // W1.2 exists for: the caller used to read `null` as "no findings" and
    // write "Verified against ... this rule correctly leaves alone" into a
    // committed doc page and the certification surface.
    recordDegradation("rule-doc-rule-crash");
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
 *
 * The must-not-fire branch is where the honesty is load-bearing. `null` from
 * `runRuleAgainstFixture` means the rule did not run, and the only honest
 * rendering of that is INCONCLUSIVE — the third status the doctor model
 * already defines. A `fired: false` here would be a certification claim
 * backed by nothing.
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
  let mustNotFire: { fixturePath?: string; outcome: FixtureOutcome } = {
    outcome: "DID_NOT_FIRE",
  };
  if (mustNotFirePath) {
    const findings = runRuleAgainstFixture(rule, mustNotFirePath);
    mustNotFire = {
      fixturePath: mustNotFirePath,
      outcome:
        findings === null
          ? "INCONCLUSIVE"
          : findings.length > 0
            ? "FIRED"
            : "DID_NOT_FIRE",
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
      "Regenerate with `npm run generate-rule-docs`._",
  );
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|---|---|");
  lines.push(`| Severity | ${r.severity} |`);
  lines.push(`| Confidence | ${r.confidence} |`);
  lines.push(
    `| Tier | ${effectiveTier(r)}${isProvisional(r) ? " (PROVISIONAL)" : ""} |`,
  );
  const measured = MEASURED_FP[r.id];
  lines.push(
    `| Measured FP rate | ${
      measured
        ? `${Math.round(measured.fpRate * 100)}% (n=${measured.n})`
        : "not yet measured"
    } |`,
  );
  lines.push(`| Evidence level | ${evidenceLevel} |`);
  lines.push(`| QA impact | ${QA_IMPACT_LABELS[r.qaImpact]} (${r.qaImpact}) |`);
  lines.push(
    `| False-positive risk (author estimate) | ${r.falsePositiveRisk ?? "not declared"} |`,
  );
  lines.push(`| Autofix available | ${r.autofix ? "yes" : "no"} |`);
  if (r.languages?.length)
    lines.push(`| Languages | ${r.languages.join(", ")} |`);
  if (r.frameworks?.length)
    lines.push(`| Frameworks | ${r.frameworks.join(", ")} |`);
  if (r.detectionStrategy)
    lines.push(
      `| Detection strategy | ${r.detectionStrategy}${
        r.detectionNotes ? ` (${r.detectionNotes})` : ""
      } |`,
    );
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
    const rel = relOrAbs(data.mustNotFire.fixturePath);
    if (data.mustNotFire.outcome === "FIRED") {
      lines.push(
        `⚠️ This rule's must-not-fire fixture (\`${rel}\`) currently DOES fire ` +
          "— that is a real fixture-firewall violation, not a doc bug. Run " +
          "`mjolnir doctor` for the full self-audit.",
      );
    } else if (data.mustNotFire.outcome === "INCONCLUSIVE") {
      // The sentence this section used to print unconditionally. It claims
      // the rule CORRECTLY leaves the pattern alone, and the only evidence
      // for that is that the rule ran and produced nothing. A rule that threw
      // on this fixture produces the same absence, so printing the claim
      // there is asserting verification quality the evidence does not carry.
      lines.push(
        `? INCONCLUSIVE — this rule did not run against its own ` +
          `must-not-fire fixture (\`${rel}\`). The fixture was unreadable, or ` +
          "the rule threw on it. This is NOT a pass: a detector that crashes " +
          "here is indistinguishable from one that correctly abstains, and " +
          "nothing above is verified until the rule runs. " +
          "`mjolnir doctor` reports the self-audit.",
      );
    } else {
      lines.push(
        `Verified against \`${rel}\` — a legitimate, similar-looking pattern ` +
          "this rule correctly leaves alone.",
      );
    }
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
        "repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). " +
        'That is not the same as "never fires incorrectly" — it just means ' +
        "no occurrence, correct or not, has been observed there yet.",
    );
  } else {
    lines.push(
      "Real occurrence counts from `npm run corpus:audit` against " +
        "actively-maintained OSS repos — reproduce yourself, don't just " +
        "trust this table (see `docs/FP-AUDIT.md`):",
    );
    lines.push("");
    lines.push("| Repo | Occurrences |");
    lines.push("|---|---|");
    // Pinned locale, not code-unit order and not the ambient default. This
    // table is READ by a person choosing which corpus repos to trust, and
    // code-unit order puts `SeleniumHQ-selenium` before
    // `microsoft-playwright-dotnet` because `S` sorts before `m` - stable,
    // and harder to read than the alphabetical order the table implies it
    // has. Pinning "en" gets the readable order and keeps it identical on
    // every machine, which is the actual defect being avoided.
    for (const [repo, count] of occurrences.sort((a, b) =>
      compareLocalized(DISPLAY_LOCALE)(a[0], b[0]),
    )) {
      lines.push(`| ${repo} | ${count} |`);
    }
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(
    `Full catalog: \`mjolnir explain --list --md\` · Live explanation: \`mjolnir explain ${r.id}\``,
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
      "Regenerate with `npm run generate-rule-docs`._",
    "",
    "One page per rule, each showing a real detected example, the fix, " +
      "confirmation of what it correctly leaves alone, and (when measured) " +
      "real corpus occurrence counts.",
    "",
    "| ID | Title | Severity |",
    "|---|---|---|",
  ];
  const sorted = [...rules].sort((a, b) => compareCodePoints(a.id, b.id));
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
