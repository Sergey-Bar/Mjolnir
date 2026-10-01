/**
 * The language capability manifest (plan V5-023).
 *
 * One record per language, each carrying a certification state drawn from the
 * single ladder in `./state-machine.ts` and the evidence that state rests on.
 * The admission gate checks the claim against the evidence on every read, so
 * a manifest cannot ship a state its own evidence does not support — the
 * "CERTIFIED with an empty corpus" case is refused at read time, not
 * discovered at release time.
 *
 * The manifest is DATA. Adding a language is adding a row, not editing a
 * union type in four places, and the language support claim in the README is
 * generated from it rather than maintained by hand.
 */

import {
  admit,
  detectRegression,
  isAtLeast,
  LANGUAGE_STATE_RANK,
  type CertificationEvidence,
  type CertificationState,
  type Regression,
} from "./state-machine.js";
import { compareLocalized, DISPLAY_LOCALE } from "../lib/compare.js";

export interface LanguageCapability {
  /** The inventory id, so the manifest speaks the same vocabulary (V5-024). */
  id: string;
  /** Human name, for the report. */
  displayName: string;
  /** The claimed state. */
  state: CertificationState;
  /** What the claim stands on. */
  evidence: CertificationEvidence;
  /** The surface the claim covers — a language is not certified wholesale. */
  capabilities: string[];
  /** Explicitly out of scope for this language, stated rather than implied. */
  notCertified: string[];
  /** The next concrete step to a stronger state. Absent = at the ceiling. */
  nextLevelGap?: string;
}

export const LANGUAGE_MANIFEST: readonly LanguageCapability[] = [
  {
    id: "typescript",
    displayName: "TypeScript / JavaScript",
    state: "CERTIFIED",
    capabilities: [
      "parse",
      "symbols",
      "imports",
      "calls",
      "test-discovery",
      "framework-discovery",
      "config-discovery",
      "source-location",
    ],
    notCertified: [
      "type-aware cross-file inference is heuristic, not a type checker",
      "no flow-sensitive analysis",
    ],
    evidence: {
      corpus: "corpus/v5-candidates.jsonl",
      sampleSize: 240,
      runner: "mjolnir-scan",
      verifiedBy: "false-green corpus + negative controls",
      source: "docs/M26-EXTERNAL-VALIDATION.json",
    },
  },
  {
    id: "java",
    displayName: "Java",
    state: "CANDIDATE",
    capabilities: ["parse", "symbols", "imports", "test-discovery"],
    notCertified: ["framework-discovery is config-file based only"],
    evidence: {
      corpus: "corpus/v5-candidates.jsonl",
      sampleSize: 24,
      runner: "mjolnir-scan",
      verifiedBy: "tree-sitter parse conformance",
    },
    nextLevelGap: "runner evidence on a JUnit cohort",
  },
  {
    id: "csharp",
    displayName: "C# / .NET",
    state: "CANDIDATE",
    capabilities: ["parse", "symbols", "imports", "test-discovery"],
    notCertified: ["xunit/nunit detection is file-name based"],
    evidence: {
      corpus: "corpus/v5-candidates.jsonl",
      sampleSize: 18,
      runner: "mjolnir-scan",
      verifiedBy: "tree-sitter parse conformance",
    },
    nextLevelGap: "runner evidence on an xunit cohort",
  },
  {
    id: "python",
    displayName: "Python",
    state: "MEASURED",
    capabilities: [
      "parse",
      "symbols",
      "imports",
      "test-discovery",
      "framework-discovery",
    ],
    notCertified: ["no runner evidence; pytest detection is import-based"],
    evidence: {
      corpus: "corpus/v5-candidates.jsonl",
      sampleSize: 40,
      runner: "mjolnir-scan",
      verifiedBy: "tree-sitter parse conformance",
    },
    nextLevelGap: "pytest runner evidence",
  },
] as const;

/**
 * §5.1's seven missing manifest rows, and the `ECOSYSTEM_MANIFEST` alias.
 *
 * The table lists eleven ecosystems with an "11 ecosystems, ALL RETAINED, none
 * deleted" heading, and seven of them had NO row — so the matrix generator had
 * nothing to print for GitHub Actions, Playwright, Cypress, Selenium, GitLab
 * CI, Jenkins or Azure Pipelines, and the README's language table silently
 * covered four.
 *
 * Every new row is `DISCOVERED`, which is the honest state for an ecosystem
 * with an adapter and no corpus: §5.1's own definition — "we have seen it
 * exist. Says nothing about whether it works."
 *
 * They are `DISCOVERED` rather than `UNMEASURED` on purpose. `UNMEASURED` means
 * evidence was collected and is not yet strong enough; these have NO evidence,
 * and `DISCOVERED` is the state that says so. A row claiming a measurement
 * nobody ran is the defect this whole module exists to catch.
 *
 * The alias exists because "language manifest" stopped being the right name
 * once the table gained rows that are not languages — a YAML workflow and a
 * CI system are ecosystems, not languages. `LANGUAGE_MANIFEST` is kept as the
 * historical export because four specs and the README generator import it, and
 * renaming an export to fix a noun is a breaking change dressed as tidying.
 */

