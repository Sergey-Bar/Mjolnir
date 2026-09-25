# ADR 0009 — Human evidence is class `E-HUMAN`

**Status:** accepted · **Amends:** Law 7 · **Affects:** evidence graph,
`src/qa/domain-model.ts`, trust report, all rendering surfaces,
consent/retention rules

## Context

**Manual QA is a declared primary persona** (§1.1: Manual QA is listed
first among the personas the engine serves).

The engine had **no human-evidence class at all**. Consequences, all
real:

- Exploratory sessions, manual cases, UAT sign-offs, defect
  reproductions and charter reports had nowhere to live, so a repository
  verified entirely by humans analysed as _unverified_ — an
  under-claim that trains users to ignore the tool.
- Worse, the opposite failure: if human material were ingested as
  ordinary evidence, a sign-off would silently upgrade a machine claim to
  `PROVEN`. That is a false proof, the single thing the constitution
  exists to prevent.

The risk is not hypothetical; it is the default outcome of adding human
input to an evidence pipeline that has no class distinction.

## Decision

**Human evidence is a first-class evidence class, `E-HUMAN`, and it is
never merged into a machine determination.** Seven invariants, all
machine-enforced:

1. **`HUMAN_PASS ⇏ MACHINE_PROVEN`.** A human verdict may corroborate;
   it may never upgrade a machine determination. `PASS` remains
   derivable only from `PROVEN` machine evidence.
2. **`HUMAN_PASS ⇏ absence`.** A signed-off area with no machine
   coverage is `UNPROVEN` / `PARTIAL` — **never** `NO_GAP_OBSERVED`.
   (Law 4: zero findings ≠ proven safe. A human's absence of complaint
   is not a machine observation.)
3. **Maturity ceiling.** Human evidence may take a _human-observed_
   capability axis to `M3_FIXTURE_VERIFIED`, and a domain's human axis to
   `M3`. It can **never** produce `M4_CORPUS_VERIFIED` (that needs a
   classified machine corpus) and **never** `M5_FIELD_PROVEN` on a
   machine-claimed capability.
4. **Contradiction is blocking.** Signed-off scope vs. a detected
   machine defect yields `EVIDENCE_CONTRADICTION` (§3.4) and is never
   silently resolved in favour of the sign-off.
5. **Expiry is enforced.** A sign-off without a revalidation date is
   `STALE` after its policy window. A permanently signed-off scope is a
   finding in itself — a quarantine-grade governance failure.
6. **Self-attribution is blocked.** A human record may not be authored by
   the agent surface without an identified human principal and an
   approval receipt (M22-12).
7. **Privacy and consent.** Session recordings, screenshots and customer
   data obey retention, deletion, export and PII rules (§4.5) and are
   stored **locally by default**.

### Shape

- **Evidence class** `E-HUMAN` is a peer of the machine classes, not a
  subtype and not a downgrade. It carries its own class badge.
- **Integration is opt-in, read-only, credential-scoped, and degrades to
  `BLOCKED` with a recorded reason.** TestRail · Xray · Zephyr · Azure
  Test Plans · Qase · Testmo, plus generic CSV/JSON/HTML importers.
  **Nothing in the core scan path may require a network call or a source
  upload to use human evidence.**
- **Traceability** is mandatory:
  `requirement → acceptance criterion → manual test → session/case result
→ evidence artifact → commit/build`.
- **Freshness binding is identical to machine evidence** (§3.4): repo,
  SHA, branch, config hash, tool version, timestamp, file hashes. Human
  records go stale exactly the way machine records do.
- **Rendering:** the trust report reports _machine proof_ and _human
  evidence_ as **two separate columns**, so a reader can never confuse
  the two. `report --format` and the dashboard render them separately.

## Consequences

**Forbids**

- Any code path that sets a machine determination from human input.
- A maturity above the invariant-3 ceiling derived from human evidence.
- Absence of human evidence rendering as `NO_GAP_OBSERVED` (it is
  `UNKNOWN`).
- A network call or upload in the core scan path for human evidence.
- A human record without identity, consent, scope and date.

**Costs**

- A second evidence path to build, govern, expire and render. This is
  the intended cost: the alternative is an untyped human channel, which
  is how a sign-off becomes a silent `PROVEN`.
- A permanently-signed-off scope becoming a _finding_ will surface
  governance debt that was previously invisible. That debt is real.

## Rejected alternatives

| Alternative                                              | Why rejected                                                                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Ingest human material as ordinary evidence               | A sign-off silently becomes machine proof. Law 1 and Law 7 violated.                                                 |
| A separate "manual QA mode" that is simply less analysis | Manual QA is a _primary persona_, not a degraded profile. The class must be first-class.                             |
| Human evidence counts toward `M4` corpus verification    | A human corpus is not a classified machine corpus. `M4`'s criterion is machine-checked specifically to prevent this. |
| Require a connector for human evidence                   | Makes a zero-network default dependent on a vendor API. The generic CSV/JSON importer is the stable path.            |
| Human evidence stored in the hosted dashboard by default | §4.5: recordings and screenshots carry PII. Local-first with explicit consent.                                       |

## Enforcement

| Mechanism      | Location                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Class type     | `src/v6/evidence-class.ts` — `E-HUMAN` is a closed enum member; the maturity ceiling is a function of the class |
| Invariants 1–5 | `tests/v6/human-evidence.spec.ts` — each invariant has a negative test                                          |
| Invariant 6    | `M22-12` check on the human record author                                                                       |
| Invariant 7    | `docs/HUMAN-EVIDENCE-CONTRACT.md` + `schemas/v6/human-evidence/` + retention/deletion/export rules              |
| Contract gate  | `human-evidence:contract` — "no human sign-off renders as machine `PROVEN`"                                     |
| Rendering      | `src/reporter/presentation-model.ts` (U1) — two separate columns, never one merged score                        |
| Domain         | `Human / Manual Verification` is a real domain pack in the 16-domain matrix, `domain-matrix:check` enforced     |
