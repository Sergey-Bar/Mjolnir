import { createHash } from "node:crypto";

export const M49_EXPERIENCE_SCHEMA = "m49.full-product-experience@1" as const;
export const M49_SURFACE_ADAPTER_SCHEMA = "m49.surface-adapter@1" as const;
export const M49_SURFACE_OBSERVATION_SCHEMA =
  "m49.surface-observation@1" as const;
export const M49_PARITY_SCHEMA = "m49.experience-parity@1" as const;

export const M49_SURFACES = [
  "cli",
  "json",
  "sarif",
  "pr",
  "web",
  "mcp",
  "agent",
] as const;

export const M49_SECTIONS = [
  "change",
  "risk",
  "verification",
  "evidence",
  "gaps",
  "trust",
  "action",
] as const;

export const M49_PERSONAS = [
  "beginner",
  "expert",
  "keyboard-screen-reader",
  "error-recovery",
  "clean-consumer",
] as const;

export const M49_RESULT_VERDICTS = [
  "PASS",
  "FINDINGS",
  "PARTIAL",
  "INCONCLUSIVE",
  "UNKNOWN",
  "UNSUPPORTED",
  "ERROR",
] as const;

export const M49_SECTION_STATES = [
  "COMPLETE",
  "PARTIAL",
  "UNAVAILABLE",
  "UNKNOWN",
  "UNSUPPORTED",
] as const;

export const M49_ACCESSIBILITY_STATES = [
  "PASS",
  "FAIL",
  "PARTIAL",
  "UNKNOWN",
  "UNSUPPORTED",
] as const;

export const M49_LOCALIZATION_STATES = [
  "CURRENT",
  "STALE",
  "PARTIAL",
  "UNKNOWN",
  "UNSUPPORTED",
] as const;

export const M49_RECOVERY_STATES = [
  "AVAILABLE",
  "PARTIAL",
  "MISSING",
  "UNKNOWN",
  "UNSUPPORTED",
] as const;

export const M49_PARITY_VERDICTS = [
  "PASS",
  "FAIL",
  "PARTIAL",
  "INCONCLUSIVE",
  "UNSUPPORTED",
] as const;

export const M49_SURFACE_VERDICTS = [
  "MATCH",
  "DIVERGENT",
  "PARTIAL",
  "STALE",
  "FOREIGN",
  "MALFORMED",
  "UNSUPPORTED",
  "INCOMPLETE",
] as const;

export const M49_LIMITS = Object.freeze({
  maxIdLength: 128,
  maxTextLength: 2_048,
  maxTimestampLength: 64,
  maxEvidenceAgeMs: 86_400_000,
  maxSurfaceObservations: M49_SURFACES.length,
});

export type M49Surface = (typeof M49_SURFACES)[number];
export type M49SectionId = (typeof M49_SECTIONS)[number];
export type M49Persona = (typeof M49_PERSONAS)[number];
export type M49ResultVerdict = (typeof M49_RESULT_VERDICTS)[number];
export type M49ResultCompleteness = "COMPLETE" | "PARTIAL";
export type M49SectionState = (typeof M49_SECTION_STATES)[number];
export type M49AccessibilityState = (typeof M49_ACCESSIBILITY_STATES)[number];
export type M49LocalizationState = (typeof M49_LOCALIZATION_STATES)[number];
export type M49RecoveryState = (typeof M49_RECOVERY_STATES)[number];
export type M49ParityVerdict = (typeof M49_PARITY_VERDICTS)[number];
export type M49SurfaceVerdict = (typeof M49_SURFACE_VERDICTS)[number];
export type M49SurfaceSupport = "SUPPORTED" | "UNSUPPORTED";
export type M49ObservationCompleteness = "COMPLETE" | "PARTIAL";
export type M49ParityInputState = "COMPLETE" | "PARTIAL" | "MALFORMED";

