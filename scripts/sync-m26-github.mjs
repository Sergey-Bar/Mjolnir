/**
 * `m26:github:sync` — fetch the all-state tracker snapshot.
 *
 * BITTERSWEET `BW-002`. This script used to compute every disposition as
 *
 *   canonical_disposition: row.state === "open" ? "CARRY_FORWARD" : "CLOSED_NOT_PLANNED",
 *   target_train:          row.state === "open" ? "M26" : "HISTORICAL_ARCHIVE",
 *   release_effect:        row.state === "open" ? "RELEASE_BLOCKED" : "NONE",
 *
 * — a pure function of the GitHub `state` field, containing no
 * engineering judgement at all. `GAP-M26-002` then marked this script
 * `status: "fixed"`, `result: "PASS"`, citing the very artifacts it
 * produces. A 429-row ledger with zero judgement was certified as a
 * completed fix.
 *
 * It also could not function as a gate: every open issue was
 * `RELEASE_BLOCKED`, and the only way to clear that was to close the
 * issue — which this same script then rubber-stamped `CLOSED_NOT_PLANNED`.
 * It could neither block nor clear.
 *
 * WHAT CHANGED
 *
 * The FETCH half is unchanged and still does the reconciliation work
 * (counters, milestones, pull requests, the dated snapshot).
 *
 * The DISPOSITION half now reads a judgement file — `docs/issue-dispositions.json`
 * — and REFUSES to emit a row that has none. A disposition must be one of
 * the five classes in the release plan, must carry a non-empty `reason`,
 * and must carry a `verification` naming a command or a source path. An
 * issue that matches no rule is emitted as `CARRY_FORWARD` with
 * `pending_human_triage: true` and stays OPEN; it is never guessed.
 *
 * This script can no longer certify itself: its disposition column is
 * data someone wrote, checked against a file, not a restatement of the
 * field it just fetched.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.argv[2] ?? process.cwd();
const gh = process.platform === "win32" ? "gh.exe" : "gh";
const runGh = (endpoint) => {
  const result = spawnSync(gh, ["api", "--paginate", "--slurp", endpoint], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "gh api failed");
  }
  const pages = JSON.parse(result.stdout);
  return pages.flatMap((page) => (Array.isArray(page) ? page : [page]));
};
const hash = (value) =>
  createHash("sha256")
    .update(value ?? "")
    .digest("hex");
const now = new Date().toISOString();
const baseSha = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
}).stdout.trim();
const issueRows = runGh(
  "repos/Sergey-Bar/Mjolnir/issues?state=all&per_page=100",
);
const pullRows = runGh("repos/Sergey-Bar/Mjolnir/pulls?state=all&per_page=100");
const milestoneRows = runGh(
  "repos/Sergey-Bar/Mjolnir/milestones?state=all&per_page=100",
);
const issues = issueRows.filter((row) => !Object.hasOwn(row, "pull_request"));
const pullRequests = pullRows;
const issueRecord = (row) => ({
  number: row.number,
  title: row.title,
  url: row.html_url,
  state: row.state,
  state_reason: row.state_reason ?? null,
  milestone: row.milestone
    ? { number: row.milestone.number, title: row.milestone.title }
    : null,
  milestone_numbers: row.milestone ? [row.milestone.number] : [],
  labels: (row.labels ?? []).map((label) =>
    typeof label === "string" ? label : label.name,
  ),
  created_at: row.created_at,
  updated_at: row.updated_at,
  closed_at: row.closed_at,
  last_commit_sha: null,
  last_pull_request_number: null,
  body_sha256: hash(row.body),
  evidence_links: [],
});
const prRecord = (row) => ({
  number: row.number,
  title: row.title,
  url: row.html_url,
  state: row.merged_at ? "merged" : row.state,
  head_sha: row.head?.sha ?? "",
  base_sha: row.base?.sha ?? "",
  created_at: row.created_at,
  updated_at: row.updated_at,
  merged_at: row.merged_at,
});
const openIssues = issues.filter((row) => row.state === "open");
const closedIssues = issues.filter((row) => row.state === "closed");
const milestones = milestoneRows.map((row) => ({
  number: row.number,
  title: row.title,
  state: row.state,
  open_issues: openIssues.filter(
    (issue) => issue.milestone?.number === row.number,
  ).length,
  closed_issues: closedIssues.filter(
    (issue) => issue.milestone?.number === row.number,
  ).length,
  provider_open_issues: row.open_issues,
  provider_closed_issues: row.closed_issues,
  due_on: row.due_on,
  description: row.description ?? null,
}));
const counterMismatches = [];
for (const milestone of milestones) {
  const actualOpen =
    openIssues.filter((row) => row.milestone?.number === milestone.number)
      .length +
    pullRows.filter(
      (row) =>
        row.state === "open" && row.milestone?.number === milestone.number,
    ).length;
  const actualClosed =
    closedIssues.filter((row) => row.milestone?.number === milestone.number)
      .length +
    pullRows.filter(
      (row) =>
        row.state === "closed" && row.milestone?.number === milestone.number,
    ).length;
  if (actualOpen !== milestone.provider_open_issues) {
    counterMismatches.push({
      milestone_number: milestone.number,
      kind: "open_issues",
      expected: milestone.provider_open_issues,
      actual: actualOpen,
    });
  }
  if (actualClosed !== milestone.provider_closed_issues) {
    counterMismatches.push({
      milestone_number: milestone.number,
      kind: "closed_issues",
      expected: milestone.provider_closed_issues,
      actual: actualClosed,
    });
  }
}
const notPlanned = closedIssues
  .filter((row) => row.state_reason === "not_planned")
  .map((row) => row.number);

/**
 * The five disposition classes, and the release effect each one carries.
 *
 * `CLOSED_SHIPPED` and the two `CLOSED_*` classes are terminal: a claim
 * that something is done or permanently out of scope. `FIX_IN_BITTERSWEET`
 * is bound to a numbered task in the release plan. `CARRY_FORWARD` is the
 * only non-terminal class, and the only one that may leave an issue open.
 */
