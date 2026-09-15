import { describe, expect, it } from "vitest";

import {
  isForkPr,
  validatePublishingContext,
  type PrContext,
  type PublishingContext,
} from "../../../src/integrations/github/github-permissions.js";

function prContext(overrides: Partial<PrContext> = {}): PrContext {
  return {
    isFork: false,
    headRepo: "owner/repo",
    baseRepo: "owner/repo",
    headOwner: "owner",
    baseOwner: "owner",
    ...overrides,
  };
}

describe("isForkPr", () => {
  it("returns true when isFork flag is set", () => {
    expect(isForkPr(prContext({ isFork: true }))).toBe(true);
  });

  it("returns true when owners differ", () => {
    expect(
      isForkPr(
        prContext({
          headOwner: "contributor",
          baseOwner: "owner",
        }),
      ),
    ).toBe(true);
  });

  it("returns false for same-owner non-fork PR", () => {
    expect(isForkPr(prContext())).toBe(false);
  });
});

describe("validatePublishingContext", () => {
  it("returns canPublish=false when permissions missing", () => {
    const ctx: PublishingContext = {
      token: "ghp_xxx",
      prContext: prContext(),
      permissions: {
        hasPermission: false,
        permissions: {},
        missingPermissions: ["pull-requests:write"],
      },
    };
    const result = validatePublishingContext(ctx);
    expect(result.canPublish).toBe(false);
    expect(result.canUpdate).toBe(false);
    expect(result.reason).toContain("Missing permissions");
  });

  it("returns full access for non-fork PR with permissions", () => {
    const ctx: PublishingContext = {
      token: "ghp_xxx",
      prContext: prContext(),
      permissions: {
        hasPermission: true,
        permissions: { repo: "granted" },
        missingPermissions: [],
      },
    };
    const result = validatePublishingContext(ctx);
    expect(result.canPublish).toBe(true);
    expect(result.canUpdate).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("returns canUpdate=false for fork PR", () => {
    const ctx: PublishingContext = {
      token: "ghp_xxx",
      prContext: prContext({ isFork: true, headOwner: "contributor" }),
      permissions: {
        hasPermission: true,
        permissions: { repo: "granted" },
        missingPermissions: [],
      },
    };
    const result = validatePublishingContext(ctx);
    expect(result.canPublish).toBe(true);
    expect(result.canUpdate).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("fork");
  });

  it("returns canUpdate=false when owners differ even without isFork flag", () => {
    const ctx: PublishingContext = {
      token: "ghp_xxx",
      prContext: prContext({ headOwner: "external", baseOwner: "org" }),
      permissions: {
        hasPermission: true,
        permissions: { repo: "granted" },
        missingPermissions: [],
      },
    };
    const result = validatePublishingContext(ctx);
    expect(result.canUpdate).toBe(false);
  });
});
