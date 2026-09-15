import { describe, expect, it, vi } from "vitest";

import {
  renderJobSummary,
  publishWithFallback,
  type SummaryWriter,
  type PrCommentPublisher,
} from "../../../src/integrations/github/job-summary-fallback.js";
import type { PrCommentModelV1 } from "../../../src/integrations/github/pr-comment-publisher.js";

function model(overrides: Partial<PrCommentModelV1> = {}): PrCommentModelV1 {
  return {
    verdict: "pass",
    score: 95,
    findings: { errors: 0, warnings: 0, infos: 0 },
    summary: "All checks passed.",
    ...overrides,
  };
}

describe("renderJobSummary", () => {
  it("renders pass verdict", () => {
    const summary = renderJobSummary(model({ verdict: "pass" }));
    expect(summary).toContain("white_check_mark");
    expect(summary).toContain("PASS");
  });

  it("renders warn verdict", () => {
    const summary = renderJobSummary(model({ verdict: "warn" }));
    expect(summary).toContain("warning");
    expect(summary).toContain("WARN");
  });

  it("renders fail verdict", () => {
    const summary = renderJobSummary(model({ verdict: "fail" }));
    expect(summary).toContain(":x:");
    expect(summary).toContain("FAIL");
  });

  it("includes score", () => {
    const summary = renderJobSummary(model({ score: 85 }));
    expect(summary).toContain("85/100");
  });

  it("includes error findings table", () => {
    const summary = renderJobSummary(
      model({ findings: { errors: 3, warnings: 2, infos: 1 } }),
    );
    expect(summary).toContain(":x: Errors");
    expect(summary).toContain(":warning: Warnings");
    expect(summary).toContain(":information_source: Info");
  });

  it("includes the fallback note", () => {
    const summary = renderJobSummary(model());
    expect(summary).toContain("published to the job summary");
  });

  it("includes details when provided", () => {
    const summary = renderJobSummary(model({ details: "Extra info" }));
    expect(summary).toContain("<details>");
    expect(summary).toContain("Extra info");
  });

  it("includes truncated sha", () => {
    const summary = renderJobSummary(
      model({ sha: "abc1234567890abcdef1234567890abcdef123456" }),
    );
    expect(summary).toContain("abc1234");
  });
});

describe("publishWithFallback", () => {
  it("uses publisher when it succeeds", async () => {
    const publisher: PrCommentPublisher = {
      publish: () => Promise.resolve({ id: 1, action: "created" as const }),
    };
    const writeFn = vi.fn();
    const summaryWriter: SummaryWriter = {
      write: writeFn,
    };
    const result = await publishWithFallback(model(), publisher, summaryWriter);
    expect(result.surface).toBe("pr-comment");
    expect(result.id).toBe(1);
    expect(result.action).toBe("created");
    expect(writeFn).not.toHaveBeenCalled();
  });

  it("falls back to job summary when publisher throws", async () => {
    const publisher: PrCommentPublisher = {
      publish: () => Promise.reject(new Error("permission denied")),
    };
    const written: string[] = [];
    const summaryWriter: SummaryWriter = {
      write: (content: string) => {
        written.push(content);
      },
    };
    const result = await publishWithFallback(model(), publisher, summaryWriter);
    expect(result.surface).toBe("job-summary");
    expect(result.id).toBeUndefined();
    expect(written).toHaveLength(1);
    expect(written[0]).toContain("Mjolnir QA");
  });
});
