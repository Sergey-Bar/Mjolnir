/**
 * `scripts/certification-surface-cells.ts` — the surface as DATA.
 *
 * The gate is a `.mjs` file, so it cannot import the TypeScript manifest
 * directly. This module exists so it can read one source rather than parsing
 * `surface-manifest.ts` with a regex — which is how a gate ends up checking a
 * string instead of a value.
 *
 * Usage: npx tsx scripts/certification-surface-cells.ts
 * Prints one JSON document on stdout. Non-zero on a load failure, so a gate
 * that gets nothing is distinguishable from a gate that found nothing.
 */

import {
  EXPECTED_CERTIFICATION_SURFACE,
  notApplicableCells,
  requiredCells,
  unknownConcepts,
} from "../src/certification/surface-manifest.js";

const cells = EXPECTED_CERTIFICATION_SURFACE.flatMap((eco) =>
  eco.cells.map((cell) => ({
    ecosystem: eco.ecosystem,
    concept: cell.concept,
    framework: cell.framework,
    requirement: cell.requirement,
    ...(cell.requirement === "NOT_APPLICABLE" ? { reason: cell.reason } : {}),
  })),
);

console.log(
  JSON.stringify(
    {
      ecosystems: EXPECTED_CERTIFICATION_SURFACE.map((eco) => ({
        ecosystem: eco.ecosystem,
        wave: eco.wave,
        corpusRepos: eco.corpusRepos,
        required: eco.cells.filter((c) => c.requirement === "REQUIRED").length,
        notApplicable: eco.cells.filter(
          (c) => c.requirement === "NOT_APPLICABLE",
        ).length,
      })),
      requiredCellCount: requiredCells().length,
      excludedCells: notApplicableCells(),
      unknownConcepts: unknownConcepts(),
      cells,
    },
    null,
    2,
  ),
);
