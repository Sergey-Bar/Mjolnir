type Roadmap = {
  [key: string]: unknown;
  schemaVersion?: unknown;
  program?: unknown;
  archive?: unknown;
  issueLedger?: unknown;
  gapLedger?: unknown;
  supportMatrix?: unknown;
  externalValidation?: unknown;
  trains?: unknown;
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

export function validateRoadmap(value: unknown): {
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
  for (const key of [
    "issueLedger",
    "gapLedger",
    "supportMatrix",
    "externalValidation",
  ]) {
    if (roadmap[key] === null || roadmap[key] === undefined) {
      blockers.push(`${key} is not reconciled`);
    }
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
