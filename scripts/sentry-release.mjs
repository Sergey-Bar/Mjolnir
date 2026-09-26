#!/usr/bin/env node

/**
 * `sentry:release` — create the Sentry release for this version and upload the
 * source maps that make its stack traces readable.
 *
 * WHY THIS IS A SEPARATE, EXPLICIT STEP
 *
 * `npm run build` now emits a `.map` beside every file in `dist`, and the
 * published package deliberately EXCLUDES them (a negated `files` entry for
 * `dist`): nobody running `npx mjolnir-qa` needs a 4 MB map file, and a
 * monitoring feature must not tax the install of everyone who never enables it.
 *
 * That exclusion is exactly why the upload cannot be implicit. Sentry can
 * only symbolicate a frame if it holds the map that was built alongside the
 * exact bytes the user downloaded, and it can only match the two if the
 * bundle carries a debug id. So the order is fixed and load-bearing:
 *
 *   1. inject  — stamp a debug id into every built file, in place
 *   2. release — create `mjolnir-qa@<version>` and attach the commit
 *   3. upload  — send the maps for that release
 *
 * Run this AFTER `npm run build` and BEFORE `npm publish`, or the ids will
 * not match what ships and every stack trace degrades to bundle frames.
 *
 * FAILING LOUD, NOT QUIET
 *
 * Without `SENTRY_AUTH_TOKEN` there is nothing to authenticate as, so the
 * script exits 0 and says so. A release pipeline that has not been given
 * credentials is not a broken pipeline — it is a local build, and failing
 * it would make this unusable outside CI. But it never claims success: the
 * skip is stated on stdout, so a log that says "uploaded" means uploaded.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const release = `mjolnir-qa@${pkg.version}`;

const org = process.env.SENTRY_ORG;
const token = process.env.SENTRY_AUTH_TOKEN;
const project = process.env.SENTRY_PROJECT;

if (!org || !token) {
  console.log(
    `sentry:release: SKIPPED — set SENTRY_ORG and SENTRY_AUTH_TOKEN to ` +
      `create ${release} and upload its source maps. No telemetry was sent.`,
  );
  process.exit(0);
}

const base = [
  "npx",
  "--yes",
  "@sentry/cli@latest",
  ...(project ? ["--project", project] : []),
];

/** Run one sentry-cli step, failing the release if it does not succeed. */
function run(args, what) {
  console.log(`sentry:release: ${what}…`);
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [...base, ...args],
    {
      stdio: "inherit",
      env: { ...process.env, SENTRY_ORG: org, SENTRY_AUTH_TOKEN: token },
    },
  );
  if (result.error) {
    console.error(
      `sentry:release: ${what} could not start: ${result.error.message}`,
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    // A half-finished release is worse than none: the release exists but
    // its maps do not, so traces would symbolicate to bundle frames and
    // look like a source problem. Stop here and let the tag be re-cut.
    console.error(
      `sentry:release: ${what} failed (exit ${result.status}). ` +
        `Re-run this script from a clean checkout before publishing.`,
    );
    process.exit(result.status ?? 1);
  }
}

run(["sourcemaps", "inject", "--silent"], "injecting debug ids into dist/");
run(["releases", "new", release, "--finalize", "--yes"], `creating ${release}`);
run(
  ["sourcemaps", "upload", "--release", release, "--wait"],
  `uploading maps for ${release}`,
);

console.log(
  `sentry:release: ${release} created and its source maps uploaded. ` +
    `Stack traces from this version will symbolicate to source.`,
);
