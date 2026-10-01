export const CLI_COMMAND_NAMES = [
  "scan",
  "policy",
  "analyze",
  "stats",
  "fix",
  "doctor",
  "explain",
  "handoff",
  "install",
  "contract-verify",
  "suppression-gate",
  "evidence-graph",
  "ci",
  "mcp",
  "help",
] as const;

export const CLI_NON_SCAN_COMMANDS: ReadonlySet<string> = new Set(
  CLI_COMMAND_NAMES.filter((command) => command !== "scan"),
);
