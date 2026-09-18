/**
 * `qa-doctor help` / `qa-doctor <verb> --help` — the help registry (M2).
 *
 * One grouped overview (printUsage stays the canonical entry point in
 * cli.ts) plus per-verb entries: name, summary, usage line, a few
 * copy-pasteable examples, and the exact next command. A verb without
 * an entry renders an honest "no detailed help" line + the overview,
 * never a fabricated page.
 */

export interface HelpEntry {
  /** Canonical verb as typed (`qa-doctor <verb>`). */
  verb: string;
  /** One-line description. */
  summary: string;
  /** Full usage line including arguments. */
  usage: string;
  /** Copy-pasteable examples. */
  examples: string[];
  /** Where to go next. */
  next?: string;
}

/** Ordered registry — grouped by the same categories the overview uses. */
export const HELP_ENTRIES: HelpEntry[] = [
  {
    verb: "ci install",
    summary:
      "generate the PR workflow (action-based by default; scan + annotations + gate)",
    usage:
      "qa-doctor ci install [--gate advisory|error|warning] [--no-action] [--force]",
    examples: [
      "qa-doctor ci install",
      "qa-doctor ci install --gate error",
      "qa-doctor ci install --no-action --gate error --force",
    ],
    next: "qa-doctor --scope changed",
  },
  {
    verb: "pr-comment",
    summary: "render a scoped PR comment (Markdown)",
    usage: "qa-doctor pr-comment [path] [--base <ref>]",
    examples: [
      "qa-doctor pr-comment .",
      "qa-doctor pr-comment . --base origin/main",
    ],
  },
  {
    verb: "summary",
    summary: "CI annotations + step summary from a saved --json report",
    usage:
      "qa-doctor summary [qa-doctor.json] [--stdout] [--path-prefix <dir>]",
    examples: [
      "qa-doctor --json > qa-doctor.json && qa-doctor summary qa-doctor.json",
      "qa-doctor summary qa-doctor.json --stdout",
    ],
  },
  {
    verb: "forensics",
    summary: "runtime evidence from a real run: retries, flakes, durations",
    usage:
      "qa-doctor forensics <test-results-dir-or-report-file> [--no-flaky-md]",
    examples: ["qa-doctor forensics test-results"],
  },
  {
    verb: "triage",
    summary: "flaky-triage proposal + TRIAGE.md meeting artifact",
    usage: "qa-doctor triage <test-results-dir-or-report-file> [--no-md]",
    examples: ["qa-doctor triage test-results --no-md"],
  },
  {
    verb: "mutation",
    summary:
      "mutation-evidence reader: survived-mutant leaderboard + E1→E2 derivation",
    usage: "qa-doctor mutation <mutation-report> [--scan .]",
    examples: [
      "qa-doctor mutation reports/mutation-report.json",
      "qa-doctor mutation reports/… --scan .",
    ],
  },
  {
    verb: "pw-report",
    summary: "Playwright run summary (counts, true flakes, slowest tests)",
    usage: "qa-doctor pw-report <playwright-report.json | test-results-dir>",
    examples: ["qa-doctor pw-report test-results"],
  },
  {
    verb: "doctor:playwright",
    summary: "Playwright deep scan + Selector Health report",
    usage: "qa-doctor doctor:playwright [path]",
    examples: ["qa-doctor doctor:playwright e2e"],
  },
  {
    verb: "fix",
    summary: "apply safe auto-fixes with proof (re-scan verifies each)",
    usage: "qa-doctor fix [path] [--dry-run]",
    examples: ["qa-doctor fix --dry-run", "qa-doctor fix ."],
  },
  {
    verb: "baseline",
    summary: "snapshot the current finding set as the comparison point",
    usage: "qa-doctor baseline [path]",
    examples: ["qa-doctor baseline", "qa-doctor diff"],
    next: "qa-doctor diff",
  },
  {
    verb: "diff",
    summary: "lifecycle diff vs the committed baseline",
    usage: "qa-doctor diff [path] [--json] [scan flags]",
    examples: ["qa-doctor diff"],
  },
  {
    verb: "verify",
    summary:
      "agent-loop digest: resolved/new/unchanged vs baseline + score delta",
    usage: "qa-doctor verify [path] [--json] [scan flags]",
    examples: ["qa-doctor verify"],
  },
  {
    verb: "impact",
    summary: "what a commit introduced vs resolved, since a prior commit",
    usage: "qa-doctor impact [path] [--since <ref>]",
    examples: ["qa-doctor impact . --since HEAD~1"],
  },
  {
    verb: "debt",
    summary: "test-debt register with an estimated quarterly cost",
    usage: "qa-doctor debt [path]",
    examples: ["qa-doctor debt"],
  },
  {
    verb: "handover",
    summary: "new-QA onboarding map of the suite",
    usage: "qa-doctor handover [path]",
    examples: ["qa-doctor handover"],
  },
  {
    verb: "stats",
    summary: "all-time local counters of fixes seen via diff",
    usage: "qa-doctor stats",
    examples: ["qa-doctor stats"],
  },
  {
    verb: "badge",
    summary: "shields.io endpoint JSON + snippet from a scan",
    usage: "qa-doctor badge [path]",
    examples: ["qa-doctor badge ."],
  },
  {
    verb: "trust-report",
    summary: "deterministic, self-contained Trust Artifact (md + json)",
    usage: "qa-doctor trust-report [path]",
    examples: ["qa-doctor trust-report ."],
  },
  {
    verb: "init",
    summary: "detect frameworks + setup checklist (never overwrites)",
    usage: "qa-doctor init [--interactive]",
    examples: ["qa-doctor init"],
  },
  {
    verb: "why",
    summary:
      "why did QA Doctor flag <file>:<line>? evidence + fix (not a gate)",
    usage: "qa-doctor why <file>:<line> [path] [--json <qa-doctor.json>]",
    examples: [
      "qa-doctor why e2e/a.spec.ts:3",
      "qa-doctor why e2e/a.spec.ts:3 --json qa-doctor.json",
    ],
  },
  {
    verb: "handoff",
    summary: "deterministic fix-handoff artifact from a saved --json report",
    usage:
      "qa-doctor handoff [qa-doctor.json] [--category <cat>] [--rules <ids>]",
    examples: [
      "qa-doctor --json > qa-doctor.json && qa-doctor handoff qa-doctor.json",
      "qa-doctor handoff qa-doctor.json --category QA-PW",
    ],
  },
  {
    verb: "explain",
    summary: "what/why/fix + measured FP rate for one rule",
    usage: "qa-doctor explain <RULE-ID> [--fixtures-root <dir>]",
    examples: ["qa-doctor explain QA-TEST-001", "qa-doctor rules --unmeasured"],
  },
  {
    verb: "rules",
    summary:
      "rule catalog + empirical-measurement stats/health (md/json/stats/health)",
    usage:
      "qa-doctor rules [--md] [--unmeasured|--measured] [--external] | [--stats] | [--health] [--limit=N]",
    examples: [
      "qa-doctor rules --md --unmeasured",
      "qa-doctor rules --stats",
      "qa-doctor rules --health --limit=20",
    ],
  },
  {
    verb: "suppressions",
    summary: "list suppressed findings (governance transparency)",
    usage: "qa-doctor suppressions",
    examples: ["qa-doctor suppressions"],
  },
  {
    verb: "create-rule",
    summary: "scaffold a new rule + fixtures (must-fire, must-not-fire)",
    usage: 'qa-doctor create-rule <QA-XXX-nnn> --title "Rule title"',
    examples: ['qa-doctor create-rule QA-PW-131 --title "No request waits"'],
  },
  {
    verb: "doctor",
    summary: "self-audit of the rule base (fixture firewall, tiers, caps)",
    usage: "qa-doctor doctor [repo-root]",
    examples: ["qa-doctor doctor"],
  },
  {
    verb: "release-trust",
    summary:
      "Release Trust Verdict over the canonical 12 dimensions (docs/RELEASE-TRUST-CONTRACT.md)",
    usage: "qa-doctor release-trust [--json] [repo-root]",
    examples: ["qa-doctor release-trust", "qa-doctor release-trust --json"],
  },
  {
    verb: "install",
    summary: "install the agent instruction surfaces + optional staged hook",
    usage: "qa-doctor install [--staged-hook] [--dry-run] [--force]",
    examples: [
      "qa-doctor install --dry-run",
      "qa-doctor install --staged-hook",
    ],
  },
  {
    verb: "mcp",
    summary:
      "run as an MCP server over stdio (scan / explain / diff / verify tools)",
    usage: "qa-doctor mcp",
    examples: ["qa-doctor mcp"],
  },
];

