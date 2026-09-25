import { createHash, createPublicKey, verify } from "node:crypto";

import { ENGINE_VERSION } from "../engine/version.js";
import { RULE_CATEGORIES, SCHEMA_VERSION } from "../types.js";

export const PLUGIN_MANIFEST_SCHEMA_VERSION = 1 as const;
export const PLUGIN_SUPPORTED_SCHEMA_VERSIONS = [1] as const;
export const PLUGIN_TRUST_MODES = ["manifest-only", "explicit-opt-in"] as const;
export const PLUGIN_HOST_TRUST_MODES = [
  "disabled",
  ...PLUGIN_TRUST_MODES,
] as const;
export const PLUGIN_CAPABILITIES = [
  "rule",
  "language-adapter",
  "framework-adapter",
  "ci-adapter",
  "report-adapter",
  "domain-adapter",
  "policy-pack",
  "reporter",
] as const;
export const PLUGIN_LIFECYCLE_STATES = [
  "active",
  "deprecated",
  "unsupported",
] as const;

export type PluginTrustMode = (typeof PLUGIN_TRUST_MODES)[number];
export type PluginHostTrustMode = (typeof PLUGIN_HOST_TRUST_MODES)[number];
export type PluginCapability = (typeof PLUGIN_CAPABILITIES)[number];
export type PluginLifecycleState = (typeof PLUGIN_LIFECYCLE_STATES)[number];
export type PluginValidationStatus =
  "accepted" | "blocked" | "unsupported" | "rejected";
export type PluginDiagnosticSeverity =
  "error" | "warning" | "unsupported" | "blocked";

export interface PluginSignatureMetadata {
  readonly algorithm: "ed25519";
  readonly keyId: string;
  readonly value: string;
  readonly artifactDigest: string;
}

export interface PluginDeprecation {
  readonly since: string;
  readonly replacement: string;
  readonly removeIn: string;
}

export type PluginLifecycle =
  | { readonly state: "active"; readonly deprecation: null }
  | {
      readonly state: "deprecated" | "unsupported";
      readonly deprecation: PluginDeprecation;
    };

export interface PluginManifest {
  readonly manifestSchemaVersion: typeof PLUGIN_MANIFEST_SCHEMA_VERSION;
  readonly id: string;
  readonly version: string;
  readonly namespace: string;
  readonly trustMode: PluginTrustMode;
  readonly compatibility: {
    readonly engine: { readonly min: string; readonly max: string };
    readonly schemaVersions: readonly number[];
  };
  readonly permissions: {
    readonly network: "deny";
    readonly filesystem: "none" | "scan-root-read-only";
    readonly process: "deny";
    readonly environment: "deny";
  };
  readonly capabilities: readonly PluginCapability[];
  readonly revision: number;
  readonly signature: PluginSignatureMetadata;
  readonly lifecycle: PluginLifecycle;
}

export interface PluginTrustedKey {
  readonly keyId: string;
  readonly publicKey: string;
}

export interface PluginValidationHost {
  readonly trustMode: PluginHostTrustMode;
  readonly engineVersion: string;
  readonly schemaVersion: number;
  readonly allowedCapabilities: readonly PluginCapability[];
  readonly installedRevision: number;
  readonly installedVersion: string | null;
  readonly artifactDigest: string;
  readonly trustedKeys: readonly PluginTrustedKey[];
}

export interface PluginManifestDiagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly severity: PluginDiagnosticSeverity;
}

export interface PluginManifestValidationResult {
  readonly status: PluginValidationStatus;
  readonly manifest: PluginManifest | null;
  readonly diagnostics: readonly PluginManifestDiagnostic[];
}

const NAMESPACE_PATTERN = /^[A-Z][A-Z0-9]{1,15}$/;
const MAX_MANIFEST_REVISION = 2_147_483_647;
const MAX_MANIFEST_DEPTH = 32;
const MAX_MANIFEST_NODES = 2_048;
const CORE_NAMESPACES = new Set([
  ...RULE_CATEGORIES.map((category) => category.slice(3)),
  "CORE",
  "PLUGIN",
]);
const TRUST_RANK: Readonly<Record<PluginHostTrustMode, number>> = {
  disabled: 0,
  "manifest-only": 1,
  "explicit-opt-in": 2,
};
const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "canonicaltrust",
  "canonicaltrustsummary",
  "canonicalverdict",
  "engineeringcertificationstate",
  "gate",
  "gateoverride",
  "gatestatus",
  "gateverdict",
  "outcome",
  "pass",
  "releaseauthorizationstate",
  "result",
  "severity",
  "status",
  "trust",
  "trustlevel",
  "verdict",
]);

