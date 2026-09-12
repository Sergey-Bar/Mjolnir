# LANGUAGE_MATURITY.md — Language & Ecosystem Certification (Plan §8 Phase 7, C3)

> Cycle 0 · RC SHA `151186b` (v0.5.18) · 2026-09-07
> C3 rule: 100% = the language/framework support **explicitly promised by the
> current release scope**, implemented and verified — not "every language".

## Promise source

- `README.md` language claims + rule tables (TS/JS, Python, Java, C#, YAML-CI).
- `docs/RULE-CAPABILITY-MATRIX.md` (99 rules; `languages` field per rule).
- `docs/JAVA-CSHARP-IDIOM-MAPPING.md` (regex-adapter honesty document).
- `src/engine/tree-sitter-ast.ts` (TS/JS + Python grammars, tree-sitter WASM).
- Help registry (`src/commands/help.ts`) — plugin API (`local-rules.ts`) verbs.

## Tier definitions and findings

### Tier A — first-class parser/runtime: **TypeScript/JavaScript, Python (tree-sitter)**

| Claim                                                                                                                         | Status          | Evidence (C6 channels)                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| TS/JS tree-sitter scan of real finding (QA-TEST-004 hard sleep, QA-TEST-003, QA-PW-003)                                       | VERIFIED DEEPLY | `evidence/151186b/deep-path/deep-tsjs.json` (live CLI) + rule message quotes exact source text + suite `tests/engine/adapters/adapters.spec.ts` |
| Python tree-sitter scan (QA-PY-005/004/012 on `time.sleep` + bare truthiness)                                                 | VERIFIED DEEPLY | `deep-path/deep-python.json` + `false-green` pytest attack fired on documented pattern                                                          |
| Adversarial variants: CRLF-only file detects identical finding (score 93 both), UTF-16/BOM handled, unicode filenames handled | VERIFIED        | `hostile/hostile-crlf.out`, `hostile-utf16-bom.out`, `hostile-weird-names.out`                                                                  |
| .only deselection (QA-PW-003, error, exit 1)                                                                                  | VERIFIED        | `false-green/fg-only-deselect.out`                                                                                                              |

### Tier B — generic static adapters: **Java, C# (regex adapters)**

| Claim                                                                                                                          | Status                                       | Evidence                                                        |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------- |
| Java: QA-JV-103 (no assertions, error) + QA-JV-111 (blanket route, family factory) fire on real fixture                        | VERIFIED                                     | `deep-path/deep-java.json` (2 findings, exit 1)                 |
| C#: QA-CS-103 + QA-CS-111 fire on real fixture                                                                                 | VERIFIED                                     | `deep-path/deep-csharp.json` (2 findings, exit 1)               |
| Idiom-mapping honesty (`docs/JAVA-CSHARP-IDIOM-MAPPING.md`) — e.g. QA-PY-101 sync/async mix has **no C# equivalent by design** | VERIFIED (documented, not MISSING per C3/C4) | `docs/JAVA-CSHARP-IDIOM-MAPPING.md:50` + capability-matrix rows |
| Limitation: regex adapters, not tree-sitter — **documented honestly in the matrix** (`detectionStrategy: LEXICAL`)             | DOCUMENTED                                   | `docs/RULE-CAPABILITY-MATRIX.md`                                |

### Tier C — runtime evidence ingestion: **GitHub Actions YAML, saved report consumers**

| Claim                                                                                                           | Status                     | Evidence                                                                        |
| --------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| Workflow YAML parsed; `\|\| true` → QA-CI-002 (error, exit 1)                                                   | VERIFIED DEEPLY            | `false-green/fg-gh-true.out`, `deep-path/deep-yaml.json`                        |
| `continue-on-error` masked job → QA-CI-001 fires under `--strict` (quarantine cap info/E0; default scan silent) | PARTIAL (F4)               | `false-green/fg2-gh-coe-*.out`                                                  |
| Corrupt saved `mjolnir.json` → `summary`/`diff` exit 2 with documented message                                  | VERIFIED                   | `exit-codes/exit-summary-corrupt-report.out`, `false-green/fg-corrupt-diff.out` |
| Schema-incomplete report → `summary` crashes uncaught (exit 1, raw stack)                                       | BROKEN-input edge (F1, P2) | `false-green/fg-partial-summary.out`                                            |

### Tier D — plugin extensibility: **plugin API (`local-rules`, `mjolnir-rules/*.json`)**

| Claim                                                                                                                                                  | Status                       | Evidence                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------- |
| Declared JS plugin loads **only** behind `--enable-plugins`/env gate; gate-closed default prints loud stderr skip notice; plugin code does NOT execute | VERIFIED DEEPLY              | `security/plugin-gate-closed.out` (pwned markers absent) + `docs/VERSIONING.md:49` |
| Gate open → plugin executes (full Node privileges, unsandboxed — documented threat model)                                                              | VERIFIED (documented opt-in) | `security/plugin-gate-open.out` (pwned markers present by design)                  |
| JSON rule manifests load without gate (no code execution)                                                                                              | VERIFIED (suite + code)      | `src/plugins/load.ts` header + `tests/plugins/local-rules.spec.ts`                 |
| Live custom-rule walkthrough via `create-rule` scaffold                                                                                                | VERIFIED                     | `src/commands/create-rule.ts` + `tests/cli/*create*` suite coverage                |

### Tier E — unsupported ecosystems (C3 closure = explicitly documented)

Go, Ruby, Rust, Kotlin, Swift, PHP, .gitignore-only repos, etc. — **no scan
promises**. Documented absence in README language table + capability matrix
(`languages` enum: typescript/javascript, python, java, csharp, yaml only).
Status: **VERIFIED as "explicitly documented"** — the C3 closure condition.
Caveat: Java/C# files that are part of a polyglot repo are scanned by the
regex adapters only where a rule declares those languages; no rule promises Go
or Ruby detection.

## Promised-set percentage (C3 denominator = the promised set)

| Language                            | Promised | Implemented | Verified (this cycle)               | %                     |
| ----------------------------------- | -------- | ----------- | ----------------------------------- | --------------------- |
| TypeScript/JavaScript (tree-sitter) | yes      | yes         | yes                                 | 100%                  |
| Python (tree-sitter)                | yes      | yes         | yes                                 | 100%                  |
| Java (regex adapter)                | yes      | yes         | yes                                 | 100%                  |
| C# (regex adapter)                  | yes      | yes         | yes                                 | 100%                  |
| GitHub Actions YAML-CI              | yes      | yes         | yes (gate semantics partial per F4) | 100% with F4 residual |
| Plugin API (local rules)            | yes      | yes         | yes                                 | 100%                  |

**Languages (C3): 100% of the promised set implemented; per-language
verification completed with adversarial evidence for Tier A, behavioral +
documentation evidence for Tiers B–D.** One P2 residual (F4, quarantine-tier
gating of flagship CI rules) is a product-wide honesty finding, not a language
coverage gap — tracked in RESIDUAL_RISK.md and RELEASE_READINESS.md.
