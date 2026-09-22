import { RULES } from "../src/rules/index.js";

const ids = [
  "QA-CS-106",
  "QA-JV-106",
  "QA-PY-104",
  "QA-CS-109",
  "QA-CYP-002",
  "QA-CYP-003",
  "QA-SE-001",
  "QA-SE-002",
  "QA-PW-102",
  "QA-PW-124",
  "QA-CS-107",
  "QA-SE-003",
  "QA-JV-107",
];
for (const id of ids) {
  const r = RULES.find((x) => x.id === id);
  console.log(id, "->", r?.detectorRevision ?? 1);
}
