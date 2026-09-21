/**
 * Managed-surface stamp check (certification F3, remediation plan
 * 1788806598818): every Mjölnir-managed instruction surface on disk
 * must match what `mjolnir install` would write for the running
 * CLI_VERSION.
 *
 * Audit evidence (QA/FINAL-RELEASE drift-gate run): the committed
 * `.claude/commands/mjolnir.md` carried stamp `mjolnir:managed
 * v0.5.15` while `planInstall` planned `v0.5.18` — the
 * generated-docs-drift CI job never regenerated agent surfaces, so the
 * stale stamp shipped silently. This check closes that hole: it is
 * deterministic (the planned content is version-pinned, no
 * timestamps) and CI-blocking.
 *
 * Mechanism: reuses the exported, pure `planInstall()` — the SAME plan
 * `mjolnir install` executes — so the check can never drift from the
 * installer (one implementation, no second source of truth).
 *
 * Exit codes: 0 = every detected surface matches the install plan;
 * 1 = at least one surface would change. Entry semantics mirror the
 * installer: `create` = the managed file is missing from the tree
 * (commit it); `refuse` = the on-disk file differs from the planned
 * content — on a fresh CI checkout that is EXACTLY the stale-stamp
 * drift F3 shipped silently, so it fails (fix: run
 * `npx mjolnir-qa install --force` and commit the resync).
 *
 * Usage: node scripts/check-managed-surfaces.mjs [repoRoot]
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { planInstall } from "../src/commands/install-agents.js";

const ROOT = process.argv[2] ?? process.cwd();

/** True when git ignores the path (e.g. .kilo/ agent-session state) — a
 * file git can never track cannot be a committed-tree drift obligation. */
function gitIgnored(absPath) {
  const r = spawnSync("git", ["-C", ROOT, "check-ignore", absPath], {
    encoding: "utf8",
  });
  return r.status === 0;
}
const { entries, detected } = planInstall(resolve(ROOT));

if (detected === 0) {
  console.log(
    "managed-surfaces: no instruction surfaces detected in this tree — nothing to check ✓",
  );
  process.exit(0);
}

const drifted = [];
for (const e of entries) {
  const rel = relative(ROOT, e.file).split("\\").join("/");
  if (e.action === "no-op") {
    console.log(`managed-surfaces: ok ${rel}`);
    continue;
  }
  // `create` = the managed file is missing; `refuse` = the on-disk
  // content differs from the plan (on CI: the stale-stamp drift F3
  // shipped). BOTH are resync obligations — UNLESS the path is
  // gitignored (machine-local surface like .kilo/): a file git can
  // never track is not a committed-tree obligation, and CI checkouts
  // never even detect that surface.
  if (e.action === "create" && !existsSync(e.file) && gitIgnored(e.file)) {
    console.log(
      `managed-surfaces: skip ${rel} (create obligation on a gitignored path — machine-local only)`,
    );
    continue;
  }
  drifted.push({ file: rel, action: e.action });
}

if (drifted.length > 0) {
  console.error(
    "managed-surfaces: STALE managed surfaces — run `npx mjolnir-qa install` and commit the resync:",
  );
  for (const d of drifted) {
    console.error(`  ${d.action}: ${d.file}`);
  }
  console.error(
    `managed-surfaces: ${drifted.length} stale surface(s) — the stamp/version drift that certification F3 shipped silently must never recur`,
  );
  process.exit(1);
}
console.log(
  `managed-surfaces: ${entries.length} surface(s) match the install plan ✓`,
);
process.exit(0);
