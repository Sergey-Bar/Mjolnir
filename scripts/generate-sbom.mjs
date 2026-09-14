#!/usr/bin/env node

/**
 * Generate an SPDX SBOM for the release tarball.
 *
 * Usage: node scripts/generate-sbom.mjs [output-path]
 */

import { execSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const outPath = resolve(process.argv[2] ?? "sbom.spdx.json");

function getPackageJson() {
  return JSON.parse(readFileSync(resolve("package.json"), "utf8"));
}

function tryNativeSbom() {
  try {
    return execSync("npm sbom --sbom-format spdx --json", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function buildMinimalSpdx(pkg) {
  const now = new Date().toISOString();
  return JSON.stringify(
    {
      spdxVersion: "SPDX-2.3",
      dataLicense: "CC0-1.0",
      SPDXID: "SPDXRef-DOCUMENT",
      name: `${pkg.name}-${pkg.version}`,
      documentNamespace: `https://github.com/Sergey-Bar/Mjolnir/releases/${pkg.version}`,
      creationInfo: { created: now, creators: ["Tool: npm sbom"] },
      packages: [
        {
          SPDXID: "SPDXRef-Package",
          name: pkg.name,
          versionInfo: pkg.version,
          downloadLocation: `https://registry.npmjs.org/${pkg.name}/-/${pkg.name}-${pkg.version}.tgz`,
          filesAnalyzed: false,
          licenseConcluded: "MIT",
          supplier: "Organization: Sergey-Bar",
        },
      ],
    },
    null,
    2,
  );
}

const pkg = getPackageJson();
const native = tryNativeSbom();

if (native) {
  writeFileSync(outPath, native);
  console.log(`SBOM generated (native npm sbom): ${outPath}`);
} else {
  writeFileSync(outPath, buildMinimalSpdx(pkg));
  console.log(`SBOM generated (minimal SPDX fallback): ${outPath}`);
}
