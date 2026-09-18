import { describe, expect, it } from "vitest";

import {
  PR_COMMENT_MARKER,
  findExistingComment,
  renderCommentBody,
  publishOrUpdateComment,
  type PrCommentModelV1,
  type ExistingComment,
  type PrCommentPublisherApi,
} from "../../../src/integrations/github/pr-comment-publisher.js";

function model(overrides: Partial<PrCommentModelV1> = {}): PrCommentModelV1 {
  return {
    verdict: "pass",
    score: 95,
    findings: { errors: 0, warnings: 0, infos: 0 },
    summary: "All checks passed.",
    ...overrides,
  };
}

function comment(id: number, body: string): ExistingComment {
  return { id, body };
}

describe("PR_COMMENT_MARKER", () => {
  it("contains the v1 marker", () => {
    expect(PR_COMMENT_MARKER).toBe("<!-- mjolnir-pr-comment:v1 -->");
  });
});

describe("findExistingComment", () => {
  it("finds comment with the marker", () => {
    const comments = [
      comment(1, "some other comment"),
      comment(2, `${PR_COMMENT_MARKER}\n## QA Doctor`),
      comment(3, "another comment"),
    ];
    expect(findExistingComment(comments)).toBe(comments[1]);
  });

  it("returns undefined when no marker found", () => {
    const comments = [
      comment(1, "no marker here"),
      comment(2, "still no marker"),
    ];
    expect(findExistingComment(comments)).toBeUndefined();
  });

  it("handles empty array", () => {
    expect(findExistingComment([])).toBeUndefined();
  });
});

describe("renderCommentBody", () => {
  it("starts with the marker", () => {
    const body = renderCommentBody(model());
    expect(body.startsWith(PR_COMMENT_MARKER)).toBe(true);
  });

  it("renders pass verdict", () => {
    const body = renderCommentBody(model({ verdict: "pass" }));
    expect(body).toContain("white_check_mark");
    expect(body).toContain("PASS");
  });

  it("renders warn verdict", () => {
    const body = renderCommentBody(model({ verdict: "warn" }));
    expect(body).toContain("warning");
    expect(body).toContain("WARN");
  });

  it("renders fail verdict", () => {
    const body = renderCommentBody(model({ verdict: "fail" }));
    expect(body).toContain(":x:");
    expect(body).toContain("FAIL");
  });

  it("includes score", () => {
    const body = renderCommentBody(model({ score: 72 }));
    expect(body).toContain("72/100");
  });

  it("includes findings table when errors present", () => {
    const body = renderCommentBody(
      model({ findings: { errors: 3, warnings: 2, infos: 1 } }),
    );
    expect(body).toContain("Errors");
    expect(body).toContain("3");
    expect(body).toContain("Warnings");
    expect(body).toContain("2");
    expect(body).toContain("Info");
    expect(body).toContain("1");
  });

  it("omits findings table for zero errors/warnings", () => {
    const body = renderCommentBody(
      model({ findings: { errors: 0, warnings: 0, infos: 5 } }),
    );
    expect(body).not.toContain("| Errors");
  });

  it("includes details when provided", () => {
    const body = renderCommentBody(model({ details: "More info here" }));
    expect(body).toContain("<details>");
    expect(body).toContain("More info here");
  });

  it("includes truncated sha when provided", () => {
    const body = renderCommentBody(
      model({ sha: "abc1234567890abcdef1234567890abcdef123456" }),
    );
    expect(body).toContain("abc1234");
  });
});

describe("publishOrUpdateComment", () => {
  it("creates new comment when no existing", async () => {
    const created: { id: number; body: string }[] = [];
    const api: PrCommentPublisherApi = {
      createComment: (body) => {
        const result = { id: 42, body };
        created.push(result);
        return Promise.resolve(result);
      },
      updateComment: () => Promise.reject(new Error("should not be called")),
    };
    const result = await publishOrUpdateComment(model(), [], api);
    expect(result.action).toBe("created");
    expect(result.id).toBe(42);
    expect(created).toHaveLength(1);
  });

  it("updates existing comment when marker found", async () => {
    const updated: { id: number; body: string }[] = [];
    const api: PrCommentPublisherApi = {
      createComment: () => Promise.reject(new Error("should not be called")),
      updateComment: (id, body) => {
        updated.push({ id, body });
        return Promise.resolve();
      },
    };
    const existing = [comment(99, `${PR_COMMENT_MARKER}\nold content`)];
    const result = await publishOrUpdateComment(model(), existing, api);
    expect(result.action).toBe("updated");
    expect(result.id).toBe(99);
    expect(updated).toHaveLength(1);
    expect(updated[0]?.id).toBe(99);
  });
});
