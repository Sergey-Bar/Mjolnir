/**
 * `CELL_RECORD_SCHEMA` — the §6 record, as a schema and as a validator.
 *
 * ## One record per `concept × language × framework`
 *
 * Extends the existing `CertificationEvidence`; there is no parallel engine.
 * What is NEW here is the `standard` discipline from §5.2, and it is the whole
 * reason this file exists:
 *
 * | Field                      | Claim                                           | Standard       |
 * | -------------------------- | ----------------------------------------------- | -------------- |
 * | `LanguageCapability.state` | the engine can ANALYSE this ecosystem          | `manifest-v5`  |
 * | `CellRecord.state`         | the §6 contract PASSED for this cell           | `v6-abcdef`    |
 *
 * Two adjacent columns, two names, no contradiction, and no over-reading of a
 * word. TypeScript reads `CERTIFIED (manifest-v5, n=240)` and
 * `0/9 cells (v6-abcdef, PENDING)` — which is the plan's own worked example,
 * and the reason a cell state is spelled `v6-PENDING` rather than `PENDING`.
 * A bare `PENDING` next to a `CERTIFIED` in the same row is a sentence two
 * readers will contradict each other about.
 *
 * ## Counts are stored. Intervals are NOT, and the schema says so
 *
 * `additionalProperties: false` plus an explicit `not` on every computed
 * field means a record carrying `fpWilsonUpper` is a SCHEMA violation, not a
 * lint. That is the difference between a rule and a convention.
 *
 * The reason is the plan's own example: `{fp: 5, n: 250, fpWilsonUpper: 0.02}`
 * reads as valid to anything that does not recompute it, and the number it
 * asserts is one the counts do not support. A stored bound can disagree with
 * the counts beside it and nothing would notice.
 *
 * ## `legacyVerdicts` — §6.4 re-attachment
 *
 * A verdict produced against a retired rule re-attaches through
 * `(oldRuleId, legacyArm)`. NOT through the rule ID alone: multi-arm rules are
 * real here (`TQUAL-001` carries a no-assertion arm and a mock-only arm;
 * `PW-124` carries a project-split arm and a config-gap arm), so keying on the
 * ID alone would attach half a rule's verdicts to the wrong arm. `arm` is
 * therefore REQUIRED whenever an `oldRuleId` names a rule that had more than
 * one arm, and the plan's rule — *re-attachment cannot launder a rate* — is
 * enforced by `reAttachedVerdicts` refusing to change a verdict's polarity.
 */

import { isRecord } from "../lib/safe-json.js";
import { CERTIFICATION_STATES } from "./state-machine.js";

/** §5.2 — the ladder states a CELL may hold, each with its standard. */
export const CELL_STATES = [
  "v6-PENDING",
  "v6-PARSEABLE",
  "v6-MEASURED",
  "v6-CANDIDATE",
  "v6-CERTIFIED",
  "v6-TRUST-COMPLETE",
  "v6-UNSUPPORTED",
  "v6-BLOCKED",
] as const;

export type CellState = (typeof CELL_STATES)[number];

/**
 * The JSON Schema.
 *
 * Deliberately draft-07 and dependency-free: the repository already validates
 * `mjolnir.config.json` this way (`src/config/config-schema.ts`), and adding a
 * schema library for one file would be a dependency bought for a shape this
 * module can check in forty lines.
 */
