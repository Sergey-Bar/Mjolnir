import { readFileSync } from "node:fs";
import { join } from "node:path";

import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import {
  BLIND_EVIDENCE_RESOLVER,
  buildCensus,
} from "../../src/v6/ecosystem-census.js";
import { validateNextLevelGap } from "../../src/v6/maturity.js";

const ROOT = process.cwd();

function load(relative: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(
    readFileSync(join(ROOT, relative), "utf8"),
  );
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${relative} is not a JSON object`);
  }
  return parsed;
}

function validatorFor(relative: string): {
  validate: (data: unknown) => boolean;
  errors: string[];
} {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(load(relative));
  return {
    validate: (data: unknown) => validate(data) as boolean,
    errors: (validate.errors ?? []).map(
      (e) => `${e.instancePath || "/"} ${e.message}`,
    ),
  };
}

describe("schemas/v6 — the generated artifacts satisfy their own schema", () => {
  it("validates docs/ECOSYSTEM-CENSUS.json against the census schema", () => {
    const { validate, errors } = validatorFor(
      "schemas/v6/ecosystem-census.schema.json",
    );
    expect(validate(load("docs/ECOSYSTEM-CENSUS.json"))).toBe(true);
    expect(errors).toEqual([]);
  });

  it("validates docs/claim-budget.json against the budget schema", () => {
    const { validate, errors } = validatorFor(
      "schemas/v6/claim-budget.schema.json",
    );
    expect(validate(load("docs/claim-budget.json"))).toBe(true);
    expect(errors).toEqual([]);
  });

  it("rejects a census entry carrying a trust level as its maturity", () => {
    // The schema is the second line of defence for ADR 0001: even a
    // hand-edited artifact cannot smuggle `L4` into a maturity field.
    const { validate } = validatorFor(
      "schemas/v6/ecosystem-census.schema.json",
    );
    const census = load("docs/ECOSYSTEM-CENSUS.json") as {
      entries: Array<Record<string, unknown>>;
    };
    const tampered = JSON.parse(JSON.stringify(census)) as {
      entries: Array<Record<string, unknown>>;
    };
    const first = tampered.entries[0];
    if (first === undefined)
      throw new Error("no census entries to tamper with");
    first.maturity = "L4";
    expect(validate(tampered)).toBe(false);
  });

  it("rejects a SUPPORTED entry with no adapter", () => {
    const { validate } = validatorFor(
      "schemas/v6/ecosystem-census.schema.json",
    );
    const tampered = JSON.parse(
      readFileSync(join(ROOT, "docs", "ECOSYSTEM-CENSUS.json"), "utf8"),
    ) as {
      entries: Array<Record<string, unknown>>;
    };
    const index = tampered.entries.findIndex((e) => e.state === "SUPPORTED");
    if (index === -1) return; // nothing to tamper with on a blind resolver
    const target = tampered.entries[index];
    if (target === undefined) throw new Error("no entry to tamper with");
    target.adapter = null;
    expect(validate(tampered)).toBe(false);
  });

  it("rejects a DEPRECATED entry with no successor or removal date", () => {
    const { validate } = validatorFor(
      "schemas/v6/ecosystem-census.schema.json",
    );
    const tampered = JSON.parse(
      readFileSync(join(ROOT, "docs", "ECOSYSTEM-CENSUS.json"), "utf8"),
    ) as {
      entries: Array<Record<string, unknown>>;
    };
    const firstEntry = tampered.entries[0];
    if (firstEntry === undefined)
      throw new Error("no census entries to tamper with");
    firstEntry.state = "DEPRECATED";
    expect(validate({ ...tampered, entries: [firstEntry] })).toBe(false);
  });

  it("rejects a TARGET entry with no nextLevelGap", () => {
    const { validate } = validatorFor(
      "schemas/v6/ecosystem-census.schema.json",
    );
    const tampered = JSON.parse(
      readFileSync(join(ROOT, "docs", "ECOSYSTEM-CENSUS.json"), "utf8"),
    ) as {
      entries: Array<Record<string, unknown>>;
    };
    const firstEntry = tampered.entries[0];
    if (firstEntry === undefined)
      throw new Error("no census entries to tamper with");
    firstEntry.state = "TARGET";
    firstEntry.nextLevelGap = null;
    expect(validate({ ...tampered, entries: [firstEntry] })).toBe(false);
  });

  it("rejects a claim-budget exception with no expiry", () => {
    // The constitution has no permanent waiver path, so the schema has no
    // way to express one either.
    const { validate } = validatorFor("schemas/v6/claim-budget.schema.json");
    const budget = load("docs/claim-budget.json");
    expect(
      validate({
        ...budget,
        exceptions: [
          {
            reason: "a debt slice that is never revisited",
            owner: "team",
            permitsUpTo: 99,
          },
        ],
      }),
    ).toBe(false);
  });

  it("rejects a LOCAL_ONLY mode that claims hosted access", () => {
    const { validate } = validatorFor("schemas/v6/deployment-mode.schema.json");
    expect(
      validate({ schemaVersion: 1, mode: "LOCAL_ONLY", allowsHosted: true }),
    ).toBe(false);
    expect(
      validate({ schemaVersion: 1, mode: "LOCAL_ONLY", allowsHosted: false }),
    ).toBe(true);
  });

  it("rejects an unknown deployment mode rather than defaulting it", () => {
    const { validate } = validatorFor("schemas/v6/deployment-mode.schema.json");
    expect(validate({ schemaVersion: 1, mode: "PARTIAL" })).toBe(false);
    expect(
      validate({ schemaVersion: 1, mode: "CLOUD", allowsHosted: true }),
    ).toBe(true);
  });
});

describe("schemas/v6 — the schema and the module agree", () => {
  it("accepts a freshly built census", () => {
    const { validate, errors } = validatorFor(
      "schemas/v6/ecosystem-census.schema.json",
    );
    const census = buildCensus({
      resolver: BLIND_EVIDENCE_RESOLVER,
      observedAt: "2026-01-01",
    });
    const { entries, ...rest } = census;
    const document = {
      schemaVersion: 1,
      artifact: "ecosystem-census",
      generatedBy: "test",
      baseSha: "x",
      counts: {},
      stalenessDemotions: [],
      entries,
      effectiveEntries: entries,
      ...rest,
    };
    expect(validate(document)).toBe(true);
    expect(errors).toEqual([]);
  });

  it("agrees with the module on the nextLevelGap obligation", () => {
    // Two independent statements of the same rule: if they ever diverge,
    // one of them is lying about what the census guarantees.
    const census = buildCensus({
      resolver: BLIND_EVIDENCE_RESOLVER,
      observedAt: "2026-01-01",
    });
    for (const entry of census.entries) {
      if (entry.maturity === "M5_FIELD_PROVEN") {
        expect(entry.nextLevelGap).toBeNull();
      } else {
        expect(
          validateNextLevelGap(entry.maturity, entry.nextLevelGap),
        ).toEqual({
          ok: true,
        });
      }
    }
  });
});
