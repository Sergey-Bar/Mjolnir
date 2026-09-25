import { describe, expect, it } from "vitest";

import {
  CLAIM_BINDING_PATTERN,
  CLAIM_PATTERNS,
  EXEMPT_SURFACES,
  PUBLIC_SURFACES,
  applyExemptions,
  extractBindings,
  isBound,
  listPublicFiles,
  scanText,
} from "../../src/v6/claim-lint.js";
import { validateBindings } from "../../scripts/v6/check-claims-prose.js";
import { checkClaimBudget } from "../../scripts/v6/check-claim-budget.js";
import { MATURITY_LEVELS } from "../../src/v6/maturity.js";

const CANDIDATE = {
  location: "README.md:1",
  surface: "README.md",
  kind: "readme" as const,
  patternId: "count-of-rules",
  severity: "BANNED" as const,
  text: "79 rules",
  line: 1,
};

describe("P4 — the lint catches the claim shapes §94 actually names", () => {
  it("catches a published rule count", () => {
    const found = scanText(
      "Mjolnir ships 79 rules today.",
      "README.md",
      "readme",
    );
    expect(found.map((f) => f.patternId)).toContain("count-of-rules");
  });

  it("catches a language or framework count", () => {
    const found = scanText(
      "Coverage spans 5 languages.",
      "README.md",
      "readme",
    );
    expect(found.map((f) => f.patternId)).toContain(
      "count-of-frameworks-languages",
    );
  });

  it("catches a download or install figure", () => {
    const found = scanText(
      "120k weekly downloads and counting.",
      "README.md",
      "readme",
    );
    expect(found.map((f) => f.patternId)).toContain(
      "download-or-install-count",
    );
  });

  it("catches a hand-written enumeration of supported frameworks", () => {
    const found = scanText(
      "Works with Jest, Vitest and Playwright out of the box.",
      "README.md",
      "readme",
    );
    expect(found.map((f) => f.patternId)).toContain(
      "framework-support-enumeration",
    );
  });

  it("catches a completeness claim and a universality claim", () => {
    expect(
      scanText(
        "Complete coverage of your pipeline.",
        "README.md",
        "readme",
      ).map((f) => f.patternId),
    ).toContain("completeness-superlative");
    expect(
      scanText("Supports all QA frameworks.", "README.md", "readme").map(
        (f) => f.patternId,
      ),
    ).toContain("universality-claim");
  });

  it("catches an unbound proof word", () => {
    const found = scanText(
      "Every rule is PROVEN accurate.",
      "README.md",
      "readme",
    );
    expect(found.map((f) => f.patternId)).toContain("proof-word-unbound");
  });

  it("does not flag ordinary prose", () => {
    expect(
      scanText(
        "Run the scan locally; nothing leaves your machine.",
        "README.md",
        "readme",
      ),
    ).toEqual([]);
  });

  it("gives every pattern an id, a rationale and a severity", () => {
    const ids = CLAIM_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pattern of CLAIM_PATTERNS) {
      expect(["BANNED", "BOUNDED"]).toContain(pattern.severity);
      expect(pattern.rationale.length).toBeGreaterThanOrEqual(20);
    }
  });
});

describe("P4 — a global pattern does not skip matches on a later line", () => {
  it("finds every occurrence, not just the first per file", () => {
    // A global RegExp carries `lastIndex` across calls, so a naive scanner
    // silently under-reports. An under-reporting honesty gate is worse
    // than none, because it looks like a pass.
    const text = ["79 rules here", "nothing here", "also 80 rules"].join("\n");
    const found = scanText(text, "README.md", "readme");
    expect(found.filter((f) => f.patternId === "count-of-rules")).toHaveLength(
      2,
    );
  });

  it("reports the line each finding is on, twice for the same line", () => {
    const found = scanText(
      "120k downloads and 79 rules",
      "README.md",
      "readme",
    );
    expect(found.every((f) => f.line === 1)).toBe(true);
    expect(new Set(found.map((f) => f.patternId)).size).toBe(found.length);
  });
});