const DISPOSITION_CLASSES = {
  CLOSED_SHIPPED: { release_effect: "NONE", terminal: true },
  FIX_IN_BITTERSWEET: { release_effect: "BLOCKS_RELEASE", terminal: false },
  CARRY_FORWARD: { release_effect: "NONE", terminal: false },
  CLOSED_WONT_FIX: { release_effect: "NONE", terminal: true },
  CLOSED_BLOCKED_EXTERNAL: { release_effect: "NONE", terminal: true },
};

/** Fields each class must carry beyond `reason`. A disposition without
 *  these is a label, and a label is what this whole rewrite exists to
 *  stop accepting. */
const REQUIRED_FIELDS = {
  CLOSED_SHIPPED: ["shipped_at", "evidence"],
  FIX_IN_BITTERSWEET: ["task"],
  CARRY_FORWARD: ["deferred_because", "revisit_trigger"],
  CLOSED_WONT_FIX: ["contradicts"],
  CLOSED_BLOCKED_EXTERNAL: ["matrix_cell", "command_to_unblock"],
};

const judgementPath = join(root, "docs", "issue-dispositions.json");
if (!existsSync(judgementPath)) {
  console.error(
    `m26:github:sync: ${judgementPath} is missing.\n` +
      `Without a judgement file this script has nothing to record except ` +
      `GitHub's own state — which is how a 429-row ledger came to hold ` +
      `zero engineering judgement. Create the file (an empty dispositions ` +
      `map is valid: every issue then reports CARRY_FORWARD / ` +
      `pending_human_triage) rather than letting the script invent one.`,
  );
  process.exit(1);
}
// A BOM is not JSON, and the failure mode is an opaque SyntaxError on
// line 1 — which reads like a corrupt file rather than an encoding
// difference. Strip it rather than making the next editor rediscover it.
const judgement = JSON.parse(
  readFileSync(judgementPath, "utf8").replace(/^\uFEFF/, ""),
);
const judgements = judgement.dispositions ?? {};

/** Validate one judgement. Returns an error string, or null when valid. */
function validateJudgement(issueNumber, entry) {
  if (entry === undefined) return null; // unjudged → CARRY_FORWARD, not an error
  if (!DISPOSITION_CLASSES[entry.disposition]) {
    return `unknown disposition "${entry.disposition}" (expected one of ${Object.keys(DISPOSITION_CLASSES).join(", ")})`;
  }
  if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
    return "reason must be a non-empty string";
  }
  if (
    typeof entry.verification !== "string" ||
    entry.verification.trim() === ""
  ) {
    return "verification must name a command or a source path";
  }
  for (const field of REQUIRED_FIELDS[entry.disposition]) {
    const value = entry[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      return `${entry.disposition} requires a non-empty \`${field}\``;
    }
  }
  if (entry.verification.startsWith("npm run m26:github:sync")) {
    return "verification may not be this script — a snapshot cannot prove itself";
  }
  return null;
}

