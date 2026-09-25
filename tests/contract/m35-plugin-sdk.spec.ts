import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createPluginValidationHost,
  pluginManifestSigningPayload,
  validatePluginManifest,
  type PluginManifest,
  type PluginManifestValidationResult,
  type PluginValidationHost,
} from "../../src/plugins/sdk-contract.js";

const PRIVATE_KEY = createPrivateKey({
  key: Buffer.from(
    "302e020100300506032b6570042204209d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60",
    "hex",
  ),
  format: "der",
  type: "pkcs8",
});
const PUBLIC_KEY = createPublicKey({
  key: Buffer.from(
    "302a300506032b6570032100d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a",
    "hex",
  ),
  format: "der",
  type: "spki",
})
  .export({ type: "spki", format: "pem" })
  .toString();
const KEY_ID = `sha256:${createHash("sha256")
  .update(createPublicKey(PUBLIC_KEY).export({ type: "spki", format: "der" }))
  .digest("hex")}`;
const ARTIFACT_DIGEST = `sha256:${"a".repeat(64)}`;
const TRUSTED_KEYS = [{ keyId: KEY_ID, publicKey: PUBLIC_KEY }];
const SCHEMA_PATH = join(
  import.meta.dirname,
  "..",
  "..",
  "schemas",
  "m35",
  "plugin-manifest.schema.json",
);

function buildManifest(
  overrides: Partial<PluginManifest> = {},
): PluginManifest {
  const draft: PluginManifest = {
    manifestSchemaVersion: 1,
    id: "@acme/mjolnir-rules",
    version: "1.2.0",
    namespace: "ACME",
    trustMode: "manifest-only",
    compatibility: {
      engine: { min: "4.0.0", max: "4.999.999" },
      schemaVersions: [1],
    },
    permissions: {
      network: "deny",
      filesystem: "scan-root-read-only",
      process: "deny",
      environment: "deny",
    },
    capabilities: ["rule"],
    revision: 1,
    lifecycle: { state: "active", deprecation: null },
    ...overrides,
    signature: {
      algorithm: "ed25519",
      keyId: KEY_ID,
      value: "",
      artifactDigest: ARTIFACT_DIGEST,
      ...overrides.signature,
    },
  };
  const value = sign(
    null,
    Buffer.from(pluginManifestSigningPayload(draft), "utf8"),
    PRIVATE_KEY,
  ).toString("base64");
  return {
    ...draft,
    signature: { ...draft.signature, value },
  };
}

function buildHost(
  overrides: Partial<PluginValidationHost> = {},
): PluginValidationHost {
  return {
    ...createPluginValidationHost(
      "explicit-opt-in",
      TRUSTED_KEYS,
      ARTIFACT_DIGEST,
    ),
    ...overrides,
  };
}

function codes(result: PluginManifestValidationResult): string[] {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

describe("M35 plugin manifest schema", () => {
  it("is strict JSON Schema and closes plugin authority fields", () => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as unknown as {
      additionalProperties: boolean;
      required: readonly string[];
      allOf: readonly { not: { required: readonly string[] } }[];
    };
    expect(schema.additionalProperties).toBe(false);
    expect(Object.keys(buildManifest()).sort()).toEqual(
      [...schema.required].sort(),
    );
    expect(schema.required).toEqual(
      expect.arrayContaining([
        "manifestSchemaVersion",
        "namespace",
        "trustMode",
        "compatibility",
        "permissions",
        "capabilities",
        "signature",
        "revision",
        "lifecycle",
      ]),
    );
    expect(schema.allOf).toEqual(
      expect.arrayContaining([
        { not: { required: ["verdict"] } },
        { not: { required: ["canonicalTrust"] } },
        { not: { required: ["trustLevel"] } },
      ]),
    );
  });
});

