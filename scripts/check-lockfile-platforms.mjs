/**
 * `lockfile:platforms` — the lockfile must be installable on every CI platform.
 *
 * Usage: node scripts/check-lockfile-platforms.mjs [repo-root]
 *
 * THE DEFECT THIS EXISTS TO MAKE IMPOSSIBLE
 *
 * A lockfile regenerated on one machine is only valid on that machine's
 * platform. `npm install` prunes every optional dependency that is not the
 * host's, so running it on Windows stripped all 98 platform-scoped entries
 * except the win32 ones — the esbuild, lightningcss and rollup binary shims
 * for linux and darwin.
 *
 * The failure is total and it is silent locally: `npm ci` succeeds on the
 * machine that generated the lockfile, and on CI every matrix job dies in
 * 8–35 seconds with
 *
 *   Missing: lightningcss-linux-arm64@1.33.0 from lock file
 *
 * before a single test runs. I hit exactly this while fixing an unrelated
 * lockfile drift, and the fix I was about to ship was itself the breakage.
 *
 * THE RULE
 *
 * The lockfile must carry os/cpu-scoped entries for every platform the CI
 * matrix builds on. Derived from the entries' own `os`/`cpu` fields, so it
 * does not hardcode a package list that will drift with every dependency
 * bump — it asks the structural question, "is this lockfile platform-complete
 * for the platforms we ship on?"
 *
 * Recovery is documented on the script: a Windows-generated lockfile cannot be
 * made complete locally, so the missing entries have to be merged back from
 * the last lockfile CI accepted rather than regenerated.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? process.cwd();

/**
 * The platforms CI builds on, from the `build-test` matrix in
 * `.github/workflows/ci.yml`: ubuntu-latest, macos-latest, windows-latest.
 * `macos-latest` is arm64 and `windows-latest` is x64 today; both are listed
 * so that a runner bump shows up here rather than as a missing binary in CI.
 */
const REQUIRED = [
  { os: "linux", cpu: "x64", runner: "ubuntu-latest" },
  { os: "darwin", cpu: "arm64", runner: "macos-latest" },
  { os: "win32", cpu: "x64", runner: "windows-latest" },
];

const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
const packages = lock.packages ?? {};

const present = new Set();
for (const entry of Object.values(packages)) {
  if (entry === null || typeof entry !== "object") continue;
  if (!Array.isArray(entry.os) || !Array.isArray(entry.cpu)) continue;
  for (const os of entry.os) {
    for (const cpu of entry.cpu) present.add(`${os}/${cpu}`);
  }
}

const missing = REQUIRED.filter(({ os, cpu }) => !present.has(`${os}/${cpu}`));

const platformScoped = Object.values(packages).filter(
  (entry) =>
    entry !== null &&
    typeof entry === "object" &&
    (Array.isArray(entry?.os) || Array.isArray(entry?.cpu)),
).length;

if (missing.length > 0) {
  for (const { os, cpu, runner } of missing) {
    console.error(
      `lockfile:platforms: no os/cpu-scoped entry for ${os}/${cpu}, which ` +
        `the ${runner} CI job needs.`,
    );
  }
  console.error(
    `\nlockfile:platforms: ${missing.length} of ${REQUIRED.length} CI ` +
      `platform(s) are missing optional binaries, so \`npm ci\` will fail on ` +
      `those jobs before any test runs.`,
  );
  console.error(
    "\nA lockfile regenerated on this machine cannot be fixed by regenerating " +
      "it again — npm prunes the other platforms' optional dependencies by " +
      "design. Merge the missing entries back from the last lockfile CI " +
      "accepted, or run `npm install --package-lock-only` once per platform " +
      "and commit the union.",
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "PASS",
    platformScopedEntries: platformScoped,
    ciPlatforms: REQUIRED.length,
  }),
);