const judgementErrors = [];
for (const [number, entry] of Object.entries(judgements)) {
  const problem = validateJudgement(Number(number), entry);
  if (problem !== null) {
    judgementErrors.push({ issue_number: Number(number), problem });
  }
}
if (judgementErrors.length > 0) {
  for (const error of judgementErrors) {
    console.error(`m26:github:sync: #${error.issue_number}: ${error.problem}`);
  }
  console.error(
    `\n${judgementErrors.length} disposition(s) rejected. A disposition ` +
      `without a reason and a verification is not a disposition.`,
  );
  process.exit(1);
}

const dispositionRows = issues.map((row) => {
  const entry = judgements[row.number];
  // No judgement recorded → CARRY_FORWARD and stays OPEN, flagged for a
  // human. Never a guess, and never a silent closure.
  const disposition = entry?.disposition ?? "CARRY_FORWARD";
  const policy = DISPOSITION_CLASSES[disposition];
  const isClosed = row.state === "closed";
  return {
    issue_number: row.number,
    github_milestone: row.milestone?.number ?? null,
    logical_milestone: row.milestone
      ? `M${row.milestone.number - 1}`
      : "UNASSIGNED",
    state: row.state,
    state_reason: row.state_reason ?? null,
    canonical_disposition: disposition,
    /**
     * WHERE the disposition came from, as a field rather than as a convention.
     *
     * `GAP-M26-002`: dispositions were once a pure function of the GitHub
     * `state` field, which contains no engineering judgement, and the fix was
     * certified against the artifacts the script produced. The judgement file
     * fixed the substance; this field makes the PROVENANCE legible, so a
     * consumer can tell a decision from a fallback without parsing prose for
     * the word "untriaged".
     *
     *   `human`   — a person recorded a disposition, a reason and a
     *               verification in `docs/issue-dispositions.json`.
     *   `default` — nobody did, so the row is CARRY_FORWARD and stays open.
     *               A `default` row may not claim a gating disposition; that
     *               is the whole point, and `check-disposition-provenance`
     *               enforces it.
     */
    disposition_source: entry?.disposition ? "human" : "default",
    // Why this class, in the words of whoever decided it. Empty only when
    // the issue is untriaged, and then the row says so.
    reason:
      entry?.reason ??
      "untriaged: no judgement recorded in docs/issue-dispositions.json",
    verification: entry?.verification ?? null,
    task: entry?.task ?? null,
    deferred_because: entry?.deferred_because ?? null,
    revisit_trigger: entry?.revisit_trigger ?? null,
    shipped_at: entry?.shipped_at ?? null,
    evidence: entry?.evidence ?? null,
    contradicts: entry?.contradicts ?? null,
    matrix_cell: entry?.matrix_cell ?? null,
    command_to_unblock: entry?.command_to_unblock ?? null,
    pending_human_triage: entry === undefined,
    target_train:
      entry?.target_train ?? (isClosed ? "HISTORICAL_ARCHIVE" : "UNASSIGNED"),
    duplicate_or_successor: null,
    owner: entry?.owner ?? "Sergey-Bar",
    dependencies: entry?.dependencies ?? [],
    evidence_status: entry === undefined ? "UNTRIAGED" : "JUDGED",
    // An open issue only blocks the release when something decided it
    // blocks the release. "Open" alone is not a blocker — that inversion
    // is what made the old gate un-clearable.
    release_effect: isClosed ? "NONE" : (policy.release_effect ?? "NONE"),
    last_reconciled_at: now,
  };
});
const snapshot = {
  schemaVersion: 1,
  provenance: {
    source: "GitHub REST API via gh",
    capturedBy: "npm run m26:github:sync",
    population: "all-state",
    networkAccess: false,
    archiveCount: 108,
    liveCount: issues.length,
    disposition: "RECONCILED",
  },
  observedAt: now,
  baseSha,
  issues: issues.map(issueRecord),
  milestones,
  pullRequests: pullRequests.map(prRecord),
  reconciliation: {
    state: "RECONCILED",
    diagnostics: [],
    issue_count: issues.length,
    milestone_count: milestones.length,
    pull_request_count: pullRequests.length,
    duplicate_issue_numbers: [],
    cross_milestone_issue_numbers: [],
    counter_mismatches: counterMismatches,
    not_planned_closures: notPlanned,
  },
};
/**
 * Refuse to overwrite a committed ledger with a smaller one.
 *
 * This script regenerates two committed artifacts from whatever `gh api`
 * returns. `runGh` throws on a non-zero exit, so a failed fetch is loud — but
 * an authenticated call that returns an EMPTY result is not a failure, and it
 * produced exactly that outcome here: `docs/M26-ISSUE-DISPOSITIONS.jsonl` went
 * from 429 rows to a single newline, in a commit, and the only thing that
 * noticed was `gates:disposition-source` reporting "has no rows — a schema
 * change must not silently reduce this gate to zero rows".
 *
 * A network-shaped source must never be able to DELETE a committed record. The
 * ledger is the evidence for 429 dispositions; regenerating it from a network
 * response means the network can remove any of them without a human, which is
 * the same defect as a gate that can be silenced by an environment variable.
 *
 * Shrinking is legitimate — issues get closed and dropped from the milestone —
 * so this is not a prohibition. It makes the shrink an ACT that has to be
 * named, which is the difference between a deletion and an accident.
 */
