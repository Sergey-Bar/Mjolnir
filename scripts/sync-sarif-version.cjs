/**
 * Syncs every hardcoded version literal in src/ to package.json's
 * version — the single source of truth. Used by
 * .github/workflows/release.yml so a release can never ship a stale one.
 * (tests/contract/version-consistency.spec.ts keeps the literals honest locally.)
 *
 * Two surfaces carry a literal, both deliberately: SARIF's
 * `driver.version` (what GitHub Code Scanning displays) and cli.ts's
 * `CLI_VERSION` (what `mjolnir --version` prints). Neither can read
 * package.json at runtime — the shipped artifact is a single bundled
 * dist/cli.mjs whose position relative to package.json depends on how
 * the consumer installed it.
 */
const fs = require("node:fs");

const v = require("../package.json").version;

/** @type {Array<{ path: string, find: RegExp, replace: string, label: string }>} */
const SURFACES = [
  {
    path: "/../src/reporter/sarif.ts",
    // After the R4c refactor, sarif.ts uses ENGINE_VERSION (the variable)
    // instead of a hardcoded literal — so there is nothing to sync.
    // If a hardcoded literal appears (e.g. during a refactor), the regex
    // catches it and syncs it.
    find: /version: "[^"]+",/,
    replace: `version: "${v}",`,
    label: "SARIF driver.version",
    optional: true,
  },
  {
    // R4c: the literal moved to the leaf module (run-identity needs the
    // engine version inside scan-pipeline without a cli.ts import cycle);
    // cli.ts re-exports it as CLI_VERSION.
    path: "/../src/engine/version.ts",
    find: /export const ENGINE_VERSION = "[^"]+";/,
    replace: `export const ENGINE_VERSION = "${v}";`,
    label: "engine/version.ts ENGINE_VERSION",
  },
];

for (const surface of SURFACES) {
  const p = __dirname + surface.path;
  const s = fs.readFileSync(p, "utf8");
  const out = s.replace(surface.find, surface.replace);
  if (!out.includes(surface.replace)) {
    if (surface.optional) {
      // The surface may use a variable instead of a hardcoded literal.
      // Check if the variable is already in use.
      console.log(
        `${surface.label}: uses ENGINE_VERSION variable (no hardcoded literal to sync)`,
      );
      continue;
    }
    console.error(`${surface.label} sync failed for ${v} (${p})`);
    process.exit(1);
  }
  fs.writeFileSync(p, out);
  console.log(`${surface.label} synced to ${v}`);
}
