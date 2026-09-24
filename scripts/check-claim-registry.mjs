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
for (const claim of registry.claims) {
  for (const source of [claim.valueSource, ...claim.relatedSources]) {
    if (!existsSync(join(root, source))) {
      throw new Error(`${claim.id}: missing source ${source}`);
    }
  }
  if (claim.id === "support-envelope-version") {
    const action = readFileSync(join(root, "action.yml"), "utf8");
    const workflow = readFileSync(
      join(root, ".github", "workflows", "mjolnir.yml"),
      "utf8",
    );
    if (!action.includes(`default: "${version}"`)) {
      throw new Error(
        `action.yml does not default to package version ${version}`,
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