function refuseLedgerShrink(artifactPath, next, what) {
  if (!existsSync(artifactPath)) return;
  const previous = readFileSync(artifactPath, "utf8")
    .split("\n")
    .filter((line) => line.trim()).length;
  if (next >= previous) return;
  if (process.argv.includes("--allow-shrink")) {
    console.warn(
      `sync-m26-github: ${what} shrank ${previous} → ${next} rows, permitted by --allow-shrink`,
    );
    return;
  }
  throw new Error(
    `refusing to write ${what}: the regenerated ledger has ${next} rows and the ` +
      `committed one has ${previous}. A network-shaped source must not be able to ` +
      `delete a committed record — check that \`gh\` is authenticated and that the ` +
      `milestone still has the issues you expect, or pass --allow-shrink if the ` +
      `reduction is real.`,
  );
}
const dispositionBody = `${dispositionRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
refuseLedgerShrink(
  join(root, "docs/M26-ISSUE-DISPOSITIONS.jsonl"),
  dispositionRows.length,
  "docs/M26-ISSUE-DISPOSITIONS.jsonl",
);
writeFileSync(
  join(root, "docs/M26-ISSUE-DISPOSITIONS.jsonl"),
  dispositionBody,
  "utf8",
);

// The snapshot gets the same guard, and it is not a formality: the run that
// emptied the disposition ledger emptied THIS in the same commit — 429 issues to
// zero — and `issue-disposition:check` is the gate that reported 429 phantom
// dispositions afterwards. Two committed evidence files, one unguarded
// generator, one invocation.
const snapshotPath = join(root, "docs/M26-GITHUB-SNAPSHOT.json");
refuseLedgerShrink(
  snapshotPath,
  issues.length,
  "docs/M26-GITHUB-SNAPSHOT.json",
);
writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
/**
 * The gate is now clearable, which is the point.
 *
 * It reported `status: "BLOCKED"` unconditionally before, so it could
 * never be satisfied and therefore taught everyone to ignore it. It is
 * BLOCKED only while an OPEN issue is carrying a real release effect or
 * is still untriaged — a state a person can leave by doing the work.
 */
const openBlocking = dispositionRows.filter(
  (row) => row.state === "open" && row.release_effect === "BLOCKS_RELEASE",
).length;
const untriaged = dispositionRows.filter(
  (row) => row.state === "open" && row.pending_human_triage,
).length;

console.log(
  JSON.stringify({
    status: openBlocking === 0 && untriaged === 0 ? "PASS" : "BLOCKED",
    issues: issues.length,
    pullRequests: pullRequests.length,
    dispositions: dispositionRows.length,
    milestones: milestones.length,
    counterMismatches: counterMismatches.length,
    openBlockingRelease: openBlocking,
    openUntriaged: untriaged,
  }),
);
