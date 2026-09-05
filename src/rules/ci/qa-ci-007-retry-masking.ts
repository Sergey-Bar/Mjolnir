/**
 * QA-CI-007 — Retry masking test failures.
 * Severity: warning · Confidence: high · deterministic-defect
 *
 * workflow `retries` on a test job, or retry actions wrapping test steps,
 * can hide intermittent failures — the job passes even though tests failed
 * on the first run.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

interface StepNode {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}

interface JobNode {
  steps?: StepNode[];
  strategy?: { "max-parallel"?: number };
}

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}

export const retryMasking = defineRule({
  id: "QA-CI-007",
  category: "QA-CI",
  title: "Retry masks test failures",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.1.0",

  // Measured (corpus wave 5): tier set from the measured envelope (plan §11.2).
  // detectorRevision 2 (M2, 2026-09-04): inline-loop branch requires a real
  // retry construct around a verification gate (curl-probe FPs excluded).
  // Rev-1 measurement invalidated per §07 (stale → re-measured).
  tier: "extended",
  detectorRevision: 2,
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc?.jobs) return findings;

    for (const [jobName, job] of Object.entries(doc.jobs)) {
      for (const step of job?.steps ?? []) {
        // nick-fields/retry or similar retry wrappers around test commands.
        if (step?.uses && /retry/i.test(step.uses)) {
          const withCfg = step.with ?? {};
          // FW-BUG-01: `with` values are unknown-typed YAML — only a real
          // string command carries the test-run signal; a nested mapping
          // coerced via String() produced "[object Object]" noise.
          const command =
            typeof withCfg["command"] === "string" ? withCfg["command"] : "";
          const runsTests =
            /\b(?:npm|yarn|pnpm)\s+(?:test|run\s+test)|\b(?:jest|vitest|pytest|playwright)\b/.test(
              command,
            );
          // Fire only when the retry wrapper actually runs tests; a retry
          // around a non-test command (curl, deploy…) is legitimate.
          if (!runsTests) continue;
          findings.push({
            severity: "warning",
            confidence: "high",
            findingType: "deterministic-defect",
            qaImpact: "FLAKY-RISK",
            file: ctx.path,
            // detectorRevision 2: anchor the line at THIS step's uses: text
            // (file-wide search collapsed every matching step onto the
            // first retry-action occurrence in the file).
            line: findStepUsesLine(ctx.text, step.uses, command),
            column: 1,
            message: `Job \`${jobName}\` wraps a test command in an automatic retry action.`,
            why: "Retrying tests until they pass hides flaky and intermittent failures — the green check no longer means the suite passed.",
            fix: "Remove the retry wrapper; investigate the underlying flakiness instead.",
          });
        }
        // Inline shell retry loops around test commands.
        // detectorRevision 2 (M2, 2026-09-04): rev-1 matched /test/i
        // anywhere in the run block — "latest", "contest" — and counted
        // curl/wget network retries (`curl --retry`) as test-retry loops
        // (adjudicated FPs: github-docs local-dev.yml, Humanizr docs.yml).
        // The loop must be a real shell retry construct (a bare word like
        // "attempt"/"try" also matched JS try-blocks and step names —
        // adjudicated FPs: appsmith rerun-failures, grafana release-build)
        // AND wrap a TEST runner (build/lint targets are not flake-masking:
        // adjudicated FPs: grafana make build-docker, vault make ci-get-date
        // inside a while-read file iteration).
        if (step?.run) {
          // Counter-style retry loops only: $(seq …) / {1..N} / digit lists,
          // while-true, max_attempts, until-succeed. A bare `for X in Y` also
          // matched glob picks (grafana dist/*.tar.gz), file iteration
          // (vault while-read), and even comment text ("Check for X in …") —
          // adjudicated FPs, 2026-09-04.
          const LOOP_RE =
            // eslint-disable-next-line security/detect-unsafe-regex, regexp/no-contradiction-with-assertion -- bounded literal one-line patterns; ReDoS authoritatively gated by regexp/no-super-linear-backtracking (error) + tests/redos-audit.spec.ts
            /\bfor\b[^\n]*\$\(\s*(?:seq|range)\b|\bfor\b[^\n]*\{\d+\.\.\d+\}|\bfor\s+\w+\s+in\s+\d+(?:[,\t ]+\d+)*[;\s]*do\b|\bwhile\b[^\n]*\btrue\b|\bwhile\s+:;|\bmax_attempts\b|\buntil\b[^\n]*\bsucceed\b/i;
          const TEST_GATE_RE =
            // eslint-disable-next-line security/detect-unsafe-regex, regexp/no-useless-character-class -- bounded literal one-line patterns; ReDoS authoritatively gated by regexp/no-super-linear-backtracking (error) + tests/redos-audit.spec.ts
            /\b(?:npm|yarn|pnpm|bun)\s+(?:run\s+)?(?:test|t)\b|\bnpx\s+(?:vitest|jest|mocha|ava|playwright\s+test)\b|\b(?:vitest|jest|mocha|ava|tap)\b|\bplaywright\s+test\b|\b(?:pytest|tox|nox)\b|\bpython\s+-m\s+(?:pytest|unittest)\b|\bmvn[wd]?\b[^\n]+\b(?:test|verify)\b|\b(?:[.]\/)?gradlew?\b[^\n]+\btest\b|\bdotnet\s+test\b|\bgo\s+test\b|\bcargo\s+test\b|\bmake\s+[\w./\\-]*test\b/i;
          const isCurlProbe =
            /\b(?:curl|wget)\b/.test(step.run) && !TEST_GATE_RE.test(step.run);
          if (
            LOOP_RE.test(step.run) &&
            TEST_GATE_RE.test(step.run) &&
            !isCurlProbe
          ) {
            findings.push({
              severity: "warning",
              confidence: "medium",
              findingType: "heuristic-risk",
              qaImpact: "FLAKY-RISK",
              file: ctx.path,
              // detectorRevision 2: anchor the line at THIS step's run text
              // (file-wide search collapsed every matching step onto the
              // first loop occurrence — distinct findings shared one line).
              line: findStepLoopLine(ctx.text, step.run, LOOP_RE),
              column: 1,
              message: `Job \`${jobName}\` contains a shell retry loop around tests.`,
              why: "Retry-until-pass loops mask intermittent failures instead of surfacing them.",
              fix: "Run tests once; track and fix flakes explicitly.",
            });
          }
        }
      }
    }
    return findings;
  },
});

/**
 * Line of the loop construct belonging to THIS step.
 *
 * detectorRevision 2: anchors at the step's first run line, then finds the
 * loop construct at or after it — a file-wide LOOP_RE search reported every
 * matching step on the first loop occurrence in the file.
 */
