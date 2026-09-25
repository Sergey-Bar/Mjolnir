import { isValidSemver } from "./version-consistency.js";

export const VERSION_SURFACE_PATHS = [
  "src/engine/version.ts",
  "action.yml",
  "smithery.yaml",
  "site/.vitepress/theme/Home.vue",
  "README.md",
  "site/guide/getting-started.md",
  "site/guide/ci.md",
  "site/guide/forensics.md",
  "docs/DISTRIBUTION-KIT.md",
  "src/commands/enterprise.ts",
  "src/mcp/server.ts",
  "src/reporter/sarif.ts",
] as const;

type VersionSurfaces = Record<string, string | undefined>;

/**
 * The version a consumer gets when they pin nothing.
 *
 * `action.yml` fetches an exact tarball from the npm registry, so its default
 * must be a version that EXISTS on the registry. While the working candidate
 * is a release candidate, that is the last published stable version — not the
 * working version. Pointing the Action at an unpublished RC made every
 * consumer who did not override `version` fail on a 404.
 *
 * `publishedStable` in package.json is the record; this function is the law
 * that keeps the two from drifting.
 */
export function checkActionDefaultVersion(
  publishedStable: string,
  surfaces: VersionSurfaces,
): string[] {
  const violations: string[] = [];
  if (!isValidSemver(publishedStable)) {
    return [`publishedStable: invalid semver ${publishedStable}`];
  }
  if (publishedStable.includes("-")) {
    violations.push(
      `publishedStable: ${publishedStable} is a prerelease; the Action default must be a published stable version`,
    );
  }
  const action = surfaces["action.yml"];
  if (typeof action !== "string" || action.length === 0) {
    return [...violations, "action.yml: missing"];
  }
  const marker = action.indexOf("  version:\n");
  if (marker < 0) return [...violations, "action.yml: version input missing"];
  const valueStart = marker + "  version:\n".length;
  const rest = action.slice(valueStart);
  const defaultAt = rest.indexOf('default: "');
  if (defaultAt < 0)
    return [...violations, "action.yml: version default missing"];
  const literalStart = valueStart + defaultAt + 'default: "'.length;
  const literalEnd = action.indexOf('"', literalStart);
  const declared = action.slice(literalStart, literalEnd);
  if (declared !== publishedStable) {
    violations.push(
      `action.yml: version default is ${declared}, expected the published stable ${publishedStable}`,
    );
  }
  return violations;
}

export function checkVersionSurfaceEnvelope(
  version: string,
  surfaces: VersionSurfaces,
): string[] {
  if (!isValidSemver(version)) return [`invalid package version: ${version}`];

  const major = version.split(".")[0] ?? "";
  const required = new Map<string, string[]>([
    ["src/engine/version.ts", [`export const ENGINE_VERSION = "${version}";`]],
    // The Action default is checked against `publishedStable`, not the working
    // version — see checkActionDefaultVersion.
    ["action.yml", []],
    ["smithery.yaml", [`"version": "${version}"`, `mjolnir-qa@${version}`]],
    [
      "site/.vitepress/theme/Home.vue",
      [
        `npx mjolnir-qa@${version}`,
        `mjolnir-qa@${version} mcp`,
        `Sergey-Bar/Mjolnir@v${major}`,
        `version: ${version}`,
      ],
    ],
    ["README.md", [`mjolnir-qa@${version}`]],
    ["site/guide/getting-started.md", [`npx mjolnir-qa@${version}`]],
    ["site/guide/ci.md", [`mjolnir-qa@${version}`]],
    ["site/guide/forensics.md", [`npx mjolnir-qa@${version} forensics`]],
    ["docs/DISTRIBUTION-KIT.md", [`mjolnir-qa@${version}`]],
    [
      "src/commands/enterprise.ts",
      [
        'import { ENGINE_VERSION } from "../engine/version.js"',
        "version: ENGINE_VERSION",
      ],
    ],
    [
      "src/mcp/server.ts",
      [
        'import { ENGINE_VERSION as CLI_VERSION } from "../engine/version.js"',
        "version: CLI_VERSION",
      ],
    ],
    [
      "src/reporter/sarif.ts",
      [
        'import { ENGINE_VERSION } from "../engine/version.js"',
        "version: ENGINE_VERSION",
      ],
    ],
  ]);
  const violations: string[] = [];

  for (const path of VERSION_SURFACE_PATHS) {
    const content = surfaces[path];
    if (typeof content !== "string" || content.length === 0) {
      violations.push(`${path}: missing`);
      continue;
    }
    for (const expected of required.get(path) ?? []) {
      if (!content.includes(expected)) {
        violations.push(`${path}: missing ${expected}`);
      }
    }
  }

  for (const path of [
    "action.yml",
    "smithery.yaml",
    "site/.vitepress/theme/Home.vue",
    "README.md",
    "site/guide/getting-started.md",
    "site/guide/ci.md",
    "site/guide/forensics.md",
    "docs/DISTRIBUTION-KIT.md",
  ]) {
    if (surfaces[path]?.includes("mjolnir-qa@latest")) {
      violations.push(`${path}: mutable mjolnir-qa@latest is forbidden`);
    }
  }

  const home = surfaces["site/.vitepress/theme/Home.vue"] ?? "";
  for (const match of home.matchAll(/Sergey-Bar\/Mjolnir@v(\d+)/g)) {
    if (match[1] !== major) {
      violations.push(
        `site/.vitepress/theme/Home.vue: action major v${match[1]} does not match v${major}`,
      );
    }
  }

  return violations;
}

