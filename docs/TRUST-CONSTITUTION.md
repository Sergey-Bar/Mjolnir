# Mjölnir Trust Constitution

Canonical law for every trust claim this project makes. CERTIFICATION-POLICY's
A1–A4 are adopted as §1; Laws 1–22 live in `docs/CERTIFICATION-POLICY.md` and
are referenced, never duplicated. The machine-verification pointer after each
principle names the tests or checks that enforce it — **a principle whose
pointer is red is violated, whatever the prose says.**

Amendments: any change to §2's status set, §3's core law, or the canonical
dimension list (docs/RELEASE-TRUST-CONTRACT.md) requires a policy amendment
touching BOTH governance documents and the CHANGELOG in the same PR. Silent
divergence between law and machine is itself a violation (drift-locks fail CI).

## §1. Certification axioms (adopted from CERTIFICATION-POLICY A1–A4)

- **A1 — The corpus is the source of truth.** Every measured claim traces to
  hand-classified corpus verdicts; nothing is self-classified.
  Verify: `doctor:measurement-consistency`, `tests/rules/measured-fp.spec.ts`.
- **A2 — Inconclusive is blocking.** A check that could not be evaluated never
  renders as pass. Verify: `tests/commands/doctor-json.spec.ts` (G2), the
  release-trust precedence (`release-trust` machine contract).
- **A3 — FP evidence is released with every rule.** Verify:
  `docs/FP-AUDIT.md` drift-lock, `doctor:revision-integrity`.
- **A4 — Adjudication is owner-only.** Classification is never self-served.
  Verify: corpus flow (`scripts/corpus-sample.ts`), review sheets with empty
  `verdict:` fields, QUARANTINE-REMEDIATION ledger gates.

## §2. Status algebra (closed set)

Two layers; conflating them is forbidden. **No additions without a policy
amendment (decision 7).**

- **PROVEN (evidence-state):** the evidence required to evaluate the dimension
  exists, executed successfully, is internally consistent, and is sufficient
  to make the dimension's contractual determination.
- **PASS / FAILED (determinations):** PASS = the contractual requirement was
  satisfied; FAILED = the requirement was violated.

**Derivation law** (total function over evidence-states):

| Evidence assessment         | Requirement evaluation | Dimension determination |
| --------------------------- | ---------------------- | ----------------------- |
| PROVEN                      | satisfied              | **PASS**                |
| PROVEN                      | violated               | **FAILED**              |
| insufficient                | —                      | **UNPROVEN**            |
| partial                     | —                      | **PARTIAL**             |
| surface unavailable         | —                      | **UNSUPPORTED**         |
| execution prevented         | —                      | **BLOCKED**             |
| contradictory, unreconciled | —                      | **INCONCLUSIVE**        |

**Terminality rule:** only a PROVEN evidence-state may derive PASS or FAILED.
UNPROVEN · PARTIAL · UNSUPPORTED · BLOCKED · INCONCLUSIVE are terminal honest
states — never upgraded to PASS/FAILED, only re-evaluated after new or
reconciled evidence exists. `all-dimensions-PROVEN` alone is **never** a
release outcome; PASS requires the requirement evaluation to have been
performed and satisfied per dimension.

**Record shape:** every dimension carries BOTH fields — `evidence` and
`determination` — so the causal link is explicit and auditable. Evidence that
a violation occurred is still PROVEN evidence; the determination is FAILED,
never hidden. Machine surface: `mjolnir.release-trust` (`mjolnir.release-trust@1`).

**Mapping law:** existing frozen vocabulary maps onto the algebra
(`analysisStatus` complete/partial; E0/E1/E2; forensic verdicts incl.
INCONCLUSIVE-default) — no new verdict enums in the schema (VERSIONING:
additive-only; states are governance + additive fields, not a v2).

Worked edge cases (corpus cases land with R4b): all 12 evidence=PROVEN +
all requirements satisfied ⇒ PASS; all PROVEN but one requirement violated ⇒
that dimension FAILED ⇒ release blocked; evidence executed but coverage
insufficient ⇒ PARTIAL (non-PASS); unreconciled contradictory verdicts ⇒
INCONCLUSIVE (blocking per A2); doctor unrunnable in an installed-package
context ⇒ BLOCKED (blocking, never rendered pass).

## §3. Core law

**PASS = conclusion backed by sufficient evidence** — never
absence-of-detected-violations.

- NO EXECUTION ≠ PASS
- PARTIAL ≠ PASS
- PARSER FAILURE ≠ CLEAN
- RULE CRASH ≠ CLEAN
- UNSUPPORTED ≠ CLEAN
- STALE ≠ CURRENT
- AGENT CLAIM ≠ VERIFICATION

Verify: `release-trust` precedence + `tests/contract/release-trust-contract.spec.ts`
algebra table; the PASS-forbidden conditions below are each backed by a named
check in the release-trust contract.

## §4. The 18 PASS-forbidden conditions

A release MUST NOT be Trust-PASS when any of these holds (owner list, verbatim):

1. verification not executed
2. required evidence missing
3. parser failed silently
4. adapter failed silently
5. required signal unavailable
6. tool crashed
7. execution skipped
8. required fixture missing
9. analyzed scope ≠ claimed scope
10. irreproducible where reproducibility is contractual
11. required dependency failed
12. partial input represented as complete
13. trust-critical exception swallowed
14. verdict rests on unverified assumption
15. "clean" indistinguishable from "unanalyzed"
16. unreconciled contradiction
17. stale/foreign-execution evidence
18. artifact not bound to the claimed execution

Each condition maps to a dimension determination via the release-trust
contract (`docs/RELEASE-TRUST-CONTRACT.md`) — machine-enforced, no separate
hand-run artifact exists. Verify: `mjolnir release-trust` + the release gate
(`.github/workflows/release.yml`).

## §5. Per-dimension applicability

A dimension whose surface does not exist yet at a given release is reported
**UNSUPPORTED** — recorded, non-blocking; once shipped it becomes blocking.
This is honesty, not a bypass. The surface IS the check machinery: a dimension
is applicable when its evidence bindings resolve (doctor checks run and check
functions are registered). The canonical bindings are drift-locked
(`tests/contract/release-trust-contract.spec.ts`), so an unresolved binding
can only mean "genuinely unwired surface", never a typo. The `provenance =
bound` invariant activates with R4c; before that it is itself UNSUPPORTED and
recorded, never silently dropped. Verify: `release-trust` machine contract
(`applicability.required` per dimension).

## §6. Publication honesty

A non-PASS verdict renders as the strictest state present with precedence
FAILED > BLOCKED > INCONCLUSIVE > UNPROVEN > PARTIAL — a known violation is
the strongest honest claim. The verdict block is appended to the GitHub
Release body; a missing proof renders UNPROVEN, never omitted. **No waiver
path exists** (decision 5). Verify: `docs/RELEASE-TRUST-CONTRACT.md` §
publication + the release workflow's verdict-append step.
