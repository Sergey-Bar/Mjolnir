# CI Standard

The repository has one canonical PR gate with four non-overlapping layers.
Do not add a new workflow that reruns the full test suite without stating
which layer it replaces.

| Layer                  | Canonical command                                             | Blocking policy                                                                               |
| ---------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| PR feedback            | `npm run build && node dist/cli.mjs . --format json`          | Findings at the configured gate block; partial is an explicit advisory with `outcome=partial` |
| Required quality       | `npm run test:coverage:ci && npm run coverage:ratchet`        | Blocks on the primary Ubuntu/Node 22 job                                                      |
| Compatibility          | `npm run build && npm run test:integration`                   | Ubuntu/Windows/macOS lanes; no duplicate coverage                                             |
| Security and artifacts | `npm run audit:ci`, CodeQL, OSV, Socket, generated-docs drift | Blocks on the named security job                                                              |
| Release readiness      | `npm run release:decision`                                    | Release workflow/manual release path only; not a normal PR gate                               |

The scan report is always produced, including on findings and partial
analysis. A partial analysis never receives a `clean` outcome. The strict
self-scan and certification jobs remain the completeness authority.

`npm run ci-local` is the local reproduction of the required quality layer.
`npm run ci-local:parity` verifies that the required command set is not
silently removed from CI.

Release evidence and external validation are intentionally separate from the
normal PR feedback loop. They run in the release workflow and must never be
replaced by a claim in a PR comment.
