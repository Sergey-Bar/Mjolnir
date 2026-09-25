export const UNIVERSAL_FRAMEWORK_PACK_SCHEMA =
  "m41.universal-framework-pack@1" as const;
export const UNIVERSAL_FRAMEWORK_PACK_SCHEMA_VERSION = 1 as const;
export const UNIVERSAL_FRAMEWORK_PACK_FACTORY_VERSION = 1 as const;

export const FRAMEWORK_SEMANTIC_RULES = [
  "discovery",
  "version-detection",
  "test-discovery",
  "assertions",
  "fixtures",
  "mocks",
  "runtime-reports",
  "coverage",
] as const;

export const FRAMEWORK_LIFECYCLE_RULES = [
  "suite",
  "setup",
  "teardown",
  "cleanup",
  "failure",
  "retry",
  "parallelism",
  "isolation",
] as const;

export const FRAMEWORK_CAPABILITY_TIERS = [
  "candidate",
  "experimental",
  "supported",
  "degraded",
  "unsupported",
  "deprecated",
] as const;

export const FRAMEWORK_EVIDENCE_KINDS = [
  "rule",
  "test",
  "fixture",
  "runtime-report",
  "coverage-report",
  "corpus",
  "consumer-test",
  "security-test",
  "artifact",
] as const;

export const UNIVERSAL_FRAMEWORK_PACK_LIMITS = Object.freeze({
  maxValidatedVersions: 64,
  maxEvidencePerRule: 16,
  maxScanDepth: 24,
  maxScanNodes: 4096,
  maxIdentifierLength: 256,
});

export const UNIVERSAL_FRAMEWORK_PACK_AUTHORITY = Object.freeze({
  certification: "not-claimed",
  verdict: "not-declared",
  gate: "none",
} as const);

export type FrameworkSemanticRule = (typeof FRAMEWORK_SEMANTIC_RULES)[number];
export type FrameworkLifecycleRule = (typeof FRAMEWORK_LIFECYCLE_RULES)[number];
export type FrameworkCapabilityTier =
  (typeof FRAMEWORK_CAPABILITY_TIERS)[number];
export type FrameworkEvidenceKind = (typeof FRAMEWORK_EVIDENCE_KINDS)[number];

export interface FrameworkVersionCompatibility {
  readonly min: string;
  readonly maxExclusive: string;
  readonly validatedVersions: readonly string[];
}

export interface FrameworkEvidencePointer {
  readonly kind: FrameworkEvidenceKind;
  readonly id: string;
}

export interface FrameworkRuleCoverage<TRule extends string> {
  readonly rule: TRule;
  readonly tier: FrameworkCapabilityTier;
  readonly evidence: readonly FrameworkEvidencePointer[];
  readonly limitation?: string;
}

export interface FrameworkRuleCoverageSet {
  readonly semantic: readonly FrameworkRuleCoverage<FrameworkSemanticRule>[];
  readonly lifecycle: readonly FrameworkRuleCoverage<FrameworkLifecycleRule>[];
}

export interface UniversalFrameworkPackDefinition {
  readonly packId: string;
  readonly frameworkId: string;
  readonly packVersion: string;
  readonly compatibility: FrameworkVersionCompatibility;
  readonly coverage: FrameworkRuleCoverageSet;
}

export interface UniversalFrameworkPackFactoryRecord {
  readonly schema: typeof UNIVERSAL_FRAMEWORK_PACK_SCHEMA;
  readonly factoryVersion: typeof UNIVERSAL_FRAMEWORK_PACK_FACTORY_VERSION;
  readonly definition: UniversalFrameworkPackDefinition;
  readonly authority: typeof UNIVERSAL_FRAMEWORK_PACK_AUTHORITY;
}

export interface UniversalFrameworkPackManifestRecord extends UniversalFrameworkPackDefinition {
  readonly schema: typeof UNIVERSAL_FRAMEWORK_PACK_SCHEMA;
  readonly schemaVersion: typeof UNIVERSAL_FRAMEWORK_PACK_SCHEMA_VERSION;
  readonly frameworkVersion: string;
  readonly authority: typeof UNIVERSAL_FRAMEWORK_PACK_AUTHORITY;
}

