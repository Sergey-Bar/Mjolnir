/**
 * QA-CI-005 — Report consumed but never generated.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * A step uploads/consumes a report artifact (coverage, test results)
 * that no previous step produces — the gate reads an empty or stale file
 * and passes vacuously. Product-MVP §35: "Required report not produced".
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

interface StepNode {
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
}

interface JobNode {
  steps?: StepNode[];
}

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}

/**
 * Producer vocabulary for coverage reports, one regex over run text.
 *
 * detectorRevision 2 (M2, 2026-09-04): the rev-1 regex knew only
 * `vitest|jest|nyc --coverage`. Adjudication against the real corpus
 * (docs/FP-AUDIT.md rows) proved four blindness classes, each a real
 * producer the regex could not see:
 * 1. Java/JaCoCo — `mvn verify` with the jacoco-maven-plugin, Gradle
 *    `jacocoTestReport`
 * 2. Python — `pytest --cov` (pytest-cov), `coverage run/combine/json/xml`
 *    (coverage.py), `COVERAGE_FILE` env wiring
 * 3. Go / .NET / Rust — `go test -coverprofile`, `dotnet test --collect`,
 *    `cargo llvm-cov` / `cargo tarpaulin`
 * 4. Script-name coverage — `npm run test:coverage` and friends, where the
 *    coverage flag lives inside package.json, invisible from the workflow
 *
 * Known residual limitation (documented, not fixable single-file): a
 * producer in a DIFFERENT workflow (reusable workflows, artifact producers
 * from `workflow_run` jobs) or inside tox.ini / vitest.config is invisible;
 * cross-workflow consumers remain flaggable — measured rates carry those
 * verdicts (streamlit ai-test-coverage.yml class).
 */
/**
 * Producer vocabulary for coverage reports, tested one literal at a time
 * over run/`with` text.
 *
 * detectorRevision 2 (M2, 2026-09-04): the rev-1 regex knew only
 * `vitest|jest|nyc --coverage`. Adjudication against the real corpus
 * (docs/FP-AUDIT.md rows) proved four blindness classes, each a real
 * producer the regex could not see:
 * 1. Java/JaCoCo — `mvn verify` with the jacoco-maven-plugin, Gradle
 *    `jacocoTestReport`
 * 2. Python — `pytest --cov` (pytest-cov), `coverage run/combine/json/xml`
 *    (coverage.py), `COVERAGE_FILE` env wiring
 * 3. Go / .NET / Rust — `go test -coverprofile`, `dotnet test --collect`,
 *    `cargo llvm-cov` / `cargo tarpaulin`
 * 4. Script-name coverage — `npm run test:coverage` and friends, where the
 *    coverage flag lives inside package.json, invisible from the workflow
 *
 * Known residual limitation (documented, not fixable single-file): a
 * producer in a DIFFERENT workflow (reusable workflows, artifact producers
 * from `workflow_run` jobs) or inside tox.ini / vitest.config is invisible;
 * cross-workflow consumers remain flaggable — measured rates carry those
 * verdicts (streamlit ai-test-coverage.yml class).
 */
