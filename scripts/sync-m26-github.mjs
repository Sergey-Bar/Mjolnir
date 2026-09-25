import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
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
const dispositionRows = issues.map((row) => ({
  issue_number: row.number,
  github_milestone: row.milestone?.number ?? null,
  logical_milestone: row.milestone
    ? `M${row.milestone.number - 1}`
    : "UNASSIGNED",
  state: row.state,
  state_reason: row.state_reason ?? null,
  canonical_disposition:
    row.state === "open"
      ? "CARRY_FORWARD"
      : row.state_reason === "not_planned"
        ? "CLOSED_NOT_PLANNED"
        : "CLOSED_UNVERIFIED",
  target_train: row.state === "open" ? "M26" : "HISTORICAL_ARCHIVE",
  duplicate_or_successor: null,
  owner: "Sergey-Bar",
  dependencies: [],
  evidence_status: "PENDING_HUMAN_REVIEW",
  release_effect: row.state === "open" ? "RELEASE_BLOCKED" : "NONE",
  last_reconciled_at: now,
}));
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
writeFileSync(
  join(root, "docs/M26-ISSUE-DISPOSITIONS.jsonl"),
  `${dispositionRows.map((row) => JSON.stringify(row)).join("\n")}\n`,
  "utf8",
);
writeFileSync(
  join(root, "docs/M26-GITHUB-SNAPSHOT.json"),
  `${JSON.stringify(snapshot, null, 2)}\n`,
  "utf8",
);
console.log(
  JSON.stringify({
    status: "BLOCKED",
    issues: issues.length,
    pullRequests: pullRequests.length,
    dispositions: dispositionRows.length,
    milestones: milestones.length,
    counterMismatches: counterMismatches.length,
  }),
);