/** The eleven §5.1 ecosystems, in the table's own order (wave A first). */
export const ECOSYSTEM_ORDER = [
  "github-actions",
  "playwright",
  "typescript",
  "python",
  "java",
  "csharp",
  "cypress",
  "selenium",
  "gitlab-ci",
  "jenkins",
  "azure-pipelines",
] as const;

export type EcosystemId = (typeof ECOSYSTEM_ORDER)[number];

export const ECOSYSTEM_MANIFEST: readonly LanguageCapability[] = [
  {
    id: "github-actions",
    displayName: "GitHub Actions",
    state: "DISCOVERED",
    capabilities: ["parse", "symbols", "test-discovery", "config-discovery"],
    notCertified: [
      "an adapter exists; no rule has been measured against a workflow corpus",
      "the 30-repository corpus the plan budgets is not built",
    ],
    evidence: {
      corpus: "none yet",
      sampleSize: 0,
      runner: "mjolnir-scan",
      verifiedBy: "adapter parses real workflows; no measurement cohort",
    },
    nextLevelGap: "workflow corpus, then a detector measurement on it",
  },
  {
    id: "playwright",
    displayName: "Playwright",
    state: "DISCOVERED",
    capabilities: [
      "parse",
      "symbols",
      "test-discovery",
      "framework-discovery",
      "config-discovery",
    ],
    notCertified: [
      "26 concepts have rules; the plan counts 156 cells across the four adapters",
      "no runner evidence, so the state ladder stops at DISCOVERED",
    ],
    evidence: {
      corpus: "none yet",
      sampleSize: 0,
      runner: "mjolnir-scan",
      verifiedBy: "6 repositories parsed; no measurement cohort",
    },
    nextLevelGap: "Playwright runner evidence, then the 156-cell surface",
  },
  {
    id: "cypress",
    displayName: "Cypress",
    state: "DISCOVERED",
    capabilities: ["parse", "test-discovery", "config-discovery"],
    notCertified: [
      "2 repositories only; §6.F's diversity gate cannot be met on that",
      "three rules, none measured",
    ],
    evidence: {
      corpus: "none yet",
      sampleSize: 0,
      runner: "mjolnir-scan",
      verifiedBy: "adapter parses cypress.config.ts; no measurement cohort",
    },
    nextLevelGap: "cypress runner evidence on a wider corpus",
  },
  {
    id: "selenium",
    displayName: "Selenium",
    state: "DISCOVERED",
    capabilities: ["parse", "test-discovery"],
    notCertified: [
      "one repository; §6.F's diversity floor of three is unreachable",
      "per-language bindings share one adapter, so no binding is proven",
    ],
    evidence: {
      corpus: "none yet",
      sampleSize: 0,
      runner: "mjolnir-scan",
      verifiedBy: "adapter parses page-object shapes; no measurement cohort",
    },
    nextLevelGap: "two more repositories, then per-language binding evidence",
  },
  {
    id: "gitlab-ci",
    displayName: "GitLab CI",
    state: "DISCOVERED",
    capabilities: ["parse", "config-discovery"],
    notCertified: [
      "no corpus repository at all",
      "wave C by the plan's own ranking",
    ],
    evidence: {
      corpus: "none yet",
      sampleSize: 0,
      runner: "mjolnir-scan",
      verifiedBy: "adapter parses .gitlab-ci.yml; no measurement cohort",
    },
    nextLevelGap: "one real .gitlab-ci.yml, then a measurement",
  },
  {
    id: "jenkins",
    displayName: "Jenkins",
    state: "DISCOVERED",
    capabilities: ["parse", "config-discovery"],
    notCertified: [
      "no corpus repository at all",
      "wave C by the plan's own ranking",
    ],
    evidence: {
      corpus: "none yet",
      sampleSize: 0,
      runner: "mjolnir-scan",
      verifiedBy: "adapter parses Jenkinsfile; no measurement cohort",
    },
    nextLevelGap: "one real Jenkinsfile, then a measurement",
  },
  {
    id: "azure-pipelines",
    displayName: "Azure Pipelines",
    state: "DISCOVERED",
    capabilities: ["parse", "config-discovery"],
    notCertified: [
      "no corpus repository at all",
      "wave C by the plan's own ranking",
    ],
    evidence: {
      corpus: "none yet",
      sampleSize: 0,
      runner: "mjolnir-scan",
      verifiedBy: "adapter parses azure-pipelines.yml; no measurement cohort",
    },
    nextLevelGap: "one real pipeline file, then a measurement",
  },
];

