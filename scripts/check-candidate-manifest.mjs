import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? process.cwd();
const path = join(root, "candidate-trust-manifest.json");
const manifest = JSON.parse(readFileSync(path, "utf8"));
const fail = (message) => {
  console.error(`candidate-manifest: ${message}`);
  process.exit(1);
};
if (
  manifest.schemaVersion !== 1 ||
  manifest.identity?.state !== "WORKING_CANDIDATE"
) {
  fail("schemaVersion/identity must describe a WORKING_CANDIDATE");
}
if (manifest.identity.candidateSha !== null) {
  fail("working candidate cannot carry a candidate SHA");
}
if (manifest.engineeringCertificationState === "CERTIFIED") {
  fail("working candidate cannot be CERTIFIED");
}
if (manifest.releaseAuthorizationState !== "NOT_AUTHORIZED") {
  fail("pre-authorization manifest must remain NOT_AUTHORIZED");
}
for (const key of ["packageSha256", "lockfileSha256"]) {
  if (!/^[a-f0-9]{64}$/.test(manifest.identity[key]))
    fail(`${key} is not a SHA-256`);
}
for (const source of manifest.sourceRefs ?? []) {
  if (!existsSync(join(root, source)))
    fail(`missing source reference ${source}`);
}
const packageHash = createHash("sha256")
  .update(readFileSync(join(root, "package.json")))
  .digest("hex");
const lockHash = createHash("sha256")
  .update(readFileSync(join(root, "package-lock.json")))
  .digest("hex");
if (packageHash !== manifest.identity.packageSha256) fail("package hash drift");
if (lockHash !== manifest.identity.lockfileSha256) fail("lockfile hash drift");
const diff =
  spawnSync(
    "git",
    [
      "diff",
      "--binary",
      manifest.identity.baseSha,
      "--",
      ".",
      ":(exclude)candidate-trust-manifest.json",
    ],
    {
      cwd: root,
      encoding: null,
      windowsHide: true,
    },
  ).stdout ?? Buffer.alloc(0);
const untracked = spawnSync(
  "git",
  ["ls-files", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8", windowsHide: true },
)
  .stdout.split(/\r?\n/)
  .filter((value) => value && value !== "candidate-trust-manifest.json")
  .sort();
const treeParts = [
  diff,
  ...untracked.flatMap((value) => [
    Buffer.from(`${value}\0`),
    readFileSync(join(root, value)),
  ]),
];
const workingTreeHash = createHash("sha256")
  .update(Buffer.concat(treeParts))
  .digest("hex");
if (workingTreeHash !== manifest.identity.workingTreeSha256) {
  fail(
    `working-tree hash drift (expected ${manifest.identity.workingTreeSha256}, received ${workingTreeHash})`,
  );
}
const changedPathCount = new Set(
  [
    ...spawnSync(
      "git",
      [
        "diff",
        "--name-only",
        manifest.identity.baseSha,
        "--",
        ".",
        ":(exclude)candidate-trust-manifest.json",
      ],
      {
        cwd: root,
        encoding: "utf8",
        windowsHide: true,
      },
    ).stdout.split(/\r?\n/),
    ...untracked,
  ].filter(Boolean),
).size;
if (changedPathCount !== manifest.identity.changedPathCount) {
  fail("changed-path count drift");
}
if (
  !manifest.claimRegistry?.path ||
  !existsSync(join(root, manifest.claimRegistry.path))
) {
  fail("claim registry reference is missing");
}
for (const state of Object.values(
  manifest.evidence?.certificationWaves ?? {},
)) {
  if (
    ![
      "PASS",
      "FAIL",
      "BLOCKED",
      "NOT_RUN",
      "PARTIAL",
      "LOCAL_PROVEN",
      "REMOTE_PROVEN",
      "REMOTE_BLOCKED",
    ].includes(state)
  ) {
    fail(`invalid wave evidence state ${state}`);
  }
}
console.log(
  JSON.stringify({
    status: "PASS",
    state: manifest.identity.state,
    engineeringCertificationState: manifest.engineeringCertificationState,
    releaseAuthorizationState: manifest.releaseAuthorizationState,
  }),
);
