# Architecture Decision Records (v6)

**Status:** active. **Schema:** `schemaVersion: 1`, file name
`NNNN-<kebab-slug>.md`, immutable once `Status: accepted`.

Every record answers five questions in the same order, so a reader can
diff two decisions instead of parsing two essay styles:

1. **Context** — the collision, in this repository, with file:line evidence.
2. **Decision** — the resolution, stated as a rule the code can enforce.
3. **Consequences** — what the rule forbids, what it permits, what it costs.
4. **Rejected alternatives** — and the exact reason each was rejected.
5. **Enforcement** — the machine gate, the artifacts, and the test that fails.

A record without an `Enforcement` section is **not accepted**. A decision
that cannot be checked is prose, and `docs/TRUST-CONSTITUTION.md` Law 1
does not accept prose as proof.

## Index

| ADR                                                        | Title                                                  | Amends            | Status   |
| ---------------------------------------------------------- | ------------------------------------------------------ | ----------------- | -------- |
| [0001](0001-maturity-axis-is-m0-m5.md)                     | The maturity axis is `M0`–`M5`, not `L0`–`L5`          | A1                | accepted |
| [0002](0002-exit-code-contract-for-6-0.md)                 | The v6 exit-code contract                              | A2                | accepted |
| [0003](0003-qa-rule-id-namespace-is-frozen.md)             | The `QA-*` rule-id namespace is frozen                 | A3                | accepted |
| [0004](0004-aggregate-score-is-secondary.md)               | The aggregate worthiness score is a secondary panel    | A4                | accepted |
| [0005](0005-mcp-tools-map-to-canonical-verbs.md)           | MCP tools map 1:1 to canonical verbs                   | A5                | accepted |
| [0006](0006-migration-baseline-is-3-0-0-and-4-0-0-rc-1.md) | The migration baseline is 3.0.0 / 4.0.0-rc.1           | A6                | accepted |
| [0007](0007-one-capability-inventory.md)                   | One capability inventory, never a parallel one         | A7                | accepted |
| [0008](0008-deployment-mode-is-a-declared-state.md)        | Deployment mode is a machine-readable state            | A8                | accepted |
| [0009](0009-human-evidence-is-a-separate-class.md)         | Human evidence is class `E-HUMAN`                      | Law 7             | accepted |
| [0010](0010-ecosystem-census-is-the-authority.md)          | The ecosystem census is the authority on "what exists" | Law 8             | accepted |
| [0011](0011-orthogonal-claim-axes.md)                      | The six claim axes are orthogonal and never merged     | A1 §orthogonality | accepted |

## Amendment-to-record map

The v6 blueprint's §6.4 lists eight blocking design conflicts (A1–A8) and
two constitution additions (Law 7, Law 8). Each is now a record. A code
change that contradicts a record is a defect in the code, not a
surprise amendment to the record.
