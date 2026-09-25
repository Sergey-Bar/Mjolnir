import { isDeepStrictEqual } from "node:util";

export const CI_PROVIDER_CAPABILITY_SCHEMA =
  "m30.ci-provider-capabilities@1" as const;

export const CI_PROVIDER_IDS = [
  "github-actions",
  "azure-pipelines",
  "jenkins",
  "gitlab-ci",
] as const;

export type CiProviderId = (typeof CI_PROVIDER_IDS)[number];

export const PROVIDER_CAPABILITY_KEYS = [
  "triggers",
  "forks",
  "conditions",
  "matrix",
  "artifacts",
  "cache",
  "approvals",
  "failureHandling",
] as const;

export type ProviderCapabilityKey = (typeof PROVIDER_CAPABILITY_KEYS)[number];

export type ProviderCapability<T> =
  | { readonly state: "supported"; readonly semantics: T }
  | { readonly state: "unsupported"; readonly reason: string };

export interface LeastPrivilegePermissions {
  readonly defaultToken: "read-only" | "not-applicable";
  readonly forkPullRequestToken: "read-only" | "unsupported";
  readonly untrustedInputSecrets: "unavailable";
  readonly writeAccess: "not-granted";
}

export interface TriggerSemantics {
  readonly source:
    "github-events" | "azure-resource-triggers" | "jenkins-external-triggers";
  readonly pathFilters: "narrow-only";
  readonly untrustedInput: "data-only";
}

export interface ForkSemantics {
  readonly token: "read-only";
  readonly secrets: "unavailable";
  readonly checkoutCredentials: "not-persisted";
}

export interface ConditionSemantics {
  readonly evaluator: "github-expressions" | "azure-expressions";
  readonly untrustedExpressions: "data-only";
  readonly skippedGate: "invalid";
}

export interface MatrixSemantics {
  readonly execution: "strategy-matrix" | "jobs-matrix" | "parallel-axis";
  readonly aggregation: "all-jobs-must-pass";
  readonly toleratedFailures: "non-gates-only";
}

export interface ArtifactSemantics {
  readonly store: "run-artifacts" | "pipeline-artifacts" | "workspace-archive";
  readonly binding: "run-and-candidate-bound";
  readonly untrustedUpload: "denied";
}

export interface CacheSemantics {
  readonly scope: "action-cache";
  readonly keying: "integrity-keyed";
  readonly forkWrite: "denied";
}

export interface ApprovalSemantics {
  readonly mechanism: "required-checks" | "branch-policy" | "manual-input";
  readonly defaultMode: "advisory";
  readonly staleApproval: "invalid";
}

export interface FailureHandlingSemantics {
  readonly retry: "bounded-advisory";
  readonly continueOnError: "non-gates-only";
  readonly maskedGate: "blocking";
}

export interface ProviderCapabilities {
  readonly triggers: ProviderCapability<TriggerSemantics>;
  readonly forks: ProviderCapability<ForkSemantics>;
  readonly conditions: ProviderCapability<ConditionSemantics>;
  readonly matrix: ProviderCapability<MatrixSemantics>;
  readonly artifacts: ProviderCapability<ArtifactSemantics>;
  readonly cache: ProviderCapability<CacheSemantics>;
  readonly approvals: ProviderCapability<ApprovalSemantics>;
  readonly failureHandling: ProviderCapability<FailureHandlingSemantics>;
}

export interface ProviderCapabilityRecord {
  readonly schema: typeof CI_PROVIDER_CAPABILITY_SCHEMA;
  readonly provider: CiProviderId;
  readonly assurance: {
    readonly mode: "bounded";
    readonly certification: "not-claimed";
  };
  readonly permissions: LeastPrivilegePermissions;
  readonly capabilities: ProviderCapabilities;
}

function unsupported<T>(reason: string): ProviderCapability<T> {
  return { state: "unsupported", reason };
}