/** Scan-flag entries documented per-flag via the overview. */
export const HELP_FLAGS: Array<{ flag: string; summary: string }> = [
  { flag: "--json", summary: "machine-readable output" },
  { flag: "--format sarif", summary: "SARIF 2.1 for GitHub Code Scanning" },
  {
    flag: "--format codequality",
    summary: "GitLab Code Quality report (MR widget artifact)",
  },
  { flag: "--format mermaid", summary: "test-architecture diagram" },
  { flag: "--tone blunt", summary: "blunter, pattern-mocking messages" },
  { flag: "--verbose", summary: "show all findings" },
  { flag: "--scope changed", summary: "only new/changed lines vs merge-base" },
  { flag: "--max-duration <sec>", summary: "analysis time budget" },
  { flag: "--width <cols>", summary: "override terminal width" },
  { flag: "--ascii / --no-ascii", summary: "force glyph mode" },
  { flag: "--strict", summary: "include quarantine-tier rules" },
  { flag: "--debug", summary: "print swallowed rule crashes" },
  { flag: "--cache", summary: "reuse local per-file verdicts" },
  { flag: "--no-progress", summary: "no live scan-progress line on stderr" },
  { flag: "--score", summary: "print only the numeric score (or `unknown`)" },
  { flag: "--category <cat>", summary: "presentation filter (repeatable)" },
  { flag: "--staged", summary: "scan only git staged files" },
  {
    flag: "--blocking <level>",
    summary: "exit-status override: error|warning|none",
  },
  {
    flag: "--enable-plugins",
    summary: "allow npm/JS-module rules (default OFF)",
  },
];

