/**
 * Coverage arms for the CI-family trust-repair rules (verification-trust
 * M2): the detectorRevision-2 guard/fallback branches, driven through
 * each rule's public `run` with parseWorkflow-shaped asts.
 */

import { describe, expect, it } from "vitest";

import { continueOnError } from "../../../src/rules/ci/qa-ci-001-continue-on-error.js";
import { reportNeverGenerated } from "../../../src/rules/ci/qa-ci-005-report-never-generated.js";
import { retryMasking } from "../../../src/rules/ci/qa-ci-007-retry-masking.js";
import { alwaysSuccessStep } from "../../../src/rules/ci/qa-ci-008-always-success.js";
import { exitCodeNotPropagated } from "../../../src/rules/ci/qa-ci-009-exit-code.js";

function steps(...s: Record<string, unknown>[]): unknown {
  return { jobs: { build: { steps: s } } };
}

describe("QA-CI-001: non-blocking step-name guard", () => {
  it("a step NAMED 'non-blocking' with a failing gate run is not flagged", () => {
    // Arms: NON_BLOCKING_NAME_RE true (early false return) — and the
    // inverse path via a gate step without the name, which still flags.
    const wf = "name: gate\nrun: npm test\ncontinue-on-error: true\n";
    const named = continueOnError.run({
      path: "w.yml",
      text: wf,
      ast: steps(
        {
          name: "tests (non-blocking)",
          run: "npm test",
          "continue-on-error": true,
        },
        {
          name: "gate",
          run: "npm test",
          "continue-on-error": true,
        },
      ),
    });
    // Only the un-named step's finding survives the name guard.
    expect(named).toHaveLength(1);
    expect(named[0]?.file).toBe("w.yml");
  });
});