export type M49ParityReason =
  | "SURFACE_MISSING"
  | "SURFACE_LIMIT"
  | "DUPLICATE_SURFACE"
  | "OBSERVATION_MALFORMED"
  | "EVIDENCE_FUTURE"
  | "EVIDENCE_STALE"
  | "CANDIDATE_FOREIGN"
  | "SURFACE_PARTIAL"
  | "SURFACE_UNSUPPORTED"
  | "PROJECTION_DIVERGENT"
  | "ACCESSIBILITY_NOT_PASS"
  | "LOCALIZATION_NOT_CURRENT"
  | "RECOVERY_NOT_AVAILABLE"
  | "EXPERIENCE_STATE_CONFLICT";

export interface M49CandidateBinding {
  readonly repositoryId: string;
  readonly candidateId: string;
  readonly revision: string;
}

export interface M49SectionView {
  readonly id: M49SectionId;
  readonly state: M49SectionState;
  readonly title: string;
  readonly summary: string;
}

export interface M49CanonicalResultViewModel {
  readonly schema: typeof M49_EXPERIENCE_SCHEMA;
  readonly resultId: string;
  readonly binding: M49CandidateBinding;
  readonly generatedAt: string;
  readonly verdict: M49ResultVerdict;
  readonly completeness: M49ResultCompleteness;
  readonly headline: string;
  readonly summary: string;
  readonly primaryAction: string;
  readonly sections: readonly M49SectionView[];
}

export type M49CanonicalResultInput = M49CanonicalResultViewModel;

export interface M49SurfaceAdapterDefinition {
  readonly surface: M49Surface;
  readonly outputKind:
    | "terminal-text"
    | "json-document"
    | "sarif-document"
    | "markdown-comment"
    | "html-document"
    | "mcp-tool-result"
    | "agent-message";
  readonly mediaType: string;
}

export const M49_SURFACE_ADAPTERS = Object.freeze({
  cli: Object.freeze({
    surface: "cli",
    outputKind: "terminal-text",
    mediaType: "text/plain",
  }),
  json: Object.freeze({
    surface: "json",
    outputKind: "json-document",
    mediaType: "application/json",
  }),
  sarif: Object.freeze({
    surface: "sarif",
    outputKind: "sarif-document",
    mediaType: "application/sarif+json",
  }),
  pr: Object.freeze({
    surface: "pr",
    outputKind: "markdown-comment",
    mediaType: "text/markdown",
  }),
  web: Object.freeze({
    surface: "web",
    outputKind: "html-document",
    mediaType: "text/html",
  }),
  mcp: Object.freeze({
    surface: "mcp",
    outputKind: "mcp-tool-result",
    mediaType: "application/json",
  }),
  agent: Object.freeze({
    surface: "agent",
    outputKind: "agent-message",
    mediaType: "application/json",
  }),
} satisfies Readonly<Record<M49Surface, M49SurfaceAdapterDefinition>>);

export interface M49SurfaceProjection {
  readonly verdict: M49ResultVerdict;
  readonly completeness: M49ResultCompleteness;
  readonly sectionOrder: readonly M49SectionId[];
  readonly sectionStates: Readonly<Record<M49SectionId, M49SectionState>>;
  readonly primaryAction: string;
}

export interface M49SurfaceAdapter {
  readonly schema: typeof M49_SURFACE_ADAPTER_SCHEMA;
  readonly surface: M49Surface;
  readonly outputKind: M49SurfaceAdapterDefinition["outputKind"];
  readonly mediaType: string;
  readonly resultId: string;
  readonly binding: M49CandidateBinding;
  readonly canonicalDigest: string;
  readonly projection: M49SurfaceProjection;
}

export interface M49ExperienceEvidence {
  readonly accessibility: M49AccessibilityState;
  readonly localization: M49LocalizationState;
  readonly recovery: M49RecoveryState;
}

