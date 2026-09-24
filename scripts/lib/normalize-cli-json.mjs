export const CLI_TIMING_PATHS = [
  ["analysisStatus", "durationMs"],
  ["contract", "completeness", "durationMs"],
];

export function normalizeCliResult(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("CLI result must be an object");
  }
  const result = JSON.parse(JSON.stringify(value));
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
  return result;
}

export function normalizeCliJson(json) {
  return JSON.stringify(normalizeCliResult(JSON.parse(json)));
}
