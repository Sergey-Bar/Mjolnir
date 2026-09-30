/**
 * Task 2.5 — a claim's recency, its digest, and the reason it is blocked.
 *
 * Three things were absent and all three were the same shape: a field that
 * looked load-bearing and held nothing.
 *
 *   1. **No recency budget.** `check-claim-registry.mjs` required `observedAt`
 *      to be present and not `"NONE"`, which `null` satisfies — so every
 *      claim in the registry passed with no observation date at all, and a
 *      2026-06 verdict would have been treated exactly like yesterday's. The
 *      budget pattern already exists in this repository
 *      (`MAX_EVIDENCE_AGE_MS`, `M48_EVIDENCE_MAX_AGE_MS`); it was simply not
 *      applied here.
 *   2. **A dead digest check.** `scripts/revalidate-claims.mjs` verified
 *      digests behind `status === "PROVEN"` — a value absent from the
 *      registry's enum, so the branch never ran on any claim. A dead digest
 *      check is worse than none, because it appears in review as a control.
 *   3. **No `blockedReason`.** All four claims are `BLOCKED`; the prose lived
 *      in `expiry`, which is an event trigger and not a reason, and nothing
 *      said when the block would be revisited.
 *
 * Every mutation is on a fixture registry in a temp directory, run through the
 * real checker with `--today` so the budgets are testable without freezing the
 * clock. An expiry test that depends on the real date stops meaning anything
 * the day after it is written.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECK = join(ROOT, "scripts", "check-claim-registry.mjs");
const REVALIDATE = join(ROOT, "scripts", "revalidate-claims.mjs");

/** A fixed "today" so the age budgets have a definite meaning. */
const TODAY = "2026-09-29";

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A checkout-shaped temp directory holding the registry and the files the
 * checker resolves against it.
 *
 * The checker reads `docs/claim-registry.json`, `package.json`,
 * `candidate-trust-manifest.json` and every path any claim cites, so the
 * fixture copies the registry and the two manifests and SYMLINKS nothing:
 * a claim whose evidence is absent fails for the right reason, which is the
 * state a negative test is trying to create.
 */
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-claim-registry-"));
  scratch.push(dir);
  cpSync(join(ROOT, "docs"), join(dir, "docs"), {
    recursive: true,
    filter: (src) => !src.includes("docs/archive"),
  });
  // The paths claims CITE, not just the two manifests. A claim whose evidence
  // is absent fails for the right reason — and the negative tests here are
  // about recency, not about missing files, so the fixture has to be complete
  // enough that only the intended defect fires. The first version copied four
  // files and every test then failed on `.github/workflows/mjolnir.yml`.
  for (const file of [
    "package.json",
    "candidate-trust-manifest.json",
    "action.yml",
    "smithery.yaml",
    "enterprise/threat-model.json",
    "enterprise/data-flows.json",
  ]) {
    cpSync(join(ROOT, file), join(dir, file), { recursive: true });
  }
  cpSync(
    join(ROOT, ".github", "workflows"),
    join(dir, ".github", "workflows"),
    {
      recursive: true,
    },
  );
  cpSync(
    join(ROOT, "site", ".vitepress", "theme"),
    join(dir, "site", ".vitepress", "theme"),
    {
      recursive: true,
    },
  );
  // The specs claims name as their VERIFIER, and the source files they name as
  // their implementation. The checker resolves every path on a claim, so a
  // fixture without them fails before the defect under test is ever reached.
  //
  // Read through `strings` rather than a `Record<string, unknown>`: the
  // registry is JSON, and a cast to a shaped type would let a claim carry a
  // number where a path belongs without anything noticing.
  function strings(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(strings);
    return [];
  }
  const cited: string[] = [];
  for (const claim of registryOf(ROOT).claims) {
    cited.push(
      ...strings(claim.valueSource),
      ...strings(claim.relatedSources),
      ...strings(claim.implementation),
      ...strings(claim.tests),
      ...strings(claim.corpus),
      ...strings(claim.proof?.verificationTest),
    );
  }
  for (const rel of cited) {
    if (typeof rel !== "string" || rel === "N/A") continue;
    const source = join(ROOT, rel);
    if (!existsSync(source) || !statSync(source).isFile()) continue;
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    cpSync(source, join(dir, rel));
  }
  // The manifest's `candidateSha` is set, because the checker refuses a
  // non-BLOCKED proof on an unproven candidate — a real and separate rule.
  // Left null it fires before any recency check, and every promotion test in
  // this file then failed for a reason that had nothing to do with the defect
  // it was written to observe.
  const manifestPath = join(dir, "candidate-trust-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    identity: Record<string, unknown>;
  };
  manifest.identity["candidateSha"] = "a".repeat(40);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return dir;
}

