/**
 * `mjolnir handoff [mjolnir.json]` — the deterministic fix-handoff
 * artifact (agent-handoff plan M3).
 *
 * Reads a saved `--json` report (shared loader, report-io.ts) and
 * renders a self-contained Markdown remediation plan an agent (or a
 * human) can execute offline. Every instruction is derived from
 * Mjölnir's own rule metadata — the generator produces INSTRUCTIONS,
 * never executable commands, and no prompt text is fetched or copied
 * from any external source.
 *
 * The artifact embeds the formal verification contract (plan §5.3):
 * what was detected, what should change, what justifies it (evidence
 * boundary per level), what to re-run, what counts as verified
 * (TARGET_RESOLVED / TARGET_REMAINS / NEW_FINDINGS_INTRODUCED /
 * VERIFICATION_NOT_RUN, correlated via the fingerprint rule), and the
 * standing caveat that a clean `--scope changed` run verifies the
 * changed-scope surface only — not that the repository is clean.
 *
 * Exit codes (frozen contract): 0 on success · 10 missing file ·
 * 2 unreadable/invalid JSON.
 */

import type { Finding, ScanResult } from "../types.js";
import type { Output } from "../cli.js";
import { usageErrorMessage } from "../cli.js";
import { CLI_VERSION } from "../cli.js";
import { deriveScoreState, headlineFor } from "../reporter/score-state.js";
import { verdictFor } from "../reporter/terminal.js";
import { escapeMarkdown } from "./pr-comment.js";
import { errorText, loadSavedReport, reportExists } from "./report-io.js";

export interface HandoffOptions {
  /** Restrict sections to one rule category (presentation filter). */
  categories?: readonly string[];
  /** Restrict sections to explicit rule ids (comma-separated flag). */
  rules?: readonly string[];
}

const OCCURRENCE_CAP = 25;

const EVIDENCE_BOUNDARY: Record<"E0" | "E1" | "E2", string> = {
  E2: "The detector's evidence is deterministic for this pattern. Check the location, then apply the prescribed fix — the finding is a deterministic defect at its boundary.",
  E1: "REQUIRES CONFIRMATION before editing. This is a heuristic finding — the detector's observation alone does not prove the defect. Establish the runtime/product context first, and treat the fix as a hypothesis to validate.",
  E0: "Observation only — informational by definition. This finding can never deduct points or gate CI. Decide whether it matters in context; do NOT 'fix' it blindly.",
};

function evidenceBoundary(f: Finding): string {
  const level: "E0" | "E1" | "E2" = f.evidenceLevel ?? "E1";
  const base = EVIDENCE_BOUNDARY[level];
  if (f.runtimeCorroboration !== undefined) {
    const label =
      f.runtimeCorroboration.level === "defect"
        ? "Runtime corroboration: the run report directly corroborates this defect."
        : f.runtimeCorroboration.level === "test"
          ? "Runtime corroboration: the containing test executed in the run report."
          : "Runtime corroboration: the containing file executed in the run report.";
    return `${base}\n${label}`;
  }
  return base;
}

function fpLine(f: Finding): string {
  if (f.measuredFpRate === undefined) {
    return "Measured FP rate: none — this rule ships on assumption (no measured false-positive rate).";
  }
  const pct = Math.round(f.measuredFpRate * 100);
  const n =
    f.measuredFpN !== undefined
      ? ` over ${f.measuredFpN} classified verdicts`
      : "";
  return `Measured FP rate: ${pct}%${n}.`;
}

function scoreBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(Math.max(0, width - filled))}`;
}

function scopeNote(options: HandoffOptions): string {
  const parts: string[] = [];
  if (options.categories && options.categories.length > 0) {
    parts.push(`categories: ${options.categories.join(", ")}`);
  }
  if (options.rules && options.rules.length > 0) {
    parts.push(`rules: ${options.rules.join(", ")}`);
  }
  return parts.length > 0 ? ` (filtered — ${parts.join("; ")})` : "";
}

/**
 * The verification procedure block — the Trust contract rendered into
 * every artifact (plan §5.3). `version` is pinned at render time.
 */
export function verificationBlock(version: string): string[] {
  return [
    "## Verification procedure",
    "",
    "1. Before editing (recommended): `mjolnir baseline` captures the pre-fix report.",
    "2. After the fixes: `npx mjolnir-qa@" +
      version +
      " . --scope changed` re-verifies the targeted surface.",
    "3. Correlate before/after by finding fingerprint (ruleId + file + message — line numbers are occurrence locations, not identity; edits may move lines).",
    "",
    "Outcomes:",
    "",
    "- **TARGET_RESOLVED** — every fingerprint in this document is absent from the post-fix scan.",
    "- **TARGET_REMAINS** — at least one target fingerprint is still present. Report it honestly; do not suppress to clear the report.",
    "- **NEW_FINDINGS_INTRODUCED** — the post-fix scan contains fingerprints absent from the pre-fix report. Report them; do not silently accept them.",
    "- **VERIFICATION_NOT_RUN** — no post-fix scan, or a partial scan. Never claim a fix is verified without it.",
    "",
    "> ⚠ A clean `--scope changed` run re-verifies the targeted changed-scope remediation. It is NOT a statement that the entire repository is clean — run a full scan for that.",
    "",
    "Report files changed. Report checks not run. Report unresolved findings honestly.",
  ];
}

/** The per-rule remediation copy block (fenced, self-contained). */
export function ruleCopyBlock(
  group: {
    ruleId: string;
    fixGroupId: string | undefined;
    findings: Finding[];
  },
  version: string,
): string {
  const f = group.findings[0] as Finding;
  const occurrences = group.findings
    .slice(0, OCCURRENCE_CAP)
    .map((x) => `- \`${escapeMarkdown(x.file)}:${x.line}\``)
    .join("\n");
  const overflow =
    group.findings.length > OCCURRENCE_CAP
      ? `\n- … and ${group.findings.length - OCCURRENCE_CAP} more — see the JSON report.`
      : "";
  return [
    "```text",
    `Remediation task: ${escapeMarkdown(group.ruleId)} (fix group: ${escapeMarkdown(group.fixGroupId ?? group.ruleId)})`,
    "",
    `What was detected: ${escapeMarkdown(f.message)}`,
    "",
    `Evidence boundary: ${evidenceBoundary(f).replace(/\n/g, " ")}`,
    escapeMarkdown(fpLine(f)),
    "",
    `What should change: ${escapeMarkdown(f.fix)}`,
    "",
    "Constraints:",
    "- Make the smallest behavior-preserving change that fixes the root cause.",
    "- Preserve public interfaces, failure semantics, and repository conventions.",
    "- Adapt identifiers and framework details instead of copying blindly.",
    "- Do NOT disable the rule or suppress matching code merely to obtain a green scan.",
    "",
    "Occurrences (validate each):",
    occurrences,
    overflow,
    "",
    "Verification:",
    `  npx mjolnir-qa@${version} . --scope changed`,
    "",
    "Expected verification behavior: the fingerprint (ruleId + file + message) of every occurrence above disappears from the post-fix scan, and no NEW fingerprint appears.",
    "",
    "Report files changed. Report checks not run. Report unresolved findings honestly.",
    "```",
  ].join("\n");
}

