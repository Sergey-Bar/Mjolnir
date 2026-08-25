/**
 * Syncs the hardcoded SARIF driver.version in src/reporter/sarif.ts to
 * package.json's version. Used by .github/workflows/release.yml so a
 * release can never ship with a stale driver.version — the source of
 * truth is package.json. (tests/version-consistency.spec.ts keeps the
 * literal honest locally.)
 */
const fs = require("node:fs");

const v = require("../package.json").version;
const p = __dirname + "/../src/reporter/sarif.ts";
const s = fs.readFileSync(p, "utf8");
const out = s.replace(/version: "[^"]+",/, `version: "${v}",`);
if (!out.includes(`version: "${v}",`)) {
  console.error("sarif version sync failed for", v);
  process.exit(1);
}
fs.writeFileSync(p, out);
console.log("SARIF driver.version synced to", v);