export const CELL_RECORD_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/certification/cell-record.schema.json",
  title: "Mjölnir §6 certification cell record",
  description:
    "One record per concept × language × framework. Counts are stored; every " +
    "Wilson bound is computed by the validator and is absent here by schema.",
  type: "object" as const,
  required: [
    "concept",
    "language",
    "framework",
    "detectorHash",
    "state",
    "standard",
    "precision",
    "sensitivity",
  ],
  properties: {
    concept: { type: "string" as const, minLength: 1 },
    language: { type: "string" as const, minLength: 1 },
    framework: { type: "string" as const, minLength: 1 },

    /**
     * Bumped when the detector's SOURCE IDENTITY changes. A cell whose hash no
     * longer matches its rule's current identity is not certified — the
     * evidence described a detector that no longer exists, and the plan's
     * §6.4 divergence rule depends on being able to tell the two apart.
     */
    detectorHash: { type: "string" as const, pattern: "^sha256:[0-9a-f]{64}$" },

    state: { enum: [...CELL_STATES] },
    /**
     * §5.2. A cell record's standard is ALWAYS `v6-abcdef`; the manifest's is
     * `manifest-v5`. The field exists so a reader can tell which ladder a row
     * is on without knowing which file it came from.
     */
    standard: { const: "v6-abcdef" as const },

    /** Precision evidence comes from REAL repositories. */
    precision: {
      type: "object" as const,
      required: ["tp", "fp", "n"],
      properties: {
        tp: { type: "integer" as const, minimum: 0 },
        fp: { type: "integer" as const, minimum: 0 },
        n: { type: "integer" as const, minimum: 0 },
      },
      additionalProperties: false,
    },

    /** Sensitivity positives are CONSTRUCTED, so their `n` is `tp + fn`. */
    sensitivity: {
      type: "object" as const,
      required: ["tp", "fn", "n"],
      properties: {
        tp: { type: "integer" as const, minimum: 0 },
        fn: { type: "integer" as const, minimum: 0 },
        n: { type: "integer" as const, minimum: 0 },
      },
      additionalProperties: false,
    },

    /** §6.C — every historical defect that caused a fix is now a fixture. */
    regressionFixtures: { type: "integer" as const, minimum: 0 },

    /** §6.F — precision cells only. */
    corpusDiversity: {
      type: "object" as const,
      required: ["uniqueRepos", "maxSingleRepoShare"],
      properties: {
        uniqueRepos: { type: "integer" as const, minimum: 0 },
        maxSingleRepoShare: { type: "number" as const, minimum: 0, maximum: 1 },
      },
      additionalProperties: false,
    },

    /** §5.5c — construction variety, the SENSITIVITY analogue of F. */
    distinctShapes: { type: "integer" as const, minimum: 0 },

    /** §6.4 — verdicts re-attached from a retired rule's arms. */
    legacyVerdicts: {
      type: "array" as const,
      items: {
        type: "object" as const,
        required: ["oldRuleId", "verdict"],
        properties: {
          oldRuleId: { type: "string" as const, minLength: 1 },
          /**
           * REQUIRED for a multi-arm rule. `TQUAL-001` carries a
           * no-assertion arm and a mock-only arm; keying on the ID alone
           * would attach half a rule's verdicts to the wrong arm.
           */
          arm: { type: "string" as const, minLength: 1 },
          /** The verdict as recorded, so a re-attachment is visible. */
          verdict: { enum: ["TP", "FP", "FN"] as const },
          /** Where the verdict came from — a repo fixture, a sample set. */
          source: { type: "string" as const, minLength: 1 },
        },
        additionalProperties: false,
      },
    },

    /** Who maintains this cell's evidence, and when it was last touched. */
    owner: { type: "string" as const, minLength: 1 },
    observedAt: {
      type: "string" as const,
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
    },
  },

  /**
   * The rule the plan states, as a schema keyword: nothing computed may be
   * stored. `additionalProperties: false` already rejects an unknown key; these
   * make the REJECTION explain itself, and they survive a future relaxation of
   * the top level (which a legitimate new field would force).
   */
  not: {
    anyOf: [
      { required: ["fpWilsonUpper"] },
      { required: ["recallWilsonLower"] },
      { required: ["fpRate"] },
      { required: ["fnRate"] },
      { required: ["precisionWilsonUpper"] },
      { required: ["sensitivityWilsonLower"] },
      { properties: { precision: { required: ["fpRate"] } } },
      { properties: { precision: { required: ["fpWilsonUpper"] } } },
      { properties: { sensitivity: { required: ["recallWilsonLower"] } } },
    ],
  },

  additionalProperties: false,
} as const;

export interface RecordValidation {
  readonly valid: boolean;
  readonly problems: readonly string[];
}

const COMPUTED_FIELDS = [
  "fpWilsonUpper",
  "recallWilsonLower",
  "fpRate",
  "fnRate",
] as const;

