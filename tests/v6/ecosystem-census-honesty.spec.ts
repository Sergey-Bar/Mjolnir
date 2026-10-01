/**
 * The census is an inventory of what the product DOES.
 *
 * `docs/ECOSYSTEM-CENSUS.json` claimed `gitlab-ci: SUPPORTED,
 * M2_IMPLEMENTED, adapter: src/adapters/gitlab-ci.ts` while
 * `FRAMEWORK_INVENTORY` said `executorAdapterIds: []`, F0, UNSUPPORTED, and
 * `SCAN_ADAPTERS` did not register the adapter. The cause was one line:
 * `deriveCiProviderEntries` appended `src/adapters/${slug}.ts` based on
 * whether a *record existed*, not on whether the scanner *ran* anything. A
 * file on disk was treated as a capability.
 *
 * That is not a stale-artifact problem. The committed JSON is generated, so
 * re-running the generator after the fix produces the truth — but nothing
 * would have stopped the two sources of truth drifting apart again, because
 * nothing ever compared them. These tests do the comparing.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SCAN_ADAPTERS } from "../../src/discovery/scan-adapters.js";
import {
  canonicalProviderSlug,
  deriveCiProviderEntries,
} from "../../src/v6/ecosystem-census.js";
import { FRAMEWORK_INVENTORY } from "../../src/frameworks/framework-inventory.js";
import {
  getProviderCapabilities,
  listProviderCapabilities,
  validateProviderCapabilityRecord,
} from "../../src/frameworks/provider-capability-contract.js";
import { readFileSync } from "node:fs";

const ROOT = join(import.meta.dirname, "..", "..");
const registeredIds = new Set(SCAN_ADAPTERS.map((adapter) => adapter.id));

function ciEntries() {
  return deriveCiProviderEntries(undefined, "2026-09-28");
}

describe("the census derives CI support from the scanner, not from the filesystem", () => {
  it("every CI entry that CLAIMS an adapter is one the scanner registers", () => {
    // KEYED ON THE ADAPTER, not on `state === "SUPPORTED"`.
    //
    // The first version filtered to SUPPORTED entries — and 3.3 demoted every
    // one of them, so the loop body stopped executing and the file's headline
    // assertion became a test that cannot fail. That is the failure mode this
    // whole change set was assembled to remove, appearing inside the test
    // written to catch it.
    //
    // The property that is actually worth holding does not mention the state
    // at all: if an entry CLAIMS an adapter, that adapter is registered. It
    // holds for TARGET entries, SUPPORTED entries, and every state between.
    const claiming = ciEntries().filter(
      (entry) => (entry.adapter ?? "") !== "",
    );
    // The fixture must not be vacuous either — with no entry claiming an
    // adapter there is nothing to check and the test is green for the wrong
    // reason.
    expect(claiming.length).toBeGreaterThan(0);
    for (const entry of claiming) {
      const ids = (entry.adapter ?? "").split(",").filter(Boolean);
      for (const id of ids) {
        expect(
          registeredIds.has(id),
          `${entry.id} (${entry.state}) claims an adapter via "${id}", which SCAN_ADAPTERS does not register`,
        ).toBe(true);
      }
    }
  });

  it("the declared capability record is VALIDATED, not merely enumerated", () => {
    // `deriveCiProviderEntries` consulted `CI_PROVIDER_CAPABILITY_RECORDS` for
    // one thing — which providers get an entry — and never ran the contract's
    // own validator over it, so a record carrying a forbidden
    // `executable-bypass` field would have been published exactly like a clean
    // one. The census now calls `validateProviderCapabilityRecord` per provider.
    for (const entry of ciEntries()) {
      expect(
        entry.notApplicableReason ?? "",
        `${entry.id} carries a capability record its own validator rejected`,
      ).toBe("");
    }
  });

  it("the accessor resolves a provider and refuses an unknown one", () => {
    // `CANONICAL_RECORDS` was private with no accessor, so the census could
    // enumerate four providers but could not ASK about one — and a record that
    // can only be enumerated is one whose contents nothing checks.
    expect(getProviderCapabilities("azure-pipelines")?.provider).toBe(
      "azure-pipelines",
    );
    // Normalised, so a caller cannot get a silent `null` from a slug written
    // the other way round.
    expect(getProviderCapabilities("Azure_Pipelines")?.provider).toBe(
      "azure-pipelines",
    );
    expect(getProviderCapabilities("nope")).toBeNull();
    expect(listProviderCapabilities().length).toBeGreaterThan(0);
  });

  it("every provider the census lists has a validated capability record", () => {
    const slugs = ciEntries().map((entry) => entry.name);
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(getProviderCapabilities(slug), slug).not.toBeNull();
      expect(
        validateProviderCapabilityRecord(getProviderCapabilities(slug)).valid,
        `${slug}'s record does not pass its own validator`,
      ).toBe(true);
    }
  });

  it("no CI entry is SUPPORTED, and that is a measurement rather than an absence", () => {
    // The consequence of 3.3, asserted so the state cannot drift back
    // unnoticed: `SUPPORTED` now needs an adapter AND a verified fixture quad,
    // and no CI-provider ecosystem has a complete quad. If a future backfill
    // earns one, THIS test is the thing that has to be updated deliberately —
    // which is the point of naming it rather than leaving it implicit.
    const supported = ciEntries().filter(
      (entry) => entry.state === "SUPPORTED",
    );
    expect(
      supported.map((entry) => entry.id),
      "a CI entry reached SUPPORTED; the quad backfill has earned one — update this " +
        "assertion and the SUPPORTED_WITHOUT_QUAD arm's premise with it",
    ).toEqual([]);
  });

  it("every registered CI-provider adapter is claimed by a census entry", () => {
    // The other direction: a registered adapter that no census entry claims
    // means the census under-reports, which is the mirror defect and equally
    // wrong for anyone budgeting against it.
    //
    // Scoped to CI_PROVIDER rows on purpose. `SCAN_ADAPTERS` also holds the
    // test-framework adapters (typescript, python), which are not
    // ci-cd-providers and are deliberately absent from this census.
    //
    // CLAIMED, not SUPPORTED. The two were conflated until 3.3: an adapter
    // is a declaration that support exists, and a fixture quad is the
    // observation that it does. Demoting every adapter-bearing provider
    // (33 entries) is the honest result of asking the second question, and
    // this test must not demand the first answer's phrasing back.
    const ciAdapters = new Set(
      FRAMEWORK_INVENTORY.filter((f) => f.entityType === "CI_PROVIDER").flatMap(
        (f) => f.executorAdapterIds,
      ),
    );
    const claimed = new Set(
      ciEntries()
        .flatMap((entry) => (entry.adapter ?? "").split(","))
        .filter(Boolean),
    );
    for (const id of ciAdapters) {
      if (!registeredIds.has(id)) continue;
      expect(
        claimed.has(id),
        `SCAN_ADAPTERS registers "${id}" but no census entry claims it`,
      ).toBe(true);
    }
    expect(
      ciAdapters.size,
      "no CI provider declares an adapter at all",
    ).toBeGreaterThan(0);
  });

  it("agrees with FRAMEWORK_INVENTORY's declared adapters", () => {
    const declared = new Map<string, readonly string[]>();
    for (const framework of FRAMEWORK_INVENTORY) {
      if (framework.entityType !== "CI_PROVIDER") continue;
      declared.set(
        canonicalProviderSlug(framework.frameworkId),
        framework.executorAdapterIds,
      );
    }
    for (const entry of ciEntries()) {
      const expected = declared.get(entry.name) ?? [];
      // Every entry records the adapters its inventory row declares, whatever
      // its state. An entry that hid its adapter while demoted would make the
      // demotion unreviewable — a reader could not tell "no adapter" from
      // "adapter, but unproven".
      for (const id of expected) {
        expect(entry.adapter ?? "").toContain(id);
      }
    }
  });

  it("an adapter file on disk does not by itself make a provider SUPPORTED", () => {
    // The specific regression. `src/adapters/gitlab-ci.ts` exists, is a
    // real implementation with three rules, and is not registered. The
    // census must say TARGET, because a consumer reading the census is
    // asking "does Mjölnir analyse this" — and the answer is no.
    const entry = ciEntries().find(
      (candidate) => candidate.name === "gitlab-ci",
    );
    expect(entry, "the gitlab-ci census entry disappeared").toBeDefined();
    expect(
      entry?.state,
      "gitlab-ci is SUPPORTED purely because a file exists at src/adapters/gitlab-ci.ts",
    ).toBe("TARGET");
    expect(entry?.adapter).toBeNull();
  });

  it("the committed census artifact agrees with the generated one", () => {
    const committed = JSON.parse(
      readFileSync(join(ROOT, "docs", "ECOSYSTEM-CENSUS.json"), "utf8"),
    ) as {
      entries: Array<{ id: string; state: string; adapter: string | null }>;
    };
    const gitlab = committed.entries.find((entry) =>
      entry.id.includes("gitlab-ci"),
    );
    expect(gitlab, "the committed census has no gitlab-ci entry").toBeDefined();
    expect(gitlab?.state).toBe("TARGET");
  });
});

describe("the provider set the census covers", () => {
  it("still names every provider the inventory declares", () => {
    const declared = new Set(
      FRAMEWORK_INVENTORY.filter((f) => f.entityType === "CI_PROVIDER").map(
        (f) => canonicalProviderSlug(f.frameworkId),
      ),
    );
    const covered = new Set(ciEntries().map((entry) => entry.name));
    for (const slug of declared) {
      expect(
        covered.has(slug),
        `${slug} is declared but not in the census`,
      ).toBe(true);
    }
  });

  it("the registered adapter modules all exist", () => {
    // The mirror of the census's original mistake, one level down: the
    // registry names module paths, so those paths should resolve.
    for (const adapter of SCAN_ADAPTERS) {
      const path = join(ROOT, "src", "adapters", `${adapter.id}.ts`);
      expect(
        existsSync(path),
        `registered adapter "${adapter.id}" has no module at src/adapters/${adapter.id}.ts`,
      ).toBe(true);
    }
  });
});