/**
 * All eleven ecosystems, wave-A first.
 *
 * `LANGUAGE_MANIFEST` is the four rows that have measurements; these seven do
 * not. The union is what §5.1's table describes, and it is what the matrix
 * generator reads — so a README row cannot exist for an ecosystem the
 * certification matrix does not mention, or vice versa.
 */
export const ALL_ECOSYSTEMS: readonly LanguageCapability[] = [
  ...LANGUAGE_MANIFEST,
  ...ECOSYSTEM_MANIFEST,
];

/**
 * Historical alias.
 *
 * The name was accurate when the table held only languages. It stopped being
 * accurate when it gained a YAML workflow and three CI systems, and the fix
 * is a new export name plus this one — not renaming the old export, which four
 * specs and the README generator import.
 */
export const ECOSYSTEM_MANIFEST_WITH_LANGUAGES: readonly LanguageCapability[] =
  ALL_ECOSYSTEMS;
export interface ManifestFinding {
  id: string;
  kind: "UNSUPPORTED_CLAIM" | "PROJECTION_DRIFT" | "MISSING_EVIDENCE_FIELD";
  detail: string;
}

/**
 * Check every row against its own evidence.
 *
 * This is the gate the plan asks for: a language cannot declare a state its
 * evidence does not support, and the defect names the row so it can be fixed
 * rather than discovered.
 */
export function auditLanguageManifest(
  manifest: readonly LanguageCapability[] = LANGUAGE_MANIFEST,
): ManifestFinding[] {
  const findings: ManifestFinding[] = [];
  for (const entry of manifest) {
    const decision = admit(entry.state, entry.evidence);
    if (!decision.admitted) {
      findings.push({
        id: entry.id,
        kind: "UNSUPPORTED_CLAIM",
        detail: `${entry.state}: ${decision.defects.join("; ")}`,
      });
    }
    // A state stronger than the one declared is a projection error, not a
    // claim: the projection map decides what a string means.
    if (LANGUAGE_STATE_RANK[entry.state] === undefined) {
      findings.push({
        id: entry.id,
        kind: "PROJECTION_DRIFT",
        detail: `"${entry.state}" is not in the language-state projection`,
      });
    }
    if (entry.state !== decision.supportedState) {
      findings.push({
        id: entry.id,
        kind: "MISSING_EVIDENCE_FIELD",
        detail: `declares ${entry.state} but its evidence only supports ${decision.supportedState}`,
      });
    }
  }
  return findings;
}

/** Re-derive a row's admitted state from its evidence, ignoring the claim. */
export function rederive(entry: LanguageCapability): CertificationState {
  return admit(entry.state, entry.evidence).supportedState;
}

/**
 * Re-check the whole manifest against a PREVIOUS one and report regressions.
 *
 * A language that silently drops from CERTIFIED to CANDIDED leaves no trace
 * otherwise, and the first anyone hears of it is a user whose support
 * disappeared.
 */
export function findRegressions(
  previous: readonly LanguageCapability[],
  current: readonly LanguageCapability[] = LANGUAGE_MANIFEST,
): Regression[] {
  const before = new Map(previous.map((entry) => [entry.id, entry]));
  const regressions: Regression[] = [];
  for (const entry of current) {
    const was = before.get(entry.id);
    if (was === undefined) continue;
    const found = detectRegression({
      capability: entry.id,
      stored: was.state,
      rederived: entry.state,
      reason:
        entry.nextLevelGap ?? "state changed without a recorded next step",
    });
    if (found !== null) regressions.push(found);
  }
  return regressions;
}

/** Languages at or above a state, strongest first. */
export function languagesAtLeast(
  state: CertificationState,
  manifest: readonly LanguageCapability[] = LANGUAGE_MANIFEST,
): LanguageCapability[] {
  return (
    manifest
      .filter((entry) => isAtLeast(entry.state, state))
      // Pinned to "en" rather than the ambient default: this is a
      // human-readable certification table, so the state ladder should read in
      // a natural order — but a machine with a different default locale must
      // still get the same table, because the README's language-support
      // section is generated from it and committed.
      .sort((a, b) => compareLocalized(DISPLAY_LOCALE)(b.state, a.state))
  );
}

/**
 * The one-line support claim for a language, generated from the manifest.
 *
 * The README's language table is produced from this rather than written by
 * hand, so a state change cannot leave the documentation claiming something
 * the manifest does not.
 */
export function supportClaim(entry: LanguageCapability): string {
  const gaps = entry.nextLevelGap;
  const suffix =
    gaps === undefined ? "no recorded gap to the next state" : `next: ${gaps}`;
  return `${entry.displayName} — ${entry.state} (${entry.capabilities.length} capabilities; ${suffix})`;
}
