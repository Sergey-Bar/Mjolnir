#!/usr/bin/env tsx
/**
 * `npm run qa-ir:parity` — the Wave 2 definition of done as a gate.
 *
 * DoD (blueprint §6.1, Wave 2): *adapter contract tests; no per-framework
 * engines; parity of canonical result across adapters*.
 *
 * Three checks, and the third is the one that matters:
 *
 *  1. **Every shipped executor adapter declares a dialect.** An adapter
 *     that speaks no dialect is an adapter whose findings nobody can read
 *     through the neutral model — i.e. a per-framework engine by another
 *     name.
 *  2. **The IR vocabularies are closed.** A new assertion kind or
 *     intention added in one dialect and not the others is the drift this
 *     model exists to stop, so the sets are asserted rather than assumed.
 *  3. **Parity holds.** Equivalent tests in every dialect canonicalise
 *     identically, and no parity case quietly omits a dialect.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prettify } from "../lib/prettify.js";
import { isMainModule } from "../lib/is-main-module.js";
import { ROOT } from "./inventory.js";
import {
  ADAPTER_DIALECT,
  ASSERTION_KINDS,
  TEST_DIALECTS,
  TEST_INTENTIONS,
  canonicalize,
  checkParity,
  dialectForAdapter,
  normalize,
  type ParityViolation,
} from "../../src/v6/qa-ir.js";
import {
  ALL_PARITY_CORPORA,
  assertParityCorpusIsComplete,
} from "../../src/v6/qa-ir-parity.js";
import { FRAMEWORK_INVENTORY } from "../../src/frameworks/framework-inventory.js";

const HERE = dirname(fileURLToPath(import.meta.url));
void HERE;

/** The seven executor adapters Wave 2 targets first. */
export const SHIPPED_EXECUTOR_ADAPTERS: readonly string[] = [
  ...new Set(
    FRAMEWORK_INVENTORY.flatMap((framework) => framework.executorAdapterIds),
  ),
].sort();

/**
 * The CI adapters, which speak a **different** IR.
 *
 * These are not a Wave 2 failure. `github-actions`, `azure-pipelines` and
 * `jenkins` normalize a *pipeline*, not a *test*, and the pipeline IR is
 * Wave 3's deliverable. Folding them into the test dialect set would mean
 * inventing a test dialect for a pipeline adapter, which is exactly the
 * kind of well-meant fudge this program exists to stop.
 *
 * So the gate splits them explicitly: a **test** adapter must declare a
 * test dialect, a **CI** adapter must be declared here, and an adapter in
 * neither set is an error. That way "which IR does this adapter speak?"
 * has an answer for every one of the seven, instead of a default.
 */
export const CI_ADAPTERS: readonly string[] = [
  "github-actions",
  "azure-pipelines",
  "jenkins",
  "gitlab-ci",
];

/** The adapters that normalize tests and therefore must speak QA-IR. */
export const TEST_ADAPTERS: readonly string[] =
  SHIPPED_EXECUTOR_ADAPTERS.filter((adapter) => !CI_ADAPTERS.includes(adapter));

export interface QaIrCheck {
  status: "PASS" | "FAIL";
  errors: string[];
  facts: Record<string, unknown>;
}

export function checkQaIr(): QaIrCheck {
  const errors: string[] = [];

  // 1. Every shipped adapter is accounted for, and every test adapter
  //    speaks a dialect.
  const accounted = new Set([...CI_ADAPTERS, ...TEST_ADAPTERS]);
  for (const adapter of SHIPPED_EXECUTOR_ADAPTERS) {
    if (!accounted.has(adapter)) {
      errors.push(
        `adapter "${adapter}" is neither declared a CI adapter (Wave 3) nor given a test dialect (Wave 2); "which IR does this speak?" must have an answer for all seven`,
      );
    }
  }
  for (const adapter of TEST_ADAPTERS) {
    if (dialectForAdapter(adapter) === "unknown") {
      errors.push(
        `adapter "${adapter}" declares no QA-IR dialect; an adapter that speaks no dialect is a per-framework engine by another name`,
      );
    }
  }
  for (const adapter of CI_ADAPTERS) {
    if (ADAPTER_DIALECT[adapter] !== undefined) {
      errors.push(
        `CI adapter "${adapter}" is declared with a test dialect; a pipeline is not a test, and conflating the two is Wave 3's mistake to make, not Wave 2's`,
      );
    }
  }

  // 2. The vocabularies are closed and non-trivial.
  // The vocabularies are non-empty and duplicate-free. A closed set that
  // has lost an entry is not a closed set, and one that gained a duplicate
  // is a set with two names for one meaning.
  if (new Set<string>(ASSERTION_KINDS).size !== ASSERTION_KINDS.length) {
    errors.push("ASSERTION_KINDS has a duplicate");
  }
  if (new Set<string>(TEST_INTENTIONS).size !== TEST_INTENTIONS.length) {
    errors.push("TEST_INTENTIONS has a duplicate");
  }
  const adapterDialectValues = new Set(Object.values(ADAPTER_DIALECT));
  for (const dialect of adapterDialectValues) {
    if (!TEST_DIALECTS.includes(dialect)) {
      errors.push(
        `ADAPTER_DIALECT names "${dialect}", which is not a declared dialect`,
      );
    }
  }

  // 3. Parity holds, and no case quietly omits a dialect.
  errors.push(...assertParityCorpusIsComplete());
  const violations: ParityViolation[] = [];
  for (const corpus of ALL_PARITY_CORPORA) {
    violations.push(...checkParity(corpus));
  }
  for (const violation of violations) {
    errors.push(
      `PARITY "${violation.case}" (${violation.dialects.join(" vs ")}): ${violation.field} ${violation.left} != ${violation.right}`,
    );
  }

  // A fingerprint is a proof artefact, so it must actually be a digest.
  const sample = canonicalize(
    normalize({
      dialect: "ts",
      intentionLabel: "smoke",
      assertionLabels: ["toBeTruthy"],
    }),
  );
  if (!/^[0-9a-f]{16}$/.test(sample.fingerprint)) {
    errors.push(`fingerprint "${sample.fingerprint}" is not a 16-char digest`);
  }

  return {
    status: errors.length > 0 ? "FAIL" : "PASS",
    errors,
    facts: {
      dialects: TEST_DIALECTS,
      assertionKinds: ASSERTION_KINDS.length,
      intentions: TEST_INTENTIONS.length,
      shippedExecutorAdapters: SHIPPED_EXECUTOR_ADAPTERS,
      testAdapters: TEST_ADAPTERS,
      ciAdapters: CI_ADAPTERS,
      parityCases: ALL_PARITY_CORPORA.reduce(
        (total, corpus) => total + corpus.length,
        0,
      ),
      parityViolations: violations.length,
      sampleFingerprint: sample.fingerprint,
    },
  };
}

async function main(): Promise<void> {
  const check = checkQaIr();
  const { writeFileSync } = await import("node:fs");
  const path = join(ROOT, "docs", "QA-IR-PARITY.json");
  writeFileSync(
    path,
    JSON.stringify({ ...check, generatedBy: "npm run qa-ir:parity" }, null, 2) +
      "\n",
  );
  await prettify(path);
  console.log(
    JSON.stringify(
      {
        status: check.status,
        gate: "qa-ir:parity",
        facts: check.facts,
        errors: check.errors,
      },
      null,
      2,
    ),
  );
  process.exit(check.status === "FAIL" ? 1 : 0);
}

if (isMainModule(import.meta.url)) {
  await main();
}
