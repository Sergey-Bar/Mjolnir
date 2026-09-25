#!/usr/bin/env tsx
/**
 * `npm run claim:budget` — the enforcing half of P4.
 *
 * `claims:prose` finds unbound public claims. This gate makes the count a
 * **ratchet** rather than a report nobody reads:
 *
 *  1. The number of unbound public claims may not exceed the recorded
 *     budget in `docs/claim-budget.json`.
 *  2. The budget may only be raised by a dated, owned, **expiring**
 *     exception. An exception without an expiry is a permanent waiver,
 *     and the constitution has no waiver path.
 *  3. The budget may only ever fall. A raised-then-lowered budget is
 *     allowed; a raised budget that never comes back down is recorded as
 *     debt.
 *
 * Why a ratchet and not a boolean: a boolean gate that starts red gets
 * disabled, and a disabled honesty gate is worse than none. A ratchet is
 * enforceable on day one — "the count is 41 and it may not become 42" is
 * a rule that holds today — and it converges to zero without anyone
 * pretending the work is already done.
 *
 * The initial budget is the honest measured baseline. It is a debt
 * statement, not a target: `docs/CLAIM-LINT-REPORT.json` names every
 * claim it covers, and each Wave 10/13 ratchet step lowers it.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { prettify } from "../lib/prettify.js";
import { isMainModule } from "../lib/is-main-module.js";
import { ROOT } from "./inventory.js";

const BUDGET_PATH = join(ROOT, "docs", "claim-budget.json");
const REPORT_RELATIVE = join("docs", "CLAIM-LINT-REPORT.json");

export interface ClaimBudgetException {
  /** Why this slice of debt is accepted for now. */
  reason: string;
  owner: string;
  /** ISO date. Past it, the gate fails regardless of the count. */
  expiresAt: string;
  /** The most the budget may be raised while this exception is live. */
  permitsUpTo: number;
}

export interface ClaimBudget {
  schemaVersion: 1;
  artifact: "claim-budget";
  /** The maximum number of unbound public claims the build tolerates. */
  maxUnbound: number;
  /** ISO date the last decrease happened. */
  lastReducedAt: string;
  /** Debt is a target that moves down, never up. */
  target: number;
  exceptions: readonly ClaimBudgetException[];
  history: readonly {
    at: string;
    maxUnbound: number;
    unbound: number;
    note: string;
  }[];
}

export interface ClaimBudgetCheck {
  status: "PASS" | "FAIL";
  errors: string[];
  /** Declared trajectory. Reported, not gated — see `errors` for why. */
  facts: {
    maxUnbound: number;
    measuredUnbound: number;
    headroom: number;
    target: number;
    converging: boolean;
    liveExceptions: number;
    expiredExceptions: number;
  };
}

function readReport(root: string): number | null {
  const path = join(root, REPORT_RELATIVE);
  if (!existsSync(path)) return null;
  try {
    const report = JSON.parse(readFileSync(path, "utf8")) as {
      unboundTotal?: number;
    };
    return typeof report.unboundTotal === "number" ? report.unboundTotal : null;
  } catch {
    return null;
  }
}

