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

export function checkVersionSurfaceEnvelope(
  version: string,
  surfaces: VersionSurfaces,
): string[] {
  if (!isValidSemver(version)) return [`invalid package version: ${version}`];

  const major = version.split(".")[0] ?? "";
  const required = new Map<string, string[]>([
    ["src/engine/version.ts", [`export const ENGINE_VERSION = "${version}";`]],
    ["action.yml", [`default: "${version}"`]],
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
  replaceValue("action.yml", '    default: "', version, actionVersionStart);
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
