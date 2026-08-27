/**
 * CI integration (Sprint-Plan W7): generates .github/workflows/qa-doctor.yml
 * from internal templates ONLY — no user-input interpolation (R3 supply-chain).
 * Default gate: advisory (report, never block).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type GateLevel = "advisory" | "error" | "warning";

const TEMPLATE = (gate: GateLevel): string => `name: QA Doctor

on:
  pull_request:

concurrency:
  group: qa-doctor-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # needed for --scope changed merge-base
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx --yes @sergey-bar/qa-doctor@latest . --scope changed --json > qa-doctor.json
      - name: Annotate PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const r = JSON.parse(fs.readFileSync('qa-doctor.json', 'utf8'));
            for (const f of r.findings) {
              const level = f.severity === 'error' ? 'failure' : 'warning';
              await core.summary.addRaw(\`**\${f.ruleId}** (\${f.severity}) \${f.file}:\${f.line} — \${f.message}\\n\\n\${f.fix}\`).addRaw('\\n\\n');
              if (f.file && f.line) {
                github.rest.checks // annotations land via the job summary
              }
            }
            await core.summary.write();
      # Gate enforcement: advisory never blocks; error/warning fail the job.
      ${
        gate === "advisory"
          ? `- name: Gate (advisory)\n        run: echo "Advisory mode — findings reported, never blocking."`
          : `- name: Gate (${gate})
        run: |
          node -e "
            const r = require('./qa-doctor.json');
            const sev = r.findings.map(f => f.severity);
            const bad = sev.includes('${gate === "error" ? "error" : "warning"}') || sev.includes('error');
            process.exit(bad ? 1 : 0);
          "`
      }
`;

export function ciInstall(
  root: string,
  gate: GateLevel = "advisory",
): { written: string; existed: boolean } {
  const wfDir = join(root, ".github", "workflows");
  const target = join(wfDir, "qa-doctor.yml");
  if (!existsSync(wfDir)) mkdirSync(wfDir, { recursive: true });
  const existed = existsSync(target);
  writeFileSync(target, TEMPLATE(gate));
  return { written: target, existed };
}