export interface M49SurfaceObservation {
  readonly schema: typeof M49_SURFACE_OBSERVATION_SCHEMA;
  readonly surface: M49Surface;
  readonly support: M49SurfaceSupport;
  readonly completeness: M49ObservationCompleteness;
  readonly capturedAt: string;
  readonly binding: M49CandidateBinding;
  readonly adapter: M49SurfaceAdapter | null;
  readonly experience: M49ExperienceEvidence;
  readonly unsupportedReason: string | null;
}

export interface M49ParityOptions {
  readonly evaluatedAt: string;
}

export interface M49SurfaceParityResult {
  readonly surface: M49Surface;
  readonly verdict: M49SurfaceVerdict;
  readonly reasons: readonly M49ParityReason[];
  readonly experience: M49ExperienceEvidence | null;
}

export interface M49ParityReport {
  readonly schema: typeof M49_PARITY_SCHEMA;
  readonly inputState: M49ParityInputState;
  readonly evaluatedAt: string;
  readonly candidate: M49CandidateBinding | null;
  readonly resultId: string | null;
  readonly canonicalDigest: string | null;
  readonly canonicalCompleteness: M49ResultCompleteness | "UNKNOWN";
  readonly verdict: M49ParityVerdict;
  readonly unprocessedCount: number;
  readonly surfaces: readonly M49SurfaceParityResult[];
}

export type M49PersonaCompletion = "COMPLETE" | "INCOMPLETE";

export type M49PersonaReason =
  | "PARITY_REPORT_INVALID"
  | "PARITY_NOT_PASS"
  | "CANONICAL_PARTIAL"
  | "SURFACE_SET_INVALID"
  | "SURFACE_NOT_MATCH";

export interface M49PersonaResult {
  readonly persona: M49Persona;
  readonly completion: M49PersonaCompletion;
  readonly reasons: readonly M49PersonaReason[];
  readonly blockingSurfaces: readonly M49Surface[];
}

const SAFE_ID = /^[\w./@:+-]+$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const PARITY_INPUT_STATES = ["COMPLETE", "PARTIAL", "MALFORMED"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value) as unknown;
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function own(value: Record<string, unknown>, key: string): unknown {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && "value" in descriptor
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
}

function includes<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (values as readonly string[]).includes(value)
  );
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 32 || (codePoint >= 127 && codePoint <= 159)) {
      return true;
    }
  }
  return false;
}

function isSafeId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= M49_LIMITS.maxIdLength &&
    value.trim() === value &&
    SAFE_ID.test(value) &&
    !hasControlCharacter(value)
  );
}

function isSafeText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= M49_LIMITS.maxTextLength &&
    value.trim() === value &&
    !hasControlCharacter(value)
  );
}

function isTimestamp(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > M49_LIMITS.maxTimestampLength
  ) {
    return false;
  }
  const milliseconds = Date.parse(value);
  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value
  );
}

function timestampMilliseconds(value: string): number {
  return Date.parse(value);
}

function isBinding(value: unknown): value is M49CandidateBinding {
  if (!isRecord(value)) return false;
  return (
    isSafeId(own(value, "repositoryId")) &&
    isSafeId(own(value, "candidateId")) &&
    isSafeId(own(value, "revision"))
  );
}

function freezeBinding(binding: M49CandidateBinding): M49CandidateBinding {
  return Object.freeze({
    repositoryId: binding.repositoryId,
    candidateId: binding.candidateId,
    revision: binding.revision,
  });
}

function bindingsEqual(
  left: M49CandidateBinding,
  right: M49CandidateBinding,
): boolean {
  return (
    left.repositoryId === right.repositoryId &&
    left.candidateId === right.candidateId &&
    left.revision === right.revision
  );
}

function digestCanonicalResult(value: M49CanonicalResultViewModel): string {
  const hash = createHash("sha256").update(JSON.stringify(value)).digest("hex");
  return `sha256:${hash}`;
}

