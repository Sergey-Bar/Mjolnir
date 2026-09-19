/**
 * PR Comment Deterministic Markdown Renderer (PRUX-002, plan §51).
 *
 * Renders a PrCommentModelV1 into deterministic Markdown.
 * TI-018: same model → byte-identical output.
 *
 * Information architecture: Header → Verdict → Blockers → Evidence →
 * Findings → Frameworks → Details → Action → Footer.
 *
 * Verdict vocabulary per §51.3:
 *   ✅ HEALTHY, ⚠️ NEEDS_WORK, ❌ CRITICAL,
 *   ◐ INCOMPLETE, ◐ ANALYSIS_ERROR
 *
 * No trust reasoning — pure templating.
 */

import type {
  PrCommentModelV1,
  PrCommentVerdict,
} from "./pr-comment-contract.js";
import {
  sanitizeForMarkdown,
  sanitizeTestName,
  sanitizeFilePath,
} from "./evidence-sanitization.js";
import {
  renderCompletenessWarning,
  renderFrameworkLimitations,
} from "./completeness-ux.js";
import {
  prioritizeFindings,
  type FindingDisplayGroup,
} from "./finding-prioritization.js";

const VERDICT_ICON: Record<PrCommentVerdict, string> = {
  HEALTHY: "✅",
  NEEDS_WORK: "⚠️",
  CRITICAL: "❌",
  INCOMPLETE: "◐",
  ANALYSIS_ERROR: "◐",
};

const VERDICT_LABEL: Record<PrCommentVerdict, string> = {
  HEALTHY: "HEALTHY",
  NEEDS_WORK: "NEEDS_WORK",
  CRITICAL: "CRITICAL",
  INCOMPLETE: "INCOMPLETE",
  ANALYSIS_ERROR: "ANALYSIS_ERROR",
};

function header(model: PrCommentModelV1): string {
  return `<!-- qa-doctor-pr-comment -->
## QA Doctor Verification Trust Report

**${sanitizeForMarkdown(model.repository)}** · PR #${model.pullRequest.number}`;
}

function verdictSection(model: PrCommentModelV1): string {
  const icon = VERDICT_ICON[model.verdict];
  const label = VERDICT_LABEL[model.verdict];
  const scoreLine =
    model.scoreAvailability === "available" && model.score !== null
      ? `Score: **${model.score}/100**`
      : "Score: **N/A**";
  return `### ${icon} ${label}

${scoreLine} · Scope: ${sanitizeForMarkdown(model.scope.type)} — ${sanitizeForMarkdown(model.scope.description)}`;
}

function blockersSection(model: PrCommentModelV1): string {
  if (model.blockingFindings.length === 0) return "";
  const rows = model.blockingFindings
    .map(
      (f) =>
        `| ${sanitizeForMarkdown(f.ruleId)} | ${sanitizeForMarkdown(f.severity)} | ${sanitizeFilePath(f.file)}:${f.line} | ${sanitizeForMarkdown(f.message)} |`,
    )
    .join("\n");
  return `### 🚫 Blocking Findings

| Rule | Severity | Location | Message |
|------|----------|----------|---------|
${rows}`;
}

function evidenceSection(model: PrCommentModelV1): string {
  const lines: string[] = ["### 📊 Evidence"];
  lines.push(
    `- Evidence level: ${sanitizeForMarkdown(model.evidenceSummary.evidenceLevel)}`,
  );
  lines.push(
    `- Trust level: ${sanitizeForMarkdown(model.evidenceSummary.trustLevel)}`,
  );
  if (model.evidenceSummary.details) {
    lines.push(`- ${sanitizeForMarkdown(model.evidenceSummary.details)}`);
  }
  if (model.corroboratedConclusions.length > 0) {
    lines.push("");
    lines.push("**Corroborated conclusions:**");
    for (const c of model.corroboratedConclusions) {
      lines.push(
        `- ${sanitizeForMarkdown(c.conclusion)} (${sanitizeForMarkdown(c.strength)}, ${c.sourceCount} source(s))`,
      );
    }
  }
  return lines.join("\n");
}