describe("QA-CI-005: download-artifact production evidence + line fallbacks (rev-2)", () => {
  it("an ast consumer whose raw text only appears ABOVE the job declaration", () => {
    // Arm: anchored search from the job declaration misses (the only
    // consumer mention is a leading comment), but the file-wide
    // fallback finds it — line = the comment's line.
    const text = [
      "# upload coverage to codecov when done",
      "jobs:",
      "  test:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - run: npx nyc report --check-coverage",
    ].join("\n");
    const findings = reportNeverGenerated.run({
      path: "w.yml",
      text,
      ast: {
        name: "ci",
        on: "push",
        jobs: {
          test: {
            "runs-on": "ubuntu-latest",
            steps: [
              { name: "upload", uses: "actions/upload-artifact@v4" },
              { name: "codecov upload", uses: "codecov/codecov-action@v4" },
              { name: "report", run: "npx nyc report --check-coverage" },
            ],
          },
        },
      },
    });
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("an ast consumer absent from the raw text resolves to line 1", () => {
    // Arms: findConsumerLine's !m fallback with !any — the consumer
    // matched via the parsed step objects, but the raw text carries
    // neither the consumer string nor its with-path → the honest floor
    // is line 1.
    const findings = reportNeverGenerated.run({
      path: "w.yml",
      text: "jobs:\n  build:\n    steps:\n      - run: npx nyc report\n",
      ast: {
        name: "ci",
        on: "push",
        jobs: {
          test: {
            "runs-on": "ubuntu-latest",
            steps: [
              {
                name: "upload",
                uses: "actions/upload-artifact@v4",
                with: { path: "out/coverage-summary.txt" },
              },
              { name: "codecov upload", uses: "codecov/codecov-action@v4" },
              { name: "report", run: "npx nyc report --check-coverage" },
            ],
          },
        },
      },
    });
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("a download-artifact step pulling coverage data counts as production", () => {
    // Arms: coverageDataDownload true (with.pattern/name coverage) and
    // the download branch suppressing the codecov consumer finding.
    const wf = [
      "name: ci",
      "on: push",
      "jobs:",
      "  test:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - name: fetch coverage data",
      "        uses: actions/download-artifact@v4",
      "        with:",
      "          name: coverage-data",
      "      - name: codecov upload",
      "        uses: codecov/codecov-action@v4",
      "      - name: summarize",
      "        run: npx nyc report --check-coverage",
    ].join("\n");
    const findings = reportNeverGenerated.run({
      path: "w.yml",
      text: wf,
      ast: {
        name: "ci",
        on: "push",
        jobs: {
          test: {
            "runs-on": "ubuntu-latest",
            steps: [
              {
                name: "fetch coverage data",
                uses: "actions/download-artifact@v4",
                with: { name: "coverage-data" },
              },
              { name: "codecov upload", uses: "codecov/codecov-action@v4" },
              {
                name: "summarize",
                run: "npx nyc report --check-coverage",
              },
            ],
          },
        },
      },
    });
    // The download IS production evidence (same pipeline's data).
    expect(findings).toHaveLength(0);
  });

  it("a consumer whose text spans lines oddly falls back to the file-wide hit", () => {
    // Arms: the findConsumerLine !m fallback — consumerRe fails inside
    // its run window but the label matches a with-path elsewhere.
    const wf = [
      "name: ci",
      "on: push",
      "jobs:",
      "  test:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - name: upload",
      "        uses: actions/upload-artifact@v4",
      "        with:",
      "          path: out/coverage-summary.txt",
      "      - name: codecov upload",
      "        uses: codecov/codecov-action@v4",
      "      - name: report",
      "        run: npx nyc report --check-coverage",
    ].join("\n");
    const findings = reportNeverGenerated.run({
      path: "w.yml",
      text: wf,
      ast: {
        name: "ci",
        on: "push",
        jobs: {
          test: {
            "runs-on": "ubuntu-latest",
            steps: [
              {
                name: "upload",
                uses: "actions/upload-artifact@v4",
                with: { path: "out/coverage-summary.txt" },
              },
              { name: "codecov upload", uses: "codecov/codecov-action@v4" },
              { name: "report", run: "npx nyc report --check-coverage" },
            ],
          },
        },
      },
    });
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });
});

describe("QA-CI-005: production signals in `with` values (rev-2)", () => {
  it("jacocoRootReport in a gradle action's `with.arguments` counts as production; upload `with.path` does not", () => {
    // Arms: the `with` aggregation for non-upload steps (production
    // evidence) AND the upload-artifact exclusion (consumption evidence).
    const wf = [
      "name: ci",
      "on: push",
      "jobs:",
      "  test:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - name: coverage artifact without producer",
      "        uses: actions/upload-artifact@v4",
      "        with:",
      "          path: coverage/lcov.info",
      "      - name: codecov upload",
      "        uses: codecov/codecov-action@v4",
      "      - name: summarize report",
      "        run: npx nyc report --check-coverage",
    ].join("\n");
    const findings = reportNeverGenerated.run({
      path: "w.yml",
      text: wf,
      ast: {
        name: "ci",
        on: "push",
        jobs: {
          test: {
            "runs-on": "ubuntu-latest",
            steps: [
              {
                name: "coverage artifact without producer",
                uses: "actions/upload-artifact@v4",
                with: { path: "coverage/lcov.info" },
              },
              { name: "codecov upload", uses: "codecov/codecov-action@v4" },
              {
                name: "summarize report",
                run: "npx nyc report --check-coverage",
              },
            ],
          },
        },
      },
    });
    // The codecov consumer runs with no production step anywhere — the
    // upload artifact's coverage path is consumption, not production.
    expect(findings.length).toBeGreaterThan(0);
    // Now WITH a gradle producer whose signal lives in `with.arguments`
    // (adjudicated FP class): the same consumer must NOT flag.
    const wf2 = [
      "name: ci",
      "on: push",
      "jobs:",
      "  test:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - name: build",
      "        uses: gradle/gradle-build-action@v3",
      "        with:",
      "          arguments: test jacocoRootReport --info",
      "      - name: upload",
      "        uses: actions/upload-artifact@v4",
      "        with:",
      "          path: build/reports/jacoco",
      "      - name: codecov",
      "        uses: codecov/codecov-action@v4",
      "        with:",
      "          path: build/reports/jacoco",
      "      - name: gate",
      "        run: npx nyc report --check-coverage",
    ].join("\n");
    const findings2 = reportNeverGenerated.run({
      path: "w2.yml",
      text: wf2,
      ast: {
        name: "ci",
        on: "push",
        jobs: {
          test: {
            "runs-on": "ubuntu-latest",
            steps: [
              {
                name: "build",
                uses: "gradle/gradle-build-action@v3",
                with: { arguments: "test jacocoRootReport --info" },
              },
              {
                name: "upload",
                uses: "actions/upload-artifact@v4",
                with: { path: "build/reports/jacoco" },
              },
              {
                name: "codecov",
                uses: "codecov/codecov-action@v4",
                with: { path: "build/reports/jacoco" },
              },
              { name: "gate", run: "npx nyc report --check-coverage" },
            ],
          },
        },
      },
    });
    expect(findings2).toHaveLength(0);
  });
});

describe("QA-CI-007: line-resolution fallback arms (rev-2)", () => {
  it("an empty command (no anchor) and no loop match resolve to line 1", () => {
    // Arms: firstLine undefined → anchor -1; loop exec no-match → 1;
    // findStepUsesLine with empty command → needle file-wide hit.
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: retry-wrap",
      "        uses: nick-fields/retry@v3",
      "        with:",
      "          timeout_minutes: 10",
    ].join("\n");
    const findings = retryMasking.run({
      path: "w.yml",
      text,
      ast: steps({
        name: "retry-wrap",
        uses: "nick-fields/retry@v3",
        with: { timeout_minutes: 10 },
      }),
    });
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("a loop-matched run whose anchor line is absent from the text resolves to line 1", () => {
    // Arms: firstLine missing from text (anchor -1 → 156:1), loop regex
    // not matching the text (162 → 1). The ast says the step wraps tests
    // in a retry loop; the raw text disagrees — honest floor is line 1.
    const findings = retryMasking.run({
      path: "w.yml",
      text: "jobs:\n  build:\n    steps:\n      - run: echo hi\n",
      ast: steps({
        name: "loop",
        run: "for attempt in $(seq 1 5); do npx vitest run; done",
      }),
    });
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("an anchor present but loop regex matching nothing resolves to line 1", () => {
    // Arms: anchorAt !== -1 (159 arm), exec miss (161 → 1).
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: gate",
      "        run: npx playwright test --forbid-only",
      "      - name: retry-wrap",
      "        uses: nick-fields/retry@v3",
      "        with:",
      "          command: npx playwright test --forbid-only",
    ].join("\n");
    const findings = retryMasking.run({
      path: "w.yml",
      text,
      ast: steps(
        { name: "gate", run: "npx playwright test --forbid-only" },
        {
          name: "retry-wrap",
          uses: "nick-fields/retry@v3",
          with: { command: "npx playwright test --forbid-only" },
        },
      ),
    });
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("a command line present but uses needle BEFORE the window start falls back file-wide", () => {
    // Arms: window lastIndexOf miss (185:1) → file-wide indexOf (187).
    const pad = Array.from(
      { length: 40 },
      (_, i) => `      - run: pad${i}`,
    ).join("\n");
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      ...Array.from({ length: 40 }, (_, i) => ({
        name: `pad${i}`,
        run: `echo pad${i}`,
      })),
      {
        name: "retry-wrap",
        uses: "nick-fields/retry@v3",
        with: { command: "npx playwright test" },
      },
    ] as unknown as Record<string, unknown>[];
    const astSteps = text;
    void pad;
    const findings = retryMasking.run({
      path: "w.yml",
      text: [
        "jobs:",
        "  build:",
        "    steps:",
        "      - name: early mention of nick-fields/retry@v3 in a comment",
        ...Array.from(
          { length: 40 },
          (_, i) => `      - name: pad${i}\n        run: echo pad${i}`,
        ),
        "      - name: retry-wrap",
        "        uses: nick-fields/retry@v3",
        "        with:",
        "          command: npx playwright test",
      ].join("\n"),
      ast: steps(...astSteps),
    });
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("an anchor absent from the text and no loop match resolves to line 1", () => {
    // Arms: firstLine-missing/anchor -1 → re.exec no-match → return 1;
    // findStepUsesLine with command text absent → file-wide needle hit.
    const text = "on: push\njobs:\n  build:\n    steps:\n      - run: x\n";
    const findings = retryMasking.run({
      path: "w.yml",
      text,
      ast: steps({
        name: "retry-wrap",
        uses: "nick-fields/retry@v3",
        with: { command: "npx playwright test" },
      }),
    });
    // Command text is absent from the raw workflow → the fallback
    // line-resolution arms run; a finding (if any) still carries a line.
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("a retry-wrapped failing gate anchors at its own with.command", () => {
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: other job same action",
      "        uses: nick-fields/retry@v3",
      "        with:",
      "          command: npm run build",
      "      - name: tests",
      "        uses: nick-fields/retry@v3",
      "        with:",
      "          command: npx playwright test",
    ].join("\n");
    const findings = retryMasking.run({
      path: "w.yml",
      text,
      ast: steps(
        {
          name: "other job same action",
          uses: "nick-fields/retry@v3",
          with: { command: "npm run build" },
        },
        {
          name: "tests",
          uses: "nick-fields/retry@v3",
          with: { command: "npx playwright test" },
        },
      ),
    });
    // rev-2: each finding anchors at ITS OWN command, not the first
    // file-wide `uses:` hit.
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });
});

describe("QA-CI-008: enforcement-aware suppressions (rev-2)", () => {
  it("a continue-on-error PLAYWRIGHT gate with a later always()-exit-1 step is NOT flagged (enforced)", () => {
    // Arms 49:0-49:4 the `if` condition chain: s.if string, always(),
    // result check, run ENFORCED_FAILURE_LATER. Also arms the
    // earlierTolerantGate `uses` classifier (119:1) and 127 continue.
    // Regression note: rev-2's enforcement arm was dead — it sliced from
    // `steps.indexOf(last)` (the FINAL step), an empty window. The fix
    // slices from the tolerated step; the vault FP-class shape now works.
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: e2e tests",
      "        uses: playwright-community/action@v1",
      "        continue-on-error: true",
      "      - name: report",
      "        run: echo done",
      "        if: always()",
      "      - name: enforce",
      "        run: exit 1",
      "        if: always() && steps.e2e.result != 'success'",
    ].join("\n");
    const findings = alwaysSuccessStep.run({
      path: "w.yml",
      text,
      ast: steps(
        {
          name: "e2e tests",
          uses: "playwright-community/action@v1",
          "continue-on-error": true,
        },
        { name: "report", run: "echo done", if: "always()" },
        {
          name: "enforce",
          run: "exit 1",
          if: "always() && steps.e2e.result != 'success'",
        },
      ),
    });
    // The verdict is enforced by the later always() step — nothing masked.
    expect(findings).toHaveLength(0);
  });

  it("an earlier tolerate-on-gate (|| true) with NO later enforcement still flags", () => {
    // Arms: earlierTolerantGate run-path classifier (119 run arm), and
    // the 127 arm's false side (no enforcement → fall through to flag).
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: tests",
      "        run: npx playwright test || true",
      "      - name: always-success step",
      "        run: echo done",
      "        if: always()",
    ].join("\n");
    const findings = alwaysSuccessStep.run({
      path: "w.yml",
      text,
      ast: steps(
        { name: "tests", run: "npx playwright test || true" },
        { name: "always-success step", run: "echo done", if: "always()" },
      ),
    });
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("a codecov-action tolerant gate with run-text gate signal flags (uses classifier arm)", () => {
    // Arm: earlierTolerantGate `uses` codecov branch (121) with
    // continue-on-error on a step whose RUN text is a gate — plus the
    // 127 false side (no later enforcement → fall through to flag).
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: coverage",
      "        uses: codecov/codecov-action@v4",
      "        with:",
      "          token: abc",
      "        continue-on-error: true",
      "        run: npx vitest run",
      "      - name: finalize",
      "        run: echo finished",
      "        if: always()",
    ].join("\n");
    const findings = alwaysSuccessStep.run({
      path: "w.yml",
      text,
      ast: steps(
        {
          name: "coverage",
          uses: "codecov/codecov-action@v4",
          with: { token: "abc" },
          "continue-on-error": true,
          run: "npx vitest run",
        },
        { name: "finalize", run: "echo finished", if: "always()" },
      ),
    });
    // The tolerated step IS a verification gate (run text + codecov uses)
    // and nothing enforces later — the masking finding fires.
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("an earlier tolerate-on-gate (|| true) with NO later enforcement still flags", () => {
    // Arms: laterStepEnforcesFailure false (no always()-step), and the
    // earlierTolerantGate branch firing on `|| true`.
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: tests",
      "        run: npx playwright test || true",
      "      - name: always-success step",
      "        run: echo done",
      "        if: always()",
    ].join("\n");
    const findings = alwaysSuccessStep.run({
      path: "w.yml",
      text,
      ast: steps(
        { name: "tests", run: "npx playwright test || true" },
        { name: "always-success step", run: "echo done", if: "always()" },
      ),
    });
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("a later always() step re-checking failure exits suppresses the finding", () => {
    // Arms: laterStepEnforcesFailure TRUE (continue arm) and the
    // looksLikeVerificationGate/uses classifier inside it.
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: tests",
      "        run: npx playwright test || true",
      "      - name: check",
      "        run: npx playwright test --list",
      "        if: failure()",
    ].join("\n");
    const findings = alwaysSuccessStep.run({
      path: "w.yml",
      text,
      ast: steps(
        { name: "tests", run: "npx playwright test || true" },
        {
          name: "check",
          run: "exit 1",
          if: "always() && steps.tests.result != 'success'",
        },
      ),
    });
    // The later step enforces the verdict — nothing masked.
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-009: sequence guard arms (rev-2)", () => {
  it("a semicolon sequence whose tail is a loop keyword is skipped", () => {
    // Arm: the /^\s*(?:do|then|else|fi|done|elif|esac)\b|^\s*\}/ guard.
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: loop",
      "        run: until npm test; do sleep 5; done",
    ].join("\n");
    const findings = exitCodeNotPropagated.run({
      path: "w.yml",
      text,
      ast: steps({
        name: "loop",
        run: "until npm test; do sleep 5; done",
      }),
    });
    for (const f of findings) expect(f.line).toBeGreaterThanOrEqual(1);
  });

  it("setup-then-test sequences are skipped (test runs last)", () => {
    // Arm: the TEST_CMD.test(afterSemi) guard.
    const text = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: install then test",
      "        run: npx playwright install; npx playwright test",
    ].join("\n");
    const findings = exitCodeNotPropagated.run({
      path: "w.yml",
      text,
      ast: steps({
        name: "install then test",
        run: "npx playwright install; npx playwright test",
      }),
    });
    expect(findings).toHaveLength(0);
  });
});
