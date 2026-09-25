/**
 * CI integration (Sprint-Plan W7): generates .github/workflows/mjolnir.yml
 * from internal templates ONLY — no user-input interpolation (R3 supply-chain).
 * Default gate: error (block releases on error-severity findings
 * — enforced by the caller; this function requires gate explicitly).
 *
 * Bug-audit hardening (H2): the previous template shipped the same
 * `github.rest.checks` no-op this repo's own audit removed from mjolnir.yml,
 * failed the job before the annotate/summary steps could run whenever the
 * scan step exited non-zero, recommended floating `mjolnir-qa@latest`, and
 * `ciInstall` silently overwrote hand-customized workflows. The template now
 * mirrors the dogfooded `.github/workflows/mjolnir.yml` (pinned action SHAs,
 * `if: always()` on reporting steps, a real gate step that reads
 * `mjolnir.json`, and `ciInstall` refuses to replace a customized workflow
 * without an explicit `--force`. A partial scan FAILS the generated gate: an
 * analysis that did not finish has not proven anything about the surface it
 * did not reach.
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFileAtomic } from "../lib/fs-atomic.js";
import { dirname, join, resolve } from "node:path";

import { CLI_VERSION } from "../cli.js";

export type GateLevel = "advisory" | "error" | "warning";
export type EnforcingGate = Exclude<GateLevel, "advisory">;

/**
 * The gate-check script embedded in generated workflows (and executed
 * directly by tests against fixture JSONs). Semantics, kept in sync with
 * the tool's own exit-code contract:
 *  - missing/unreadable `mjolnir.json` → fail (the scan step crashed; a
 *    silent pass here would turn a broken pipeline into a green one);
 *  - `partial: true` → never block (truncated results can neither prove
 *    nor disprove the gate — the "PARTIAL" banner in the summary is the
 *    honest signal);
 *  - `error` gate → block on any error-severity finding;
 *  - `warning` gate → block on warnings and errors.
 */
export function gateScript(gate: EnforcingGate): string {
  const condition =
    gate === "error" ? "errors > 0" : "errors > 0 || warnings > 0";
  return [
    'const fs = require("fs");',
    "let r;",
    "try {",
    '  r = JSON.parse(fs.readFileSync("mjolnir.json", "utf8"));',
    "} catch (e) {",
    '  process.stderr.write("mjolnir.json is missing or unreadable - the scan step crashed before the gate could run. Failing instead of passing silently.\\n");',
    "  process.exit(1);",
    "}",
    "if (r.partial === true) {",
    '  process.stderr.write("Scan was PARTIAL - some files were not analyzed, so the surface is unverified. Failing: an incomplete scan is not a pass.\\n");',
    "  process.exit(1);",
    "}",
    "const findings = Array.isArray(r.findings) ? r.findings : [];",
    'const errors = findings.filter(function (f) { return f && f.severity === "error"; }).length;',
    'const warnings = findings.filter(function (f) { return f && f.severity === "warning"; }).length;',
    'process.stdout.write("Mjolnir gate: " + errors + " error(s), " + warnings + " warning(s).\\n");',
    `if (${condition}) { process.exit(1); }`,
    "process.exit(0);",
  ].join("\n");
}

/**
 * The npm version a generated workflow should install.
 *
 * A generated CI workflow that names a version npm does not have is not a
 * configuration file, it is a 404 on the first run. While the working
 * candidate is a release candidate, `CLI_VERSION` is not on the registry, so
 * the npx template used to emit a tarball URL that could not resolve.
 *
 * Resolution order:
 *  1. `publishedStable` from the nearest package.json — the record of the last
 *     published release, present in current builds.
 *  2. That package's own `version` — correct for an installed published
 *     package (3.0.0 shipped before `publishedStable` existed).
 *  3. `CLI_VERSION` — a development build, where naming the working version
 *     is the honest description of what is being generated.
 */
