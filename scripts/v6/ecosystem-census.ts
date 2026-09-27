#!/usr/bin/env tsx
/**
 * `npm run docs:ecosystem` — generates `docs/ECOSYSTEM-CENSUS.json` and
 * `docs/ECOSYSTEM-GAPS.md` from the census registry plus the discovery
 * probe over the checked-out corpus.
 *
 * This generator is the Law 8 / ADR 0010 mechanism. Before it existed,
 * "what does Mjölnir support" was a list somebody typed, so a tool the
 * engine cannot handle was invisible, an upstream major bump was silent,
 * and the roadmap was prioritised by enthusiasm. Now:
 *
 *  - `docs/ECOSYSTEM-CENSUS.json` is the versioned, owned, dated registry
 *    (entries projected from the existing framework/provider primitives
 *    per ADR 0007, plus the day-one seed the blueprint names explicitly).
 *  - `docs/ECOSYSTEM-GAPS.md` is the *generated* diff of census against
 *    discovery, ranked by field frequency. Frequency, not enthusiasm,
 *    sets priority.
 *
 * Maturity in the census is **derived from evidence**, never typed: the
 * resolver in `src/v6/ecosystem-probe.ts` returns `false` for every
 * criterion no machine gate proves today, so a low number here is a real
 * finding, not a placeholder.
 *
 * No timestamps from the clock: the artifact records the git SHA, which
 * is the reproducible identity, so the generated file is byte-stable for a
 * given checkout.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prettify } from "../lib/prettify.js";
import { isMainModule } from "../lib/is-main-module.js";
import {
  buildCensus,
  buildClassifiedResults,
  buildGapBacklog,
  applyStalenessDemotions,
  classifyObservations,
  validateCensus,
  type Census,
  type GapBacklogItem,
  type StalenessDemotion,
  type UnrecognizedDisposition,
} from "../../src/v6/ecosystem-census.js";
import {
  buildRepoEvidenceIndex,
  createEvidenceResolver,
  probeCorpus,
} from "../../src/v6/ecosystem-probe.js";
import { MATURITY_SHORT, ORTHOGONAL_AXES } from "../../src/v6/maturity.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CENSUS_PATH = join(ROOT, "docs", "ECOSYSTEM-CENSUS.json");
const GAPS_PATH = join(ROOT, "docs", "ECOSYSTEM-GAPS.md");
const DISPOSITIONS_PATH = join(ROOT, "docs", "ECOSYSTEM-DISPOSITIONS.json");

/** Reproducible identity. A clock stamp would make the artifact drift. */
function gitSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "UNKNOWN";
  }
}

export interface GeneratedCensus {
  census: Census;
  /** What the census *should* say once staleness demotions apply. */
  effectiveEntries: readonly Census["entries"][number][];
  stalenessDemotions: readonly StalenessDemotion[];
  gaps: GapBacklogItem[];
  unrecognized: readonly { name: string; repos: number; category: string }[];
  recognizedCount: number;
  notAFindingCount: number;
  corpusRepos: number;
  corpusCycles: number;
}

/**
 * Build the whole census + gap report. Pure with respect to the clock:
 * `observedAt` is the git commit date of the checkout, so regenerating
 * without a new commit produces identical bytes.
 */
export function buildGeneratedCensus(root = ROOT): GeneratedCensus {
  const index = buildRepoEvidenceIndex(root);
  const resolver = createEvidenceResolver(index, root);
  const census = buildCensus({ resolver, observedAt: commitDate(root) });
  const results = probeCorpus(root);
  const all = results.flatMap((result) => result.observations);
  const { recognized, unrecognized, notAFinding } = classifyObservations(
    census,
    all,
  );
  // The backlog is built from the classified set only. Feeding
  // `notAFinding` in here would rank `react` above every QA tool in the
  // field, which is enthusiasm-free but also signal-free.
  const gaps = buildGapBacklog(
    buildClassifiedResults(census, results),
    loadDispositions(root),
  );
  const view = applyStalenessDemotions(census, resolver);
  return {
    census,
    effectiveEntries: view.entries,
    stalenessDemotions: view.demotions,
    gaps,
    unrecognized: summarizeUnrecognized(unrecognized, results),
    recognizedCount: recognized.length,
    notAFindingCount: notAFinding.length,
    corpusRepos: results.length,
    corpusCycles: 1,
  };
}

