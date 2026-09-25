import { createRequire } from "node:module";
import type {
  CandidateDecision,
  CandidateStage,
} from "./candidate-decision.d.mts";

type Api = {
  evaluateCandidateDecision(
    manifest: unknown,
    stage?: CandidateStage,
  ): CandidateDecision;
  manifestContradictions(manifest: unknown): string[];
  decideForRoot(root: string, stage?: CandidateStage): CandidateDecision;
};

const load = createRequire(import.meta.url) as (path: string) => unknown;
const api = load("./candidate-decision.mjs") as Api;

export const evaluateCandidateDecision = (
  manifest: unknown,
  stage?: CandidateStage,
) => api.evaluateCandidateDecision(manifest, stage);
export const manifestContradictions = (manifest: unknown) =>
  api.manifestContradictions(manifest);
export const decideForRoot = (root: string, stage?: CandidateStage) =>
  api.decideForRoot(root, stage);
