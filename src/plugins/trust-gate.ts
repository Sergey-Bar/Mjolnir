/**
 * Plugin trust gate (audit-remediation-master-plan.md, locked decision C2).
 *
 * Code execution is opt-in: npm-plugin and JS-module rule loading happens
 * ONLY when the operator passes `--enable-plugins` on the CLI or sets
 * `MJOLNIR_ENABLE_PLUGINS=1` in the environment. Default OFF — scanning an
 * untrusted repo must never execute code it finds there.
 *
 * JSON rule manifests stay declarative-safe and load WITHOUT the gate:
 * they carry regex patterns compiled by the engine, no code runs by
 * design.
 *
 * When rule sources are present but the gate is off, the scan prints a
 * loud stderr notice listing exactly what was skipped — silence would
 * look like a bug ("where are my plugin findings?"), not a security
 * boundary.
 */

/**
 * Whether code-executing rule sources may load. `argsEnabled` is the
 * CLI flag value for THIS scan; the env var applies process-wide.
 */
export function pluginsGateOpen(argsEnabled: boolean | undefined): boolean {
  return argsEnabled === true || process.env["MJOLNIR_ENABLE_PLUGINS"] === "1";
}

export interface SkippedRuleSource {
  kind: "plugin-package" | "js-module";
  name: string;
}

/**
 * The stderr notice for skipped rule sources. One line per source plus
 * the enabling instructions — loud enough to be unmissable, no output
 * on the machine-contract channels (stdout JSON/SARIF stay untouched).
 */
export function renderGateNotice(
  skipped: readonly SkippedRuleSource[],
): string {
  const lines = [
    "mjolnir: plugin code execution is DISABLED (default). The following rule sources were NOT loaded:",
  ];
  for (const s of skipped) {
    lines.push(
      s.kind === "plugin-package"
        ? `  - npm plugin: ${s.name}`
        : `  - JS module:  ${s.name}`,
    );
  }
  lines.push(
    "To run them, re-run with --enable-plugins (or set MJOLNIR_ENABLE_PLUGINS=1).",
    "Declarative JSON rule manifests (mjolnir-rules/*.json) are unaffected — they execute no code.",
  );
  return lines.join("\n");
}