export function synchronizeVersionSurfaceEnvelope(
  version: string,
  surfaces: VersionSurfaces,
  publishedStable?: string,
): { surfaces: VersionSurfaces; changedPaths: string[] } {
  if (!isValidSemver(version)) throw new Error(`invalid version: ${version}`);

  const next = { ...surfaces };
  const replaceValue = (
    path: string,
    startMarker: string,
    replacement: string,
    from = 0,
    replaceAll = false,
  ) => {
    const content = next[path];
    if (typeof content !== "string") throw new Error(`${path}: missing`);
    let output = content;
    let offset = from;
    while (true) {
      const start = output.indexOf(startMarker, offset);
      if (start < 0) {
        if (replaceAll) break;
        throw new Error(`${path}: version literal missing`);
      }
      const valueStart = start + startMarker.length;
      const relativeEnd = output.slice(valueStart).search(/["\s]/);
      if (relativeEnd < 0)
        throw new Error(`${path}: version literal is malformed`);
      const end = valueStart + relativeEnd;
      output = `${output.slice(0, valueStart)}${replacement}${output.slice(end)}`;
      offset = valueStart + replacement.length;
      if (!replaceAll) break;
    }
    next[path] = output;
  };
  const major = version.split(".")[0] ?? "";
  const actionVersionStart = (next["action.yml"] ?? "").indexOf("  version:\n");
  if (actionVersionStart < 0)
    throw new Error("action.yml: version input missing");

  replaceValue(
    "src/engine/version.ts",
    'export const ENGINE_VERSION = "',
    version,
  );
  // action.yml's default is the PUBLISHED STABLE version, never the working
  // version: while the candidate is an RC, the working version does not exist
  // on npm and the Action would 404 for every consumer who pinned nothing.
  if (publishedStable !== undefined) {
    replaceValue(
      "action.yml",
      '    default: "',
      publishedStable,
      actionVersionStart,
    );
  }
  replaceValue("smithery.yaml", '"version": "', version);
  replaceValue("smithery.yaml", "mjolnir-qa@", version);
  replaceValue(
    "site/.vitepress/theme/Home.vue",
    "mjolnir-qa@",
    version,
    0,
    true,
  );
  replaceValue("site/.vitepress/theme/Home.vue", "Sergey-Bar/Mjolnir@v", major);
  replaceValue("site/.vitepress/theme/Home.vue", '"    version: ', version);
  replaceValue("README.md", "mjolnir-qa@", version, 0, true);
  replaceValue(
    "site/guide/getting-started.md",
    "mjolnir-qa@",
    version,
    0,
    true,
  );
  replaceValue("site/guide/ci.md", "mjolnir-qa@", version, 0, true);
  replaceValue("site/guide/forensics.md", "mjolnir-qa@", version, 0, true);
  replaceValue("docs/DISTRIBUTION-KIT.md", "mjolnir-qa@", version, 0, true);

  const violations = checkVersionSurfaceEnvelope(version, next);
  if (publishedStable !== undefined) {
    violations.push(...checkActionDefaultVersion(publishedStable, next));
  }
  if (violations.length > 0) {
    throw new Error(
      `version surface synchronization failed: ${violations.join("; ")}`,
    );
  }

  return {
    surfaces: next,
    changedPaths: VERSION_SURFACE_PATHS.filter(
      (path) => next[path] !== surfaces[path],
    ),
  };
}
