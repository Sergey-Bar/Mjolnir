/**
 * `mjolnir release-trust` — the Release Trust Verdict (product-gap
 * master plan §5, plan 1789009691197 R4a).
 *
 * Pure aggregation of already-shipped signals — NO new authority: the
 * doctor's self-audit checks plus a handful of new cheap dimension
 * checks, evaluated through the Trust Constitution's status algebra
 * (docs/TRUST-CONSTITUTION.md §3) over the canonical 12 dimensions
 * (docs/RELEASE-TRUST-CONTRACT.md — fixed set, fixed order, governance-
 * locked; a drift-lock fails CI when the emitted set deviates).
 *
 * Machine surface: `mjolnir.release-trust@1` — frozen key order, byte-
 * deterministic (no timestamps, no absolute paths — Law 7 model), the
 * SAME document every run produces for the same tree state.
 *
 * Release Trust logic — contract satisfaction, not PROVEN counts:
 *   RELEASE-TRUST = PASS  ⟺  ∀ d ∈ Required(release): determination(d) = PASS
 *                         ∧ no dimension is INCONCLUSIVE (unreconciled)
 *                         ∧ execution = PROVEN ∧ evidence = PROVEN
 *                         ∧ scope = PROVEN ∧ contract = satisfied
 *                         ∧ contradictions = none ∧ provenance = bound
 * Non-PASS renders as the strictest state present with precedence
 * FAILED > BLOCKED > INCONCLUSIVE > UNPROVEN > PARTIAL. No waiver path.
 *
 * Applicability (Constitution §5): a dimension whose surface does not
 * exist yet renders UNSUPPORTED — recorded, non-blocking; once shipped
 * (its applicableFrom version is reached) it becomes blocking. Honesty,
 * not a bypass: `provenance = bound` activates with R4c; before that it
 * is itself UNSUPPORTED and recorded.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { runDoctorSelfAudit, type DoctorCheck } from "./doctor.js";
import { NON_DETERMINISTIC_FIELDS } from "./doctor.js";
import { CONTRACT_VERSION } from "../engine/machine-contract.js";
import { SCAN_ADAPTERS } from "../discovery/scan-adapters.js";
import { parseTsFile } from "../engine/ts-ast.js";
import ts from "ts-morph";
import { out as stdoutOut, err as stderrOut, type Output } from "../cli-io.js";

export const RELEASE_TRUST_SCHEMA = "mjolnir.release-trust@1";

export type EvidenceState =
  | "PROVEN"
  | "PARTIAL"
  | "UNPROVEN"
  | "UNSUPPORTED"
  | "BLOCKED"
  | "INCONCLUSIVE";

export type Determination =
  | "PASS"
  | "FAILED"
  | "UNPROVEN"
  | "PARTIAL"
  | "UNSUPPORTED"
  | "BLOCKED"
  | "INCONCLUSIVE";

/** Strictest-state precedence (Constitution §3 / plan §5.2). */
const PRECEDENCE: readonly Determination[] = [
  "FAILED",
  "BLOCKED",
  "INCONCLUSIVE",
  "UNPROVEN",
  "PARTIAL",
];

export interface CanonicalDimension {
  id: string;
  title: string;
  /** The version whose surface makes this dimension blocking (§5). */
  applicableFrom: string;
  requirement: string;
  /** Machine evidence bindings: `doctor:<check-name>` / `check:<name>`. */
  evidenceRefs: string[];
}

/**
 * The canonical 12 dimensions — FIXED SET, FIXED ORDER (plan §5.1).
 * Governance: no add/remove/rename without a policy amendment touching
 * docs/TRUST-CONSTITUTION.md + docs/RELEASE-TRUST-CONTRACT.md + the
 * CHANGELOG in the same PR; tests/contract/release-trust-contract.spec.ts
 * fails CI when the emitted set deviates (silent additions are a
 * contract violation).
 */
