/**
 * The `capability` verb (Wave 1, §1).
 *
 * It exists so the registry is inspectable by the people who would
 * otherwise be tempted to edit a support list. The command's whole value
 * is that it is **read-only and non-negotiable**: there is no
 * `--maturity`, no `--set`, no promotion flag. A capability level is
 * derived from evidence, so the only verbs this command has are *show*
 * and *check*.
 *
 * Exit-code contract (stable, e2e-locked):
 *   0  — the registry is well-formed and nothing over-claims
 *   1  — a violation: an over-claim, a stale reference, a missing gap
 *   10 — usage error (unknown flag / flag-shaped positional)
 *   20 — internal error
 *
 * `--json` prints the machine contract and nothing else, so
 * `mjolnir capability --json > registry.json` is a clean file. The exit
 * code is the gate; the JSON is the evidence.
 */

import type { Output } from "../cli-io.js";
import { err as stderrOut, out as stdoutOut } from "../cli-io.js";
import {
  buildCapabilityRegistry,
  realCapabilityEvidence,
  validateRegistry,
  type CapabilityEntry,
  type RegistryDiagnostic,
} from "../v6/capability-registry.js";
import { MATURITY_SHORT } from "../v6/maturity.js";

export interface CapabilityQuery {
  kind: string | null;
  maturity: string | null;
  id: string | null;
}

/** Parse the flags. Anything flag-shaped that is not documented is a
 *  usage error rather than a silently ignored argument, because
 *  `capability --promote-m3` must not read as "show me everything". */
export function parseCapabilityArgs(argv: readonly string[]): {
  query: CapabilityQuery;
  json: boolean;
  unknown: readonly string[];
} {
  const allowed = new Set(["--json", "--kind", "--maturity", "--id"]);
  const unknown: string[] = [];
  const query: CapabilityQuery = { kind: null, maturity: null, id: null };
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    if (!arg.startsWith("-")) {
      unknown.push(arg);
      continue;
    }
    const [flag, inlineValue] = arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, undefined];
    if (!allowed.has(flag)) {
      unknown.push(arg);
      continue;
    }
    if (flag === "--json") {
      json = true;
      continue;
    }
    const value = inlineValue ?? argv[index + 1] ?? "";
    if (inlineValue === undefined) index += 1;
    if (flag === "--kind") query.kind = value;
    if (flag === "--maturity") query.maturity = value;
    if (flag === "--id") query.id = value;
  }
  return { query, json, unknown };
}

export function selectCapabilities(
  entries: readonly CapabilityEntry[],
  query: CapabilityQuery,
): CapabilityEntry[] {
  return entries.filter((entry) => {
    if (query.id !== null && !entry.id.includes(query.id)) return false;
    if (query.kind !== null && entry.kind !== query.kind) return false;
    if (
      query.maturity !== null &&
      MATURITY_SHORT[entry.maturity] !== query.maturity.toUpperCase()
    ) {
      return false;
    }
    return true;
  });
}

export function capabilityJson(
  entries: readonly CapabilityEntry[],
  diagnostics: readonly RegistryDiagnostic[],
): string {
  return (
    JSON.stringify(
      {
        contract: "mjolnir.capability.v1",
        count: entries.length,
        capabilities: entries.map((entry) => ({
          capabilityId: entry.id,
          name: entry.name,
          kind: entry.kind,
          owner: entry.owner,
          maturity: MATURITY_SHORT[entry.maturity],
          rules: entry.rules,
          adapter: entry.adapter,
          proof: entry.proof,
          nextLevelGap: entry.nextLevelGap,
          blocksAxes: entry.blocksAxes,
        })),
        violations: diagnostics.map((d) => ({
          code: d.code,
          capabilityId: d.entryId,
          message: d.message,
        })),
      },
      null,
      2,
    ) + "\n"
  );
}

export function renderCapabilityText(
  entries: readonly CapabilityEntry[],
  diagnostics: readonly RegistryDiagnostic[],
): string {
  const lines: string[] = [
    "Mjolnir capability registry",
    "",
    "Maturity is derived from evidence and cannot be set here. A capability is",
    "shown at the level the machine can prove, or not shown at all.",
    "",
  ];
  for (const entry of entries) {
    lines.push(`${entry.id}  [${MATURITY_SHORT[entry.maturity]}]`);
    lines.push(`  kind        ${entry.kind}`);
    lines.push(`  owner       ${entry.owner}`);
    if (entry.rules.length > 0) {
      lines.push(`  rules       ${entry.rules.join(", ")}`);
    }
    if (entry.adapter !== null) {
      lines.push(`  adapter     ${entry.adapter}`);
    }
    lines.push(
      `  proof       ${entry.proof.status}${
        entry.proof.artifact === null ? "" : ` (${entry.proof.artifact})`
      }`,
    );
    if (entry.nextLevelGap !== null) {
      lines.push(`  next level  ${entry.nextLevelGap.target}`);
      for (const missing of entry.nextLevelGap.missing) {
        lines.push(`              - ${missing}`);
      }
    }
    lines.push("");
  }
  if (diagnostics.length > 0) {
    lines.push(`${diagnostics.length} violation(s):`);
    for (const diagnostic of diagnostics) {
      lines.push(
        `  ${diagnostic.code} ${diagnostic.entryId}: ${diagnostic.message}`,
      );
    }
  } else {
    lines.push(
      "No violations: no capability is advertised above its proven level.",
    );
  }
  return lines.join("\n");
}

export function runCapabilityCommand(
  argv: readonly string[],
  io: { out: Output; err: Output } = { out: stdoutOut, err: stderrOut },
): number {
  const { query, json, unknown } = parseCapabilityArgs(argv);
  if (unknown.length > 0) {
    io.err(`capability: unknown argument ${unknown[0] ?? ""}\n`);
    io.err(
      "  usage: mjolnir capability [--json] [--kind <k>] [--maturity M0..M5] [--id <substring>]\n",
    );
    io.err(
      "  note: there is deliberately no --set or --promote. Maturity is derived\n" +
        "        from evidence, so it cannot be edited here.\n",
    );
    return 10;
  }

  // Build once with the checkout's real evidence, then validate against
  // that same evidence. Passing a *different* evidence set here is the
  // bug this arrangement exists to prevent: a table and its check that
  // disagree are two truths wearing one command's clothes.
  const registry = buildCapabilityRegistry({
    evidence: realCapabilityEvidence(),
  });
  const diagnostics = validateRegistry(registry);
  const entries = selectCapabilities(registry.entries, query);
  io.out(
    json
      ? capabilityJson(entries, diagnostics)
      : `${renderCapabilityText(entries, diagnostics)}\n`,
  );
  return diagnostics.length > 0 ? 1 : 0;
}
