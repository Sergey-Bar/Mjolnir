/**
 * Hosted mode must be UNREACHABLE without an explicit declaration.
 *
 * ADR 0012, and the test it is enforced by. A mode reachable by accident is a
 * mode that eventually will be — by a default that drifts, by an environment
 * variable set once in CI and never removed, or by a first-run prompt somebody
 * dismissed by pressing the key that happened to be highlighted.
 *
 * So the assertion is negative, not positive: the checker must not be able to
 * ENTER hosted mode from the local-only path, no matter what the environment
 * says. An environment variable, because that is the shape a real
 * implementation would reach for, and the shape that makes the default
 * unchosen.
 */

import { describe, expect, it } from "vitest";

import {
  ENTER_HOSTED_MODE_ENV,
  isHostedModeReachable,
  resolveRunMode,
} from "../../src/governance/run-mode.js";

describe("local-only is the default and hosted mode needs a declaration", () => {
  it("resolves local-only when nothing declares otherwise", () => {
    expect(resolveRunMode({ env: {}, flags: {} })).toBe("local-only");
  });

  it("ignores the environment entirely", () => {
    // The whole point. If `ENTER_HOSTED_MODE=1` could switch the mode, the
    // default would be whatever the last person's shell said, and the ADR
    // would be a sentence rather than a constraint.
    expect(
      resolveRunMode({
        env: { [ENTER_HOSTED_MODE_ENV]: "1" },
        flags: {},
      }),
    ).toBe("local-only");
    expect(
      resolveRunMode({
        env: { [ENTER_HOSTED_MODE_ENV]: "true" },
        flags: {},
      }),
    ).toBe("local-only");
  });

  it("is reachable ONLY through the explicit build-time declaration", () => {
    // `isHostedModeReachable` is the predicate every entry point has to go
    // through. It is exported and tested separately from `resolveRunMode` so a
    // caller cannot satisfy one and not the other: the first says whether the
    // mode may be entered, the second says which mode this run is.
    expect(isHostedModeReachable({ env: {}, flags: {} })).toBe(false);
    expect(
      isHostedModeReachable({
        env: { [ENTER_HOSTED_MODE_ENV]: "1" },
        flags: {},
      }),
    ).toBe(false);
    expect(
      isHostedModeReachable({
        env: {},
        flags: { "mjolnir-mode": "hosted" },
      }),
    ).toBe(true);
  });

  it("rejects a mode string it does not know rather than defaulting to hosted", () => {
    // An unrecognised declaration is a build error, not a fallback. A typo in
    // a build flag that silently resolved to `local-only` would mean a
    // deployment believed it was hosted and was not.
    expect(() =>
      resolveRunMode({
        env: {},
        flags: { "mjolnir-mode": "hosted-enterprise" },
      }),
    ).toThrow(/mjolnir-mode/);
  });
});