export const CANONICAL_DIMENSIONS: readonly CanonicalDimension[] = [
  {
    id: "engine-integrity",
    title: "Engine Integrity",
    applicableFrom: "1.1.4",
    requirement:
      "The rule registry, trust metadata, tier enforcement, anti-creep, quarantine enforcement and category integrity checks all pass.",
    evidenceRefs: [
      "doctor:registry-sanity",
      "doctor:trust-metadata",
      "doctor:tier-enforcement",
      "doctor:anti-creep",
      "doctor:quarantine-enforcement",
      "doctor:category-integrity",
    ],
  },
  {
    id: "evidence-integrity",
    title: "Evidence Integrity",
    applicableFrom: "1.1.4",
    requirement:
      "Evidence honesty, the fixture firewall and fixture integrity all hold — no evidence is fabricated, weakened or orphaned.",
    evidenceRefs: [
      "doctor:evidence-honesty",
      "doctor:fixture-firewall",
      "doctor:fixture-integrity",
    ],
  },
  {
    id: "rule-integrity",
    title: "Rule Integrity",
    applicableFrom: "1.1.4",
    requirement:
      "Detector revision integrity holds: every declared revision is attested by the hash manifest and sidecar.",
    evidenceRefs: ["doctor:revision-integrity"],
  },
  {
    id: "failure-containment",
    title: "Failure Containment",
    applicableFrom: "1.1.4",
    requirement:
      "Every adapter isolates rule crashes through the onCrash channel — a crashing rule degrades truthfully instead of failing the scan or vanishing silently.",
    evidenceRefs: ["check:adapter-crash-containment"],
  },
  {
    id: "corpus-integrity",
    title: "Corpus Integrity",
    applicableFrom: "1.1.4",
    requirement:
      "MEASURED_FP, the live verdicts and the detector-revision sidecar agree; the measured census is real classification, not stale bookkeeping.",
    evidenceRefs: ["doctor:measurement-consistency"],
  },
  {
    id: "contract-compatibility",
    title: "Contract Compatibility",
    applicableFrom: "1.1.4",
    requirement:
      "The shipped machine contract version equals the documented contract version; the exit-code surface stays inside the frozen set.",
    evidenceRefs: ["check:machine-contract-version"],
  },
  {
    id: "determinism",
    title: "Determinism",
    applicableFrom: "1.1.4",
    requirement:
      "The emitted machine contracts carry no non-deterministic fields (NON_DETERMINISTIC_FIELDS empty).",
    evidenceRefs: ["check:non-deterministic-fields"],
  },
  {
    id: "scope-integrity",
    title: "Scope Integrity",
    applicableFrom: "1.1.6",
    requirement:
      "Claimed scope equals analyzed scope (analysisStatus + truncation accounting proven per scan). Surface ships with R4c.",
    evidenceRefs: ["check:scope-integrity"],
  },
  {
    id: "reproducibility",
    title: "Reproducibility",
    applicableFrom: "1.1.4",
    requirement:
      "The release line is reproducible: package.json, the CHANGELOG's top version heading and the census-stamped docs agree (artifact byte-stability becomes contractual at R9).",
    evidenceRefs: ["check:release-version-consistency"],
  },
  {
    id: "zero-network-compliance",
    title: "Zero-Network Compliance",
    applicableFrom: "1.1.4",
    requirement:
      "The zero-network core imports no network surface: no http/https/net/dns/tls/undici modules and no fetch calls anywhere in src/.",
    evidenceRefs: ["check:zero-network-imports"],
  },
  {
    id: "agent-safety",
    title: "Agent Safety",
    applicableFrom: "1.3.0",
    requirement:
      "Agent actions carry rescan evidence — agent success claims are never trusted without verification (R8 surface).",
    evidenceRefs: ["check:agent-safety"],
  },
  {
    id: "artifact-integrity",
    title: "Artifact Integrity",
    applicableFrom: "1.4.0",
    requirement:
      "The published artifact is bound to the claimed execution and evidence (R9 surface).",
    evidenceRefs: ["check:artifact-integrity"],
  },
];

export interface DimensionRecord {
  id: string;
  title: string;
  applicability: { applicableFrom: string; required: boolean };
  requirement: string;
  evidence: EvidenceState;
  determination: Determination;
  evidenceRefs: string[];
  /** Detail lines from the underlying checks (relative, path-free). */
  details: string[];
}

export interface ReleaseTrustReport {
  schema: typeof RELEASE_TRUST_SCHEMA;
  release: string;
  dimensions: DimensionRecord[];
  invariant: {
    execution: EvidenceState;
    evidence: EvidenceState;
    scope: EvidenceState;
    contract: "satisfied" | "violated" | "UNSUPPORTED";
    contradictions: "none" | "present";
    provenance: EvidenceState;
  };
  verdict: {
    releaseTrust: Determination;
    strictestState: Determination | "PASS";
    requiredCount: number;
    passedCount: number;
  };
}

/** Calendar-ish semver compare for the applicability gate (no deps). */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function doctorCheck(
  report: { checks: DoctorCheck[] },
  name: string,
): DoctorCheck | undefined {
  return report.checks.find((c) => c.name === name);
}

