/**
 * `mjolnir enterprise` — refuses, and says what exists instead.
 *
 * What changed, and why: this command wrote three kinds of artifact that
 * Mjölnir cannot back.
 *
 * 1. A deployment config declaring `"authentication": "sso-saml"`. There
 *    is no server, no session, and no SAML implementation in this product.
 *    The config described a deployment that does not exist.
 * 2. An SSO setup guide instructing the reader to add an `sso` block to
 *    `mjolnir.config.json`. Nothing reads that key. The guide was
 *    confident, plausible, and inert.
 * 3. Three compliance templates — SOC 2, HIPAA, PCI-DSS — mapping
 *    controls to "SSO/SAML integration", a "built-in scan audit trail"
 *    and a "privacy scan". None of those is a Mjölnir feature: a scan
 *    reads a repository and prints. A compliance template is a document
 *    an organisation shows an auditor, so mapping controls to
 *    capabilities that do not exist is not a cosmetic bug.
 *
 * So the command no longer writes files. What it can honestly offer is
 * `enterprise/threat-model.json` and `enterprise/data-flows.json`, which
 * ARE real, ARE validated in CI by `npm run enterprise:threat-model`,
 * and describe the product that exists: a zero-network local CLI.
 *
 * The `config` subcommand still emits a fact file, because a manifest of
 * what the tool is and is not is genuinely useful to an operator
 * evaluating it — as long as it records absence instead of inventing it.
 *
 * Scheduled for removal in 5.0 — see docs/RELEASE-TRAINS.md.
 */

import { existsSync, mkdirSync } from "node:fs";
import { writeFileAtomic } from "../lib/fs-atomic.js";
import { join } from "node:path";

import { sectionHeader, plainContext } from "../reporter/ui.js";
import { ENGINE_VERSION } from "../engine/version.js";
import type { Output } from "../cli-io.js";
import { EXIT_CLEAN, EXIT_USAGE } from "../exit-codes.js";

const ui = plainContext();

export function runEnterpriseCommand(
  argv: string[],
  io: { out: Output; err: Output },
): number {
  const subcommand = argv[0] ?? "config";
  const outputDir =
    argv.slice(1).find((a) => !a.startsWith("-")) ?? "enterprise-output";

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  if (subcommand === "config") {
    // A capability manifest, not a deployment recipe. Every entry is a
    // fact about THIS build; the absent list is the point. A reader
    // evaluating Mjölnir for a regulated environment needs to know what is
    // not there as much as what is, and the previous version of this file
    // answered neither.
    const config = {
      product: "mjolnir-qa",
      version: ENGINE_VERSION,
      shape: "zero-runtime-dependency local CLI",
      network: "none — no telemetry, no hosted service, no sync",
      runtimeDependencies: 0,
      // What the operator can actually rely on. Each is exercised by CI.
      verified: [
        "local-only execution (tests/contract/privacy-network-isolation.spec.ts)",
        "versioned threat + data-flow model (npm run enterprise:threat-model)",
        "deterministic machine contract, drift-locked (contractVersion 1)",
      ],
      // What this product does NOT do. Empty lists read as a bug; these
      // are the honest answer to "can we deploy this air-gapped with SSO
      // and show an auditor a SOC 2 packet".
      notProvided: [
        "SSO / SAML / OIDC — no server, no session, no identity provider integration",
        "hosted control plane, multi-tenant sync, or audit-log service",
        "compliance certification or auditor-facing control mapping",
        "air-gapped installation or offline recovery drill (see GAP-M26-015)",
      ],
      unsupportedRequests:
        "docs/M26-SUPPORT-MATRIX.json records each of these as an explicit BLOCKED cell rather than a plan.",
    };
    const path = join(outputDir, "capability-manifest.json");
    // Atomic (audit S9): the generated file lands in the user's repository
    // and is typically committed. A truncated JSON file there fails to parse,
    // and the deployment then reads as "no config" rather than "bad config".
    writeFileAtomic(path, JSON.stringify(config, null, 2) + "\n");
    io.out(sectionHeader("ENTERPRISE CAPABILITY MANIFEST", ui));
    io.out(`Written: ${path}`);
    io.out(
      `Version: ${ENGINE_VERSION} · runtime dependencies: 0 · network: none`,
    );
    io.out("");
    io.out(
      "This product is a local CLI. It provides no server, no SSO, no hosted",
    );
    io.out("control plane and no compliance certification. The manifest's");
    io.out(
      "`notProvided` list is the honest answer to a deployment questionnaire.",
    );
    return EXIT_CLEAN;
  }

  if (subcommand === "sso" || subcommand === "compliance") {
    // The honest answer is a refusal with a reason, not a template.
    io.err(
      subcommand === "sso"
        ? `mjolnir enterprise sso: not available, and no artifact will be written.\n` +
            `  Mjölnir is a local CLI with no server, no session and no identity-provider\n` +
            `  integration. The previous SSO guide told readers to add an \`sso\` block to\n` +
            `  mjolnir.config.json — a key nothing reads.\n` +
            `  What exists: the threat + data-flow model, validated by\n` +
            `  \`npm run enterprise:threat-model\`. See \`mjolnir enterprise config\`.`
        : `mjolnir enterprise compliance: not available, and no artifact will be written.\n` +
            `  Mjölnir cannot produce an auditor-facing control mapping. The previous\n` +
            `  templates mapped controls to capabilities this product does not have\n` +
            `  (SSO/SAML integration, a scan "audit trail", a "privacy scan"), which is\n` +
            `  not a formatting bug — it is a false statement in a document meant for\n` +
            `  an auditor.\n` +
            `  What exists: enterprise/threat-model.json and enterprise/data-flows.json,\n` +
            `  validated in CI, describing the product that actually ships.`,
    );
    return EXIT_USAGE;
  }

  io.err(`Unknown enterprise subcommand: ${subcommand}`);
  io.err("Available: config");
  return EXIT_USAGE;
}