interface Claim extends Record<string, unknown> {
  id: string;
  proof: Record<string, unknown>;
}

interface FixtureRegistry {
  claims: Claim[];
  [key: string]: unknown;
}

/** The registry as read, typed — `JSON.parse` returns `any`. */
function registryOf(dir: string): FixtureRegistry {
  return JSON.parse(
    readFileSync(join(dir, "docs", "claim-registry.json"), "utf8"),
  ) as FixtureRegistry;
}

function writeRegistry(dir: string, registry: unknown): void {
  writeFileSync(
    join(dir, "docs", "claim-registry.json"),
    JSON.stringify(registry, null, 2) + "\n",
    "utf8",
  );
}

function runCheck(dir: string): { code: number; output: string } {
  try {
    const stdout = execFileSync(
      process.execPath,
      [CHECK, dir, `--today=${TODAY}`],
      { cwd: dir, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    return { code: 0, output: stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

/**
 * A revalidator fixture.
 *
 * `scripts/revalidate-claims.mjs` reads `git rev-parse HEAD` and tests whether
 * an evidence sha is an ancestor of it — the whole candidate-binding property
 * depends on there being a commit graph. So the fixture is a real (tiny) git
 * repository: `git init` plus one commit is enough, and the negative test does
 * not care that HEAD is not an ancestor of anything, because the assertion is
 * about the DIGEST diagnostic.
 */
function revalidateFixture(): string {
  const dir = fixture();
  execFileSync("git", ["init", "-q", "--initial-branch=main", "."], {
    cwd: dir,
    stdio: "pipe",
  });
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync(
    "git",
    [
      "-c",
      "user.email=t@example.com",
      "-c",
      "user.name=t",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-q",
      "-m",
      "fixture",
    ],
    { cwd: dir, stdio: "pipe" },
  );
  return dir;
}

function runRevalidate(dir: string): { code: number; output: string } {
  try {
    const stdout = execFileSync(process.execPath, [REVALIDATE, dir], {
      cwd: dir,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

/**
 * The first claim of a registry ALREADY IN HAND, as a value not an assertion.
 *
 * `registry.claims[0]` is typed `Claim | undefined` under
 * `noUncheckedIndexedAccess`, so a `!` at every call site would be eleven
 * places to forget. A named accessor that throws is one.
 *
 * It takes the registry rather than a directory, and that is load-bearing: the
 * first version took a path and re-parsed the file, so a test that did
 * `const registry = registryOf(dir); firstClaim(registry).blockedUntil = …;
 * writeRegistry(dir, registry)` mutated a THROWAWAY object and wrote the
 * pristine one. Every negative test in that pass "failed to fail" — exit 0 on
 * a registry that had never been changed — which reads exactly like a broken
 * gate.
 */
function firstClaim(registry: FixtureRegistry): Claim {
  const claim = registry.claims[0];
  if (claim === undefined) throw new Error("fixture registry has no claims");
  return claim;
}

/**
 * A promoted `proof`, carrying everything the presence loop requires.
 *
 * A BLOCKED record spread into a promotion leaves `authority: "NONE"`, and the
 * checker fails on THAT before reaching the recency check under test. Every
 * promotion therefore names an authority and an artifact explicitly — which is
 * also what a real promotion would have to do, so the fixture is not bending
 * the rules to pass.
 */
function promoted(
  claim: Claim,
  overrides: Record<string, unknown>,
): Claim["proof"] {
  return {
    ...claim.proof,
    status: "LOCAL_PROVEN",
    artifact: "package.json",
    digest: `sha256:${"a".repeat(64)}`,
    observedAt: "2026-09-20",
    authority: "release-owner",
    ...overrides,
  };
}

describe("a claim states when it was observed, or that it cannot be", () => {
  it("the committed registry passes", () => {
    const { code, output } = runCheck(fixture());
    expect(code, output).toBe(0);
    const report = JSON.parse(output) as { maxBlockedDays: number };
    expect(report.maxBlockedDays).toBe(90);
  });

  it("every BLOCKED claim carries a reason and a review date", () => {
    const registry = registryOf(ROOT);
    for (const claim of registry.claims) {
      if (claim.proof?.status !== "BLOCKED") continue;
      expect(claim.blockedReason, claim.id).toBeTypeOf("string");
      expect(String(claim.blockedReason).length, claim.id).toBeGreaterThan(60);
      expect(String(claim.blockedUntil), claim.id).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
    }
  });

  it("a BLOCKED claim with no reason fails", () => {
    const dir = fixture();
    const registry = registryOf(dir);
    delete firstClaim(registry).blockedReason;
    writeRegistry(dir, registry);
    const run = runCheck(dir);
    expect(run.code).toBe(1);
    expect(run.output).toContain("blockedReason is required");
  });

  it("a BLOCKED claim whose review date has passed fails", () => {
    // The reason `blockedUntil` exists, and the direction it must fail in. The
    // first version read elapsed-minus-budget, so it fired 90 days AFTER the
    // review date — a block one day past its date passed, and with the shipped
    // dates in the future nothing was red until March.
    const dir = fixture();
    const registry = registryOf(dir);
    firstClaim(registry).blockedUntil = "2026-01-01";
    writeRegistry(dir, registry);
    const run = runCheck(dir);
    expect(run.code).toBe(1);
    expect(run.output).toContain("the review date has passed");
  });

  it("a BLOCKED claim deferred beyond the review budget fails", () => {
    // The other half. A review date more than 90 days out is a deferral, not
    // a review, and nothing about the past-date case catches it.
    const dir = fixture();
    const registry = registryOf(dir);
    firstClaim(registry).blockedUntil = "2027-06-01";
    writeRegistry(dir, registry);
    const run = runCheck(dir);
    expect(run.code).toBe(1);
    expect(run.output).toContain("A review date further than");
  });

  it("a review date inside the budget passes", () => {
    const dir = fixture();
    const registry = registryOf(dir);
    firstClaim(registry).blockedUntil = "2026-10-15";
    writeRegistry(dir, registry);
    const run = runCheck(dir);
    expect(run.code, run.output).toBe(0);
  });

  it("a promoted claim with no observation date fails", () => {
    // `observedAt: null` used to satisfy "present and not NONE", which is how
    // all four claims passed with no observation at all. `null` is what the
    // registry carried, so the error says so: a null date is not a typo, it is
    // a claim that was never observed.
    const dir = fixture();
    const registry = registryOf(dir);
    firstClaim(registry).proof = promoted(firstClaim(registry), {
      observedAt: null,
    });
    writeRegistry(dir, registry);
    const run = runCheck(dir);
    expect(run.code).toBe(1);
    expect(run.output).toContain("proof observedAt missing");
    expect(run.output).toContain("never observed");
  });

  it("a non-date observedAt is rejected as a date, not as missing", () => {
    const dir = fixture();
    const registry = registryOf(dir);
    firstClaim(registry).proof = promoted(firstClaim(registry), {
      observedAt: "last tuesday",
    });
    writeRegistry(dir, registry);
    const run = runCheck(dir);
    expect(run.code).toBe(1);
    expect(run.output).toContain("is not an ISO date");
  });

  it("a promoted claim whose evidence is older than its budget fails", () => {
    // Per type, because the claims are not the same kind of thing: a remote
    // observation of a published artifact is only as good as the release it
    // observed, while a local verification is stale in a different sense — it
    // means nobody ran it.
    for (const [status, observedAt, expected] of [
      ["REMOTE_PROVEN", "2026-08-01", "30-day budget"],
      ["LOCAL_PROVEN", "2026-05-01", "90-day budget"],
    ] as const) {
      const dir = fixture();
      const registry = registryOf(dir);
      const claim = firstClaim(registry);
      claim.proof = promoted(claim, { status, observedAt });
      writeRegistry(dir, registry);
      const run = runCheck(dir);
      expect(run.code, `${status}: ${run.output}`).toBe(1);
      expect(run.output).toContain(expected);
    }
  });

  it("a proof inside its budget passes", () => {
    const dir = fixture();
    const registry = registryOf(dir);
    const claim = firstClaim(registry);
    claim.proof = promoted(claim, { status: "REMOTE_PROVEN" });
    writeRegistry(dir, registry);
    const run = runCheck(dir);
    expect(run.code, run.output).toBe(0);
  });

  it("a digest in an unknown form fails rather than passing unchecked", () => {
    const dir = fixture();
    const registry = registryOf(dir);
    const claim = firstClaim(registry);
    claim.proof = promoted(claim, { digest: "checksum-1234" });
    writeRegistry(dir, registry);
    const run = runCheck(dir);
    expect(run.code).toBe(1);
    expect(run.output).toContain("is not a sha256:/sha512: hex digest");
  });

  it("an unknown proof status is rejected with the enum spelled out", () => {
    const dir = fixture();
    const registry = registryOf(dir);
    const claim = firstClaim(registry);
    writeRegistry(dir, {
      ...registryOf(dir),
      claims: [{ ...claim, proof: { ...claim.proof, status: "PROVEN" } }],
    });
    const run = runCheck(dir);
    expect(run.code).toBe(1);
    // `PROVEN` is the value the revalidator used to gate its digest check on.
    // Naming the enum in the error is what stops that from being reintroduced.
    expect(run.output).toContain("BLOCKED, LOCAL_PROVEN, REMOTE_PROVEN");
  });
});

describe("the revalidator's digest branch is reachable", () => {
  it("a REMOTE_PROVEN claim with a digest that does not match its artifact fails", () => {
    // The branch this whole task exists to make live. `status === "PROVEN"`
    // matched nothing, so it never ran, and the digest check read as a
    // control in review while being dead code.
    const dir = revalidateFixture();
    const registry = registryOf(dir);
    const claim = firstClaim(registry);
    claim.proof = promoted(claim, {
      status: "REMOTE_PROVEN",
      digest: `sha256:${"0".repeat(64)}`,
      base_sha: null,
    });
    writeRegistry(dir, registry);
    const run = runRevalidate(dir);
    expect(run.code, run.output).toBe(1);
    expect(run.output).toContain("DIGEST_MISMATCH");
  });

  it("a matching digest produces no digest diagnostic", async () => {
    const dir = revalidateFixture();
    const { createHash } = await import("node:crypto");
    const registry = registryOf(dir);
    const claim = firstClaim(registry);
    const digest = createHash("sha256")
      .update(readFileSync(join(dir, "package.json")))
      .digest("hex");
    claim.proof = promoted(claim, {
      status: "REMOTE_PROVEN",
      digest: `sha256:${digest}`,
    });
    writeRegistry(dir, registry);
    const run = runRevalidate(dir);
    expect(run.output).not.toContain("DIGEST_MISMATCH");
  });

  it("the committed registry produces no digest diagnostic", () => {
    const run = runRevalidate(ROOT);
    expect(run.output).not.toContain("DIGEST_MISMATCH");
    expect(run.output).not.toContain("UNKNOWN_PROOF_STATUS");
  });
});
