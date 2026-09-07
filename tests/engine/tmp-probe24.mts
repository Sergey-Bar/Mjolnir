import { pwGlobalSetupSharedState } from "../../src/rules/playwright/qa-pw-125-global-setup.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const text = readFileSync(
  join(process.cwd(), "tests/fixtures/QA-PW-125/must-fire/global-setup.ts"),
  "utf8",
);
const findings = pwGlobalSetupSharedState.run({
  path: "global-setup.ts",
  text,
} as never);
console.log("findings:", findings.length);
