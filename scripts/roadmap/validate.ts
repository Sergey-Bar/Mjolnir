type Roadmap = {
  [key: string]: unknown;
  schemaVersion?: unknown;
  program?: unknown;
  status?: unknown;
  retiredProgram?: unknown;
  versions?: unknown;
};

/**
 * The live version ladder, as read from disk.
 *
 * The caller supplies the resolved paths, so a pure structural check and a
 * filesystem-backed check are the same code path — the same arrangement the
 * M26–M50 validator used, minus the four ledgers it read.
 */
export type RoadmapFacts = {
  /** Paths the roadmap references that do not resolve in this checkout. */
  missingSources?: string[];
  /**
   * Paths that resolve on the authoring machine but are not tracked by git. A
   * reference nobody else can resolve is not an authority.
   */
  untrackedSources?: string[];
};

const VERSIONS = ["6.0", "7.0", "8.0", "9.0", "10.0"] as const;
const STATUSES = new Set(["shipped", "in-progress", "deferred", "blocked"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A non-empty string, which is what every free-text field here has to be. */
function isFilled(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * What this file asserts about the ladder, and why each rule exists.
 *
 * The M26 program validated a 25-train registry with ~160 workstream ids, four
 * ledgers and an archive table of 108 design records. Every one of those rules
 * existed because a reader had been misled by something in that file. The
 * rules that survive are the ones that can still mislead:
 *
 *  - one promise per row, in one sentence. Two promises is two versions, and
 *    a version nobody can state cannot be abandoned at its kill criterion.
 *  - a kill criterion on every row. A promise with no way to stop is a
 *    commitment, and this project has a single maintainer.
 *  - exactly one row in progress. Two rows in progress is a plan with no
 *    next step, which is what the retired program was.
 */
export function validateRoadmap(
  value: unknown,
  facts: RoadmapFacts = {},
): {
  errors: string[];
  blockers: string[];
} {
  const errors: string[] = [];
  const blockers: string[] = [];
  if (!isRecord(value)) return { errors: ["roadmap: not an object"], blockers };
  const roadmap = value as Roadmap;
  if (roadmap.schemaVersion !== 2) errors.push("schemaVersion must be 2");
  if (roadmap.program !== "6.0-10.0") errors.push("program must be 6.0-10.0");
  if (!STATUSES.has(String(roadmap.status))) {
    errors.push("program has invalid status");
  }

  const retired = roadmap.retiredProgram;
  if (!isRecord(retired)) {
    errors.push("retiredProgram must be an object");
  } else {
    if (retired.status !== "RETIRED") {
      errors.push("retiredProgram.status must be RETIRED");
    }
    if (!isFilled(retired.archive)) {
      errors.push("retiredProgram.archive must name the archived program");
    } else if (facts.missingSources?.includes(retired.archive)) {
      // The archive is the record. If it is not in the tree, the retirement
      // has deleted the reasoning and kept only the assertion that there was
      // some — which is the exact shape of a tombstone with nothing in it.
      errors.push(
        `retiredProgram.archive does not resolve: ${retired.archive} — a ` +
          "retirement with no archived text is a deletion, not a retirement",
      );
    }
    if (
      !Array.isArray(retired.deletedLedgers) ||
      retired.deletedLedgers.length === 0
    ) {
      errors.push(
        "retiredProgram.deletedLedgers must list what the retirement removed",
      );
    }
  }

  for (const source of facts.missingSources ?? []) {
    if (
      retired !== undefined &&
      isRecord(retired) &&
      retired.archive === source
    )
      continue; // already reported above, with the reason it matters
    blockers.push(`referenced source does not resolve: ${source}`);
  }
  for (const source of facts.untrackedSources ?? []) {
    blockers.push(
      `referenced source is not tracked by git: ${source}. A document only ` +
        "the authoring machine can read cannot be the source of truth.",
    );
  }

  if (!Array.isArray(roadmap.versions)) {
    errors.push("versions must be an array");
    return { errors, blockers };
  }
  const seen = new Set<string>();
  let inProgress = 0;
  for (const row of roadmap.versions) {
    if (!isRecord(row)) {
      errors.push("version row must be an object");
      continue;
    }
    const version = isFilled(row.version) ? row.version : "";
    if (!(VERSIONS as readonly string[]).includes(version)) {
      errors.push(`unexpected version ${version}`);
    }
    if (seen.has(version)) errors.push(`duplicate version ${version}`);
    seen.add(version);
    if (!STATUSES.has(String(row.status))) {
      errors.push(`${version} has invalid status`);
    }
    if (row.status === "in-progress") inProgress++;
    for (const field of [
      "theme",
      "promise",
      "moves",
      "killCriterion",
    ] as const) {
      if (!isFilled(row[field])) {
        errors.push(
          `${version} has no ${field} — a version with no kill criterion is a ` +
            "commitment, and a version with no promise is a guess",
        );
      }
    }
  }
  for (const version of VERSIONS)
    if (!seen.has(version)) errors.push(`missing version ${version}`);
  if (inProgress > 1) {
    errors.push(
      `${inProgress} versions are in progress — the ladder is ordered, and two ` +
        "rows in progress is a plan with no next step",
    );
  }
  return { errors, blockers };
}
