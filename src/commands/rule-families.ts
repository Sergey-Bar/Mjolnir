/**
 * The one rule-family table.
 *
 * Every consumer imports from here:
 *
 *   - doctor.ts   — `RULE_ID_RE`, the ID pattern every rule ID is validated
 *                   against
 *   - the registry contract test — every family token is a family the live
 *                   rules actually use, and every family with rules has a
 *                   source directory
 *
 * History, because the shape of this file is a consequence of it: the table
 * originally existed to stop `create-rule`'s `FAMILY_META`, the ID regex and
 * doctor's `VALID_ID` from drifting apart — CYP and SE scaffolded into QA-PW
 * categories, and the doctor accepted families the scaffolder rejected. The
 * v6 carve removed `create-rule`, which left `doctor.ts` as the only importer
 * and the table's rows unverified. `create-rule` is not coming back: a
 * scaffold that emits an unmeasured detector into a user's tree hands them a
 * rule that cannot say whether it is trustworthy. The rows are therefore
 * checked against the registry instead, in
 * `tests/contract/rule-families.spec.ts`.
 *
 * Adding a family: add one row here and a rule that uses it. The ID regex and
 * the doctor's validator both follow automatically, and the registry test
 * fails until the rule exists.
 *
 * Three rows — WDIO, PPTR, APM — declare a framework the product recognises
 * but has no detector for. They are here so the family vocabulary is the
 * product's rather than the registry's, and their `dir` points at a directory
 * that does not exist because there is nothing to put in it. They carry no
 * rule, so nothing ships under them. Removing them would be a separate,
 * deliberate change: a user with a WebdriverIO suite is being told the
 * framework is understood, and that promise belongs to whoever decides
 * whether to keep it.
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
