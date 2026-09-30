import { isValidSemver } from "./version-consistency.js";

/**
 * Surfaces that report WHICH BUILD IS RUNNING. These read the working version.
 *
 * `capability-manifest.json` joined this list in 6.1 as the resolution of a
 * defect the config-consumer gate surfaced: the file asserted
 * `"version": "4.0.0"` while the package was at 5.0.0, and nothing read it —
 * so it was a capability claim the repository was not keeping. Two options
 * were available, delete it or make it true. It is the product's
 * "what this is and is not" manifest, the `notProvided` list is cited by
 * `docs/M26-SUPPORT-MATRIX.json`, and that is a real record; so it is kept and
 * bound to the version check instead. A manifest that can drift is worse than
 * no manifest.
 */
export const IDENTITY_SURFACE_PATHS = [
  "src/engine/version.ts",
  "src/mcp/server.ts",
  "src/reporter/sarif.ts",
  "capability-manifest.json",
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

/**
 * Install surfaces a human actually reads.
 *
 * The split is who consumes the text. A page a person reads may offer the
 * mutable `@latest`, and must then also say how to pin — that is what the
 * envelope checks. A manifest a machine executes must name a version and gets
 * none of that latitude: `smithery.yaml`'s `start.command` is run, not read, and
 * a mutable tag there is a liability with nobody around to notice it moved.
 */
export const READER_FACING_SURFACES: ReadonlySet<string> = new Set<string>([
  "README.md",
  "README.br.md",
  "docs/DISTRIBUTION-KIT.md",
  "site/guide/getting-started.md",
  "site/guide/ci.md",
  "site/guide/forensics.md",
  "site/.vitepress/theme/Home.vue",
]);

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
    ["capability-manifest.json", [`"version": "${version}"`]],
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
    const text = surfaces[path];
    if (!text?.includes("mjolnir-qa@latest")) continue;
    // A machine-read surface — an MCP registry manifest — is not a place to
    // hand a reader a mutable tag, and it is not a place a reader visits at
    // all. Only the surfaces people read are asked to carry the exact pin.
    if (!READER_FACING_SURFACES.has(path)) continue;
    // `@latest` resolves to whatever is published, so it can never 404 and can
    // never go stale — which is what a reader running the command wants. It is
    // also mutable: a gate copied from this page changes behaviour the day
    // 5.1.0 ships, with nothing in this repository having changed.
    //
    // Both are real, so the rule is no longer "forbidden". It is that a surface
    // may only hand a reader the mutable tag if it also tells them how to stop
    // being mutable. `mjolnir-qa@<publishedStable>` appearing alongside is the
    // pin, and it is the part that has to be checked: without it the reader has
    // no way to get a reproducible run out of the same page.
    if (!text.includes(`mjolnir-qa@${publishedStable}`)) {
      violations.push(
        `${path}: mjolnir-qa@latest needs the exact published pin ` +
          `(mjolnir-qa@${publishedStable}) beside it, or a reader has no way to ` +
          `pin the version they are being shown`,
      );
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
    skipValues: readonly string[] = [],
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
      // A value the author wrote deliberately, and which the envelope accepts,
      // is left exactly as it is. Rewriting it would undo the intent on every
      // run — which is what a self-healing sync must never do to a decision
      // someone made on purpose.
      const current = output.slice(valueStart, end);
      if (skipValues.includes(current)) {
        offset = end;
        if (!replaceAll) break;
        continue;
      }
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

  // The capability manifest asserts what this build IS as well as what it
  // refuses to claim, so its version follows the working version. Written
  // through the same replaceValue path as every other identity surface, which
  // is what makes `npm run version:surface:sync` able to fix the drift rather
  // than only report it.
  replaceValue("capability-manifest.json", '"version": "', version);

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
  // `@latest` survives the sync, but only where a human reads it.
  //
  // It is the dist-tag, not a version, and the envelope accepts it only when the
  // exact published pin sits beside it. Everywhere the literal is read by a
  // machine instead — an MCP registry manifest, where `start.command` is
  // executed rather than read — the published version is the right thing and
  // the mutable one is a liability, so those surfaces are still normalised.

  for (const path of INSTALL_SURFACE_PATHS) {
    if (path === "action.yml") continue;
    // `latest` is left alone where it is a deliberate instruction. Every other
    // value is normalised to the published version exactly as before.
    replaceValue(
      path,
      "mjolnir-qa@",
      installVersion,
      0,
      true,
      READER_FACING_SURFACES.has(path) ? ["latest"] : [],
    );
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
