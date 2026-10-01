/**
 * `EXPECTED_CERTIFICATION_SURFACE` — the DENOMINATOR, declared.
 *
 * ## Why this file exists
 *
 * Without a committed denominator, "60% → 100%" is achievable by deleting the
 * five cells that were not certified. That is not hypothetical caution: it is
 * the one move that makes every certification number improve without anybody
 * writing a fixture, and nothing in a metrics-only report can distinguish it
 * from progress.
 *
 * So the surface is a committed, reviewable manifest of what MUST be certified,
 * and the coverage number is `certified ÷ required` over THIS list. Deleting a
 * cell from here lowers the denominator, which is why `check-certification-
 * surface` fails when the manifest SHRINKS unless `--acknowledge-surface-change`
 * names the cells removed — and the removal shows up in the diff like any other
 * deletion.
 *
 * `REQUIRED` may GROW freely. That raises the bar; it never lowers it. Only
 * `REQUIRED → NOT_APPLICABLE` shrinks anything, and it requires a reason that
 * says what the cell belonged to instead — the plan's own example is a
 * CI-surface concept on a Python ecosystem, and the reason names the surface it
 * does belong to. A reason that only says "not applicable here" is rejected,
 * because it is indistinguishable from deleting the cell with a comment.
 *
 * ## The 11 ecosystems, all retained
 *
 * §5.1 retains every ecosystem including the ones with no corpus at all
 * (GitLab CI, Jenkins, Azure Pipelines). Wave B and C are thin, not absent: a
 * wave is a ranking by `corpusRepos × concepts`, and a zero-repo ecosystem
 * stays in the denominator so that "we support Jenkins" is a claim somebody
 * eventually has to earn. Deleting them would improve every percentage in the
 * report by removing the ecosystems nobody has measured.
 *
 * ## Two states, two columns, no over-reading
 *
 * `LANGUAGE_MANIFEST`'s `CERTIFIED` says the ENGINE can analyse an ecosystem.
 * A cell's `CERTIFIED` says the §6 contract passed for one
 * `concept × language × framework`. They are different claims, they have
 * different fields, and `standard` is on each row so a reader cannot read one
 * as the other.
 */

import { compareCodePoints } from "../lib/compare.js";
import { CONCEPT_IDS } from "./concepts.js";

/**
 * A cell's REQUIREMENT in the surface.
 *
 * `NOT_APPLICABLE` is a first-class state, not an absence. It is excluded from
 * the denominator AND printed, so the exclusions are as visible as the cells
 * they remove — an exclusion nobody prints is an exclusion nobody reviews.
 */
export type CellRequirement =
  | { readonly requirement: "REQUIRED" }
  | {
      readonly requirement: "NOT_APPLICABLE";
      /**
       * Where this cell DOES belong, or what makes it inapplicable. Must be a
       * sentence: `check-certification-surface` rejects a reason that names no
       * alternative, because "not applicable" with no successor is a deletion
       * wearing a label.
       */
      readonly reason: string;
    };

/**
 * A cell in an ecosystem's declared surface.
 *
 * A TYPE, not an interface: `extends` needs statically known members and
 * `CellRequirement` is a discriminated union. The two shapes are spread into
 * one so a cell cannot carry `reason` without `requirement: "NOT_APPLICABLE"`
 * — a REQUIRED cell with a justification is the shape a deletion grows into.
 */
export type SurfaceCell =
  | {
      readonly concept: string;
      readonly framework: string;
      readonly requirement: "REQUIRED";
    }
  | {
      readonly concept: string;
      readonly framework: string;
      readonly requirement: "NOT_APPLICABLE";
      readonly reason: string;
    };

/** One ecosystem's declared detection surface. */
export interface EcosystemSurface {
  readonly ecosystem: string;
  /** Wave A first — ranked by `corpusRepos × conceptCount`, descending. */
  readonly wave: "A" | "B" | "C";
  readonly displayName: string;
  /**
   * Corpus repositories available to this ecosystem today. REPORTED, not
   * gated: a zero here is a gap report, and gating it would mean the gate only
   * passes on ecosystems somebody already measured.
   */
  readonly corpusRepos: number;
  readonly frameworks: readonly string[];
  readonly cells: readonly SurfaceCell[];
}

