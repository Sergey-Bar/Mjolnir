/**
 * Content drift for the provenance-stamped artifacts.
 *
 * `docs/capability-registry.json` and `docs/v6-inventory.json` record the
 * `baseSha` of the commit they were generated from. That stamp is correct
 * information — it is the point of an artifact that says what it was derived
 * from — and it makes those files structurally incompatible with the staleness
 * gate every other generated artifact uses:
 *
 *     npm run docs:regen && git diff --exit-code
 *
 * A regeneration at commit N writes `baseSha = N` while the committed artifact
 * carries the stamp of whatever commit generated it. Those differ on every
 * commit, so the diff is non-empty every time and the gate reports drift
 * forever. Adding these two to `docs:regen` would have turned a stale artifact
 * into a permanently red one — the same failure as a gate nobody runs, wearing
 * the costume of one that runs.
 *
 * So they are checked for CONTENT drift, which is the property the stamp does
 * not affect. Both generators expose a pure render (`generateCapability`,
 * `renderArtifacts`) precisely so this can render into memory and never touch
 * the checkout: regenerating in place would rewrite the stamp, and the diff
 * that followed would be reporting the clock rather than the claim.
 *
 * What is therefore checked on every PR: whether a CLAIM changed without the
 * artifact being regenerated. What is not: whether the stamp matches HEAD. An
 * artifact generated three commits ago is not lying about its age, and checking
 * it would reintroduce the clock-in-the-artifact mistake ADR 0010 records for
 * the census.
 *
 * Run: `npm run docs:provenance-drift` · exit 1 on drift, 2 on setup error.
 * `--root=<dir>` verifies a different checkout, which is how the negative
 * tests perturb an artifact without touching this one.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { generateCapability } from "./v6/generate-capability.js";
import { renderArtifacts } from "./v6/generate-inventory.js";
import { ROOT as DEFAULT_ROOT } from "./v6/inventory.js";

/**
 * Which tree's ARTIFACTS are being verified, and the tree the generators run
 * against.
 *
 * Two roots, deliberately, and the distinction is what makes the negative tests
 * possible. The GENERATORS always run against this repository — the counts in
 * these artifacts are counts of this source tree, and rendering them from a
 * stripped-down fixture would compare a real claim against a fiction. Only the
 * COMMITTED side is redirected, so a fixture holding two copied artifacts can be
 * perturbed and checked.
 *
 * Collapsing them into one root is what the first version did, and it failed
 * with `ENOENT: package.json` inside a temp directory — legible, but only after
 * the fixture grew a package.json, a `src/` tree and a corpus, which is a
 * second repository by another name.
 */
const ARTIFACT_ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? DEFAULT_ROOT
    : resolve(flag.slice("--root=".length));
})();

/**
 * Keys that record WHEN and FROM WHAT, not WHAT is claimed.
 *
 * The same set `scripts/v6/check-capability-registry.ts` excludes, and
 * excluded for the same reason: a provenance key that makes every commit look
 * like a change is not a check.
 */
const PROVENANCE_KEYS = new Set(["baseSha", "observedAt", "generatedBy"]);

function stripProvenance(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripProvenance);
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    if (PROVENANCE_KEYS.has(key)) continue;
    out[key] = stripProvenance((value as Record<string, unknown>)[key]);
  }
  return out;
}

function normalise(text: string): string {
  return JSON.stringify(stripProvenance(JSON.parse(text)));
}

/**
 * Dotted paths whose content differs, for a message a maintainer can act on.
 *
 * The paths are LEAF paths, not the top-level container. The first version
 * reported `changed: counts` — the container — which tells a maintainer that
 * something moved without telling them what, and left the test asserting on a
 * key name the message never contained. `counts.capabilities = 14` names the
 * number to look at.
 *
 * Depth-limited because a list of entries would be a wall: at most
 * `MAX_REPORTED_PATHS` leaves, which is enough to identify the region without
 * replacing the diff the maintainer can get from `git diff` after
 * regenerating. The remainder is not counted — a partial list that says
 * nothing about how much is missing is worse than a short one that says the
 * path it did print.
 */
const MAX_REPORTED_PATHS = 8;

function changedPaths(before: unknown, after: unknown, prefix = ""): string[] {
  const a = stripProvenance(before);
  const b = stripProvenance(after);
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  const aObj =
    typeof a === "object" && a !== null && !Array.isArray(a) ? a : null;
  const bObj =
    typeof b === "object" && b !== null && !Array.isArray(b) ? b : null;
  if (aObj === null || bObj === null) return [prefix || "(root)"];

  const out: string[] = [];
  for (const key of new Set([...Object.keys(aObj), ...Object.keys(bObj)])) {
    out.push(
      ...changedPaths(
        aObj[key as keyof typeof aObj],
        bObj[key as keyof typeof bObj],
        prefix === "" ? key : `${prefix}.${key}`,
      ),
    );
    if (out.length > MAX_REPORTED_PATHS) break;
  }
  return out;
}

const failures: string[] = [];

// Rendered from THIS repository, always. See `ARTIFACT_ROOT`: the fresh side
// is a claim about the real source tree, so it can only be rendered from the
// real source tree.
const generated = generateCapability(DEFAULT_ROOT);
const inventory = renderArtifacts(DEFAULT_ROOT);

const ARTIFACTS: Array<{ file: string; fresh: string }> = [
  {
    file: "docs/capability-registry.json",
    fresh: generated.files["docs/capability-registry.json"] ?? "",
  },
  { file: "docs/v6-inventory.json", fresh: inventory.inventory },
];

for (const { file, fresh } of ARTIFACTS) {
  const path = join(ARTIFACT_ROOT, file);
  if (!existsSync(path)) {
    failures.push(`${file} is missing — there is nothing to compare against`);
    continue;
  }
  if (fresh === "") {
    failures.push(
      `${file}: the generator produced no content, so the committed artifact ` +
        "is unverified. A generator that stops producing output is a defect, " +
        "and reporting it as drift is the honest response",
    );
    continue;
  }
  const committed = readFileSync(path, "utf8");
  if (normalise(committed) === normalise(fresh)) continue;
  const changed = changedPaths(JSON.parse(committed), JSON.parse(fresh));
  failures.push(
    `${file}: content drift at ${
      changed.length === 0 ? "(key order only)" : changed.join(", ")
    }. Regenerate with \`npm run docs:provenance-drift:fix\` and commit. ` +
      "Provenance keys are excluded by design: a baseSha that does not match " +
      "HEAD is an artifact's age, not a lie about its contents",
  );
}

if (failures.length > 0) {
  console.error("Provenance-artifact drift:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      artifacts: ARTIFACTS.map((a) => a.file),
      comparison: "content only; baseSha/observedAt/generatedBy excluded",
    },
    null,
    2,
  ),
);