/** The full deterministic handoff artifact. Pure over (result, options). */
export function renderHandoff(
  result: ScanResult,
  options: HandoffOptions = {},
  version = CLI_VERSION,
): string {
  const lines: string[] = [];
  lines.push("### 🔨 Mjölnir — Fix Handoff");
  lines.push("");

  if (result.score !== null) {
    const state = deriveScoreState(result.score);
    const verdict = verdictFor(result.score);
    lines.push(
      `Score: **${result.score}/100** · ${verdict} (${state.band}) · ${headlineFor(state, result.findings.length)}`,
    );
    lines.push("");
    lines.push("```text");
    lines.push(`${scoreBar(result.score)}  ${result.score}/100`);
    lines.push("```");
  } else {
    lines.push(
      "Score: **not measurable** — no test files found (`reason: no-tests-found`).",
    );
  }
  lines.push("");

  if (result.partial) {
    lines.push(
      "> ⚠ Partial scan: the budget expired or files were skipped — the finding list may be incomplete. Treat VERIFICATION claims accordingly.",
    );
    lines.push("");
  }

  if (result.findings.length === 0) {
    lines.push("Zero findings — nothing to fix.");
    lines.push("");
    lines.push(
      "No remediation prompt is included. Do not modify the repository on the basis of this document.",
    );
    lines.push("");
    if (result.partial) {
      lines.push(
        "> The scan was partial — the absence of findings is only as trustworthy as the scan's coverage.",
      );
      lines.push("");
    }
    return lines.join("\n");
  }

  lines.push(
    `This document turns ${result.findings.length} finding${result.findings.length === 1 ? "" : "s"} into a remediation plan. Work top-down (errors before warnings); validate each occurrence according to its evidence level before editing.`,
  );
  lines.push("");

  // Group by fixGroupId (plan §5.1): today fixGroupId === ruleId, but the
  // grouping is BY GROUP, never by rule id directly.
  const groups = new Map<
    string,
    { ruleId: string; fixGroupId: string; findings: Finding[] }
  >();
  for (const f of result.findings) {
    const gid = f.fixGroupId ?? f.ruleId;
    const g = groups.get(gid);
    if (g) g.findings.push(f);
    else groups.set(gid, { ruleId: f.ruleId, fixGroupId: gid, findings: [f] });
  }

  // Filter: --rules narrows groups; --category narrows findings inside groups.
  const ruleFilter =
    options.rules && options.rules.length > 0
      ? new Set(options.rules)
      : undefined;
  const catFilter =
    options.categories && options.categories.length > 0
      ? new Set(options.categories)
      : undefined;
  const selected = [...groups.values()]
    .filter((g) => !ruleFilter || ruleFilter.has(g.ruleId))
    .map((g) => ({
      ...g,
      findings: catFilter
        ? g.findings.filter((f) => catFilter.has(f.category))
        : g.findings,
    }))
    .filter((g) => g.findings.length > 0);

  if (selected.length === 0) {
    lines.push(
      "No findings match the requested filters — no remediation prompt is included.",
    );
    lines.push("");
    return lines.join("\n");
  }

  // Order: errors before warnings before infos; within a severity, bigger
  // groups first (root-cause leverage), then rule id for determinism.
  // Groups reaching the sort are guaranteed non-empty (filtered above),
  // so first.severity is always defined.
  const sevOrder = { error: 0, warning: 1, info: 2 } as const;
  type NonEmptyGroup = (typeof selected)[number] & {
    findings: [Finding, ...Finding[]];
  };
  const sortable = selected as NonEmptyGroup[];
  sortable.sort((a, b) => {
    const sa = sevOrder[a.findings[0].severity];
    const sb = sevOrder[b.findings[0].severity];
    if (sa !== sb) return sa - sb;
    if (b.findings.length !== a.findings.length)
      return b.findings.length - a.findings.length;
    return a.ruleId < b.ruleId ? -1 : 1;
  });

  lines.push("## How to use this document");
  lines.push("");
  lines.push(
    "- Validate each occurrence according to its evidence level before editing.",
    "- Apply the smallest behavior-preserving fix.",
    "- Re-run the verification procedure below; correlate by fingerprint.",
    "- Never suppress a finding merely to obtain a green scan (suppressions live in `mjolnir.config.json`, require a reason, and expire after 90 days).",
  );
  lines.push("");
  lines.push(scopeNote(options) ? scopeNote(options).trim() : "");
  if (!scopeNote(options)) lines.pop();
  lines.push("");

  for (const g of sortable) {
    const first = g.findings[0];
    lines.push(
      `### ${escapeMarkdown(g.ruleId)} — ${first.severity} × ${g.findings.length} (fix group: ${escapeMarkdown(g.fixGroupId)})`,
    );
    lines.push("");
    lines.push(`**What is wrong:** ${escapeMarkdown(first.message)}`);
    lines.push("");
    lines.push(`**Why Mjölnir believes it:** ${escapeMarkdown(first.why)}`);
    lines.push("");
    lines.push(`**How trustworthy (evidence boundary):**`);
    lines.push("");
    lines.push(evidenceBoundary(first));
    lines.push("");
    lines.push(escapeMarkdown(fpLine(first)));
    lines.push("");
    lines.push(`**What should change:** ${escapeMarkdown(first.fix)}`);
    lines.push("");
    lines.push(
      "**What must NOT change:** behavior unrelated to this finding — public interfaces, failure semantics, accessibility, and repository conventions stay intact.",
    );
    lines.push("");
    lines.push(`**Occurrences (${g.findings.length}):**`);
    lines.push("");
    for (const f of g.findings.slice(0, OCCURRENCE_CAP)) {
      lines.push(
        `- \`${escapeMarkdown(f.file)}:${f.line}\` — ${escapeMarkdown(f.message)}`,
      );
    }
    if (g.findings.length > OCCURRENCE_CAP) {
      lines.push(
        `- … and ${g.findings.length - OCCURRENCE_CAP} more — see the JSON report.`,
      );
    }
    lines.push("");
    lines.push(ruleCopyBlock(g, version));
    lines.push("");
  }

  // One-shot block: preserves rule order + per-rule evidence boundaries.
  lines.push("## One-shot handoff prompt");
  lines.push("");
  lines.push("```text");
  lines.push(
    `Work through the ${selected.length} remediation group(s) above IN ORDER. For each:`,
  );
  lines.push(
    "- Validate the occurrences according to that group's evidence boundary (E2 = deterministic, act after a location check; E1/E0 = confirm in context first, never assume the observation alone proves the defect).",
  );
  lines.push(
    "- Apply the smallest behavior-preserving fix from the group's instruction.",
  );
  lines.push("- Do NOT suppress findings merely to make the scan green.");
  lines.push(`- Re-run: npx mjolnir-qa@${version} . --scope changed`);
  lines.push(
    "- Correlate before/after by fingerprint (ruleId + file + message).",
  );
  lines.push(
    "- Report: files changed, checks not run, and any findings that remain (TARGET_REMAINS) or newly appeared (NEW_FINDINGS_INTRODUCED).",
  );
  lines.push(
    "- Stop and ask the user when an evidence boundary cannot be resolved.",
  );
  lines.push("```");
  lines.push("");
  lines.push(...verificationBlock(version));
  lines.push("");
  lines.push(
    `_Generated by [Mjölnir](https://github.com/Sergey-Bar/Mjolnir) — evidence and verification; the agent remains responsible for every change._`,
  );
  return lines.join("\n");
}

