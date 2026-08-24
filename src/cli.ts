/**
 * QA Doctor CLI entry point (W1-02).
 * Exit codes (§24.1, frozen): 0 clean · 1 findings ≥ gate · 2 partial ·
 * 10 usage error · 20 internal error.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';

import { compareFindings, SCHEMA_VERSION, type Finding, type ScanResult } from './types.js';
import { discoverWorkspace } from './discovery/workspace.js';
import { detectFrameworks } from './discovery/frameworks.js';
import { isDefaultIgnored, LIMITS } from './discovery/ignores.js';
import { RULES } from './rules/index.js';
import { computeDimensions, computeTotal } from './scorer/scorer.js';
import { renderTerminal } from './reporter/terminal.js';
import { renderSarif } from './reporter/sarif.js';
import { computeChangedScope, filterToChanged } from './scope/changed.js';
import { parseWorkflow } from './discovery/workflow-parser.js';
import { asUniversal } from './engine/rule-runner.js';
import { typescriptAdapter } from './adapters/typescript.js';
import { githubActionsAdapter } from './adapters/github-actions.js';
import { pythonAdapter } from './adapters/python.js';
import { ciInstall, type GateLevel } from './integrations/ci-install.js';

const ADAPTERS = [typescriptAdapter, pythonAdapter, githubActionsAdapter] as const;
const UNIVERSAL_RULES = RULES.map(asUniversal);
import { loadSuppressions, renderSuppressions } from './config/suppressions.js';
import { computeSelectorHealth, renderSelectorHealth } from './playwright/selector-health.js';

interface CliArgs {
  target: string;
  json: boolean;
  verbose: boolean;
  maxDurationMs: number;
  scopeChanged: boolean;
  format: 'terminal' | 'json' | 'sarif';
}

function parseArgs(argv: string[]): CliArgs | null {
  const args: CliArgs = {
    target: '.',
    json: false,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: 'terminal',
  };
  for (let i = 0; i < argv.length; i++) {
    const a: string = argv[i] ?? '';
    if (a === '--json') { args.json = true; args.format = 'json'; }
    else if (a === '--format') {
      const fmt = argv[++i];
      if (fmt === 'sarif') args.format = 'sarif';
      else if (fmt === 'json') { args.format = 'json'; args.json = true; }
      else if (fmt !== 'terminal') return null;
    }
    else if (a === '--verbose') args.verbose = true;
    else if (a === '--scope') {
      const mode = argv[++i];
      if (mode === 'changed') args.scopeChanged = true;
      else return null; // unknown scope = usage error
    } else if (a === '--max-duration') {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) return null;
      args.maxDurationMs = v * 1000;
    } else if (a === '--help' || a === '-h') {
      return null;
    } else if (!a.startsWith('-')) {
      args.target = a;
    } else {
      return null; // unknown flag = usage error (exit 10)
    }
  }
  return args;
}

const TEST_FILE_RE = /(?:\.(?:test|spec)\.(?:js|jsx|ts|tsx|mjs|cjs))$/;

function walk(dir: string, root: string, out: string[], deadline: number): void {
  if (Date.now() > deadline || out.length > 10_000) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // unreadable dir — skip, counted later
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = relative(root, full).replaceAll('\\', '/');
    if (isDefaultIgnored(rel)) continue;
    if (entry.isDirectory()) {
      if (rel.split('/').length <= LIMITS.maxDepth) walk(full, root, out, deadline);
    } else if (entry.isFile() && TEST_FILE_RE.test(entry.name)) {
      try {
        if (statSync(full).size <= LIMITS.maxFileBytes) out.push(full);
      } catch {
        /* skip unreadable */
      }
    }
  }
}

