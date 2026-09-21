/**
 * Trust subsystem — invariants and trust-model constants.
 *
 * Re-exports the canonical invariant registry (INVARIANT-001) so
 * consumers can import from `src/trust/` without reaching into submodules.
 */

export type { TrustInvariant } from "./invariants.js";
export {
  TRUST_INVARIANTS,
  getInvariantById,
  getRequiredForQuarter,
  getInvariantsByScope,
} from "./invariants.js";