describe("P4 — exemptions are declared, not sprinkled through the scan", () => {
  it("exempts the changelog, because a historical release note is not a present claim", () => {
    const findings = scanText(
      "79 rules shipped in this release.",
      "CHANGELOG.md",
      "changelog",
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(applyExemptions(findings)).toEqual([]);
  });

  it("exempts ADRs, because quoting the forbidden vocabulary is not a claim", () => {
    const findings = scanText(
      "We ban 79 rules in the README.",
      "docs/adr/0001-x.md",
      "doc",
    );
    expect(applyExemptions(findings)).toEqual([]);
  });

  it("does not exempt an ordinary doc", () => {
    const findings = scanText(
      "We ship 79 rules.",
      "docs/ARCHITECTURE.md",
      "doc",
    );
    expect(applyExemptions(findings).length).toBe(findings.length);
  });

  it("gives every exemption a stated reason", () => {
    for (const exempt of EXEMPT_SURFACES) {
      expect(exempt.reason.length).toBeGreaterThanOrEqual(20);
    }
  });
});

describe("P4 — a bound claim is a resolvable binding, not a comment", () => {
  const line =
    "<!-- claim:rule-registry-census maturity=M2 proof=npm run docs:capability -->";

  it("extracts the registry id, the maturity and the proof command", () => {
    const [binding] = extractBindings(line);
    expect(binding?.registryId).toBe("rule-registry-census");
    expect(binding?.maturity).toBe("M2");
    expect(binding?.proofCommand).toBe("npm run docs:capability");
    expect(binding?.line).toBe(1);
  });

  it("treats a bound line as no longer a finding", () => {
    const bound = new Set(["README.md:3"]);
    expect(isBound({ ...CANDIDATE, line: 3 }, bound)).toBe(true);
    expect(isBound(CANDIDATE, bound)).toBe(false);
  });

  it("rejects a binding to an unknown claim id", () => {
    const problems = validateBindings(
      [
        {
          registryId: "nope",
          maturity: "M2",
          proofCommand: "npm test",
          line: 1,
          surface: "README.md",
        },
      ],
      new Set(["rule-registry-census"]),
    );
    expect(problems[0]?.reason).toMatch(/does not exist/);
  });

  it("rejects a binding whose maturity is off the M0-M5 ladder", () => {
    // ADR 0001: L0-L5 is the trust level and is not a maturity. A binding
    // to `L4` is a category error, not a valid claim.
    const problems = validateBindings(
      [
        {
          registryId: "rule-registry-census",
          maturity: "L4",
          proofCommand: "npm test",
          line: 1,
          surface: "README.md",
        },
      ],
      new Set(["rule-registry-census"]),
    );
    expect(problems.some((p) => p.reason.includes("M0-M5"))).toBe(true);
  });

  it("rejects a binding with no proof command", () => {
    const problems = validateBindings(
      [
        {
          registryId: "rule-registry-census",
          maturity: "M2",
          proofCommand: "  ",
          line: 1,
          surface: "README.md",
        },
      ],
      new Set(["rule-registry-census"]),
    );
    expect(problems.some((p) => p.reason.includes("no proof command"))).toBe(
      true,
    );
  });

  it("accepts a fully resolvable binding", () => {
    expect(
      validateBindings(
        [
          {
            registryId: "rule-registry-census",
            maturity: "M4_CORPUS_VERIFIED",
            // A command that actually exists. The obvious example for an
            // M4 binding is `rules:quality:check`, which the v6 blueprint
            // schedules for Wave 4 and which therefore does not exist yet —
            // and a fixture that names a non-existent command teaches the
            // exact thing this gate exists to catch. The repo's own
            // `docs-consistency` test caught this the first time.
            proofCommand: "npm run typecheck",
            line: 1,
            surface: "README.md",
          },
        ],
        new Set(["rule-registry-census"]),
      ),
    ).toEqual([]);
  });

  it("uses a fixed marker syntax, so a binding cannot be written by accident", () => {
    expect(CLAIM_BINDING_PATTERN.source).toMatch(/claim:/);
    expect(extractBindings("claim: x maturity=M2 proof=y")).toEqual([]);
  });
});

describe("P4 — the budget is a ratchet, not a boolean", () => {
  const budget = {
    schemaVersion: 1 as const,
    artifact: "claim-budget" as const,
    maxUnbound: 10,
    lastReducedAt: "2026-01-01",
    target: 0,
    exceptions: [],
    history: [],
  };

  it("passes when the count is at or under the budget", () => {
    expect(checkClaimBudget(".", budget, 10).status).toBe("PASS");
    expect(checkClaimBudget(".", budget, 3).status).toBe("PASS");
  });

  it("fails when the count rises above the budget", () => {
    const check = checkClaimBudget(".", budget, 11);
    expect(check.status).toBe("FAIL");
    expect(check.errors.join(" ")).toMatch(/rose to 11/);
  });

  it("reports a count above the target without failing, so a fresh ratchet can arm", () => {
    // A gate that fails on its own first run is a gate people disable.
    const check = checkClaimBudget(".", budget, 10);
    expect(check.status).toBe("PASS");
    expect(check.facts.converging).toBe(false);
    expect(check.warnings.join(" ")).toMatch(/declared target/);
  });

  it("fails an expired exception, because the constitution has no permanent waiver", () => {
    const check = checkClaimBudget(
      ".",
      {
        ...budget,
        exceptions: [
          {
            reason: "a debt slice",
            owner: "team",
            expiresAt: "2000-01-01",
            permitsUpTo: 20,
          },
        ],
      },
      10,
    );
    expect(check.status).toBe("FAIL");
    expect(check.errors.join(" ")).toMatch(/expired/);
  });

  it("accepts a live exception", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const check = checkClaimBudget(
      ".",
      {
        ...budget,
        exceptions: [
          {
            reason: "a debt slice",
            owner: "team",
            expiresAt: future,
            permitsUpTo: 20,
          },
        ],
      },
      10,
    );
    expect(check.status).toBe("PASS");
    expect(check.facts.liveExceptions).toBe(1);
  });

  it("fails when the target is above the budget, i.e. the ratchet points the wrong way", () => {
    const check = checkClaimBudget(".", { ...budget, target: 99 }, 10);
    expect(check.status).toBe("FAIL");
    expect(check.errors.join(" ")).toMatch(/pointed the wrong way/);
  });
});

describe("P4 — the surface list is explicit", () => {
  it("declares the surfaces a public claim can hide in", () => {
    const paths = PUBLIC_SURFACES.map((s) => s.path);
    expect(paths).toContain("README.md");
    expect(paths).toContain("docs/rules");
  });

  it("finds the locale READMEs, including a three-letter locale", () => {
    // `zht` is a real locale in this repository. A narrower pattern would
    // silently skip it, and a linter with an unknown locale coverage is
    // exactly the problem this module exists to remove.
    const files = listPublicFiles(process.cwd());
    const locales = files.filter((f) => f.kind === "locale-readme");
    // 22 locales + `README.md` itself is scanned as the primary readme.
    expect(locales.length).toBe(22);
    expect(locales.some((f) => f.file === "README.zht.md")).toBe(true);
    expect(locales.some((f) => f.file === "README.ar.md")).toBe(true);
  });

  it("keeps the maturity ladder the one the binding must use", () => {
    for (const level of MATURITY_LEVELS) expect(level).toMatch(/^M[0-5]_/);
  });
});