type Semver = readonly [number, number, number];

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function field(record: unknown, key: string): unknown {
  if (typeof record !== "object" || record === null) return undefined;
  try {
    return Reflect.get(record, key);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype: object | null = Reflect.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.some((entry) => entry === value);
}

function isDecimal(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  return true;
}

function isLowerHex(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const digit = code >= 48 && code <= 57;
    const lower = code >= 97 && code <= 102;
    if (!digit && !lower) return false;
  }
  return true;
}

function isSha256Digest(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === 71 &&
    value.startsWith("sha256:") &&
    isLowerHex(value.slice(7))
  );
}

function isPackageSegment(value: string, maximum: number): boolean {
  if (value.length < 1 || value.length > maximum) return false;
  const first = value.charCodeAt(0);
  if (!((first >= 97 && first <= 122) || (first >= 48 && first <= 57))) {
    return false;
  }
  for (let index = 1; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const lower = code >= 97 && code <= 122;
    const digit = code >= 48 && code <= 57;
    const punctuation = code === 46 || code === 95 || code === 45;
    if (!lower && !digit && !punctuation) return false;
  }
  return true;
}

function isPluginId(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 193) return false;
  const separator = value.indexOf("/");
  if (separator < 0) return isPackageSegment(value, 128);
  if (
    value.indexOf("/", separator + 1) >= 0 ||
    value[0] !== "@" ||
    !isPackageSegment(value.slice(1, separator), 63)
  ) {
    return false;
  }
  return isPackageSegment(value.slice(separator + 1), 128);
}

function isStableSemver(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 32) return false;
  const [core, prerelease, ...extra] = value.split("-");
  if (extra.length > 0) return false;
  if (prerelease !== undefined && !/^rc\.\d+$/.test(prerelease)) return false;
  const parts = (core ?? "").split(".");
  if (parts.length !== 3) return false;
  for (const part of parts) {
    if (
      part.length < 1 ||
      part.length > 9 ||
      (part.length > 1 && part.startsWith("0")) ||
      !isDecimal(part)
    ) {
      return false;
    }
  }
  return true;
}

function isEd25519Signature(value: unknown): value is string {
  if (typeof value !== "string" || value.length !== 88) return false;
  if (!value.endsWith("==")) return false;
  for (let index = 0; index < 86; index += 1) {
    const code = value.charCodeAt(index);
    const upper = code >= 65 && code <= 90;
    const lower = code >= 97 && code <= 122;
    const digit = code >= 48 && code <= 57;
    if (!upper && !lower && !digit && code !== 43 && code !== 47) {
      return false;
    }
  }
  return true;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isPositiveInteger(value: unknown, maximum: number): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) > 0 &&
    (value as number) <= maximum
  );
}

function parseSemver(value: unknown): Semver | null {
  if (!isStableSemver(value)) return null;
  const parts = value.split(".").map(Number);
  return [parts[0] as number, parts[1] as number, parts[2] as number];
}

function compareNumber(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareSemver(left: Semver, right: Semver): number {
  const [leftMajor, leftMinor, leftPatch] = left;
  const [rightMajor, rightMinor, rightPatch] = right;
  return (
    compareNumber(leftMajor, rightMajor) ||
    compareNumber(leftMinor, rightMinor) ||
    compareNumber(leftPatch, rightPatch)
  );
}

function publicKeyId(publicKey: string): string | null {
  try {
    const der = createPublicKey(publicKey).export({
      type: "spki",
      format: "der",
    });
    return `sha256:${createHash("sha256").update(der).digest("hex")}`;
  } catch {
    return null;
  }
}

function addDiagnostic(
  diagnostics: PluginManifestDiagnostic[],
  severity: PluginDiagnosticSeverity,
  code: string,
  path: string,
  message: string,
): void {
  diagnostics.push({ severity, code, path, message });
}

function checkKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  diagnostics: PluginManifestDiagnostic[],
): boolean {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(record)
    .filter((key) => !allowedSet.has(key))
    .sort(compareText);
  if (unexpected.length === 0) return true;
  addDiagnostic(
    diagnostics,
    "error",
    "UNKNOWN_FIELD",
    path,
    `unexpected field${unexpected.length === 1 ? "" : "s"}: ${unexpected.join(", ")}`,
  );
  return false;
}