function sectionStates(
  sections: readonly M49SectionView[],
): Readonly<Record<M49SectionId, M49SectionState>> {
  const states: Partial<Record<M49SectionId, M49SectionState>> = {};
  for (const section of sections) {
    states[section.id] = section.state;
  }
  return Object.freeze(states as Record<M49SectionId, M49SectionState>);
}

export function createM49CanonicalResultViewModel(
  input: M49CanonicalResultInput,
): M49CanonicalResultViewModel {
  if (!isRecord(input) || own(input, "schema") !== M49_EXPERIENCE_SCHEMA) {
    throw new TypeError("Invalid M49 canonical result schema");
  }
  if (
    !isSafeId(own(input, "resultId")) ||
    !isBinding(own(input, "binding")) ||
    !isTimestamp(own(input, "generatedAt")) ||
    !includes(M49_RESULT_VERDICTS, own(input, "verdict")) ||
    (own(input, "completeness") !== "COMPLETE" &&
      own(input, "completeness") !== "PARTIAL") ||
    !isSafeText(own(input, "headline")) ||
    !isSafeText(own(input, "summary")) ||
    !isSafeText(own(input, "primaryAction"))
  ) {
    throw new TypeError("Invalid M49 canonical result fields");
  }
  const completeness = own(input, "completeness") as M49ResultCompleteness;
  const verdict = own(input, "verdict") as M49ResultVerdict;
  if (
    (completeness === "PARTIAL" &&
      (verdict === "PASS" || verdict === "FINDINGS")) ||
    (completeness === "COMPLETE" &&
      (verdict === "PARTIAL" ||
        verdict === "INCONCLUSIVE" ||
        verdict === "UNKNOWN" ||
        verdict === "UNSUPPORTED" ||
        verdict === "ERROR"))
  ) {
    throw new TypeError("M49 completeness and verdict contradict each other");
  }
  const inputSections = own(input, "sections");
  if (
    !Array.isArray(inputSections) ||
    inputSections.length !== M49_SECTIONS.length
  ) {
    throw new TypeError("M49 canonical result must contain every section");
  }
  const byId = new Map<M49SectionId, M49SectionView>();
  for (const value of inputSections) {
    if (!isRecord(value) || !includes(M49_SECTIONS, own(value, "id"))) {
      throw new TypeError("Invalid M49 section identity");
    }
    const id = own(value, "id") as M49SectionId;
    const state = own(value, "state");
    if (
      byId.has(id) ||
      !includes(M49_SECTION_STATES, state) ||
      !isSafeText(own(value, "title")) ||
      !isSafeText(own(value, "summary"))
    ) {
      throw new TypeError("Invalid M49 section state");
    }
    byId.set(id, {
      id,
      state,
      title: own(value, "title") as string,
      summary: own(value, "summary") as string,
    });
  }
  if (M49_SECTIONS.some((id) => !byId.has(id))) {
    throw new TypeError("M49 canonical result is missing a required section");
  }
  const sections = M49_SECTIONS.map((id) => {
    const section = byId.get(id);
    if (section === undefined) {
      throw new TypeError("M49 canonical result is missing a required section");
    }
    return Object.freeze(section);
  });
  return Object.freeze({
    schema: M49_EXPERIENCE_SCHEMA,
    resultId: own(input, "resultId") as string,
    binding: freezeBinding(own(input, "binding") as M49CandidateBinding),
    generatedAt: own(input, "generatedAt") as string,
    verdict,
    completeness,
    headline: own(input, "headline") as string,
    summary: own(input, "summary") as string,
    primaryAction: own(input, "primaryAction") as string,
    sections: Object.freeze(sections),
  });
}

