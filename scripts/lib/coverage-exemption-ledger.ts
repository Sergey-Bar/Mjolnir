import { createRequire } from "node:module";
import type { CoverageExemptionLedger } from "./coverage-exemption-ledger.d.mts";

type Api = {
  committedExclusions(root: string): string[];
  readLedger(root: string): CoverageExemptionLedger;
  validateCoverageExemptionLedger(
    root: string,
    options?: { now?: Date },
  ): string[];
};

const load = createRequire(import.meta.url) as (path: string) => unknown;
const api = load("./coverage-exemption-ledger.mjs") as Api;

export const committedExclusions = (root: string) =>
  api.committedExclusions(root);
export const readLedger = (root: string) => api.readLedger(root);
export const validateCoverageExemptionLedger = (
  root: string,
  options?: { now?: Date },
) => api.validateCoverageExemptionLedger(root, options);
