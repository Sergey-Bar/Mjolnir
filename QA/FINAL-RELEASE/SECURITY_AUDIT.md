# SECURITY_AUDIT.md — Cycle 0 · RC `151186b`

Scope: repos are untrusted; host must survive normal documented usage
(C5#5). Zero-network brand promise (README, site Home.vue, `mcp/server.ts:16`)
constrains expectations — absence of network features is by design, not a gap.

## Probes and results

### 1. Hostile input battery (discovery/parse layer)

8 cases: empty dir, zero-test dir, binary garbage, UTF-16/BOM mix, CRLF-only,
spaces+unicode filenames, symlink loop (junction), traversal-ish filenames.
All 8 → valid JSON, no crash; symlink loop → `partial:true` +
`truncationReasons:["symlink-skipped"]` (honest incompleteness, machine-readable).
Evidence: `evidence/151186b/hostile/_hostile.json`.

### 2. Plugin trust gate (opt-in code execution)

- Gate CLOSED (default): declared JS plugin NOT executed (fs-write + spawn
  markers absent); loud stderr notice names the skipped source + enabling
  flags; stdout JSON untouched. Evidence: `security/plugin-gate-closed.out`.
- Gate OPEN (`--enable-plugins`): plugin executes with full Node privileges —
  markers present. This is the documented threat model (`docs/VERSIONING.md:49`
  "Plugin execution gate"), frozen for 1.0. Plugins are operator-authorized
  code, same trust class as devDependencies. No sandbox — recorded as R4 in
  RESIDUAL_RISK.md. Verdict: no violation; boundary documented and holds by
  default. Evidence: `security/plugin-gate-open.out`.

### 3. ReDoS / catastrophic backtracking

- eslint-plugin-regexp ratchet: `regexp/no-super-linear-backtracking` at error
  for `src/rules/**` (config comments cite the availability rationale);
  `npx eslint src/rules --max-warnings=0` → exit 0 at RC.
- Per-file scan budgets + `rulesCrashed` accounting exist at engine level
  (`scan-pipeline.ts`); stress suite enforces wall-time budgets.
- A dedicated corpus-level ReDoS probe against every rule regex with per-file
  time measurement is scheduled for the Cycle-N battery (plan §14 accepts the
  repeat).

### 4. Command injection / spawn discipline

- `--json`/SARIF/mermaid paths emit pure stdout (no shell out); hostile
  filenames (spaces/unicode/`%2e%2e`) round-tripped into findings + SARIF URIs
  are per-segment RFC 3986 encoded (`sarif.ts:184–207`).
- pr-comment escapes markdown/ANSI/control chars (`escapeMarkdown` +
  `sanitizeData`, Bug-audit QA-2026-08-30 QA-10).

### 5. MCP stdio robustness

Malformed JSON-RPC frame, numeric-path `tools/call`, unknown tool name → JSON-RPC
errors; the loop survives garbage and continues answering. Evidence:
`mcp/_mcp-parity.json` (`survivedGarbage: yes`).

### 6. Supply-chain lanes (CI)

CodeQL, Socket, OSV-Scanner, Snyk lanes configured; actionlint pinned with
checksum verification; top-level `permissions: contents: read`
(`ci.yml`). Lanes green at the RC's release cycle (per GH API; see gates
table caveat in RELEASE_READINESS.md).

## Verdict

No C5#5 condition: no path was found where a vulnerability compromises the host
under **normal documented usage**. The one privileged execution surface
(plugins) is opt-in behind a frozen, documented, loud gate.