describe("M35 safe plugin SDK contract", () => {
  it("accepts a signed manifest deterministically", () => {
    const manifest = buildManifest();
    const first = validatePluginManifest(manifest, buildHost());
    const second = validatePluginManifest(manifest, buildHost());
    expect(first).toEqual(second);
    expect(first.status).toBe("accepted");
    expect(first.diagnostics).toEqual([]);
  });

  it("canonicalizes manifest ordering before signature verification", () => {
    const manifest = buildManifest({
      capabilities: ["rule", "reporter"],
      compatibility: {
        engine: { min: "4.0.0", max: "4.999.999" },
        schemaVersions: [1],
      },
    });
    const reordered = {
      lifecycle: manifest.lifecycle,
      signature: manifest.signature,
      revision: manifest.revision,
      capabilities: [...manifest.capabilities].reverse(),
      permissions: {
        environment: manifest.permissions.environment,
        process: manifest.permissions.process,
        filesystem: manifest.permissions.filesystem,
        network: manifest.permissions.network,
      },
      compatibility: {
        schemaVersions: manifest.compatibility.schemaVersions,
        engine: {
          max: manifest.compatibility.engine.max,
          min: manifest.compatibility.engine.min,
        },
      },
      trustMode: manifest.trustMode,
      namespace: manifest.namespace,
      version: manifest.version,
      id: manifest.id,
      manifestSchemaVersion: manifest.manifestSchemaVersion,
    };
    expect(validatePluginManifest(reordered, buildHost()).status).toBe(
      "accepted",
    );
  });

  it("requires an explicit host gate for executable opt-in", () => {
    const manifest = buildManifest({ trustMode: "explicit-opt-in" });
    expect(validatePluginManifest(manifest, buildHost()).status).toBe(
      "accepted",
    );
    expect(
      validatePluginManifest(
        manifest,
        buildHost({ trustMode: "manifest-only" }),
      ).status,
    ).toBe("blocked");
    expect(
      codes(
        validatePluginManifest(
          manifest,
          buildHost({ trustMode: "manifest-only" }),
        ),
      ),
    ).toContain("TRUST_GATE_CLOSED");
  });

  it("blocks every plugin when the host trust mode is disabled", () => {
    const result = validatePluginManifest(
      buildManifest(),
      buildHost({ trustMode: "disabled" }),
    );
    expect(result.status).toBe("blocked");
    expect(codes(result)).toContain("TRUST_GATE_CLOSED");
  });

  it.each([
    "verdict",
    "status",
    "canonicalTrust",
    "canonicalVerdict",
    "trustLevel",
    "gateOverride",
  ])("rejects plugin-declared authority through %s", (field) => {
    const manifest = buildManifest();
    const hostile = { ...manifest, [field]: "PASS" };
    const result = validatePluginManifest(hostile, buildHost());
    expect(result.status).toBe("rejected");
    expect(codes(result)).toContain("PLUGIN_AUTHORITY_FORBIDDEN");
  });

  it("rejects a PASS value under a non-authority key", () => {
    const manifest = buildManifest();
    const hostile = { ...manifest, description: "PASS" };
    const result = validatePluginManifest(hostile, buildHost());
    expect(result.status).toBe("rejected");
    expect(codes(result)).toContain("PLUGIN_PASS_FORBIDDEN");
  });

  it("rejects nested attempts to replace canonical trust", () => {
    const manifest = buildManifest();
    const hostile = {
      ...manifest,
      outputs: { canonicalTrust: { status: "PASS" } },
    };
    const result = validatePluginManifest(hostile, buildHost());
    expect(result.status).toBe("rejected");
    expect(codes(result)).toContain("PLUGIN_AUTHORITY_FORBIDDEN");
  });

  it.each([
    ["null", null],
    ["array", []],
    ["empty object", {}],
    ["prototype pollution", '{"__proto__":{"polluted":true}}'],
  ])("rejects malformed input: %s", (_label, raw) => {
    const value =
      typeof raw === "string" && raw.startsWith("{")
        ? (JSON.parse(raw) as unknown)
        : raw;
    const result = validatePluginManifest(value, buildHost());
    expect(result.status).toBe("rejected");
    expect(result.manifest).toBeNull();
  });

  it("does not mutate prototype-bearing hostile input", () => {
    const manifest = buildManifest();
    const hostile = JSON.parse(
      `{"__proto__":{"polluted":true},${JSON.stringify(manifest).slice(1)}`,
    ) as unknown;
    expect(validatePluginManifest(hostile, buildHost()).status).toBe(
      "rejected",
    );
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("bounds deep hostile input", () => {
    const manifest = buildManifest();
    let nested: unknown = manifest;
    for (let index = 0; index < 40; index += 1) {
      nested = { nested };
    }
    const result = validatePluginManifest(nested, buildHost());
    expect(result.status).toBe("rejected");
    expect(codes(result)).toContain("RESOURCE_LIMIT");
  });

  it.each([
    ["namespace", "../escape"],
    ["version", "1.2"],
    ["revision", 0],
  ] as const)("rejects malformed %s", (field, invalidValue) => {
    const manifest = buildManifest();
    const malformed = { ...manifest, [field]: invalidValue };
    const result = validatePluginManifest(malformed, buildHost());
    expect(result.status).toBe("rejected");
  });

  it.each([
    ["network", "allow"],
    ["filesystem", "scan-root-read-write"],
    ["process", "spawn"],
    ["environment", "read"],
  ] as const)("forbids %s permission", (field, invalidValue) => {
    const manifest = buildManifest();
    const hostile = {
      ...manifest,
      permissions: { ...manifest.permissions, [field]: invalidValue },
    };
    const result = validatePluginManifest(hostile, buildHost());
    expect(result.status).toBe("rejected");
    expect(codes(result)).toContain("PERMISSION_FORBIDDEN");
  });

  it("rejects duplicate and unknown capabilities", () => {
    const manifest = buildManifest();
    const duplicate = {
      ...manifest,
      capabilities: ["rule", "rule"],
    };
    const unknown = {
      ...manifest,
      capabilities: ["rule", "compiler"],
    };
    expect(validatePluginManifest(duplicate, buildHost()).status).toBe(
      "rejected",
    );
    const unsupported = validatePluginManifest(unknown, buildHost());
    expect(unsupported.status).toBe("unsupported");
    expect(codes(unsupported)).toContain("CAPABILITY_UNSUPPORTED");
  });

  it.each(["TEST", "CI", "CORE", "PLUGIN"])(
    "reserves the core namespace %s",
    (namespace) => {
      const result = validatePluginManifest(
        buildManifest({ namespace }),
        buildHost(),
      );
      expect(result.status).toBe("rejected");
      expect(codes(result)).toContain("RESERVED_NAMESPACE");
    },
  );

  it("rejects an unsupported manifest schema version", () => {
    const manifest = { ...buildManifest(), manifestSchemaVersion: 2 };
    const result = validatePluginManifest(manifest, buildHost());
    expect(result.status).toBe("unsupported");
    expect(codes(result)).toContain("UNSUPPORTED_MANIFEST_SCHEMA");
  });

  it("reports unsupported engine, schema, and host capability combinations", () => {
    const engine = validatePluginManifest(
      buildManifest({
        compatibility: {
          engine: { min: "3.0.0", max: "3.999.999" },
          schemaVersions: [1],
        },
      }),
      buildHost(),
    );
    const schema = validatePluginManifest(
      buildManifest({
        compatibility: {
          engine: { min: "4.0.0", max: "4.999.999" },
          schemaVersions: [2],
        },
      }),
      buildHost(),
    );
    const capability = validatePluginManifest(
      buildManifest({ capabilities: ["rule", "reporter"] }),
      buildHost({ allowedCapabilities: ["rule"] }),
    );
    expect(codes(engine)).toContain("ENGINE_UNSUPPORTED");
    expect(codes(schema)).toContain("SCHEMA_UNSUPPORTED");
    expect(codes(capability)).toContain("CAPABILITY_NOT_ALLOWED");
    expect([engine.status, schema.status, capability.status]).toEqual([
      "unsupported",
      "unsupported",
      "unsupported",
    ]);
  });

  it("rejects revision and semantic-version rollback", () => {
    const manifest = buildManifest({ revision: 2, version: "2.0.0" });
    const revision = validatePluginManifest(
      manifest,
      buildHost({ installedRevision: 3, installedVersion: null }),
    );
    const version = validatePluginManifest(
      manifest,
      buildHost({ installedRevision: 0, installedVersion: "2.1.0" }),
    );
    expect(codes(revision)).toContain("REVISION_ROLLBACK_REJECTED");
    expect(codes(version)).toContain("VERSION_ROLLBACK_REJECTED");
    expect([revision.status, version.status]).toEqual(["rejected", "rejected"]);
  });

  it("accepts reinstalling the same signed revision and version", () => {
    const manifest = buildManifest({ revision: 2, version: "2.0.0" });
    const result = validatePluginManifest(
      manifest,
      buildHost({ installedRevision: 2, installedVersion: "2.0.0" }),
    );
    expect(result.status).toBe("accepted");
  });

  it("rejects tampered, untrusted, and foreign-artifact signatures", () => {
    const manifest = buildManifest();
    const replacement = manifest.signature.value.startsWith("A") ? "B" : "A";
    const tampered = {
      ...manifest,
      signature: {
        ...manifest.signature,
        value: `${replacement}${manifest.signature.value.slice(1)}`,
      },
    };
    const tamperedResult = validatePluginManifest(tampered, buildHost());
    const untrustedResult = validatePluginManifest(
      manifest,
      buildHost({ trustedKeys: [] }),
    );
    const artifactResult = validatePluginManifest(
      manifest,
      buildHost({ artifactDigest: `sha256:${"b".repeat(64)}` }),
    );
    expect(codes(tamperedResult)).toContain("SIGNATURE_INVALID");
    expect(codes(untrustedResult)).toContain("SIGNATURE_KEY_UNTRUSTED");
    expect(codes(artifactResult)).toContain("ARTIFACT_MISMATCH");
    expect([
      tamperedResult.status,
      untrustedResult.status,
      artifactResult.status,
    ]).toEqual(["rejected", "rejected", "rejected"]);
  });

  it("warns for deprecated plugins and blocks unsupported plugins", () => {
    const deprecation = {
      since: "1.0.0",
      replacement: "@acme/mjolnir-rules-next",
      removeIn: "2.0.0",
    };
    const deprecated = validatePluginManifest(
      buildManifest({ lifecycle: { state: "deprecated", deprecation } }),
      buildHost(),
    );
    const unsupported = validatePluginManifest(
      buildManifest({ lifecycle: { state: "unsupported", deprecation } }),
      buildHost(),
    );
    expect(deprecated.status).toBe("accepted");
    expect(codes(deprecated)).toContain("PLUGIN_DEPRECATED");
    expect(unsupported.status).toBe("blocked");
    expect(codes(unsupported)).toContain("PLUGIN_UNSUPPORTED");
  });

  it("rejects impossible deprecation ranges", () => {
    const manifest = buildManifest({
      lifecycle: {
        state: "deprecated",
        deprecation: {
          since: "1.3.0",
          replacement: "@acme/mjolnir-rules-next",
          removeIn: "1.1.0",
        },
      },
    });
    const result = validatePluginManifest(manifest, buildHost());
    expect(result.status).toBe("rejected");
    expect(codes(result)).toContain("INVALID_DEPRECATION_RANGE");
  });
});
