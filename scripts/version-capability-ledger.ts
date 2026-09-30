/**
 * `docs/VERSION-CAPABILITY-LEDGER.json` — "which now…" turned into assertions.
 *
 * Every fix that shipped with a "which now…" sentence, and none of them an
 * assertion. Seven statements, zero checks: any of them could be reverted with
 * CI green, because a sentence in a changelog is not a gate. The claim registry
 * already carries `implementation` / `tests` / `corpus` per claim — the
 * information existed and nothing read it by version.
 *
 * Where it is checked is the decision. The plan proposed emitting it in the
 * release workflow, which is the one place a checker cannot help: the drift it
 * looks for is what makes a release wrong. This is generated AND gated on
 * every PR, and a mismatch between what a version claims and what the tree
 * demonstrates fails the build.
 *
 * The failure direction is the whole design. A version claims capabilities; a
 * capability is demonstrated by files. If a version claims one and the file is
 * gone, the CLAIM is what is wrong — so the error names the version and the
 * capability, and the fix is to re-demonstrate or to correct the claim. It is
 * never "lower the ledger" as a way to make it agree, because a ledger that is
 * edited to match whatever the tree happens to be is a mirror and not a record.
 *
 * Usage: npx tsx scripts/version-capability-ledger.ts [--check] [--root=<dir>]
 * Exit codes: 0 = every claim is demonstrated, 1 = a claim is not, 2 = setup error.
 *
 * `--root` selects the checkout the demonstrating FILES are looked for in. It
 * exists for the same reason every other gate here takes one: the negative
 * test has to observe a claim whose file is missing, and deleting a real
 * source file to make that happen would leave
 * `tests/certification/candidate-manifest.spec.ts` reporting tree drift.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { prettify } from "./lib/prettify.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CHECK_ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined ? ROOT : resolve(flag.slice("--root=".length));
})();
const OUT = join(ROOT, "docs", "VERSION-CAPABILITY-LEDGER.json");
const REGISTRY = join(CHECK_ROOT, "docs", "claim-registry.json");

/**
 * Version → the capabilities that version claimed.
 *
 * A DATA table in a generated artifact's source, which looks backwards. It is
 * the right way round, and the reason is the failure direction: the ledger is
 * a record of what was CLAIMED at a release, and a record that is derived from
 * the current tree cannot fail, because deriving it from the tree makes it the
 * tree. The seven entries below are the "which now…" sentences from 6.0 and the
 * preceding work, each with the file that demonstrates it.
 *
 * A version added here with no demonstrating file fails the gate. That is the
 * entire mechanism.
 */
export interface ClaimedCapability {
  /** The rule, invariant or behaviour, named as the release note named it. */
  capability: string;
  /**
   * A file whose presence IS the demonstration.
   *
   * Not a glob and not a pattern: a claim is demonstrated by a thing existing,
   * and a pattern is a claim about a shape, which is the class of thing this
   * repository keeps having to undo. Two or three paths, all of which must
   * exist.
   */
  demonstratedBy: readonly string[];
  /** The sentence the release note used, kept so the ledger is greppable. */
  note: string;
}

export interface VersionClaim {
  version: string;
  capabilities: readonly ClaimedCapability[];
}

/**
 * What each version claimed.
 *
 * `implemented`, `tested` and `corpus` are the claim registry's own arrays,
 * read per capability by id below; this table records WHICH version claimed
 * WHAT, which is the axis the registry does not have.
 */
export const VERSION_CLAIMS: readonly VersionClaim[] = [
  {
    version: "6.0",
    capabilities: [
      {
        capability: "A coverage gate that cannot be satisfied by a partial run",
        demonstratedBy: [
          "scripts/check-coverage-ratchet.mjs",
          "tests/contract/coverage-ratchet-completeness.spec.ts",
        ],
        note: "which now: reads a file count and a denominator, not summary.total",
      },
      {
        capability:
          "The sample count a straddling rule is quoted is the arithmetic answer",
        demonstratedBy: [
          "src/rules/measurement.ts",
          "tests/rules/registry-ratchet.spec.ts",
        ],
        note: "which now: nForZeroFp is derived, not transposed — 35, not 1",
      },
      {
        capability: "A tier is an executable ratchet, not a sentence",
        demonstratedBy: [
          "src/commands/doctor.ts",
          "docs/ANTI-CREEP-BASELINE.json",
        ],
        note: "which now: the anti-creep law compares against previousBaselineCore",
      },
      {
        capability: "A declared core claim carries an owner and an expiry",
        demonstratedBy: ["src/rules/rule.ts", "src/commands/doctor.ts"],
        note: "which now: corePromotion is required for a core rule without a measurement",
      },
      {
        capability: "A quarantined rule has an owner and a review date too",
        demonstratedBy: [
          "src/commands/doctor.ts",
          "tests/rules/anti-creep.spec.ts",
        ],
        note: "which now: quarantinePromotion, reported as a count",
      },
      {
        capability:
          "A capability is advertised only at the level its own evidence supports",
        demonstratedBy: [
          "src/v6/capability-registry.ts",
          "src/v6/fixture-quad-probe.ts",
        ],
        note: "which now: per-entry evidence, and SUPPORTED requires a verified quad",
      },
      {
        capability:
          "A configuration file nobody reads is a claim the repository does not make",
        demonstratedBy: [
          "scripts/check-config-consumers.mjs",
          "docs/EXTERNAL-CONFIG.md",
        ],
        note: "which now: every root config is read in-repo or declared external",
      },
    ],
  },
];

