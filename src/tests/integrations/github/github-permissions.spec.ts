import { describe, expect, it, vi } from "vitest";

import {
  checkPermissions,
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

describe("checkPermissions", () => {
  it("returns hasPermission=true with repo scope", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === "x-oauth-scopes" ? "repo,user" : null),
      },
    });
    const result = await checkPermissions("ghp_xxx", fetchFn);
    expect(result.hasPermission).toBe(true);
    expect(result.permissions["repo"]).toBe("granted");
    expect(result.missingPermissions).toEqual([]);
  });

  it("returns hasPermission=true with public_repo scope", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name === "x-oauth-scopes" ? "public_repo" : null,
      },
    });
    const result = await checkPermissions("ghp_xxx", fetchFn);
    expect(result.hasPermission).toBe(true);
  });

  it("returns hasPermission=false when repo scope missing", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name === "x-oauth-scopes" ? "user,read:org" : null,
      },
    });
    const result = await checkPermissions("ghp_xxx", fetchFn);
    expect(result.hasPermission).toBe(false);
    expect(result.missingPermissions[0]).toContain("repo");
  });

  it("returns API error when fetch returns !ok", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      headers: { get: () => null },
    });
    const result = await checkPermissions("ghp_xxx", fetchFn);
    expect(result.hasPermission).toBe(false);
    expect(result.missingPermissions[0]).toContain("API error");
  });

  it("returns network error when fetch throws", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await checkPermissions("ghp_xxx", fetchFn);
    expect(result.hasPermission).toBe(false);
    expect(result.missingPermissions[0]).toContain("network error");
  });

  it("handles empty x-oauth-scopes header", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === "x-oauth-scopes" ? "" : null),
      },
    });
    const result = await checkPermissions("ghp_xxx", fetchFn);
    expect(result.hasPermission).toBe(false);
  });

  it("handles null x-oauth-scopes header", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
    });
    const result = await checkPermissions("ghp_xxx", fetchFn);
    expect(result.hasPermission).toBe(false);
  });

  it("calls fetchFn with correct URL and headers", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "repo" },
    });
    await checkPermissions("ghp_token", fetchFn, "https://custom.api.com");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://custom.api.com/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ghp_token",
        }) as unknown,
      }) as unknown,
    );
  });
});

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