export function publishedVersionForInstall(
  startDir: string = import.meta.dirname,
): string {
  let dir = resolve(startDir);
  for (let depth = 0; depth < 12; depth++) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      try {
        const parsed = JSON.parse(readFileSync(candidate, "utf8")) as {
          name?: string;
          version?: string;
          publishedStable?: string;
        };
        if (parsed.name === "mjolnir-qa") {
          if (typeof parsed.publishedStable === "string" && parsed.publishedStable) {
            return parsed.publishedStable;
          }
          if (typeof parsed.version === "string" && parsed.version) {
            return parsed.version;
          }
        }
      } catch {
        // An unreadable package.json is not a reason to emit a broken URL.
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return CLI_VERSION;
}

/**
 * Template v2 (Terminal + CI UX Overhaul plan, M4): the summary step
 * calls `mjolnir summary mjolnir.json` — annotations + step summary via
 * ONE emitter — instead of the v1 inline SUMMARY_SCRIPT. The gate
 * script is unchanged (reads `partial`, `findings[].severity`).
 */

/** Renders findings into `$GITHUB_STEP_SUMMARY`; tolerates a missing scan result.
 * v1 inline script, retained ONLY for overwrite-refusal recognition of
 * workflows generated by older versions (they are treated as ours, so
 * a frictionless `ci install` upgrade stays possible). Exported for the
 * recognition test that reconstructs the embedded form. */
export const SUMMARY_SCRIPT_V1 = [
  'const fs = require("fs");',
  "let r = {};",
  'try { r = JSON.parse(fs.readFileSync("mjolnir.json", "utf8")); } catch (e) {}',
  "const findings = Array.isArray(r.findings) ? r.findings : [];",
  "const lines = findings.map(function (f) {",
  '  return "- **" + f.ruleId + "** (" + f.severity + ") " + f.file + ":" + f.line + " - " + f.message;',
  "});",
  "const head = r.partial === true",
  '  ? "Mjolnir scan was PARTIAL - some files may not have been analyzed."',
  '  : "Mjolnir scan finished.";',
  'const body = ["## Mjolnir findings", head, ""].concat(lines).join("\\n");',
  "if (process.env.GITHUB_STEP_SUMMARY && lines.length > 0) {",
  '  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, body + "\\n");',
  "}",
  'process.stdout.write(lines.length + " finding(s)\\n");',
].join("\n");

/** True when a workflow was generated by any Mjölnir template (v1 or v2).
 * The v1 needle is matched in its INDENTED form: the v1 template embedded
 * the script via indentBlock(…, 10) inside the `run: |` scalar, so the
 * raw unindented substring never appears in a real v1 file. */
export function isKnownTemplate(content: string): boolean {
  return (
    GATES.some((g) => content === TEMPLATE(g)) ||
    GATES.some((g) => content === ACTION_TEMPLATE(g)) ||
    content.includes(indentBlock(SUMMARY_SCRIPT_V1, 10))
  );
}

/** Indents an embedded script so it sits inside a YAML `run: |` block scalar. */
export function indentBlock(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((l) => (l.length > 0 ? pad + l : l))
    .join("\n");
}

/** The generated workflow for one gate level. Exported for template tests. */
/**
 * The npm version both generated templates install. Resolved once at module
 * load from the running package's own manifest, so a generated workflow can
 * never name a version the registry does not have.
 */
const INSTALL_VERSION = publishedVersionForInstall();

export const TEMPLATE = (gate: GateLevel): string => `name: Mjölnir

on:
  pull_request:

concurrency:
  group: mjolnir-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      - name: Scan changed code (exit 1/2 is data — the gate step decides)
        continue-on-error: true
        run: npx --yes https://registry.npmjs.org/mjolnir-qa/-/mjolnir-qa-${INSTALL_VERSION}.tgz . --scope changed --json > mjolnir.json
      - name: Annotations + Job Summary
        if: always()
        continue-on-error: true
        run: npx --yes https://registry.npmjs.org/mjolnir-qa/-/mjolnir-qa-${INSTALL_VERSION}.tgz summary mjolnir.json
      - name: Render PR comment
        if: always()
        continue-on-error: true
        run: npx --yes https://registry.npmjs.org/mjolnir-qa/-/mjolnir-qa-${INSTALL_VERSION}.tgz pr-comment --from mjolnir.json > mjolnir-comment.md
      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        if: always()
        with:
          name: mjolnir-report
          path: mjolnir-comment.md
          if-no-files-found: warn
          retention-days: 30
${
  gate === "advisory"
    ? `      - name: Gate (advisory)
        if: always()
        run: echo "Advisory mode — findings reported, never blocking."`
    : `      - name: Gate (${gate})
        if: always()
        run: |
          node -e '
${indentBlock(gateScript(gate), 10)}
          '`
}

  publish:
    needs: scan
    if: always() && needs.scan.result != 'cancelled'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
        with:
          name: mjolnir-report
      - uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
        if: always()
        continue-on-error: true
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('mjolnir-comment.md', 'utf8');
            if (!body.trim()) return;
            const marker = '<!-- mjolnir-report:v2 -->';
            const comments = await github.paginate(
              github.rest.issues.listComments,
              { owner: context.repo.owner, repo: context.repo.repo, issue_number: context.issue.number, per_page: 100 },
            );
            const existing = comments.find((comment) => comment.body?.includes(marker));
            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }
${
  gate === "advisory"
    ? `      - name: Advisory note
        if: always()
        run: echo "Advisory mode — findings are reported, never blocking."`
    : ""
}
`;

/** Every gate variant, used to tell "our template" from "hand-customized". */
const GATES: readonly GateLevel[] = ["advisory", "error", "warning"];

/**
 * The action-ref the action-based template pins (P1: distribution).
 * The current `v3` major is maintained on every stable release by the
 * dedicated Action tag workflow. The generated workflow pins an immutable
 * Action SHA, never @latest.
 */
export const ACTION_REF =
  "Sergey-Bar/Mjolnir@4a588bc62d517bc85fc44c0eae64c6587d3bf70b";

/**
 * The action-based workflow for one gate level (P1.3): the root
 * action.yml does checkout-independent scanning — setup-node, the scan
 * itself (writing mjolnir.json for the reporting steps), and the gate
 * via the action's `fail-on` input. Reporting steps run `if: always()`
 * exactly like the npx template, so a run that found something still
 * produces a report.
 *
 * Three defects this template used to ship, all of which made a check that
 * could never go red:
 *
 *  1. The gate read `steps.mjolnir.outputs.exit`. The action exposes
 *     `exit-code`. The read produced an empty string, neither branch fired,
 *     and the gate exited 0 on findings. This is the same class as the Action
 *     output-id mismatch fixed in `action.yml`; the generated copy had to be
 *     fixed too, or every new user inherited it.
 *  2. Exit 2 (partial) was downgraded to a warning. An analysis that did not
 *     finish is not a pass — see the exit-code contract in docs/VERSIONING.md.
 *  3. `version:` was pinned to the engine's working version, which while the
 *     candidate is a release candidate is not on npm, so the generated
 *     workflow could not install what it asked for. The input is omitted now
 *     and the Action's own default (the published stable) applies.
 */
export const ACTION_TEMPLATE = (gate: GateLevel): string => `name: Mjölnir

on:
  pull_request:

concurrency:
  group: mjolnir-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      - name: Mjölnir verification trust scan
        id: mjolnir
        continue-on-error: true
        uses: ${ACTION_REF}
        with:
          scope: changed
          format: json
          fail-on: ${gate === "advisory" ? "none" : gate}
          pr-comment: "false"
          trust-artifact: "false"
          annotations: "true"
      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        if: always()
        with:
          name: mjolnir-report
          path: mjolnir-comment.md
          if-no-files-found: warn
          retention-days: 30
      - name: Gate (${gate})
        if: always()
        shell: bash
        env:
          MJ_SCAN_EXIT: \${{ steps.mjolnir.outputs.exit-code }}
        run: |
          set -euo pipefail
          case "\${MJ_SCAN_EXIT:-}" in
            0) echo "Mjölnir scan clean at the configured gate." ;;
            1) echo "::error::Mjölnir gate failed: findings at the configured gate."; exit 1 ;;
            2) echo "::error::Mjölnir scan was PARTIAL — the surface was not fully analyzed, so no clean claim is made."; exit 1 ;;
            "") echo "::error::Mjölnir produced no exit code; the action step did not run."; exit 1 ;;
            *) echo "::error::Mjölnir exited \${MJ_SCAN_EXIT} (usage/internal error)."; exit 1 ;;
          esac

  publish:
    needs: scan
    if: always() && needs.scan.result != 'cancelled'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
        with:
          name: mjolnir-report
      - uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
        if: always()
        continue-on-error: true
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('mjolnir-comment.md', 'utf8');
            if (!body.trim()) return;
            const marker = '<!-- mjolnir-report:v2 -->';
            const comments = await github.paginate(
              github.rest.issues.listComments,
              { owner: context.repo.owner, repo: context.repo.repo, issue_number: context.issue.number, per_page: 100 },
            );
            const existing = comments.find((comment) => comment.body?.includes(marker));
            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }
${
  gate === "advisory"
    ? `      - name: Advisory note
        if: always()
        run: echo "Advisory mode — findings are reported, never blocking."`
    : ""
}
`;

export interface CiInstallResult {
  written: string;
  existed: boolean;
  /**
   * True when an existing, hand-customized workflow was left untouched.
   * Re-run with `--force` to replace it.
   */
  refused: boolean;
  /** Human-readable line-level summary of what a forced overwrite would change. */
  diffSummary: string[];
}

/** Multiset line diff — counts only, for the refusal message. */
function summarizeContentDiff(existing: string, incoming: string): string[] {
  const remaining = new Map<string, number>();
  for (const line of existing.split(/\r?\n/)) {
    remaining.set(line, (remaining.get(line) ?? 0) + 1);
  }
  let added = 0;
  for (const line of incoming.split(/\r?\n/)) {
    const count = remaining.get(line) ?? 0;
    if (count > 0) remaining.set(line, count - 1);
    else added += 1;
  }
  let removed = 0;
  for (const count of remaining.values()) removed += count;
  return [
    `  - ${removed} line(s) of your file are not in the template and would be removed`,
    `  - ${added} template line(s) are not in your file and would be added`,
  ];
}

export function ciInstall(
  root: string,
  gate: GateLevel,
  options: { force?: boolean; action?: boolean } = {},
): CiInstallResult {
  const wfDir = join(root, ".github", "workflows");
  const target = join(wfDir, "mjolnir.yml");
  if (!existsSync(wfDir)) mkdirSync(wfDir, { recursive: true });
  const existed = existsSync(target);
  // P1.3: the action-based template is the DEFAULT (the root action.yml
  // is the Marketplace surface); `--no-action` keeps the plain-npx
  // template for repos that cannot use composite actions.
  const template =
    options.action === false ? TEMPLATE(gate) : ACTION_TEMPLATE(gate);
  if (existed) {
    const current = readFileSync(target, "utf8");
    // Content identical to any gate variant = a file Mjölnir itself wrote
    // (re-running or switching gates must stay frictionless). A v1
    // template (inline SUMMARY_SCRIPT) is also ours — the v2 upgrade
    // path. Anything else is hand-customized and is never silently
    // overwritten.
    const matchesAnyTemplate = isKnownTemplate(current);
    if (!matchesAnyTemplate && !(options.force ?? false)) {
      return {
        written: target,
        existed,
        refused: true,
        diffSummary: summarizeContentDiff(current, template),
      };
    }
  }
  // Atomic (audit S9): this writes into the USER's repository. A crash
  // mid-write left a truncated workflow file that still looked like a valid
  // file to a human reading the diff, and broke their CI on the next push.
  writeFileAtomic(target, template);
  return { written: target, existed, refused: false, diffSummary: [] };
}