function isNonNegativeInt(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

/**
 * Validate a record.
 *
 * Type-aware and recursive, like `validateConfigSchema`, because a validator
 * that only checks property names will happily accept `{precision: "40"}`.
 *
 * The checks a JSON Schema cannot express well live here: `n` must equal the
 * counts it summarises (`precision.n === tp + fp`, `sensitivity.n === tp + fn`),
 * because an `n` that disagrees with its own parts is the arithmetic version of
 * a stored Wilson bound — a number asserting something the evidence beside it
 * does not support.
 */
export function validateCellRecord(record: unknown): RecordValidation {
  const problems: string[] = [];

  if (!isRecord(record)) {
    return { valid: false, problems: ["record is not an object"] };
  }

  for (const field of COMPUTED_FIELDS) {
    if (field in record) {
      problems.push(
        `${field} is present. Counts are stored; Wilson bounds are computed ` +
          "by validateCell() and are outputs, not inputs. A record carrying " +
          "one looks valid to anything that does not recompute it.",
      );
    }
  }

  for (const key of ["concept", "language", "framework"] as const) {
    if (typeof record[key] !== "string" || record[key] === "") {
      problems.push(`${key} is required and must be a non-empty string`);
    }
  }

  if (typeof record["detectorHash"] !== "string") {
    problems.push("detectorHash is required");
  } else if (!/^sha256:[0-9a-f]{64}$/u.test(record["detectorHash"])) {
    problems.push(
      `detectorHash ${record["detectorHash"]} is not a sha256 digest. A bare ` +
        "hash cannot be compared against a rule's current identity, which is " +
        "what makes §6.4's divergence rule possible.",
    );
  }

  if (record["standard"] !== "v6-abcdef") {
    problems.push(
      `standard must be "v6-abcdef"; got ${JSON.stringify(record["standard"])}. ` +
        'A cell record is on the §6 ladder. The manifest\'s "manifest-v5" is a ' +
        "different claim about a different thing.",
    );
  }

  const state = record["state"];
  if (
    typeof state !== "string" ||
    !(CELL_STATES as readonly string[]).includes(state)
  ) {
    problems.push(
      `state ${JSON.stringify(state)} is not a cell state. A cell uses the ` +
        `v6- prefixed ladder: ${CELL_STATES.join(", ")}.`,
    );
  }

  // ── counts, and the arithmetic they must agree with ─────────────────────
  const counts = (field: "precision" | "sensitivity"): void => {
    const value = record[field];
    if (!isRecord(value)) {
      problems.push(`${field} is required and must be an object`);
      return;
    }
    for (const key of Object.keys(value)) {
      if (!["tp", "fp", "fn", "n"].includes(key)) {
        problems.push(
          `${field}.${key} is not a count. ${field} carries tp${
            field === "precision" ? "/fp" : "/fn"
          }/n and nothing derived.`,
        );
      }
    }
    for (const key of ["tp", "fp", "fn", "n"]) {
      if (key in value && !isNonNegativeInt(value[key])) {
        problems.push(
          `${field}.${key} must be a non-negative integer; got ` +
            `${JSON.stringify(value[key])}`,
        );
      }
    }
    const tp = value["tp"];
    const other = value[field === "precision" ? "fp" : "fn"];
    const n = value["n"];
    if (
      isNonNegativeInt(tp) &&
      isNonNegativeInt(other) &&
      isNonNegativeInt(n)
    ) {
      // Narrowed by the guards; TypeScript cannot see that through the
      // predicate, so the arithmetic reads locals it believes are numbers.
      const t = tp as number;
      const o = other as number;
      const count = n as number;
      const sum = t + o;
      if (sum !== count) {
        problems.push(
          `${field}.n is ${count} but tp+${field === "precision" ? "fp" : "fn"} is ` +
            `${sum}. An n that disagrees with its own parts asserts something ` +
            "the evidence beside it does not support — which is the same defect " +
            "as a stored Wilson bound, in arithmetic.",
        );
      }
    }
  };
  counts("precision");
  counts("sensitivity");

  for (const key of ["regressionFixtures", "distinctShapes"] as const) {
    if (key in record && !isNonNegativeInt(record[key])) {
      problems.push(`${key} must be a non-negative integer`);
    }
  }

  const diversity = record["corpusDiversity"];
  if (diversity !== undefined) {
    if (!isRecord(diversity)) {
      problems.push("corpusDiversity must be an object when present");
    } else {
      if (!isNonNegativeInt(diversity["uniqueRepos"])) {
        problems.push(
          "corpusDiversity.uniqueRepos must be a non-negative integer",
        );
      }
      const share = diversity["maxSingleRepoShare"];
      if (typeof share !== "number" || share < 0 || share > 1) {
        problems.push(
          "corpusDiversity.maxSingleRepoShare must be between 0 and 1; got " +
            `${JSON.stringify(share)}`,
        );
      }
    }
  }

  // ── §6.4 legacy verdicts ────────────────────────────────────────────────
  const legacy = record["legacyVerdicts"];
  if (legacy !== undefined) {
    if (!Array.isArray(legacy)) {
      problems.push("legacyVerdicts must be an array when present");
    } else {
      for (const [i, entry] of legacy.entries()) {
        if (!isRecord(entry)) {
          problems.push(`legacyVerdicts[${i}] must be an object`);
          continue;
        }
        if (
          typeof entry["oldRuleId"] !== "string" ||
          entry["oldRuleId"] === ""
        ) {
          problems.push(`legacyVerdicts[${i}].oldRuleId is required`);
        }
        if (!["TP", "FP", "FN"].includes(String(entry["verdict"]))) {
          problems.push(
            `legacyVerdicts[${i}].verdict must be TP, FP or FN; got ` +
              `${JSON.stringify(entry["verdict"])}`,
          );
        }
      }
    }
  }

  // ── every declared property, and nothing else ───────────────────────────
  for (const key of Object.keys(record)) {
    if (
      !Object.prototype.hasOwnProperty.call(CELL_RECORD_SCHEMA.properties, key)
    ) {
      problems.push(
        `${key} is not a property of the cell record. Additional properties ` +
          "are refused so that a computed value cannot be added by accident.",
      );
    }
  }

  for (const key of CELL_RECORD_SCHEMA.required) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      problems.push(`${key} is required`);
    }
  }

  return { valid: problems.length === 0, problems };
}

export { CERTIFICATION_STATES };
