/**
 * `mjolnir enterprise` — Enterprise Deployment (QM-4).
 *
 * Generates enterprise deployment artifacts:
 *   - Self-hosted deployment config
 *   - SSO/SAML setup guide
 *   - Compliance templates (SOC 2, HIPAA, PCI-DSS)
 *   - Custom policy templates
 *
 * Subcommands:
 *   config      — generate deployment config
 *   sso         — generate SSO setup guide
 *   compliance  — generate compliance template
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
    const config = {
      service: "mjolnir-qa",
      version: ENGINE_VERSION,
      deployment: {
        type: "self-hosted",
        protocol: "https",
        port: 443,
        authentication: "sso-saml",
        sessionTimeout: "8h",
        maxFileSize: "100MB",
      },
      features: {
        rules: true,
        plugins: true,
        cache: true,
        reporter: true,
        mcp: true,
      },
      logging: {
        level: "info",
        retention: "90d",
        audit: true,
      },
    };
    const path = join(outputDir, "deployment-config.json");
    // Atomic (audit S9): the generated config lands in the user's repository
    // and is typically committed. A truncated JSON file there fails to parse,
    // and the deployment then reads as "no config" rather than "bad config".
    writeFileAtomic(path, JSON.stringify(config, null, 2) + "\n");
    io.out(sectionHeader("ENTERPRISE CONFIG", ui));
    io.out(`Config written: ${path}`);
    io.out(`Type: ${config.deployment.type}`);
    io.out(`Auth: ${config.deployment.authentication}`);
    return EXIT_CLEAN;
  }

  if (subcommand === "sso") {
    const guide = `# SSO/SAML Setup Guide

## Service Provider (SP) Configuration
- Entity ID: https://your-domain.com/mjolnir
- ACS URL: https://your-domain.com/mjolnir/auth/sso/callback
- Binding: HTTP-POST

## Identity Provider (IdP) Configuration
- Metadata URL: https://your-idp.com/sso/metadata
- Required Attributes:
  - email (mapped to user identity)
  - role (mapped to access level)
  - department (mapped to team)

## Mjölnir Configuration
Add to mjolnir.config.json:
\`\`\`json
{
  "sso": {
    "enabled": true,
    "provider": "saml",
    "entryPoint": "https://your-idp.com/sso",
    "attributeMapping": {
      "email": "user",
      "role": "accessLevel",
      "department": "team"
    }
  }
}
\`\`\`
`;
    const path = join(outputDir, "sso-setup.md");
    writeFileAtomic(path, guide);
    io.out(`SSO guide written: ${path}`);
    return EXIT_CLEAN;
  }

  if (subcommand === "compliance") {
    const frameworks = ["SOC2", "HIPAA", "PCI-DSS"];
    for (const framework of frameworks) {
      const template = `# ${framework} Compliance Template for Mjölnir

## Control Mapping
| Control | Mjölnir Feature | Evidence |
| --------- | --------------- | -------- |
| Access Control | SSO/SAML integration | sso-setup.md |
| Audit Logging | Built-in scan audit trail | --json output |
| Data Protection | Local-first, zero-network | privacy scan |
| Change Management | quarantined rules, policy gates | policy check |
| Monitoring | dashboard, exec-report | HTML/terminal output |
`;
      const path = join(outputDir, `${framework.toLowerCase()}-compliance.md`);
      writeFileAtomic(path, template);
      io.out(`Compliance template: ${path}`);
    }
    return EXIT_CLEAN;
  }

  io.err(`Unknown enterprise subcommand: ${subcommand}`);
  return EXIT_USAGE;
}
