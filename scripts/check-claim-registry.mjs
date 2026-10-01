import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

import { isProofStatus, PROOF_STATUSES } from "./lib/proof-statuses.mjs";

/**
 * Literal `it("…")` / `test("…")` titles in a spec, with a real body.
 *
 * Parsed, not grepped. A title has to be a string-literal ARGUMENT of an
 * `it`/`test` call whose callback has a non-empty block body — which is
 * exactly the shape the vitest AST check in
 * `tests/engine/trust-invariants.spec.ts` accepts, so a claim and an
 * invariant cannot be bound to titles that mean different things.
 */
/**
 * The proof-status list lives in `scripts/lib/proof-statuses.mjs`, imported by
 * this checker and by `revalidate-claims.mjs` alike.
 *
 * It was four copies: here, twice in the revalidator (a predicate and a
 * comment), and as a TypeScript union in `src/v6/capability-types.ts`. The
 * divergence was not hypothetical — the revalidator gated its digest check on
 * `"PROVEN"`, a value in none of them, so the whole branch was dead code while
 * appearing in review as a control. The test below asserts the JS and TS
 * copies still agree.
 */

/**
 * How old a proof may be, per claim type, in days.
 *
 * The budget pattern used to live in two modules here —
 * `MAX_EVIDENCE_AGE_MS` in the M33–M34 governance contract and
 * `M48_EVIDENCE_MAX_AGE_MS` in the M48 scale operating model — and
 * `check-claim-registry.mjs` applied neither. `observedAt` was required to be
 * present and not `"NONE"`, so `null` passed, and a 2026-06 verdict was
 * treated exactly like yesterday's. Both modules had no importer and the v6
 * carve deleted them, so these budgets are now the only place the pattern
 * exists: a gate whose rule lives in the file it checks keeps the rule.
 *
 * The budgets are per type because the claims are not the same kind of thing.
 * A `REMOTE_PROVEN` claim rests on an external observation of a published
 * artifact, so it is only as good as the release it observed: it must be
 * re-observed every release. A `LOCAL_PROVEN` claim rests on a command
 * someone runs against the tree, and a month of not running it is stale
 * evidence in a different sense — it means nobody checked.
 *
 * Defaults to the strictest budget for an unrecognised type, because the
 * failure direction matters: an unknown claim type must not be granted the
 * longest life.
 */
export const MAX_PROOF_AGE_DAYS = {
  REMOTE_PROVEN: 30,
  LOCAL_PROVEN: 90,
  BLOCKED: Number.POSITIVE_INFINITY,
};
export const DEFAULT_MAX_PROOF_AGE_DAYS = 30;

/**
 * How long a claim may stay BLOCKED, in days — measured to the review date.
 *
 * A block is a legitimate state (all four shipped claims are in it) but not an
 * indefinite one. `blockedUntil` is the review date, and the budget has two
 * halves because "indefinite" fails in both directions:
 *
 *   - PAST it by more than the budget, the date is a fiction nobody is
 *     holding to and the block needs re-justifying.
 *   - FURTHER than the budget ahead, the date is a deferral, not a review.
 *
 * The first version had neither. It read `daysBetween(blockedUntil, TODAY) —
 * MAX_BLOCKED_DAYS`, which is elapsed-minus-budget, so it fired 90 days AFTER
 * the review date rather than before it, and the error printed
 * `claim.proof.blockedUntil` — a field that does not exist — alongside a
 * correct number computed from the wrong one.
 */
export const MAX_BLOCKED_DAYS = 90;

/** ISO-8601 `YYYY-MM-DD`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DIGEST = /^(?:sha256:[0-9a-f]{64}|sha512:[0-9a-f]{128})$/;

function daysBetween(fromIso, toIso) {
  return (
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) /
    86_400_000
  );
}

function specCaseTitles(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.ES2022,
    true,
  );
  const cases = [];
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["it", "test"].includes(node.expression.text)
    ) {
      const title = node.arguments[0];
      const callback = node.arguments[node.arguments.length - 1];
      if (
        title &&
        ts.isStringLiteral(title) &&
        callback &&
        (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
        ts.isBlock(callback.body) &&
        callback.body.statements.length > 0
      ) {
        cases.push(title.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return cases;
}

const root = process.argv[2] ?? process.cwd();
/**
 * "Today" for the age budgets.
 *
 * `--today=<iso>` exists so the budgets are testable without freezing the
 * clock: an expiry test that depends on the real date is a test that stops
 * meaning anything the day after it is written.
 */
const TODAY =
  process.argv
    .find((arg) => arg.startsWith("--today="))
    ?.slice("--today=".length) ?? new Date().toISOString().slice(0, 10);
