# Release Trust Contract

The machine contract for `mjolnir release-trust` — the Release Trust Verdict
(product-gap master plan §5, plan 1789009691197 R4a). Law lives in
`docs/TRUST-CONSTITUTION.md`; this document fixes the **canonical dimension
set, order, and bindings** the verb evaluates, plus the exit contract and
publication rules.

Contract surface: `mjolnir.release-trust@1` — frozen key order, byte-
deterministic, zero absolute paths, no timestamps (Law 7 model). The same
tree state produces byte-identical output; `tests/contract/release-trust-
contract.spec.ts` drift-locks the set, the order, the algebra, and the
byte-stability.

## The canonical 12 dimensions (fixed set, fixed order)

| #   | Dimension               | id                        | `applicableFrom` | Machine evidence bindings                                                                                                                                       | Requirement                                                                                                                                 |
| --- | ----------------------- | ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Engine Integrity        | `engine-integrity`        | 1.1.4            | `doctor:registry-sanity`, `doctor:trust-metadata`, `doctor:tier-enforcement`, `doctor:anti-creep`, `doctor:quarantine-enforcement`, `doctor:category-integrity` | registry, trust metadata, tier/anti-creep/quarantine/category checks all pass                                                               |
| 2   | Evidence Integrity      | `evidence-integrity`      | 1.1.4            | `doctor:evidence-honesty`, `doctor:fixture-firewall`, `doctor:fixture-integrity`                                                                                | no fabricated, weakened or orphaned evidence                                                                                                |
| 3   | Rule Integrity          | `rule-integrity`          | 1.1.4            | `doctor:revision-integrity`                                                                                                                                     | every declared detector revision is hash-attested                                                                                           |
| 4   | Failure Containment     | `failure-containment`     | 1.1.4            | `check:adapter-crash-containment`                                                                                                                               | every adapter routes rule crashes through `onCrash`                                                                                         |
| 5   | Corpus Integrity        | `corpus-integrity`        | 1.1.4            | `doctor:measurement-consistency`                                                                                                                                | MEASURED_FP ≡ verdicts ≡ sidecar revisions                                                                                                  |
| 6   | Contract Compatibility  | `contract-compatibility`  | 1.1.4            | `check:machine-contract-version`                                                                                                                                | shipped `contractVersion` ≡ documented                                                                                                      |
| 7   | Determinism             | `determinism`             | 1.1.4            | `check:non-deterministic-fields`                                                                                                                                | `NON_DETERMINISTIC_FIELDS` empty                                                                                                            |
| 8   | Scope Integrity         | `scope-integrity`         | 1.1.6            | `check:scope-integrity`                                                                                                                                         | claimed scope ≡ analyzed scope (wired with R4c; behavioral proof: tests/blast-radius/scope-and-exit.spec.ts)                                |
| 9   | Reproducibility         | `reproducibility`         | 1.1.4            | `check:release-version-consistency`                                                                                                                             | package.json ≡ CHANGELOG head (artifact byte-stability becomes contractual at R9)                                                           |
| 10  | Zero-Network Compliance | `zero-network-compliance` | 1.1.4            | `check:zero-network-imports`                                                                                                                                    | no network imports / fetch calls in src/                                                                                                    |
| 11  | Agent Safety            | `agent-safety`            | 1.3.0            | `check:agent-safety`                                                                                                                                            | agent claims carry rescan evidence (wired with R8; behavioral proof: tests/mcp/parity.spec.ts + tests/contract/agent-skill-surface.spec.ts) |
| 12  | Artifact Integrity      | `artifact-integrity`      | 1.4.0            | `check:artifact-integrity`                                                                                                                                      | artifact bound to the claimed execution (wired with R9; behavioral proof: tests/commands/artifact-integrity.spec.ts)                        |

**Applicability:** the surface IS the check machinery. A dimension is
applicable when its evidence bindings resolve; unresolved bindings = the
surface has not shipped yet → **UNSUPPORTED** (recorded, non-blocking,
Constitution §5). The bindings above are drift-locked, so an unresolved
binding can only mean "genuinely unwired surface", never a typo.

**Dimension governance:** no dimension may be added, removed, or renamed in
the implementation or this document without a policy amendment touching BOTH
governance docs and the CHANGELOG in the same PR. The drift-lock fails CI
when the emitted set ≠ this canonical list (silent additions are a contract
violation).

## Release Trust logic

```text
RELEASE-TRUST = PASS  ⟺  ∀ d ∈ Required(release): determination(d) = PASS
                        ∧ no dimension is INCONCLUSIVE (unreconciled)
                        ∧ execution = PROVEN ∧ evidence = PROVEN
                        ∧ scope = PROVEN ∧ contract = satisfied
                        ∧ contradictions = none ∧ provenance = bound
```

The system invariant is **binding**: no release may achieve RELEASE-PASS
unless execution is PROVEN, evidence is PROVEN, scope is PROVEN, the contract
is satisfied, contradictions are none, and provenance is bound. The
`provenance = bound` condition activated with R4c+R9: it is PROVEN exactly
when the machine-anchored identity chain (runIdentity + evidence graph +
artifact scanId binding) is proven by the scope-integrity and
artifact-integrity dimensions — before both shipped it was itself UNSUPPORTED
and recorded, not silently dropped. Any required dimension not
PASS ⇒ RELEASE-TRUST ≠ PASS, rendered as the strictest state present with
precedence **FAILED > BLOCKED > INCONCLUSIVE > UNPROVEN > PARTIAL**. **No
waiver path** (decision 5).

## Machine document shape (`mjolnir.release-trust@1`)

Top-level keys, in order: `contract` · `release` · `dimensions[]` ·
`invariant` · `verdict`. Each dimension carries `id`, `title`,
`applicability {applicableFrom, required}`, `requirement`, `evidence`,
`determination`, `evidenceRefs[]`, `details[]` — BOTH the evidence-state and
the determination (Constitution §2 record shape). `evidenceRefs` and
`details` are sorted; all references are repo-relative or `doctor:`/`check:`
names — zero absolute paths.

## Exit contract (frozen set — docs/VERSIONING.md)

| Code | Meaning                                                                       |
| ---- | ----------------------------------------------------------------------------- |
| `0`  | verdict PASS                                                                  |
| `1`  | verdict non-PASS (FAILED / UNPROVEN / PARTIAL — the verdict block says which) |
| `2`  | no fixtures root at the target (not an mjolnir checkout — BLOCKED context)    |
| `10` | usage error                                                                   |
| `20` | internal error                                                                |

## Release wiring

`release.yml` gate order: **Tests → Certification → CHANGELOG Gate →
release-trust gate → version bump → publish → tag → GitHub Release.** The
gate is release-blocking, pre-publish: a non-PASS verdict fails the release
job before any registry write. Publication honesty: the verdict block is
appended to the GitHub Release body (PROVEN dimensions + states); a missing
proof renders UNPROVEN, never omitted.
