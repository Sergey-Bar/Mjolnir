/**
 * The proof statuses a claim may carry, in one place.
 *
 * There were four copies of this list: `check-claim-registry.mjs`,
 * `revalidate-claims.mjs` (as literals in a predicate and again in a comment),
 * and `src/v6/capability-types.ts`. The divergence was not hypothetical —
 * `revalidate-claims.mjs` gated its digest check on `"PROVEN"`, which is in
 * NONE of the lists, so that entire branch was dead code while still appearing
 * in review as a control.
 *
 * One list, imported by every side. The revalidator and the registry checker
 * are both plain `.mjs` and both run under Node, so a module is enough; the
 * TypeScript consumers keep their own `PROOF_STATUSES` typed as a union,
 * because a `Set` cannot express "one of these literal values" to the
 * compiler — and `check-claim-registry.mjs` asserts the two agree.
 */
export const PROOF_STATUSES = Object.freeze([
  "BLOCKED",
  "LOCAL_PROVEN",
  "REMOTE_PROVEN",
]);

/** Membership test, the shape most call sites want. */
export function isProofStatus(value) {
  return PROOF_STATUSES.includes(value);
}

/**
 * The statuses that assert evidence, i.e. everything that is not `BLOCKED`.
 *
 * A `BLOCKED` claim asserts nothing, so it has nothing to revalidate — that is
 * the distinction the revalidator's loop turns on, and it is a property of the
 * status rather than a hardcoded list of the other two.
 */
export const EVIDENCE_BEARING_STATUSES = Object.freeze(
  PROOF_STATUSES.filter((status) => status !== "BLOCKED"),
);