export type UniversalFrameworkPackDiagnosticCode =
  | "MALFORMED_RECORD"
  | "VERSION_RANGE_CONFLICT"
  | "FRAMEWORK_VERSION_UNSUPPORTED"
  | "SEMANTIC_COVERAGE_INCOMPLETE"
  | "LIFECYCLE_COVERAGE_INCOMPLETE"
  | "CAPABILITY_TIER_INVALID"
  | "EVIDENCE_REQUIRED"
  | "EVIDENCE_INVALID"
  | "AUTHORITY_FORBIDDEN"
  | "PASS_FORBIDDEN"
  | "RESOURCE_LIMIT";

export interface UniversalFrameworkPackDiagnostic {
  readonly code: UniversalFrameworkPackDiagnosticCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversalFrameworkPackFactoryResult {
  readonly status: "accepted" | "rejected";
  readonly record: UniversalFrameworkPackFactoryRecord | null;
  readonly diagnostics: readonly UniversalFrameworkPackDiagnostic[];
}

export interface UniversalFrameworkPackManifestResult {
  readonly status: "accepted" | "unsupported" | "rejected";
  readonly manifest: UniversalFrameworkPackManifestRecord | null;
  readonly diagnostics: readonly UniversalFrameworkPackDiagnostic[];
}

type Semver = readonly [number, number, number];

const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "authority",
  "canonicaltrust",
  "canonicalverdict",
  "certificationstate",
  "certified",
  "gateoverride",
  "gatestatus",
  "gateverdict",
  "outcome",
  "pass",
  "releaseauthorizationstate",
  "result",
  "status",
  "trust",
  "trustlevel",
  "verdict",
]);

class PackContractError extends Error {
  constructor(
    readonly code: UniversalFrameworkPackDiagnosticCode,
    readonly path: string,
    readonly detail: string,
  ) {
    super(detail);
  }
}

function fail(
  code: UniversalFrameworkPackDiagnosticCode,
  path: string,
  detail: string,
): never {
  throw new PackContractError(code, path, detail);
}

function diagnostic(error: unknown): UniversalFrameworkPackDiagnostic {
  if (error instanceof PackContractError) {
    return { code: error.code, path: error.path, message: error.detail };
  }
  return {
    code: "MALFORMED_RECORD",
    path: "$",
    message: "Framework pack input could not be validated",
  };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareSemver(left: Semver, right: Semver): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
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

function record(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail("MALFORMED_RECORD", path, "Expected an object");
  return value;
}

function list(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) fail("MALFORMED_RECORD", path, "Expected a list");
  return value as readonly unknown[];
}

function field(value: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && "value" in descriptor
    ? descriptor.value
    : undefined;
}

function keys(value: object): readonly string[] {
  try {
    return Object.keys(value).sort(compareText);
  } catch {
    return [];
  }
}

function exact(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  const actual = keys(value);
  const allowed = [...expected].sort(compareText);
  if (
    actual.length !== allowed.length ||
    actual.some((key, index) => key !== allowed[index])
  ) {
    fail("MALFORMED_RECORD", path, "Record fields do not match the contract");
  }
}

function oneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.some((entry) => entry === value);
}

function scanClaims(value: unknown, allowRootAuthority: boolean): void {
  const stack: Array<{ value: unknown; path: string; depth: number }> = [
    { value, path: "$", depth: 0 },
  ];
  const seen = new WeakSet<object>();
  let nodes = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    nodes += 1;
    if (
      current.depth > UNIVERSAL_FRAMEWORK_PACK_LIMITS.maxScanDepth ||
      nodes > UNIVERSAL_FRAMEWORK_PACK_LIMITS.maxScanNodes
    ) {
      fail(
        "RESOURCE_LIMIT",
        current.path,
        "Pack input exceeds validation bounds",
      );
    }
    if (
      typeof current.value === "string" &&
      current.value.trim().toUpperCase() === "PASS"
    ) {
      fail(
        "PASS_FORBIDDEN",
        current.path,
        "Framework packs cannot declare PASS",
      );
    }
    if (!Array.isArray(current.value) && !isRecord(current.value)) continue;
    if (seen.has(current.value)) continue;
    seen.add(current.value);

    for (const key of keys(current.value)) {
      const path = `${current.path}.${key}`;
      const rootAuthority =
        allowRootAuthority && current.path === "$" && key === "authority";
      if (
        !rootAuthority &&
        FORBIDDEN_AUTHORITY_KEYS.has(
          key.toLowerCase().replaceAll(/[^a-z0-9]/g, ""),
        )
      ) {
        fail(
          "AUTHORITY_FORBIDDEN",
          path,
          "Framework packs cannot declare verdict or gate authority",
        );
      }
      if (rootAuthority) continue;
      const descriptor = Object.getOwnPropertyDescriptor(current.value, key);
      stack.push({
        value:
          descriptor !== undefined && "value" in descriptor
            ? descriptor.value
            : undefined,
        path,
        depth: current.depth + 1,
      });
    }
  }
}

