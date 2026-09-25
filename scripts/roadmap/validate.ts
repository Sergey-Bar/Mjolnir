type Roadmap = {
  [key: string]: unknown;
  schemaVersion?: unknown;
  program?: unknown;
  source?: unknown;
  archive?: unknown;
  issueLedger?: unknown;
  gapLedger?: unknown;
  supportMatrix?: unknown;
  externalValidation?: unknown;
  trains?: unknown;
};

/**
 * The live ledgers the roadmap claims to track, already read and summarised.
 * The validator never opens files itself — the caller supplies the summaries so
 * a pure structural check and a ledger-backed check are the same code path.
 */
export type RoadmapLedgerFacts = {
  /** Paths the roadmap references that do not resolve in this checkout. */
  missingSources?: string[];
  /**
   * Paths that resolve on the authoring machine but are not tracked by git.
   * A reference nobody else can resolve is not an authority.
   */
  untrackedSources?: string[];
  /**
   * Untracked paths recorded as the origin of a past decision. Reported, not
   * blocked: provenance of a decision is history, not authority.
   */
  untrackedProvenance?: string[];
  /** Open release-blocking gap ids. */
  openReleaseBlockers?: string[];
  /** Support-matrix cell ids explicitly BLOCKED. */
  blockedCells?: string[];
  /** Support-matrix cells whose `last_candidate` is null or absent. */
  unboundCells?: string[];
  externalValidationStatus?: string | undefined;
  githubSnapshotUnreconciled?: number;
};

const TRAIN_IDS = Array.from({ length: 25 }, (_, index) => `M${index + 26}`);
const LEGACY_IDS = new Set(["M12", "M19"]);
const STATUSES = new Set([
  "in-progress",
  "deferred",
  "blocked",
  "candidate",
  "proven",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateRoadmap(
  value: unknown,
  facts: RoadmapLedgerFacts = {},
): {
  errors: string[];
  blockers: string[];
} {
  const errors: string[] = [];
  const blockers: string[] = [];
  if (!isRecord(value)) return { errors: ["roadmap: not an object"], blockers };
  const roadmap = value as Roadmap;
  if (roadmap.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (roadmap.program !== "M26-M50") errors.push("program must be M26-M50");
  if (!isRecord(roadmap.archive)) {
    errors.push("archive must be an object");
  } else {
    const records = roadmap.archive.records;
    if (!Array.isArray(records)) {
      errors.push("archive.records must be an array");
    } else {
      let total = 0;
      for (const record of records) {
        if (!isRecord(record)) {
          errors.push("archive record must be an object");
          continue;
        }
        const range = record.githubRange;
        if (
          !Array.isArray(range) ||
          range.length !== 2 ||
          !Number.isInteger(range[0]) ||
          !Number.isInteger(range[1]) ||
          Number(range[0]) > Number(range[1])
        ) {
          errors.push("archive githubRange must be an ordered pair");
          continue;
        }
        const count = Number(record.designRecords);
        if (count !== Number(range[1]) - Number(range[0]) + 1) {
          errors.push(
            `archive ${String(record.logicalMilestone)} count does not match range`,
          );
        }
        total += count;
      }
      if (total !== 108) {
        errors.push(`archive must contain 108 design records; found ${total}`);
      }
    }
  }
  // A referenced ledger that is merely NAMED is not a reconciled ledger. The
  // previous version of this check tested only for a non-null value, so a
  // roadmap pointing at a blocked matrix reported zero blockers — a rubber
  // stamp. Reconciliation is now computed from the ledger contents.
  for (const key of [
    "issueLedger",
    "gapLedger",
    "supportMatrix",
    "externalValidation",
  ]) {
    const reference = roadmap[key];
    if (reference === null || reference === undefined) {
      blockers.push(`${key} is not reconciled: not referenced`);
      continue;
    }
    if (typeof reference !== "string" || reference.length === 0) {
      errors.push(`${key} must be a repository-relative path`);
      continue;
    }
    if (facts.missingSources?.includes(reference)) {
      blockers.push(`${key} reference does not resolve: ${reference}`);
    }
  }
  for (const source of facts.missingSources ?? []) {
    const role =
      typeof roadmap.source === "string" && source === roadmap.source
        ? "source authority"
        : "referenced source";
    blockers.push(`${role} does not resolve: ${source}`);
  }
  for (const source of facts.untrackedSources ?? []) {
    const role =
      typeof roadmap.source === "string" && source === roadmap.source
        ? "source authority"
        : "referenced source";
    blockers.push(
      `${role} is not tracked by git: ${source}. A document only the authoring machine can read cannot be the source of truth.`,
    );
  }
  const openGaps = facts.openReleaseBlockers ?? [];
  if (openGaps.length > 0) {
    blockers.push(
      `${openGaps.length} open release-blocking gap(s) in the tracked ledger: ${openGaps.join(", ")}`,
    );
  }
  const blocked = facts.blockedCells ?? [];
  if (blocked.length > 0) {
    blockers.push(
      `${blocked.length} explicitly BLOCKED support-matrix cell(s): ${blocked.join(", ")}`,
    );
  }
  const unbound = facts.unboundCells ?? [];
  if (unbound.length > 0) {
    blockers.push(
      `${unbound.length} support-matrix cell(s) are not bound to a candidate: ${unbound.slice(0, 5).join(", ")}${unbound.length > 5 ? ", …" : ""}`,
    );
  }
  if (
    facts.externalValidationStatus !== undefined &&
    facts.externalValidationStatus !== "COMPLETE"
  ) {
    blockers.push(
      `external validation is ${facts.externalValidationStatus}, not COMPLETE`,
    );
  }
  const unreconciled = facts.githubSnapshotUnreconciled ?? 0;
  if (unreconciled > 0) {
    blockers.push(`${unreconciled} GitHub snapshot item(s) are not reconciled`);
  }
  if (!Array.isArray(roadmap.trains)) {
    errors.push("trains must be an array");
    return { errors, blockers };
  }
  const ids = new Set<string>();
  for (const train of roadmap.trains) {
    if (!isRecord(train)) {
      errors.push("train must be an object");
      continue;
    }
    const id = typeof train.id === "string" ? train.id : "";
    if (TRAIN_IDS.includes(id) === false) errors.push(`unexpected train ${id}`);
    if (ids.has(id)) errors.push(`duplicate train ${id}`);
    ids.add(id);
    if (!STATUSES.has(String(train.status))) {
      errors.push(`${id} has invalid status`);
    }
    if (!Array.isArray(train.workstreams) || train.workstreams.length === 0) {
      errors.push(`${id} must declare workstreams`);
    }
    if (
      !Array.isArray(train.dependsOn) ||
      train.dependsOn.some(
        (dep) =>
          !TRAIN_IDS.includes(String(dep)) && !LEGACY_IDS.has(String(dep)),
      )
    ) {
      errors.push(`${id} has invalid dependencies`);
    }
    if (
      train.status === "proven" &&
      (!Array.isArray(train.evidence) || train.evidence.length === 0)
    ) {
      errors.push(`${id} cannot be proven without evidence`);
    }
  }
  for (const id of TRAIN_IDS)
    if (!ids.has(id)) errors.push(`missing train ${id}`);
  return { errors, blockers };
}