function commitDate(root: string): string {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return "1970-01-01";
  }
}

function summarizeUnrecognized(
  unrecognized: readonly { name: string; category: string }[],
  results: readonly {
    repo: string;
    observations: readonly { name: string }[];
  }[],
): readonly { name: string; repos: number; category: string }[] {
  const names = new Set(unrecognized.map((observation) => observation.name));
  const categories = new Map(
    unrecognized.map((observation) => [observation.name, observation.category]),
  );
  const repos = new Map<string, Set<string>>();
  for (const result of results) {
    for (const observation of result.observations) {
      if (!names.has(observation.name)) continue;
      const bucket = repos.get(observation.name) ?? new Set<string>();
      bucket.add(result.repo);
      repos.set(observation.name, bucket);
    }
  }
  return [...repos.entries()]
    .map(([name, bucket]) => ({
      name,
      repos: bucket.size,
      category: categories.get(name) ?? "UNCLASSIFIED",
    }))
    .sort((a, b) => b.repos - a.repos || a.name.localeCompare(b.name));
}

/**
 * Dispositions for `UNRECOGNIZED` findings. The file is the escape
 * hatch, and it is a *ledger*, not a suppression list: an entry must
 * name an owner, a disposition and a note, and an entry without a
 * disposition does not count (ADR 0010 rule 4 — no silent
 * disappearance).
 */
export function loadDispositions(
  root = ROOT,
): readonly UnrecognizedDisposition[] {
  try {
    const raw = JSON.parse(
      readFileSync(join(root, "docs", "ECOSYSTEM-DISPOSITIONS.json"), "utf8"),
    ) as { dispositions?: UnrecognizedDisposition[] };
    return raw.dispositions ?? [];
  } catch {
    return [];
  }
}

// ─── Renderers ───────────────────────────────────────────────────────

export function renderCensusJson(
  data: GeneratedCensus,
  baseSha: string,
): string {
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        artifact: "ecosystem-census",
        generatedBy: "npm run docs:ecosystem",
        censusId: data.census.censusId,
        observedAt: data.census.observedAt,
        baseSha,
        counts: censusCounts(data.census),
        /**
         * The base registry. Deterministic from the checkout alone, so the
         * artifact is byte-stable for a given commit.
         */
        entries: data.census.entries,
        /**
         * Field-observed staleness (ADR 0010 rule 3), kept **out** of
         * `entries` on purpose: these findings depend on whether the
         * corpus cache is present, and folding them into the registry
         * would make the artifact differ between two machines at the same
         * commit. `ecosystem:census` fails while any entry is demoted, so
         * the finding cannot be ignored — it just cannot masquerade as
         * part of the registry.
         */
        stalenessDemotions: data.stalenessDemotions,
        effectiveEntries: data.effectiveEntries,
      },
      null,
      2,
    ) + "\n"
  );
}

export function censusCounts(census: Census): Record<string, number> {
  const counts: Record<string, number> = { entries: census.entries.length };
  for (const entry of census.entries) {
    counts[`state:${entry.state}`] = (counts[`state:${entry.state}`] ?? 0) + 1;
    counts[`maturity:${MATURITY_SHORT[entry.maturity]}`] =
      (counts[`maturity:${MATURITY_SHORT[entry.maturity]}`] ?? 0) + 1;
  }
  return counts;
}