function semver(value: unknown, path: string): Semver {
  if (typeof value !== "string" || value.length > 29) {
    fail("MALFORMED_RECORD", path, "Expected a stable semantic version");
  }
  const parts = value.split(".");
  if (parts.length !== 3) {
    fail("MALFORMED_RECORD", path, "Expected a stable semantic version");
  }
  const numbers = parts.map((part) => {
    if (
      part.length < 1 ||
      part.length > 9 ||
      (part.length > 1 && part.startsWith("0")) ||
      !/^\d+$/.test(part)
    ) {
      fail("MALFORMED_RECORD", path, "Expected a stable semantic version");
    }
    return Number(part);
  });
  return [numbers[0] as number, numbers[1] as number, numbers[2] as number];
}

function identifier(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > UNIVERSAL_FRAMEWORK_PACK_LIMITS.maxIdentifierLength ||
    !/^[a-z0-9][a-z0-9._-]*$/.test(value) ||
    value.includes("..")
  ) {
    fail("MALFORMED_RECORD", path, "Expected a bounded lowercase identifier");
  }
  return value;
}

function evidenceId(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > UNIVERSAL_FRAMEWORK_PACK_LIMITS.maxIdentifierLength ||
    !/^[a-z0-9][\w./-]*$/i.test(value) ||
    value.includes("..") ||
    value.includes("//")
  ) {
    fail("EVIDENCE_INVALID", path, "Expected a bounded local evidence pointer");
  }
  return value;
}

function compatibility(value: unknown): FrameworkVersionCompatibility {
  const input = record(value, "compatibility");
  exact(input, ["min", "maxExclusive", "validatedVersions"], "compatibility");
  const min = field(input, "min") as string;
  const maxExclusive = field(input, "maxExclusive") as string;
  const minVersion = semver(min, "compatibility.min");
  const maxVersion = semver(maxExclusive, "compatibility.maxExclusive");
  if (compareSemver(minVersion, maxVersion) >= 0) {
    fail(
      "VERSION_RANGE_CONFLICT",
      "compatibility",
      "Minimum must be below maxExclusive",
    );
  }

  const values = list(
    field(input, "validatedVersions"),
    "compatibility.validatedVersions",
  );
  if (
    values.length < 1 ||
    values.length > UNIVERSAL_FRAMEWORK_PACK_LIMITS.maxValidatedVersions
  ) {
    fail(
      "MALFORMED_RECORD",
      "compatibility.validatedVersions",
      "Validated versions must be a non-empty bounded list",
    );
  }
  const seen = new Set<string>();
  for (const value of values) {
    const version = value as string;
    const parsed = semver(version, "compatibility.validatedVersions");
    if (seen.has(version)) {
      fail(
        "MALFORMED_RECORD",
        "compatibility.validatedVersions",
        "Validated versions must be unique",
      );
    }
    if (
      compareSemver(parsed, minVersion) < 0 ||
      compareSemver(parsed, maxVersion) >= 0
    ) {
      fail(
        "VERSION_RANGE_CONFLICT",
        "compatibility.validatedVersions",
        "Validated version falls outside the compatibility range",
      );
    }
    seen.add(version);
  }
  return Object.freeze({
    min,
    maxExclusive,
    validatedVersions: Object.freeze(
      values
        .map((version) => version as string)
        .sort((left, right) =>
          compareSemver(
            semver(left, "compatibility.validatedVersions"),
            semver(right, "compatibility.validatedVersions"),
          ),
        ),
    ),
  });
}