export const EXIT_CODE_TABLE: Array<[string, string]> = [
  ["0", "clean — no findings or the requested artifact was produced"],
  [
    "1",
    "errors found (or the diff/impact verdict says the PR should not merge)",
  ],
  ["2", "partial — the scan ran but was truncated, or input was unreadable"],
  ["10", "usage — bad flags or arguments; help is printed"],
  ["20", "crash — internal error; rerun with --debug for the stack trace"],
];

function findEntry(verb: string): HelpEntry | undefined {
  return HELP_ENTRIES.find((e) => e.verb === verb);
}

/** True when `qa-doctor help <verb>` has a detailed page. */
export function hasVerbHelp(verb: string): boolean {
  return findEntry(verb) !== undefined;
}

/**
 * Verbs whose detailed help IS the root help (certification P3):
 * `scan` is the product's one command — the registry has no separate
 * scan page, so `qa-doctor scan --help` / `qa-doctor help scan` must render
 * the overview (which carries the scan usage lines), not the "no
 * detailed help" stub. `ci` (the bare stem) and `help` are the same
 * shape: real verbs, no dedicated page.
 */
const ROOT_HELP_VERBS: ReadonlySet<string> = new Set(["scan", "ci", "help"]);

/** One per-verb help page: summary, usage, examples, next step. */
export function renderVerbHelp(verb: string): string {
  if (!hasVerbHelp(verb) && ROOT_HELP_VERBS.has(verb)) {
    return renderRootHelp();
  }
  const e = findEntry(verb);
  if (!e) {
    return [
      `  No detailed help for "${verb}".`,
      "",
      "  $ qa-doctor --help",
      "",
    ].join("\n");
  }
  const lines: string[] = [];
  lines.push(`  ${e.verb} — ${e.summary}`);
  lines.push("");
  lines.push(`  Usage:`);
  lines.push(`    ${e.usage}`);
  lines.push("");
  lines.push(`  Examples:`);
  for (const ex of e.examples) lines.push(`    $ ${ex}`);
  if (e.next) {
    lines.push("");
    lines.push(`  Next step:`);
    lines.push(`    $ ${e.next}`);
  }
  lines.push("");
  return lines.join("\n");
}

const DOCS_URL = "https://github.com/Sergey-Bar/qa-doctor#readme";

