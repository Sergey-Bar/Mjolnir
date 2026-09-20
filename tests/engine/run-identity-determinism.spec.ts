/**
 * TI-015 — Same run identity → identical trust results.
 *
 * Determinism soak: buildRunIdentity with identical inputs MUST
 * produce byte-identical scanId values. The identity incorporates
 * all verdict-affecting inputs (files, rules, config, engine version,
 * suppression, policy, historical evidence, report digest).
 */

import { describe, expect, it } from "vitest";

import {
  buildRunIdentity,
  type RunIdentityInput,
} from "../../src/engine/run-identity.js";

function makeInput(
  overrides: Partial<RunIdentityInput> = {},
): RunIdentityInput {
  return {
    files: [
      { path: "src/foo.ts", size: 100 },
      { path: "tests/bar.spec.ts", size: 200 },
    ],
    rules: [
      { id: "QA-TEST-001", detectorRevision: 2 },
      { id: "QA-PW-101", detectorRevision: 1 },
    ],
    config: { target: "." },
    engineVersion: "1.1.1",
    ...overrides,
  };
}

describe("TI-015: run identity determinism", () => {
  it("identical inputs produce identical scanId", () => {
    const input = makeInput();
    const a = buildRunIdentity(input);
    const b = buildRunIdentity(input);
    expect(a.scanId).toBe(b.scanId);
  });

  it("identical inputs produce identical inputFingerprint", () => {
    const input = makeInput();
    const a = buildRunIdentity(input);
    const b = buildRunIdentity(input);
    expect(a.inputFingerprint).toBe(b.inputFingerprint);
  });

  it("identical inputs produce identical rulesDigest", () => {
    const input = makeInput();
    const a = buildRunIdentity(input);
    const b = buildRunIdentity(input);
    expect(a.rulesDigest).toBe(b.rulesDigest);
  });

  it("different file content changes scanId", () => {
    const a = buildRunIdentity(
      makeInput({
        files: [{ path: "src/foo.ts", size: 100 }],
      }),
    );
    const b = buildRunIdentity(
      makeInput({
        files: [{ path: "src/foo.ts", size: 999 }],
      }),
    );
    expect(a.scanId).not.toBe(b.scanId);
  });

  it("different rules change scanId", () => {
    const a = buildRunIdentity(
      makeInput({
        rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      }),
    );
    const b = buildRunIdentity(
      makeInput({
        rules: [{ id: "QA-TEST-001", detectorRevision: 2 }],
      }),
    );
    expect(a.scanId).not.toBe(b.scanId);
  });

  it("different config changes scanId", () => {
    const a = buildRunIdentity(makeInput({ config: { a: 1 } }));
    const b = buildRunIdentity(makeInput({ config: { a: 2 } }));
    expect(a.scanId).not.toBe(b.scanId);
  });

  it("different engine version changes scanId", () => {
    const a = buildRunIdentity(makeInput({ engineVersion: "1.0.0" }));
    const b = buildRunIdentity(makeInput({ engineVersion: "1.1.1" }));
    expect(a.scanId).not.toBe(b.scanId);
  });

  it("different suppression fingerprint changes scanId", () => {
    const a = buildRunIdentity(
      makeInput({
        suppressionFingerprint: "abc123",
      }),
    );
    const b = buildRunIdentity(
      makeInput({
        suppressionFingerprint: "def456",
      }),
    );
    expect(a.scanId).not.toBe(b.scanId);
  });

  it("different policy fingerprint changes scanId", () => {
    const a = buildRunIdentity(
      makeInput({
        policyFingerprint: "policy-a",
      }),
    );
    const b = buildRunIdentity(
      makeInput({
        policyFingerprint: "policy-b",
      }),
    );
    expect(a.scanId).not.toBe(b.scanId);
  });

  it("different historical evidence fingerprint changes scanId", () => {
    const a = buildRunIdentity(
      makeInput({
        historicalEvidenceFingerprint: "hist-a",
      }),
    );
    const b = buildRunIdentity(
      makeInput({
        historicalEvidenceFingerprint: "hist-b",
      }),
    );
    expect(a.scanId).not.toBe(b.scanId);
  });

  it("file ordering does not affect identity (order-insensitive)", () => {
    const a = buildRunIdentity(
      makeInput({
        files: [
          { path: "src/b.ts", size: 10 },
          { path: "src/a.ts", size: 20 },
        ],
      }),
    );
    const b = buildRunIdentity(
      makeInput({
        files: [
          { path: "src/a.ts", size: 20 },
          { path: "src/b.ts", size: 10 },
        ],
      }),
    );
    expect(a.inputFingerprint).toBe(b.inputFingerprint);
    expect(a.scanId).toBe(b.scanId);
  });

  it("rule ordering does not affect identity (order-insensitive)", () => {
    const a = buildRunIdentity(
      makeInput({
        rules: [
          { id: "QA-TEST-002", detectorRevision: 1 },
          { id: "QA-TEST-001", detectorRevision: 1 },
        ],
      }),
    );
    const b = buildRunIdentity(
      makeInput({
        rules: [
          { id: "QA-TEST-001", detectorRevision: 1 },
          { id: "QA-TEST-002", detectorRevision: 1 },
        ],
      }),
    );
    expect(a.rulesDigest).toBe(b.rulesDigest);
    expect(a.scanId).toBe(b.scanId);
  });

  it("content hash takes precedence over size when both present", () => {
    const a = buildRunIdentity(
      makeInput({
        files: [{ path: "src/foo.ts", size: 100, hash: "abc" }],
      }),
    );
    const b = buildRunIdentity(
      makeInput({
        files: [{ path: "src/foo.ts", size: 999, hash: "abc" }],
      }),
    );
    expect(a.inputFingerprint).toBe(b.inputFingerprint);
  });

  it("scanId is a sha256 hex string", () => {
    const identity = buildRunIdentity(makeInput());
    expect(identity.scanId).toMatch(/^[a-f0-9]{64}$/);
  });

  it("soak: 100 identical builds produce the same scanId", () => {
    const input = makeInput();
    const first = buildRunIdentity(input).scanId;
    for (let i = 0; i < 100; i++) {
      expect(buildRunIdentity(input).scanId).toBe(first);
    }
  });
});