export function adaptM49ResultToSurface(
  input: M49CanonicalResultInput,
  surface: M49Surface,
): M49SurfaceAdapter {
  if (!includes(M49_SURFACES, surface)) {
    throw new TypeError("Unsupported M49 surface");
  }
  const canonical = createM49CanonicalResultViewModel(input);
  const definition = M49_SURFACE_ADAPTERS[surface];
  const projection = Object.freeze({
    verdict: canonical.verdict,
    completeness: canonical.completeness,
    sectionOrder: Object.freeze([...M49_SECTIONS]),
    sectionStates: sectionStates(canonical.sections),
    primaryAction: canonical.primaryAction,
  });
  return Object.freeze({
    schema: M49_SURFACE_ADAPTER_SCHEMA,
    surface,
    outputKind: definition.outputKind,
    mediaType: definition.mediaType,
    resultId: canonical.resultId,
    binding: freezeBinding(canonical.binding),
    canonicalDigest: digestCanonicalResult(canonical),
    projection,
  });
}

function surfaceResult(
  surface: M49Surface,
  verdict: M49SurfaceVerdict,
  reasons: readonly M49ParityReason[],
  experience: M49ExperienceEvidence | null = null,
): M49SurfaceParityResult {
  return Object.freeze({
    surface,
    verdict,
    reasons: Object.freeze([...reasons]),
    experience,
  });
}

function initialSurfaceResults(): M49SurfaceParityResult[] {
  return M49_SURFACES.map((surface) =>
    surfaceResult(surface, "INCOMPLETE", ["SURFACE_MISSING"]),
  );
}

function experienceFrom(
  value: Record<string, unknown>,
): M49ExperienceEvidence | null {
  const accessibility = own(value, "accessibility");
  const localization = own(value, "localization");
  const recovery = own(value, "recovery");
  if (
    !includes(M49_ACCESSIBILITY_STATES, accessibility) ||
    !includes(M49_LOCALIZATION_STATES, localization) ||
    !includes(M49_RECOVERY_STATES, recovery)
  ) {
    return null;
  }
  return Object.freeze({ accessibility, localization, recovery });
}

function adapterMatches(value: unknown, expected: M49SurfaceAdapter): boolean {
  if (!isRecord(value)) return false;
  const binding = own(value, "binding");
  if (
    own(value, "schema") !== M49_SURFACE_ADAPTER_SCHEMA ||
    own(value, "surface") !== expected.surface ||
    own(value, "outputKind") !== expected.outputKind ||
    own(value, "mediaType") !== expected.mediaType ||
    own(value, "resultId") !== expected.resultId ||
    own(value, "canonicalDigest") !== expected.canonicalDigest ||
    !isBinding(binding) ||
    !bindingsEqual(binding, expected.binding)
  ) {
    return false;
  }
  const projection = own(value, "projection");
  if (!isRecord(projection)) return false;
  const sectionOrder = own(projection, "sectionOrder");
  if (
    own(projection, "verdict") !== expected.projection.verdict ||
    own(projection, "completeness") !== expected.projection.completeness ||
    own(projection, "primaryAction") !== expected.projection.primaryAction ||
    !Array.isArray(sectionOrder) ||
    sectionOrder.length !== M49_SECTIONS.length ||
    sectionOrder.some((id, index) => id !== M49_SECTIONS[index])
  ) {
    return false;
  }
  const states = own(projection, "sectionStates");
  if (!isRecord(states)) return false;
  return M49_SECTIONS.every(
    (id) => own(states, id) === expected.projection.sectionStates[id],
  );
}

