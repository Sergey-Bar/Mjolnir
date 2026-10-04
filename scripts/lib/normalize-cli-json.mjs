/**
 * Values that legitimately differ between two runs on two machines, and so
 * must be removed before the determinism assertion can mean anything.
 *
 * Two kinds, and the distinction matters. TIMING is a measurement of the run.
 * PATHS are facts about WHERE the run happened. Neither is engine drift, and a
 * determinism check that reports either as drift is reporting on its own
 * environment rather than on the engine.
 *
 * The path entry is here because the soak copies the target into a FRESH
 * temporary directory for every run, so `evidence.artifact` — the absolute path
 * where run evidence was found — is a different string every time by
 * construction. That is not an engine defect; it is a fact about temp
 * directories.
 *
 * This is what made `stress` red on twenty consecutive nights from 2026-09-27:
 * nineteen of twenty runs "drifted" against a field that cannot be stable
 * across temp directories, and the nightly red read as "the big scan is slow"
 * rather than "the output is not reproducible".
 *
 * The underlying observation is recorded and not acted on: an absolute path is
 * not useful to a consumer on another machine either, so a repo-relative path
 * would be the better contract. Until that is a deliberate output change, it
 * is normalised here — which is what this function is for.
 */
export const CLI_MACHINE_VARYING_PATHS = [
  ["analysisStatus", "durationMs"],
  ["contract", "completeness", "durationMs"],
  ["evidence", "artifact"],
];

/** @deprecated Kept as the old name; use CLI_MACHINE_VARYING_PATHS. */
export const CLI_TIMING_PATHS = CLI_MACHINE_VARYING_PATHS;

export function normalizeCliResult(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("CLI result must be an object");
  }
  const result = JSON.parse(JSON.stringify(value));

  // The two durationMs fields are ASSERTED present rather than deleted
  // conditionally: a result that has stopped reporting them is a different
  // contract, and a normaliser that quietly tolerated their absence would hide
  // that. The artifact path is deleted when present and not required, because a
  // scan with no runtime evidence legitimately has none.
  const analysis = result.analysisStatus;
  if (
    typeof analysis !== "object" ||
    analysis === null ||
    !("durationMs" in analysis)
  ) {
    throw new TypeError("CLI result is missing analysisStatus.durationMs");
  }
  const completeness = result.contract?.completeness;
  if (
    typeof completeness !== "object" ||
    completeness === null ||
    !("durationMs" in completeness)
  ) {
    throw new TypeError(
      "CLI result is missing contract.completeness.durationMs",
    );
  }
  delete analysis.durationMs;
  delete completeness.durationMs;

  const evidence = result.evidence;
  if (typeof evidence === "object" && evidence !== null) {
    delete evidence.artifact;
  }
  return result;
}

export function normalizeCliJson(json) {
  return JSON.stringify(normalizeCliResult(JSON.parse(json)));
}
