export type LocatorClass = "role-based" | "testid" | "css-chain" | "xpath";

/**
 * Selector risk score for a single locator usage: 0 = safe, 100 = critical.
 * Finer-grained than the binary GOOD/BAD class — a stable CSS id is not as
 * brittle as `div:nth-child(3) > span > button`.
 */
export interface SelectorRisk {
  /** 0–100. */
  score: number;
  /** Human-readable reason for the score. */
  reason: string;
}

/** Risk weights per locator shape (0 = resilient, higher = brittle). */
export const LOCATOR_RISK: Record<LocatorClass, number> = {
  "role-based": 0,
  testid: 0,
  "css-chain": 60,
  xpath: 90,
};