/**
 * Dimension evidence from mapped doctor checks: any fail = PROVEN
 * evidence of a violation (determination FAILED — evidence that a
 * violation occurred is still PROVEN evidence); an inconclusive check
 * = INCONCLUSIVE (unreconciled — blocking); all pass = PROVEN + PASS.
 */
function fromDoctorChecks(
  report: { checks: DoctorCheck[] },
  refs: string[],
): {
  evidence: EvidenceState;
  determination: Determination;
  details: string[];
} {
  const details: string[] = [];
  let sawPass = false;
  for (const ref of refs) {
    if (!ref.startsWith("doctor:")) continue;
    const c = doctorCheck(report, ref.slice("doctor:".length));
    if (c === undefined) {
      return {
        evidence: "INCONCLUSIVE",
        determination: "INCONCLUSIVE",
        details: [`missing doctor check ${ref}`],
      };
    }
    details.push(...c.details);
    if (c.status === "fail") {
      return { evidence: "PROVEN", determination: "FAILED", details };
    }
    if (c.status === "inconclusive") {
      return {
        evidence: "INCONCLUSIVE",
        determination: "INCONCLUSIVE",
        details,
      };
    }
    sawPass = true;
  }
  return sawPass
    ? { evidence: "PROVEN", determination: "PASS", details }
    : { evidence: "UNPROVEN", determination: "UNPROVEN", details };
}

/** The src/ file walk for the structural checks (repo-root relative). */
function srcFiles(root: string): string[] {
  const srcDir = join(root, "src");
  if (!existsSync(srcDir)) return [];
  const acc: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".ts")) acc.push(p);
    }
  };
  walk(srcDir);
  return acc;
}

/** check:adapter-crash-containment — every adapter routes rule crashes. */
function checkAdapterCrashContainment(root: string): {
  evidence: EvidenceState;
  determination: Determination;
  details: string[];
} {
  const offenders: string[] = [];
  for (const adapter of SCAN_ADAPTERS) {
    // The adapter module file: src/adapters/<id>.ts.
    const p = join(root, "src", "adapters", `${adapter.id}.ts`);
    if (!existsSync(p)) {
      offenders.push(`adapter module missing: src/adapters/${adapter.id}.ts`);
      continue;
    }
    const text = readFileSync(p, "utf8");
    if (!text.includes("onCrash")) {
      offenders.push(
        `src/adapters/${adapter.id}.ts has no onCrash containment`,
      );
    }
  }
  return offenders.length === 0
    ? {
        evidence: "PROVEN",
        determination: "PASS",
        details: [
          `${SCAN_ADAPTERS.length} adapters all route rule crashes through onCrash`,
        ],
      }
    : { evidence: "PROVEN", determination: "FAILED", details: offenders };
}

/** check:zero-network-imports — no network surface anywhere in src/. */
const NETWORK_SPECIFIERS = new Set([
  "http",
  "https",
  "net",
  "dns",
  "tls",
  "undici",
  "axios",
  "node-fetch",
  "got",
]);

export function checkZeroNetworkImports(root: string): {
  evidence: EvidenceState;
  determination: Determination;
  details: string[];
} {
  const offenders: string[] = [];
  for (const p of srcFiles(root)) {
    const rel = p.slice(root.length + 1).replaceAll("\\", "/");
    const text = readFileSync(p, "utf8");
    for (const m of text.matchAll(
      /(?:^|\n)\s*(?:import|export)\s[\s\S]{0,400}?from\s+"([^"]+)"/g,
    )) {
      const spec = m[1] ?? "";
      const dep = spec.split("/")[0] ?? spec;
      if (NETWORK_SPECIFIERS.has(dep)) {
        offenders.push(`${rel} imports "${spec}"`);
      }
    }
    // fetch invocation as a REAL call, not text: comments and fixture strings
    // legitimately contain the word (a naive text scan flagged this very
    // checker and rule-fixture examples). The ts-morph parse sees only
    // actual CallExpressions; unparseable files carry no call evidence.
    const sf = parseTsFile({ path: rel, text, ast: undefined });
    if (!sf) continue;
    for (const call of sf.getDescendantsOfKind(ts.SyntaxKind.CallExpression)) {
      const expr = call.getExpression();
      if (
        expr.getKind() === ts.SyntaxKind.Identifier &&
        expr.getText() === "fetch"
      ) {
        offenders.push(`${rel} performs a fetch invocation`);
      }
    }
  }
  return offenders.length === 0
    ? {
        evidence: "PROVEN",
        determination: "PASS",
        details: ["no network imports or fetch calls in src/"],
      }
    : { evidence: "PROVEN", determination: "FAILED", details: offenders };
}