interface ClaimRegistry {
  claims?: Array<{
    id: string;
    status?: string;
    implementation?: string[];
    tests?: string[];
    corpus?: string[];
  }>;
}

function readRegistry(): ClaimRegistry {
  if (!existsSync(REGISTRY)) return {};
  try {
    return JSON.parse(readFileSync(REGISTRY, "utf8")) as ClaimRegistry;
  } catch {
    return {};
  }
}
export interface LedgerEntry {
  capability: string;
  version: string;
  demonstrated: boolean;
  /** Paths that are claimed to demonstrate it and are not there. */
  missing: string[];
  /** `implemented` / `tested` / `corpus`, present only when the claim registry names them. */
  registryArrays: { implemented: string[]; tested: string[]; corpus: string[] };
}

/** One row per claimed capability, with the demonstration actually checked. */
export function buildLedger(
  claims: readonly VersionClaim[] = VERSION_CLAIMS,
  root: string = ROOT,
  registry: ClaimRegistry = readRegistry(),
): LedgerEntry[] {
  const byId = new Map((registry.claims ?? []).map((c) => [c.id, c]));
  const out: LedgerEntry[] = [];
  for (const version of claims) {
    for (const capability of version.capabilities) {
      // A claim whose id names a claim-registry entry brings that entry's
      // arrays with it. Matched loosely — on the capability text, because the
      // ledger is written in prose and the registry in ids, and a strict join
      // would silently attach nothing.
      const entry = [...byId.values()].find((c) =>
        capability.capability.includes(c.id),
      );
      const missing = capability.demonstratedBy.filter(
        (path) => !existsSync(join(root, path)),
      );
      out.push({
        capability: capability.capability,
        version: version.version,
        demonstrated: missing.length === 0,
        missing,
        registryArrays: {
          implemented: entry?.implementation ?? [],
          tested: entry?.tests ?? [],
          corpus: entry?.corpus ?? [],
        },
      });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const entries = buildLedger(VERSION_CLAIMS, CHECK_ROOT, readRegistry());
  const unproven = entries.filter((e) => !e.demonstrated);
  const report = {
    schemaVersion: 1 as const,
    description:
      "Version → capability → the file that demonstrates it. Generated by " +
      "scripts/version-capability-ledger.ts and checked on every PR: a version " +
      "that claims a capability with no file behind it fails. The failure names " +
      "the version, because a version's claims are what is wrong when the file " +
      "is gone — editing the ledger to match the tree would make it a mirror.",
    versions: VERSION_CLAIMS.map((v) => v.version),
    entries,
  };
  const content = JSON.stringify(report, null, 2) + "\n";

  const check = process.argv.includes("--check");
  if (!check) {
    // Render, write, then PRETTIFY — in that order, and it matters. The
    // `format:check` gate runs over tracked files, so a generator that emits
    // its own formatting fails the build on a file whose CONTENT is correct.
    // `scripts/core-readiness.ts` learned this the same way.
    const previous = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;
    writeFileSync(OUT, content, "utf8");
    await prettify(OUT);
    if (previous !== null && readFileSync(OUT, "utf8") === previous) {
      console.log(
        `version-capability-ledger: unchanged (${entries.length} claims)`,
      );
    } else {
      console.log(`version-capability-ledger: wrote ${OUT}`);
    }
  }

  if (unproven.length > 0) {
    console.error(
      `version-capability-ledger: ${unproven.length} claimed capabilit` +
        `${unproven.length === 1 ? "y" : "ies"} not demonstrated by any file:`,
    );
    for (const entry of unproven) {
      console.error(`  ${entry.version}: ${entry.capability}`);
      console.error(`      missing: ${entry.missing.join(", ")}`);
    }
    console.error(
      "\nRe-demonstrate the capability, or correct the claim. Editing the " +
        "ledger's `demonstratedBy` list to match a tree that lost the file " +
        "makes the ledger a mirror of whatever the tree happens to be.",
    );
  }

  // The REPORT is stdout, in both modes; the human lines above are stderr. The
  // first version printed a prose summary in `--check` mode, so a test had to
  // either scrape it or skip the assertion — and the test that skipped it is
  // how seven unasserted "which now…" sentences survived a release.
  console.log(
    JSON.stringify({ ...report, unproven: unproven.length }, null, 2),
  );
  if (unproven.length > 0) process.exit(1);
}

if (process.argv[1]?.endsWith("version-capability-ledger.ts")) {
  await main();
}
