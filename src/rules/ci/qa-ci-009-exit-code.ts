/**
 * QA-CI-009 — Test command does not propagate exit code.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * A test step whose run block ends in a construct that discards the test
 * command's exit status — `cmd1; cmd2` sequencing where cmd2 succeeds, or
 * a pipeline without `set -o pipefail` piping tests into another tool
 * (e.g. `npm test | tee log`) — lets the job pass while tests failed.
 * Distinct from QA-CI-002 (explicit `|| true`): here the swallowing is
 * structural, not an explicit override.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

interface StepNode {
  run?: string;
  name?: string;
}

interface JobNode {
  steps?: StepNode[];
}

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}

// `playwright` alone is NOT a test command — `playwright install`,
// `playwright show-report`, `playwright merge-reports` are common setup /
// reporting steps. Require `playwright test` explicitly.
const TEST_CMD =
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
  /\b(?:npm|yarn|pnpm)\s+(?:run\s+)?test\b|\b(?:jest|vitest|pytest|mocha)\b|\bplaywright\s+test\b/;

export const exitCodeNotPropagated = defineRule({
  id: "QA-CI-009",
  category: "QA-CI",
  title: "Test command does not propagate exit code",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "FRAMEWORK",
  detectionNotes: "regex pattern on parsed workflow AST",
  introduced: "0.4.0",
  // detectorRevision 2 (M2, 2026-09-04): quoted-string separators stripped
  // from the `;`-sequence scan (adjudicated FP: yarn berry e2e workflow).
  // detectorRevision 2 measured 2026-09-04: 0% FP at n=10 — declared
  // extended because the core DoD requires n ≥ 20 AND the Wilson CI upper
  // bound within the core bar (plan §23; CI high = 0.28 at n=10).
  detectorRevision: 2,
  tier: "extended",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc?.jobs) return findings;

    for (const [jobName, job] of Object.entries(doc.jobs)) {
      for (const step of job?.steps ?? []) {
        const run = step?.run;
        if (!run || !TEST_CMD.test(run)) continue;

        // pipefail already set → pipelines propagate failures correctly.
        if (/pipefail/.test(run)) continue;

        // Case 1: test command piped into another tool without pipefail.
        // e.g. `npm test | tee out.log` — the pipeline's status is the LAST
        // command's, so tee's success masks the test failure.
        const lines = run.split("\n");
        for (const line of lines) {
          if (!TEST_CMD.test(line)) continue;
          // The guard above guarantees exec() matches here.
          const m = TEST_CMD.exec(line) as RegExpExecArray;
          const afterCmd = line.slice(m.index + m[0].length);
          const piped = /^\s*\|(?!\|)/.exec(afterCmd);
          if (piped && !/\|\|\s|&&\s/.test(afterCmd)) {
            findings.push({
              severity: "error",
              confidence: "high",
              findingType: "deterministic-defect",
              file: ctx.path,
              line: findLine(ctx.text, line.trim()),
              column: 1,
              message: `Job \`${jobName}\` pipes the test command into another tool without \`set -o pipefail\`.`,
              why: "In a shell pipeline only the last command's exit code counts — a failing test run is masked by the downstream tool succeeding.",
              fix: "Add `shell: bash` with `set -o pipefail`, or split into two steps so the test command's exit code is preserved.",
              qaImpact: "FALSE-GREEN",
            });
          }
        }

        // Case 2: `;`-sequenced commands after the test command — the final
        // command's success decides the step. e.g. `npm test; npm run lint`.
        // NOTE: TEST_CMD.source contains top-level alternation — it MUST be
        // wrapped in a group or the tail binds to only one branch.
        // Bug-audit M0 #6: `set -e` / `errexit` fails the step AT the test
        // command, so `;`-sequencing no longer masks the result — the same
        // short-circuit `pipefail` already honored. (Case 1 above is NOT
        // covered by errexit: a pipeline's status is still the last
        // command's without pipefail, so it stays active there.)
        // detectorRevision 2 (M2, 2026-09-04): `;` separators inside quoted
        // strings (a generated JS test file piped through `tee`) are text,
        // not shell separators — adjudicated FP: yarn berry
        // e2e-vitest-workflow.yml. Quoted segments are stripped before the
        // sequence scan; `TEST_CMD` is matched on the stripped text too, so
        // a test command mentioned only inside a string no longer anchors
        // the finding.
        if (/set\s+(?:-[A-Za-df-z]*e[A-Za-z]*|-o\s+errexit)\b/.test(run))
          continue;
        const strippedRun = stripQuoted(run);
        // eslint-disable-next-line security/detect-non-literal-regexp -- TEST_CMD.source is a compile-time literal interpolation — not scan input
        const seqRe = new RegExp(
          `(?:${TEST_CMD.source})[^\\n;]*;\\s*[^\\n]+`,
          "g",
        );
        let sm: RegExpExecArray | null;
        while ((sm = seqRe.exec(strippedRun)) !== null) {
          // Skip when the sequence is guarded by && or || (status matters).
          const seg = sm[0];
          if (/&&|\|\|/.test(seg)) continue;
          // Skip when the text after `;` is a shell block keyword —
          // `until npm test; do` is loop syntax, not a swallowed sequence
          // (fixture-verified: positive corpus until-loop).
          if (
            /^\s*(?:do|then|else|fi|done|elif|esac)\b|^\s*\}/.test(
              seg.slice(seg.indexOf(";") + 1),
            )
          )
            continue;
          // Skip `setup; <test>` where the TEST command runs LAST — its exit
          // code IS the step's. e.g. `playwright install; playwright test`.
          const afterSemi = seg.slice(seg.indexOf(";") + 1);
          if (TEST_CMD.test(afterSemi)) continue;
          findings.push({
            severity: "error",
            confidence: "medium",
            findingType: "deterministic-defect",
            file: ctx.path,
            line: findLine(ctx.text, seg.slice(0, seg.indexOf(";")).trim()),
            column: 1,
            message: `Job \`${jobName}\` sequences commands with \`; \` after the test command — the test result does not fail the step.`,
            why: "With `;` sequencing the step's exit status comes from the last command only, so failed tests still yield a green checkmark.",
            fix: "Chain with `&&` instead of `;` so a test failure fails the step.",
            qaImpact: "FALSE-GREEN",
          });
        }
      }
    }
    return findings;
  },
});

/**
 * Replaces the CONTENT of double- and single-quoted segments with spaces
 * (length-preserving) so shell separators inside strings — a JS test file
 * echoed through `tee`, e.g. `echo "it('x'); expect(y)" | tee t.js` — can
 * never anchor a `;`-sequence finding. Quotes are shell-sensitive; this is
 * deliberately conservative: only quote-delimited, same-line segments are
 * stripped.
 */
function stripQuoted(text: string): string {
  return text.replace(/"[^"\n]*"|'[^'\n]*'/g, (m) => " ".repeat(m.length));
}

function findLine(text: string, needle: string): number {
  const idx = text.indexOf(needle);
  if (idx === -1) return 1;
  let line = 1;
  for (let i = 0; i < idx; i++) if (text[i] === "\n") line++;
  return line;
}