function cell(value: unknown): string {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

export function renderGapsMd(data: GeneratedCensus): string {
  const { census, gaps, unrecognized, corpusRepos, stalenessDemotions } = data;
  const entries = census.entries;
  const demoted = new Set(stalenessDemotions.map((d) => d.entryId));
  const byState = new Map<string, number>();
  const byMaturity = new Map<string, number>();
  for (const entry of entries) {
    byState.set(entry.state, (byState.get(entry.state) ?? 0) + 1);
    byMaturity.set(
      MATURITY_SHORT[entry.maturity],
      (byMaturity.get(MATURITY_SHORT[entry.maturity]) ?? 0) + 1,
    );
  }

  const lines: string[] = [
    "# QA Ecosystem Census — entries and field gaps",
    "",
    "**Generated — do not edit by hand.** Regenerate: `npm run docs:ecosystem`.",
    "",
    "The census is the authority on *what exists* in the QA ecosystem (Law 8, ADR 0010).",
    "A hand-edited list of frameworks, languages or providers is a documentation",
    "defect by construction, so this file and `docs/ECOSYSTEM-CENSUS.json` are",
    "projections of a versioned registry plus a discovery probe over the corpus.",
    "",
    "## What this file is not",
    "",
    "It is **not** a support claim. `maturity` is derived from evidence by",
    "`deriveMaturityFromEvidence`, so a low number here is a real finding, not a",
    "placeholder — and a number here is never a promise to a user. The user-facing",
    "support statements are projections of the capability registry (ADR 0007).",
    "",
    "## Census summary",
    "",
    `- Registry entries: **${entries.length}**`,
    `- Corpus repositories probed: **${corpusRepos}**`,
    `- Observations matched to a census entry: **${data.recognizedCount}**`,
    "- Observations classified as a QA tool the census has no entry for (`UNRECOGNIZED`): **" +
      `${data.unrecognized.length} distinct tools**`,
    `- Observations that are ordinary application dependencies, not ecosystem gaps: **${data.notAFindingCount}** (counted, not reported — see *Probe scope* below)`,
    `- Maturity distribution: ${[...byMaturity.entries()]
      .sort()
      .map(([level, count]) => `**${level}** ${count}`)
      .join(" · ")}`,
    `- State distribution: ${[...byState.entries()]
      .sort()
      .map(([state, count]) => `${state} ${count}`)
      .join(" · ")}`,
    "",
    "### The honest read",
    "",
    "Maturity is capped by what the machine can *prove*, not by what the engine can",
    "*do*. The resolver returns `false` for every criterion that has no gate today:",
    "",
    "- **No per-adapter fixture-quad gate.** Positive / negative / boundary /",
    "  adversarial fixtures exist per *rule*, not per adapter, so `M3` cannot be",
    "  granted to a framework. Wave 4 ships the gate.",
    "- **No framework-level `detectorRev` lock.** The measurement sidecar locks the",
    "  revision per *rule*; nothing binds a framework capability to it, so `M4`",
    "  cannot be granted. Wave 4.",
    "- **No field evidence.** `M5` requires `REMOTE_PROVEN`, which the zero-network",
    "  default never produces. It is unreachable from inside the engine by design.",
    "",
    "That is D1 working: *peak* means maximum defensible proof, not feature count.",
    "",
    "## Staleness demotions (ADR 0010 rule 3)",
    "",
    demoted.size === 0
      ? "No `SUPPORTED` entry was demoted: either the corpus cache is absent, or every observed upstream major is in its adapter's validated set. An absent cache is **not** a clean result — `ecosystem:gaps` reports it as `BLOCKED`."
      : [
          "These entries are `SUPPORTED` in the registry but the corpus is running an upstream major the adapter was never validated against. The demotion is automatic and it is the reason the census is more than a list:",
          "",
          "| Census id | Validated majors | Observed major | Reason |",
          "|---|---|---|---|",
          ...stalenessDemotions.map(
            (d) =>
              `| ${cell(d.entryId)} | ${cell(d.handledUpstreamMajors.join(", "))} | **${cell(d.observedMajor)}** | ${cell(d.reason)} |`,
          ),
        ].join("\n"),
    "",
    "## Census entries",
    "",
    "| Census id | Name | Category | State | Maturity | Adapter | Blocks axes | Revisit trigger |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const entry of entries) {
    lines.push(
      `| ${[
        entry.id,
        entry.name,
        entry.category,
        entry.state,
        MATURITY_SHORT[entry.maturity],
        entry.adapter ?? "—",
        entry.blocksAxes.join(", ") || "—",
        entry.revisitTrigger,
      ]
        .map(cell)
        .join(" | ")} |`,
    );
  }

  lines.push("");
  lines.push("## Field gap backlog (generated, ranked by field frequency)");
  lines.push("");
  if (gaps.length === 0) {
    lines.push(
      "The probe observed no tooling. That is **not** a clean result — an empty",
      "observation usually means the corpus cache is absent, and an absent cache",
      "must read as `UNKNOWN`, never as *nothing to support*. See the probe's",
      "`nextLevelGap` below.",
    );
  } else {
    lines.push(
      "Ranked by **number of corpus repositories** in which the tool was observed.",
      "Frequency, not enthusiasm, sets priority (ADR 0010 rule 2).",
      "",
      "| Tool | Category | Repos | Observations | Census entry | Priority |",
      "|---|---|---|---|---|---|",
    );
    for (const gap of gaps) {
      lines.push(
        `| ${[
          gap.name,
          gap.category,
          gap.repos,
          gap.observations,
          gap.censusId ?? "**UNRECOGNIZED**",
          gap.priority,
        ]
          .map(cell)
          .join(" | ")} |`,
      );
    }
  }

  lines.push("");
  lines.push("## `UNRECOGNIZED` findings — the honesty register");
  lines.push("");
  lines.push(
    "Tools the engine saw in a real repository that the census does not know.",
    "**A new tool the engine sees in the wild and ignores is a release-blocking",
    "honesty failure** (`ecosystem:gaps` gate), not a backlog item.",
  );
  lines.push("");
  if (unrecognized.length === 0) {
    lines.push(
      "None observed in the probed corpus. Note the scope limit below before",
      "reading that as a clean result.",
    );
  } else {
    lines.push("| Tool | Category | Repos | Disposition |");
    lines.push("|---|---|---|---|");
    const dispositions = loadDispositions();
    const byName = new Map(dispositions.map((d) => [d.name, d.disposition]));
    for (const item of unrecognized) {
      lines.push(
        `| ${cell(item.name)} | ${cell(item.category)} | ${item.repos} | ${cell(
          byName.get(item.name) ?? "**PENDING_ADJUDICATION**",
        )} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Probe scope and its own gaps");
  lines.push("");
  lines.push(
    "The probe reads **declared** tooling: manifests (`package.json`,",
    "`pyproject.toml`, `pom.xml`, `build.gradle`, `go.mod`, `Cargo.toml`,",
    "`Gemfile`, `composer.json`), CI workflow files and directories, and",
    "infrastructure-as-code markers. It executes nothing.",
  );
  lines.push("");
  lines.push("What that means, stated rather than hidden:");
  lines.push("");
  lines.push(
    "- Tooling a repository uses **without declaring it** is invisible to the",
    "  probe. A probe that silently under-reports is the same failure as a census",
    "  that silently over-reports, so this limit is recorded here instead.",
    "- A discovered name becomes a *finding* only when it matches a census",
    "  detection signal or a `CENSUS_NAME_PATTERNS` entry. Ordinary application",
    "  dependencies are counted, never listed: a gap report with 4 000 rows of",
    "  `react` and `lodash` is a report nobody reads, and a report nobody reads",
    "  protects nothing.",
    "- The corpus cache is a **local** checkout set. On a machine without it the",
    "  probe walks zero repositories, and the gate reports that as `BLOCKED`, not",
    "  as *nothing to support*.",
    "- Frequency counts are per-repository presence, not usage volume.",
  );
  lines.push("");
  lines.push("## Orthogonality note (ADR 0011)");
  lines.push("");
  lines.push(
    "`state` (ecosystem coverage) and `maturity` (proof of our handling) are",
    "independent axes and neither is derived from the other. The six axes are",
    "declared once in `ORTHOGONAL_AXES` and no renderer may merge them:",
    "",
  );
  for (const axis of ORTHOGONAL_AXES) {
    lines.push(`- **${axis.id}** — ${axis.question}`);
  }
  lines.push("");
  lines.push("## Gates");
  lines.push("");
  lines.push(
    "- `npm run ecosystem:census` — schema, ownership, states, staleness triggers.",
  );
  lines.push(
    "- `npm run ecosystem:gaps` — no `UNRECOGNIZED` entry older than one corpus",
  );
  lines.push("  cycle without a recorded disposition in");
  lines.push("  `docs/ECOSYSTEM-DISPOSITIONS.json`.");
  lines.push("");
  return lines.join("\n");
}

/**
 * Derive the disposition ledger for the tools the probe found and the
 * census has no entry for.
 *
 * The point is that the ledger must be a **baseline, not a to-do list**.
 * If every undisposed tool blocked the release, the gate would be
 * permanently red and permanently ignored — which is how an honesty gate
 * turns into decoration. So the disposition is *derived* from what the
 * classifier already proved:
 *
 *  - the classifier placed the tool in a census category ⇒ the honest
 *    disposition is `ACCEPTED_AS_TARGET`: we know what it is, we do not
 *    support it, and the gap is already visible in the ranked backlog.
 *  - the classifier could **not** place it ⇒ `PENDING_ADJUDICATION` and
 *    the gate fails, because "we do not know whether this matters" is
 *    exactly the state a human has to resolve.
 *
 * New tools discovered later are absent from the baseline, so the gate
 * goes red on them until a human decides. That is the drift-lock.
 */
export function deriveDispositions(
  unrecognized: readonly { name: string; repos: number; category: string }[],
  owner = "ecosystem-census",
): UnrecognizedDisposition[] {
  return [...unrecognized]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => {
      if (item.category === "UNCLASSIFIED") {
        return {
          name: item.name,
          disposition: "PENDING_ADJUDICATION" as const,
          note: "The classifier cannot place this tool in a census category, so its QA relevance is undetermined. A human must decide whether it belongs in the census.",
          owner,
        };
      }
      return {
        name: item.name,
        disposition: "ACCEPTED_AS_TARGET" as const,
        note: `Observed in ${item.repos} corpus repository/repositories and classified as ${item.category}. Declared as a census target: no adapter, no fixture quad, no corpus proof. Promote only with adapter + corpus proof.`,
        owner,
      };
    });
}

function renderDispositionsJson(
  dispositions: readonly UnrecognizedDisposition[],
  baseSha: string,
): string {
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        artifact: "ecosystem-dispositions",
        generatedBy: "npm run docs:ecosystem",
        note: "Baseline of recorded dispositions for QA tools the census has no entry for. A tool missing from this file fails `ecosystem:gaps`; that is the drift-lock, not a reminder.",
        baseSha,
        count: dispositions.length,
        dispositions,
      },
      null,
      2,
    ) + "\n"
  );
}

// ─── Entrypoint ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const data = buildGeneratedCensus(ROOT);
  const sha = gitSha();
  const resolver = createEvidenceResolver(buildRepoEvidenceIndex(ROOT), ROOT);
  const diagnostics = validateCensus(data.census, resolver);
  const errors = diagnostics.filter((d) => d.severity === "error");
  if (errors.length > 0) {
    for (const diagnostic of errors) {
      console.error(
        `${diagnostic.code} ${diagnostic.entryId}: ${diagnostic.message}`,
      );
    }
    process.exit(1);
  }
  const dispositions = deriveDispositions(data.unrecognized);
  const pending = dispositions.filter(
    (d) => d.disposition === "PENDING_ADJUDICATION",
  );
  writeFileSync(CENSUS_PATH, renderCensusJson(data, sha));
  writeFileSync(GAPS_PATH, renderGapsMd(data));
  writeFileSync(DISPOSITIONS_PATH, renderDispositionsJson(dispositions, sha));
  await prettify(CENSUS_PATH);
  await prettify(GAPS_PATH);
  await prettify(DISPOSITIONS_PATH);
  console.log(
    `Wrote ${CENSUS_PATH}, ${GAPS_PATH} and ${DISPOSITIONS_PATH}: ` +
      `${data.census.entries.length} entries, ${data.corpusRepos} corpus repos probed, ` +
      `${data.gaps.length} field-gap items, ${data.unrecognized.length} UNRECOGNIZED ` +
      `(${pending.length} needing human adjudication).`,
  );
}

if (isMainModule(import.meta.url)) {
  await main();
}