/**
 * The concepts a CI-surface ecosystem owns.
 *
 * NOT spelled out here, and that is deliberate: `ciCells()` below states each
 * platform's OWN list, because whether a platform can express
 * `continue-on-error` at all is the entire content of its CI surface. A
 * shared constant above it would be a second statement of the same claim, and
 * two statements of one claim is how they come to disagree.
 *
 * The vocabulary itself lives in the rules under `src/rules/ci/` — the failure
 * mode is "a pipeline stage cannot fail", which is language-agnostic with
 * per-ecosystem bindings.
 */

/**
 * The concepts a browser-automation ecosystem owns.
 *
 * Shared across Playwright, Cypress and Selenium: the three test the same
 * failure modes — a locator that breaks on markup change, a wait that is not a
 * wait, state shared across tests — and each binds them to its own selector
 * syntax. Cypress's config is its own concept because `chromeWebSecurity` has
 * no Selenium or Playwright equivalent, which is exactly the §6.E case:
 * framework parity is required only where framework semantics genuinely differ.
 */
const BROWSER_CONCEPTS = [
  "brittle-selector-instead-of-role-based-locator",
  "css-xpath-string-selector-instead-of-a-normalized-locator",
  "waitforloadstate-networkidle-used",
  "hard-sleep-in-test",
  "browser-state-shared-across-tests",
  "hardcoded-url-in-test",
  "empty-test-body",
  "focused-test-committed",
] as const;

/** Concepts every TEST ecosystem shares, whatever language it is written in. */
const TEST_CONCEPTS = [
  "test-without-assertions",
  "empty-test-body",
  "skipped-test",
  "focused-test-committed",
  "commented-out-test",
  "tautological-assertion",
  "hard-sleep-in-test",
  "retry-masks-test-failures",
] as const;

/**
 * Build a cell list from concepts, with every one REQUIRED.
 *
 * `NOT_APPLICABLE` is written out by hand, in the row it applies to, with its
 * reason — so the generated shape cannot quietly produce one.
 */
function required(
  concepts: readonly string[],
  framework: string,
): SurfaceCell[] {
  return concepts.map((concept) => ({
    concept,
    framework,
    requirement: "REQUIRED" as const,
  }));
}

/**
 * One concept per CI ecosystem, minus the ones a given platform cannot express.
 *
 * `ignored-exit-code-true` is REQUIRED everywhere — `|| true` is a shell
 * feature and every CI runs a shell. The step-level shapes (`continue-on-error`,
 * `always-success`, a conditioned gate, a swallowed failure) are the ones a
 * platform does not have, and each of those rows names the platform it DOES
 * belong to rather than just declining.
 */
function ciCells(
  platform: string,
  supports: {
    readonly continueOnError: boolean;
    readonly alwaysSuccess: boolean;
    readonly conditionedGate: boolean;
    readonly swallowedFailure: boolean;
  },
): SurfaceCell[] {
  const out: SurfaceCell[] = [
    ...required(
      [
        "continue-on-error-masks-a-failing-verification-gate",
        "ignored-exit-code-true",
        "report-consumed-but-never-generated",
        "test-command-does-not-propagate-exit-code",
        "tests-skipped-where-they-must-block",
      ],
      platform,
    ),
  ];
  const decline = (concept: string, belongs: string): SurfaceCell => ({
    concept,
    framework: platform,
    requirement: "NOT_APPLICABLE",
    reason: `${concept} is not expressible in ${belongs}; it belongs to that surface and is certified there`,
  });
  if (!supports.continueOnError) {
    out.push(
      decline(
        "continue-on-error-masks-a-failing-verification-gate",
        "GitHub Actions",
      ),
    );
  }
  if (!supports.alwaysSuccess) {
    out.push(
      decline(
        "always-success-step-masks-failures",
        "a stage-declarative pipeline",
      ),
    );
  }
  if (!supports.conditionedGate) {
    out.push(
      decline(
        "verification-gate-conditioned-so-it-can-never-fail-the-pipeline",
        "a workflow whose `if:` can be false",
      ),
    );
  }
  if (!supports.swallowedFailure) {
    out.push(
      decline(
        "try-catch-swallows-a-verification-stage-failure",
        "a step that wraps another step in a try/catch",
      ),
    );
  }
  return out;
}