function evaluateObservation(
  value: unknown,
  canonical: M49CanonicalResultViewModel,
  evaluatedAtMs: number,
): M49SurfaceParityResult | null {
  if (!isRecord(value) || !includes(M49_SURFACES, own(value, "surface"))) {
    return null;
  }
  const surface = own(value, "surface") as M49Surface;
  const malformed = () =>
    surfaceResult(surface, "MALFORMED", ["OBSERVATION_MALFORMED"]);
  if (
    own(value, "schema") !== M49_SURFACE_OBSERVATION_SCHEMA ||
    (own(value, "support") !== "SUPPORTED" &&
      own(value, "support") !== "UNSUPPORTED") ||
    (own(value, "completeness") !== "COMPLETE" &&
      own(value, "completeness") !== "PARTIAL") ||
    !isTimestamp(own(value, "capturedAt")) ||
    !isBinding(own(value, "binding"))
  ) {
    return malformed();
  }
  const binding = own(value, "binding") as M49CandidateBinding;
  if (!bindingsEqual(binding, canonical.binding)) {
    return surfaceResult(surface, "FOREIGN", ["CANDIDATE_FOREIGN"]);
  }
  const capturedAt = own(value, "capturedAt") as string;
  const capturedAtMs = timestampMilliseconds(capturedAt);
  if (capturedAtMs > evaluatedAtMs) {
    return surfaceResult(surface, "MALFORMED", ["EVIDENCE_FUTURE"]);
  }
  if (evaluatedAtMs - capturedAtMs > M49_LIMITS.maxEvidenceAgeMs) {
    return surfaceResult(surface, "STALE", ["EVIDENCE_STALE"]);
  }
  const experienceValue = own(value, "experience");
  if (!isRecord(experienceValue)) return malformed();
  const experience = experienceFrom(experienceValue);
  if (experience === null) return malformed();
  const support = own(value, "support") as M49SurfaceSupport;
  if (support === "UNSUPPORTED") {
    if (!isSafeText(own(value, "unsupportedReason"))) return malformed();
    if (
      experience.accessibility !== "UNSUPPORTED" ||
      experience.localization !== "UNSUPPORTED" ||
      experience.recovery !== "UNSUPPORTED"
    ) {
      return surfaceResult(surface, "UNSUPPORTED", [
        "SURFACE_UNSUPPORTED",
        "EXPERIENCE_STATE_CONFLICT",
      ]);
    }
    return surfaceResult(
      surface,
      "UNSUPPORTED",
      ["SURFACE_UNSUPPORTED"],
      experience,
    );
  }
  if (
    own(value, "unsupportedReason") !== null ||
    own(value, "adapter") === null
  ) {
    return malformed();
  }
  if (own(value, "completeness") === "PARTIAL") {
    return surfaceResult(surface, "PARTIAL", ["SURFACE_PARTIAL"], experience);
  }
  const expected = adaptM49ResultToSurface(canonical, surface);
  if (!adapterMatches(own(value, "adapter"), expected)) {
    return surfaceResult(
      surface,
      "DIVERGENT",
      ["PROJECTION_DIVERGENT"],
      experience,
    );
  }
  const reasons: M49ParityReason[] = [];
  if (experience.accessibility !== "PASS") {
    reasons.push("ACCESSIBILITY_NOT_PASS");
  }
  if (experience.localization !== "CURRENT") {
    reasons.push("LOCALIZATION_NOT_CURRENT");
  }
  if (experience.recovery !== "AVAILABLE") {
    reasons.push("RECOVERY_NOT_AVAILABLE");
  }
  return reasons.length === 0
    ? surfaceResult(surface, "MATCH", [], experience)
    : surfaceResult(surface, "INCOMPLETE", reasons, experience);
}

function parityVerdict(
  inputState: M49ParityInputState,
  surfaces: readonly M49SurfaceParityResult[],
): M49ParityVerdict {
  if (
    inputState === "MALFORMED" ||
    surfaces.some((surface) =>
      ["STALE", "FOREIGN", "MALFORMED"].includes(surface.verdict),
    )
  ) {
    return "INCONCLUSIVE";
  }
  if (
    inputState === "PARTIAL" ||
    surfaces.some((surface) =>
      ["INCOMPLETE", "PARTIAL"].includes(surface.verdict),
    )
  ) {
    return "PARTIAL";
  }
  if (surfaces.some((surface) => surface.verdict === "UNSUPPORTED")) {
    return "UNSUPPORTED";
  }
  if (surfaces.some((surface) => surface.verdict === "DIVERGENT")) {
    return "FAIL";
  }
  return "PASS";
}