export const CI_PROVIDER_CAPABILITY_RECORDS = [
  {
    schema: CI_PROVIDER_CAPABILITY_SCHEMA,
    provider: "github-actions",
    assurance: { mode: "bounded", certification: "not-claimed" },
    permissions: {
      defaultToken: "read-only",
      forkPullRequestToken: "read-only",
      untrustedInputSecrets: "unavailable",
      writeAccess: "not-granted",
    },
    capabilities: {
      triggers: {
        state: "supported",
        semantics: {
          source: "github-events",
          pathFilters: "narrow-only",
          untrustedInput: "data-only",
        },
      },
      forks: {
        state: "supported",
        semantics: {
          token: "read-only",
          secrets: "unavailable",
          checkoutCredentials: "not-persisted",
        },
      },
      conditions: {
        state: "supported",
        semantics: {
          evaluator: "github-expressions",
          untrustedExpressions: "data-only",
          skippedGate: "invalid",
        },
      },
      matrix: {
        state: "supported",
        semantics: {
          execution: "strategy-matrix",
          aggregation: "all-jobs-must-pass",
          toleratedFailures: "non-gates-only",
        },
      },
      artifacts: {
        state: "supported",
        semantics: {
          store: "run-artifacts",
          binding: "run-and-candidate-bound",
          untrustedUpload: "denied",
        },
      },
      cache: {
        state: "supported",
        semantics: {
          scope: "action-cache",
          keying: "integrity-keyed",
          forkWrite: "denied",
        },
      },
      approvals: {
        state: "supported",
        semantics: {
          mechanism: "required-checks",
          defaultMode: "advisory",
          staleApproval: "invalid",
        },
      },
      failureHandling: {
        state: "supported",
        semantics: {
          retry: "bounded-advisory",
          continueOnError: "non-gates-only",
          maskedGate: "blocking",
        },
      },
    },
  },
  {
    schema: CI_PROVIDER_CAPABILITY_SCHEMA,
    provider: "azure-pipelines",
    assurance: { mode: "bounded", certification: "not-claimed" },
    permissions: {
      defaultToken: "not-applicable",
      forkPullRequestToken: "unsupported",
      untrustedInputSecrets: "unavailable",
      writeAccess: "not-granted",
    },
    capabilities: {
      triggers: {
        state: "supported",
        semantics: {
          source: "azure-resource-triggers",
          pathFilters: "narrow-only",
          untrustedInput: "data-only",
        },
      },
      forks: unsupported(
        "Azure fork pull-request token isolation is not part of this bounded contract.",
      ),
      conditions: {
        state: "supported",
        semantics: {
          evaluator: "azure-expressions",
          untrustedExpressions: "data-only",
          skippedGate: "invalid",
        },
      },
      matrix: {
        state: "supported",
        semantics: {
          execution: "jobs-matrix",
          aggregation: "all-jobs-must-pass",
          toleratedFailures: "non-gates-only",
        },
      },
      artifacts: {
        state: "supported",
        semantics: {
          store: "pipeline-artifacts",
          binding: "run-and-candidate-bound",
          untrustedUpload: "denied",
        },
      },
      cache: unsupported(
        "Azure cache trust and restoration semantics are not part of this bounded contract.",
      ),
      approvals: {
        state: "supported",
        semantics: {
          mechanism: "branch-policy",
          defaultMode: "advisory",
          staleApproval: "invalid",
        },
      },
      failureHandling: {
        state: "supported",
        semantics: {
          retry: "bounded-advisory",
          continueOnError: "non-gates-only",
          maskedGate: "blocking",
        },
      },
    },
  },
  {
    schema: CI_PROVIDER_CAPABILITY_SCHEMA,
    provider: "jenkins",
    assurance: { mode: "bounded", certification: "not-claimed" },
    permissions: {
      defaultToken: "not-applicable",
      forkPullRequestToken: "unsupported",
      untrustedInputSecrets: "unavailable",
      writeAccess: "not-granted",
    },
    capabilities: {
      triggers: {
        state: "supported",
        semantics: {
          source: "jenkins-external-triggers",
          pathFilters: "narrow-only",
          untrustedInput: "data-only",
        },
      },
      forks: unsupported(
        "Jenkins fork identity and token isolation are controller-specific and unsupported here.",
      ),
      conditions: unsupported(
        "Untrusted Groovy condition execution is not part of this bounded contract.",
      ),
      matrix: {
        state: "supported",
        semantics: {
          execution: "parallel-axis",
          aggregation: "all-jobs-must-pass",
          toleratedFailures: "non-gates-only",
        },
      },
      artifacts: {
        state: "supported",
        semantics: {
          store: "workspace-archive",
          binding: "run-and-candidate-bound",
          untrustedUpload: "denied",
        },
      },
      cache: unsupported(
        "Jenkins cache plugins and restoration trust are not part of this bounded contract.",
      ),
      approvals: {
        state: "supported",
        semantics: {
          mechanism: "manual-input",
          defaultMode: "advisory",
          staleApproval: "invalid",
        },
      },
      failureHandling: {
        state: "supported",
        semantics: {
          retry: "bounded-advisory",
          continueOnError: "non-gates-only",
          maskedGate: "blocking",
        },
      },
    },
  },
  {
    schema: CI_PROVIDER_CAPABILITY_SCHEMA,
    provider: "gitlab-ci",
    assurance: { mode: "bounded", certification: "not-claimed" },
    permissions: {
      defaultToken: "not-applicable",
      forkPullRequestToken: "unsupported",
      untrustedInputSecrets: "unavailable",
      writeAccess: "not-granted",
    },
    capabilities: {
      triggers: unsupported(
        "GitLab provider execution is not claimed by the bounded M30 contract.",
      ),
      forks: unsupported(
        "GitLab provider execution is not claimed by the bounded M30 contract.",
      ),
      conditions: unsupported(
        "GitLab provider execution is not claimed by the bounded M30 contract.",
      ),
      matrix: unsupported(
        "GitLab provider execution is not claimed by the bounded M30 contract.",
      ),
      artifacts: unsupported(
        "GitLab provider execution is not claimed by the bounded M30 contract.",
      ),
      cache: unsupported(
        "GitLab provider execution is not claimed by the bounded M30 contract.",
      ),
      approvals: unsupported(
        "GitLab provider execution is not claimed by the bounded M30 contract.",
      ),
      failureHandling: unsupported(
        "GitLab provider execution is not claimed by the bounded M30 contract.",
      ),
    },
  },
] as const satisfies readonly ProviderCapabilityRecord[];

