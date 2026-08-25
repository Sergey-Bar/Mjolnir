/**
 * QA-ENV-001 — "Works On My Machine" detector core (Tier 5 #24).
 * Environment coupling in test files: fixed ports, OS paths,
 * timezone/locale-sensitive calls.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const envCoupling = defineRule({
  id: "QA-ENV-001",
  category: "QA-TQUAL",
  title: "Environment coupling in test",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files" as unknown as "test-files",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const patterns: Array<{
      re: RegExp;
      kind: string;
      why: string;
      fix: string;
    }> = [
      {
        // Fixed localhost ports — assumes the port is free & app is there
        re: /(?:localhost|127\.0\.0\.1):\d{2,5}/g,
        kind: "fixed port",
        why: "The test assumes a specific local port is serving the app — it breaks on parallel runs, containers, or port conflicts.",
        fix: "Use the server's resolved base URL from config/test fixtures instead of a hardcoded host:port.",
      },
      {
        // OS-specific absolute paths
        re: /['"`](?:\/tmp\/|C:\\\\|D:\\\\)[^'"`]*['"`]/g,
        kind: "OS path",
        why: "Absolute OS paths make the test machine-dependent — it fails on any developer or CI runner with a different filesystem.",
        fix: "Use os.tmpdir() / path.join with relative paths inside the test workspace.",
      },
      {
        // Timezone/locale-sensitive formatting without explicit locale
        re: /\.toLocale(?:DateString|TimeString|String)\s*\(\s*\)/g,
        kind: "timezone/locale",
        why: "Locale-less date formatting depends on the machine's timezone and locale — passes on your laptop, fails on CI.",
        fix: "Pass an explicit locale + timeZone, or assert on ISO strings / fixed timestamps.",
      },
      {
        // Local timezone getters
        re: /\bnew Date\s*\(\s*\)\s*\.(?:getHours|getDate|getMonth|getDay)\s*\(/g,
        kind: "local-time getter",
        why: "Local-time getters depend on the runner's timezone — midnight-boundary tests flip between days.",
        fix: "Use getUTC* methods or freeze time with a fake timer / freezegun.",
      },
    ];

    for (const { re, kind, why, fix } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Environment coupling (${kind}): \`${m[0].slice(0, 50)}\`.`,
          why,
          fix,
        });
      }
    }
    return findings;
  },
});

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