export const EXPECTED_CERTIFICATION_SURFACE: readonly EcosystemSurface[] = [
  {
    ecosystem: "github-actions",
    wave: "A",
    displayName: "GitHub Actions",
    corpusRepos: 30,
    frameworks: ["github-actions"],
    cells: ciCells("github-actions", {
      continueOnError: true,
      alwaysSuccess: true,
      conditionedGate: true,
      swallowedFailure: true,
    }),
  },
  {
    ecosystem: "typescript",
    wave: "A",
    displayName: "TypeScript / JavaScript",
    corpusRepos: 14,
    frameworks: ["vitest", "jest", "playwright"],
    cells: required(TEST_CONCEPTS, "vitest").concat(
      required(BROWSER_CONCEPTS.slice(3), "playwright"),
    ),
  },
  {
    ecosystem: "python",
    wave: "A",
    displayName: "Python",
    corpusRepos: 5,
    frameworks: ["pytest", "playwright-python"],
    cells: required(TEST_CONCEPTS, "pytest")
      .concat(required(BROWSER_CONCEPTS.slice(3), "playwright-python"))
      .concat([
        {
          concept: "bare-truthiness-assert-on-complex-object",
          framework: "pytest",
          requirement: "REQUIRED" as const,
        },
        {
          concept: "pytest-raises-without-match",
          framework: "pytest",
          requirement: "REQUIRED" as const,
        },
        {
          concept: "mutable-fixture-shared-across-tests",
          framework: "pytest",
          requirement: "REQUIRED" as const,
        },
      ]),
  },
  {
    ecosystem: "java",
    wave: "A",
    displayName: "Java",
    corpusRepos: 2,
    frameworks: ["junit"],
    cells: required(TEST_CONCEPTS, "junit").concat([
      {
        concept: "hard-sleep-before-element-lookup",
        framework: "junit",
        requirement: "REQUIRED" as const,
      },
    ]),
  },
  {
    ecosystem: "playwright",
    wave: "A",
    displayName: "Playwright",
    corpusRepos: 6,
    frameworks: ["playwright"],
    cells: required(BROWSER_CONCEPTS, "playwright").concat([
      {
        concept: "unawaited-playwright-assertion",
        framework: "playwright",
        requirement: "REQUIRED" as const,
      },
      {
        concept: "load-event-wait-instead-of-web-first-assertion",
        framework: "playwright",
        requirement: "REQUIRED" as const,
      },
      {
        concept: "framelocator-chain-deeper-than-2",
        framework: "playwright",
        requirement: "REQUIRED" as const,
      },
      {
        concept: "trial-true-click-without-follow-up-assertion",
        framework: "playwright",
        requirement: "REQUIRED" as const,
      },
      {
        concept: "describe-serial-without-justification",
        framework: "playwright",
        requirement: "REQUIRED" as const,
      },
      {
        concept: "screenshot-without-maxdiffpixelratio",
        framework: "playwright",
        requirement: "REQUIRED" as const,
      },
    ]),
  },
  {
    ecosystem: "csharp",
    wave: "B",
    displayName: "C#",
    corpusRepos: 1,
    frameworks: ["nunit"],
    cells: required(TEST_CONCEPTS, "nunit").concat([
      {
        concept: "hard-sleep-before-element-lookup",
        framework: "nunit",
        requirement: "REQUIRED" as const,
      },
    ]),
  },
  {
    ecosystem: "cypress",
    wave: "B",
    displayName: "Cypress",
    corpusRepos: 2,
    frameworks: ["cypress"],
    cells: required(BROWSER_CONCEPTS, "cypress").concat([
      {
        concept: "fixed-cy-wait-n-hard-coded-wait",
        framework: "cypress",
        requirement: "REQUIRED" as const,
      },
      {
        concept: "cypress-config-disables-chromewebsecurity",
        framework: "cypress",
        requirement: "REQUIRED" as const,
      },
    ]),
  },
  {
    ecosystem: "selenium",
    wave: "B",
    displayName: "Selenium",
    corpusRepos: 1,
    frameworks: ["selenium"],
    cells: required(BROWSER_CONCEPTS, "selenium").concat([
      {
        concept: "hard-sleep-before-element-lookup",
        framework: "selenium",
        requirement: "REQUIRED" as const,
      },
    ]),
  },
  {
    ecosystem: "gitlab-ci",
    wave: "C",
    displayName: "GitLab CI",
    corpusRepos: 0,
    frameworks: ["gitlab-ci"],
    cells: ciCells("gitlab-ci", {
      continueOnError: true,
      alwaysSuccess: false,
      conditionedGate: false,
      swallowedFailure: false,
    }),
  },
  {
    ecosystem: "jenkins",
    wave: "C",
    displayName: "Jenkins",
    corpusRepos: 0,
    frameworks: ["jenkins"],
    cells: ciCells("jenkins", {
      continueOnError: true,
      alwaysSuccess: false,
      conditionedGate: false,
      swallowedFailure: false,
    }),
  },
  {
    ecosystem: "azure-pipelines",
    wave: "C",
    displayName: "Azure Pipelines",
    corpusRepos: 0,
    frameworks: ["azure-pipelines"],
    cells: ciCells("azure-pipelines", {
      continueOnError: true,
      alwaysSuccess: true,
      conditionedGate: true,
      swallowedFailure: false,
    }),
  },
];