export type ProviderCapabilityViolationCode =
  | "malformed-record"
  | "unknown-provider"
  | "not-certified-claim"
  | "least-privilege-violation"
  | "unsupported-behavior"
  | "executable-bypass";

export interface ProviderCapabilityViolation {
  readonly code: ProviderCapabilityViolationCode;
  readonly path: string;
  readonly message: string;
}

export interface ProviderCapabilityValidation {
  readonly valid: boolean;
  readonly violations: readonly ProviderCapabilityViolation[];
}

const CANONICAL_RECORDS = new Map(
  CI_PROVIDER_CAPABILITY_RECORDS.map((record) => [record.provider, record]),
);

const TOP_LEVEL_KEYS = [
  "schema",
  "provider",
  "assurance",
  "permissions",
  "capabilities",
] as const;

const EXECUTABLE_KEYS = new Set([
  "bypass",
  "command",
  "commands",
  "eval",
  "exec",
  "executablebypass",
  "run",
  "script",
  "scripts",
  "shell",
]);

const MAX_SCAN_DEPTH = 16;
const MAX_SCAN_OBJECTS = 512;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function ownValue(value: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const allowed = [...expected].sort();
  return isDeepStrictEqual(actual, allowed);
}

function scanForExecutableBypass(value: unknown): {
  readonly path?: string;
  readonly bounded: boolean;
} {
  const stack: Array<{ value: unknown; path: string; depth: number }> = [
    { value, path: "$", depth: 0 },
  ];
  const seen = new Set<object>();
  let objects = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) return { bounded: true };
    if (!isRecord(current.value) && !Array.isArray(current.value)) continue;
    if (current.depth > MAX_SCAN_DEPTH) return { bounded: true };
    if (seen.has(current.value)) continue;
    seen.add(current.value);
    objects += 1;
    if (objects > MAX_SCAN_OBJECTS) return { bounded: true };

    for (const key of Object.keys(current.value).sort()) {
      const path = `${current.path}.${key}`;
      const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
      if (EXECUTABLE_KEYS.has(normalized)) return { path, bounded: false };
      const descriptor = Object.getOwnPropertyDescriptor(current.value, key);
      if (!descriptor || !("value" in descriptor)) {
        return { bounded: true };
      }
      stack.push({ value: descriptor.value, path, depth: current.depth + 1 });
    }
  }

  return { bounded: false };
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isCiProviderId(value: unknown): value is CiProviderId {
  return (
    typeof value === "string" &&
    (CI_PROVIDER_IDS as readonly string[]).includes(value)
  );
}

