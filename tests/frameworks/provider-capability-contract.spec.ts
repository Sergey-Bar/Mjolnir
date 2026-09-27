import { describe, expect, it } from "vitest";

import { parseYamlGuarded } from "../../src/discovery/yaml-guards.js";
import {
  CI_PROVIDER_CAPABILITY_RECORDS,
  CI_PROVIDER_IDS,
  PROVIDER_CAPABILITY_KEYS,
  validateProviderCapabilityRecord,
  type CiProviderId,
  type ProviderCapabilityRecord,
} from "../../src/frameworks/provider-capability-contract.js";

function providerRecord(provider: CiProviderId): ProviderCapabilityRecord {
  const record = CI_PROVIDER_CAPABILITY_RECORDS.find(
    (candidate) => candidate.provider === provider,
  );
  if (record === undefined)
    throw new Error(`Missing provider record: ${provider}`);
  return record;
}

describe("M30 CI provider capability contract", () => {
  it("defines four bounded records without certification claims", () => {
    expect(
      CI_PROVIDER_CAPABILITY_RECORDS.map((record) => record.provider),
    ).toEqual([...CI_PROVIDER_IDS]);

    for (const record of CI_PROVIDER_CAPABILITY_RECORDS) {
      expect(record.assurance).toEqual({
        mode: "bounded",
        certification: "not-claimed",
      });
      expect(Object.keys(record.capabilities)).toEqual([
        ...PROVIDER_CAPABILITY_KEYS,
      ]);
      expect(validateProviderCapabilityRecord(record)).toEqual({
        valid: true,
        violations: [],
      });
    }
  });

  it("keeps unsupported fork, condition, cache, and GitLab behavior explicit", () => {
    expect(providerRecord("azure-pipelines").capabilities.forks.state).toBe(
      "unsupported",
    );
    expect(providerRecord("jenkins").capabilities.conditions.state).toBe(
      "unsupported",
    );
    expect(providerRecord("jenkins").capabilities.cache.state).toBe(
      "unsupported",
    );
    const gitlab = providerRecord("gitlab-ci").capabilities;
    expect(gitlab.triggers.state).toBe("unsupported");
    expect(gitlab.forks.state).toBe("unsupported");
    expect(gitlab.conditions.state).toBe("unsupported");
    expect(gitlab.matrix.state).toBe("unsupported");
    expect(gitlab.artifacts.state).toBe("unsupported");
    expect(gitlab.cache.state).toBe("unsupported");
    expect(gitlab.approvals.state).toBe("unsupported");
    expect(gitlab.failureHandling.state).toBe("unsupported");
  });

  it("accepts a blocking masked-gate failure contract", () => {
    const failure =
      providerRecord("github-actions").capabilities.failureHandling;
    expect(failure).toEqual({
      state: "supported",
      semantics: {
        retry: "bounded-advisory",
        continueOnError: "non-gates-only",
        maskedGate: "blocking",
      },
    });
    expect(
      validateProviderCapabilityRecord(providerRecord("github-actions")),
    ).toEqual({ valid: true, violations: [] });
  });

  it("rejects a provider claim that masks a verification gate", () => {
    const invalid = structuredClone(
      providerRecord("github-actions"),
    ) as unknown as {
      capabilities: {
        failureHandling: { semantics: { maskedGate: string } };
      };
    };
    invalid.capabilities.failureHandling.semantics.maskedGate = "ignored";

    expect(validateProviderCapabilityRecord(invalid)).toEqual({
      valid: false,
      violations: [
        {
          code: "unsupported-behavior",
          path: "capabilities.failureHandling",
          message: "Provider capability must match the bounded contract",
        },
      ],
    });
  });

  it("requires a read-only fork token and withholds fork secrets", () => {
    const github = providerRecord("github-actions");
    expect(github.permissions.forkPullRequestToken).toBe("read-only");
    expect(github.capabilities.forks).toEqual({
      state: "supported",
      semantics: {
        token: "read-only",
        secrets: "unavailable",
        checkoutCredentials: "not-persisted",
      },
    });
  });

  it("rejects a write-capable fork token", () => {
    const invalid = structuredClone(
      providerRecord("github-actions"),
    ) as unknown as {
      permissions: { forkPullRequestToken: string };
    };
    invalid.permissions.forkPullRequestToken = "write";

    expect(validateProviderCapabilityRecord(invalid)).toEqual({
      valid: false,
      violations: [
        {
          code: "least-privilege-violation",
          path: "permissions",
          message:
            "Provider permissions must match the least-privilege contract",
        },
      ],
    });
  });

  it("bounds retries and limits continue-on-error to non-gates", () => {
    expect(
      providerRecord("github-actions").capabilities.failureHandling,
    ).toMatchObject({
      state: "supported",
      semantics: {
        retry: "bounded-advisory",
        continueOnError: "non-gates-only",
      },
    });
  });

  it.each([
    ["retry", "unbounded"],
    ["continueOnError", "verification-gates"],
  ] as const)("rejects unsafe %s semantics", (field, value) => {
    const invalid = structuredClone(
      providerRecord("github-actions"),
    ) as unknown as {
      capabilities: {
        failureHandling: {
          semantics: { retry: string; continueOnError: string };
        };
      };
    };
    invalid.capabilities.failureHandling.semantics[field] = value;

    expect(validateProviderCapabilityRecord(invalid)).toEqual({
      valid: false,
      violations: [
        {
          code: "unsupported-behavior",
          path: "capabilities.failureHandling",
          message: "Provider capability must match the bounded contract",
        },
      ],
    });
  });

  it("rejects a supported claim for an unsupported GitLab capability", () => {
    const invalid = structuredClone(providerRecord("gitlab-ci")) as unknown as {
      capabilities: { triggers: unknown };
    };
    invalid.capabilities.triggers = {
      state: "supported",
      semantics: {
        source: "github-events",
        pathFilters: "narrow-only",
        untrustedInput: "data-only",
      },
    };

    expect(validateProviderCapabilityRecord(invalid)).toEqual({
      valid: false,
      violations: [
        {
          code: "unsupported-behavior",
          path: "capabilities.triggers",
          message: "Provider capability must match the bounded contract",
        },
      ],
    });
  });

  it("rejects an executable bypass without evaluating it", () => {
    const invalid: Record<string, unknown> = {
      ...structuredClone(providerRecord("github-actions")),
      executableBypass: "npm test || true",
    };

    const validation = validateProviderCapabilityRecord(invalid);
    expect(validation.valid).toBe(false);
    expect(validation.violations).toContainEqual({
      code: "executable-bypass",
      path: "$.executableBypass",
      message: "Executable bypass fields are forbidden",
    });
  });

  it("returns stable violations for YAML-like untrusted input", () => {
    const first = parseYamlGuarded(`
schema: m30.ci-provider-capabilities@1
provider: github-actions
assurance:
  mode: bounded
  certification: certified
permissions:
  defaultToken: write
  forkPullRequestToken: write
  untrustedInputSecrets: available
  writeAccess: write
capabilities:
  triggers:
    state: supported
    semantics:
      source: github-events
      pathFilters: narrow-only
      untrustedInput: data-only
executableBypass: "npm test || true"
`);
    const reordered = parseYamlGuarded(`
executableBypass: "npm test || true"
capabilities:
  triggers:
    state: supported
    semantics:
      untrustedInput: data-only
      pathFilters: narrow-only
      source: github-events
permissions:
  writeAccess: write
  untrustedInputSecrets: available
  forkPullRequestToken: write
  defaultToken: write
assurance:
  certification: certified
  mode: bounded
provider: github-actions
schema: m30.ci-provider-capabilities@1
`);

    const validation = validateProviderCapabilityRecord(first);
    expect(validateProviderCapabilityRecord(reordered)).toEqual(validation);
    expect(validation.valid).toBe(false);
    expect(validation.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "executable-bypass" }),
        expect.objectContaining({ code: "not-certified-claim" }),
        expect.objectContaining({ code: "least-privilege-violation" }),
      ]),
    );
  });
});
