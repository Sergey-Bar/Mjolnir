#!/usr/bin/env node
/**
 * `check-version` — every check that a version claim is true, in one order.
 *
 * This used to be four npm names (`version:surface:check`,
 * `reporter:version-check`, `changelog:check`, `changelog:unreleased`) chained
 * by `version:check`, and a fifth name for the chain itself. Five names for one
 * question — "is the version story true?" — and nothing recorded which of them
 * CI actually ran.
 *
 * It is a FILE rather than an npm chain for one concrete reason, not for
 * taste. `ci.yml` runs the unreleased-entry check as
 *
 *   npm run <name> -- --base=origin/${{ github.base_ref || 'main' }}
 *
 * and npm appends `--base=…` to the LAST command of a chain. With the chain
 * ordered one way that is the check that wants the flag; ordered another way it
 * silently lands on a check that does not, and the step goes on reporting PASS
 * while comparing against an empty `git status` on a fresh CI checkout. A
 * named flag with exactly one consumer, dispatched explicitly, cannot rot that
 * way.
 *
 * The four arms, in order, each of which must pass:
 *
 *   1. version surface  every executable surface names the published stable,
 *                       never the working candidate (src/release/version-surface.ts)
 *   2. reporter version the Playwright reporter package agrees with the root
 *   3. changelog         the CHANGELOG's own internal consistency. Takes
 *                       `--expect-version` and `--rules-touched`
 *   4. unreleased entry  a release note exists for what changed — the ONLY arm
 *                       that takes `--base`, because it is the only one whose
 *                       correct answer depends on which commit you compare to
 *
 * Every flag is declared here against the ONE arm that reads it, and that
 * table is the reason this is a file rather than an npm chain. With a chain,
 * a flag is appended to whichever command happens to be last; the only evidence
 * it reached the right one is a passing build. Here a misroute is exit 10 with
 * the flag-to-arm map printed.
 *
 * Usage: node scripts/check-version.mjs
 *          [--base=<ref>] [--expect-version=<X.Y.Z>] [--rules-touched]
 * Exit codes: 0 = all four passed. The first failing arm's own exit code is
 * propagated verbatim, because "check-version failed" is not a diagnosis; 10 =
 * usage error.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

/**
 * The arms, in dependency order, each declaring the flags it alone reads.
 *
 * The tsx path is resolved from this file's own location, not from PATH, so
 * the orchestrator behaves the same on a contributor's machine and on a CI
 * runner — a gate that only works where the cwd happens to be the repo root is
 * a gate that reports something different per environment.
 */
const ARMS = [
  {
    name: "version surface",
    script: "scripts/check-version-surface.ts",
    flags: [],
  },
  {
    name: "reporter version",
    script: "scripts/check-reporter-version.ts",
    flags: [],
  },
  {
    name: "changelog",
    script: "scripts/check-changelog.ts",
    flags: ["--expect-version", "--rules-touched"],
  },
  {
    name: "unreleased entry",
    script: "scripts/check-unreleased-entry.mjs",
    flags: ["--base"],
  },
];

const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

/** `--flag=value`, `--flag value` and bare `--flag` are all accepted. */
const TAKES_VALUE = new Set(["--base", "--expect-version"]);

const forward = new Map(ARMS.map((arm) => [arm.name, []]));
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
  const flag = eq === -1 ? arg : arg.slice(0, eq);
  const owner = ARMS.find((arm) => arm.flags.includes(flag));
  if (owner === undefined) {
    console.error(
      `check-version: unknown argument ${JSON.stringify(arg)}. The flags that ` +
        "exist, and the single arm that reads each:\n" +
        ARMS.flatMap((arm) =>
          arm.flags.map((f) => `  ${f} -> ${arm.name}`),
        ).join("\n") +
        "\nAnything else is a usage error, rather than a flag appended to " +
        "whichever command happens to be last.",
    );
    process.exit(10);
  }
  if (eq !== -1) {
    forward.get(owner.name).push(arg);
    continue;
  }
  if (!TAKES_VALUE.has(flag)) {
    forward.get(owner.name).push(arg);
    continue;
  }
  const value = argv[i + 1];
  if (value === undefined || value.startsWith("--")) {
    console.error(`check-version: ${flag} needs a value, as ${flag}=<value>.`);
    process.exit(10);
  }
  forward.get(owner.name).push(`${flag}=${value}`);
  i++;
}

for (const arm of ARMS) {
  const absolute = join(ROOT, arm.script);
  if (!existsSync(absolute)) {
    console.error(
      `check-version: ${arm.script} does not exist. The arm list is the record ` +
        "of which checks own the version claim; a missing arm is a removed check, " +
        "and removing one is a reviewable edit to this file, not a silent hole.",
    );
    process.exit(10);
  }
  const isTypeScript = arm.script.endsWith(".ts");
  const result = spawnSync(
    process.execPath,
    [
      ...(isTypeScript ? [TSX, absolute] : [absolute]),
      ...forward.get(arm.name),
    ],
    { cwd: ROOT, stdio: "inherit" },
  );
  const code = result.status ?? 1;
  if (code !== 0) {
    console.error(
      `check-version: FAILED at "${arm.name}" (${arm.script}) with exit ${code}. ` +
        "The earlier arms passed; this is the one to read.",
    );
    process.exit(code);
  }
}

console.log(
  `check-version: PASS — ${ARMS.length} arms (${ARMS.map((a) => a.name).join(", ")}).`,
);
