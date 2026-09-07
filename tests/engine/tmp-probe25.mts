import { sharedPageFamily } from "../../src/rules/families/shared-page.js";
import {
  seJavaSleepLookup,
  seCSharpSleepLookup,
} from "../../src/rules/selenium/qa-se-sleep-lookup.js";
import { pwGlobalSetupSharedState } from "../../src/rules/playwright/qa-pw-125-global-setup.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function run(ruleId: string, dir: string, file: string): number {
  const family = sharedPageFamily.find((r) => r.id === ruleId);
  const rule = family ?? (ruleId === "QA-SE-001" ? seJavaSleepLookup : ruleId === "QA-SE-002" ? seCSharpSleepLookup : pwGlobalSetupSharedState);
  const text = readFileSync(join(process.cwd(), dir, file), "utf8");
  const path = file;
  const findings = rule.run({ path, text, codeText: text } as never);
  console.log(`${ruleId} ${file}: ${findings.length} findings`);
  for (const f of findings) console.log("   line", f.line, f.message.slice(0, 60));
  return findings.length;
}

// JV-104 — CheckoutTest.java: NETWORKIDLE is QA-JV-107's pattern, not shared-page's `static Page`
run("QA-JV-104", "tests/fixtures/QA-JV-104/must-fire", "CheckoutTest.java");
// SE-001 — InventoryTest.java
run("QA-SE-001", "tests/fixtures/QA-SE-001/must-fire", "InventoryTest.java");
// PW-125 — global-setup.ts
run("QA-PW-125", "tests/fixtures/QA-PW-125/must-fire", "global-setup.ts");