const COVERAGE_PRODUCERS: RegExp[] = [
  // rev-1 JS vocabulary, kept: flag-style coverage on the runners that
  // pass it on the CLI.
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern; [^\n]* is linear and non-exchanging — ReDoS authoritatively gated by regexp/no-super-linear-backtracking (error) + tests/redos-audit.spec.ts
  /\b(?:npx\s+)?(?:vitest|jest|nyc)\b[^\n]*--coverage\b/i,
  /--coverage\b/i,
  // script-name coverage: test:coverage / coverage:report etc. — the
  // script name itself declares the production of a coverage report.
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern; no nested quantifiers over overlapping classes
  /\b(?:npm|yarn|pnpm|bun)\s+(?:run\s+)?[\w:@/.-]*coverage[\w:@/.-]*/i,
  // Java: Maven verify/test with jacoco (pom-side plugin), Gradle
  // jacocoTestReport / jacocoRootReport — the task name alone is an
  // unambiguous producer, including when invoked via the Gradle build
  // action's `with.arguments` (adjudicated: junit5 _build.yml).
  // eslint-disable-next-line regexp/no-contradiction-with-assertion -- [^\n]* stays on one line; the \b after it is satisfied by the required literal
  /\bmvn[wd]?\b[^\n]*\b(?:jacoco|verify)\b/i,
  // eslint-disable-next-line regexp/no-contradiction-with-assertion, regexp/no-useless-character-class -- same one-line bound; [.] disambiguates the slash from the literal delimiter
  /\b(?:[.]\/)?gradlew?\b[^\n]*\bjacoco\w*\b/i,
  /\bjacoco\w*Report\b/i,
  // Python: pytest-cov and coverage.py (run/combine/json/xml/report).
  /\bpytest\b[^\n]*--cov\b/i,
  /\bcoverage\s+(?:run|combine|json|xml|report)\b/i,
  /\bCOVERAGE_FILE\b/i,
  /\bpytest-cov\b/i,
  // Go / .NET / Rust.
  /\bgo\s+test\b[^\n]*-cover(?:profile|mode|age)\b/i,
  /\bdotnet\s+test\b[^\n]*(?:--collect|--coverage|collect coverage)/i,
  /\bcargo\s+(?:llvm-cov|tarpaulin)\b/i,
  // Explicit report-generation mentions in run text: writing or
  // combining a named coverage/lcov/cobertura report file.
  /\b(?:coverage|lcov|cobertura)[\w./-]*\.(?:info|xml|json|lcov)\b/i,
];

/** Known report-consumption patterns and the commands that produce them. */
const CONSUMERS: Array<{
  /** Matches any consumption signal: uses:, with.path, or run text. */
  re: RegExp;
  /** Extra per-step signals checked against step objects. */
  stepRe?: RegExp;
  producers: RegExp[];
  label: string;
}> = [
  {
    // coverage upload: codecov/coveralls actions, or artifact upload of
    // a coverage path (the path lives in `with`, not in run text).
    re: /codecov|coveralls/i,
    stepRe: /upload-artifact/i,
    producers: COVERAGE_PRODUCERS,
    label: "coverage artifact",
  },
  {
    re: /codecov|coveralls/i,
    producers: COVERAGE_PRODUCERS,
    label: "coverage upload",
  },
];

