/**
 * Guards the docs/rules -> site/rules generator. Run: `npm test` in site/.
 *
 * Uses the Node built-in test runner so the site keeps zero test deps.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseRule, siteBody, FIELDS, FAMILIES } from "./gen-rules.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RULES_DIR = join(HERE, "..", "..", "docs", "rules");

const SAMPLE = `# QA-JV-103 — Test without assertions

_Generated from the live rule registry and this rule's own committed fixtures by \`mjolnir\`'s doc generator — do not edit by hand. Regenerate with \`npm run docs:rules\`._

| Field            | Value            |
| ---------------- | ---------------- |
| Severity         | error            |
| Tier             | quarantine       |
| Measured FP rate | 50% (n=20)       |
| Languages        | java             |

## What gets flagged (real detector output)

Example from this rule's own must-fire fixture: \`tests/fixtures/QA-JV-103/must-fire/CheckoutTest.java\`

## Confirmed NOT to fire

Verified against \`tests/fixtures/QA-JV-103/must-not-fire/CheckoutTest.java\` — fine.

## Corpus-measured false-positive risk

Real occurrence counts (see \`docs/FP-AUDIT.md\`):

---

Full catalog: \`mjolnir rules --md\` · Live explanation: \`mjolnir explain QA-JV-103\`
`;

test("parseRule extracts title and metadata", () => {
  const r = parseRule("QA-JV-103", SAMPLE);
  assert.equal(r.title, "Test without assertions");
  assert.equal(r.severity, "error");
  assert.equal(r.tier, "quarantine");
  assert.equal(r.family, "JV");
  assert.equal(r.familyLabel, "Java / JUnit · TestNG");
  assert.equal(r.measuredFp, "50% (n=20)");
  assert.equal(r.measured, true);
});

test("parseRule reports an unparseable title as null (drift signal)", () => {
  const r = parseRule("QA-XX-999", "# not the expected shape\n\nbody");
  assert.equal(r.title, null);
});

test("parseRule marks unmeasured rules", () => {
  const md = SAMPLE.replace("50% (n=20)", "not yet measured");
  assert.equal(parseRule("QA-JV-103", md).measured, false);
});

test("siteBody strips the generator preamble and CLI footer", () => {
  const out = siteBody("QA-JV-103", SAMPLE);
  assert.ok(!out.includes("do not edit by hand"), "preamble removed");
  assert.ok(!out.includes("Regenerate with"), "regenerate note removed");
  assert.ok(!/Full catalog: `mjolnir rules --md`/.test(out), "footer removed");
});

test("siteBody links repo paths instead of leaving dead text", () => {
  const out = siteBody("QA-JV-103", SAMPLE);
  assert.ok(
    out.includes(
      "[`tests/fixtures/QA-JV-103/must-fire/CheckoutTest.java`](https://github.com/Sergey-Bar/Mjolnir/blob/main/tests/fixtures/QA-JV-103/must-fire/CheckoutTest.java)",
    ),
    "fixture path is a GitHub link",
  );
  assert.ok(
    out.includes("[the false-positive audit](/reference/fp-audit)"),
    "FP-AUDIT reference is an on-site link",
  );
  assert.ok(!/see `docs\/FP-AUDIT\.md`/.test(out), "no bare docs/ path left");
});

test("siteBody adds a back-link and provenance note", () => {
  const out = siteBody("QA-JV-103", SAMPLE);
  assert.ok(out.includes("[← Back to the rule catalog](/rules/)"));
  assert.ok(out.includes("mjolnir explain QA-JV-103"));
});

test("every real docs/rules/*.md parses with a title and known family", () => {
  if (!existsSync(RULES_DIR)) return; // repo checkout without docs/rules
  const files = readdirSync(RULES_DIR).filter((f) =>
    /^QA-[A-Z]+-\d+\.md$/.test(f),
  );
  assert.ok(files.length > 50, `expected many rule docs, got ${files.length}`);

  const untitled = [];
  for (const f of files) {
    const id = f.replace(/\.md$/, "");
    const r = parseRule(id, readFileSync(join(RULES_DIR, f), "utf8"));
    if (r.title === null) untitled.push(id);
    assert.ok(FAMILIES[r.family], `${id}: unknown family "${r.family}"`);
    assert.ok(
      ["error", "warning", "info"].includes(r.severity),
      `${id}: odd severity "${r.severity}"`,
    );
  }
  assert.equal(
    untitled.length,
    0,
    `untitled rule docs: ${untitled.join(", ")}`,
  );
});

test("FIELDS covers the columns the catalog UI reads", () => {
  for (const k of ["severity", "tier", "measuredFp", "languages"]) {
    assert.ok(Object.values(FIELDS).includes(k), `FIELDS maps to ${k}`);
  }
});