function scanForbiddenAuthority(
  value: unknown,
  diagnostics: PluginManifestDiagnostic[],
): void {
  const seen = new WeakSet<object>();
  const pending: Array<{ value: unknown; path: string; depth: number }> = [
    { value, path: "$", depth: 0 },
  ];
  let nodes = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    nodes += 1;
    if (nodes > MAX_MANIFEST_NODES) {
      addDiagnostic(
        diagnostics,
        "error",
        "RESOURCE_LIMIT",
        current.path,
        `manifest exceeds ${MAX_MANIFEST_NODES} inspected nodes`,
      );
      break;
    }
    if (
      typeof current.value === "string" &&
      current.value.length <= 8 &&
      current.value.trim().toUpperCase() === "PASS"
    ) {
      addDiagnostic(
        diagnostics,
        "error",
        "PLUGIN_PASS_FORBIDDEN",
        current.path,
        "plugins cannot declare PASS",
      );
    }
    if (
      typeof current.value !== "object" ||
      current.value === null ||
      current.depth > MAX_MANIFEST_DEPTH
    ) {
      if (current.depth > MAX_MANIFEST_DEPTH) {
        addDiagnostic(
          diagnostics,
          "error",
          "RESOURCE_LIMIT",
          current.path,
          `manifest nesting exceeds ${MAX_MANIFEST_DEPTH}`,
        );
      }
      continue;
    }
    if (seen.has(current.value)) continue;
    seen.add(current.value);
    let keys: string[];
    try {
      keys = Object.keys(current.value).sort(compareText);
    } catch {
      addDiagnostic(
        diagnostics,
        "error",
        "MALFORMED_OBJECT",
        current.path,
        "manifest object could not be inspected",
      );
      continue;
    }
    for (const key of keys) {
      const childPath = `${current.path}[${JSON.stringify(key)}]`;
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (FORBIDDEN_AUTHORITY_KEYS.has(normalized)) {
        addDiagnostic(
          diagnostics,
          "error",
          "PLUGIN_AUTHORITY_FORBIDDEN",
          childPath,
          "plugins cannot declare a verdict or alter canonical trust",
        );
      }
      pending.push({
        value: field(current.value, key),
        path: childPath,
        depth: current.depth + 1,
      });
    }
  }
}

export function pluginManifestSigningPayload(manifest: PluginManifest): string {
  const deprecation =
    manifest.lifecycle.deprecation === null
      ? null
      : {
          since: manifest.lifecycle.deprecation.since,
          replacement: manifest.lifecycle.deprecation.replacement,
          removeIn: manifest.lifecycle.deprecation.removeIn,
        };
  return JSON.stringify({
    manifestSchemaVersion: manifest.manifestSchemaVersion,
    id: manifest.id,
    version: manifest.version,
    namespace: manifest.namespace,
    trustMode: manifest.trustMode,
    compatibility: {
      engine: {
        min: manifest.compatibility.engine.min,
        max: manifest.compatibility.engine.max,
      },
      schemaVersions: [...manifest.compatibility.schemaVersions].sort(
        (left, right) => left - right,
      ),
    },
    permissions: {
      network: manifest.permissions.network,
      filesystem: manifest.permissions.filesystem,
      process: manifest.permissions.process,
      environment: manifest.permissions.environment,
    },
    capabilities: [...manifest.capabilities].sort(compareText),
    revision: manifest.revision,
    artifactDigest: manifest.signature.artifactDigest,
    lifecycle: {
      state: manifest.lifecycle.state,
      deprecation,
    },
  });
}

export function createPluginValidationHost(
  trustMode: PluginHostTrustMode,
  trustedKeys: readonly PluginTrustedKey[],
  artifactDigest: string,
  installedRevision = 0,
  installedVersion: string | null = null,
): PluginValidationHost {
  return {
    trustMode,
    engineVersion: ENGINE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    allowedCapabilities: PLUGIN_CAPABILITIES,
    installedRevision,
    installedVersion,
    artifactDigest,
    trustedKeys,
  };
}