function findStepLoopLine(text: string, run: string, loopRe: RegExp): number {
  const firstLine = run
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  const anchorAt = firstLine ? text.indexOf(firstLine) : -1;
  // `g` is required for lastIndex to have any effect on exec().
  // eslint-disable-next-line security/detect-non-literal-regexp -- loopRe.source is a compile-time-constant literal (LOOP_RE) — not scan input
  const re = new RegExp(loopRe.source, "gi");
  if (anchorAt !== -1) re.lastIndex = anchorAt;
  const m = re.exec(text);
  if (!m) return 1;
  let line = 1;
  for (let i = 0; i < m.index; i++) if (text[i] === "\n") line++;
  return line;
}

/**
 * Line of the retry-action `uses:` belonging to THIS step.
 *
 * detectorRevision 2: anchors at the step's own `with.command` text and
 * takes the nearest `uses:` occurrence at or before it — a file-wide search
 * reported every wrapping step on the first occurrence when several jobs
 * use the same retry action at the same version.
 */
function findStepUsesLine(text: string, uses: string, command: string): number {
  const needle = uses.trim();
  const firstCmdLine = command.trim().split("\n")[0]?.trim();
  const cmdAnchor = firstCmdLine ? text.indexOf(firstCmdLine) : -1;
  let at = -1;
  if (cmdAnchor !== -1) {
    // Nearest occurrence of the uses string at or before the command line.
    const windowStart = Math.max(0, cmdAnchor - 2000);
    const window = text.slice(windowStart, cmdAnchor + 1);
    const rel = window.lastIndexOf(needle);
    if (rel !== -1) at = windowStart + rel;
  }
  if (at === -1) at = text.indexOf(needle);
  if (at === -1) return 1;
  let line = 1;
  for (let i = 0; i < at; i++) if (text[i] === "\n") line++;
  return line;
}