const KNOWN_FLAGS = new Set(["--category", "--rules", "--help", "-h"]);

/**
 * Testable handoff command core. Returns the process exit code.
 * `mjolnir handoff [mjolnir.json] [--category <cat>]... [--rules <ids>]`
 */
export function runHandoffCommand(
  argv: string[],
  io: { out: Output; err: Output } = {
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  },
): number {
  for (let i = 0; i < argv.length; i++) {
    // argv is a dense string[] by caller contract (cli dispatch), so a
    // plain index read is safe here; no sparse-array fallback arms.
    const a = argv[i] as string;
    if (!a.startsWith("-")) continue;
    if (a === "--category" || a === "--rules") {
      const val = argv[i + 1];
      if (val === undefined || val.startsWith("-")) {
        io.err(usageErrorMessage({ flag: a, token: val }));
        return 10;
      }
      i++;
      continue;
    }
    if (KNOWN_FLAGS.has(a)) continue;
    io.err(usageErrorMessage({ token: a }));
    return 10;
  }

  const positional: string[] = [];
  const categories: string[] = [];
  let rules: string[] | undefined;
  for (let i = 0; i < argv.length; i++) {
    // Dense argv by caller contract — same rationale as the first loop.
    const a = argv[i] as string;
    if (a === "--category") {
      categories.push(argv[i + 1] as string);
      i++;
      continue;
    }
    if (a === "--rules") {
      // Dense argv by caller contract — the value exists whenever the
      // flag does (the first loop rejected a missing value already).
      rules = (argv[i + 1] as string)
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      i++;
      continue;
    }
    if (!a.startsWith("-")) positional.push(a);
  }
  const reportPath = positional[0] ?? "mjolnir.json";

  if (!reportExists(reportPath)) {
    io.err(`mjolnir handoff: report file not found: ${reportPath}`);
    io.err("  Run the scan with --json first: mjolnir --json > mjolnir.json");
    return 10;
  }
  let result: ScanResult;
  try {
    result = loadSavedReport(reportPath);
  } catch (err) {
    io.err(`mjolnir handoff: cannot read ${reportPath}: ${errorText(err)}`);
    return 2;
  }

  io.out(renderHandoff(result, { categories, ...(rules ? { rules } : {}) }));
  return 0;
}
