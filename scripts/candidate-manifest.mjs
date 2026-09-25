import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const MANIFEST_PATH = "candidate-trust-manifest.json";

function git(root, args, encoding = "utf8") {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr?.toString().trim() ?? "unknown error"}`,
    );
  }
  return result.stdout;
}

function pathsFromGit(root, args) {
  return git(root, args, null)
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((path) => path !== MANIFEST_PATH)
    .sort();
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function readCandidateManifest(root) {
  return JSON.parse(readFileSync(join(root, MANIFEST_PATH), "utf8"));
}

export function inspectCandidateWorktree(root) {
  const trackedPaths = pathsFromGit(root, ["ls-files", "-z"]);
  const untrackedPaths = pathsFromGit(root, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
  ]);
  const changedPaths = pathsFromGit(root, [
    "diff",
    "--name-only",
    "-z",
    "HEAD",
  ]);
  const treePaths = [...new Set([...trackedPaths, ...untrackedPaths])].sort();
  const treeParts = treePaths.flatMap((path) => {
    const absolutePath = join(root, path);
    const content = existsSync(absolutePath)
      ? readFileSync(absolutePath)
      : Buffer.from("deleted");
    return [Buffer.from(`${path}\0`), content];
  });
  const allDirtyPaths = [
    ...new Set([...changedPaths, ...untrackedPaths]),
  ].sort();
  const packageContent = readFileSync(join(root, "package.json"));
  const { version } = JSON.parse(packageContent.toString("utf8"));

  return {
    version,
    baseSha: git(root, ["rev-parse", "HEAD"]).trim(),
    packageSha256: sha256(packageContent),
    lockfileSha256: sha256(readFileSync(join(root, "package-lock.json"))),
    workingTreeSha256: sha256(Buffer.concat(treeParts)),
    changedPathCount: allDirtyPaths.length,
    dirtyFiles: allDirtyPaths,
    worktreeInventory: {
      changedPaths,
      untrackedPaths,
    },
  };
}

export function buildCandidateManifest(root) {
  const manifest = readCandidateManifest(root);
  return {
    ...manifest,
    generatedAt: new Date().toISOString().slice(0, 10),
    identity: {
      ...manifest.identity,
      ...inspectCandidateWorktree(root),
    },
  };
}
