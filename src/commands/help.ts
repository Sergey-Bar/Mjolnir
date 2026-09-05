/**
 * `mjolnir help` / `mjolnir <verb> --help` — the help registry (M2).
 *
 * One grouped overview (printUsage stays the canonical entry point in
 * cli.ts) plus per-verb entries: name, summary, usage line, a few
 * copy-pasteable examples, and the exact next command. A verb without
 * an entry renders an honest "no detailed help" line + the overview,
 * never a fabricated page.
 */

export interface HelpEntry {
  /** Canonical verb as typed (`mjolnir <verb>`). */
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
    summary: "generate the PR workflow (scan + annotations + gate)",
    usage: "mjolnir ci install [--gate advisory|error|warning] [--force]",
    examples: ["mjolnir ci install", "mjolnir ci install --gate error --force"],
    next: "mjolnir --scope changed",
  },
  {
    verb: "pr-comment",
    summary: "render a scoped PR comment (Markdown)",
    usage: "mjolnir pr-comment [path] [--base <ref>]",
    examples: [
      "mjolnir pr-comment .",
      "mjolnir pr-comment . --base origin/main",
    ],
  },
  {
    verb: "forensics",
    summary: "runtime evidence from a real run: retries, flakes, durations",
    usage:
      "mjolnir forensics <test-results-dir-or-report-file> [--no-flaky-md]",
    examples: ["mjolnir forensics test-results"],
  },
  {
    verb: "triage",
    summary: "flaky-triage proposal + TRIAGE.md meeting artifact",
    usage: "mjolnir triage <test-results-dir-or-report-file> [--no-md]",
    examples: ["mjolnir triage test-results --no-md"],
  },
  {
    verb: "pw-report",
    summary: "Playwright run summary (counts, true flakes, slowest tests)",
    usage: "mjolnir pw-report <playwright-report.json | test-results-dir>",
    examples: ["mjolnir pw-report test-results"],
  },
  {
    verb: "doctor:playwright",
    summary: "Playwright deep scan + Selector Health report",
    usage: "mjolnir doctor:playwright [path]",
    examples: ["mjolnir doctor:playwright e2e"],
  },
  {
    verb: "fix",
    summary: "apply safe auto-fixes with proof (re-scan verifies each)",
    usage: "mjolnir fix [path] [--dry-run]",
    examples: ["mjolnir fix --dry-run", "mjolnir fix ."],
  },
  {
    verb: "baseline",
    summary: "snapshot the current finding set as the comparison point",
    usage: "mjolnir baseline [path]",
    examples: ["mjolnir baseline", "mjolnir diff"],
    next: "mjolnir diff",
  },
  {
    verb: "diff",
    summary: "compare a fresh scan against the baseline — new/worsened only",
    usage: "mjolnir diff [path]",
    examples: ["mjolnir diff"],
  },
  {
    verb: "impact",
    summary: "what a commit introduced vs resolved, since a prior commit",
    usage: "mjolnir impact [path] [--since <ref>]",
    examples: ["mjolnir impact . --since HEAD~1"],
  },
  {
    verb: "debt",
    summary: "test-debt register with an estimated quarterly cost",
    usage: "mjolnir debt [path]",
    examples: ["mjolnir debt"],
  },
  {
    verb: "handover",
    summary: "new-QA onboarding map of the suite",
    usage: "mjolnir handover [path]",
    examples: ["mjolnir handover"],
  },
  {
    verb: "stats",
    summary: "all-time local counters of fixes seen via diff",
    usage: "mjolnir stats",
    examples: ["mjolnir stats"],
  },
  {
    verb: "badge",
    summary: "shields.io endpoint JSON + snippet from a scan",
    usage: "mjolnir badge [path]",
    examples: ["mjolnir badge ."],
  },
  {
    verb: "init",
    summary: "detect frameworks + setup checklist (never overwrites)",
    usage: "mjolnir init [--interactive]",
    examples: ["mjolnir init"],
  },
  {
    verb: "explain",
    summary: "what/why/fix + measured FP rate for one rule",
    usage: "mjolnir explain <RULE-ID> [--fixtures-root <dir>]",
    examples: ["mjolnir explain QA-TEST-001", "mjolnir rules --unmeasured"],
  },
  {
    verb: "rules",
    summary: "rule catalog with trust metadata (md/json/unmeasured)",
    usage: "mjolnir rules [--md] [--unmeasured|--measured] [--external]",
    examples: ["mjolnir rules --md --unmeasured"],
  },
  {
    verb: "suppressions",
    summary: "list suppressed findings (governance transparency)",
    usage: "mjolnir suppressions",
    examples: ["mjolnir suppressions"],
  },
  {
    verb: "create-rule",
    summary: "scaffold a new rule + fixtures (must-fire, must-not-fire)",
    usage: 'mjolnir create-rule <QA-XXX-nnn> --title "Rule title"',
    examples: ['mjolnir create-rule QA-PW-131 --title "No request waits"'],
  },
  {
    verb: "doctor",
    summary: "self-audit of the rule base (fixture firewall, tiers, caps)",
    usage: "mjolnir doctor [repo-root]",
    examples: ["mjolnir doctor"],
  },
];

