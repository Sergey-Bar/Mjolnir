/**
 * Engine version, as a leaf module: `runIdentity` (R4c) needs the engine
 * version inside scan-pipeline WITHOUT importing cli.ts (a cycle — cli
 * imports the pipeline). The literal follows the same discipline as
 * CLI_VERSION and SARIF's driver.version: kept in sync on release by
 * scripts/sync-sarif-version.cjs and guarded by the version-consistency
 * spec. cli.ts re-exports this as CLI_VERSION.
 */
export const ENGINE_VERSION = "1.0.5";
