/**
 * Candidate binding (plan V5-010).
 *
 * Reads a candidate trust manifest and produces the immutable
 * `CandidateBinding` that a run identity is bound to. It also computes the
 * repository facts (commit, tree, lockfile digest) that the identity was
 * missing until this module existed.
 *
 * The law here is ABSENCE over invention. A manifest that is missing,
 * unreadable, or internally contradictory yields NO binding — not a partial
 * one. A consumer that can see "not bound" can refuse to trust the run; a
 * consumer handed a half-filled binding cannot tell what is missing, and will
 * trust the parts that are there.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { CandidateBinding } from "../types.js";
import { resolveGitPath } from "../scope/git-resolve.js";

export const CANDIDATE_MANIFEST_PATH = "candidate-trust-manifest.json";

const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const STATES = ["WORKING_CANDIDATE", "RELEASE_CANDIDATE"];
const AUTHORIZATION = ["NOT_AUTHORIZED", "AUTHORIZED"];

export type RepositoryBinding = {
  commit?: string;
  tree?: string;
  lockfile?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256File(path: string): string | undefined {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return undefined;
  }
}

/**
 * One git line, or nothing.
 *
 * Audit S1: the binary is the ABSOLUTE path `resolveGitPath()` found by
 * walking PATH itself, never the bare name. `bindRepository()` runs on every
 * scan (`scan-pipeline.ts`), and a bare `execFileSync("git", …)` lets a
 * `git.exe`/`git.bat`/`git.cmd` CHECKED INTO AN UNTRUSTED REPO hijack the
 * call on Windows, where CreateProcess searches the current directory before
 * PATH. The attacker then controls the `commit` and `tree` that land in
 * `runIdentity` and the evidence graph — the provenance a release decision
 * reads. This was the last bare-name exec left in `src/`; the invariant that
 * keeps it that way is `tests/contract/no-bare-process-exec.spec.ts`.
 *
 * The `-C <root>` shape (not `cwd`) matches every other hardened call site.
 * With no git on PATH at all, the answer is nothing — a scan of an unpacked
 * tarball has no commit, and its identity must say so rather than carrying a
 * placeholder that looks like provenance.
 */
function gitLine(root: string, args: string[]): string | undefined {
  const exe = resolveGitPath();
  if (!exe) return undefined;
  try {
    const out = execFileSync(exe, ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
      timeout: 15_000,
    });
    const trimmed = out.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  } catch {
    // Not a repository, or git is absent. Both are legitimate: a scan of an
    // unpacked tarball has no commit, and its identity must say so rather than
    // carrying a placeholder that looks like provenance.
    return undefined;
  }
}

/**
 * The commit and tree the working tree is at. Both absent outside a
 * repository or with no commits — never substituted with a placeholder.
 */
export function bindRepository(root: string): RepositoryBinding {
  const commit = gitLine(root, ["rev-parse", "HEAD"]);
  const tree = gitLine(root, ["rev-parse", "HEAD^{tree}"]);
  const lockfile = sha256File(join(root, "package-lock.json"));
  return {
    ...(commit !== undefined ? { commit } : {}),
    ...(tree !== undefined ? { tree } : {}),
    ...(lockfile !== undefined ? { lockfile } : {}),
  };
}

/**
 * Parse a candidate manifest into a binding, or return null when it cannot
 * honestly be bound.
 *
 * Null is returned for: no manifest, unreadable JSON, a missing or malformed
 * required field, or a state/authorization combination that cannot legally
 * exist (a WORKING_CANDIDATE carrying a commit, for example — the same
 * contradiction the release decision evaluator treats as BLOCKED).
 */
export function parseCandidateBinding(raw: unknown): CandidateBinding | null {
  if (!isRecord(raw)) return null;
  const identity = raw.identity;
  if (!isRecord(identity)) return null;

  const state = identity.state;
  const candidateSha = identity.candidateSha;
  const baseSha = identity.baseSha;
  const packageSha256 = identity.packageSha256;
  const lockfileSha256 = identity.lockfileSha256;

  if (typeof state !== "string" || !STATES.includes(state)) return null;
  if (typeof baseSha !== "string" || !SHA40.test(baseSha)) return null;
  if (typeof packageSha256 !== "string" || !SHA256.test(packageSha256)) {
    return null;
  }
  if (typeof lockfileSha256 !== "string" || !SHA256.test(lockfileSha256)) {
    return null;
  }
  if (
    candidateSha !== null &&
    (typeof candidateSha !== "string" || !SHA40.test(candidateSha))
  ) {
    return null;
  }

  const manifestId = raw.manifestId;
  if (typeof manifestId !== "string" || manifestId.length === 0) return null;
  const owner = typeof raw.owner === "string" ? raw.owner : "UNASSIGNED";

  const authorization = raw.releaseAuthorizationState;
  if (
    typeof authorization !== "string" ||
    !AUTHORIZATION.includes(authorization)
  ) {
    return null;
  }

  // The state transition law, stated once. A working candidate has no commit
  // and cannot be authorized; a release candidate must have one.
  if (state === "WORKING_CANDIDATE") {
    if (candidateSha !== null) return null;
    if (authorization !== "NOT_AUTHORIZED") return null;
  } else if (candidateSha === null) {
    return null;
  }

  // `state` and `authorization` are narrowed by the includes() guards above
  // only in the sense that a bad value already returned; TypeScript cannot see
  // that through the array, so the two narrowings are restated here rather
  // than left as casts on the whole object.
  const narrowedState = state as CandidateBinding["state"];
  const narrowedAuthorization =
    authorization as CandidateBinding["releaseAuthorizationState"];

  return {
    manifestId,
    state: narrowedState,
    candidateSha,
    baseSha,
    packageSha256,
    lockfileSha256,
    owner,
    releaseAuthorizationState: narrowedAuthorization,
  };
}

/** Read and bind the manifest from a checkout, or null. */
export function readCandidateBinding(
  root: string,
  manifestPath: string = CANDIDATE_MANIFEST_PATH,
): CandidateBinding | null {
  try {
    return parseCandidateBinding(
      JSON.parse(readFileSync(join(root, manifestPath), "utf8")),
    );
  } catch {
    return null;
  }
}
