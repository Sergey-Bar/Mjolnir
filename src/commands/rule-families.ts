/**
 * The one rule-family table (audit M3: create-rule's FAMILY_META, the
 * ID regex, and doctor's VALID_ID drifted — CYP/SE scaffolded into
 * QA-PW categories and the doctor accepted families the scaffolder
 * rejected). Every consumer imports from here:
 *
 *   - create-rule.ts  — ID parsing + scaffold target (dir/category)
 *   - doctor.ts       — VALID_ID registry sanity check
 *   - usage text      — the ID examples stay truthful
 *
 * Adding a family: add one row here. The ID regex, the doctor's
 * validator, and the scaffolder all follow.
 */

export interface RuleFamily {
  /** Family token in the ID (QA-<token>-NNN). */
  token: string;
  /** Source directory under src/rules/. */
  dir: string;
  /** Default category rules in this family report under. */
  category: string;
  /** Default appliesTo for new rules in this family. */
  appliesTo: string;
}

export const RULE_FAMILIES: readonly RuleFamily[] = [
  { token: "TEST", dir: "test", category: "QA-TEST", appliesTo: "test-files" },
  {
    token: "TQUAL",
    dir: "quality",
    category: "QA-TQUAL",
    appliesTo: "test-files",
  },
  {
    token: "PW",
    dir: "playwright",
    category: "QA-PW",
    appliesTo: "test-files",
  },
  { token: "CI", dir: "ci", category: "QA-CI", appliesTo: "ci-workflows" },
  { token: "PY", dir: "python", category: "QA-PY", appliesTo: "python" },
  { token: "ENV", dir: "quality", category: "QA-ENV", appliesTo: "test-files" },
  { token: "JV", dir: "java", category: "QA-JV", appliesTo: "java" },
  { token: "CS", dir: "csharp", category: "QA-CS", appliesTo: "csharp" },
  {
    token: "CYP",
    dir: "cypress",
    category: "QA-CYP",
    appliesTo: "test-files",
  },
  {
    token: "SE",
    dir: "selenium",
    category: "QA-SE",
    appliesTo: "test-files",
  },
  {
    token: "WDIO",
    dir: "webdriverio",
    category: "QA-WDIO",
    appliesTo: "test-files",
  },
  {
    token: "PPTR",
    dir: "puppeteer",
    category: "QA-PPTR",
    appliesTo: "test-files",
  },
  { token: "APM", dir: "apm", category: "QA-APM", appliesTo: "test-files" },
] as const;

/** The full ID regex — derived from the table, so doctor and create-rule
 * can never disagree about which families exist. */
// eslint-disable-next-line security/detect-non-literal-regexp -- derived from the compile-time RULE_FAMILIES table, not scan input
export const RULE_ID_RE = new RegExp(
  `^QA-(?:${RULE_FAMILIES.map((f) => f.token).join("|")})-\\d{3}$`,
);

export function familyByToken(token: string): RuleFamily | undefined {
  const upper = token.toUpperCase();
  return RULE_FAMILIES.find((f) => f.token === upper);
}