export function validateProviderCapabilityRecord(
  value: unknown,
): ProviderCapabilityValidation {
  const violations: ProviderCapabilityViolation[] = [];
  const executable = scanForExecutableBypass(value);
  if (executable.path !== undefined) {
    violations.push({
      code: "executable-bypass",
      path: executable.path,
      message: "Executable bypass fields are forbidden",
    });
  }
  if (executable.bounded) {
    violations.push({
      code: "malformed-record",
      path: "$",
      message: "Record exceeds deterministic validation bounds",
    });
    return { valid: false, violations };
  }
  if (!isRecord(value)) {
    violations.push({
      code: "malformed-record",
      path: "$",
      message: "Provider capability record must be an object",
    });
    return { valid: false, violations };
  }

  if (!hasExactKeys(value, TOP_LEVEL_KEYS)) {
    violations.push({
      code: "malformed-record",
      path: "$",
      message: "Provider capability record has unexpected fields",
    });
  }
  if (ownValue(value, "schema") !== CI_PROVIDER_CAPABILITY_SCHEMA) {
    violations.push({
      code: "malformed-record",
      path: "schema",
      message: "Provider capability schema does not match",
    });
  }

  const assuranceValue = ownValue(value, "assurance");
  if (!isRecord(assuranceValue)) {
    violations.push({
      code: "not-certified-claim",
      path: "assurance",
      message: "Provider capability assurance must be explicit",
    });
  } else {
    if (ownValue(assuranceValue, "mode") !== "bounded") {
      violations.push({
        code: "malformed-record",
        path: "assurance.mode",
        message: "Provider capability mode must be bounded",
      });
    }
    if (ownValue(assuranceValue, "certification") !== "not-claimed") {
      violations.push({
        code: "not-certified-claim",
        path: "assurance.certification",
        message: "Provider certification must remain not claimed",
      });
    }
    if (!hasExactKeys(assuranceValue, ["mode", "certification"])) {
      violations.push({
        code: "malformed-record",
        path: "assurance",
        message: "Provider capability assurance has unexpected fields",
      });
    }
  }

  const providerValue = ownValue(value, "provider");
  if (!isCiProviderId(providerValue)) {
    violations.push({
      code: "unknown-provider",
      path: "provider",
      message: "Provider is outside the bounded M30 contract",
    });
  }

  const canonical = isCiProviderId(providerValue)
    ? CANONICAL_RECORDS.get(providerValue)
    : undefined;
  if (canonical === undefined) {
    violations.sort((left, right) =>
      compareText(`${left.path}:${left.code}`, `${right.path}:${right.code}`),
    );
    return { valid: false, violations };
  }

  const permissions = ownValue(value, "permissions");
  if (!isDeepStrictEqual(permissions, canonical.permissions)) {
    violations.push({
      code: "least-privilege-violation",
      path: "permissions",
      message: "Provider permissions must match the least-privilege contract",
    });
  }

  const capabilities = ownValue(value, "capabilities");
  if (!isRecord(capabilities)) {
    violations.push({
      code: "unsupported-behavior",
      path: "capabilities",
      message: "Provider capabilities must match the bounded contract",
    });
  } else {
    if (!hasExactKeys(capabilities, PROVIDER_CAPABILITY_KEYS)) {
      violations.push({
        code: "malformed-record",
        path: "capabilities",
        message: "Provider capabilities have unexpected fields",
      });
    }
    const actualEntries = new Map(Object.entries(capabilities));
    for (const key of PROVIDER_CAPABILITY_KEYS) {
      const actual = actualEntries.get(key);
      const expected = ownValue(canonical.capabilities, key);
      if (!isDeepStrictEqual(actual, expected)) {
        violations.push({
          code: "unsupported-behavior",
          path: `capabilities.${key}`,
          message: "Provider capability must match the bounded contract",
        });
      }
    }
  }

  violations.sort((left, right) =>
    compareText(
      `${left.path}:${left.code}:${left.message}`,
      `${right.path}:${right.code}:${right.message}`,
    ),
  );
  return { valid: violations.length === 0, violations };
}