export const reportNeverGenerated = defineRule({
  id: "QA-CI-005",
  category: "QA-CI",
  title: "Report consumed but never generated",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "BLOCKS-RELEASE",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.1.0",

  // Measured (corpus wave 5): tier set from the measured envelope (plan §11.2).
  // detectorRevision 2 (M2, 2026-09-04): producer vocabulary broadened —
  // rev-1 measurement invalidated per plan §07 (stale → re-measured).
  tier: "quarantine",
  detectorRevision: 2,
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc?.jobs) return findings;

    const jobEntries = Object.entries(doc.jobs);
    // Bug-audit M0 #5: coverage artifacts are shared across jobs — the
    // canonical split-job layout (job A runs tests with `--coverage`,
    // job B uploads to codecov) was flagged as "consumes a report that
    // no step generates" because production/consumption were evaluated
    // per JOB. Production is workflow-level; only consumption stays
    // per-job (so the finding still names the offending job).
    // detectorRevision 2: production signals also live in `with` values
    // (gradle-build-action `arguments:` carrying jacocoRootReport —
    // adjudicated FP: junit5 _build.yml) — aggregate string `with` values
    // into the text the producer regex sees. UPLOAD steps are excluded:
    // an upload-artifact `with.path: coverage/…` is consumption evidence,
    // never production (it re-introduced the very FP this rule catches).
    const stepText = (s: StepNode): string =>
      [
        s.run ?? "",
        ...(s.uses?.includes("upload-artifact")
          ? []
          : Object.values(s.with ?? {}).filter(
              (v): v is string => typeof v === "string",
            )),
      ].join("\n");
    const workflowRunText = jobEntries
      .map(([, j]) => (j?.steps ?? []).map(stepText).join("\n"))
      .join("\n");

    for (const [jobName, job] of jobEntries) {
      const steps = job?.steps ?? [];
      const allRunText = steps.map(stepText).join("\n");

      for (const consumer of CONSUMERS) {
        // Consumption signal: run text, uses:, or a coverage-ish `with.path`
        // on an upload step (the path lives in `with`, not in run text).
        const consumes =
          steps.some((s) => {
            // parseWorkflow normalizes every step entry to an object.
            if (s.uses && consumer.re.test(s.uses)) return true;
            if (
              consumer.stepRe &&
              s.uses &&
              consumer.stepRe.test(s.uses) &&
              s.with &&
              typeof s.with["path"] === "string" &&
              /coverage|lcov/i.test(s.with["path"])
            )
              return true;
            return false;
          }) || consumer.re.test(allRunText);
        if (!consumes) continue;
        // detectorRevision 2: a download-artifact step pulling coverage
        // data (coverage-data-* artifacts from the matrix jobs) is itself
        // production evidence — the data came from the same workflow's
        // pipeline (adjudicated FP: pyca/cryptography ci.yml all-green).
        const coverageDataDownload = steps.some(
          (s) =>
            s.uses?.includes("download-artifact") === true &&
            s.with !== undefined &&
            ["pattern", "path", "name"].some(
              (k) =>
                typeof s.with?.[k] === "string" && /coverage/i.test(s.with[k]),
            ),
        );
        const produces =
          consumer.producers.some(
            (p) => p.test(allRunText) || p.test(workflowRunText),
          ) || coverageDataDownload;
        if (!produces) {
          findings.push({
            severity: "error",
            confidence: "high",
            findingType: "deterministic-defect",
            file: ctx.path,
            line: findJobConsumerLine(ctx.text, jobName, consumer.re),
            column: 1,
            message: `Job \`${jobName}\` consumes a ${consumer.label} that no step generates.`,
            why: "The gate reads a report that is never produced — it passes on empty/stale data while appearing to verify something.",
            fix: "Add a step that runs tests with --coverage (or generate the report) before this consumption step.",
            qaImpact: "BLOCKS-RELEASE",
          });
        }
      }
    }
    return findings;
  },
});

/**
 * Line of the consumer signal belonging to THIS job.
 *
 * detectorRevision 2: `findLine` searched the whole file and always
 * returned the FIRST consumer occurrence — every consuming job in a
 * multi-job workflow reported the same line, so distinct findings
 * collapsed into one verdict position. Anchoring at the job's own
 * declaration keeps each job's finding on its own line.
 */
function findJobConsumerLine(
  text: string,
  jobName: string,
  consumerRe: RegExp,
): number {
  // eslint-disable-next-line security/detect-non-literal-regexp -- escapeRe-quoted workflow value — no regex metacharacters survive
  const jobDecl = new RegExp(
    `^\\s{2,6}${jobName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`,
    "m",
  );
  const declMatch = jobDecl.exec(text);
  const from = declMatch ? declMatch.index : 0;
  // `g` is required for lastIndex to have any effect on exec().
  // eslint-disable-next-line security/detect-non-literal-regexp -- consumerRe.source is a compile-time-constant literal from CONSUMERS — not scan input
  const re = new RegExp(consumerRe.source, "gi");
  re.lastIndex = from;
  const m = re.exec(text);
  if (!m) {
    // The consumer matched in `uses:`/`with:` aggregation but its text may
    // span lines oddly — fall back to the first occurrence anywhere.
    // eslint-disable-next-line security/detect-non-literal-regexp -- consumerRe.source is a compile-time-constant literal from CONSUMERS — not scan input
    const any = new RegExp(consumerRe.source, "i").exec(text);
    if (!any) return 1;
    return lineOfIndex(text, any.index);
  }
  return lineOfIndex(text, m.index);
}

function lineOfIndex(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}
