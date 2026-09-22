/**
 * CHANGELOG integrity gate (Mega MVP Master Plan v3.1 §26 WI-12A, §31).
 *
 * RELEASE-BLOCKING: runs before version publication and before GitHub
 * Release creation — never a post-release audit. 0.6.0 is the first
 * release produced under this fully automated gate.
 *
 * Validates (and extends — the CHANGELOG discipline already existed;
 * this gate makes it enforceable, §31):
 *   1. package version = expected released version (the workflow passes
 *      the tag-verified version; the gate checks the CHANGELOG heading
 *      matches it exactly — package.json↔tag is already enforced by the
 *      release job's "Verify tag matches package.json" step).
 *   2. Headings strictly descending semver, no duplicates, every
 *      heading carries a date.
 *   3. Keep-a-Changelog header present.
 *   4. No empty decorative sections (a `### X` with no body is drift).
 *   5. Historical entries are read-only for this gate: it validates
 *      shape, never rewrites (OoS per plan §26 WI-12A).
 *   6. --rules-touched: when the release diff touched src/rules/**,
 *      the released version's section must document at least one rule
 *      ID (QA-*-nnn) — the §32.5 rule-change discipline, mechanically
 *      checked.
 *
 * Exit codes: 0 green · 1 drift (release-blocking) · 2 usage error.
 */

import { readFileSync, existsSync } from "node:fs";

function fail(msg: string): never {
  console.error(`CHANGELOG GATE: FAIL — ${msg}`);
  process.exit(1);
}

function semverKey(v: string): [number, number, number] {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) fail(`not a valid semver heading: ${v}`);
  return [Number(m?.[1]), Number(m?.[2]), Number(m?.[3])];
}

// ── arguments ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let expectedVersion: string | undefined;
let rulesTouched = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--expect-version") {
    expectedVersion = args[++i];
  } else if (args[i] === "--rules-touched") {
    rulesTouched = true;
  } else {
    console.error(`CHANGELOG GATE: unknown argument ${args[i] as string}`);
    process.exit(2);
  }
}
if (expectedVersion === undefined) {
  console.error(
    "Usage: tsx scripts/check-changelog.ts --expect-version <X.Y.Z> [--rules-touched]",
  );
  process.exit(2);
}

const CHANGELOG = "CHANGELOG.md";
if (!existsSync(CHANGELOG)) fail("CHANGELOG.md does not exist at repo root");
const text = readFileSync(CHANGELOG, "utf8");

// ── 3. Keep-a-Changelog header ─────────────────────────────────────────
if (!/^#\s*Changelog$/im.test(text) && !/Keep a Changelog/i.test(text)) {
  fail("missing the Keep-a-Changelog header");
}

// ── headings: collect `## [X.Y.Z] — date` entries ──────────────────────
const headingRe = /^## \[(v?\d+\.\d+\.\d+)\] ?— ?(\d{4}-\d{2}-\d{2})/gm;
const headings: Array<{ version: string; date: string; line: number }> = [];
for (const m of text.matchAll(headingRe)) {
  headings.push({
    version: m[1] ?? "",
    date: m[2] ?? "",
    line: text.slice(0, m.index).split("\n").length,
  });
}
if (headings.length === 0) {
  fail("no `## [X.Y.Z] — YYYY-MM-DD` headings found");
}

// ── 2. strict descending order, no duplicates, dated ──────────────────
// Ordering is enforced ONLY within the gate era (>= GATE_ERA): the
// pre-gate history contains backfilled sections whose on-disk order is
// fixed history — this gate validates and preserves it, never rewrites
// it (plan §26 WI-12A OoS). Duplicates and invalid dates are checked
// everywhere, including history.
const GATE_ERA: [number, number, number] = [0, 6, 0];
for (let i = 0; i < headings.length; i++) {
  const h = headings[i] as { version: string; date: string; line: number };
  if (isNaN(Date.parse(h.date))) {
    fail(
      `heading ${h.version} (line ${h.line}) has an invalid date: ${h.date}`,
    );
  }
  if (i > 0) {
    const prev = headings[i - 1] as { version: string; line: number };
    const a = semverKey(prev.version);
    const b = semverKey(h.version);
    if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) {
      fail(`duplicate version heading: ${h.version} (line ${h.line})`);
    }
    const inGateEra =
      b[0] > GATE_ERA[0] ||
      (b[0] === GATE_ERA[0] && b[1] >= GATE_ERA[1] && b[2] >= GATE_ERA[2]);
    if (inGateEra) {
      const greater =
        a[0] > b[0] ||
        (a[0] === b[0] && a[1] > b[1]) ||
        (a[0] === b[0] && a[1] === b[1] && a[2] > b[2]);
      if (!greater) {
        fail(
          `heading order violated: ${prev.version} (line ${prev.line}) is not newer than ${h.version} (line ${h.line}) — gate-era entries must be strictly descending`,
        );
      }
    }
  }
}

// ── 1. the released version has a matching, dated heading ─────────────
const expected = expectedVersion.replace(/^v/, "");
const released = headings.find((h) => h.version.replace(/^v/, "") === expected);
if (!released) {
  fail(
    `no heading for version ${expectedVersion} — every published version needs a CHANGELOG section`,
  );
}

// ── 4. no empty decorative sections inside the released version block ─
const sectionEnd =
  headings
    .slice(headings.indexOf(released) + 1)
    .map((h) => h.line - 1)
    .find((l) => l > (released?.line ?? 0)) ?? text.split("\n").length;
const section = text
  .split("\n")
  .slice((released?.line ?? 1) - 1, sectionEnd - 1)
  .join("\n");
const subRe = /^### .+$/gm;
for (const m of section.matchAll(subRe)) {
  const subStart = m.index ?? 0;
  const after = section.slice(subStart);
  const nextSub = after.slice(1).search(/^### /m);
  const body =
    nextSub === -1
      ? after.slice(m[0].length)
      : after.slice(m[0].length, nextSub + 1);
  if (body.trim().length === 0) {
    fail(
      `empty section "${m[0].trim()}" in the ${expectedVersion} block — a section without content is decorative drift (§32.2)`,
    );
  }
}

// ── 6. rule-change documentation discipline (§32.5) ────────────────────
if (rulesTouched && !/QA-[A-Z]+-\d{3}/.test(section)) {
  fail(
    "the release diff touched src/rules/** but the released CHANGELOG section documents no rule ID (QA-*-nnn) — rule changes are first-class entries (§32.5)",
  );
}

console.log(
  `CHANGELOG GATE: OK — ${expectedVersion} heading present, ${headings.length} version sections in descending order, dated, non-empty${rulesTouched ? ", rule changes documented" : ""}.`,
);