/** Scan-flag entries documented per-flag via the overview. */
export const HELP_FLAGS: Array<{ flag: string; summary: string }> = [
  { flag: "--json", summary: "machine-readable output" },
  { flag: "--format sarif", summary: "SARIF 2.1 for GitHub Code Scanning" },
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

/** True when `mjolnir help <verb>` has a detailed page. */
export function hasVerbHelp(verb: string): boolean {
  return findEntry(verb) !== undefined;
}

/** One per-verb help page: summary, usage, examples, next step. */
export function renderVerbHelp(verb: string): string {
  const e = findEntry(verb);
  if (!e) {
    return [
      `  No detailed help for "${verb}".`,
      "",
      "  $ mjolnir --help",
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

const DOCS_URL = "https://github.com/Sergey-Bar/Mjolnir#readme";

/** The overview's grouped one-line sections, in display order. */
const GROUPS: Array<{ title: string; verbs: string[] }> = [
  { title: "Scan", verbs: [] },
  {
    title: "CI & PRs",
    verbs: ["ci install", "pr-comment", "badge", "impact", "baseline", "diff"],
  },
  {
    title: "Forensics",
    verbs: ["forensics", "triage", "pw-report", "doctor:playwright"],
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
      "create-rule",
    ],
  },
  { title: "Meta", verbs: ["rules", "explain"] },
];

const SCAN_SUMMARY_LINES: string[] = [
  "mjolnir [path]                 full-repo scan + WORTHINESS score",
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
    "🔨 mjölnir — verification trust engine for test suites and CI pipelines",
  );
  lines.push("");
  lines.push(
    "Usage: mjolnir [path] [options] · mjolnir <subcommand> [args] · mjolnir help <verb>",
  );
  lines.push("");
  lines.push("The product is one command in CI:");
  lines.push("");
  lines.push(
    "  mjolnir --scope changed        scan only what the branch touched; exit 1 on",
  );
  lines.push(
    "                                 new findings. `mjolnir ci install` writes the",
  );
  lines.push("                                 workflow for you.");
  lines.push("");
  lines.push("Everything else is optional.");
  lines.push("");
  lines.push("  " + SCAN_SUMMARY_LINES[0]);
  lines.push(
    "  mjolnir explain <RULE-ID>      what/why/fix + measured FP rate for one rule",
  );
  lines.push(
    "  mjolnir rules --unmeasured     the rules running on assumption, not measurement",
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
      const usage = e.usage.replace(/^mjolnir /, "").padEnd(46);
      lines.push(`  ${usage}${e.summary}`);
    }
    lines.push("");
  }
  lines.push("Copy-paste starts:");
  lines.push(
    "  $ mjolnir                         score this repo's test suite",
  );
  lines.push(
    "  $ mjolnir --scope changed         CI gate: only what the branch touched",
  );
  lines.push("  $ mjolnir ci install              write the PR workflow");
  lines.push("  $ mjolnir forensics test-results  where the flakes hide");
  lines.push("");
  lines.push("Per-command help: mjolnir help <verb>   (e.g. mjolnir help fix)");
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
