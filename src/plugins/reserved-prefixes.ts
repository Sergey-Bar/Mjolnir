/**
 * Core-owned rule-ID prefixes that external rule sources (npm plugins,
 * JS modules, JSON manifests) may never claim — one shared law.
 *
 * Audit (load.ts/local-rules.ts): the two loaders each kept their own
 * copy and had DRIFTED — load.ts's list was missing QA-CYP and QA-SE, so
 * an npm plugin could ship a rule spoofing the Cypress/Selenium families
 * while a local JS module could not. Single const, both import it.
 * Matching is case-insensitive at the call sites (QA-test-001 must not
 * walk past the gate).
 */
export const RESERVED_PREFIXES = [
  "QA-TEST",
  "QA-TQUAL",
  "QA-PW",
  "QA-CI",
  "QA-PY",
  "QA-ENV",
  "QA-JV",
  "QA-CS",
  "QA-CYP",
  "QA-SE",
  "QA-PLUGIN",
] as const;

/** True when `ruleId` claims a core-owned family prefix. */
export function isReservedPrefix(ruleId: string): boolean {
  const upper = ruleId.toUpperCase();
  return RESERVED_PREFIXES.some((p) => upper.startsWith(p));
}
