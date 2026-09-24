import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const ROOT = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
const EXPECTED_BRANCH =
  process.env.MJSONIR_REMEDIATION_BRANCH ?? "remediation/trust-certification";
const EXPECTED_ROOT = process.env.MJSONIR_REMEDIATION_ROOT;
const BASE_SHA = process.env.MJSONIR_BASE_SHA;
const ORIGINAL_ROOT = process.env.MJSONIR_ORIGINAL_ROOT;
const ORIGINAL_BRANCH = process.env.MJSONIR_ORIGINAL_BRANCH;
const ORIGINAL_HEAD = process.env.MJSONIR_ORIGINAL_HEAD;

function gitAt(cwd, args, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return { status: result.status, stdout: result.stdout.trim() };
}

function git(args, allowFailure = false) {
  return gitAt(ROOT, args, allowFailure);
}

function canonical(path) {
  return realpathSync(path).replaceAll("\\", "/").toLowerCase();
}

const repositoryRoot = canonical(git(["rev-parse", "--show-toplevel"]).stdout);
const branch = git(["branch", "--show-current"]).stdout;
const head = git(["rev-parse", "HEAD"]).stdout;

if (branch !== EXPECTED_BRANCH) {
  throw new Error(`expected branch ${EXPECTED_BRANCH}, received ${branch}`);
}
if (EXPECTED_ROOT && repositoryRoot !== canonical(EXPECTED_ROOT)) {
  throw new Error(
    `expected worktree ${EXPECTED_ROOT}, received ${repositoryRoot}`,
  );
}

const worktrees = git(["worktree", "list", "--porcelain"]).stdout;
const registered = worktrees.split(/\r?\n\r?\n/).some((block) => {
  const lines = block.split(/\r?\n/);
  const path = lines.find((line) => line.startsWith("worktree "))?.slice(9);
  const worktreeBranch = lines
    .find((line) => line.startsWith("branch "))
    ?.slice(7);
  return (
    path !== undefined &&
    worktreeBranch === `refs/heads/${branch}` &&
    canonical(path) === repositoryRoot
  );
});
if (!registered) {
  throw new Error("active branch/root pair is not registered as a worktree");
}

if (BASE_SHA) {
  const ancestor = git(["merge-base", "--is-ancestor", BASE_SHA, "HEAD"], true);
  if (ancestor.status !== 0) {
    throw new Error(`BASE_SHA ${BASE_SHA} is not an ancestor of HEAD`);
  }
}

const diffCheck = spawnSync("git", ["diff", "--check"], {
  cwd: ROOT,
  encoding: "utf8",
  windowsHide: true,
});
if (diffCheck.status !== 0) {
  throw new Error(diffCheck.stdout.trim() || diffCheck.stderr.trim());
}
const cachedDiffCheck = spawnSync("git", ["diff", "--cached", "--check"], {
  cwd: ROOT,
  encoding: "utf8",
  windowsHide: true,
});
if (cachedDiffCheck.status !== 0) {
  throw new Error(
    cachedDiffCheck.stdout.trim() || cachedDiffCheck.stderr.trim(),
  );
}

let originalIntegrity = "NOT_CHECKED";
let originalRoot = null;
let originalBranch = null;
let originalHead = null;
if (ORIGINAL_ROOT) {
  originalRoot = canonical(ORIGINAL_ROOT);
  const actualOriginalRoot = canonical(
    gitAt(originalRoot, ["rev-parse", "--show-toplevel"]).stdout,
  );
  if (actualOriginalRoot !== originalRoot) {
    throw new Error(
      `original root mismatch: expected ${originalRoot}, received ${actualOriginalRoot}`,
    );
  }
  originalBranch = gitAt(originalRoot, ["branch", "--show-current"]).stdout;
  originalHead = gitAt(originalRoot, ["rev-parse", "HEAD"]).stdout;
  if (ORIGINAL_BRANCH && originalBranch !== ORIGINAL_BRANCH) {
    throw new Error(
      `expected original branch ${ORIGINAL_BRANCH}, received ${originalBranch}`,
    );
  }
  if (ORIGINAL_HEAD && originalHead !== ORIGINAL_HEAD) {
    throw new Error(
      `expected original HEAD ${ORIGINAL_HEAD}, received ${originalHead}`,
    );
  }
  const originalDiffCheck = spawnSync("git", ["diff", "--check"], {
    cwd: originalRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (originalDiffCheck.status !== 0) {
    throw new Error(
      originalDiffCheck.stdout.trim() || originalDiffCheck.stderr.trim(),
    );
  }
  const originalCachedDiffCheck = spawnSync(
    "git",
    ["diff", "--cached", "--check"],
    {
      cwd: originalRoot,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (originalCachedDiffCheck.status !== 0) {
    throw new Error(
      originalCachedDiffCheck.stdout.trim() ||
        originalCachedDiffCheck.stderr.trim(),
    );
  }
  originalIntegrity = "PASS";
}

const changedPaths = [
  ...new Set(
    [
      ...git(["diff", "--name-only", "HEAD"]).stdout.split(/\r?\n/),
      ...git(["ls-files", "--others", "--exclude-standard"]).stdout.split(
        /\r?\n/,
      ),
    ].filter(Boolean),
  ),
].sort();

process.stdout.write(
  `${JSON.stringify(
    {
      status: "PASS",
      branch,
      head,
      root: repositoryRoot,
      baseSha: BASE_SHA ?? null,
      originalRoot,
      originalBranch,
      originalHead,
      originalIntegrity,
      changedPathCount: changedPaths.length,
      changedPaths,
    },
    null,
    2,
  )}\n`,
);
