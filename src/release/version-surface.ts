import { isValidSemver } from "./version-consistency.js";

/**
 * Surfaces that report WHICH BUILD IS RUNNING. These read the working version.
 */
export const IDENTITY_SURFACE_PATHS = [
  "src/engine/version.ts",
  "src/commands/enterprise.ts",
  "src/mcp/server.ts",
  "src/reporter/sarif.ts",
] as const;

/**
 * Surfaces that tell a READER WHAT TO RUN. These must read a version that
 * exists on the registry — the published stable — never the working candidate,
 * which does not exist there while it is a release candidate.
 */
export const INSTALL_SURFACE_PATHS = [
  "action.yml",
  "smithery.yaml",
  "site/.vitepress/theme/Home.vue",
  "README.md",
  "README.br.md",
  "site/guide/getting-started.md",
  "site/guide/ci.md",
  "site/guide/forensics.md",
  "docs/DISTRIBUTION-KIT.md",
] as const;

export const VERSION_SURFACE_PATHS = [
  ...IDENTITY_SURFACE_PATHS,
  ...INSTALL_SURFACE_PATHS,
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
  publishedStable?: string,
): string[] {
  if (!isValidSemver(version)) return [`invalid package version: ${version}`];

  const major = version.split(".")[0] ?? "";
  // Two different questions, two different answers.
  //
  //   IDENTITY surfaces report which build is running. That IS the working
  //   version, and it should read `version`.
  //
  //   INSTALL surfaces tell a reader what to run. That must be a version that
  //   EXISTS on the registry. While the candidate is an RC the working version
  //   is not published, so every `npx mjolnir-qa@4.0.0-rc.1` in the README
  //   and the site is an instruction that fails with a 404 on copy-paste.
  const installVersion =
    typeof publishedStable === "string" ? publishedStable : version;

  const required = new Map<string, string[]>([
    // --- identity surfaces: the working version -------------------------
    ["src/engine/version.ts", [`export const ENGINE_VERSION = "${version}";`]],
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
      ['import { ENGINE_VERSION } from "../engine/version.js"'],
    ],
    // --- install surfaces: the published version ------------------------
    ["action.yml", []],
    [
      "smithery.yaml",
      [`"version": "${installVersion}"`, `mjolnir-qa@${installVersion}`],
    ],
    [
      "site/.vitepress/theme/Home.vue",
      [
        `npx mjolnir-qa@${installVersion}`,
        `mjolnir-qa@${installVersion} mcp`,
        `Sergey-Bar/Mjolnir@v${major}`,
        `version: ${version}`,
      ],
    ],
    ["README.md", [`mjolnir-qa@${installVersion}`]],
    ["README.br.md", [`mjolnir-qa@${installVersion}`]],
    ["site/guide/getting-started.md", [`npx mjolnir-qa@${installVersion}`]],
    ["site/guide/ci.md", [`mjolnir-qa@${installVersion}`]],
    ["site/guide/forensics.md", [`npx mjolnir-qa@${installVersion} forensics`]],
    ["docs/DISTRIBUTION-KIT.md", [`mjolnir-qa@${installVersion}`]],
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

  // An install surface must not instruct anyone to run the working version
  // while that version is unpublished. The check is the inverse of the one
  // above: the published version must be present, AND the working version in
  // an install position is a violation.
  if (typeof publishedStable === "string" && publishedStable !== version) {
    for (const path of INSTALL_SURFACE_PATHS) {
      const content = surfaces[path];
      if (typeof content !== "string") continue;
      const prefixes = [
        "npx mjolnir-qa@",
        "npx --yes mjolnir-qa@",
        "npx -y mjolnir-qa@",
        '"-y", "mjolnir-qa@',
        "npm i -g mjolnir-qa@",
      ];
      for (const prefix of prefixes) {
        let offset = content.indexOf(prefix);
        while (offset >= 0) {
          const start = offset + prefix.length;
          const end = content.slice(start).search(/[\s"']/u);
          const candidate = content.slice(
            start,
            end < 0 ? undefined : start + end,
          );
          if (candidate === version) {
            violations.push(
              `${path}: instructs installing mjolnir-qa@${version}, which is not published; use ${publishedStable}`,
            );
          }
          offset = content.indexOf(prefix, start);
        }
      }
    }
  }

  for (const path of INSTALL_SURFACE_PATHS) {
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
      // The literal ends at a quote, a backtick, or whitespace. Backtick
      // matters: in Markdown an install command is inline code
      // (`` `npx mjolnir-qa@3.0.0` ``), and without it as a terminator the
      // sync consumed the closing backtick and corrupted every line it
      // rewrote in a translated README.
      const relativeEnd = output.slice(valueStart).search(/["'\s`]/);
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

  // Identity surfaces follow the working version.
  replaceValue(
    "site/.vitepress/theme/Home.vue",
    "Sergey-Bar/Mjolnir@v",
    major,
    0,
    true,
  );
  replaceValue(
    "site/.vitepress/theme/Home.vue",
    '"    version: ',
    version,
    0,
    true,
  );

  // Install surfaces follow the PUBLISHED version. Running
  // `npm run version:surface:sync` while the candidate is an RC therefore
  // rewrites every install command to the published stable — which is the
  // whole point: an install instruction that 404s on copy-paste is a defect,
  // and the command that fixes it must never introduce one.
  const installVersion = publishedStable ?? version;
  if (publishedStable !== undefined) {
    replaceValue(
      "action.yml",
      '    default: "',
      publishedStable,
      actionVersionStart,
    );
  }
  for (const path of INSTALL_SURFACE_PATHS) {
    if (path === "action.yml") continue;
    replaceValue(path, "mjolnir-qa@", installVersion, 0, true);
    if (path === "smithery.yaml") {
      replaceValue(path, '"version": "', installVersion);
    }
  }

  const violations = checkVersionSurfaceEnvelope(
    version,
    next,
    publishedStable,
  );
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
