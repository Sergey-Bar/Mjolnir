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
    summary:
      "generate the PR workflow (advisory by default; action-based; scan + annotations + gate)",
    usage:
      "mjolnir ci install [--gate advisory|error|warning] [--no-action] [--force]",
    examples: [
      "mjolnir ci install",
      "mjolnir ci install --gate error",
      "mjolnir ci install --no-action --gate error --force",
    ],
    next: "mjolnir --scope changed",
  },
  {
    verb: "fix",
    summary: "apply safe auto-fixes with proof (re-scan verifies each)",
    usage: "mjolnir fix [path] [--dry-run]",
    examples: ["mjolnir fix --dry-run", "mjolnir fix ."],
  },
  {
    verb: "stats",
    summary: "all-time local counters of fixes seen via diff",
    usage: "mjolnir stats",
    examples: ["mjolnir stats"],
  },
  {
    verb: "handoff",
    summary: "deterministic fix-handoff artifact from a saved --json report",
    usage: "mjolnir handoff [mjolnir.json] [--category <cat>] [--rules <ids>]",
    examples: [
      "mjolnir --json > mjolnir.json && mjolnir handoff mjolnir.json",
      "mjolnir handoff mjolnir.json --category QA-PW",
    ],
  },
  {
    verb: "explain",
    summary: "what/why/fix + measured FP rate for one rule",
    usage: "mjolnir explain <RULE-ID> [--fixtures-root <dir>]",
    examples: [
      "mjolnir explain QA-TEST-001",
      "mjolnir explain --list --unmeasured",
    ],
  },
  {
    verb: "explain --list capability",
    summary:
      "the capability registry: every capability at the maturity the machine can prove",
    usage:
      "mjolnir explain --list capability [--json] [--kind <k>] [--maturity M0..M5] [--id <substring>]",
    // No --set and no --promote, and that absence is the contract:
    // maturity is derived from evidence (ADR 0001), so this subcommand
    // shows and checks. A verb that could raise a level would be a verb
    // that could lie about one. It lives under `rules` because the
    // capability registry and the rule catalog are the same evidence.
    examples: [
      "mjolnir explain --list capability",
      "mjolnir explain --list capability --maturity M2",
      "mjolnir explain --list capability --json > registry.json",
    ],
  },
  {
    verb: "contract-verify",
    summary: "machine-contract + exit-code contract integrity vs a scan",
    usage: "mjolnir contract-verify [path] [--contract <scan-json>] [--json]",
    examples: ["mjolnir contract-verify --contract mjolnir.json"],
  },
  {
    verb: "suppression-gate",
    summary: "enforce suppression policy governance gate",
    usage: "mjolnir suppression-gate [path] [--policy <file>] [--json]",
    examples: [
      "mjolnir suppression-gate",
      "mjolnir suppression-gate . --policy mjolnir.policy.json",
    ],
    next: "mjolnir doctor --frameworks",
  },
  {
    verb: "evidence-graph",
    summary: "build and query the verification evidence graph",
    usage: "mjolnir evidence-graph [path] [--file <path>|--rule <id>] [--json]",
    examples: [
      "mjolnir evidence-graph",
      "mjolnir evidence-graph . --rule QA-TEST-001 --json",
    ],
    next: "mjolnir ci release-trend",
  },
  {
    verb: "doctor",
    summary: "self-audit of the rule base (fixture firewall, tiers, caps)",
    usage: "mjolnir doctor [repo-root]",
    examples: ["mjolnir doctor"],
  },
  {
    verb: "install",
    summary: "install the agent instruction surfaces + optional staged hook",
    usage: "mjolnir install [--staged-hook] [--dry-run] [--force]",
    examples: ["mjolnir install --dry-run", "mjolnir install --staged-hook"],
  },
  {
    verb: "mcp",
    summary:
      "run as a read-only MCP server over stdio (scan / explain / ci verify)",
    usage: "mjolnir mcp",
    examples: ["mjolnir mcp"],
  },
  {
    verb: "policy",
    summary: "initialize, validate, or check team quality policy gates",
    usage: "mjolnir policy <init|validate|check> [path] [--policy <file>]",
    examples: [
      "mjolnir policy init .",
      "mjolnir policy check . --policy mjolnir.policy.json",
    ],
  },
  {
    verb: "analyze",
    summary: "run bounded cross-file analysis with explicit findings",
    usage: "mjolnir analyze [path] --cross-file",
    examples: ["mjolnir analyze . --cross-file"],
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
  // The v6 collapse's REPLACE arm (plan §3). These three were whole verbs
  // whose body was "scan, then render" — a command surface to remember rather
  // than a capability to use. Listed here so `mjolnir scan --help` is the one
  // place the whole vocabulary lives.
  {
    flag: "--format trust-report",
    summary: "the terminal trust report (the default)",
  },
  {
    flag: "--format pr-comment",
    summary: "a scoped PR comment as Markdown",
  },
  {
    flag: "--format github-summary",
    summary: "a GitHub Actions step summary",
  },
  { flag: "--suppressions", summary: "print the suppression ledger and stop" },
  {
    flag: "--suppression-gate",
    summary:
      "fail on an ungoverned suppression (expired, reasonless, orphaned)",
  },
  { flag: "--policy", summary: "print the scoring policy in force" },
  { flag: "--tone blunt", summary: "blunter, pattern-mocking messages" },
  { flag: "--verbose", summary: "show all findings" },
  { flag: "--scope changed", summary: "only new/changed lines vs merge-base" },
  { flag: "--max-duration <sec>", summary: "analysis time budget" },
  { flag: "--width <cols>", summary: "override terminal width" },
  { flag: "--ascii / --no-ascii", summary: "force glyph mode" },
  {
    flag: "--strict",
    // D-2: a trust tier is a CLAIM about this repository, not a
    // configuration choice, so it does not gate — and saying only "include
    // quarantine-tier rules" invites the opposite reading. A user who reaches
    // for `--strict` expecting more enforcement should learn here that a
    // quarantined detector is advisory BY DESIGN, and that the path to changing
    // that is a `corePromotion` or a re-measure — both reviewable edits to this
    // repository, not a flag.
    //
    // The market agrees: in ESLint, Ruff and golangci-lint what fails a build
    // is the user's SEVERITY configuration. Severity is user-controlled and
    // gates. Trust is tool-controlled and does not.
    summary:
      "include quarantine-tier rules (advisory only — a quarantined detector never gates; see docs/PRODUCT-DECISIONS.md D-2)",
  },
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

/** True when `mjolnir help <verb>` has a detailed page. */
export function hasVerbHelp(verb: string): boolean {
  return findEntry(verb) !== undefined;
}

/**
 * Verbs whose detailed help IS the root help (certification P3):
 * `scan` is the product's one command — the registry has no separate
 * scan page, so `mjolnir scan --help` / `mjolnir help scan` must render
 * the overview (which carries the scan usage lines), not the "no
 * detailed help" stub. `ci` (the bare stem) and `help` are the same
 * shape: real verbs, no dedicated page.
 */
const ROOT_HELP_VERBS: ReadonlySet<string> = new Set(["scan", "ci", "help"]);

/** One per-verb help page: summary, usage, examples, next step. */
export function renderVerbHelp(
  verb: string,
  options: { width?: number } = {},
): string {
  if (!hasVerbHelp(verb) && ROOT_HELP_VERBS.has(verb)) {
    return renderRootHelp(1, options);
  }
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
/**
 * The root help's groups, by what a reader is ASKING rather than by where the
 * code lives.
 *
 * It used to list twenty-nine verbs across five sections, and the renderer
 * silently skipped the twenty that no longer existed — so the list read as a
 * graveyard and a maintainer could not tell which entries were live. A group
 * whose verbs are all retired renders as a heading over nothing, which is worse
 * than no heading.
 *
 * So the list is now the fourteen entries the catalogue actually has, and the
 * renderer omits an empty group rather than printing one. Four of the groups
 * the old list had are gone entirely (Forensics, Mutation evidence, and the
 * emptied Scan and the CI & PRs bulk), and the capability registry moved to
 * Maintenance beside `doctor` and `contract-verify`, because all three answer
 * the same question: what does this tool actually know.
 */
const GROUPS: Array<{ title: string; verbs: string[] }> = [
  {
    title: "CI & PRs",
    verbs: ["ci install", "policy"],
  },
  {
    title: "Maintenance",
    verbs: [
      "fix",
      "stats",
      "doctor",
      "explain --list capability",
      "contract-verify",
      "evidence-graph",
      "suppression-gate",
    ],
  },
  {
    title: "Meta",
    verbs: ["explain", "handover", "handoff", "install", "mcp"],
  },
  {
    title: "Deep analysis",
    verbs: ["analyze"],
  },
];

const SCAN_SUMMARY_LINES: string[] = [
  "mjolnir [path]                 full-repo scan + WORTHINESS score",
];

export interface RootHelpOptions {
  width?: number;
}

const DEFAULT_HELP_WIDTH = 88;

/**
 * Normalizes the terminal width for help rendering. When no width is
 * supplied, falls back to the default help width (88). Clamps to a
 * readable minimum so narrow terminals do not produce unusably short
 * columns.
 */
function normalizeHelpWidth(width: number | undefined): number {
  if (width === undefined || !Number.isFinite(width)) return DEFAULT_HELP_WIDTH;
  return Math.max(48, Math.floor(width));
}

function wrapWords(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) {
      current = word;
      continue;
    }
    if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function pushWrappedIndented(
  lines: string[],
  text: string,
  indent: string,
  width: number,
): void {
  for (const line of wrapWords(text, Math.max(16, width - indent.length))) {
    lines.push(`${indent}${line}`);
  }
}

/**
 * Renders a label-summary row, wrapping the summary across continuation
 * lines when the terminal is narrower than the label + summary.
 */
function pushAlignedHelpRow(
  lines: string[],
  label: string,
  summary: string,
  options: {
    width: number;
    labelWidth: number;
    indent?: number;
  },
): void {
  const indent = " ".repeat(options.indent ?? 2);
  const gap = "  ";
  const summaryIndent = `${indent}${" ".repeat(options.labelWidth)}${gap}`;
  const summaryWidth = Math.max(16, options.width - summaryIndent.length);

  if (label.length <= options.labelWidth) {
    const summaryLines = wrapWords(summary, summaryWidth);
    lines.push(
      `${indent}${label.padEnd(options.labelWidth)}${gap}${summaryLines[0] ?? ""}`,
    );
    for (const line of summaryLines.slice(1)) {
      lines.push(`${summaryIndent}${line}`);
    }
    return;
  }

  pushWrappedIndented(lines, label, indent, options.width);
  pushWrappedIndented(lines, summary, `${indent}  `, options.width);
}

/**
 * The redesigned root help (plan M2): grouped sections, one-line
 * descriptions, copy-pasteable examples, the frozen exit-code table and
 * the docs link. Content is identical whether colored or piped — the
 * caller decides (runHelpCommand passes a resolved palette; printUsage
 * stays plain).
 */
export function renderRootHelp(
  schemaVersion = 1,
  options: RootHelpOptions = {},
): string {
  const width = normalizeHelpWidth(options.width);
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
    "  mjolnir explain --list --unmeasured     the rules running on assumption, not measurement",
  );
  lines.push("");
  lines.push("Options:");
  for (const f of HELP_FLAGS) {
    pushAlignedHelpRow(lines, f.flag, f.summary, {
      width,
      labelWidth: 22,
    });
  }
  pushAlignedHelpRow(
    lines,
    "-v, --version",
    "print the installed version and exit",
    { width, labelWidth: 22 },
  );
  pushAlignedHelpRow(lines, "-h, --help", "show this help", {
    width,
    labelWidth: 22,
  });
  lines.push("");
  for (const g of GROUPS) {
    // A group whose last verb was retired is a heading over nothing. The
    // collapse emptied two of them, and a table of contents that promises a
    // section it does not have is the same class of claim as a command that
    // does not exist.
    const rows = g.verbs.filter((verb) => byVerb.get(verb) !== undefined);
    if (rows.length === 0) continue;
    lines.push(`Subcommands — ${g.title}:`);
    for (const verb of rows) {
      const e = byVerb.get(verb);
      if (!e) continue;
      pushAlignedHelpRow(lines, e.usage.replace(/^mjolnir /, ""), e.summary, {
        width,
        labelWidth: 46,
      });
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
  lines.push("  $ explain --evidence test-results  where the flakes hide");
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