function validateHost(
  host: PluginValidationHost,
  diagnostics: PluginManifestDiagnostic[],
): boolean {
  let valid = true;
  const fail = (code: string, path: string, message: string): void => {
    valid = false;
    addDiagnostic(diagnostics, "error", code, path, message);
  };
  if (!isRecord(host)) {
    fail("INVALID_HOST_CONTEXT", "$.host", "host context must be an object");
    return false;
  }
  if (!isOneOf(host.trustMode, PLUGIN_HOST_TRUST_MODES)) {
    fail("INVALID_HOST_CONTEXT", "$.host.trustMode", "invalid trust mode");
  }
  if (parseSemver(host.engineVersion) === null) {
    fail(
      "INVALID_HOST_CONTEXT",
      "$.host.engineVersion",
      "host engine version must be valid semantic versioning",
    );
  }
  if (!isPositiveInteger(host.schemaVersion, 2_147_483_647)) {
    fail(
      "INVALID_HOST_CONTEXT",
      "$.host.schemaVersion",
      "host schema version must be a positive integer",
    );
  }
  if (!isNonNegativeInteger(host.installedRevision)) {
    fail(
      "INVALID_HOST_CONTEXT",
      "$.host.installedRevision",
      "installed revision must be a non-negative integer",
    );
  }
  if (
    host.installedVersion !== null &&
    parseSemver(host.installedVersion) === null
  ) {
    fail(
      "INVALID_HOST_CONTEXT",
      "$.host.installedVersion",
      "installed version must be null or valid semantic versioning",
    );
  }
  const rawAllowedCapabilities: unknown = host.allowedCapabilities;
  if (!Array.isArray(rawAllowedCapabilities)) {
    fail(
      "INVALID_HOST_CONTEXT",
      "$.host.allowedCapabilities",
      "allowed capabilities must be an array",
    );
  } else {
    const seen = new Set<string>();
    const capabilities = rawAllowedCapabilities as readonly unknown[];
    for (const [index, capability] of capabilities.entries()) {
      if (!isOneOf(capability, PLUGIN_CAPABILITIES) || seen.has(capability)) {
        fail(
          "INVALID_HOST_CONTEXT",
          `$.host.allowedCapabilities[${index}]`,
          "host capability allowlist contains an unknown or duplicate value",
        );
      }
      if (typeof capability === "string") seen.add(capability);
    }
  }
  if (!isSha256Digest(host.artifactDigest)) {
    fail(
      "INVALID_HOST_CONTEXT",
      "$.host.artifactDigest",
      "host artifact digest must be sha256:<64 lowercase hex>",
    );
  }
  if (!Array.isArray(host.trustedKeys)) {
    fail(
      "INVALID_HOST_CONTEXT",
      "$.host.trustedKeys",
      "trusted keys must be an array",
    );
  } else {
    const seen = new Set<string>();
    for (const [index, trustedKey] of host.trustedKeys.entries()) {
      if (!isRecord(trustedKey)) {
        fail(
          "INVALID_HOST_CONTEXT",
          `$.host.trustedKeys[${index}]`,
          "trusted key must be an object",
        );
        continue;
      }
      const validKey =
        checkKeys(
          trustedKey,
          ["keyId", "publicKey"],
          `$.host.trustedKeys[${index}]`,
          diagnostics,
        ) &&
        typeof field(trustedKey, "keyId") === "string" &&
        isSha256Digest(field(trustedKey, "keyId")) &&
        typeof field(trustedKey, "publicKey") === "string" &&
        (field(trustedKey, "publicKey") as string).length > 0 &&
        (field(trustedKey, "publicKey") as string).length <= 4_096;
      if (!validKey) {
        fail(
          "INVALID_HOST_CONTEXT",
          `$.host.trustedKeys[${index}]`,
          "trusted key metadata is malformed",
        );
        continue;
      }
      const keyId = field(trustedKey, "keyId") as string;
      const publicKey = field(trustedKey, "publicKey") as string;
      if (seen.has(keyId) || publicKeyId(publicKey) !== keyId) {
        fail(
          "INVALID_HOST_CONTEXT",
          `$.host.trustedKeys[${index}]`,
          "trusted key id does not match the public key",
        );
      }
      seen.add(keyId);
    }
  }
  return valid;
}

