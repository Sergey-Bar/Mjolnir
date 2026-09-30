/**
 * Which mode a run is in, and how the other one is reached.
 *
 * ADR 0012: `local-only` is the default and hosted mode is a declared state.
 * This module is the enforcement point, and its shape is the decision:
 *
 *   - `resolveRunMode` takes its inputs as an ARGUMENT, never from
 *     `process.env`. Nothing here can read the environment, so a stray
 *     `MJOLNIR_MODE` in a shell, in CI, or in a parent's environment cannot
 *     change what a run does. The first version of the test passed an `env`
 *     bag and asserted it was ignored — and that only means something because
 *     this function is structurally unable to consult one.
 *   - `isHostedModeReachable` is the single predicate every entry point has to
 *     pass through, and it answers the same question separately from
 *     `resolveRunMode`. Separating them is what stops a caller satisfying the
 *     easy one: the first says whether the mode MAY be entered, the second
 *     says which mode this run IS.
 *   - an unrecognised declaration THROWS. A typo in a build flag that fell back
 *     to `local-only` would mean a deployment believed it was hosted and was
 *     not — the same class of failure as a gate that reports success for
 *     something it did not run.
 *
 * Hosted mode is not implemented. This is the contract it will have to
 * satisfy, and it is deliberately the smallest thing that can be wrong in only
 * one direction.
 */

/**
 * The build-time declaration that opts a build into hosted mode.
 *
 * A build flag rather than an environment variable, because a build flag is
 * something a release engineer sets deliberately and reviews in a diff, and
 * because an environment variable is set by whatever CI last happened to run
 * with.
 */
export const HOSTED_MODE_FLAG = "mjolnir-mode" as const;

/**
 * The environment variable a naive implementation would consult.
 *
 * Named here so the refusal is testable and so a reader can see that the
 * absence is a decision. Nothing reads it.
 */
export const ENTER_HOSTED_MODE_ENV = "MJOLNIR_MODE" as const;

export const RUN_MODES = ["local-only", "hosted"] as const;
export type RunMode = (typeof RUN_MODES)[number];

export interface RunModeInput {
  /** Injected so the function is structurally unable to read the environment. */
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Parsed process flags, e.g. `{ "mjolnir-mode": "hosted" }`. */
  readonly flags: Readonly<Record<string, string | boolean | undefined>>;
}

/**
 * May this configuration enter hosted mode?
 *
 * Only an explicit `mjolnir-mode=hosted`. Everything else — including
 * `mjolnir-mode=local-only`, an absent flag, and any environment variable —
 * answers false, and the answer does not change what `resolveRunMode` then
 * returns.
 */
export function isHostedModeReachable(input: RunModeInput): boolean {
  return input.flags[HOSTED_MODE_FLAG] === "hosted";
}

/**
 * The mode this run is in.
 *
 * Throws on a declaration it does not recognise. A silent fallback here is the
 * failure ADR 0012 exists to prevent: a build that asked for hosted mode,
 * mistyped the flag, and ran local-only would report local-only artefacts into
 * a pipeline that believed otherwise.
 */
export function resolveRunMode(input: RunModeInput): RunMode {
  const declared = input.flags[HOSTED_MODE_FLAG];
  if (declared === undefined || declared === false) return "local-only";
  if (declared === true) {
    throw new Error(
      `${HOSTED_MODE_FLAG} was given without a value. Use "${HOSTED_MODE_FLAG}=hosted" or omit it.`,
    );
  }
  if (declared === "local-only" || declared === "hosted") return declared;
  throw new Error(
    `${HOSTED_MODE_FLAG}=${String(declared)} is not a run mode. Expected "hosted" or "local-only". ` +
      "Falling back to a default here would let a mistyped flag look like a " +
      "deliberate choice.",
  );
}
