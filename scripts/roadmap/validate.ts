type Roadmap = {
  [key: string]: unknown;
  schemaVersion?: unknown;
  program?: unknown;
  status?: unknown;
  retiredProgram?: unknown;
  /** Further retirements, same shape. See the VERSIONS note. */
  retiredPrograms?: unknown;
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

/**
 * The live version ladder, as read from disk.
 *
 * Only the version actually in flight. 7.0 through 10.0 were listed with status
 * `deferred`, which reads as a schedule: four dated rows, each with a theme, a
 * promise and a kill criterion, and no owner and no date attached to any of them.
 * Nobody promised them. `schemaVersion: 2` listed all five because that was the
 * ladder when the rule was written; the ladder has since been cut back to what
 * is real.
 *
 * The ideas those rows carried are NOT lost. `retiredPrograms` records what each
 * one proposed and where its surviving parts now live as live work, following
 * the precedent the M26 retirement set: preserve the thinking, retire the
 * version.
 */
const VERSIONS = ["6.0"] as const;
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
  // Both pinned rather than derived, and deliberately so: a validator that reads
  // its expectations out of the file it is validating cannot fail. Bumping
  // SCHEMA_VERSION is the explicit act of saying the shape changed.
  const SCHEMA_VERSION = 3;
  const PROGRAM = "6.0";
  if (roadmap.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  }
  if (roadmap.program !== PROGRAM) {
    errors.push(`program must be ${PROGRAM}`);
  }
  if (!STATUSES.has(String(roadmap.status))) {
    errors.push("program has invalid status");
  }

  const retired = roadmap.retiredProgram;
  // Every retirement is validated identically. One rule, applied to each entry,
  // rather than a rule for the milestone program and a second, slightly
  // different rule for the version ladder — the divergence between those two
  // validators is exactly how the second one would end up checking less.
  const retirements: unknown[] = [];
  if (retired !== undefined) retirements.push(retired);
  if (Array.isArray(roadmap.retiredPrograms)) {
    // Narrowed to unknown[] rather than spreading the raw `any[]`: the entries
    // are re-validated below, and the point of collecting them is that nothing
    // here is trusted on its way in.
    const extra: unknown[] = roadmap.retiredPrograms;
    retirements.push(...extra);
  } else if (roadmap.retiredPrograms !== undefined) {
    errors.push("retiredPrograms must be an array");
  }

  for (const entry of retirements) {
    if (!isRecord(entry)) {
      errors.push("a retirement record must be an object");
      continue;
    }
    const label = isFilled(entry.id)
      ? entry.id
      : isFilled(entry.program)
        ? entry.program
        : "(unnamed)";
    if (entry.status !== "RETIRED") {
      errors.push(`retirement "${label}".status must be RETIRED`);
    }
    if (!isFilled(entry.archive)) {
      errors.push(
        `retirement "${label}".archive must name the archived program`,
      );
    } else if (facts.missingSources?.includes(entry.archive)) {
      // The archive is the record. If it is not in the tree, the retirement
      // has deleted the reasoning and kept only the assertion that there was
      // some — which is the exact shape of a tombstone with nothing in it.
      errors.push(
        `retirement "${label}".archive does not resolve: ${entry.archive} — a ` +
          "retirement with no archived text is a deletion, not a retirement",
      );
    }
    if (
      !Array.isArray(entry.deletedLedgers) ||
      entry.deletedLedgers.length === 0
    ) {
      errors.push(
        `retirement "${label}".deletedLedgers must list what the retirement removed`,
      );
    }
    // A retirement that discards the thinking is a deletion, so something must
    // record what survives. Two shapes are accepted because two records already
    // exist in the two shapes: the M26 retirement carries the surviving ideas in
    // a `why` paragraph, the version ladder carries them in a `survivingIdeas`
    // list. Requiring the list would mean rewriting a historical record to
    // satisfy a rule written after it — which is how archives stop being
    // trustworthy.
    const hasIdeas = Array.isArray(entry.survivingIdeas)
      ? entry.survivingIdeas.length > 0
      : false;
    const hasWhy = isFilled(entry.why) || isFilled(entry.reason);
    if (!hasIdeas && !hasWhy) {
      errors.push(
        `retirement "${label}" records neither survivingIdeas nor a reason — ` +
          "retiring a version is not the same as retiring what it was for",
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