/** Every REQUIRED cell, as `ecosystem|concept|framework`. */
export function requiredCells(): readonly string[] {
  const out: string[] = [];
  for (const eco of EXPECTED_CERTIFICATION_SURFACE) {
    for (const cell of eco.cells) {
      if (cell.requirement !== "REQUIRED") continue;
      out.push(`${eco.ecosystem}|${cell.concept}|${cell.framework}`);
    }
  }
  return out.sort();
}

/** Every NOT_APPLICABLE cell, with the reason — the EXCLUSIONS, printed. */
export function notApplicableCells(): ReadonlyArray<{
  ecosystem: string;
  concept: string;
  framework: string;
  reason: string;
}> {
  const out: Array<{
    ecosystem: string;
    concept: string;
    framework: string;
    reason: string;
  }> = [];
  for (const eco of EXPECTED_CERTIFICATION_SURFACE) {
    for (const cell of eco.cells) {
      if (cell.requirement !== "NOT_APPLICABLE") continue;
      out.push({
        ecosystem: eco.ecosystem,
        concept: cell.concept,
        framework: cell.framework,
        reason: cell.reason,
      });
    }
  }
  // compareCodePoints, not localeCompare: these keys are MACHINE-facing,
  // and localeCompare resolves the ambient locale — so the exclusion
  // list ordered itself differently on a machine with a different
  // default, which is the defect deterministic-ordering exists to stop.
  return out.sort((a, b) =>
    compareCodePoints(
      `${a.ecosystem}|${a.concept}`,
      `${b.ecosystem}|${b.concept}`,
    ),
  );
}

/**
 * Concepts this surface names that the vocabulary does not have.
 *
 * The failure this catches is a `REQUIRED` cell for a concept nobody defined:
 * a denominator entry that can never be satisfied, which reads as permanent
 * work and is really a typo. §5.3's denominator is only meaningful if every
 * cell in it can be closed.
 */
export function unknownConcepts(): readonly string[] {
  const known = new Set(CONCEPT_IDS);
  const unknown = new Set<string>();
  for (const eco of EXPECTED_CERTIFICATION_SURFACE) {
    for (const cell of eco.cells) {
      if (!known.has(cell.concept)) unknown.add(cell.concept);
    }
  }
  return [...unknown].sort();
}