function findingsSection(model: PrCommentModelV1): string {
  const allFindings = [
    ...model.blockingFindings.map((f) => ({
      ...f,
      priority: "blocking" as const,
    })),
    ...model.importantFindings.map((f) => ({
      ...f,
      priority: "important" as const,
    })),
  ];
  if (allFindings.length === 0) {
    return "### 🔍 Findings\n\nNo findings.";
  }

  const groups: FindingDisplayGroup[] = prioritizeFindings(allFindings);
  const lines: string[] = ["### 🔍 Findings"];

  for (const group of groups) {
    if (group.expanded) {
      for (const f of group.findings) {
        lines.push(
          `- **${sanitizeForMarkdown(f.ruleId)}** (${sanitizeForMarkdown(f.severity)}) ${sanitizeFilePath(f.file)}:${f.line} — ${sanitizeForMarkdown(f.message)}`,
        );
      }
    } else {
      lines.push(
        `<details><summary>${group.findings.length} more finding(s) collapsed</summary>`,
      );
      for (const f of group.findings) {
        lines.push(
          `- **${sanitizeForMarkdown(f.ruleId)}** (${sanitizeForMarkdown(f.severity)}) ${sanitizeFilePath(f.file)}:${f.line} — ${sanitizeForMarkdown(f.message)}`,
        );
      }
      lines.push("</details>");
    }
  }

  return lines.join("\n");
}

function frameworksSection(model: PrCommentModelV1): string {
  const fw = model.frameworkSupportSummary;
  const lines: string[] = [];
  const limitationText = renderFrameworkLimitations(fw);
  if (limitationText) {
    lines.push(limitationText);
  }
  if (fw.detected.length > 0) {
    lines.push(
      `Detected frameworks: ${fw.detected.map(sanitizeForMarkdown).join(", ")}`,
    );
  }
  if (fw.unknown) {
    lines.push(
      "⚠️ Framework detection uncertain — analysis may be incomplete.",
    );
  }
  if (lines.length === 0) return "";
  return `### 🛠️ Frameworks\n\n${lines.join("\n")}`;
}

function detailsSection(model: PrCommentModelV1): string {
  const lines: string[] = ["### 📋 Details"];
  lines.push(`- Files changed: ${model.changedFileCount}`);
  lines.push(`- Files analyzed: ${model.analyzedFileCount}`);
  if (model.partialFileCount > 0) {
    lines.push(`- Partial files: ${model.partialFileCount}`);
  }
  if (model.analysisErrors > 0) {
    lines.push(`- Analysis errors: ${model.analysisErrors}`);
  }
  lines.push(`- Tests analyzed: ${model.testsAnalyzed}`);
  lines.push(
    `- CI integrity: ${model.ciIntegritySummary.passed ? "✅ passed" : "❌ failed"} — ${sanitizeForMarkdown(model.ciIntegritySummary.details)}`,
  );
  lines.push(
    `- Runtime corroboration: ${model.runtimeCorroborationSummary.testsExecuted} tests, ${model.runtimeCorroborationSummary.corroboratedFindings} corroborated`,
  );
  if (model.suppressionSummary.suppressedCount > 0) {
    lines.push(
      `- Suppressed: ${model.suppressionSummary.suppressedCount} — ${sanitizeForMarkdown(model.suppressionSummary.details)}`,
    );
  }
  return lines.join("\n");
}

function actionSection(model: PrCommentModelV1): string {
  const completenessWarning = renderCompletenessWarning(
    model.analysisCompleteness,
    model.partialFileCount,
  );
  if (!completenessWarning) return "";
  return `### ⚠️ Action Required\n\n${completenessWarning}`;
}

function footer(model: PrCommentModelV1): string {
  const ref = model.reportArtifactReference;
  const refLine = ref.url
    ? `[Full report](${sanitizeForMarkdown(ref.url)}) (${sanitizeForMarkdown(ref.format)})`
    : "";
  return [
    "---",
    `Generated by ${sanitizeForMarkdown(model.generatedBy.tool)} v${sanitizeForMarkdown(model.generatedBy.version)}` +
      ` · Trust model v${sanitizeForMarkdown(model.trustModelVersion)}` +
      ` · Scoring model v${sanitizeForMarkdown(model.scoringModelVersion)}` +
      ` · Scan \`${sanitizeTestName(model.scanId)}\``,
    refLine,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Render a PrCommentModelV1 into deterministic Markdown.
 * TI-018: same model → byte-identical output.
 */
export function renderPrComment(model: PrCommentModelV1): string {
  const sections = [
    header(model),
    verdictSection(model),
    blockersSection(model),
    evidenceSection(model),
    findingsSection(model),
    frameworksSection(model),
    detailsSection(model),
    actionSection(model),
    footer(model),
  ];

  return sections.filter((s) => s.length > 0).join("\n\n") + "\n";
}