function freezeReport(
  evaluatedAt: string,
  verdict: M49ParityVerdict,
  candidate: M49CandidateBinding | null,
  resultId: string | null,
  canonicalDigest: string | null,
  canonicalCompleteness: M49ResultCompleteness | "UNKNOWN",
  inputState: M49ParityInputState,
  unprocessedCount: number,
  surfaces: readonly M49SurfaceParityResult[],
): M49ParityReport {
  return Object.freeze({
    schema: M49_PARITY_SCHEMA,
    inputState,
    evaluatedAt,
    candidate: candidate === null ? null : freezeBinding(candidate),
    resultId,
    canonicalDigest,
    canonicalCompleteness,
    verdict,
    unprocessedCount,
    surfaces: Object.freeze([...surfaces]),
  });
}

export function evaluateM49Parity(
  canonicalInput: unknown,
  observationsInput: unknown,
  options: M49ParityOptions,
): M49ParityReport {
  const evaluatedAt = options.evaluatedAt;
  if (!isTimestamp(evaluatedAt)) {
    throw new TypeError("Invalid M49 evaluation timestamp");
  }
  const evaluatedAtMs = timestampMilliseconds(evaluatedAt);
  let canonical: M49CanonicalResultViewModel;
  try {
    canonical = createM49CanonicalResultViewModel(
      canonicalInput as M49CanonicalResultInput,
    );
  } catch {
    return freezeReport(
      evaluatedAt,
      "INCONCLUSIVE",
      null,
      null,
      null,
      "UNKNOWN",
      "MALFORMED",
      0,
      initialSurfaceResults().map((surface) =>
        surfaceResult(surface.surface, "MALFORMED", ["OBSERVATION_MALFORMED"]),
      ),
    );
  }
  const results = initialSurfaceResults();
  if (!Array.isArray(observationsInput)) {
    return freezeReport(
      evaluatedAt,
      "INCONCLUSIVE",
      canonical.binding,
      canonical.resultId,
      digestCanonicalResult(canonical),
      canonical.completeness,
      "MALFORMED",
      0,
      results.map((surface) =>
        surfaceResult(surface.surface, "MALFORMED", ["OBSERVATION_MALFORMED"]),
      ),
    );
  }
  const seen = new Set<M49Surface>();
  let inputState: M49ParityInputState =
    observationsInput.length === M49_LIMITS.maxSurfaceObservations
      ? "COMPLETE"
      : "PARTIAL";
  const bounded = observationsInput.slice(0, M49_LIMITS.maxSurfaceObservations);
  for (const value of bounded) {
    const evaluated = evaluateObservation(value, canonical, evaluatedAtMs);
    if (evaluated === null) {
      inputState = "MALFORMED";
      continue;
    }
    if (seen.has(evaluated.surface)) {
      inputState = "MALFORMED";
      const index = M49_SURFACES.indexOf(evaluated.surface);
      results[index] = surfaceResult(evaluated.surface, "MALFORMED", [
        "DUPLICATE_SURFACE",
      ]);
      continue;
    }
    seen.add(evaluated.surface);
    results[M49_SURFACES.indexOf(evaluated.surface)] = evaluated;
  }
  if (seen.size !== M49_LIMITS.maxSurfaceObservations) {
    inputState = inputState === "MALFORMED" ? "MALFORMED" : "PARTIAL";
  }
  const unprocessedCount = Math.max(
    0,
    observationsInput.length - M49_LIMITS.maxSurfaceObservations,
  );
  return freezeReport(
    evaluatedAt,
    parityVerdict(inputState, results),
    canonical.binding,
    canonical.resultId,
    digestCanonicalResult(canonical),
    canonical.completeness,
    inputState,
    unprocessedCount,
    results,
  );
}

