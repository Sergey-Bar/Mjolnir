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
import { readFileSync } from "node:fs";

const ROOT = join(import.meta.dirname, "..", "..");
const registeredIds = new Set(SCAN_ADAPTERS.map((adapter) => adapter.id));

function ciEntries() {
  return deriveCiProviderEntries(undefined, "2026-09-28");
}

describe("the census derives CI support from the scanner, not from the filesystem", () => {
  it("every SUPPORTED CI entry names an adapter the scanner actually registers", () => {
    for (const entry of ciEntries()) {
      if (entry.state !== "SUPPORTED") continue;
      const ids = (entry.adapter ?? "").split(",").filter(Boolean);
      expect(
        ids.length,
        `${entry.id} is SUPPORTED with no adapter`,
      ).toBeGreaterThan(0);
      for (const id of ids) {
        expect(
          registeredIds.has(id),
          `${entry.id} claims SUPPORTED via "${id}", which SCAN_ADAPTERS does not register`,
        ).toBe(true);
      }
    }
  });

  it("every registered CI-provider adapter is claimed by a census entry", () => {
    // The other direction: a registered adapter that no census entry claims
    // means the census under-reports, which is the mirror defect and equally
    // wrong for anyone budgeting against it.
    //
    // Scoped to CI_PROVIDER rows on purpose. `SCAN_ADAPTERS` also holds the
    // test-framework adapters (typescript, python), which are not
    // ci-cd-providers and are deliberately absent from this census.
    const ciAdapters = new Set(
      FRAMEWORK_INVENTORY.filter((f) => f.entityType === "CI_PROVIDER").flatMap(
        (f) => f.executorAdapterIds,
      ),
    );
    const claimed = new Set(
      ciEntries()
        .filter((entry) => entry.state === "SUPPORTED")
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
      if (entry.state !== "SUPPORTED") {
        expect(
          expected.some((id) => registeredIds.has(id)),
          `${entry.id} is not SUPPORTED, but its inventory row declares a registered adapter`,
        ).toBe(false);
        continue;
      }
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
