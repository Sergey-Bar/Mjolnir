/**
 * PR Comment Publisher (PRUX-003).
 *
 * Publishes or updates a sticky PR comment using an HTML marker
 * for idempotent updates. The comment is identified by the marker
 * <!-- mjolnir-pr-comment:v1 --> — existing comments with this
 * marker are updated, never duplicated.
 */

export const PR_COMMENT_MARKER = "<!-- mjolnir-pr-comment:v1 -->";

import { sanitizeForMarkdown } from "./evidence-sanitization.js";

export interface PrCommentModelV1 {
  verdict: "pass" | "warn" | "fail";
  score: number;
  findings: {
    errors: number;
    warnings: number;
    infos: number;
  };
  summary: string;
  details?: string;
  scanId?: string;
  sha?: string;
}

export interface ExistingComment {
  id: number;
  body: string;
  user?: { login?: string };
}

export function findExistingComment(
  comments: readonly ExistingComment[],
): ExistingComment | undefined {
  return comments.find((c) => c.body?.includes(PR_COMMENT_MARKER));
}

export function renderCommentBody(model: PrCommentModelV1): string {
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

  let body = PR_COMMENT_MARKER + "\n";
  body += `## :${icon}: Mjolnir QA — ${verdictLabel}\n\n`;
  body += `**Score:** ${model.score}/100\n\n`;

  if (model.findings.errors > 0 || model.findings.warnings > 0) {
    body += `| Severity | Count |\n| --- | --- |\n`;
    if (model.findings.errors > 0)
      body += `| Errors | ${model.findings.errors} |\n`;
    if (model.findings.warnings > 0)
      body += `| Warnings | ${model.findings.warnings} |\n`;
    if (model.findings.infos > 0)
      body += `| Info | ${model.findings.infos} |\n`;
    body += "\n";
  }

  body += `${sanitizeForMarkdown(model.summary)}\n`;

  if (model.details) {
    body += `\n<details>\n<summary>Details</summary>\n\n${sanitizeForMarkdown(model.details)}\n\n</details>\n`;
  }

  if (model.sha) {
    body += `\n---\n*Commit: \`${model.sha.slice(0, 7)}\`*`;
  }

  return body;
}

export interface PrCommentPublisherApi {
  createComment(body: string): Promise<{ id: number }>;
  updateComment(commentId: number, body: string): Promise<void>;
}

export async function publishOrUpdateComment(
  model: PrCommentModelV1,
  existingComments: readonly ExistingComment[],
  api: PrCommentPublisherApi,
): Promise<{ id: number; action: "created" | "updated" }> {
  const body = renderCommentBody(model);
  const existing = findExistingComment(existingComments);

  if (existing) {
    await api.updateComment(existing.id, body);
    return { id: existing.id, action: "updated" };
  }

  const result = await api.createComment(body);
  return { id: result.id, action: "created" };
}
