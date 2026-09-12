/**
 * Layer A gate — fixture structural typecheck (certification-audit Phase 2,
 * G3 two-layer model).
 *
 * Runs `tsc --noEmit -p tsconfig.fixtures.json` and reconciles the
 * diagnostics against tests/fixtures/typecheck-allowlist.json:
 *   - a diagnostic on a NON-allowlisted fixture  → FAIL (new rot)
 *   - an allowlisted fixture with NO diagnostics → FAIL (stale entry —
 *     fixing a fixture must remove its row; the allowlist cannot accumulate)
 * Exit 0 only when both directions reconcile. The allowlist length is
 * additionally snapshot-locked by tests/config/fixture-typecheck-gate.spec.ts.
 *
 * Deterministic output; repo-relative POSIX paths (G5 normalization
 * contract) so CI and local runs agree.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TSCONFIG = "tsconfig.fixtures.json";
const ALLOWLIST = "tests/fixtures/typecheck-allowlist.json";

function toRepoPosix(p: string): string {
  return relative(ROOT, p).replaceAll("\\", "/");
}

interface AllowlistEntry {
  path: string;
  reason: string;
}

function loadAllowlist(): AllowlistEntry[] {
  const raw = JSON.parse(readFileSync(join(ROOT, ALLOWLIST), "utf8")) as {
    entries: AllowlistEntry[];
  };
  if (!Array.isArray(raw.entries)) {
    throw new Error(`${ALLOWLIST}: missing "entries" array`);
  }
  for (const e of raw.entries) {
    if (
      typeof e.path !== "string" ||
      typeof e.reason !== "string" ||
      !e.reason
    ) {
      throw new Error(
        `${ALLOWLIST}: every entry needs "path" and a non-empty "reason"`,
      );
    }
  }
  return raw.entries;
}

interface Diagnostic {
  file: string;
  line: number;
  code: string;
  message: string;
}

function runTypecheck(): Diagnostic[] {
  // The tsc binary normally comes from this repo's node_modules; synthetic-
  // tree invocations (the anti-false-green tests) redirect it explicitly.
  const nodeModules =
    process.env.MJOLNIR_TYPECHECK_NODE_MODULES ?? join(ROOT, "node_modules");
  const res = spawnSync(
    process.execPath,
    [
      join(nodeModules, "typescript", "bin", "tsc"),
      "--noEmit",
      "-p",
      TSCONFIG,
      "--pretty",
      "false",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const diagnostics: Diagnostic[] = [];
  for (const m of out.matchAll(
    /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm,
  )) {
    diagnostics.push({
      file: toRepoPosix(m[1] as string),
      line: Number(m[2]),
      code: m[4] as string,
      message: m[5] as string,
    });
  }
  // A tsc crash that produced no parsable diagnostics is itself a failure.
  if (res.status !== 0 && diagnostics.length === 0) {
    throw new Error(
      `${TSCONFIG} failed without parsable diagnostics (tsc exit ${res.status}):\n${out.slice(0, 2000)}`,
    );
  }
  return diagnostics;
}

export function main(): number {
  let allowlist: AllowlistEntry[];
  let diagnostics: Diagnostic[];
  try {
    allowlist = loadAllowlist();
    diagnostics = runTypecheck();
  } catch (e) {
    console.error(
      `fixture-typecheck gate: ${e instanceof Error ? e.message : String(e)}`,
    );
    return 1;
  }

  const allowSet = new Set(allowlist.map((e) => e.path));
  const filesWithErrors = new Set(diagnostics.map((d) => d.file));

  const unallowlisted = [...filesWithErrors].filter((f) => !allowSet.has(f));
  const stale = allowlist.filter((e) => !filesWithErrors.has(e.path));

  let failed = false;

  if (unallowlisted.length > 0) {
    failed = true;
    console.error(
      `fixture typecheck: ${unallowlisted.length} fixture file(s) have type errors and are NOT allowlisted —` +
        ` fix the fixture (imports must resolve; this is the QA-PW-125 rot class) or, only if the` +
        ` malformation is deliberate detector input, add a justified allowlist entry:\n` +
        unallowlisted
          .flatMap((f) =>
            diagnostics
              .filter((d) => d.file === f)
              .slice(0, 3)
              .map((d) => `  ${d.file}:${d.line}: ${d.code} ${d.message}`),
          )
          .join("\n"),
    );
  }

  if (stale.length > 0) {
    failed = true;
    console.error(
      `fixture typecheck: ${stale.length} allowlist entr(ies) no longer have type errors —` +
        ` remove them from ${ALLOWLIST} (the allowlist documents genuine deliberate` +
        ` malformations, not history):\n` +
        stale.map((e) => `  ${e.path}`).join("\n"),
    );
  }

  if (!failed) {
    const exempt = allowlist.length;
    console.log(
      `fixture typecheck: OK — 0 unexpected errors, ${exempt} allowlisted (each justified).`,
    );
    return 0;
  }
  return 1;
}

if (
  process.argv[1] &&
  toRepoPosix(process.argv[1]).endsWith("typecheck-fixtures.ts")
) {
  process.exit(main());
}
