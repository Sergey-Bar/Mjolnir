/** Guards the rule-catalog filter + URL-state helpers. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  filterRules,
  stateFromQuery,
  queryFromState,
  emptyState,
} from "../.vitepress/theme/catalog-filter.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "rules", "rules.data.json");

const RULES = [
  {
    id: "QA-CI-001",
    title: "continue-on-error",
    family: "CI",
    familyLabel: "CI integrity",
    severity: "error",
    tier: "core",
    measured: false,
    languages: "yaml",
  },
  {
    id: "QA-PY-005",
    title: "time.sleep in tests",
    family: "PY",
    familyLabel: "Python / pytest",
    severity: "warning",
    tier: "core",
    measured: true,
    languages: "python",
  },
  {
    id: "QA-JV-103",
    title: "Test without assertions",
    family: "JV",
    familyLabel: "Java / JUnit · TestNG",
    severity: "error",
    tier: "quarantine",
    measured: true,
    languages: "java",
  },
];

test("filterRules: no filters returns everything", () => {
  assert.equal(filterRules(RULES, emptyState()).length, 3);
});

test("filterRules: severity", () => {
  const out = filterRules(RULES, { ...emptyState(), severity: "error" });
  assert.deepEqual(out.map((r) => r.id).sort(), ["QA-CI-001", "QA-JV-103"]);
});

test("filterRules: tier + severity compose", () => {
  const out = filterRules(RULES, {
    ...emptyState(),
    severity: "error",
    tier: "quarantine",
  });
  assert.deepEqual(
    out.map((r) => r.id),
    ["QA-JV-103"],
  );
});

test("filterRules: measuredOnly", () => {
  const out = filterRules(RULES, { ...emptyState(), measuredOnly: true });
  assert.deepEqual(out.map((r) => r.id).sort(), ["QA-JV-103", "QA-PY-005"]);
});

test("filterRules: free-text search hits id, title and language", () => {
  assert.equal(filterRules(RULES, { ...emptyState(), q: "sleep" }).length, 1);
  assert.equal(filterRules(RULES, { ...emptyState(), q: "java" }).length, 1);
  assert.equal(filterRules(RULES, { ...emptyState(), q: "qa-ci" }).length, 1);
});

test("stateFromQuery: accepts family label or prefix", () => {
  assert.equal(stateFromQuery("?family=CI", RULES).family, "CI integrity");
  assert.equal(
    stateFromQuery("?family=Python%20%2F%20pytest", RULES).family,
    "Python / pytest",
  );
  assert.equal(stateFromQuery("?family=bogus", RULES).family, "all");
});

test("stateFromQuery: ignores out-of-range severity/tier", () => {
  assert.equal(stateFromQuery("?severity=critical", RULES).severity, "all");
  assert.equal(stateFromQuery("?tier=archived", RULES).tier, "all");
});

test("stateFromQuery <-> queryFromState round-trips", () => {
  const s = stateFromQuery(
    "?q=sleep&severity=warning&family=PY&measured=1",
    RULES,
  );
  const qs = queryFromState(s);
  assert.deepEqual(stateFromQuery("?" + qs, RULES), s);
});

test("queryFromState: empty state yields empty string", () => {
  assert.equal(queryFromState(emptyState()), "");
});

test("the ?family= prefix links used on /guide/what-it-checks all resolve", () => {
  if (!existsSync(DATA)) return; // build not run yet
  const data = JSON.parse(readFileSync(DATA, "utf8"));
  for (const prefix of ["CI", "TEST", "TQUAL", "PW", "PY", "JV", "CS", "ENV"]) {
    assert.notEqual(
      stateFromQuery(`?family=${prefix}`, data).family,
      "all",
      `?family=${prefix} should select a family`,
    );
  }
});
