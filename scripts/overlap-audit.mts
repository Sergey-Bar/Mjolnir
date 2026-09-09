import { RULES } from "../src/rules/index.js";

const active = new Set(RULES.map((r) => r.id));
// Unmeasured set (from verdict-census 2026-09-09).
const UNMEASURED = new Set([
  "QA-PW-102",
  "QA-PW-124",
  "QA-PW-116",
  "QA-PW-125",
  "QA-PY-101",
  "QA-PY-102",
  "QA-CS-104",
  "QA-PY-106",
  "QA-JV-107",
  "QA-CS-107",
  "QA-PY-107",
  "QA-PY-108",
  "QA-JV-106",
  "QA-CS-106",
  "QA-PY-104",
  "QA-CS-109",
  "QA-CYP-002",
  "QA-CYP-003",
  "QA-SE-001",
  "QA-SE-002",
  "QA-SE-003",
]);

for (const rule of RULES) {
  if (!rule.overlapWith) continue;
  for (const target of rule.overlapWith) {
    if (UNMEASURED.has(target)) {
      console.log(
        `${rule.id} (${rule.tier}) dedups -> ${target} (unmeasured)`,
      );
    }
  }
  void active;
}
