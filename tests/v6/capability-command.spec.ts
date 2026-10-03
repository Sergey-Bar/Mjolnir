/**
 * The `capability` command's selection, serialisation and rendering.
 *
 * `tests/v6/capability-registry.spec.ts` pins the registry model and the one
 * property that matters most about this command → that it has no flag which can
 * write a level back. These cover the rest of the surface: the filters it
 * applies, the two output shapes, and the exit codes.
 *
 * The command is reached through `mjolnir maturity capabilities` since the verb
 * budget folded it into that verb, so nothing about it is exercised end to end
 * anywhere else.
 */
import { describe, expect, it } from "vitest";

import type { Output } from "../../src/cli-io.js";

import {
  capabilityJson,
  renderCapabilityText,
  runCapabilityCommand,
  selectCapabilities,
  type CapabilityQuery,
} from "../../src/commands/capability.js";
import type {
  CapabilityEntry,
  RegistryDiagnostic,
} from "../../src/v6/capability-registry.js";

type Io = { out: string[]; err: string[] };
type Writer = { out: Output; err: Output };

function capture(): { io: Io; write: (io: Io) => Writer } {
  const io: Io = { out: [], err: [] };
  return {
    io,
    write: (target: Io) => ({
      out: (...parts: unknown[]) => {
        target.out.push(parts.map(String).join(" "));
      },
      err: (...parts: unknown[]) => {
        target.err.push(parts.map(String).join(" "));
      },
    }),
  };
}

/**
 * A minimal registry entry. `CapabilityEntry` carries a dozen optional fields
 * under `exactOptionalPropertyTypes`, and enumerating all of them to satisfy
 * the compiler would add nothing here: the real shapes are pinned by
 * `tests/v6/capability-registry.spec.ts`, and what this file cares about is
 * that the filters and the renderer read the fields they read.
 */
function entry(overrides: Partial<CapabilityEntry> = {}): CapabilityEntry {
  return {
    id: "python/pytest",
    kind: "language",
    maturity: "M3_FIXTURE_VERIFIED",
    owner: "Mjolnir",
    rules: [],
    adapter: null,
    nextLevelGap: null,
    proof: {
      status: "LOCAL_PROVEN",
      artifact: null,
      digest: "sha256:fixture",
      observedAt: "2026-09-27T00:00:00.000Z",
      authority: "fixture",
    },
    ...overrides,
  } as unknown as CapabilityEntry;
}

const NO_QUERY: CapabilityQuery = { kind: null, maturity: null, id: null };

describe("selectCapabilities", () => {
  const entries = [
    entry(),
    entry({
      id: "node/vitest",
      kind: "ci-cd-provider",
      maturity: "M2_IMPLEMENTED",
    }),
  ];

  it("returns everything for an empty query", () => {
    expect(selectCapabilities(entries, NO_QUERY)).toHaveLength(2);
  });

  it("filters on an id substring, not an exact match", () => {
    const found = selectCapabilities(entries, { ...NO_QUERY, id: "pytest" });
    expect(found.map((e) => e.id)).toEqual(["python/pytest"]);
  });

  it("filters on kind, and returns nothing for a kind absent", () => {
    expect(
      selectCapabilities(entries, {
        ...NO_QUERY,
        kind: "ci-cd-provider",
      }).map((e) => e.id),
    ).toEqual(["node/vitest"]);
    expect(
      selectCapabilities(entries, { ...NO_QUERY, kind: "policy-pack" }),
    ).toEqual([]);
  });

  it("applies every filter at once, not just the first that matches", () => {
    // Each filter alone would return the pytest row. Together they cannot.
    expect(
      selectCapabilities(entries, {
        id: "python",
        kind: "ci-cd-provider",
        maturity: null,
      }),
    ).toEqual([]);
  });
});

describe("the two output shapes", () => {
  const entries = [entry()];
  const diagnostics: RegistryDiagnostic[] = [];

  it("states the contract and the count in JSON", () => {
    const parsed = JSON.parse(capabilityJson(entries, diagnostics)) as {
      contract: string;
      count: number;
    };
    expect(parsed.contract).toBe("mjolnir.capability.v1");
    expect(parsed.count).toBe(1);
  });

  it("says in the text surface that a level cannot be set here", () => {
    // The sentence is the guard against a reader treating the table as
    // editable. It is a claim, so it is asserted rather than assumed.
    expect(renderCapabilityText(entries, diagnostics)).toContain(
      "cannot be set here",
    );
  });

  it("surfaces a diagnostic rather than hiding it behind a clean table", () => {
    const text = renderCapabilityText(entries, [
      { code: "OVER_CLAIM", entryId: "python/pytest", message: "claims M4" },
    ] as unknown as RegistryDiagnostic[]);
    expect(text).toContain("OVER_CLAIM");
  });
});

describe("runCapabilityCommand", () => {
  it("rejects an unknown argument with a usage error", () => {
    const { io, write } = capture();
    expect(runCapabilityCommand(["--nope"], write(io))).toBe(10);
    expect(io.err.join("")).toContain("unknown argument");
  });

  it("emits JSON when asked, and nothing else on the out channel", () => {
    const { io, write } = capture();
    const code = runCapabilityCommand(["--json"], write(io));
    expect(code).toBe(0);
    const parsed = JSON.parse(io.out.join("")) as { contract: string };
    expect(parsed.contract).toBe("mjolnir.capability.v1");
  });
});
