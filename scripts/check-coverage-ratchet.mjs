#!/usr/bin/env node

import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const SUMMARY = join(process.cwd(), "coverage", "coverage-summary.json");

const FLOORS = {
  statements: 98.5,
  branches: 96.0,
  functions: 99.3,
  lines: 98.8,
};

if (!existsSync(SUMMARY)) {
  console.error(
    `coverage ratchet: missing ${SUMMARY}; run npm run test:coverage first`,
  );
  process.exit(1);
}

const summary = JSON.parse(readFileSync(SUMMARY, "utf8"));
const total = summary.total;

const rows = Object.entries(FLOORS).map(([metric, floor]) => {
  const pct = Number(total?.[metric]?.pct);
  const ok = Number.isFinite(pct) && pct >= floor;
  return { metric, floor, pct, ok };
});

const lines = [
  "## Coverage ratchet",
  "",
  "| Metric | Measured | Floor |",
  "| --- | ---: | ---: |",
  ...rows.map(
    ({ metric, pct, floor, ok }) =>
      `| ${metric} | ${Number.isFinite(pct) ? pct.toFixed(2) : "missing"}% ${ok ? "PASS" : "FAIL"} | ${floor.toFixed(2)}% |`,
  ),
  "",
];

console.log(lines.join("\n"));

if (process.env["GITHUB_STEP_SUMMARY"]) {
  appendFileSync(process.env["GITHUB_STEP_SUMMARY"], `${lines.join("\n")}\n`);
}

const failures = rows.filter((row) => !row.ok);
if (failures.length > 0) {
  console.error(
    `coverage ratchet failed: ${failures
      .map(({ metric, pct, floor }) => `${metric} ${pct}% < ${floor}%`)
      .join(", ")}`,
  );
  process.exit(1);
}
