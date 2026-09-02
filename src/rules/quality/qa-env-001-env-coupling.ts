/**
 * QA-ENV-001 — "Works On My Machine" detector core (Tier 5 #24).
 * Environment coupling in test files: fixed ports, OS paths,
 * timezone/locale-sensitive calls.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import { isInsideEmbeddedCode } from "../shared/masking.js";

export const envCoupling = defineRule({
  id: "QA-ENV-001",
  category: "QA-TQUAL",
  title: "Environment coupling in test",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes: "regex heuristic",
  introduced: "0.2.0",
  tier: "quarantine",
  // Phase 2 retune (EVIDENCE-BACKED, detectorRevision 2 — §07): all 20
  // measured FPs (n=20, docs/FP-AUDIT.md) share ONE root cause — the
  // fixed-port sub-pattern matched the suite's OWN local test containers
  // (Azurite / DynamoDB Local / Mongo on localhost:port), which are
  // deliberate self-contained fixtures, not ambient machine state. The
  // loopback variant is dropped: a hardcoded NON-loopback host:port is
  // the coupling signal (it reaches beyond the suite's own fixtures);
  // loopback endpoints are the suite's own sandbox. The OS-path, locale,
  // and local-time-getter sub-patterns are unchanged (the corpus never
  // contradicted them).
  detectorRevision: 2,

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const patterns: Array<{
      re: RegExp;
      kind: string;
      why: string;
      fix: string;
    }> = [
      {
        // Fixed NON-loopback host:port — reaches a specific remote host,
        // not the suite's own local fixture container. Matched shapes:
        // dotted hostnames (`api.example.com:8443`) and IPv4 literals
        // (loopback 127/8 excluded). Loopback (localhost/127.x) endpoints
        // are deliberately excluded: they are the suite's own
        // self-contained test fixtures (Azurite, DynamoDB Local,
        // Mongo-on-localhost), the entire measured FP cohort (Phase 2
        // triage, docs/FP-AUDIT.md n=20). Single-label names
        // (`postgres:15` docker refs) have no dot — never matched.
        re: /\b(?:[a-z][\w-]*(?:\.[\w-]+)+|(?!127\.)\d{1,3}(?:\.\d{1,3}){3}):\d{2,5}\b/g,
        kind: "fixed port",
        why: "The test assumes a specific host:port is reachable — it breaks on parallel runs, containers, network isolation, or when that host moves.",
        fix: "Use the server's resolved base URL from config/test fixtures, or a local fixture container, instead of a hardcoded host:port.",
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
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        // This rule reads raw text because the evidence (port, path, locale
        // call) lives inside a string literal. That exposes it to code
        // written as test DATA: a string holding `page.navigate("http://
        // localhost:3000/…")` is an argument to the function under test, not
        // a real navigation. A string that contains both a nested quote and
        // call syntax is source code, not a value.
        if (isInsideEmbeddedCode(ctx, m.index)) continue;
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Environment coupling (${kind}): \`${m[0].slice(0, 50)}\`.`,
          why,
          fix,
        });
      }
    }
    return findings;
  },
});