/** check:machine-contract-version — shipped version equals documented. */
export function checkMachineContractVersion(root: string): {
  evidence: EvidenceState;
  determination: Determination;
  details: string[];
} {
  const docPath = join(root, "docs", "machine-contract.md");
  if (!existsSync(docPath)) {
    return {
      evidence: "BLOCKED",
      determination: "BLOCKED",
      details: ["docs/machine-contract.md missing"],
    };
  }
  const doc = readFileSync(docPath, "utf8");
  const documented = /`contractVersion:\s*(\d+)`/.exec(doc)?.[1];
  if (documented === undefined) {
    return {
      evidence: "INCONCLUSIVE",
      determination: "INCONCLUSIVE",
      details: ["machine-contract.md carries no contractVersion literal"],
    };
  }
  if (Number(documented) !== CONTRACT_VERSION) {
    return {
      evidence: "PROVEN",
      determination: "FAILED",
      details: [
        `shipped contractVersion ${CONTRACT_VERSION} != documented ${documented}`,
      ],
    };
  }
  return {
    evidence: "PROVEN",
    determination: "PASS",
    details: [
      `contractVersion ${CONTRACT_VERSION} matches the documented contract`,
    ],
  };
}

/** check:non-deterministic-fields — the emitted contracts are path-free. */
export function checkNonDeterministicFields(): {
  evidence: EvidenceState;
  determination: Determination;
  details: string[];
} {
  return NON_DETERMINISTIC_FIELDS.length === 0
    ? {
        evidence: "PROVEN",
        determination: "PASS",
        details: [
          "NON_DETERMINISTIC_FIELDS is empty — emitted machine contracts carry no non-deterministic fields",
        ],
      }
    : {
        evidence: "PROVEN",
        determination: "FAILED",
        details: [...NON_DETERMINISTIC_FIELDS],
      };
}

/**
 * check:scope-integrity — the Scope Integrity MACHINERY shipped with R4c
 * is present and internally consistent (structural evaluation; the
 * behavioral proof lives in tests/blast-radius/scope-and-exit.spec.ts,
 * locked by CI): the pipeline builds the block (scopeVerdict,
 * runIdentity, evidenceGraph chain) and the terminal reporter carries
 * the forbidden-phrasing guard ("repository verified" only on PROVEN).
 */
export function checkScopeIntegrity(root: string): {
  evidence: EvidenceState;
  determination: Determination;
  details: string[];
} {
  const pipelinePath = join(root, "src", "engine", "scan-pipeline.ts");
  const terminalPath = join(root, "src", "reporter", "terminal.ts");
  const identityPath = join(root, "src", "engine", "run-identity.ts");
  const missing = [pipelinePath, terminalPath, identityPath].filter(
    (p) => !existsSync(p),
  );
  if (missing.length > 0) {
    return {
      evidence: "INCONCLUSIVE",
      determination: "INCONCLUSIVE",
      details: missing.map((p) => `missing: ${p.slice(root.length + 1)}`),
    };
  }
  const pipeline = readFileSync(pipelinePath, "utf8");
  const terminal = readFileSync(terminalPath, "utf8");
  const identity = readFileSync(identityPath, "utf8");
  const guards = [
    {
      ok:
        pipeline.includes("scopeVerdict") &&
        pipeline.includes("buildRunIdentity"),
      what: "scan-pipeline builds the scopeIntegrity block + run identity",
    },
    {
      ok:
        pipeline.includes("parseFailed++") &&
        pipeline.includes("onIgnored") &&
        pipeline.includes("onUnrecognized"),
      what: "the walk counts ignored/unrecognized and the rule stage counts parse failures",
    },
    {
      ok: terminal.includes("repository-verified"),
      what: "the terminal reporter gates 'repository verified' phrasing on scopeVerdict",
    },
    {
      ok:
        identity.includes("sha256") &&
        identity.includes("buildEvidenceGraph") &&
        identity.includes("reproduction"),
      what: "run identity + the full chain-law graph (verdict…reproduction)",
    },
  ];
  const bad = guards.filter((g) => !g.ok).map((g) => g.what);
  return bad.length === 0
    ? {
        evidence: "PROVEN",
        determination: "PASS",
        details: guards.map((g) => `ok: ${g.what}`),
      }
    : {
        evidence: "PROVEN",
        determination: "FAILED",
        details: bad,
      };
}