/** The overview's grouped one-line sections, in display order. */
const GROUPS: Array<{ title: string; verbs: string[] }> = [
  { title: "Scan", verbs: [] },
  {
    title: "CI & PRs",
    verbs: [
      "ci install",
      "summary",
      "pr-comment",
      "badge",
      "trust-report",
      "impact",
      "baseline",
      "diff",
      "verify",
    ],
  },
  {
    title: "Forensics",
    verbs: ["forensics", "triage", "pw-report", "doctor:playwright"],
  },
  {
    title: "Mutation evidence",
    verbs: ["mutation"],
  },
  {
    title: "Maintenance",
    verbs: [
      "fix",
      "debt",
      "stats",
      "suppressions",
      "handover",
      "init",
      "doctor",
      "release-trust",
      "create-rule",
    ],
  },
  {
    title: "Meta",
    verbs: ["rules", "explain", "why", "handoff", "install", "mcp"],
  },
];

const SCAN_SUMMARY_LINES: string[] = [
  "qa-doctor [path]                 full-repo scan + WORTHINESS score",
];

/**
 * The redesigned root help (plan M2): grouped sections, one-line
 * descriptions, copy-pasteable examples, the frozen exit-code table and
 * the docs link. Content is identical whether colored or piped — the
 * caller decides (runHelpCommand passes a resolved palette; printUsage
 * stays plain).
 */
export function renderRootHelp(schemaVersion = 1): string {
  const byVerb = new Map(HELP_ENTRIES.map((e) => [e.verb, e]));
  const lines: string[] = [];
  lines.push(
    "🔨 qa-doctor — verification trust engine for test suites and CI pipelines",
  );
  lines.push("");
  lines.push(
    "Usage: qa-doctor [path] [options] · qa-doctor <subcommand> [args] · qa-doctor help <verb>",
  );
  lines.push("");
  lines.push("The product is one command in CI:");
  lines.push("");
  lines.push(
    "  qa-doctor --scope changed        scan only what the branch touched; exit 1 on",
  );
  lines.push(
    "                                 new findings. `qa-doctor ci install` writes the",
  );
  lines.push("                                 workflow for you.");
  lines.push("");
  lines.push("Everything else is optional.");
  lines.push("");
  lines.push("  " + SCAN_SUMMARY_LINES[0]);
  lines.push(
    "  qa-doctor explain <RULE-ID>      what/why/fix + measured FP rate for one rule",
  );
  lines.push(
    "  qa-doctor rules --unmeasured     the rules running on assumption, not measurement",
  );
  lines.push("");
  lines.push("Options:");
  for (const f of HELP_FLAGS) {
    const pad = f.flag.padEnd(22);
    lines.push(`  ${pad}${f.summary}`);
  }
  lines.push("  -v, --version         print the installed version and exit");
  lines.push("  -h, --help            show this help");
  lines.push("");
  for (const g of GROUPS) {
    lines.push(`Subcommands — ${g.title}:`);
    for (const verb of g.verbs) {
      const e = byVerb.get(verb);
      if (!e) continue;
      const usage = e.usage.replace(/^qa-doctor /, "").padEnd(46);
      lines.push(`  ${usage}${e.summary}`);
    }
    lines.push("");
  }
  lines.push("Copy-paste starts:");
  lines.push(
    "  $ qa-doctor                         score this repo's test suite",
  );
  lines.push(
    "  $ qa-doctor --scope changed         CI gate: only what the branch touched",
  );
  lines.push("  $ qa-doctor ci install              write the PR workflow");
  lines.push("  $ qa-doctor forensics test-results  where the flakes hide");
  lines.push("");
  lines.push(
    "Per-command help: qa-doctor help <verb>   (e.g. qa-doctor help fix)",
  );
  lines.push("");
  lines.push(`Exit codes: ${EXIT_CODE_TABLE.map(([c]) => c).join(" · ")}`);
  for (const [code, meaning] of EXIT_CODE_TABLE) {
    lines.push(`  ${code.padEnd(3)} ${meaning}`);
  }
  lines.push("");
  lines.push(
    `Docs: ${DOCS_URL}   (JSON schemaVersion ${schemaVersion}, additive-only)`,
  );
  return lines.join("\n");
}
