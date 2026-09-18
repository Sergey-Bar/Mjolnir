/**
 * Job Summary Fallback (PRUX-009).
 *
 * When PR comment publishing fails (permissions, fork safety,
 * rate limits), the job summary provides a fallback surface for
 * the QA report. GitHub Actions $GITHUB_STEP_SUMMARY is always
 * writable.
 */

import type { PrCommentModelV1 } from "./pr-comment-publisher.js";

export interface SummaryWriter {
  write(content: string): void;
}

export interface PrCommentPublisher {
  publish(
    model: PrCommentModelV1,
  ): Promise<{ id: number; action: "created" | "updated" }>;
}

export function renderJobSummary(model: PrCommentModelV1): string {
  const icon =
    model.verdict === "pass"
      ? "white_check_mark"
      : model.verdict === "warn"
        ? "warning"
        : "x";

  const verdictLabel =
    model.verdict === "pass"
      ? "PASS"
      : model.verdict === "warn"
        ? "WARN"
        : "FAIL";

  let summary = `## :${icon}: QA Doctor — ${verdictLabel}\n\n`;
  summary += `**Score:** ${model.score}/100\n\n`;

  if (model.findings.errors > 0 || model.findings.warnings > 0) {
    summary += `| Severity | Count |\n| --- | --- |\n`;
    if (model.findings.errors > 0)
      summary += `| :x: Errors | ${model.findings.errors} |\n`;
    if (model.findings.warnings > 0)
      summary += `| :warning: Warnings | ${model.findings.warnings} |\n`;
    if (model.findings.infos > 0)
      summary += `| :information_source: Info | ${model.findings.infos} |\n`;
    summary += "\n";
  }

  summary += `${model.summary}\n`;

  if (model.details) {
    summary += `\n<details>\n<summary>Details</summary>\n\n${model.details}\n\n</details>\n`;
  }

  if (model.sha) {
    summary += `\n---\n*Commit: \`${model.sha.slice(0, 7)}\`*\n`;
  }

  summary += `\n> **Note:** This report was published to the job summary because PR comment publishing was not available.\n`;

  return summary;
}

export interface FallbackResult {
  surface: "pr-comment" | "job-summary";
  id?: number;
  action?: "created" | "updated";
}

export async function publishWithFallback(
  model: PrCommentModelV1,
  publisher: PrCommentPublisher,
  summaryWriter: SummaryWriter,
): Promise<FallbackResult> {
  try {
    const result = await publisher.publish(model);
    return {
      surface: "pr-comment",
      id: result.id,
      action: result.action,
    };
  } catch {
    const summary = renderJobSummary(model);
    summaryWriter.write(summary);
    return { surface: "job-summary" };
  }
}