function evidence(
  value: unknown,
  path: string,
): readonly FrameworkEvidencePointer[] {
  const values = list(value, path);
  if (values.length > UNIVERSAL_FRAMEWORK_PACK_LIMITS.maxEvidencePerRule) {
    fail("EVIDENCE_INVALID", path, "Evidence list exceeds the contract bound");
  }
  const seen = new Set<string>();
  const pointers = values.map((value) => {
    const input = record(value, path);
    exact(input, ["kind", "id"], path);
    const kind = field(input, "kind");
    if (!oneOf(kind, FRAMEWORK_EVIDENCE_KINDS)) {
      fail("EVIDENCE_INVALID", path, "Unknown evidence kind");
    }
    const id = evidenceId(field(input, "id"), `${path}.id`);
    const key = `${kind}:${id}`;
    if (seen.has(key))
      fail("EVIDENCE_INVALID", path, "Duplicate evidence pointer");
    seen.add(key);
    return Object.freeze({ kind, id });
  });
  return Object.freeze(
    pointers.sort((left, right) =>
      compareText(`${left.kind}:${left.id}`, `${right.kind}:${right.id}`),
    ),
  );
}

function coverageDimension<TRule extends string>(
  value: unknown,
  rules: readonly TRule[],
  path: string,
  code: "SEMANTIC_COVERAGE_INCOMPLETE" | "LIFECYCLE_COVERAGE_INCOMPLETE",
): readonly FrameworkRuleCoverage<TRule>[] {
  const values = list(value, path);
  if (values.length > rules.length)
    fail(code, path, "Too many coverage records");
  const byRule = new Map<TRule, FrameworkRuleCoverage<TRule>>();

  values.forEach((value, index) => {
    const itemPath = `${path}[${index}]`;
    const input = record(value, itemPath);
    const rule = field(input, "rule");
    if (!oneOf(rule, rules) || byRule.has(rule)) {
      fail(code, `${itemPath}.rule`, "Unknown or duplicate rule");
    }
    const expected = ["rule", "tier", "evidence"];
    const limitation = field(input, "limitation");
    if (limitation !== undefined) expected.push("limitation");
    exact(input, expected, itemPath);

    const tier = field(input, "tier");
    if (!oneOf(tier, FRAMEWORK_CAPABILITY_TIERS)) {
      fail(
        "CAPABILITY_TIER_INVALID",
        `${itemPath}.tier`,
        "Capability tier is outside the M41 contract",
      );
    }
    const pointers = evidence(field(input, "evidence"), `${itemPath}.evidence`);
    if (tier !== "unsupported" && pointers.length === 0) {
      fail(
        "EVIDENCE_REQUIRED",
        `${itemPath}.evidence`,
        "Claimed capability tiers require evidence",
      );
    }
    if (
      limitation !== undefined &&
      (typeof limitation !== "string" || limitation.trim().length === 0)
    ) {
      fail("MALFORMED_RECORD", `${itemPath}.limitation`, "Invalid limitation");
    }
    if (
      (tier === "degraded" || tier === "unsupported") &&
      limitation === undefined
    ) {
      fail(
        "MALFORMED_RECORD",
        `${itemPath}.limitation`,
        "Degraded or unsupported capability requires a limitation",
      );
    }
    byRule.set(
      rule,
      Object.freeze(
        limitation === undefined
          ? { rule, tier, evidence: pointers }
          : { rule, tier, evidence: pointers, limitation },
      ),
    );
  });

  if (byRule.size !== rules.length) {
    fail(
      code,
      path,
      "Framework pack must declare each required rule exactly once",
    );
  }
  return Object.freeze(
    rules.map((rule) => byRule.get(rule)).filter((item) => item !== undefined),
  );
}

function coverage(value: unknown): FrameworkRuleCoverageSet {
  const input = record(value, "coverage");
  if (field(input, "semantic") === undefined) {
    fail(
      "SEMANTIC_COVERAGE_INCOMPLETE",
      "coverage.semantic",
      "Framework pack must declare each required rule exactly once",
    );
  }
  if (field(input, "lifecycle") === undefined) {
    fail(
      "LIFECYCLE_COVERAGE_INCOMPLETE",
      "coverage.lifecycle",
      "Framework pack must declare each required rule exactly once",
    );
  }
  exact(input, ["semantic", "lifecycle"], "coverage");
  return Object.freeze({
    semantic: coverageDimension(
      field(input, "semantic"),
      FRAMEWORK_SEMANTIC_RULES,
      "coverage.semantic",
      "SEMANTIC_COVERAGE_INCOMPLETE",
    ),
    lifecycle: coverageDimension(
      field(input, "lifecycle"),
      FRAMEWORK_LIFECYCLE_RULES,
      "coverage.lifecycle",
      "LIFECYCLE_COVERAGE_INCOMPLETE",
    ),
  });
}

