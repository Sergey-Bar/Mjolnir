import { sharedPageFamily } from "../../src/rules/families/shared-page.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const text = readFileSync(
  join(process.cwd(), "tests/fixtures/QA-CS-104/must-fire/SharedPageTest.cs"),
  "utf8",
);
const rule = sharedPageFamily.find((r) => r.id === "QA-CS-104")!;
const findings = rule.run({ path: "SharedPageTest.cs", text } as never);
console.log("findings:", findings.length);
for (const f of findings) console.log("  line", f.line, f.message);
