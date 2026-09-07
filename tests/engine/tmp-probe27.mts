import {
  sharedPageFamily,
  networkIdleFamily,
} from "../../src/rules/families/shared-page.js";
import { networkIdleFamily as netIdle } from "../../src/rules/families/network-idle.js";
import { pwGlobalSetupSharedState } from "../../src/rules/playwright/qa-pw-125-global-setup.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function run(ruleId: string, file: string, text: string): number {
  const all = [...sharedPageFamily, ...netIdle, pwGlobalSetupSharedState];
  const rule = all.find((r) => r.id === ruleId);
  if (!rule) return -1;
  const findings = rule.run({ path: file, text } as never);
  console.log(`${ruleId} on ${file}: ${findings.length}`);
  return findings.length;
}

// JV-104: NETWORKIDLE is the network-idle family, not shared-page.
const jv104 = readFileSync(
  join(process.cwd(), "tests/fixtures/QA-JV-104/must-fire/CheckoutTest.java"),
  "utf8",
);
run("QA-JV-104", "CheckoutTest.java", jv104);
run("QA-JV-107", "CheckoutTest.java", jv104);

// PW-125: fixture fires 2 via direct probe but 0 via explain?
const pw125 = readFileSync(
  join(process.cwd(), "tests/fixtures/QA-PW-125/must-fire/global-setup.ts"),
  "utf8",
);
run("QA-PW-125", "global-setup.ts", pw125);