function definition(value: unknown): UniversalFrameworkPackDefinition {
  scanClaims(value, false);
  const input = record(value, "$");
  exact(
    input,
    ["packId", "frameworkId", "packVersion", "compatibility", "coverage"],
    "$",
  );
  const packVersion = field(input, "packVersion");
  semver(packVersion, "packVersion");
  return Object.freeze({
    packId: identifier(field(input, "packId"), "packId"),
    frameworkId: identifier(field(input, "frameworkId"), "frameworkId"),
    packVersion: packVersion as string,
    compatibility: compatibility(field(input, "compatibility")),
    coverage: coverage(field(input, "coverage")),
  });
}

function nonCertificationAuthority(value: unknown): boolean {
  return (
    isRecord(value) &&
    keys(value).length === 3 &&
    field(value, "certification") === "not-claimed" &&
    field(value, "verdict") === "not-declared" &&
    field(value, "gate") === "none"
  );
}

export function createUniversalFrameworkPackFactoryRecord(
  value: unknown,
): UniversalFrameworkPackFactoryResult {
  try {
    const pack = definition(value);
    return {
      status: "accepted",
      record: Object.freeze({
        schema: UNIVERSAL_FRAMEWORK_PACK_SCHEMA,
        factoryVersion: UNIVERSAL_FRAMEWORK_PACK_FACTORY_VERSION,
        definition: pack,
        authority: UNIVERSAL_FRAMEWORK_PACK_AUTHORITY,
      }),
      diagnostics: Object.freeze([]),
    };
  } catch (error) {
    return {
      status: "rejected",
      record: null,
      diagnostics: Object.freeze([diagnostic(error)]),
    };
  }
}

export function createUniversalFrameworkPackManifest(
  value: unknown,
  frameworkVersion: unknown,
): UniversalFrameworkPackManifestResult {
  try {
    scanClaims(value, true);
    const input = record(value, "$");
    exact(input, ["schema", "factoryVersion", "definition", "authority"], "$");
    if (
      field(input, "schema") !== UNIVERSAL_FRAMEWORK_PACK_SCHEMA ||
      field(input, "factoryVersion") !==
        UNIVERSAL_FRAMEWORK_PACK_FACTORY_VERSION
    ) {
      fail(
        "MALFORMED_RECORD",
        "$",
        "Unsupported framework pack factory schema",
      );
    }
    if (!nonCertificationAuthority(field(input, "authority"))) {
      fail(
        "AUTHORITY_FORBIDDEN",
        "authority",
        "Factory authority must remain non-certifying",
      );
    }
    const pack = definition(field(input, "definition"));
    semver(frameworkVersion, "frameworkVersion");
    if (
      typeof frameworkVersion !== "string" ||
      !pack.compatibility.validatedVersions.includes(frameworkVersion)
    ) {
      fail(
        "FRAMEWORK_VERSION_UNSUPPORTED",
        "frameworkVersion",
        "Requested framework version is not validated by this pack",
      );
    }
    return {
      status: "accepted",
      manifest: Object.freeze({
        schema: UNIVERSAL_FRAMEWORK_PACK_SCHEMA,
        schemaVersion: UNIVERSAL_FRAMEWORK_PACK_SCHEMA_VERSION,
        packId: pack.packId,
        frameworkId: pack.frameworkId,
        packVersion: pack.packVersion,
        frameworkVersion,
        compatibility: pack.compatibility,
        coverage: pack.coverage,
        authority: UNIVERSAL_FRAMEWORK_PACK_AUTHORITY,
      }),
      diagnostics: Object.freeze([]),
    };
  } catch (error) {
    const rejected = diagnostic(error);
    return {
      status:
        rejected.code === "FRAMEWORK_VERSION_UNSUPPORTED"
          ? "unsupported"
          : "rejected",
      manifest: null,
      diagnostics: Object.freeze([rejected]),
    };
  }
}