export function validatePluginManifest(
  value: unknown,
  host: PluginValidationHost,
): PluginManifestValidationResult {
  const diagnostics: PluginManifestDiagnostic[] = [];
  scanForbiddenAuthority(value, diagnostics);
  let shapeValid = diagnostics.every(
    (diagnostic) => diagnostic.severity === "warning",
  );
  const fail = (code: string, path: string, message: string): void => {
    shapeValid = false;
    addDiagnostic(diagnostics, "error", code, path, message);
  };
  const unsupported = (code: string, path: string, message: string): void => {
    shapeValid = false;
    addDiagnostic(diagnostics, "unsupported", code, path, message);
  };
  if (!isRecord(value)) {
    fail("MANIFEST_NOT_OBJECT", "$", "manifest must be a plain object");
    return finish(null, diagnostics);
  }
  shapeValid =
    checkKeys(
      value,
      [
        "manifestSchemaVersion",
        "id",
        "version",
        "namespace",
        "trustMode",
        "compatibility",
        "permissions",
        "capabilities",
        "revision",
        "signature",
        "lifecycle",
      ],
      "$",
      diagnostics,
    ) && shapeValid;

  const manifestSchemaVersion = field(value, "manifestSchemaVersion");
  if (manifestSchemaVersion === undefined) {
    fail(
      "MISSING_MANIFEST_SCHEMA",
      "$.manifestSchemaVersion",
      "manifestSchemaVersion is required",
    );
  } else if (manifestSchemaVersion !== PLUGIN_MANIFEST_SCHEMA_VERSION) {
    unsupported(
      "UNSUPPORTED_MANIFEST_SCHEMA",
      "$.manifestSchemaVersion",
      "manifest schema version is not supported",
    );
  }
  const id = field(value, "id");
  if (typeof id !== "string" || !isPluginId(id)) {
    fail("INVALID_ID", "$.id", "plugin id must be a bounded package name");
  }
  const version = field(value, "version");
  const parsedVersion = parseSemver(version);
  if (parsedVersion === null) {
    fail(
      "INVALID_VERSION",
      "$.version",
      "plugin version must be stable semantic versioning",
    );
  }
  const namespace = field(value, "namespace");
  if (typeof namespace !== "string" || !NAMESPACE_PATTERN.test(namespace)) {
    fail(
      "INVALID_NAMESPACE",
      "$.namespace",
      "namespace must be 2-16 uppercase letters or digits",
    );
  } else if (CORE_NAMESPACES.has(namespace)) {
    fail(
      "RESERVED_NAMESPACE",
      "$.namespace",
      "namespace is reserved by the canonical rule registry",
    );
  }
  const trustMode = field(value, "trustMode");
  if (!isOneOf(trustMode, PLUGIN_TRUST_MODES)) {
    fail(
      "INVALID_TRUST_MODE",
      "$.trustMode",
      "trustMode must be manifest-only or explicit-opt-in",
    );
  }

  const compatibility = field(value, "compatibility");
  let engineMin: string | null = null;
  let engineMax: string | null = null;
  let schemaVersions: number[] = [];
  if (
    !isRecord(compatibility) ||
    !checkKeys(
      compatibility,
      ["engine", "schemaVersions"],
      "$.compatibility",
      diagnostics,
    )
  ) {
    fail(
      "INVALID_COMPATIBILITY",
      "$.compatibility",
      "compatibility must contain engine and schemaVersions",
    );
  } else {
    const engine = field(compatibility, "engine");
    if (
      !isRecord(engine) ||
      !checkKeys(engine, ["min", "max"], "$.compatibility.engine", diagnostics)
    ) {
      fail(
        "INVALID_ENGINE_RANGE",
        "$.compatibility.engine",
        "engine range must contain min and max",
      );
    } else {
      const min = field(engine, "min");
      const max = field(engine, "max");
      const parsedMin = parseSemver(min);
      const parsedMax = parseSemver(max);
      if (parsedMin === null || parsedMax === null) {
        fail(
          "INVALID_ENGINE_RANGE",
          "$.compatibility.engine",
          "engine range must use stable semantic versions",
        );
      } else if (compareSemver(parsedMin, parsedMax) > 0) {
        fail(
          "INVALID_ENGINE_RANGE",
          "$.compatibility.engine",
          "engine minimum must not exceed maximum",
        );
      } else {
        engineMin = min as string;
        engineMax = max as string;
      }
    }
    const rawSchemaVersions = field(compatibility, "schemaVersions");
    if (
      !Array.isArray(rawSchemaVersions) ||
      rawSchemaVersions.length < 1 ||
      rawSchemaVersions.length > 16 ||
      !rawSchemaVersions.every((entry) =>
        isPositiveInteger(entry, 2_147_483_647),
      )
    ) {
      fail(
        "INVALID_SCHEMA_RANGE",
        "$.compatibility.schemaVersions",
        "schemaVersions must contain 1-16 positive integers",
      );
    } else {
      const unique = new Set<number>();
      for (const entry of rawSchemaVersions) {
        if (unique.has(entry)) {
          fail(
            "INVALID_SCHEMA_RANGE",
            "$.compatibility.schemaVersions",
            "schemaVersions must be unique",
          );
          break;
        }
        unique.add(entry);
      }
      schemaVersions = [...rawSchemaVersions];
    }
  }

  const permissions = field(value, "permissions");
  if (
    !isRecord(permissions) ||
    !checkKeys(
      permissions,
      ["network", "filesystem", "process", "environment"],
      "$.permissions",
      diagnostics,
    )
  ) {
    fail(
      "INVALID_PERMISSIONS",
      "$.permissions",
      "permissions must be an object",
    );
  } else {
    if (field(permissions, "network") !== "deny") {
      fail(
        "PERMISSION_FORBIDDEN",
        "$.permissions.network",
        "network access must be denied",
      );
    }
    if (
      !isOneOf(field(permissions, "filesystem"), [
        "none",
        "scan-root-read-only",
      ])
    ) {
      fail(
        "PERMISSION_FORBIDDEN",
        "$.permissions.filesystem",
        "filesystem access must be none or scan-root-read-only",
      );
    }
    if (field(permissions, "process") !== "deny") {
      fail(
        "PERMISSION_FORBIDDEN",
        "$.permissions.process",
        "process execution must be denied",
      );
    }
    if (field(permissions, "environment") !== "deny") {
      fail(
        "PERMISSION_FORBIDDEN",
        "$.permissions.environment",
        "environment access must be denied",
      );
    }
  }

  const rawCapabilities = field(value, "capabilities");
  const capabilities: PluginCapability[] = [];
  if (
    !Array.isArray(rawCapabilities) ||
    rawCapabilities.length < 1 ||
    rawCapabilities.length > PLUGIN_CAPABILITIES.length
  ) {
    fail(
      "INVALID_CAPABILITIES",
      "$.capabilities",
      "capabilities must contain 1-8 values",
    );
  } else {
    const seen = new Set<string>();
    for (const [index, capability] of rawCapabilities.entries()) {
      if (!isOneOf(capability, PLUGIN_CAPABILITIES)) {
        unsupported(
          "CAPABILITY_UNSUPPORTED",
          `$.capabilities[${index}]`,
          "capability is not implemented by this SDK",
        );
        continue;
      }
      if (seen.has(capability)) {
        fail(
          "DUPLICATE_CAPABILITY",
          `$.capabilities[${index}]`,
          "capability values must be unique",
        );
        continue;
      }
      seen.add(capability);
      capabilities.push(capability);
    }
  }

  const revision = field(value, "revision");
  if (!isPositiveInteger(revision, MAX_MANIFEST_REVISION)) {
    fail(
      "INVALID_REVISION",
      "$.revision",
      `revision must be an integer from 1 to ${MAX_MANIFEST_REVISION}`,
    );
  }

  const signature = field(value, "signature");
  let signatureValid = false;
  if (
    !isRecord(signature) ||
    !checkKeys(
      signature,
      ["algorithm", "keyId", "value", "artifactDigest"],
      "$.signature",
      diagnostics,
    )
  ) {
    fail(
      "INVALID_SIGNATURE_METADATA",
      "$.signature",
      "signature metadata is malformed",
    );
  } else {
    const algorithm = field(signature, "algorithm");
    const keyId = field(signature, "keyId");
    const signatureValue = field(signature, "value");
    const artifactDigest = field(signature, "artifactDigest");
    if (algorithm !== "ed25519") {
      unsupported(
        "SIGNATURE_ALGORITHM_UNSUPPORTED",
        "$.signature.algorithm",
        "only Ed25519 signatures are supported",
      );
    }
    if (typeof keyId !== "string" || !isSha256Digest(keyId)) {
      fail(
        "INVALID_SIGNATURE_METADATA",
        "$.signature.keyId",
        "signature keyId must be a sha256 digest",
      );
    }
    if (
      typeof signatureValue !== "string" ||
      !isEd25519Signature(signatureValue)
    ) {
      fail(
        "INVALID_SIGNATURE_METADATA",
        "$.signature.value",
        "signature must be a 64-byte base64 Ed25519 signature",
      );
    }
    if (typeof artifactDigest !== "string" || !isSha256Digest(artifactDigest)) {
      fail(
        "INVALID_SIGNATURE_METADATA",
        "$.signature.artifactDigest",
        "artifactDigest must be a sha256 digest",
      );
    }
    signatureValid =
      algorithm === "ed25519" &&
      typeof keyId === "string" &&
      isSha256Digest(keyId) &&
      typeof signatureValue === "string" &&
      isEd25519Signature(signatureValue) &&
      typeof artifactDigest === "string" &&
      isSha256Digest(artifactDigest);
  }

  const lifecycle = field(value, "lifecycle");
  if (
    !isRecord(lifecycle) ||
    !checkKeys(
      lifecycle,
      ["state", "deprecation"],
      "$.lifecycle",
      diagnostics,
    ) ||
    !isOneOf(field(lifecycle, "state"), PLUGIN_LIFECYCLE_STATES)
  ) {
    fail(
      "INVALID_LIFECYCLE",
      "$.lifecycle",
      "lifecycle must declare a supported state and deprecation",
    );
  } else {
    const state = field(lifecycle, "state");
    const deprecation = field(lifecycle, "deprecation");
    if (state === "active") {
      if (deprecation !== null) {
        fail(
          "INVALID_DEPRECATION",
          "$.lifecycle.deprecation",
          "active plugins must not declare deprecation",
        );
      }
    } else if (!isRecord(deprecation)) {
      fail(
        "INVALID_DEPRECATION",
        "$.lifecycle.deprecation",
        "deprecated and unsupported plugins require deprecation metadata",
      );
    } else if (
      !checkKeys(
        deprecation,
        ["since", "replacement", "removeIn"],
        "$.lifecycle.deprecation",
        diagnostics,
      )
    ) {
      fail(
        "INVALID_DEPRECATION",
        "$.lifecycle.deprecation",
        "deprecation metadata is malformed",
      );
    } else {
      const since = field(deprecation, "since");
      const replacement = field(deprecation, "replacement");
      const removeIn = field(deprecation, "removeIn");
      const parsedSince = parseSemver(since);
      const parsedRemoveIn = parseSemver(removeIn);
      if (
        parsedSince === null ||
        parsedRemoveIn === null ||
        typeof replacement !== "string" ||
        !isPluginId(replacement)
      ) {
        fail(
          "INVALID_DEPRECATION",
          "$.lifecycle.deprecation",
          "deprecation requires semantic versions and a replacement package",
        );
      } else if (
        parsedVersion !== null &&
        (compareSemver(parsedSince, parsedVersion) > 0 ||
          compareSemver(parsedVersion, parsedRemoveIn) >= 0 ||
          compareSemver(parsedSince, parsedRemoveIn) >= 0)
      ) {
        fail(
          "INVALID_DEPRECATION_RANGE",
          "$.lifecycle.deprecation",
          "deprecation must satisfy since <= version < removeIn",
        );
      }
    }
  }

  const manifestCandidate = {
    manifestSchemaVersion: field(
      value,
      "manifestSchemaVersion",
    ) as typeof PLUGIN_MANIFEST_SCHEMA_VERSION,
    id: id as string,
    version: version as string,
    namespace: namespace as string,
    trustMode: trustMode as PluginTrustMode,
    compatibility: {
      engine: {
        min: engineMin as string,
        max: engineMax as string,
      },
      schemaVersions,
    },
    permissions: {
      network: field(permissions, "network") as "deny",
      filesystem: field(permissions, "filesystem") as
        "none" | "scan-root-read-only",
      process: field(permissions, "process") as "deny",
      environment: field(permissions, "environment") as "deny",
    },
    capabilities,
    revision: revision as number,
    signature: {
      algorithm: field(signature, "algorithm") as "ed25519",
      keyId: field(signature, "keyId") as string,
      value: field(signature, "value") as string,
      artifactDigest: field(signature, "artifactDigest") as string,
    },
    lifecycle: lifecycle as PluginLifecycle,
  } as PluginManifest;

  if (!shapeValid) return finish(null, diagnostics);
  if (!validateHost(host, diagnostics)) return finish(null, diagnostics);

  const hostEngine = parseSemver(host.engineVersion) as Semver;
  const minEngine = parseSemver(
    manifestCandidate.compatibility.engine.min,
  ) as Semver;
  const maxEngine = parseSemver(
    manifestCandidate.compatibility.engine.max,
  ) as Semver;
  if (
    compareSemver(hostEngine, minEngine) < 0 ||
    compareSemver(hostEngine, maxEngine) > 0
  ) {
    addDiagnostic(
      diagnostics,
      "unsupported",
      "ENGINE_UNSUPPORTED",
      "$.compatibility.engine",
      `host engine ${host.engineVersion} is outside the plugin range`,
    );
  }
  if (
    !manifestCandidate.compatibility.schemaVersions.includes(host.schemaVersion)
  ) {
    addDiagnostic(
      diagnostics,
      "unsupported",
      "SCHEMA_UNSUPPORTED",
      "$.compatibility.schemaVersions",
      `host schema ${host.schemaVersion} is not declared by the plugin`,
    );
  }
  for (const [index, capability] of manifestCandidate.capabilities.entries()) {
    if (!host.allowedCapabilities.includes(capability)) {
      addDiagnostic(
        diagnostics,
        "unsupported",
        "CAPABILITY_NOT_ALLOWED",
        `$.capabilities[${index}]`,
        `host does not allow capability ${capability}`,
      );
    }
  }
  if (manifestCandidate.revision < host.installedRevision) {
    addDiagnostic(
      diagnostics,
      "error",
      "REVISION_ROLLBACK_REJECTED",
      "$.revision",
      `revision ${manifestCandidate.revision} is lower than installed revision ${host.installedRevision}`,
    );
  }
  if (host.installedVersion !== null) {
    const installedVersion = parseSemver(host.installedVersion) as Semver;
    const candidateVersion = parseSemver(manifestCandidate.version) as Semver;
    if (compareSemver(candidateVersion, installedVersion) < 0) {
      addDiagnostic(
        diagnostics,
        "error",
        "VERSION_ROLLBACK_REJECTED",
        "$.version",
        `version ${manifestCandidate.version} is lower than installed version ${host.installedVersion}`,
      );
    }
  }
  if (
    TRUST_RANK[host.trustMode] <
    TRUST_RANK[manifestCandidate.trustMode as PluginHostTrustMode]
  ) {
    addDiagnostic(
      diagnostics,
      "blocked",
      "TRUST_GATE_CLOSED",
      "$.trustMode",
      `host trust mode ${host.trustMode} does not authorize ${manifestCandidate.trustMode}`,
    );
  }
  if (manifestCandidate.lifecycle.state === "deprecated") {
    addDiagnostic(
      diagnostics,
      "warning",
      "PLUGIN_DEPRECATED",
      "$.lifecycle",
      "plugin is deprecated and remains accepted only within its declared range",
    );
  }
  if (manifestCandidate.lifecycle.state === "unsupported") {
    addDiagnostic(
      diagnostics,
      "blocked",
      "PLUGIN_UNSUPPORTED",
      "$.lifecycle.state",
      "unsupported plugins cannot be admitted",
    );
  }
  if (manifestCandidate.signature.artifactDigest !== host.artifactDigest) {
    addDiagnostic(
      diagnostics,
      "error",
      "ARTIFACT_MISMATCH",
      "$.signature.artifactDigest",
      "manifest signature is bound to a different artifact",
    );
  }

  if (signatureValid) {
    const trustedKey = host.trustedKeys.find(
      (candidate) => candidate.keyId === manifestCandidate.signature.keyId,
    );
    if (trustedKey === undefined) {
      addDiagnostic(
        diagnostics,
        "error",
        "SIGNATURE_KEY_UNTRUSTED",
        "$.signature.keyId",
        "signature key is not trusted by the host",
      );
    } else {
      try {
        const valid = verify(
          null,
          Buffer.from(pluginManifestSigningPayload(manifestCandidate), "utf8"),
          createPublicKey(trustedKey.publicKey),
          Buffer.from(manifestCandidate.signature.value, "base64"),
        );
        if (!valid) {
          addDiagnostic(
            diagnostics,
            "error",
            "SIGNATURE_INVALID",
            "$.signature.value",
            "Ed25519 signature verification failed",
          );
        }
      } catch {
        addDiagnostic(
          diagnostics,
          "error",
          "SIGNATURE_INVALID",
          "$.signature.value",
          "Ed25519 signature verification failed",
        );
      }
    }
  }

  return finish(manifestCandidate, diagnostics);
}

function finish(
  manifest: PluginManifest | null,
  diagnostics: PluginManifestDiagnostic[],
): PluginManifestValidationResult {
  const sorted = [...diagnostics].sort(
    (left, right) =>
      compareText(left.path, right.path) ||
      compareText(left.code, right.code) ||
      compareText(left.message, right.message),
  );
  const hasSeverity = (severity: PluginDiagnosticSeverity): boolean =>
    sorted.some((diagnostic) => diagnostic.severity === severity);
  const status: PluginValidationStatus = hasSeverity("error")
    ? "rejected"
    : hasSeverity("unsupported")
      ? "unsupported"
      : hasSeverity("blocked")
        ? "blocked"
        : "accepted";
  return { status, manifest, diagnostics: sorted };
}