export function runScan(args: CliArgs): ScanResult {
  const started = Date.now();
  const deadline = started + args.maxDurationMs;
  // package.json workspace OR non-JS repo (Python etc.) — fall back to the
  // target dir itself so language adapters can still discover their files.
  const workspace = discoverWorkspace(args.target) ?? {
    root: resolve(args.target),
    name: resolve(args.target).split(/[\\/]/).pop() ?? 'repo',
    packageJson: {},
    workspaceGlobs: [],
  };
  const findings: Finding[] = [];
  let skippedFiles = 0;
  let testFileCount = 0;

  if (workspace) {
    // R1: dispatch through language adapters. Rules stay unchanged; the
    // adapters own discovery, parsing, and rule application.
    const ctx = {
      workspace,
      testFiles: [] as string[],
      deadline,
      onSkippedFile: () => skippedFiles++,
    };

    for (const adapter of ADAPTERS) {
      adapter.discoverTestFiles(ctx);
    }

    for (const path of ctx.testFiles) {
      const isWorkflow = githubActionsAdapter.isTestFile(path);
      const isPython = pythonAdapter.isTestFile(path);
      if (!isWorkflow) testFileCount++;
      let text: string;
      try {
        text = readFileSync(path, 'utf8');
      } catch {
        skippedFiles++;
        continue;
      }
      const relPath = relative(workspace.root, path).replaceAll('\\', '/');
      const adapter = isWorkflow ? githubActionsAdapter : isPython ? pythonAdapter : typescriptAdapter;
      try {
        adapter.runRules(UNIVERSAL_RULES, { path: relPath, text }, (f, ruleId, category) => {
          findings.push({ ...f, ruleId, category } as Finding);
        });
      } catch (err) {
        // WorkflowParseSkipped and friends — counted, never fatal.
        skippedFiles++;
      }
    }
  }

  // Changed-scope filtering (Sprint-Plan W6): report only findings on
  // new/changed lines vs the merge base. Degraded git data → full files.
  let scopeInfo: { scope: 'all' | 'changed'; degraded?: string | undefined } = { scope: 'all' };
  if (args.scopeChanged && workspace) {
    const diff = computeChangedScope(workspace.root);
    const filtered = filterToChanged(findings, diff);
    findings.length = 0;
    findings.push(...filtered);
    scopeInfo = diff.degraded
      ? { scope: 'changed', degraded: diff.reason }
      : { scope: 'changed' };
  }

  // Framework detection (0.2): wire the previously-dead detector into the
  // pipeline so output and rules can be framework-aware.
  const frameworks = workspace ? detectFrameworks(workspace) : { frameworks: [], unknown: true };

  findings.sort(compareFindings);
  const dimensions = computeDimensions(findings);
  const total = computeTotal(dimensions, findings);
  const elapsed = Date.now() - started;

  // R2 empty-state: score is null when no test files exist at all.
  // A "100/100" on a repo with zero tests would be a false proof.
  const hasTests = testFileCount > 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    partial: Date.now() > deadline || skippedFiles > 0,
    score: hasTests ? total : null,
    ...(hasTests ? {} : { reason: 'no-tests-found' as const }),
    frameworks: frameworks.frameworks,
    frameworkDetectionUnknown: frameworks.unknown,
    ...(args.scopeChanged ? { scope: scopeInfo.scope, ...(scopeInfo.degraded ? { scopeDegraded: scopeInfo.degraded } : {}) } : {}),
    dimensions,
    findings: args.verbose ? findings : findings.slice(0, 50),
    analysisStatus: {
      discovery: Date.now() > deadline ? 'partial' : 'complete',
      rules: 'complete',
      skippedFiles,
      durationMs: elapsed,
    },
  };
}

function existsNoThrow(p: string): boolean {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

function main(): number {
  const argv = process.argv.slice(2);

  // Subcommands (§69): ci install · suppressions
  if (argv[0] === 'ci' && argv[1] === 'install') {
    const gateArg = argv.includes('--gate') ? argv[argv.indexOf('--gate') + 1] : undefined;
    if (gateArg && !['advisory', 'error', 'warning'].includes(gateArg)) {
      console.error('Unknown gate level. Use: advisory | error | warning');
      return 10;
    }
    const { written, existed } = ciInstall(resolve('.'), (gateArg as GateLevel) ?? 'advisory');
    console.log(`${existed ? 'Updated' : 'Created'} ${written}`);
    console.log('Default mode: advisory — findings reported, never blocking.');
    console.log('Change with: qa-doctor ci install --gate error|warning|advisory');
    return 0;
  }

  if (argv[0] === 'suppressions') {
    console.log(renderSuppressions(loadSuppressions(resolve('.'))));
    return 0;
  }

  // doctor:playwright — PW-only scan + Selector Health (R3 headline).
  if (argv[0] === 'doctor:playwright') {
    const target = resolve(argv[1] && !argv[1].startsWith('-') ? argv[1] : '.');
    const result = runScan({ ...parseArgs([target])!, target });
    const pwFindings = result.findings.filter((f) => f.category === 'QA-PW');
    console.log(renderTerminal({ ...result, findings: pwFindings }, { isTTY: process.stdout.isTTY ?? false }));

    // Selector Health per spec.
    const specs = computeSelectorHealth(target);
    console.log(renderSelectorHealth(specs));
    return 0;
  }

  const args = parseArgs(argv);
  if (!args) {
    printUsage();
    return 10;
  }
  try {
    const result = runScan({ ...args, target: resolve(args.target) });
    if (args.format === 'sarif') {
      console.log(renderSarif(result));
    } else if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(renderTerminal(result, { isTTY: process.stdout.isTTY ?? false }));
    }
    // Exit-code × gate semantics (S13): partial scans NEVER block.
    if (result.partial) return 2;
    return result.findings.some((f) => f.severity === 'error') ? 1 : 0;
  } catch (err) {
    console.error('qa-doctor internal error:', err instanceof Error ? err.message : err);
    return 20;
  }
}

function printUsage(): void {
  console.log(`qa-doctor — quality scanner for test suites and CI pipelines

Usage: qa-doctor [path] [options]

Options:
  --json                machine-readable output (schemaVersion ${SCHEMA_VERSION})
  --format sarif        SARIF 2.1 output for GitHub Code Scanning
  --verbose             show all findings
  --scope changed       only findings on new/changed lines vs merge-base
  --max-duration <sec>  stop analysis after N seconds (partial results flagged)
  -h, --help            show this help

Subcommands:
  ci install [--gate advisory|error|warning]   generate PR workflow
  suppressions                                  list suppressed findings

Exit codes: 0 clean · 1 errors found · 2 partial · 10 usage · 20 crash`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('cli.ts') ||
    process.argv[1]?.replaceAll('\\', '/').endsWith('cli.js')) {
  process.exitCode = main();
}