function validParitySurfaceSet(
  value: unknown,
): value is readonly M49SurfaceParityResult[] {
  if (!Array.isArray(value) || value.length !== M49_SURFACES.length) {
    return false;
  }
  for (const [index, result] of value.entries()) {
    if (!isRecord(result)) return false;
    const surface = own(result, "surface");
    const verdict = own(result, "verdict");
    const reasons = own(result, "reasons");
    if (
      surface !== M49_SURFACES[index] ||
      !includes(M49_SURFACE_VERDICTS, verdict) ||
      !Array.isArray(reasons) ||
      (verdict !== "MATCH" && reasons.length === 0)
    ) {
      return false;
    }
    if (verdict === "MATCH") {
      const experience = own(result, "experience");
      if (
        reasons.length !== 0 ||
        !isRecord(experience) ||
        own(experience, "accessibility") !== "PASS" ||
        own(experience, "localization") !== "CURRENT" ||
        own(experience, "recovery") !== "AVAILABLE"
      ) {
        return false;
      }
    }
  }
  return true;
}

function personaResults(
  completion: M49PersonaCompletion,
  reasons: readonly M49PersonaReason[],
  blockingSurfaces: readonly M49Surface[],
): readonly M49PersonaResult[] {
  return Object.freeze(
    M49_PERSONAS.map((persona) =>
      Object.freeze({
        persona,
        completion,
        reasons: Object.freeze([...reasons]),
        blockingSurfaces: Object.freeze([...blockingSurfaces]),
      }),
    ),
  );
}

export function evaluateM49PersonaCompletion(
  parityInput: unknown,
): readonly M49PersonaResult[] {
  try {
    if (
      !isRecord(parityInput) ||
      own(parityInput, "schema") !== M49_PARITY_SCHEMA ||
      !includes(M49_PARITY_VERDICTS, own(parityInput, "verdict")) ||
      !includes(PARITY_INPUT_STATES, own(parityInput, "inputState")) ||
      (own(parityInput, "canonicalCompleteness") !== "COMPLETE" &&
        own(parityInput, "canonicalCompleteness") !== "PARTIAL") ||
      !isSafeId(own(parityInput, "resultId")) ||
      !isBinding(own(parityInput, "candidate")) ||
      typeof own(parityInput, "canonicalDigest") !== "string" ||
      !DIGEST.test(own(parityInput, "canonicalDigest") as string) ||
      !isTimestamp(own(parityInput, "evaluatedAt")) ||
      !Number.isSafeInteger(own(parityInput, "unprocessedCount")) ||
      (own(parityInput, "unprocessedCount") as number) < 0 ||
      !validParitySurfaceSet(own(parityInput, "surfaces"))
    ) {
      return personaResults(
        "INCOMPLETE",
        ["PARITY_REPORT_INVALID"],
        M49_SURFACES,
      );
    }
    const surfaces = own(
      parityInput,
      "surfaces",
    ) as readonly M49SurfaceParityResult[];
    const blocking = surfaces
      .filter((surface) => surface.verdict !== "MATCH")
      .map((surface) => surface.surface)
      .sort(
        (left, right) =>
          M49_SURFACES.indexOf(left) - M49_SURFACES.indexOf(right),
      );
    const reasons: M49PersonaReason[] = [];
    if (
      own(parityInput, "inputState") !== "COMPLETE" ||
      own(parityInput, "unprocessedCount") !== 0
    ) {
      reasons.push("SURFACE_SET_INVALID");
    }
    if (own(parityInput, "verdict") !== "PASS") reasons.push("PARITY_NOT_PASS");
    if (own(parityInput, "canonicalCompleteness") === "PARTIAL") {
      reasons.push("CANONICAL_PARTIAL");
    }
    if (blocking.length > 0) reasons.push("SURFACE_NOT_MATCH");
    if (reasons.length === 0) return personaResults("COMPLETE", [], []);
    return personaResults("INCOMPLETE", reasons, blocking);
  } catch {
    return personaResults(
      "INCOMPLETE",
      ["PARITY_REPORT_INVALID"],
      M49_SURFACES,
    );
  }
}
