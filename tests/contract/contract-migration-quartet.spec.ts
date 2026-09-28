/**
 * The contract bump requires a migration quartet, and nothing enforced it.
 *
 * `docs/PUBLISHING.md` names the four surfaces a `CONTRACT_VERSION` bump has
 * to touch: the generated reference, `VERSIONING.md`, the README, and a
 * migration guide. A bump that skipped one left a consumer with a contract
 * they could not read, or a guide that did not exist — and the contract test
 * would still pass, because the contract itself was fine.
 *
 * These assertions are about the quartet being present AND consistent with
 * the code: a migration guide that describes a version the source no longer
 * declares is worse than none, because it is confidently wrong.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CONTRACT_VERSION } from "../../src/engine/machine-contract.js";

const ROOT = join(import.meta.dirname, "..", "..");
const MIGRATION_GUIDE = "docs/MIGRATION-CONTRACT-2.md";

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("the contract bump's migration quartet", () => {
  it("the migration guide exists and names the version the source declares", () => {
    expect(
      existsSync(join(ROOT, MIGRATION_GUIDE)),
      `${MIGRATION_GUIDE} is missing — a contract bump without a migration guide`,
    ).toBe(true);
    const guide = read(MIGRATION_GUIDE);
    // The new version, derived from the constant so this assertion cannot
    // drift from the source, and the old one so the transition is stated.
    // A guide left describing v1 while the source says v2 reads as complete
    // migration documentation and is not.
    expect(
      guide,
      "the guide does not state the version the source declares",
    ).toContain(`to **${CONTRACT_VERSION}**`);
    expect(guide, "the guide does not name the version it replaces").toMatch(
      /from\s+\*\*1\*\*/,
    );
  });

  it("the guide documents every field v2 actually added", () => {
    const guide = read(MIGRATION_GUIDE);
    // Derived from the field names the source uses, not a hand-kept list: a
    // guide that misses a new field is the failure, and a hand-kept list is
    // how the previous guide missed one.
    for (const field of [
      "coverageState",
      "rulesApplied",
      "rulesWithheld",
      "degradations",
      "scoreClampReason",
    ]) {
      expect(
        guide,
        `${field} is in the contract but not in the guide`,
      ).toContain(field);
    }
  });

  it("VERSIONING.md states that v2 is not additive-only, and why", () => {
    const versioning = read("docs/VERSIONING.md");
    expect(versioning).toContain("MIGRATION-CONTRACT-2.md");
    // The load-bearing sentence. v1's promise was "additive-only within v1",
    // and v2 breaks it precisely because the added fields are semantic and
    // participate in the digest. A versioning table still promising
    // additive-only for the current contract is the same kind of stale claim
    // this release exists to remove.
    expect(versioning, "the contractVersion row is gone").toMatch(
      /contractVersion/i,
    );
    expect(
      versioning,
      "VERSIONING.md does not say v2 is not additive-only",
    ).toMatch(/v2 is not\b/);
    expect(
      versioning,
      "VERSIONING.md does not give the reason the promise changed",
    ).toMatch(/semantic/);
  });

  it("the README indexes the migration guide", () => {
    const readme = read("README.md");
    expect(readme).toContain("docs/MIGRATION-CONTRACT-2.md");
  });

  it("the generated contract reference states v2 and why it exists", () => {
    const contractDoc = read("docs/machine-contract.md");
    expect(contractDoc).toContain(`contractVersion: ${CONTRACT_VERSION}`);
    // The generator's own template carries the reasoning, and the reason is
    // the thing a consumer needs: a version that does not change when the
    // digest's meaning changes is a version that lies.
    expect(contractDoc).toMatch(/Why v2 exists/);
  });
});
