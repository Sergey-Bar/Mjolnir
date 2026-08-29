/**
 * Syncs every hardcoded version literal in src/ to package.json's
 * version — the single source of truth. Used by
 * .github/workflows/release.yml so a release can never ship a stale one.
 * (tests/version-consistency.spec.ts keeps the literals honest locally.)
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
    find: /version: "[^"]+",/,
    replace: `version: "${v}",`,
    label: "SARIF driver.version",
  },
  {
    path: "/../src/cli.ts",
    find: /export const CLI_VERSION = "[^"]+";/,
    replace: `export const CLI_VERSION = "${v}";`,
    label: "cli.ts CLI_VERSION",
  },
];

for (const surface of SURFACES) {
  const p = __dirname + surface.path;
  const s = fs.readFileSync(p, "utf8");
  const out = s.replace(surface.find, surface.replace);
  if (!out.includes(surface.replace)) {
    console.error(`${surface.label} sync failed for ${v} (${p})`);
    process.exit(1);
  }
  fs.writeFileSync(p, out);
  console.log(`${surface.label} synced to ${v}`);
}