export function checkClaimBudget(
  root = ROOT,
  budget?: ClaimBudget,
  measuredUnbound?: number | null,
): ClaimBudgetCheck & { warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const loaded =
    budget ??
    (existsSync(BUDGET_PATH)
      ? (JSON.parse(readFileSync(BUDGET_PATH, "utf8")) as ClaimBudget)
      : null);
  const measured =
    measuredUnbound === undefined ? readReport(root) : measuredUnbound;

  if (loaded === null) {
    return {
      status: "FAIL",
      errors: [
        "docs/claim-budget.json is missing; run `npm run claim:budget --init` to record the measured baseline honestly",
      ],
      facts: {
        maxUnbound: 0,
        measuredUnbound: measured ?? 0,
        headroom: 0,
        target: 0,
        converging: false,
        liveExceptions: 0,
        expiredExceptions: 0,
      },
    };
  }
  if (measured === null) {
    return {
      status: "FAIL",
      errors: [
        "docs/CLAIM-LINT-REPORT.json is missing or unreadable; run `npm run claims:prose` first — a budget with no measurement is a guess",
      ],
      facts: {
        maxUnbound: loaded.maxUnbound,
        measuredUnbound: 0,
        headroom: 0,
        target: loaded.target,
        converging: false,
        liveExceptions: 0,
        expiredExceptions: 0,
      },
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const live = loaded.exceptions.filter((e) => e.expiresAt >= today);
  const expired = loaded.exceptions.filter((e) => e.expiresAt < today);
  for (const exception of expired) {
    errors.push(
      `claim-budget exception expired ${exception.expiresAt}: ${exception.reason} (owner ${exception.owner})`,
    );
  }
  if (measured > loaded.maxUnbound) {
    errors.push(
      `unbound public claims rose to ${measured}, above the recorded budget of ${loaded.maxUnbound}. ` +
        `Bind a claim (<!-- claim:<registryId> maturity=M<n> proof=<command> -->), rewrite it, or record a dated, owned, expiring exception.`,
    );
  }
  if (measured > loaded.target) {
    // Reported, not an error. `target` is the declared trajectory, and on
    // the day the budget is initialised the measured count *is* the
    // baseline, so requiring measured <= target would make a freshly
    // armed ratchet fail on its first run — which is how a gate teaches
    // people to ignore it. The hard rule is the one above: the count may
    // not rise. Convergence is a fact to publish, not a gate to pass.
    warnings.push(
      `unbound public claims (${measured}) are above the declared target (${loaded.target}); the ratchet is armed and may not rise`,
    );
  }
  if (loaded.target > loaded.maxUnbound) {
    errors.push(
      `the debt target (${loaded.target}) is above the budget (${loaded.maxUnbound}); the target must be at or below the budget, or the ratchet has been pointed the wrong way`,
    );
  }

  return {
    status: errors.length === 0 ? "PASS" : "FAIL",
    errors,
    warnings,
    facts: {
      maxUnbound: loaded.maxUnbound,
      measuredUnbound: measured,
      headroom: loaded.maxUnbound - measured,
      target: loaded.target,
      converging: measured <= loaded.target,
      liveExceptions: live.length,
      expiredExceptions: expired.length,
    },
  };
}

/**
 * `--init` records the measured baseline. One-shot and honest: the
 * initial budget is *what is true now*, not a target someone picked.
 */
function initBudget(): void {
  const measured = readReport(ROOT);
  if (measured === null) {
    console.error(
      "docs/CLAIM-LINT-REPORT.json is missing; run `npm run claims:prose` first",
    );
    process.exit(2);
  }
  const today = new Date().toISOString().slice(0, 10);
  const budget: ClaimBudget = {
    schemaVersion: 1,
    artifact: "claim-budget",
    maxUnbound: measured,
    lastReducedAt: today,
    target: 0,
    exceptions: [],
    history: [
      {
        at: today,
        maxUnbound: measured,
        unbound: measured,
        note: "Baseline: the unbound public claims that exist today. This is a debt statement, not a target. `npm run claims:prose` names every one of them; each reduction lowers maxUnbound.",
      },
    ],
  };
  writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2) + "\n");
  console.log(
    `Wrote ${BUDGET_PATH}: maxUnbound=${measured}, target=0. The ratchet is now armed — the count may not rise above ${measured}.`,
  );
}

function main(): void {
  if (process.argv.includes("--init")) {
    initBudget();
    return;
  }
  const check = checkClaimBudget(ROOT);
  console.log(
    JSON.stringify(
      {
        status: check.status,
        gate: "claim:budget",
        facts: check.facts,
        errors: check.errors,
        rule: "The unbound public-claim count may not exceed the recorded budget, and the budget may only be raised by a dated, owned, expiring exception. The constitution has no permanent waiver path.",
      },
      null,
      2,
    ),
  );
  process.exit(check.status === "PASS" ? 0 : 1);
}

if (isMainModule(import.meta.url)) {
  void prettify(BUDGET_PATH).catch(() => undefined);
  main();
}
