/**
 * Frozen exit codes (§24.1). Every handler returns one of these;
 * the contract is published in docs/VERSIONING.md and tested in
 * tests/contract/.
 */
export const EXIT_CLEAN = 0;
export const EXIT_FINDINGS = 1;
export const EXIT_PARTIAL = 2;
export const EXIT_USAGE = 10;
export const EXIT_INTERNAL = 20;