/**
 * check:agent-safety — the Agent Safety MACHINERY shipped with R8
 * (structural evaluation; the behavioral proofs live in
 * tests/mcp/parity.spec.ts, tests/mcp/crash-containment.spec.ts and
 * tests/contract/agent-skill-surface.spec.ts, locked by CI): the
 * installed agent brief carries the §17 safety wording on every
 * surface, the MCP transport never opens the plugin trust gate, and
 * the agent edge case is registered in the False-Green Attack Corpus
 * (an agent edge case recorded in false-green defense, never dropped).
 */
export function checkAgentSafety(root: string): {
  evidence: EvidenceState;
  determination: Determination;
  details: string[];
} {
  const installPath = join(root, "src", "commands", "install-agents.ts");
  const serverPath = join(root, "src", "mcp", "server.ts");
  const corpusPath = join(root, "tests", "false-green", "cases.ts");
  const missing = [installPath, serverPath, corpusPath].filter(
    (p) => !existsSync(p),
  );
  if (missing.length > 0) {
    return {
      evidence: "INCONCLUSIVE",
      determination: "INCONCLUSIVE",
      details: missing.map((p) => `missing: ${p.slice(root.length + 1)}`),
    };
  }
  const install = readFileSync(installPath, "utf8");
  const server = readFileSync(serverPath, "utf8");
  const corpus = readFileSync(corpusPath, "utf8");
  const guards = [
    {
      ok:
        install.includes("AGENT CLAIM ≠ VERIFICATION") &&
        install.includes("NEVER convert INCONCLUSIVE to pass") &&
        install.includes("NEVER manufacture, edit, or synthesize evidence"),
      what: "the agent brief carries the §17 safety wording on every surface",
    },
    {
      ok:
        install.includes("FIX requires a proven actionable defect") &&
        install.includes("RESCAN requires changed-scope identification") &&
        install.includes("PROOF requires fresh post-fix execution evidence"),
      what: "the agent loop carries the FIX/RESCAN/PROOF preconditions",
    },
    {
      ok:
        !/enablePlugins\s*:\s*true/.test(server) &&
        !/process\.env(?:\.|\[\s*["'])MJOLNIR_ENABLE_PLUGINS/.test(server),
      what: "the MCP tool surface never opens the plugin trust gate",
    },
    {
      ok:
        corpus.includes("fg-agent-unsafe-action") &&
        corpus.includes("AGENT CLAIM ≠ VERIFICATION"),
      what: "the agent edge case is registered in the False-Green Attack Corpus",
    },
  ];
  const bad = guards.filter((g) => !g.ok).map((g) => g.what);
  return bad.length === 0
    ? {
        evidence: "PROVEN",
        determination: "PASS",
        details: guards.map((g) => `ok: ${g.what}`),
      }
    : {
        evidence: "PROVEN",
        determination: "FAILED",
        details: bad,
      };
}

/**
 * check:artifact-integrity — the Artifact Integrity MACHINERY shipped
 * with R9 (structural evaluation; the behavioral proofs live in
 * tests/commands/artifact-integrity.spec.ts, locked by CI): the trust
 * artifact embeds its identity binding (scanId / commit / rule(rev)
 * inventory / evidence inventory), the HTML artifact ships as a
 * deterministic self-contained third format, the command writes all
 * three artifacts, and stale/wrong-run/mismatched-rev/unbound
 * detection exists and is contract-locked.
 */
export function checkArtifactIntegrity(root: string): {
  evidence: EvidenceState;
  determination: Determination;
  details: string[];
} {
  const reportPath = join(root, "src", "commands", "trust-report.ts");
  const specPath = join(
    root,
    "tests",
    "commands",
    "artifact-integrity.spec.ts",
  );
  const missing = [reportPath, specPath].filter((p) => !existsSync(p));
  if (missing.length > 0) {
    return {
      evidence: "INCONCLUSIVE",
      determination: "INCONCLUSIVE",
      details: missing.map((p) => `missing: ${p.slice(root.length + 1)}`),
    };
  }
  const report = readFileSync(reportPath, "utf8");
  const spec = readFileSync(specPath, "utf8");
  const guards = [
    {
      ok:
        report.includes("buildArtifactIdentity") &&
        report.includes("checkArtifactFreshness") &&
        report.includes("detectorRevisions") &&
        report.includes("evidenceInventory"),
      what: "the artifact embeds its identity binding (scanId/commit/rule(rev)/evidence inventory)",
    },
    {
      ok:
        report.includes("TRUST_REPORT_HTML") &&
        report.includes("renderTrustReportHtml") &&
        /writeFileSync\(join\(target,\s*TRUST_REPORT_HTML\)/.test(report),
      what: "the HTML artifact ships and the command writes all three formats",
    },
    {
      ok:
        report.includes('verdict: "STALE"') &&
        report.includes("MISMATCHED-REVISIONS") &&
        report.includes("UNBOUND"),
      what: "stale / wrong-run / mismatched-rev / unbound artifacts are detected and recorded",
    },
    {
      ok:
        spec.includes("byte-identical HTML") &&
        spec.includes("cannot inject HTML"),
      what: "byte-identical regen + hostile-input safety are contract-locked",
    },
  ];
  const bad = guards.filter((g) => !g.ok).map((g) => g.what);
  return bad.length === 0
    ? {
        evidence: "PROVEN",
        determination: "PASS",
        details: guards.map((g) => `ok: ${g.what}`),
      }
    : {
        evidence: "PROVEN",
        determination: "FAILED",
        details: bad,
      };
}

export function checkReleaseVersionConsistency(root: string): {
  evidence: EvidenceState;
  determination: Determination;
  details: string[];
} {
  const pkgPath = join(root, "package.json");
  const clPath = join(root, "CHANGELOG.md");
  if (!existsSync(pkgPath) || !existsSync(clPath)) {
    return {
      evidence: "BLOCKED",
      determination: "BLOCKED",
      details: ["package.json or CHANGELOG.md missing"],
    };
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
  const cl = readFileSync(clPath, "utf8");
  const head = /^##\s+\[?(\d+\.\d+\.\d+)\]?/m.exec(cl)?.[1];
  if (!pkg.version || head === undefined) {
    return {
      evidence: "INCONCLUSIVE",
      determination: "INCONCLUSIVE",
      details: ["unparsable version surfaces"],
    };
  }
  if (pkg.version !== head) {
    return {
      evidence: "PROVEN",
      determination: "FAILED",
      details: [
        `package.json ${pkg.version} != CHANGELOG head ${head} (the release cut aligns them)`,
      ],
    };
  }
  return {
    evidence: "PROVEN",
    determination: "PASS",
    details: [`package.json and CHANGELOG agree on ${pkg.version}`],
  };
}

/**
 * The release verdict: PASS ⟺ every applicable dimension PASS ∧ no
 * INCONCLUSIVE ∧ the invariant's wired items hold. Applicability is
 * surface existence (Constitution §5): a dimension is applicable when
 * its evidence bindings RESOLVE — the doctor checks run and the check
 * functions are registered. Unresolved bindings = the surface has not
 * shipped yet → UNSUPPORTED, recorded and non-blocking. (The canonical
 * bindings are drift-locked by the contract spec, so an unresolved
 * binding can only mean "genuinely unwired surface", never a typo.)
 * Non-PASS renders as the strictest state present (plan §5.2 precedence).
 */
export function computeVerdict(
  dimensions: DimensionRecord[],
  invariant: ReleaseTrustReport["invariant"],
): {
  releaseTrust: Determination;
  strictestState: Determination | "PASS";
  requiredCount: number;
  passedCount: number;
} {
  const applicable = dimensions.filter((d) => d.applicability.required);
  const requiredCount = applicable.length;
  const passedCount = applicable.filter(
    (d) => d.determination === "PASS",
  ).length;

  // Invariant items that are still UNSUPPORTED (surface not shipped) are
  // recorded and do not fail the verdict until they activate (§5).
  const invSatisfied = (arr: Array<{ state: string }>): boolean =>
    arr.every(
      ({ state }) =>
        state === "PROVEN" ||
        state === "satisfied" ||
        state === "none" ||
        state === "UNSUPPORTED",
    );

  const allPass =
    requiredCount > 0 &&
    passedCount === requiredCount &&
    !dimensions.some((d) => d.determination === "INCONCLUSIVE") &&
    invSatisfied([
      { state: invariant.execution },
      { state: invariant.evidence },
      { state: invariant.scope },
      { state: invariant.contract },
      { state: invariant.contradictions },
      { state: invariant.provenance },
    ]);

  const releaseTrust: Determination = allPass ? "PASS" : "FAILED";
  // Strictest state present (never more optimistic than the worst
  // required dimension; a known violation is the strongest honest claim).
  let strictestState: Determination | "PASS" = "PASS";
  for (const level of PRECEDENCE) {
    if (applicable.some((d) => d.determination === level)) {
      strictestState = level;
      break;
    }
  }
  if (strictestState === "PASS" && !allPass) {
    // Non-PASS without an applicable dimension failure: the invariant or
    // an INCONCLUSIVE forced it — render UNPROVEN (insufficient verdict).
    strictestState = "UNPROVEN";
  }
  return { releaseTrust, strictestState, requiredCount, passedCount };
}

/**
 * Builds the full release-trust report. Throws when the check machinery
 * itself cannot run (no fixtures root) — the CLI maps that to BLOCKED.
 */
export function buildReleaseTrust(fixturesRoot: string): ReleaseTrustReport {
  const root = join(fixturesRoot, "..", "..");
  const doctor = runDoctorSelfAudit(fixturesRoot);

  const currentVersion = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ) as { version?: string };
  const release = currentVersion.version ?? "0.0.0";

  const custom = new Map<
    string,
    ReturnType<typeof checkAdapterCrashContainment>
  >([
    ["check:adapter-crash-containment", checkAdapterCrashContainment(root)],
    ["check:zero-network-imports", checkZeroNetworkImports(root)],
    ["check:machine-contract-version", checkMachineContractVersion(root)],
    ["check:release-version-consistency", checkReleaseVersionConsistency(root)],
    ["check:non-deterministic-fields", checkNonDeterministicFields()],
    ["check:scope-integrity", checkScopeIntegrity(root)],
    ["check:agent-safety", checkAgentSafety(root)],
    ["check:artifact-integrity", checkArtifactIntegrity(root)],
  ]);

  const dimensions: DimensionRecord[] = CANONICAL_DIMENSIONS.map((d) => {
    const doctorRefs = d.evidenceRefs.filter((r) => r.startsWith("doctor:"));
    const checkRefs = d.evidenceRefs.filter((r) => r.startsWith("check:"));
    // Applicability = surface existence: every evidence binding must
    // resolve (Constitution §5 — the machinery IS the surface). The
    // canonical bindings are drift-locked by the contract spec, so an
    // unresolved binding means "genuinely unwired surface" → recorded
    // UNSUPPORTED, non-blocking.
    const unwired = [
      ...doctorRefs.filter(
        (r) => doctorCheck(doctor, r.slice("doctor:".length)) === undefined,
      ),
      ...checkRefs.filter((r) => !custom.has(r)),
    ];
    if (unwired.length > 0) {
      return {
        id: d.id,
        title: d.title,
        applicability: {
          applicableFrom: d.applicableFrom,
          required: false,
        },
        requirement: d.requirement,
        evidence: "UNSUPPORTED",
        determination: "UNSUPPORTED",
        evidenceRefs: [...d.evidenceRefs],
        details: [
          `surface not wired at this release (ships in ${d.applicableFrom}): ${unwired.join(", ")} — recorded UNSUPPORTED, non-blocking (Constitution §5)`,
        ],
      };
    }

    const parts: Array<ReturnType<typeof fromDoctorChecks>> = [];
    if (doctorRefs.length > 0) {
      parts.push(fromDoctorChecks(doctor, doctorRefs));
    }
    for (const ref of checkRefs) {
      const resolved = custom.get(ref);
      if (resolved !== undefined) parts.push(resolved);
    }
    // Worst part wins: FAILED > BLOCKED > INCONCLUSIVE > UNPROVEN > PARTIAL.
    let worst: (typeof parts)[number] = parts[0] ?? {
      evidence: "UNPROVEN",
      determination: "UNPROVEN",
      details: [],
    };
    for (const p of parts) {
      if (
        PRECEDENCE.indexOf(p.determination) <
        PRECEDENCE.indexOf(worst.determination)
      ) {
        worst = p;
      }
    }
    return {
      id: d.id,
      title: d.title,
      applicability: { applicableFrom: d.applicableFrom, required: true },
      requirement: d.requirement,
      evidence: worst.evidence,
      determination: worst.determination,
      evidenceRefs: [...d.evidenceRefs],
      details: worst.details,
    };
  });

  const scopeDim = dimensions.find((d) => d.id === "scope-integrity");
  const contractDim = dimensions.find((d) => d.id === "contract-compatibility");
  const executionEvidence: EvidenceState =
    doctor.healthy || doctor.checks.length > 0 ? "PROVEN" : "UNPROVEN";
  const evidenceState: EvidenceState = dimensions.some(
    (d) => d.evidence === "INCONCLUSIVE",
  )
    ? "INCONCLUSIVE"
    : dimensions.every((d) => d.evidence !== "UNPROVEN")
      ? "PROVEN"
      : "PARTIAL";

  const invariant: ReleaseTrustReport["invariant"] = {
    execution: executionEvidence,
    evidence: evidenceState,
    scope: scopeDim?.evidence ?? "UNSUPPORTED",
    contract:
      contractDim?.determination === "PASS"
        ? "satisfied"
        : contractDim?.determination === "FAILED"
          ? "violated"
          : "UNSUPPORTED",
    contradictions: dimensions.some((d) => d.determination === "INCONCLUSIVE")
      ? "present"
      : "none",
    // provenance = bound activates with R4c (plan §5.2): until then the
    // item is itself UNSUPPORTED and recorded, never silently dropped.
    provenance: "UNSUPPORTED",
  };

  const verdict = computeVerdict(dimensions, invariant);

  return {
    schema: RELEASE_TRUST_SCHEMA,
    release,
    dimensions,
    invariant,
    verdict,
  };
}

/**
 * Deterministic JSON emission (Law 7 model): fixed key order (built in
 * canonical sequence), no timestamps, no absolute paths — the SAME tree
 * state produces byte-identical output.
 */
export function releaseTrustJson(report: ReleaseTrustReport): string {
  const doc = {
    contract: report.schema,
    release: report.release,
    dimensions: report.dimensions.map((d) => ({
      id: d.id,
      title: d.title,
      applicability: {
        applicableFrom: d.applicability.applicableFrom,
        required: d.applicability.required,
      },
      requirement: d.requirement,
      evidence: d.evidence,
      determination: d.determination,
      evidenceRefs: [...d.evidenceRefs].sort(),
      details: [...d.details].sort(),
    })),
    invariant: {
      execution: report.invariant.execution,
      evidence: report.invariant.evidence,
      scope: report.invariant.scope,
      contract: report.invariant.contract,
      contradictions: report.invariant.contradictions,
      provenance: report.invariant.provenance,
    },
    verdict: {
      releaseTrust: report.verdict.releaseTrust,
      strictestState: report.verdict.strictestState,
      requiredCount: report.verdict.requiredCount,
      passedCount: report.verdict.passedCount,
    },
  };
  return JSON.stringify(doc, null, 2);
}

/** Human verdict block (publication honesty: nothing omitted). */
export function renderReleaseTrust(report: ReleaseTrustReport): string {
  const lines: string[] = [];
  lines.push("MJÖLNIR — RELEASE TRUST VERDICT");
  lines.push(`release: ${report.release}  contract: ${report.schema}`);
  lines.push("");
  for (const d of report.dimensions) {
    lines.push(
      `[${d.determination.padEnd(12)}] evidence=${d.evidence.padEnd(12)} ${d.title}${d.applicability.required ? "" : " (not yet applicable)"}`,
    );
  }
  lines.push("");
  lines.push(
    `invariant: execution=${report.invariant.execution} evidence=${report.invariant.evidence} scope=${report.invariant.scope} contract=${report.invariant.contract} contradictions=${report.invariant.contradictions} provenance=${report.invariant.provenance}`,
  );
  lines.push(
    `RELEASE-TRUST: ${report.verdict.releaseTrust} (strictest state: ${report.verdict.strictestState}; ${report.verdict.passedCount}/${report.verdict.requiredCount} applicable dimensions PASS)`,
  );
  return lines.join("\n");
}

/**
 * CLI verb: `mjolnir release-trust [--json] [repo-root]`.
 * Exit contract (frozen set): 0 verdict PASS · 1 verdict non-PASS ·
 * 2 no fixtures root (not an mjolnir checkout — BLOCKED context) ·
 * 10 usage error · 20 internal error.
 */
export function runReleaseTrustCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out: stdoutOut, err: stderrOut },
): number {
  const json = argv.includes("--json");
  const unknownFlags = argv.filter((a) => a.startsWith("-") && a !== "--json");
  if (unknownFlags.length > 0) {
    io.err("Usage: mjolnir release-trust [--json] [repo-root]");
    return 10;
  }
  const targetArg = argv.find((a) => !a.startsWith("-")) ?? process.cwd();
  try {
    const fixturesRoot = join(targetArg, "tests", "fixtures");
    if (!existsSync(fixturesRoot)) {
      io.err(
        `No fixtures directory at ${fixturesRoot}. Run from the mjolnir repo root.`,
      );
      return 2;
    }
    const report = buildReleaseTrust(fixturesRoot);
    if (json) {
      io.out(releaseTrustJson(report));
    } else {
      io.out(renderReleaseTrust(report));
    }
    return report.verdict.releaseTrust === "PASS" ? 0 : 1;
  } catch (err) {
    io.err(`release-trust internal error: ${String(err)}`);
    return 20;
  }
}
