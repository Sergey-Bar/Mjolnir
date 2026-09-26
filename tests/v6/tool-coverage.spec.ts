import { describe, expect, it } from "vitest";

import {
  BLIND_SPOTS,
  TOOL_COVERAGE_STATES,
  assessToolCoverage,
  doublesFromTests,
} from "../../src/v6/tool-coverage.js";
import {
  buildCensus,
  type DiscoveryObservation,
} from "../../src/v6/ecosystem-census.js";
import { normalize } from "../../src/v6/qa-ir.js";

const obs = (name: string, via: string): DiscoveryObservation => ({
  censusId: null,
  name,
  category: "UNCLASSIFIED",
  via,
});

const census = buildCensus();

describe("tool coverage — it answers the three questions a user asks", () => {
  it("separates what was analysed from what was merely detected", () => {
    const coverage = assessToolCoverage(
      [
        // In the census, so an adapter handles it.
        {
          ...obs("playwright", "dep:npm:playwright"),
          censusId: "ec.component-e2e.playwright",
        },
        // A real QA tool with no census entry: the pytest plugins the
        // corpus keeps finding.
        obs("pytest-mock", "dep:pypi:pytest_mock"),
        obs("pytest-xdist", "dep:pypi:pytest_xdist"),
        // Not QA tooling at all.
        obs("@sentry/node", "dep:npm:@sentry/node"),
        obs("@octokit/rest", "dep:npm:@octokit/rest"),
        // An ordinary dependency.
        obs("react", "dep:npm:react"),
      ],
      { census },
    );
    expect(coverage.counts.UNDERSTOOD).toBe(1);
    expect(coverage.counts.DECLARED).toBe(2);
    expect(coverage.counts.OUT_OF_SCOPE).toBe(2);
    // An ordinary dependency is not reported at all, not reported as a gap.
    expect(coverage.tools.some((t) => t.name === "react")).toBe(false);
    expect(coverage.unhandled.map((t) => t.name).sort()).toEqual([
      "pytest-mock",
      "pytest-xdist",
    ]);
  });

  it("states a consequence for every tool it reports", () => {
    // A tool reported without a cost is a list, not an answer.
    const coverage = assessToolCoverage(
      [
        obs("pytest-mock", "dep:pypi:pytest_mock"),
        obs("@sentry/node", "dep:npm:@sentry/node"),
      ],
      { census },
    );
    for (const tool of coverage.tools) {
      expect(tool.consequence.length, tool.name).toBeGreaterThan(20);
    }
    expect(
      coverage.tools.find((t) => t.name === "pytest-mock")?.consequence,
    ).toMatch(/not analysed/);
  });

  it("produces a statement a surface can render verbatim", () => {
    const coverage = assessToolCoverage(
      [
        {
          ...obs("playwright", "dep:npm:playwright"),
          censusId: "ec.component-e2e.playwright",
        },
        obs("pytest-mock", "dep:pypi:pytest_mock"),
      ],
      { census },
    );
    expect(coverage.statement).toMatch(/1 analysed/);
    expect(coverage.statement).toMatch(/1 detected but not analysed/);
    expect(coverage.statement).toMatch(/blind spots/);
  });

  it("says plainly when nothing was analysed, rather than rendering an empty table", () => {
    const coverage = assessToolCoverage([obs("react", "dep:npm:react")], {
      census,
    });
    expect(coverage.statement).toMatch(/nothing here was analysed/);
  });

  it("deduplicates a tool seen in several places", () => {
    const coverage = assessToolCoverage(
      [
        obs("pytest-mock", "dep:pypi:pytest_mock"),
        obs("pytest-mock", "dep:pypi:pytest-mock"),
      ],
      { census },
    );
    expect(coverage.tools.filter((t) => t.name === "pytest-mock")).toHaveLength(
      1,
    );
  });
});

describe("tool coverage — the part nobody can infer", () => {
  it("always states its blind spots, even for a clean repository", () => {
    // A blind spot that appears only when a tool is present is a blind
    // spot nobody looks for. They are unconditional.
    const coverage = assessToolCoverage([], { census });
    expect(coverage.blindSpots).toEqual(BLIND_SPOTS);
    expect(coverage.complete).toBe(false);
  });

  it("names mocked assertions first, because that is the expensive blind spot", () => {
    expect(BLIND_SPOTS[0]?.id).toBe("mocked-assertions");
    expect(BLIND_SPOTS[0]?.consequence).toMatch(/false proof/);
  });

  it("gives every blind spot an id and a stated cost", () => {
    for (const spot of BLIND_SPOTS) {
      expect(spot.id).toBeTruthy();
      expect(spot.blindTo.length, spot.id).toBeGreaterThan(10);
      expect(spot.consequence.length, spot.id).toBeGreaterThan(30);
    }
  });

  it("never claims completeness", () => {
    // This is the one claim a verification tool must not make, so it is
    // typed as the literal `false` and asserted rather than computed.
    const coverage = assessToolCoverage([], { census });
    expect(coverage.complete).toBe(false);
  });
});

describe("tool coverage — carries the double roll-up when tests are supplied", () => {
  it("reports a hollow suite", () => {
    const doubles = doublesFromTests([
      normalize({ dialect: "ts", assertionLabels: ["toHaveBeenCalled"] }),
      normalize({ dialect: "ts", assertionLabels: [] }),
    ]);
    const coverage = assessToolCoverage([], { census, doubles });
    expect(coverage.suite?.verdict).toBe("HOLLOW");
    expect(coverage.suite?.hollow).toBe(2);
  });

  it("reports a substantiated suite", () => {
    const doubles = doublesFromTests([
      normalize({ dialect: "ts", assertionLabels: ["toBe", "toMatch"] }),
    ]);
    expect(assessToolCoverage([], { census, doubles }).suite?.verdict).toBe(
      "SUBSTANTIATED",
    );
  });

  it("is null when no test data was supplied, rather than an empty verdict", () => {
    // `null` means "not computed". An empty suite roll-up would read as
    // "zero hollow tests", which is a claim nobody made.
    expect(assessToolCoverage([], { census }).suite).toBeNull();
  });
});

describe("tool coverage — the states are closed", () => {
  it("declares exactly four states", () => {
    expect(TOOL_COVERAGE_STATES).toEqual([
      "UNDERSTOOD",
      "DECLARED",
      "OUT_OF_SCOPE",
      "IGNORED",
    ]);
  });

  it("orders the report by what the engine can do, not alphabetically", () => {
    const coverage = assessToolCoverage(
      [
        // Alphabetically last, but the one thing the engine can act on.
        obs("msw", "dep:npm:msw"),
        {
          ...obs("playwright", "dep:npm:playwright"),
          censusId: "ec.component-e2e.playwright",
        },
        obs("@sentry/node", "dep:npm:@sentry/node"),
      ],
      { census },
    );
    expect(coverage.tools.map((t) => t.state)).toEqual([
      "UNDERSTOOD",
      "DECLARED",
      "OUT_OF_SCOPE",
    ]);
    // And the order is the states, not the names.
    expect(coverage.tools.map((t) => t.name)).toEqual([
      "playwright",
      "msw",
      "@sentry/node",
    ]);
  });
});
