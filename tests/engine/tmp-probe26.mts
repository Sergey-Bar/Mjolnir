import { seJavaSleepLookup } from "../../src/rules/selenium/qa-se-sleep-lookup.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const text = readFileSync(
  join(process.cwd(), "tests/fixtures/QA-SE-001/must-fire/InventoryTest.java"),
  "utf8",
);
const f1 = seJavaSleepLookup.run({
  path: "InventoryTest.java",
  text,
  codeText: text,
} as never);
console.log("with codeText:", f1.length);
const f2 = seJavaSleepLookup.run({ path: "InventoryTest.java", text } as never);
console.log("without codeText:", f2.length);
