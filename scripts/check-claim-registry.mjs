import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? process.cwd();
const registry = JSON.parse(
  readFileSync(join(root, "docs", "claim-registry.json"), "utf8"),
);
if (registry.schemaVersion !== 1 || !Array.isArray(registry.claims)) {
  throw new Error("claim registry schemaVersion/claims is invalid");
}
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const publishedStable = pkg.publishedStable;
const manifest = JSON.parse(
  readFileSync(join(root, "candidate-trust-manifest.json"), "utf8"),
);
if (manifest.identity?.version !== version) {
  throw new Error(
    `candidate manifest version ${manifest.identity?.version} does not match package ${version}`,
  );
}
for (const claim of registry.claims) {
  for (const field of [
    "implementation",
    "tests",
    "corpus",
    "benchmark",
    "candidateProof",
    "proof",
    "authority",
    "expiry",
    "state",
  ]) {
    if (!(field in claim)) throw new Error(`${claim.id}: missing ${field}`);
  }
  for (const source of [claim.valueSource, ...claim.relatedSources]) {
    if (!existsSync(join(root, source))) {
      throw new Error(`${claim.id}: missing source ${source}`);
    }
  }
  if (
    typeof claim.proof !== "object" ||
    claim.proof === null ||
    !["BLOCKED", "LOCAL_PROVEN", "REMOTE_PROVEN"].includes(claim.proof.status)
  ) {
    throw new Error(`${claim.id}: proof status is invalid`);
  }
  if (
    manifest.identity?.candidateSha === null &&
    claim.proof.status !== "BLOCKED"
  ) {
    throw new Error(`${claim.id}: unproven candidate cannot carry proof`);
  }
  if (claim.proof.status !== "BLOCKED") {
    for (const field of ["artifact", "digest", "observedAt", "authority"]) {
      if (!claim.proof[field] || claim.proof[field] === "NONE") {
        throw new Error(`${claim.id}: proof ${field} missing`);
      }
    }
    if (!existsSync(join(root, claim.proof.artifact))) {
      throw new Error(`${claim.id}: proof artifact missing`);
    }
  }
  for (const field of ["implementation", "tests", "corpus"]) {
    for (const source of claim[field]) {
      if (source !== "N/A" && !existsSync(join(root, source))) {
        throw new Error(`${claim.id}: missing ${field} evidence ${source}`);
      }
    }
  }
  if (claim.id === "support-envelope-version") {
    const action = readFileSync(join(root, "action.yml"), "utf8");
    const workflow = readFileSync(
      join(root, ".github", "workflows", "mjolnir.yml"),
      "utf8",
    );
    // The Action's default must be a version that EXISTS on the registry.
    // While the candidate is an RC, that is the published stable, not the
    // working version — otherwise every consumer who pins nothing gets a 404.
    if (typeof publishedStable !== "string" || publishedStable === "") {
      throw new Error("package.json: publishedStable is missing");
    }
    if (publishedStable.includes("-")) {
      throw new Error(
        `publishedStable ${publishedStable} is a prerelease; the Action default must be a published stable version`,
      );
    }
    if (!action.includes(`default: "${publishedStable}"`)) {
      throw new Error(
        `action.yml does not default to the published stable version ${publishedStable}`,
      );
    }
    if (
      !workflow.includes(`mjolnir-qa-${version}.tgz`) &&
      !workflow.includes("node dist/cli.mjs")
    ) {
      throw new Error(
        `dogfood workflow has no pinned source/reviewer path for ${version}`,
      );
    }
  }
  if (claim.id === "unified-pr-report-marker") {
    const reporter = readFileSync(
      join(root, "src", "reporter", "pr-report-shared.ts"),
      "utf8",
    );
    if (!reporter.includes("mjolnir-report:v2")) {
      throw new Error("unified PR report marker is missing");
    }
    const action = readFileSync(join(root, "action.yml"), "utf8");
    if (!action.includes("mjolnir-report:v2")) {
      throw new Error("action does not publish the unified v2 marker");
    }
  }
  if (claim.id === "enterprise-threat-model") {
    const result = JSON.parse(
      readFileSync(join(root, "enterprise", "threat-model.json"), "utf8"),
    );
    if (
      result.schemaVersion !== 1 ||
      result.status !== "approved-for-working-candidate"
    ) {
      throw new Error(
        "enterprise threat model is not an approved working-candidate artifact",
      );
    }
  }
}
for (const source of registry.historicalSources ?? []) {
  if (!existsSync(join(root, source))) {
    throw new Error(`historical source missing: ${source}`);
  }
}
console.log(
  JSON.stringify({
    status: "PASS",
    registry: registry.registryId,
    claims: registry.claims.length,
    historical: registry.historicalSources?.length ?? 0,
  }),
);