const registry = JSON.parse(
  readFileSync(join(root, "docs", "claim-registry.json"), "utf8"),
);
if (registry.schemaVersion !== 1 || !Array.isArray(registry.claims)) {
  throw new Error("claim registry schemaVersion/claims is invalid");
}
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const publishedStable = pkg.publishedStable;
const manifest = JSON.parse(
  readFileSync(join(root, "candidate-trust-manifest.json"), "utf8"),
);
if (manifest.identity?.version !== version) {
  throw new Error(
    `candidate manifest version ${manifest.identity?.version} does not match package ${version}`,
  );
}
for (const claim of registry.claims) {
  for (const field of [
    "implementation",
    "tests",
    "corpus",
    "benchmark",
    "candidateProof",
    "proof",
    "authority",
    "expiry",
    "state",
  ]) {
    if (!(field in claim)) throw new Error(`${claim.id}: missing ${field}`);
  }
  for (const source of [claim.valueSource, ...claim.relatedSources]) {
    if (!existsSync(join(root, source))) {
      throw new Error(`${claim.id}: missing source ${source}`);
    }
  }
  if (
    typeof claim.proof !== "object" ||
    claim.proof === null ||
    !isProofStatus(claim.proof.status)
  ) {
    throw new Error(
      `${claim.id}: proof status is invalid — one of ${[...PROOF_STATUSES].join(", ")}`,
    );
  }
  if (
    manifest.identity?.candidateSha === null &&
    claim.proof.status !== "BLOCKED"
  ) {
    throw new Error(`${claim.id}: unproven candidate cannot carry proof`);
  }
  if (claim.proof.status !== "BLOCKED") {
    for (const field of ["artifact", "digest", "observedAt", "authority"]) {
      if (!claim.proof[field] || claim.proof[field] === "NONE") {
        // The `observedAt` case gets its own wording because `null` is the
        // value the four shipped claims carried, and the generic "missing"
        // reads as a typo rather than as the claim having never been observed.
        const hint =
          field === "observedAt"
            ? " — a null observedAt means the claim was never observed, which is what BLOCKED is for"
            : "";
        throw new Error(`${claim.id}: proof ${field} missing${hint}`);
      }
    }
    if (!existsSync(join(root, claim.proof.artifact))) {
      throw new Error(`${claim.id}: proof artifact missing`);
    }
    // 6.0: the digest is now CHECKED, not just present.
    //
    // `scripts/revalidate-claims.mjs` has verified digests for a long time —
    // behind `status === "PROVEN"`, a value absent from the enum above, so the
    // branch never ran on any claim in this registry. Shape and length are
    // checked here, and the CONTENT check lives in the revalidator, which has
    // the artifact bytes; the two are separate because they are separate
    // questions ("is this a digest" vs "does it match the file").
    if (!DIGEST.test(String(claim.proof.digest))) {
      throw new Error(
        `${claim.id}: proof digest "${claim.proof.digest}" is not a sha256:/sha512: hex digest`,
      );
    }
    // Recency. `observedAt: null` used to pass, which meant a 2026-06
    // observation was indistinguishable from yesterday's.
    if (!ISO_DATE.test(String(claim.proof.observedAt))) {
      throw new Error(
        `${claim.id}: proof observedAt "${claim.proof.observedAt}" is not an ISO date (YYYY-MM-DD). ` +
          `A ${claim.proof.status} claim must say WHEN it was observed`,
      );
    }
    const budgetDays =
      MAX_PROOF_AGE_DAYS[claim.proof.status] ?? DEFAULT_MAX_PROOF_AGE_DAYS;
    const age = daysBetween(String(claim.proof.observedAt), TODAY);
    if (age > budgetDays) {
      throw new Error(
        `${claim.id}: proof observed ${claim.proof.observedAt} is ${age} days old, ` +
          `above the ${budgetDays}-day budget for a ${claim.proof.status} claim. ` +
          "Re-observe the claim, or downgrade it to BLOCKED with a blockedReason",
      );
    }
  } else {
    // 6.0: a block says WHY and UNTIL WHEN.
    //
    // The prose used to live in `expiry`, which is an event trigger ("on
    // version change") and not a reason. A block with no stated reason is
    // indistinguishable from a block nobody looked at, and a block with no
    // review date never has to be looked at again.
    //
    // Both fields sit on the CLAIM, not on `proof`. The reason and the review
    // date describe the claim's standing; `proof` is the record that would
    // replace them, and a block reason filed inside the thing it would be
    // overwritten by is a field that gets deleted with it.
    if (
      typeof claim.blockedReason !== "string" ||
      claim.blockedReason.trim().length < 60
    ) {
      throw new Error(
        `${claim.id}: blockedReason is required and must be a sentence — what is ` +
          "missing, and why it cannot be produced from inside this tree",
      );
    }
    if (!ISO_DATE.test(String(claim.blockedUntil))) {
      throw new Error(
        `${claim.id}: blockedUntil "${claim.blockedUntil}" is not an ISO date (YYYY-MM-DD)`,
      );
    }
    // ELAPSED days since the review date, not days remaining until it. The
    // first version computed `TODAY − blockedUntil` and called it "days away",
    // which is the same subtraction read backwards: the check fired only 90
    // days AFTER the stated review date, so a block one day past
    // `blockedUntil` passed, and the shipped future dates made it invisible
    // until March.
    const elapsed = daysBetween(String(claim.blockedUntil), TODAY);
    if (elapsed > 0) {
      throw new Error(
        `${claim.id}: blocked until ${claim.blockedUntil}, which was ${elapsed} days ` +
          `ago — the review date has passed and the block needs re-justifying with a ` +
          "new date and a reason, or the claim should be accepted as open work",
      );
    } else if (elapsed < -MAX_BLOCKED_DAYS) {
      throw new Error(
        `${claim.id}: blocked until ${claim.blockedUntil}, which is ${-elapsed} days out — ` +
          `past the ${MAX_BLOCKED_DAYS}-day review budget. A review date further than ` +
          `${MAX_BLOCKED_DAYS} days away is a block nobody scheduled to look at`,
      );
    }
  }
  // 6.0: a claim names the SPEC that would settle it.
  //
  // All four claims are BLOCKED, and `blockedReason` says why in prose. What
  // was missing is the other half: which check, run where, would move the
  // claim. A block with no named verifier is indistinguishable from one nobody
  // looked at, and the fix for that is to record the verifier — not to
  // declare the claim proven.
  //
  // The title is checked by AST against the named spec, not by substring, for
  // the reason `TRUST_INVARIANTS` does the same: a substring check is
  // satisfied by a comment or a string, so it proves that the words appear
  // somewhere rather than that a test with that title exists.
  if (typeof claim.proof.verificationTest !== "string") {
    throw new Error(
      `${claim.id}: proof.verificationTest is required — name the spec that would settle this claim`,
    );
  }
  if (typeof claim.proof.verificationCase !== "string") {
    throw new Error(
      `${claim.id}: proof.verificationCase is required — name the it() title in that spec`,
    );
  }
  if (!existsSync(join(root, claim.proof.verificationTest))) {
    throw new Error(
      `${claim.id}: proof.verificationTest does not exist: ${claim.proof.verificationTest}`,
    );
  }
  {
    const cases = specCaseTitles(join(root, claim.proof.verificationTest));
    if (!cases.includes(claim.proof.verificationCase)) {
      throw new Error(
        `${claim.id}: proof.verificationCase is not an it()/test() title in ` +
          `${claim.proof.verificationTest}. Present: ${cases.join(" | ")}`,
      );
    }
  }
  for (const field of ["implementation", "tests", "corpus"]) {
    for (const source of claim[field]) {
      if (source !== "N/A" && !existsSync(join(root, source))) {
        throw new Error(`${claim.id}: missing ${field} evidence ${source}`);
      }
    }
  }
  if (claim.id === "support-envelope-version") {
    const action = readFileSync(join(root, "action.yml"), "utf8");
    const workflow = readFileSync(
      join(root, ".github", "workflows", "mjolnir.yml"),
      "utf8",
    );
    // The Action's default must be a version that EXISTS on the registry.
    // While the candidate is an RC, that is the published stable, not the
    // working version — otherwise every consumer who pins nothing gets a 404.
    if (typeof publishedStable !== "string" || publishedStable === "") {
      throw new Error("package.json: publishedStable is missing");
    }
    if (publishedStable.includes("-")) {
      throw new Error(
        `publishedStable ${publishedStable} is a prerelease; the Action default must be a published stable version`,
      );
    }
    if (!action.includes(`default: "${publishedStable}"`)) {
      throw new Error(
        `action.yml does not default to the published stable version ${publishedStable}`,
      );
    }
    if (
      !workflow.includes(`mjolnir-qa-${version}.tgz`) &&
      !workflow.includes("node dist/cli.mjs")
    ) {
      throw new Error(
        `dogfood workflow has no pinned source/reviewer path for ${version}`,
      );
    }
  }
  if (claim.id === "unified-pr-report-marker") {
    const reporter = readFileSync(
      join(root, "src", "reporter", "pr-report-shared.ts"),
      "utf8",
    );
    if (!reporter.includes("mjolnir-report:v2")) {
      throw new Error("unified PR report marker is missing");
    }
    const action = readFileSync(join(root, "action.yml"), "utf8");
    if (!action.includes("mjolnir-report:v2")) {
      throw new Error("action does not publish the unified v2 marker");
    }
  }
  if (claim.id === "enterprise-threat-model") {
    const result = JSON.parse(
      readFileSync(join(root, "enterprise", "threat-model.json"), "utf8"),
    );
    if (
      result.schemaVersion !== 1 ||
      result.status !== "approved-for-working-candidate"
    ) {
      throw new Error(
        "enterprise threat model is not an approved working-candidate artifact",
      );
    }
  }
}
for (const source of registry.historicalSources ?? []) {
  if (!existsSync(join(root, source))) {
    throw new Error(`historical source missing: ${source}`);
  }
}
console.log(
  JSON.stringify({
    status: "PASS",
    registry: registry.registryId,
    claims: registry.claims.length,
    historical: registry.historicalSources?.length ?? 0,
    today: TODAY,
    proofAgeBudgetsDays: {
      ...MAX_PROOF_AGE_DAYS,
      default: DEFAULT_MAX_PROOF_AGE_DAYS,
    },
    maxBlockedDays: MAX_BLOCKED_DAYS,
  }),
);
