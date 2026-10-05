// Do the commands every gate declares actually exist and resolve?
//
// `gates/*.json` is a governed surface: it declares what a PR, a release and a
// nightly must prove. Each entry carries an `id` (the logical name) and a
// `command` (how it runs), and this checks the second half — because a gate
// that cannot run is a gate that cannot fail, and a registry full of them reads
// as coverage while providing none.
//
// This is the check the registry was missing, not a new gate: `gates:check`
// validates the TIERS of declared gates, never that their commands resolve.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const failures = [];
let total = 0;

for (const file of readdirSync(join(ROOT, "gates"))) {
  if (!file.endsWith(".json")) continue;
  const parsed = JSON.parse(readFileSync(join(ROOT, "gates", file), "utf8"));
  const list = Array.isArray(parsed) ? parsed : (parsed.gates ?? []);
  const scope = file.replace(".json", "");

  for (const entry of list) {
    if (typeof entry === "string" || !entry.command) continue;
    total++;
    const { id, command } = entry;

    const tokens = command.replace(/["']/g, "").split(/\s+/);
    const npmRun = tokens[0] === "npm" && tokens[1] === "run";
    if (npmRun) {
      const script = tokens[2];
      const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
      if (pkg.scripts[script] === undefined) {
        failures.push(`${scope}/${id}: \`npm run ${script}\` does not exist`);
      }
      continue;
    }

    // A bare command: the executable must be on PATH and the script it names
    // must exist. Checking only the script is enough to catch a deleted file,
    // which is the failure that actually happens.
    const script = tokens.find(
      (t) => t.endsWith(".mjs") || t.endsWith(".ts") || t.endsWith(".js"),
    );
    if (script === undefined) {
      failures.push(`${scope}/${id}: no resolvable script in \`${command}\``);
      continue;
    }
    if (!existsSync(join(ROOT, script))) {
      failures.push(`${scope}/${id}: ${script} does not exist`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      status: failures.length === 0 ? "PASS" : "FAIL",
      gatesChecked: total,
      problems: failures,
    },
    null,
    2,
  ),
);
if (failures.length > 0) {
  console.error(
    "\nA gate whose command cannot run is a gate that cannot fail. Every entry " +
      "in gates/*.json must name something that exists.",
  );
}
process.exit(failures.length === 0 ? 0 : 1);
