/**
 * GitHub Permission / Fork Safety (PRUX-007).
 *
 * Validates that the token has write access to pull requests
 * and that fork PRs are handled safely (fork PR comments cannot
 * be updated with a restricted token).
 *
 * Network I/O is injected via `fetchFn` to preserve the
 * zero-network core boundary.
 */

export interface PermissionCheckResult {
  hasPermission: boolean;
  permissions: Record<string, string>;
  missingPermissions: string[];
}

export interface PrContext {
  isFork: boolean;
  headRepo: string;
  baseRepo: string;
  headOwner: string;
  baseOwner: string;
}

export interface PublishingContext {
  token: string;
  prContext: PrContext;
  permissions: PermissionCheckResult;
}

export interface PublishingValidationResult {
  canPublish: boolean;
  canUpdate: boolean;
  reason: string;
  warnings: string[];
}

type FetchFn = (
  url: string,
  init?: Record<string, unknown>,
) => Promise<{ ok: boolean; headers: { get(name: string): string | null } }>;

export async function checkPermissions(
  token: string,
  fetchFn: FetchFn,
  apiBase = "https://api.github.com",
): Promise<PermissionCheckResult> {
  try {
    const response = await fetchFn(`${apiBase}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      return {
        hasPermission: false,
        permissions: {},
        missingPermissions: ["Unable to verify permissions (API error)."],
      };
    }

    const scopes = response.headers.get("x-oauth-scopes") ?? "";
    const scopeList = scopes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const hasWrite =
      scopeList.includes("repo") || scopeList.includes("public_repo");

    return {
      hasPermission: hasWrite,
      permissions: Object.fromEntries(scopeList.map((s) => [s, "granted"])),
      missingPermissions: hasWrite
        ? []
        : ["pull-requests:write (requires 'repo' or 'public_repo' scope)"],
    };
  } catch {
    return {
      hasPermission: false,
      permissions: {},
      missingPermissions: ["Unable to verify permissions (network error)."],
    };
  }
}

export function isForkPr(prContext: PrContext): boolean {
  return prContext.isFork || prContext.headOwner !== prContext.baseOwner;
}

export function validatePublishingContext(
  context: PublishingContext,
): PublishingValidationResult {
  const warnings: string[] = [];
  const fork = isForkPr(context.prContext);

  if (!context.permissions.hasPermission) {
    return {
      canPublish: false,
      canUpdate: false,
      reason:
        `Missing permissions: ${context.permissions.missingPermissions.join(", ")}. ` +
        `Cannot publish PR comments.`,
      warnings,
    };
  }

  if (fork) {
    warnings.push(
      "This is a fork PR. Comments may not be updatable with the current token " +
        "due to GitHub's fork security model.",
    );
    return {
      canPublish: true,
      canUpdate: false,
      reason:
        "Fork PR detected. Can create new comments but cannot update existing ones " +
        "with a restricted token.",
      warnings,
    };
  }

  return {
    canPublish: true,
    canUpdate: true,
    reason: "Valid publishing context.",
    warnings,
  };
}
