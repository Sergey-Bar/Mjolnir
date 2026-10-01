/**
 * Syncs smithery.yaml's `version` literal to package.json's version —
 * the single source of truth. Used by .github/workflows/release.yml's
 * cut step: the Smithery registry must never advertise a version the
 * package is not (tests/contract/repo-hygiene.spec.ts keeps the pair
 * honest on every push).
 */
const fs = require("node:fs");

const v = require("../package.json").version;

const p = __dirname + "/../smithery.yaml";
const s = fs.readFileSync(p, "utf8");
// smithery.yaml is JSON-shaped despite the extension: the version key is
// a quoted JSON key with a trailing comma.
const out = s.replace(/"version": "[^"]+",/, `"version": "${v}",`);
if (!out.includes(`"version": "${v}",`)) {
  console.error(`smithery.yaml version sync failed for ${v} (${p})`);
  process.exit(1);
}
fs.writeFileSync(p, out);
console.log(`smithery.yaml version synced to ${v}`);
