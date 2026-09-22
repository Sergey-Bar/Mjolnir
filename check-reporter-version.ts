/**
 * Reporter version-sync gate (Mega MVP Master Plan v3.1 §26 WI-10,
 * §14) — ADVISORY until three consecutive green release cycles prove
 * the sync flow, then blocking (the plan's own ramp).
 *
 * Checks the `packages/playwright-reporter` surface against the root
 * `mjolnir-qa` package:
 *   1. the reporter package.json parses and names the published scope
 *      (`mjolnir-qa-playwright-reporter`);
 *   2. the reporter's default output filename is exactly the file the
 *      scan pipeline's runtime discovery looks for
 *      (`mjolnir.report.json`) — the ingestion contract (§14: the
 *      reporter is the ingestion surface of the Evidence Core);
 *   3. the reporter declares the same minimum Node engine as the root
 *      package (one runtime story);
 *   4. version relationship: the reporter's major/minor may trail the
 *      root package (independent 0.1.x line until publish), but it must
 *      never be AHEAD of the root package — a trailing independent line
 *      is the documented posture (advisory), an ahead line is a hard
 *      drift even in advisory mode.
 *
 * Exit codes: 0 ok/advisory · 1 blocking drift (major drift even in
 * advisory mode) · 2 usage error.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function warn(msg: string): void {
  console.warn(`REPORTER VERSION SYNC: ADVISORY WARN — ${msg}`);
}

function hardFail(msg: string): never {
  console.error(`REPORTER VERSION SYNC: FAIL — ${msg}`);
  process.exit(1);
}

const root = process.argv[2] ?? ".";
const reporterPkgPath = join(
  root,
  "packages",
  "playwright-reporter",
  "package.json",
);
const rootPkgPath = join(root, "package.json");

if (!existsSync(reporterPkgPath))
  hardFail("packages/playwright-reporter/package.json missing");
if (!existsSync(rootPkgPath)) hardFail("root package.json missing");

const reporter = JSON.parse(readFileSync(reporterPkgPath, "utf8")) as {
  name?: string;
  version?: string;
  engines?: { node?: string };
  main?: string;
};
const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8")) as {
  name?: string;
  version?: string;
  engines?: { node?: string };
};

if (reporter.name !== "mjolnir-qa-playwright-reporter") {
  hardFail(`reporter package name drifted: ${String(reporter.name)}`);
}
if (
  typeof reporter.version !== "string" ||
  !/^\d+\.\d+\.\d+/.test(reporter.version)
) {
  hardFail("reporter package.json has no valid semver version");
}
if (typeof rootPkg.version !== "string")
  hardFail("root package.json has no version");

// 2. ingestion contract: the reporter's default output file is the file
// discoverRuntimeReport scans for (engine/evidence-discovery.ts
// "mjolnir-report" convention).
const reporterSrc = join(
  root,
  "packages",
  "playwright-reporter",
  "src",
  "index.ts",
);
if (existsSync(reporterSrc)) {
  const src = readFileSync(reporterSrc, "utf8");
  if (!/mjolnir\.report\.json/.test(src)) {
    hardFail(
      "reporter default output no longer writes mjolnir.report.json — the ingestion contract with runtime discovery is broken",
    );
  }
}

// 3. runtime parity
const rootEngine = rootPkg.engines?.node ?? "";
const reporterEngine = reporter.engines?.node ?? "";
if (rootEngine && reporterEngine && rootEngine !== reporterEngine) {
  warn(
    `node engine parity drift: root "${rootEngine}" vs reporter "${reporterEngine}"`,
  );
}

// 4. version relationship (advisory trailing / blocking ahead)
const key = (v: string): [number, number, number] => {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  return [Number(m?.[1]), Number(m?.[2]), Number(m?.[3])];
};
const [rmaj, rmin, rpat] = key(reporter.version ?? "0.0.0");
const [mmaj, mmin, mpat] = key(rootPkg.version ?? "0.0.0");
const reporterAhead =
  rmaj > mmaj ||
  (rmaj === mmaj && rmin > mmin) ||
  (rmaj === mmaj && rmin === mmin && rpat > mpat);
if (reporterAhead) {
  hardFail(
    `reporter version ${String(reporter.version)} is AHEAD of the root package ${String(rootPkg.version)} — a leading independent line is drift even in advisory mode`,
  );
}
if (rmaj !== mmaj || rmin !== mmin) {
  warn(
    `reporter version ${String(reporter.version)} trails the root package ${String(rootPkg.version)} — advisory while the reporter line is unpublished; becomes blocking after 3 green release cycles (plan §14)`,
  );
}

console.log(
  `REPORTER VERSION SYNC: OK (advisory mode) — reporter ${String(reporter.version)}, root ${String(rootPkg.version)}, ingestion contract intact.`,
);
